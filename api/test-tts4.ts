import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
const tts = new MsEdgeTTS();
console.log(tts.toStream("Namaste"));
