# R2 AI analysis: implementation and evaluation evidence

Recorded: 2026-11-01 (Asia/Shanghai). This file describes the implemented adapter, its deterministic safety checks and the limits of the available evidence. It is not a claim that a real model or a real user journey has passed acceptance.

## Implemented interfaces

`server/providers.js` exports:

- `validateProviderConfig(input, { allowedHosts })`: validates the model ID, provider, HTTPS base URL, currency, explicit input/output prices, monthly budget and token/time limits. `allowedHosts` must come from server configuration, never a request body.
- `estimateReservation(config, input, { verification })`: returns `{ costMicros, inputTokens, maxOutputTokens, budgetedOutputTokens, currency }`. Amounts are integer millionths of the configured currency. Prices are supplied by the user according to their own provider billing; this code does not invent current list prices or exchange rates.
- `verifyProvider(config, key, options)`: makes one real bounded model request, returning key/model reachability and a separate `structuredOutputVerified` result. A reasoning model consuming the small verification allowance does not mean that its key is invalid. Verification itself can cost money and must first obtain a durable budget reservation.
- `requestChat(...)`: one HTTPS request; there are no invisible automatic retries. It returns usage and estimated application cost, or a safe error with `requestSent`, and usage/cost when available. Provider error bodies, keys and raw exceptions are not returned to the client.

`server/analysis.js` exports `buildAnalysisInput`, `buildAnalysisRequest`, `estimateAnalysisReservation`, `validateAnalysis`, `callAnalysis` and the JSON schema. `estimateAnalysisReservation` uses the exact same message/schema envelope as the real request and is the function the worker should use before analysis. The schema requires stage, scoped progress, completed/incomplete/failed work, blockers, pending verification, user actions, next steps, change reason and explicitly resolved historical issues. Every claim identifies a classification and supplied evidence IDs. The server adds URL, SHA and source/observation times from stored evidence; the model cannot create those fields.

The storage/job layer owns key encryption, revocation, atomic budget reservations, event-to-analysis deduplication and immutable history. The adapter never logs a key or stores it in browser state. A changed context invalidates an old current conclusion; it must not delete the old analysis.

## Provider behavior verified against official documentation

OpenAI uses `https://api.openai.com/v1/chat/completions`, `max_completion_tokens`, structured JSON Schema, and `store: false`. Alibaba Cloud uses its official compatible-mode endpoints, supports the existing DashScope domains, and supports the documented workspace-specific domains. Other providers need an explicit server-owned hostname allowlist and the total-output token-cap contract.

The total-output cap matters: the current Alibaba documentation says that `max_tokens` may exclude reasoning tokens, while `max_completion_tokens` bounds reasoning plus answer for the documented current model families, including Qwen3.8. The reservation includes the documented ten-token tolerance. The adapter therefore does not silently fall back to an answer-only token limit if a model rejects the parameter; configuration verification fails explicitly.

Sources:

- [OpenAI Chat Completions request, output cap and usage](https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create)
- [OpenAI structured outputs and JSON mode](https://developers.openai.com/api/docs/guides/structured-outputs)
- [Alibaba Cloud compatible Chat API: official endpoints, total-output limits and usage](https://help.aliyun.com/en/model-studio/qwen-api-via-openai-chat-completions)

These links establish API behavior, not access to any specific user's model or entitlement.

## Security and reliability checks

Provider requests are server-side only. They require an HTTPS domain, reject URL credentials, queries, fragments and nonstandard ports, and do not follow redirects. The default transport resolves the approved hostname, rejects private/reserved addresses and pins the selected public address for the TLS connection; the original hostname remains the Host/SNI identity. Response size, request size, execution time and generated tokens are bounded.

Repository material is placed in a separate JSON data message under fixed system instructions. There are no model tools, network-following actions or arbitrary function calls. Output validation rejects extra fields and unknown evidence IDs. This reduces the attack surface; a prompt alone is not proof of resistance to every semantic injection. The adversarial test suite and real-model comparison remain separate evidence.

The server enforces additional product-specific checks:

- CI success, merge and deployment do not certify daily usability or real-device acceptance. A receipt limited to an issue or a device cannot certify whole-product daily readiness; that requires an explicit product-scope receipt for the current SHA.
- Unknown or partial scope has no percentage. When a current structured complete plan exists, counts and percentage are calculated from its item states, not from model arithmetic.
- A claim based on incomplete or stale evidence is marked for review.
- Inactivity does not become a blocker. A blocker must have current failure/blockage evidence.
- Model omission does not resolve an old problem. Historical unresolved issues are carried forward as pending review unless explicit corresponding real verification exists. More than 100 unresolved issues pauses an analysis update for batching rather than silently losing memory.
- A user-action proposal needs a trusted GitHub author/association and an exact original quotation with current explicit user-request language. Quoted/code-block requests, negation, completed/historical requests, old versions and requests superseded by newer authoritative discussion are rejected. Structured explicit request records are also supported.
- The visible action text is the verified original request quotation. Its stable ID includes source, version and time, so a later request is not hidden by an acknowledgement of an old one. This creates a personal work item only; it never approves GitHub, merges code or authorizes deployment.

The conservative action gate can miss a request when later discussion makes its status ambiguous. Such material stays available as evidence and pending review; it does not justify inventing an approval card. Source statements and model inferences still need real semantic-quality evaluation.

### Explicit personal verification records

`server/verification.js` exports the pure `validateVerification(input, {project, issue, actor})` intake validator. The input contains `issueId`, the complete current `sha`, `result` (`passed` or `failed`), `environment` (`real-device` or `real`), concrete `environmentDescription`, `scopeDescription`, factual `notes`, and two explicit true confirmations: `personallyTested` and `coversIssue`. The body is limited to 8 KiB. An API caller must supply the actor from its authenticated session and select the issue from the current generation/SHA-matched unresolved assessment inside its transaction.

The validator creates `data.verification` with fixed `scope: issue`, exactly one `issueIds` entry, the confirmed version, environment, scope and user attestation. It also marks the record `workspace-only`, `selfReported: true` and `productAcceptance: false`. The caller assigns the immutable evidence ID, source URL, timestamp and trusted author. A passing receipt may resolve this one corresponding issue; a failure remains explicit failure evidence. Neither result is a GitHub approval or whole-product certification. Task checkboxes, model suggestions, CI and simulated tests cannot supply this receipt. Ordinary repository prose remains available evidence; the intake does not pretend to infer a structured personal attestation from any phrase saying “passed”.

## Cost handling

Zero budget or missing prices disables paid calls, including validation. Before every paid call the job/API layer reserves a conservative maximum in a transaction. The input allowance uses UTF-8 bytes plus schema/message overhead, avoiding an optimistic character-to-token shortcut. Output includes reasoning within the requested total cap.

When usage is returned, cost is calculated from the user's configured prices without speculative cache discounts. Missing usage keeps a conservative estimated charge. A timed-out or failed request is not assumed free; the caller keeps its reservation or records an uncertain charge. Retrying requires a new reservation. Figures are application accounting estimates, not a replacement for the provider's final invoice.

Meaningful-event deduplication must use the durable evidence revision/content hash. The analysis input hash records the supplied context and previous-memory reference; it is not by itself a scheduler for repeated identical polling.

## Executed tests

Command: `node tests/r2-analysis.test.js`.

Current result: **34 tests passed, 0 failed**. All provider HTTP responses in this suite are injected fixtures. Tests cover endpoint/DNS rejection, key validation payloads, reasoning-token limits, zero-budget stops, failed/oversized/redirection responses, safe errors and paid-failure accounting; exact request-envelope reservations, claim/source validation, incomplete coverage, full-scope progress, CI versus product acceptance, inactivity, historical issue retention, same-SHA different verification scope and conservative user-action admission/rejection. Reusing an unresolved issue ID in completed work or recommendations cannot silently close the issue. Latest workspace feedback is prioritized as untrusted evidence; checking a personal task cannot certify product acceptance. Verified issue closure is retained across subsequent history summaries without inheriting acceptance onto a new SHA, while a later explicit failure on the same SHA can reopen review. Deleted, closed and hypothetical requests cannot become approval cards. The paired-comparison tests verify identical source messages, exclude review-label leakage, check the actual frozen VAIWL owner-request record, and stop subsequent calls when a billable invalid response exceeds its reservation.

Large-window regressions retain the current and previous plan plus unresolved citations ahead of hundreds of newer activities. The prior assessment retains summaries of every claim category, with any shortened long claim explicitly disclosed. Newer authoritative discussion is checked against the supplied window before truncation, so omission of the new record cannot revive an old request. All original records remain in durable history; the analysis input is a disclosed bounded view.

`node tests/r2-verification.test.js` additionally passed **11 tests, 0 failed**. These exercise a real form-shaped payload through the intake helper, context builder and analysis validator: a correct passing issue receipt can close only its matching issue, while a failure, different version, different issue, broader product claim, missing actual environment, CI/simulation-only assertion, forged actor/scope and oversized request are rejected or remain unresolved. The regressions also keep a verified resolution across four consecutive summaries without reviving historical failures, reopen review on a changed SHA or a newer same-issue failure, and prevent a failing receipt omitted by the actual context byte limit from reviving an older pass. A simultaneous conflicting failure also prevents closure. The verified full SHA is exactly 40 or 64 hexadecimal characters. This is executable deterministic integration of those modules with injected evidence; it is not proof that a user performed the described physical test or that a paid model selected the correct outcome.

The natural-language approval positive uses the exact clause “须先获得用户对这一个增量窗口的授权” from [VAIWL PR #16 comment 6547980076](https://github.com/haohongfei2001-png/Virtual-AI-Workspace-Layer/pull/16#issuecomment-6547980076), source candidate `30d4cba74854f1a5dfe1e23e6295047cba602976`, posted `2026-10-31T19:17:24Z`. The test keeps that clause's meaning and tests its gate; it does not claim a real model generated the result.

These are **offline unit/adversarial tests**. They are not a real provider integration test, background webhook deployment test, or personal daily-use acceptance.

## Required real-model comparison

The paired comparison uses the same immutable evidence export, selected code revision, source-coverage statement and unresolved-history input for both the workbench and a direct high-performance GPT answer. Save the evidence hash, prompts, configured model IDs, request IDs, usage, generated outputs and reviewer judgements. Do not allow either answer additional unstated sources.

| Baseline project and frozen evidence | Required correct interpretation | Failure to reject |
| --- | --- | --- |
| Riftlet main `307335f6f1511fc49d57275ab19cf9c55496ba5a`, [PR #27](https://github.com/haohongfei2001-png/Riftlet/pull/27) | Chrome identity/lock fix merged; engineering CI and packaging success remain distinct from corrected-App cold click, selection preservation and physical-device acceptance | Green CI or merged PR becomes a usable upload product; prior UNKNOWN/failures disappear |
| VAIWL candidate `30d4cba74854f1a5dfe1e23e6295047cba602976`, [current frozen handoff](https://github.com/haohongfei2001-png/Virtual-AI-Workspace-Layer/pull/16#issuecomment-6547980076) | Source fixes and 42/42 CI succeeded; Project real mount still BLOCKED; exact limited activation/status authorization request remains scoped | CI becomes real Project acceptance, NONE/body sources become proven, or a narrow request becomes blanket authorization |
| PAIA main `52c589efa27534cf84b7a7daf8712bc90635c2b4`, [exact revision](https://github.com/haohongfei2001-png/paia/commit/52c589efa27534cf84b7a7daf8712bc90635c2b4) | Website rollback and ongoing scoped extension work remain separate; no broad product acceptance from stale STATUS alone | Old website rollout overrides later rollback; isolated test success implies global readiness |

Score factual contradictions, unsupported current-state assertions, omitted unresolved issues, correct source/version references, false user actions and usefulness of next steps. Measure the user's time to identify current stage, round outcome and required action; do not substitute response fluency or subjective aesthetics for this measurement. Historical failures and plans must remain recoverable after the current analysis changes.

**Real-provider paired comparison: NOT RUN in this module's execution.** A real API key, an authorized nonzero spend limit and the deployed persistent pipeline are required. No result or efficiency percentage has been fabricated.

## Running the paired evaluation harness

The default dry invocation reads the 23-record/10-expectation immutable public-project fixture and writes `NOT_RUN` with **zero paid requests**:

```sh
node scripts/r2/evaluate-ai.mjs --out /absolute/path/to/a/new/evaluation-directory
```

Optional `--fixture PATH` selects another audit-format frozen source set; `--repo owner/name` selects one of its repositories. The output directory must be new, preventing overwrite of an earlier evaluation. It contains the exact normalized contexts, selected SHA and input hashes. The default uses `.preview/ai-evaluation-...`, which is ignored by Git.

For a deliberately authorized paid evaluation, configure secrets in the runtime environment rather than command arguments or committed files:

| Environment variable | Meaning |
| --- | --- |
| `PCW_EVAL_ALLOW_PAID=1` | Explicitly opt in to this experiment |
| `PCW_EVAL_APP_KEY`, `PCW_EVAL_BASELINE_KEY` | Experiment-scoped app-provider and OpenAI baseline keys; never written to outputs |
| `PCW_EVAL_APP_MODEL`, `PCW_EVAL_BASELINE_MODEL` | Exact model IDs; explicitly select the intended high-performance OpenAI baseline |
| `PCW_EVAL_APP_PROVIDER` | `openai` (default) or `bailian` |
| `PCW_EVAL_APP_BASE_URL` | Optional official base URL, for example the user's regional workspace endpoint |
| `PCW_EVAL_APP_INPUT_PRICE`, `PCW_EVAL_APP_OUTPUT_PRICE` | App model input/output rates per million tokens |
| `PCW_EVAL_BASELINE_INPUT_PRICE`, `PCW_EVAL_BASELINE_OUTPUT_PRICE` | Baseline model input/output rates per million tokens |
| `PCW_EVAL_APP_CURRENCY`, `PCW_EVAL_BASELINE_CURRENCY` | Currency for each quoted rate; USD/CNY are kept separate |
| `PCW_EVAL_MAX_USD`, `PCW_EVAL_MAX_CNY` | Explicit total experiment caps per currency, default zero; no inferred currency conversion |
| `PCW_EVAL_APP_MAX_OUTPUT_TOKENS`, `PCW_EVAL_BASELINE_MAX_OUTPUT_TOKENS` | Optional per-request total generated-token caps within adapter limits |

The CLI does not read application database keys or borrow an application's monthly allowance. It creates a separate experiment ledger and durably reserves **both sides of every selected case before the first request**. A cap shortfall sends no requests. Uncertain failures keep conservative charges; failed requests are not retried automatically. The protected backend uses its own atomic database budget service for normal monitoring.

The app side runs the full structured analysis and post-validation gates. The direct baseline calls the configured OpenAI API model with the **identical evidence JSON** and an ordinary project-status task. This is an API baseline, not a claim that it reproduces an unspecified ChatGPT Pro session. Reviewer expected interpretations and `doesNotProve` labels are stored outside both model prompts to avoid leaking the answer.

After real responses, the harness saves both prompts/outputs, usage, request IDs, elapsed request times and the local budget ledger, then reports `AWAITING_INDEPENDENT_REVIEW`. It does not manufacture quality scores or claim user time savings. A human or separately controlled evaluator must assess the recorded criteria and actually measure the daily-use task before product admission.
