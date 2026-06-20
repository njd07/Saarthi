import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";

async function run() {
  const edgeTts = new MsEdgeTTS();
  await edgeTts.setMetadata("hi-IN-SwaraNeural", OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);
  const readable = edgeTts.toStream("Namaste");
  const chunks: Buffer[] = [];
  await new Promise((resolve, reject) => {
    readable.on('data', (c: any) => chunks.push(Buffer.from(c)));
    readable.on('end', () => resolve(null));
    readable.on('error', reject);
  });
  console.log("Length:", Buffer.concat(chunks).length);
}
run().catch(console.error);
