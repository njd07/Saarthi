import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";

async function run() {
  const edgeTts = new MsEdgeTTS();
  await edgeTts.setMetadata("hi-IN-SwaraNeural", OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);
  const readable = edgeTts.toStream("Namaste");
  const chunks = [];
  for await (const chunk of readable) {
    chunks.push(Buffer.from(chunk));
  }
  console.log("Length:", Buffer.concat(chunks).length);
}
run().catch(console.error);
