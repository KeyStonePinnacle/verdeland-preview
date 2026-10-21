import { handleInquiry } from '../lib/inquiry-handler.mjs';

// No credentials or provider calls unless all server-side configuration is ready.
export default { fetch: request => handleInquiry(request) };
