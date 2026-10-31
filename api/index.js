import { waitUntil } from '@vercel/functions';
import { createHandler } from '../server/http.js';
export const config = { api: { bodyParser: false } };
const handler=createHandler({background:promise=>waitUntil(promise)});
export default handler;
