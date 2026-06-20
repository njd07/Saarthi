import { MsEdgeTTS } from "msedge-tts";

const tts = new MsEdgeTTS();
console.log(Object.keys(tts));
console.log(Object.getOwnPropertyNames(Object.getPrototypeOf(tts)));
