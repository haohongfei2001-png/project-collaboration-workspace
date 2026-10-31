# 项目工作台 · R2 工程候选

**把项目事实、可信判断、计划和历史保存在同一个个人工作台，持续更新真正需要关注的变化。**

当前默认入口 `/` 是连接同源服务端的 R2 Web App，沿用白底紧凑卡片和项目内部「开发概况、开发历史、计划、资料」。GitHub App、数据库、模型与独立调度接通后，监控由后台继续执行；浏览器只呈现已保存结果。

**当前准入：NO GO，尚不能作为真实项目进度的日常主要入口。** 已有统一源码、自动化回归、真实公开 GitHub 读取和受保护预览；目标数据库、App 授权/私有仓库、真实模型和闭浏览器端到端验收仍待完成。未配置时显示连接事项与空项目列表，不将上一版八个项目快照当作实时监控结果。

## 开始使用与验证

需要 Node.js 22 或以上：

~~~bash
npm ci --ignore-scripts
npm run check
npm run dev
~~~

打开 `http://localhost:3000`。本地服务默认不自动加载 `.env`；配置外部服务后可用 `node --env-file=.env scripts/dev.mjs`。数据库迁移、GitHub App、私有仓库、受保护预览入口、后台调度和模型配置步骤见 [R2 运行手册](docs/r2-operations.md)。

| 命令 | 用途 |
| --- | --- |
| `npm run check` | 语法、旧版回归、R2 测试与构建 |
| `npm run build` | 生成 R2 前端及保留的三个历史独立 HTML |
| `npm run preview` | 用同一个服务端查看构建结果 |
| `npm run db:migrate` | 通过专用 `PCW_MIGRATION_DATABASE_URL` 执行迁移 |
| `npm run worker` | 独立执行一轮调度与后台处理；外部调度器负责周期调用 |
| `npm run evaluate:ai` | 生成同源比较记录；默认缺少显式 Key/预算时为 NOT_RUN |

## 当前交付入口

- [R2 Preview](https://project-collaboration-workspace-git-84cb82-haohongfei2001-8529.vercel.app)：Vercel 身份保护；首次真实访问已证实未授权返回 302、授权后的 bootstrap 如实显示未配置。最终部署 SHA 与状态以验证记录为准。
- [统一 PR #1](https://github.com/haohongfei2001-png/project-collaboration-workspace/pull/1)：继续同一开发候选，未公开发布生产版本。
- [R2 工程说明](docs/r2.md)：当前能力、数据隔离、模型判断和保留历史。
- [R2 部署与恢复](docs/r2-operations.md)：一次性外部配置、可执行命令、密钥和故障恢复。
- [R2 验证及准入](docs/r2-verification.md)：区分模拟测试、真实服务读取、真实数据库 CI、真实模型和本人验收。
- [AI 接口与评估](docs/ai-evaluation.md)：安全调用、预算、同版本比较；不以输出流畅代替质量。
- [GitHub App 配置模板](config/github-app-manifest.json)：只读权限和回调，占位地址须替换。

R2 的源码入口是 `src/watch.js`、`src/watch-api.js`、`server/http.js`、`server/worker.js`、`server/store.js`、`server/github.js`、`server/analysis.js` 与 `server/providers.js`。数据库使用私有 `pcw` schema；不向前端提供数据库管理权限、服务端密钥或模型 Key。

工作台中的“已处理、暂缓、交给开发者”是个人处理记录，不代表 GitHub 批准、合并或生产部署。旧失败、旧计划和旧判断保留；CI 成功不自动等于产品可用。

## 保留的旧版入口

`/watch-v1.html` 保留上一版浏览器公开读取原型和原有本地数据；`/personal-v1.html`、`/legacy.html` 保留更早版本。旧原型关闭页面后不能监控，不能替代 R2 后端。

---

## 以下为 Watch V1 原说明，作为历史记录保留

下文中的“当前”指当时的 Watch V1 交付，其依赖、数据位置和监控边界不代表上文 R2。

# 项目工作台 · Watch V1

**在一屏看清几个项目，打开一个项目看开发结果，集中处理真正需要自己介入的事。**

当前默认入口是白底的个人工作台：桌面采用紧凑四列项目卡片，卡片保留应用图标、名字、开发阶段、当前计划进度和必要提醒，不放项目介绍。项目内按「开发概况、开发历史、计划、资料」组织。

## 运行

需要 Node.js 22 或以上；没有第三方运行时依赖，无需 API Key 或数据库。

```bash
git clone --branch design/prototype-r1-20261031 https://github.com/haohongfei2001-png/project-collaboration-workspace.git
cd project-collaboration-workspace
npm ci --ignore-scripts
npm run dev
```

打开 `http://localhost:3000`。

```bash
npm run check    # 脚本检查、领域/适配器测试与构建
npm run build    # 生成静态站点和三个独立 HTML
npm run preview  # 查看构建结果
```

当前独立原型：**`dist/Project-Workspace-Watch-V1.html`**。界面、脚本、样式与图标均已内嵌；GitHub 读取需要联网。若浏览器限制直接打开文件时的存储或网络请求，使用上面的本地服务。

## 当前实际功能

| 入口 | 可以做什么 |
| --- | --- |
| 项目卡片墙 | 浏览、搜索、筛选和排序；关注或取消关注项目；添加公开仓库 |
| 开发概况 | 查看当前开发线、对应版本检查、已核对的产品结论及需要关注的事项 |
| 开发历史 | 按轮次查看完成、失败、下一步和来源；筛选失败与回退；打开新讨论原文 |
| 计划 | 对照之前与当前计划；查看计划项状态和确切版本；来源变化后提示复核 |
| 需关注 | 集中查看来源明确的阻塞、检查失败、批准、决策和验证事项，记录自己的处理结果 |
| 资料与下一步 | 创建、修改资料及待办，完成或恢复待办；设置中可导出本地状态 |

初始八张卡片来自真实公开仓库：Riftlet、VAIWL、PAIA、TodayAction、项目工作台、PAIA IME、HCL Assistant、Semantic Lab。三枚图标来自实际仓库；其余使用文字占位。状态是有读取时间与来源版本的快照，不是虚构演示进度。

**进度目前优先表达“已收录的当前计划完成了几项”。** 计划摘录没有资格成为整个产品的分母；没有完整范围时不显示虚构的整体百分比。检查通过也不会自动证明功能好用或可以发布。

## GitHub 读取与监控边界

真实连接使用公开 GitHub API，只读，不保存账号密钥。一次刷新有五个基础读取：仓库信息、最多 30 个近期 PR、30 次 Actions、20 条近期事项和默认分支最近 10 次提交。关联开发 PR 时可额外读取近期讨论，关联计划文件时可额外读取计划，最多七次请求；覆盖不足会提示。

可以在项目来源中选择默认分支或已读取的 PR，检查只匹配所选开发线的代码版本。先前通过的检查不能认证新版本。

**自动监控默认暂停。** 开启后只在页面打开且可见时工作：所有关注项目共用一个调度，每十分钟读取一个项目，优先较久未更新的项目。关注三个项目时，每个项目通常约三十分钟轮到一次；手动刷新可提前读取。关闭页面后停止。限流或失败时保留上次成功状态并退避，不将失败解释为没有变化。

待批准、待决定等自动提醒依赖明确的 GitHub 标签，例如 `needs-approval`、`needs-decision`、`blocked`。新评论和计划原文可以读取，但**尚未接入大模型，不自动理解任意自然语言或源码**。没有新提交、PR 是 Draft、历史文字出现“未授权”，都不直接等于当前卡住或等待用户批准。

工作台中的“处理记录”只保存在当前浏览器，不批准 PR、不发布、不修改来源仓库。来源版本或相关事项发生变化后，旧记录不能永久消除新提醒。

## 数据、设计与验证

数据保存在当前浏览器，尚无跨设备同步、云端备份或 UI 导入恢复。原有个人版和协作版使用各自的入口与存储，不因这次改版删除旧数据。

- [当前产品设计与架构](docs/watch-v1.md)
- [实际验证记录与证据](docs/verification.md)：测试数量、浏览器实测与限制以这里和对应提交的 CI 为准。
- [核心项目来源研究](docs/research-core-watch.md) · [其余项目来源研究](docs/research-catalog-watch.md)
- `data/*-evidence.json`：经核对的公开资料。
- `scripts/compose-watch-data.mjs`：可重复生成的初始项目数据与图标。
- `src/watch-domain.js` / `src/watch-sync.js`：状态判断与公开读取。
- `src/watch.js` / `src/watch.css`：当前界面。
- `tests/watch.test.js`：当前领域与适配器验证。

## 历史版本

`personal-v1.html` 保留上一版个人功能工作台，对应 `dist/Project-Workspace-Personal-V1.html`；`legacy.html` 保留最初团队协作原型，对应 `dist/Project-Workspace-R1.html`。

[个人 V1 规格](docs/personal-v1.md)、[原团队产品设计](docs/product-design.md)和[原技术架构](docs/architecture.md)用于历史对照。当前入口、监控节奏与真实能力以本 README 和 Watch V1 为准。本轮通过独立分支和 PR 交付，没有部署商业服务。
