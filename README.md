# 我的工作台 · 个人 V1

**打开就知道：产品现在能做什么、卡在哪里、下一步做什么。**

当前默认入口是个人项目工作台。先让一个人愿意每天使用，再逐步增加协作；不再以团队分工、验收队列和记录流水组织首页。

## 运行

需要 Node.js 22 或以上。没有第三方运行时依赖，无需 API Key 或数据库。

```bash
git clone --branch design/prototype-r1-20261031 https://github.com/haohongfei2001-png/project-collaboration-workspace.git
cd project-collaboration-workspace
npm ci --ignore-scripts
npm run dev
```

打开 `http://localhost:3000`。

```bash
npm run check    # 语法、领域测试和构建
npm run build    # 生成静态站点与独立 HTML
npm run preview  # 查看构建结果
```

独立文件：**`dist/Project-Workspace-Personal-V1.html`**。界面、脚本与样式均已内嵌；本地项目、待办和笔记不需要联网，真实 GitHub 同步需要网络。若直接打开文件时浏览器限制存储或网络请求，使用上面的本地服务。

## 能做什么

| 入口 | 实际操作 |
| --- | --- |
| 项目 | 创建多个项目，设置本版目标，以卡片查看产品状态 |
| 功能 | 添加功能、关联 PR、记录体验结果；进度按本版功能计算 |
| 我关心的 | 保存最关心的问题，让项目状态围绕它说明 |
| 待办与资料 | 创建与修改下一步、勾选完成、保存与编辑想法和参考链接 |
| 来源与同步 | 关联公开 GitHub 仓库，手动或前台自动读取 |
| 查看变化 | 按需查看上次读过之后的变化，操作记录进一步折叠 |

项目、个人关注和笔记保存在当前浏览器，可从设置导出。当前没有跨设备同步、云端备份或导入恢复。

### 进度怎么算

进度显示“本版有多少项功能已体验可用”，并区分开发中、待体验、存在问题等状态。PR 合并或检查通过不会直接增加可用数量；确认对应具体开发版本，新代码可能要求重新体验。待办完成数不是产品完成度，也不预测剩余工时。

## GitHub 与 AI 的真实边界

GitHub 使用**真实公开 API，只读、不保存密钥**。每次读取发起三次 GET：仓库信息、最近更新的最多 100 个 PR、最近 30 次 Actions 运行。检查只匹配读取到的相关代码版本；缺失数据保留未知，不能据此认定通过。

开启自动同步后，在页面可见且没有弹窗或详情操作时，以至少五分钟间隔检查当前项目。关闭页面后停止。失败或限流时保留上次状态并提示；数据覆盖不全会说明。

**项目回答仍是规则版，没有调用大模型，不读取源码。**当前不具备任意代码语义理解、私有仓库授权、关闭页面后的后台同步，也不读取真实 Google Drive。不能把这版描述成已经实现完整 AI 项目理解。

## 设计与验证

- [个人第一版产品规格](docs/personal-v1.md)：当前优先级、卡片组织、功能进度与价值验证。
- [测试与证据](docs/verification.md)：以此核对实际构建、测试数量、浏览器验证和剩余限制。
- `src/personal.js` / `src/personal.css`：个人界面。
- `src/personal-domain.js`：个人项目、功能、体验与状态解释。
- `src/github-sync.js`：公开 GitHub 读取及结果归一化。
- `tests/personal.test.js`：个人领域与同步测试；同时保留 R1 的回归测试。

### R1 历史设计

旧团队协作原型保留在 **`legacy.html`**，仅用于比较与回归，不是当前主入口。其成员、GitHub/Drive 事件和 AI 均为模拟。构建仍提供 `dist/Project-Workspace-R1.html`。

[原产品设计](docs/product-design.md)和[原技术架构](docs/architecture.md)记录 R1 的团队路线；其协作优先级与模拟连接边界不代表当前个人版。当前需求以个人版规格和本 README 为准。
