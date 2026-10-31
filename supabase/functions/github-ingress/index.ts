import { createGitHubIngress } from '../_shared/github-ingress.js';

// These values are Supabase server-only function secrets, never browser or URL parameters.
Deno.serve(createGitHubIngress({
  env: {
    PCW_PREVIEW_ORIGIN: Deno.env.get('PCW_PREVIEW_ORIGIN'),
    GITHUB_WEBHOOK_SECRET: Deno.env.get('GITHUB_WEBHOOK_SECRET'),
    VERCEL_AUTOMATION_BYPASS_SECRET: Deno.env.get('VERCEL_AUTOMATION_BYPASS_SECRET'),
  },
}));
