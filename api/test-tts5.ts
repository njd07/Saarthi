import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
async function run() {
  const tts = new MsEdgeTTS();
  await tts.setMetadata("hi-IN-SwaraNeural", OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);
  const stream = tts.toStream("Namaste");
  console.log(stream.constructor.name);
  console.log(typeof stream.on);
}
run();
