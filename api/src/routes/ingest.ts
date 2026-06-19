import { createRouter } from "../types.js";
import { query } from "../db.js";
import fs from "fs";
import path from "path";
import os from "os";

// ─────────────────────────────────────────────────────────────────────────────
// PDF Ingestion — parse, chunk, embed (Google text-embedding-004), store
// ─────────────────────────────────────────────────────────────────────────────

const ingest = createRouter();

function chunkText(text: string, size = 900, overlap = 120): string[] {
  const clean = text.replace(/\s+\n/g, "\n").replace(/\n{3,}/g, "\n\n");
  const out: string[] = [];
  let i = 0;
  while (i < clean.length) {
    out.push(clean.slice(i, i + size));
    i += size - overlap;
  }
  return out.filter((c) => c.trim().length > 80);
}

async function embedBatch(inputs: string[]): Promise<number[][]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not set");

  // Google's batch embed endpoint
  const requests = inputs.map((text) => ({
    model: "models/gemini-embedding-2",
    content: { parts: [{ text }] },
    outputDimensionality: 768,
  }));

  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2:batchEmbedContents?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requests }),
    },
  );

  if (!r.ok) {
    const text = await r.text().catch(() => "");
    throw new Error(`embed ${r.status}: ${text.slice(0, 200)}`);
  }
  const d = await r.json() as any;
  return d.embeddings.map((e: { values: number[] }) => e.values);
}

// Accept multipart file upload for PDF/text documents
ingest.post("/", async (c) => {
  const userId = c.get("userId") as string;
  const contentType = c.req.header("content-type") || "";

  let title = "document";
  let fileBuffer: Buffer;

  if (contentType.includes("multipart/form-data")) {
    const formData = await c.req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return c.json({ error: "file required" }, 400);
    }
    title = file.name;
    fileBuffer = Buffer.from(await file.arrayBuffer());
  } else {
    // JSON mode — accept base64 or documentId for re-ingestion
    const body = await c.req.json();
    if (body.documentId) {
      // Re-ingest existing document
      const docResult = await query(
        "SELECT * FROM documents WHERE id = $1 AND teacher_id = $2",
        [body.documentId, userId],
      );
      if (!docResult.rows.length) {
        return c.json({ error: "Document not found" }, 404);
      }
      return c.json({ ok: true, message: "Re-ingestion not yet implemented" });
    }
    return c.json({ error: "file required" }, 400);
  }

  // Insert document record
  const docResult = await query(
    "INSERT INTO documents (teacher_id, title, storage_path, status) VALUES ($1, $2, $3, $4) RETURNING id",
    [userId, title, `uploads/${userId}/${Date.now()}-${title}`, "processing"],
  );
  const documentId = docResult.rows[0].id;

  try {
    // Save file temporarily
    const tmpDir = path.join(os.tmpdir(), "saarthi-uploads");
    fs.mkdirSync(tmpDir, { recursive: true });
    const tmpPath = path.join(tmpDir, `${documentId}-${title}`);
    fs.writeFileSync(tmpPath, fileBuffer);

    let pagesCount = 1;
    let pagesText: string[] = [];
    if (title.toLowerCase().endsWith(".pdf") || fileBuffer[0] === 0x25) {
      // Dynamic import for pdf-parse
      const pdfParse = (await import("pdf-parse")).default;
      const pdfData = await pdfParse(fileBuffer);
      // pdf-parse doesn't give per-page text easily, use full text
      pagesText = [pdfData.text];
      if (pdfData.numpages) pagesCount = pdfData.numpages;
    } else {
      pagesText = [fileBuffer.toString("utf-8")];
    }

    // Chunk + carry page numbers
    const allChunks: { content: string; page: number }[] = [];
    pagesText.forEach((pageText, i) => {
      const chunks = chunkText(pageText);
      chunks.forEach((c) => allChunks.push({ content: c, page: i + 1 }));
    });

    if (!allChunks.length) {
      await query("UPDATE documents SET status = $1, error = $2 WHERE id = $3", [
        "failed",
        "No text extracted",
        documentId,
      ]);
      // Cleanup
      try { fs.unlinkSync(tmpPath); } catch {}
      return c.json({ ok: false, error: "No text extracted from document" });
    }

    // Embed in batches of 50
    const BATCH = 50;
    for (let i = 0; i < allChunks.length; i += BATCH) {
      const slice = allChunks.slice(i, i + BATCH);
      const vecs = await embedBatch(slice.map((s) => s.content));

      for (let j = 0; j < slice.length; j++) {
        await query(
          `INSERT INTO doc_chunks (document_id, teacher_id, page, content, embedding)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            documentId,
            userId,
            slice[j].page,
            slice[j].content,
            `[${vecs[j].join(",")}]`,
          ],
        );
      }
    }

    await query("UPDATE documents SET status = $1, pages = $2 WHERE id = $3", [
      "ready",
      pagesCount,
      documentId,
    ]);

    // Cleanup temp file
    try { fs.unlinkSync(tmpPath); } catch {}

    return c.json({
      ok: true,
      documentId,
      chunks: allChunks.length,
      pages: pagesCount,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    await query("UPDATE documents SET status = $1, error = $2 WHERE id = $3", [
      "failed",
      msg,
      documentId,
    ]);
    return c.json({ ok: false, error: msg }, 500);
  }
});

export default ingest;
