import { createRouter } from "../types.js";

const auth = createRouter();

// Custom authentication routes (/register, /login, /me) have been 
// removed because the application now uses Clerk for authentication.

export default auth;
