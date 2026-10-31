# R2 部署与运行手册

本手册描述仓库已有的部署入口和恢复动作。当前准入为 **NO GO**；没有把创建项目、写好迁移或本地测试通过记为真实服务已上线。交付 SHA、CI 和预览地址统一登记在 [R2 验证记录](r2-verification.md)。

## 1. 需要一次性完成的外部配置

| 必需事项 | 最小范围 | 完成后由工程侧继续的工作 |
| --- | --- | --- |
| 独立 PostgreSQL/Supabase 工作台资源 | 确认专用于本工作台的项目及数据库管理员配置入口；不借用 Riftlet、VAIWL 或 PAIA 的数据与分支 | 迁移、运行角色、TLS、Edge Functions、调度配置、备份和隔离验证 |
| GitHub App 注册与本人安装 | 私有 App、下表只读权限；安装时选 `Riftlet`、`Virtual-AI-Workspace-Layer`、`paia`，按需要增加工作台自身仓库 | 保存服务端 App 凭据，验证登录、安装归属、私有仓库读取和真实投递 |
| 受保护预览的自动化入口凭据（工程侧配置） | 现有 Vercel 连接已可管理该项目，无需用户另行提供凭据；工程侧为专用桥生成 automation bypass secret，保持 SSO 全部部署保护 | 获得专用数据库后连续完成固定 origin、HMAC 入口和五分钟调度 |
| 模型 Key、实际价格与预算 | 在工作台「连接与模型」输入 OpenAI 或百炼 Key、明确模型 ID、对应币种单价和预算 | 验证 Key、运行真实分析、同源比较并组织一次完整个人验收 |

不要把密钥贴进 PR、文档、URL 查询参数或浏览器持久存储。本人必须完成的环节是外部账户授权、安装选择及自己的模型计费配置；其余已授权工程动作可以连续执行，不需要每个模块重复验收。

现有 Vercel 项目 ID 为 `prj_jMACJa78zQN6fGjyN3i8j14MdACd`，已知项目保护是 SSO `all`。项目存在不代表数据库、App 或模型已配置。预览部署及配置证据仍以验证记录为准。

本轮只读核对发现现有 Supabase 组织使用 Pro，已有两个其他产品项目。尚未创建工作台专用项目：新增项目涉及外部资源与费用，需要本人确认专用资源及费用授权；不能拿其他产品数据库代替该授权。拿到已获准的专用数据库连接或完成这一项授权后，工程侧再连续完成迁移、入口与调度。

## 2. 本地运行与构建

需要 Node.js 22 或以上；CI 使用 Node.js 24。运行依赖为 `pg` 与 `@vercel/functions`；PGlite 只用于测试。以下命令在仓库根目录运行：

~~~bash
npm ci --ignore-scripts
npm run check
npm run dev
~~~

默认入口为 `http://localhost:3000`。未设置外部服务时，应显示配置事项而不是示例项目。仅查看旧原型可进入 `/watch-v1.html`。`npm run build` 生成 `dist/`，`npm run preview` 使用同一 Node 服务读取构建产物，API 仍由服务端处理。

脚本不会自动加载 `.env`。需要本地服务配置时，先把 `.env.example` 复制为被 Git 忽略的 `.env`，在安全编辑器填入值，再运行：

~~~bash
node --env-file=.env scripts/dev.mjs
~~~

本地 OAuth 使用的回调、`PCW_ORIGIN` 和实际端口必须一致。远程 GitHub Webhook 不能投递到本地回环地址；真实端到端验收使用受保护托管预览。

## 3. 数据库与运行角色

先在专用数据库执行版本化迁移。迁移脚本按名称排序应用 `db/NNN_*.sql`，首先是 [001_workspace.sql](../db/001_workspace.sql)，后续恢复迁移也由同一个入口执行。脚本只读取 `PCW_MIGRATION_DATABASE_URL`，不会回退到应用运行连接。管理员连接只放在操作端安全环境，不能配置成浏览器变量或应用默认运行凭据：

~~~bash
node --env-file=.env.migration scripts/r2/migrate.mjs
~~~

`.env.migration` 由操作者本地创建，包含 `PCW_MIGRATION_DATABASE_URL` 和必要时的 `DATABASE_CA`；同样被 Git 忽略。成功输出包含实际 `migrations` 列表、`rlsTables` 数量以及 `forcedRls: true`、`runtimeRoleVerified: true`、`immutableRecordsVerified: true`。本候选包括 001 核心迁移和 [002_delivery_recovery.sql](../db/002_delivery_recovery.sql)，共 22 张表；以本次列表和检查结果为准。这只是迁移与权限检查成功，仍需验证独立运行登录能切换到 `pcw_app`。

迁移创建的 `pcw_app` 是 NOLOGIN、NOSUPERUSER、NOBYPASSRLS 角色。数据库管理员首次创建独立登录，并通过交互方式设置随机密码，例如在管理员 psql 会话中：

~~~sql
CREATE ROLE pcw_runtime LOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS
  NOCREATEDB NOCREATEROLE;
GRANT pcw_app TO pcw_runtime;
\password pcw_runtime
~~~

将该登录的连接字符串保存为服务端 `DATABASE_URL`。若数据库禁用了默认 CONNECT，管理员另行授予该专用数据库的 CONNECT。使用托管连接池时核对它要求的用户名格式及端口；代码使用事务内 `SET LOCAL ROLE pcw_app` 和事务内用户作用域，连接池必须允许这些语句。不能把迁移管理员或 Supabase `service_role` 放入前端来绕过连接问题。

远程连接通过 [postgres-config.js](../server/postgres-config.js) 解析成显式参数，始终验证 TLS 证书；需要专用 CA 时配置 `DATABASE_CA`。常见 `sslmode=require` 可用，但仍强制 `rejectUnauthorized: true` 并保留 CA。远程 `disable`、`no-verify`、`uselibpqcompat`、URL 证书文件参数及其他未支持的 query 会被拒绝，不能悄悄覆盖保护。只有明确的 localhost/127.0.0.1/::1 可默认使用无 TLS。`pcw` 不加入 Supabase 公开 Data API schema，不授予 `anon`/`authenticated` 访问。

首次启动后用运行连接验证：

~~~sql
BEGIN;
SET LOCAL ROLE pcw_app;
SELECT current_user;
SELECT set_config('pcw.worker','on',true);
SELECT version FROM pcw.migrations;
SELECT count(*) AS rls_tables
FROM pg_tables WHERE schemaname='pcw' AND rowsecurity=true;
ROLLBACK;
~~~

如果已有非本候选版本的 `pcw` schema，先比较迁移版本和列定义。`CREATE TABLE IF NOT EXISTS` 不会给旧表自动补新增列；不要对共享或不明版本数据库盲目复用初始化脚本。

## 4. 服务端环境变量

完整源定义见 [server/config.js](../server/config.js) 与 [.env.example](../.env.example)。

| 变量 | 配置位置与用途 |
| --- | --- |
| `PCW_ORIGIN` | Vercel Preview 环境；固定受保护预览/分支别名 origin。用于 OAuth、cookie 和 Origin 校验，不带路径 |
| `DATABASE_URL` / `DATABASE_CA` | Vercel 服务端或独立 worker；受限运行登录和可选 CA |
| `PCW_ENCRYPTION_KEY` | 服务端；32 字节随机值的 Base64，用于 AES-256-GCM |
| `PCW_ENCRYPTION_KEYS` | 可选轮换映射 JSON；按对象顺序第一个 key ID 写入，旧 key ID 用于解密已有记录 |
| `PCW_OWNER_GITHUB_ID` | 允许登录的 GitHub 数字账号 ID；本仓库默认 `326690450` |
| `GITHUB_APP_ID` / `GITHUB_APP_SLUG` | 注册的工作台 GitHub App 身份 |
| `GITHUB_APP_PRIVATE_KEY` | App PEM 私钥；支持真实换行或 `\n` 形式 |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | GitHub App 的用户授权配置，不是另建的竞争 OAuth App |
| `GITHUB_WEBHOOK_SECRET` | GitHub App、Vercel 后端、GitHub ingress 使用同一个随机 secret |
| `CRON_SECRET` | 后端 `/api/cron` 专用 bearer secret；只由可信调度调用方持有 |
| `PCW_PROVIDER_HOSTS` | 可选管理员允许的兼容模型 HTTPS 精确主机名，以逗号分隔 |

模型 API Key 不作为网页构建变量：用户在登录后的配置页提交，服务端加密保存。`NEXT_PUBLIC_`、`VITE_`、`PUBLIC_` 变量不能承载上述秘密。

配置变更后重新部署预览。没有固定 `PCW_ORIGIN` 时程序会推导 Vercel branch/deployment URL，但 OAuth 回调和用户访问仍必须统一到同一地址，验收时显式设置更容易核对。

## 5. GitHub App 注册和安装

[config/github-app-manifest.json](../config/github-app-manifest.json) 已填本轮固定预览别名，Webhook 的 `example.invalid` 占位地址必须替换为专用 Supabase 入口；实际 `PCW_ORIGIN` 若变化，同步更新两个回调。模板 App 名称为 `pcw-haohongfei2001-r2`，最终需满足 GitHub 唯一性；按[官方注册要求](https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/registering-a-github-app)，名称不超过 34 个字符。当前工程没有 manifest code-conversion HTTP 路由；不能把 `/api/auth/callback` 当成 manifest 转换回调。最直接的操作是打开 [GitHub App 注册页](https://github.com/settings/apps/new)，按模板填写字段；若使用 GitHub 官方 manifest 注册流程，需由部署操作者另行完成该流程的 code 换取配置步骤。

| App 设置 | 值 |
| --- | --- |
| Homepage URL | 固定 `PCW_ORIGIN` |
| Callback URL | `PCW_ORIGIN/api/auth/callback` |
| Setup URL | `PCW_ORIGIN/api/github/callback` |
| Request user authorization during installation | 关闭；工作台先登录，再发起带 state 的安装 |
| Redirect on update / setup_on_update | 关闭；来源变更后在工作台重新读取授权仓库 |
| Webhook Active | 开启 |
| Webhook URL | `https://PROJECT_REF.supabase.co/functions/v1/github-ingress`，无查询参数 |
| Webhook Secret | 与服务端 `GITHUB_WEBHOOK_SECRET` 相同 |
| Installation availability | 仅 App 所有者，`public: false` |

仓库权限全部设为 **Read-only**：Metadata、Contents、Pull requests、Issues、Actions、Checks、Commit statuses、Deployments。无需 Contents 写入、PR 写入、Administration、组织成员管理或工作流修改权限。

显式订阅事件见模板：push、pull_request、pull_request_review、pull_request_review_comment、issue_comment、issues、workflow_run、workflow_job、check_suite、check_run、status、deployment、deployment_status、repository。`installation` 与 `installation_repositories` 由 GitHub 自动投递，不手工加入订阅列表。依据：[GitHub manifest 参数](https://docs.github.com/en/apps/sharing-github-apps/registering-a-github-app-from-a-manifest)、[Webhook 事件说明](https://docs.github.com/en/webhooks/webhook-events-and-payloads#installation)。

注册后把 App ID、slug、PEM、client ID、client secret 和 webhook secret 放入服务端安全配置。服务端可登录后，在工作台「连接 GitHub App」发起安装，选择 **Only select repositories**：`haohongfei2001-png/Riftlet`、`haohongfei2001-png/Virtual-AI-Workspace-Layer`、`haohongfei2001-png/paia`。若此前已在 GitHub 直接安装，登录后「添加项目」会重新查询和验证当前账户安装，不依赖未经验证的 installation ID。

本候选没有持久化用户 refresh token 或自动续期用户授权：GitHub 用户 token 过期或撤销后，读取安装/仓库列表返回 401，界面要求重新登录。GitHub 新 App 默认启用到期用户 token；无需为工作台关闭这个保护。后台监控使用独立的短期 installation token，不依赖用户浏览器会话持续打开。依据：[GitHub 用户 token 续期与过期说明](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/refreshing-user-access-tokens)。

## 6. 受保护预览、事件入口和后台调度

Vercel 保持整个项目的部署保护。GitHub 无法使用人的 SSO 会话，因此使用 [github-ingress](../supabase/functions/github-ingress/index.ts)；调度器使用 [cron-forwarder](../supabase/functions/cron-forwarder/index.ts)。两者共享固定服务端目标，不接受用户传入转发 URL，不跟随重定向，不把调用方的 cookie/authorization 转发给预览。

GitHub 入口校验原始请求体 HMAC、event/delivery headers 和 2 MiB 限制，在 7 秒总时限内转发到固定 `/api/webhooks/github`。只有后端持久化接口返回 JSON `accepted: true`，桥才确认成功；登录 HTML 或普通 HTTP 200 都不是成功回执。原始载荷超过上限会明确失败，需要检查 GitHub 投递记录并依赖后续补读，不能把拒绝解释为无事件。

定时链路为 Supabase pg_cron → pg_net → cron-forwarder → 固定 `/api/cron`。数据库只发送短时、用途绑定的 HMAC 请求；Vercel automation bypass 与 `CRON_SECRET` 仅由 Edge 函数在通过校验后注入请求头。这样 pg_net 队列或重定向目标不持有长期 bypass/cron 凭据。

| Edge 环境变量 | github-ingress | cron-forwarder |
| --- | --- | --- |
| `PCW_PREVIEW_ORIGIN` | 必需，固定 `https://ALIAS.vercel.app` | 同一值 |
| `VERCEL_AUTOMATION_BYPASS_SECRET` | 必需，仅服务端 | 必需，仅服务端 |
| `GITHUB_WEBHOOK_SECRET` | 必需 | 不使用 |
| `CRON_SECRET` | 不使用 | 与 Vercel 相同 |
| `PCW_SCHEDULER_HMAC_KEY` | 不使用 | 独立 64 个十六进制字符（32 字节）的密钥 |

[supabase/config.toml](../supabase/config.toml) 对这两个专用函数设置 `verify_jwt = false`；函数内部仍分别强制 GitHub HMAC 或调度 HMAC，不开放通用代理或无认证工作台 API。官方配置依据：[Edge Function 配置](https://supabase.com/docs/guides/functions/function-configuration)、[周期调用](https://supabase.com/docs/guides/functions/schedule-functions)、[Vercel automation header](https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection/protection-bypass-automation)。

部署与设置密钥前先在操作环境核对已安装 CLI：

~~~bash
supabase --version
supabase functions deploy --help
supabase secrets set --help
~~~

本轮只执行过 Supabase CLI 2.122.0 的 help，没有用 CLI 登录、配置或部署。该版本已核对以下参数。将表中的全部 Edge 变量保存在被 Git 忽略的 `.env.ingress`，替换项目引用后可执行：

~~~bash
supabase secrets set --env-file .env.ingress --project-ref YOUR_PROJECT_REF
supabase functions deploy github-ingress cron-forwarder --project-ref YOUR_PROJECT_REF --use-api
~~~

`--use-api` 不要求本地 Docker；不使用 `--prune`，避免删除同项目的其他函数。也可在 Supabase Dashboard 为同一个专用项目部署这些入口并写入安全配置。不要在命令参数中拼接秘密，也不要让 browser bundle 包含 Edge secret。

调度配置脚本为 [configure-scheduler.mjs](../scripts/r2/configure-scheduler.mjs)。操作端另设 `PCW_SCHEDULER_DATABASE_URL`（专用管理员连接）、`PCW_SCHEDULER_EDGE_URL`（`https://PROJECT_REF.supabase.co/functions/v1/cron-forwarder`）和与 Edge 一致的 `PCW_SCHEDULER_HMAC_KEY`；专用 CA 使用 `PCW_SCHEDULER_DATABASE_CA`，TLS 验证保持开启。默认只检查；以下应用命令会实际创建五分钟定时任务，应在项目与目标核对后执行：

~~~bash
node --env-file=.env.scheduler scripts/r2/configure-scheduler.mjs --check
node --env-file=.env.scheduler scripts/r2/configure-scheduler.mjs --apply
~~~

独立 Node 执行环境也可在相同服务端变量下运行 `npm run worker`；该命令执行一次调度和一轮 worker 后退出，不是常驻 daemon。若选择这种方式，外部进程管理器需每五分钟触发。不要同时启用多个不必要的调度来源；数据库去重用于容错，不用于掩盖配置混乱。

`vercel.json` 只配置构建、API rewrite、120 秒函数上限和安全响应头，没有假定预览自动获得生产 Vercel Cron。

### Webhook 失败投递恢复

[recovery.js](../server/recovery.js) 使用本 App 的 JWT 查询 `/app/hook/deliveries`，并向失败 delivery 的 `/attempts` 请求重投；无需给被监控仓库增加写入权限。只处理本工作台已绑定、当前有效且属于允许个人账号的安装和仓库范围。授权在数据库 reservation 事务中复核；若撤权发生在已发出请求之后，无法取消在途网络请求，后端仍按当前权限决定是否写入项目事实。

默认每轮至多 15 秒、读取 3 页（每页最多 100 条元数据）、请求 2 次重投。游标、扫描边界、租约和各次请求结果持久保存；并发 worker 不重复占用同一恢复租约。只有完整读完本轮有限范围后才开始重投，避免把后页已有成功记录误当成仍失败。同一 delivery 最多自动尝试 5 次，以两分钟起步指数退避，并尊重服务商的限流等待；五分钟调度会使实际重试时间更晚。

上游重投接口的 **202 不是已恢复**。它只使状态进入 `requested`；必须在 `pcw.deliveries` 找到同 installation、同 GUID 的持久回执，才成为 `recovered`。网络响应不确定保留 `unknown`。上游成功但没有本地回执为 `unconfirmed`，超次数为 `exhausted`，超提供方窗口为 `expired`，不静默清零。投递健康详情保存在 `webhook_recovery` heartbeat。

GitHub 不自动重投失败 Webhook；GitHub.com 当前可查看及重投的窗口为 **3 天**。长时间停机会记录 `retention_gap`，不会声称事后 REST 补读恢复了已经删除的短暂评论或全部原始事件。窗口内可在修复入口后用 GitHub App Settings → Advanced → Recent deliveries 手动重投，随后核对本地回执。来源：[官方重投说明](https://docs.github.com/en/webhooks/testing-and-troubleshooting-webhooks/redelivering-webhooks)、[官方记录窗口](https://docs.github.com/en/webhooks/testing-and-troubleshooting-webhooks/viewing-webhook-deliveries)、[GitHub App Webhook API](https://docs.github.com/en/rest/apps/webhooks)。本轮没有用真实 App 执行故障重投，必须纳入接通后的验收。

## 7. 首次真实接通后的检查顺序

1. 未登录访问受保护预览应遇到 Vercel 身份验证；进入后 `/api/bootstrap` 应如实列出剩余配置。`/api/health` 的 `configured` 仅反映配置是否齐全，不能证明数据库可用或后台活跃。
2. 完成 GitHub 登录，确认只允许预设个人账号。选仓库后核对安装 ID、仓库 ID、开发线与计划路径；至少读取一个确已授权的私有仓库。
3. 查看调度与 worker 心跳。前端把最近 15 分钟有 scheduler heartbeat 视为健康；该指标不能替代实际成功任务和证据时间检查。
4. 保存模型配置，填写非零预算及实际单价，再点击验证。验证本身会消费少量额度。完成一次实际分析，核对 usage、request ID、来源和历史。
5. 按 [验收旅程](r2-verification.md#真实用户环境验收旅程) 关闭浏览器，等待自然产生的有效事件；观察后台入库、分析、重新打开及旧历史保留。不能为测试擅自修改监控产品的正式代码或发送评论。

## 8. 诊断、恢复和保留

只在可信的数据库管理会话中查看下列无密钥字段。不要把私有仓库原文或 delivery payload 自动复制进公开日志：

~~~sql
BEGIN;
SET LOCAL ROLE pcw_app;
SELECT set_config('pcw.worker','on',true);
SELECT name,last_at,detail FROM pcw.heartbeats ORDER BY name;
SELECT kind,status,count(*) FROM pcw.jobs GROUP BY kind,status;
SELECT repo,status,last_synced_at,last_error FROM pcw.projects;
SELECT purpose,status,reserved_micros,charged_micros,error_code,created_at
FROM pcw.usage ORDER BY created_at DESC LIMIT 20;
SELECT status,count(*) FROM pcw.webhook_recovery_groups GROUP BY status;
SELECT app_id,incomplete,retention_gap,last_successful_poll_at,last_error,next_poll_at
FROM pcw.webhook_recovery_state;
ROLLBACK;
~~~

| 现象 | 检查与恢复 |
| --- | --- |
| 一直显示待配置或数据库不可用 | 核对环境作用域、迁移、运行角色授权、TLS；不删除旧数据重来 |
| GitHub delivery 失败或返回 SSO HTML | 核对固定 preview origin、automation bypass、Edge secret 和后端 webhook secret；观察恢复 heartbeat，必要时在三天窗口内手动重投同一 delivery 并核对本地回执 |
| 恢复显示 expired、exhausted、unconfirmed 或 retention_gap | 保留恢复账本和缺口；核对 GitHub 记录、修复入口并完成可用范围的补读，不把缺失历史标为已完整恢复 |
| 限流或来源只读到一部分 | 保留游标与已读取事实，让 worker 在 retryAt/下一周期续读；检查覆盖详情，不能手动标完整 |
| 仓库权限撤销 | 项目标记 permission_revoked，停止该仓库读取并保留历史；本人重新授权后重新选择仓库 |
| 模型 Key 拒绝 | 更新对应模型配置并验证；不撤销 GitHub 安装，不清空历史 |
| 模型超时/输出无效/结果未确认 | 保留费用与旧判断待复核；检查调用记录后使用明确的「重新分析」，不自动重复付费 |
| 预算不足或价格未填 | 停止 AI，事实采集继续；按实际账单口径调整配置。已用连接不能偷偷切换记账币种 |
| cost_review | 服务商用量超预留，暂停后续调用；先核对模型 token 上限和价格，不直接把状态改 active |
| KEY_UNAVAILABLE | 检查加密轮换映射；保留旧解密 key，不重建项目或覆盖旧密文 |
| schedulerHealthy 为 false | 检查 pg_cron 执行、Edge 响应和 scheduler/worker heartbeat；浏览器重新打开不算修复 |

数据库备份须覆盖 `pcw` 全部表；加密 key 在独立密钥管理中备份，否则恢复数据库后仍无法解密。当前没有一键密文全量重加密命令：轮换映射保留旧 key，新保存的凭据使用首项，逐步重新保存模型凭据及重新登录后再审查旧 key 是否可移除。回退 Web App 部署时保留数据库、证据和消费记录；迁移回退或数据删除需要单独审查，不能以删除历史作为故障恢复步骤。
