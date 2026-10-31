import { createCronForwarder } from '../_shared/cron-forwarder.js';

Deno.serve(createCronForwarder({
  env: {
    PCW_PREVIEW_ORIGIN: Deno.env.get('PCW_PREVIEW_ORIGIN'),
    PCW_SCHEDULER_HMAC_KEY: Deno.env.get('PCW_SCHEDULER_HMAC_KEY'),
    CRON_SECRET: Deno.env.get('CRON_SECRET'),
    VERCEL_AUTOMATION_BYPASS_SECRET: Deno.env.get('VERCEL_AUTOMATION_BYPASS_SECRET'),
  },
}));
