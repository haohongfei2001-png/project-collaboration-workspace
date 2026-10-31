# R2 验证记录与产品准入

记录日期：2026-10-31 UTC（北京时间 2026-11-01）。本文件随最终候选提交更新；记录“已实现”“测试通过”“实际服务已接通”和“本人日用可用”四种不同结论。

## 准入结论：NO GO

**现在还不能把工作台当作真实项目进度的日常主要入口。** 当前已有统一的 R2 源码和受保护预览，公开 GitHub 真实读取及本地服务端链路有证据；实际 GitHub App/私有仓库、目标数据库、真实模型、托管后台调度及关闭浏览器后的完整旅程未全部接通验收。

| 候选标识 | 当前记录 |
| --- | --- |
| 统一 PR | [PR #1](https://github.com/haohongfei2001-png/project-collaboration-workspace/pull/1) |
| 分支 | `design/prototype-r1-20261031` |
| 最终候选 SHA | 与本记录同一 PR 的候选；精确 SHA 和交付记录见 [PR #1](https://github.com/haohongfei2001-png/project-collaboration-workspace/pull/1) 顶部交付表 |
| 对应 GitHub Actions | [PR Checks](https://github.com/haohongfei2001-png/project-collaboration-workspace/pull/1/checks)；只采信同一 HEAD 的 integration / postgres，运行链接与结果登记在 PR 顶部 |
| 首次 R2 受保护预览 | [不可变部署 URL](https://project-collaboration-workspace-frtyoadsc-haohongfei2001-8529.vercel.app) |
| 首次预览源码 | `810f2094e147525dde6f43472dbff374bfa04e97`，早于后续集成修复 |
| 固定预览别名 | [R2 Preview](https://project-collaboration-workspace-git-84cb82-haohongfei2001-8529.vercel.app) |
| Vercel 项目 | `prj_jMACJa78zQN6fGjyN3i8j14MdACd`，SSO 保护 `all` |
| 生产发布 | 未授权、未执行；预览 READY 不等于产品验收通过 |

首次预览已实际观察到未认证请求返回 **302**。一次限时 share 授权测试实际得到 `GET /api/bootstrap` **200**，内容为 `configured: false`、空 `projects`，没有回退到历史示例状态。限时凭据不写入本记录，也不作为长期事件或调度入口。该部署早于后续修复；最终候选必须再次核对部署 SHA 和当前行为。

真实 Cloud Chrome 的页面导航、未配置状态、旧版入口和桌面布局观测见 [浏览器检查记录](evidence/r2-browser-verification.md)，实际视口为 1363 × 936。未配置登录入口曾仍可点击，已补源码回归，等待新部署复测。该记录的三张真实截图已保存至 `docs/evidence/images/` 并登记摘要，作为带明确部署 SHA 的版本化证据。窄屏与真实登录后的连续使用仍未完成。

已创建仅作用于 Preview 的加密 `PCW_ENCRYPTION_KEY`、`CRON_SECRET` 及固定 `PCW_ORIGIN` 配置；需新部署生效。数据库、GitHub App、用户模型配置及 Edge/cron 的真实连接仍缺。只读核对的 Supabase 组织为 Pro，已有两个其他产品项目；工作台专用项目尚未创建，新增资源的费用授权仍需本人确认。不能因已有平台账号或某几个环境变量就将配置检查写成通过。

## 验证分层

| 层级 | 已有结果 | 证明范围 | 不证明什么 |
| --- | --- | --- | --- |
| 本地领域、适配器和 UI 回归 | 见下表 | 代码在明确反例、结构及状态条件下的行为 | 不是真实 OAuth、模型或使用体验 |
| 本地服务端集成 | PGlite 执行 001/002 真实迁移、22 表 RLS 与事务；真实 Node HTTP server，GitHub/模型响应注入 | 签名 HTTP→安装 token→collector→SQL→模型→重新打开 API 的连续应用链路 | 不等于远程 PostgreSQL 多连接、真实付费 AI 或托管闭浏览器旅程 |
| 真实公开 GitHub 读取 | 24 次只读 GET、411 条事实观测；全部为部分覆盖 | collector 确实读取了三个真实公开仓库及一次续读 | 无 App 安装、无私有仓库、无目标 DB、无模型、无闭浏览器 E2E |
| GitHub CI 的 PostgreSQL 集成 | 工作流配置 PostgreSQL 17 服务，另执行 `npm run db:migrate` 权限检查；当前候选的实际运行链接与结果以 PR 交付表及 Checks 为准 | 实际 pg 连接、多会话角色与锁、事务、迁移权限和 HTTP 集成 | 网络模型与 GitHub 仍注入，不是外部服务端到端 |
| 受保护 Vercel 预览 | 首次部署 READY；未授权 302；限时访问 bootstrap 200 且未配置 | 真实构建部署、保护和诚实初始化 | 不代表后台监控运行或个人日用通过 |
| Supabase Edge 与定时器 | 入口源码、CLI help 与只读配置检查；目标部署 **NOT_CONFIGURED** | 配置命令和边界可检查 | 未声称 Edge 已部署或五分钟投递已发生 |
| 真实付费模型与同源比较 | **NOT_RUN，0 次付费请求** | 有固定源、版本、输入哈希、预算和比较工具 | 没有质量评分，也未证明优于直接询问高性能 GPT |
| 本人实际项目日用 | **NOT_RUN** | 尚无完整旅程结果 | 不能宣布正式可用 |

## 本地自动化记录

下列数量来自本轮各负责模块最近完成的运行。后续改动须以最终候选对应的 `npm run check` 和 CI 覆盖，不能混用不同 SHA 的结果。

| 命令/模块 | 最近记录 | 类型 |
| --- | --- | --- |
| `npm run test:legacy` | 94 项既有回归 | 保留的 R1、个人 V1、Watch V1 |
| `node tests/r2-github.test.js` | 28 passed | GitHub HTTP 注入、签名、规范化、分页及补读反例 |
| `node tests/r2-analysis.test.js` | 34 passed | 模型 HTTP 注入、结构化判断、预算及记忆反例 |
| `node tests/r2-ui.test.js` | 22 passed | 前端客户端/渲染适配；不是全部真实浏览器点击旅程 |
| `node tests/r2-server.test.js` | 35 passed | 本地 PGlite、真实 HTTP server、注入外部网络；含签名入口至重新打开 API 的连续链路 |
| `node tests/r2-verification.test.js` | 11 passed | 真实表单形状至来源约束 AI；个人自报、版本/问题/范围约束与多轮历史 |
| `node tests/r2-db-config.test.js` | 6 passed | 无网络构造实际 pg.Client，检查有效 TLS 参数与 CA 不被 URL 覆盖 |
| ingress/cron/configure-scheduler 回归 | 20 passed | 窄入口认证、重定向、超时、调度配置边界；Vault/pg_net/pg_cron 使用局部替身 |
| App 失败投递恢复回归 | 14 passed | 真实迁移/SQL；App 投递查询与重投响应注入，不是真实 App 故障重投 |
| `npm run check` / `npm run build` | 264 passed / 0 failed / 0 skipped，构建通过 | 语法、完整套件和构建产物 |

早期集成记录曾出现 **24/25**：新增发送前租约检查后，一个旧测试继续复用已经结束的 job。修复测试为重新 claim 真实任务，再校验显式重试；随后新增资料/任务历史、已解决问题排除、发送前租约/关注状态、调度 nonce、长回填、嵌套历史正文、撤权后的编辑、未完成回填禁止用户事项及连续注入链路覆盖，本地记录为 35/35。这不是通过放宽生产租约校验获得的绿色结果。远端 CI 的最终状态单独记录在 PR 的同 SHA 交付表，不能把本地修复当作远端已通过。

完整本地收据包含模块计数、源文件摘要及构建结果：[r2-local-verification.json](evidence/r2-local-verification.json)。

20 项桥接/调度测试使用可运行的 Node Web API、本地 HTTP 重定向及 PostgreSQL WASM/pgcrypto；Vault、pg_net、pg_cron 是明确标识的局部替身，不能写成真实 Supabase 云端集成。实际 `configure-scheduler --check` 因缺少 `PCW_SCHEDULER_DATABASE_URL` 返回 `NOT_CONFIGURED / ENV_REQUIRED`，没有执行 `--apply`。

独立终审还复现并修复了 pg URL 的 TLS 覆写：原始 `connectionString` 中的 `sslmode=disable`、`no-verify` 或 libpq 兼容参数会覆盖代码的 SSL 配置，普通 `require` 也会丢弃自定义 CA。现在运行连接和迁移共用显式解析，六项测试检查 pg.Client 的实际有效连接参数。新迁移末尾的 FORCE RLS、角色属性及三类不可变记录权限查询已在 PGlite 执行通过；这不是远程 TLS 握手或目标托管数据库验收。

### 已覆盖的关键反例

| 用户关心的场景 | 自动化依据 |
| --- | --- |
| 同一 delivery 重复投递、相同 ID 内容冲突 | GitHub 签名校验与 store 事务去重；冲突拒绝 |
| Webhook 失败补投 | 实现持久游标/租约/有限重试；202 与本地回执分开，三天超窗保留缺口；14 项回归通过 |
| 乱序事件、过期同步和开发线切换 | 保留两条事实，旧 head/旧 tracking version 不覆盖当前投影 |
| CI 失败后重试成功、同 SHA 不同验证范围 | 每次 attempt 与验证范围分别保留；绿色 CI 不能替代产品验收 |
| 授权撤销和重新授权 | 停止读取/任务、历史保留；重新绑定已授权安装后恢复 |
| API 限流、缺少来源、超页数或超正文 | 保存已读事实与续读游标，显示不完整；不把错误转为空成功 |
| 模型故障和 Key 拒绝 | 旧判断待复核、账本保留；只影响实际模型版本，不误撤销 GitHub |
| 预算并发、重复任务、失败计费 | 事务预留、generation/provider/version 去重；未知已发送结果不自动再次付费 |
| 首次长回填仍未读完 | 最多一次部分分析；来源完整复核前禁止用户事项，续读页不各自重复付费 |
| 密钥替换/撤销、过期 worker | 发送前版本和租约检查，保存时失效结果不能成为当前分析 |
| 用户隔离和数据权限 | 实际 SQL RLS 拒绝跨用户读/写及归属转移；证据/审计/处理记录不能改删 |
| 个人实测记录 | 当前 generation/SHA/单问题范围、本人自报/明确确认、幂等事务；35项server套件包含真实HTTP到AI关闭问题的注入链路。新失败覆盖旧通过，历史不删除；单项通过不是产品验收 |
| 资料与任务修改、旧问题解决后再分析 | 追加 workspace_record；保留旧历史；任务打勾不能当验收；已解决历史失败不反复自动开启 |
| 假审批、提示注入、来源捏造 | 固定系统指令/JSON 数据边界/无工具；未知 ID 拒绝；可信作者+精确引用+当前明确请求 gate |
| 配置不完整或 API 故障 | 首页显示实际阻断，项目列表不降级成旧种子数据 |

详见 [测试源文件](../tests/r2-server.test.js)、[AI 验证说明](ai-evaluation.md) 和 [.github/workflows/verify.yml](../.github/workflows/verify.yml)。

## 真实公开读取证据

原始 receipt 原样保存为 [r2-real-read.json](evidence/r2-real-read.json)。使用现有环境代理的 Node fetch，固定 GitHub API origin，无用户或 App token，只发 GET，未修改这些产品代码或发送评论。

| 读取片段 | 时间 UTC | GET 次数 | 事实观测条目 | 未完成任务 | 读取 head |
| --- | --- | --- | --- | --- | --- |
| VAIWL 初次 | 19:38:52 | 6 | 76 | 20 | `30d4cba74854f1a5dfe1e23e6295047cba602976` |
| VAIWL 续读 | 19:41:05 | 6 | 52 | 65 | 同一候选 |
| Riftlet | 19:40:39 | 6 | 81 | 17 | `5c552fc252a1e79b8370d0ce4d1b43700dcc2151` |
| PAIA | 19:40:37 | 6 | 202 | 68 | `52c589efa27534cf84b7a7daf8712bc90635c2b4` |

411 是这四个输出片段的条目数之和，不承诺 411 个互不重复的 GitHub 事件。四片段均为 `complete: false`，仍有 cursor。VAIWL main 为 `033f05608a97bb2f3d5da5995b60ca8ac2dd7c3b`，Riftlet main 为 `307335f6f1511fc49d57275ab19cf9c55496ba5a`；候选开发线和 main 不能混为同一版本。

实网首次遇到的错误已保留：直接 Node fetch 出现网络错误，使用环境已有代理后恢复；GitHub 返回的规范 `/repositories/{id}` 分页地址最初被过严路径检查拒绝，随后只允许已验证同一仓库 ID 的规范形式，并补充回归。真实读取发生在后续 issues 补读及部分调度/默认路径改动之前；receipt 内的 currentSourceSha256 不是给所有历史执行追认的精确代码哈希。

receipt 的 `file` 字段是执行时临时输出路径，摘要含各输出 SHA-256；这些临时路径不是本仓库交付文件。用于可重复语义比较的 23 条选定原文已另外固化在 [real-project-evidence.json](../tests/fixtures/real-project-evidence.json)，两者用途和数量不能混用。

## 真实模型比较

[evaluate-ai.mjs](../scripts/r2/evaluate-ai.mjs) 的无密钥运行结果为 `NOT_RUN`，0 次付费请求，收据见 [r2-ai-evaluation-not-run.json](evidence/r2-ai-evaluation-not-run.json)。应用分析和直接 OpenAI 基准使用逐字相同的证据 JSON、同一选定 SHA 和输入哈希，不把审核预期答案放入提示。

付费执行要求独立显式 Key、模型、实际价格、币种预算和 `PCW_EVAL_ALLOW_PAID=1`。每一对调用都事先持久化预留；失败也记账，超预留停止后续请求。结果最多标为 `AWAITING_INDEPENDENT_REVIEW`；脚本不会自行给“通过”或“节省时间”的分数。直接 OpenAI API 基准不冒称 ChatGPT Pro 产品的内部环境。具体命令和审核量表见 [AI 评估文档](ai-evaluation.md)。

## 真实用户环境验收旅程

以下项目目前全部待执行。完成外部配置、工程集成与关键修复后集中组织一次验收，不把每个模块单独交给用户反复试错。

| 步骤 | 必须保存的可核对证据 | 通过条件 |
| --- | --- | --- |
| 1. 登录并选择仓库 | 个人账号、安装 ID、实际仓库 ID、授权范围；不记录 token | 只看到授权的仓库；私有仓库确能读取 |
| 2. 关闭工作台 | 关闭时间与之前的 project generation/analysis ID | 后续任务不由页面刷新触发 |
| 3. 等待新有效事件 | GitHub delivery ID、事件时间、来源 URL、SHA | 来自真实开发自然发生的 PR/CI/评论等事件 |
| 4. 后台获取并保存 | delivery、job、evidence ID 与 occurred/observed 时间 | 事件持久化，重复投递不重复，未完整来源明确标注 |
| 5. AI 结合历史更新 | analysis ID、input hash、来源集合、模型 request ID 与消费记录 | 新旧版本对应，失败/待验证/用户事项准确，不超预算 |
| 6. 重新打开工作台 | 后台完成时间早于重开时间；页面显示该 analysis | 不要求用户再次手动问项目进度或触发分析 |
| 7. 查旧历史 | 旧失败、旧计划、旧判断及源记录 ID | 旧记录仍可查，已失效结论标待复核 |
| 8. 核对用户介入 | 明确请求原文、作者、时间、范围及处理记录 | 没有假审批；本地处理不伪装 GitHub 授权或部署 |

不为制造事件擅自修改 Riftlet、VAIWL、PAIA 的正式代码，不擅自发送评论。若没有自然新事件，应等待或在用户明确授权的专用测试范围进行；重投既有 delivery 可验证重复处理，但不能代替“关闭页面后收到新事件”。

此外在受保护预览实测：同 SHA 的不同验证结果；失败→修复→真实验证的历史连续性；撤销选定仓库权限后停止读取；API/模型失败后恢复；预算到达上限；旧模型 Key 替换/撤销；定时器停止后的可见报警。异常自动化已覆盖的范围与真实环境实际执行情况分别保留，不互相代替。

## 解除 NO GO 的条件

剩余外部操作集中见 [运行手册第一节](r2-operations.md#1-需要一次性完成的外部配置)。工程侧须在同一个候选上补齐：

1. 当前提交完整 CI（包含真实 PostgreSQL 服务）和实际受保护预览的部署 SHA 对应。
2. 独立数据库迁移、运行角色、真实私有仓库授权、App 投递和五分钟调度，具备连续成功记录。
3. OpenAI 或百炼真实 Key 验证和至少一次成功分析，失败/预算账本可核对。
4. 三个重点项目的上述旅程、历史保留与用户事项语义核对。
5. 同来源、同版本基准比较和一次个人日用验收，准确性、遗漏、可执行性及节约时间均有实测结论。

这些条件尚未满足时，交付名称应为 **R2 受保护工程候选**，不能称正式可用产品。
