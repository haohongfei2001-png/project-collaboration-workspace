# Protected preview ingress and scheduled work

These are two small server adapters for the existing Vercel application. They do not implement another workspace, store model keys, change owner login, or expose database administration to the browser. This code has **not been deployed to Supabase**. A successful local test is not proof that the external scheduler or webhook path is running.

## Request paths

| Source | Fixed public endpoint | Protected destination | Authentication |
| --- | --- | --- | --- |
| GitHub App | `https://<project-ref>.supabase.co/functions/v1/github-ingress` | `PCW_PREVIEW_ORIGIN/api/webhooks/github` | Exact raw-body GitHub SHA-256 HMAC, checked independently by both servers |
| Supabase `pg_cron` / `pg_net` | `https://<project-ref>.supabase.co/functions/v1/cron-forwarder` | `PCW_PREVIEW_ORIGIN/api/cron` | One-minute, purpose-bound HMAC, followed by server-only cron and Vercel headers |

Only the two named functions disable Supabase's user-JWT gate in `supabase/config.toml`. Each implements its own mandatory HMAC authentication. Other functions and the workspace's owner login are unchanged. Both reject GET, unknown paths, query strings and caller-selected destinations. `PCW_PREVIEW_ORIGIN` must be one exact HTTPS `*.vercel.app` origin, without a path, port, query or credentials.

The GitHub bridge reads at most 2 MiB, checks the event/delivery/signature headers, verifies the original bytes with WebCrypto, and uses a total 7-second deadline. It forwards only five approved headers, including the original signature and delivery ID. It never forwards cookies, user Authorization, arbitrary forwarding headers, a bypass-cookie request, or an upstream response body. Only a backend HTTP 200/202 with JSON `accepted: true` becomes a successful GitHub acknowledgement. The backend retains responsibility for durable persistence, repository/installation ownership checks, deduplication and processing.

The cron bridge has no operation arguments: its request body must be `{}`. A valid request can only invoke the existing cron route. It verifies a 60-second signature lifetime, permits at most 5 seconds of future clock skew, and forwards the nonce so the backend can reject repeats in durable storage. The backend's task leases, analysis reservations and budgets still apply. The forwarded HTTP request has a 115-second deadline; `pg_net` allows 120 seconds for the bridge response. A scheduler HTTP 200 is evidence that the scheduler request reached the application, not evidence that every queued job or product test passed.

Both adapters inject `x-vercel-protection-bypass` only in their server-side request and use `redirect: 'error'`. Neither returns that credential, a bypass cookie, a GitHub payload, or a backend diagnostic to the public caller.

## Why the cron bridge exists

Current official [`pg_net` source](https://github.com/supabase/pg_net/blob/master/src/core.c) enables redirect following in its HTTP client. Sending a long-lived Vercel bypass credential directly from `pg_net` would expose that custom header if the destination redirected to another host. Therefore the database sends only a short-lived signature for this one fixed operation. `CRON_SECRET` and the Vercel bypass value are held by the Edge Function and are never stored in the scheduler database or sent by `pg_net`.

The signature input is UTF-8, with literal newline separators and no trailing newline:

```text
pcw-r2-cron-v1
POST
/functions/v1/cron-forwarder
<Unix timestamp in seconds>
<UUID nonce>
```

`PCW_SCHEDULER_HMAC_KEY` is a distinct random 32-byte key represented by 64 hexadecimal characters. SQL uses `pgcrypto.hmac` with the decoded bytes; the Edge Function verifies those same bytes with WebCrypto. Headers are `x-pcw-scheduler-timestamp`, `x-pcw-scheduler-nonce`, and `x-pcw-scheduler-signature: v1=<lowercase hex HMAC-SHA256>`. The signature does not authorize a repository action, an arbitrary route, or an arbitrary HTTP destination. Do not reuse the GitHub webhook, cron, encryption or Vercel bypass secret as this key.

## Server-only configuration

The Supabase function secret environment needs the following values, obtained through the administrator's secret manager:

| Name | Purpose |
| --- | --- |
| `PCW_PREVIEW_ORIGIN` | Exact protected Vercel preview origin |
| `GITHUB_WEBHOOK_SECRET` | Same GitHub webhook secret used by the GitHub App and Vercel backend |
| `VERCEL_AUTOMATION_BYPASS_SECRET` | Vercel project automation credential; never a URL parameter or browser setting |
| `CRON_SECRET` | Same server-only cron secret used by the Vercel backend; at least 32 printable characters |
| `PCW_SCHEDULER_HMAC_KEY` | Separate 64-hex-character scheduler HMAC key |

The scheduler configuration process needs a different environment:

| Name | Purpose |
| --- | --- |
| `PCW_SCHEDULER_DATABASE_URL` | Explicit database administrator connection for configuration only; no fallback to runtime `DATABASE_URL` |
| `PCW_SCHEDULER_DATABASE_CA` | Optional CA certificate; TLS certificate verification remains enabled |
| `PCW_SCHEDULER_EDGE_URL` | Exact public `https://<project-ref>.supabase.co/functions/v1/cron-forwarder` URL |
| `PCW_SCHEDULER_HMAC_KEY` | Same scheduler key as the Edge Function |

Do not put the administrator database URL, model API keys, or GitHub App private key into the function environment. The bridges need none of them. Secret values belong in an injected environment or a private ignored environment file, not command arguments, source code, screenshots or logs. `.env*` files other than `.env.example` are ignored by this repository; restrict a local secret file's filesystem permissions before populating it.

## Deployment after external authorization

The following command names and flags were checked with the official Supabase CLI **2.122.0** using `--help`. No secret update, function deployment or resource creation was executed as part of that check.

```sh
supabase secrets set --env-file .env.ingress --project-ref PROJECT_REF
supabase functions deploy github-ingress cron-forwarder --project-ref PROJECT_REF --use-api
```

`--use-api` bundles without local Docker. List these two function names explicitly; do not use `--prune` on a shared project. The functions' `verify_jwt = false` settings are in the committed configuration. Use the secret-free GitHub public URL from the table above as the GitHub App webhook URL. GitHub's webhook secret remains a separate secret field.

The scheduler script is read-only by default:

```sh
node --env-file=.env.scheduler scripts/r2/configure-scheduler.mjs --check
```

After the correct existing Supabase project and its administrator connection are authorized, configure it with:

```sh
node --env-file=.env.scheduler scripts/r2/configure-scheduler.mjs --apply
```

`--apply` uses one transaction. It checks/installs the available `pg_cron`, `pg_net`, `supabase_vault` and `pgcrypto` extensions without pinning a deprecated extension version; checks Vault/queue privileges; stores the endpoint and HMAC key through bound parameters; creates a private `SECURITY INVOKER` function; and registers the named `pcw-r2-preview` job at `*/5 * * * *`. Repeating it updates the same job and Vault names. It never writes directly to `cron.job` and never drops other jobs or extensions.

The cron command contains only `select pcw_scheduler.enqueue_tick();`. No secret is interpolated into it or into function SQL. Before any secret write, the script verifies or sets transaction-local logging options that suppress SQL bind values, including audit parameter logging when present. If this cannot be done, it stops with `DATABASE_LOG_REDACTION_REQUIRED`. Existing unsafe access to Vault or the request queue produces `SECRET_STORAGE_PERMISSIONS_UNSAFE`; the script does not silently change the permissions of a shared Vault or queue. The private scheduler schema, function and metadata table revoke public/application-role access; the request metadata table has RLS enabled.

The script reports `NOT_CONFIGURED` and exits with code 2 when required access, configuration or extensions are missing. Connection and SQL failures print fixed codes and stages, never the error object, connection URL or a secret. A failed transaction is rolled back. A successful registration initially reports `delivery: NOT_VERIFIED`. Later `--check` reports only the latest request ID, timestamps, HTTP status and boolean error flags. `HTTP_200_OBSERVED` is not a product acceptance result, and a stale response is not a current health guarantee; inspect its timestamp and the workspace's scheduler heartbeat.

To stop only this scheduler, an authorized database administrator can call `cron.unschedule('pcw-r2-preview')`. Do not disable the shared `pg_cron` extension. On key rotation, update the Edge secret and rerun `--apply` with the matching new HMAC key. A temporary mismatch fails closed; the next scheduled tick and repository compensation resume after both sides match. Changing the preview deployment requires updating the exact Edge `PCW_PREVIEW_ORIGIN` value as well.

## Verification and current limits

```sh
node tests/r2-ingress.test.js
node scripts/r2/configure-scheduler.mjs --check
```

The test suite runs the same portable JavaScript modules imported by the Deno entry points. It checks exact-byte HMAC, method/path/header restrictions, body bounds, credential stripping, failed acknowledgements, deadlines, and real local HTTP redirect behavior. It also executes the generated function in local WASM PostgreSQL with the real `pgcrypto` extension, verifies its signature with Edge WebCrypto, checks application-role denial, and verifies transaction rollback. **Vault, `pg_net` transport and `pg_cron` scheduling are explicit local test doubles in that SQL test.** No hosted Supabase Vault encryption, scheduled execution, Deno deployment, GitHub App delivery, private repository or protected preview integration is established by these tests.

In the current development environment, running the configuration check returned `NOT_CONFIGURED`, missing `PCW_SCHEDULER_DATABASE_URL`. There has been no external scheduler registration or Supabase deployment.

GitHub [does not automatically redeliver failed webhooks](https://docs.github.com/en/webhooks/using-webhooks/handling-failed-webhook-deliveries). Non-2xx bridge responses remain failures visible to GitHub. The separate [`server/recovery.js`](../../server/recovery.js) service reads the App's delivery log with its App JWT and requests redelivery only for failures in bound owner/installation/project scope. [`002_delivery_recovery.sql`](../../db/002_delivery_recovery.sql) adds four private FORCE-RLS ledgers for poll progress, GUID groups, provider attempts and outgoing request reservations. The main application invokes this service from its authenticated cron route.

Recovery stores pages before advancing its cursor; completes the bounded scan before redelivery; gives new deliveries a two-minute grace period; and retries with 2/4/8/16/32-minute backoff, at most five reservations per GUID. A 202 response only means GitHub accepted the request. The recovery service marks a GUID recovered only after finding its durable local delivery receipt. A successful provider attempt without that receipt remains `unconfirmed`. Failed network requests keep their uncertain outcome; expired leases and a later worker do not erase it. The `webhook_recovery` heartbeat exposes pending/exhausted/unconfirmed counts, full-scan time, cursor incompleteness and retention gaps.

GitHub.com currently documents a **three-day** [viewing](https://docs.github.com/en/webhooks/testing-and-troubleshooting-webhooks/viewing-webhook-deliveries) and [redelivery](https://docs.github.com/en/webhooks/testing-and-troubleshooting-webhooks/redelivering-webhooks) window; the seven-day documentation is for GitHub Enterprise Server. A provider-retention gap, including one that appears while pagination is paused, remains explicitly recorded with an immutable audit entry. Repository compensation recovers readable current facts, but cannot reconstruct every lost transient event after that window, such as a comment created and deleted during a long outage. Do not describe a stateless bridge, a successful recovery request or a green local test as proof of lossless event delivery. Recovery's 14 local PostgreSQL/API-fixture regressions have passed; a real App delivery and redelivery have not been performed.

## Official references checked

- [Supabase function configuration](https://supabase.com/docs/guides/functions/function-configuration): per-function JWT behavior.
- [Scheduling Edge Functions](https://supabase.com/docs/guides/functions/schedule-functions) and [Cron installation](https://supabase.com/docs/guides/cron/install): `pg_cron`, `pg_net` and Vault.
- [Supabase Vault](https://supabase.com/docs/guides/database/vault): secret creation/update and decrypted-view permissions.
- [`pg_net` documentation](https://supabase.com/docs/guides/database/extensions/pg_net): asynchronous transaction behavior, timeout and request/response tables.
- [Vercel Protection Bypass for Automation](https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection/protection-bypass-automation): server-only automation header.
- [Supabase extension version change](https://supabase.com/changelog/extension-version-pinning-ignored) and [cron table protection](https://supabase.com/changelog/19298-directly-updating-rows-in-the-cron-job-table-is-no-longer-allowed): use default extension versions and documented scheduling functions.

The current Supabase changelog was also checked. The announced removal of legacy CBC TLS ciphers does not require weakening TLS; the adapters use modern platform TLS and the administrator database connection retains certificate verification.
