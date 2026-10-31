# 真实项目卡片来源核对

读取时间：2026-11-01 02:30（Asia/Shanghai；对应 2026-10-31T18:30:33Z）。本次仅通过连接器读取公开 GitHub 仓库，没有修改这些项目、读取私有项目内容、运行其研究流程或触发部署。

## 当前映射

| 展示名 | 正式仓库 | 已核对的主分支 |
| --- | --- | --- |
| PAIA | haohongfei2001-png/paia | 52c589efa27534cf84b7a7daf8712bc90635c2b4 |
| TodayAction | haohongfei2001-png/pjsdas | b934a58f038a946ec7bd3b199efe7a4083e7d943 |
| PAIA IME | haohongfei2001-png/paia-ime | b0a7358ea83573cc073cf854d98594f1ea8f917b |
| HCL Assistant | haohongfei2001-png/hcl-assistant | 3e8ad86cacefe51310fd519b2c1c2c803c1fd61e |
| Semantic Lab | haohongfei2001-png/paia-semantic-lab | 7d80f2fd7833fed37853c30917b88dc69ae115ed |

TodayAction 的 README 明确其原名 PJSDAS；前台使用 TodayAction，仓库地址继续保留 pjsdas。当前重要开发分支为 [Draft PR #307](https://github.com/haohongfei2001-png/pjsdas/pull/307)，已核对 head 4ce14933526940d55bd18facf1431dca31911dbf。

## 会改变产品判断的事实

### PAIA：最新提交优先于旧 PR 结论

[最新 main 提交](https://github.com/haohongfei2001-png/paia/commit/52c589efa27534cf84b7a7daf8712bc90635c2b4) 将中英文首页恢复到 10 月 29 日的 Atelier 16，同时保留 HTTP 503 回读修复。较早的 #331/#332 仍描述 Atelier 17 已发布，那是各自历史时点的事实，不能当作当前官网。该回退提交的网站检查与 Pages 部署均成功；它们不认证扩展程序或模型能力。

当前扩展状态文件仍包含历史阶段与七个方向，没有可信的整体完成分母。卡片应显示内测阶段和“未量化”，不能依据最近提交数或官网 CI 生成产品完成率。当前重要开放分支 #313 的整理/维护接线也不等同于已进入 main。

### TodayAction：新检查成功不能抹去旧失败，也不能受旧文案误导

PR #307 文案包含多个历史 head 的分层验收。当前 4ce1493 已有 [真实 UI → API → PostgREST → PostgreSQL 检查成功](https://github.com/haohongfei2001-png/pjsdas/actions/runs/40944076377)，作业中的实际链路测试步骤和清理步骤均成功。因此早段“browser-to-real-PG 尚未验证”不能覆盖这项新证据。

同时当前候选仍 Draft；混合负载、截止预算、完整兼容与生产准入缺口并未因这项检查自动消失。完整 Browser E2E 与 Matrix 在该 head 仍为 Draft-policy skipped，不能计为通过。没有发现独立的当前“请用户批准”事项，不把 Draft 本身转成待审批。

### HCL Assistant：工程计划进度具有明确分母

[当前 DEVELOPMENT_PLAN](https://github.com/haohongfei2001-png/hcl-assistant/blob/3e8ad86cacefe51310fd519b2c1c2c803c1fd61e/DEVELOPMENT_PLAN.md) 的唯一产品队列有 11 个工程包，10 个 COMPLETE，M3-01 为 NEXT_READY。可以显示“开发计划 10 / 11”，不能简称产品商业完成度 91%。真实商户适配、价格条款和完整商业验收仍未完成。

[最近一次上游同步任务](https://github.com/haohongfei2001-png/hcl-assistant/actions/runs/41226195405) 失败。它是同步任务失败信号，不直接证明产品运行失败或需要用户授权。

### PAIA IME 与 Semantic Lab：研究证据不冒充可用产品

[PAIA IME 当前 README](https://github.com/haohongfei2001-png/paia-ime/blob/b0a7358ea83573cc073cf854d98594f1ea8f917b/README.md) 明确系统输入法尚未安装，默认候选只有 46 条人工词条。原生工程通过不能换算为可日用百分比。

[Semantic Lab 当前状态](https://github.com/haohongfei2001-png/paia-semantic-lab/blob/7d80f2fd7833fed37853c30917b88dc69ae115ed/status/ZERO_MODEL_REFOUNDATION_STATUS.json) 保留 data NOT_QUALIFIED、capability UNTESTED、resource NOT_QUALIFIED；独立评估条件尚未具备。当前工程检查也有一次失败。历史 CIG-v1 盲测失败、新研究能力未验证和工程 CI 失败是三种不同事实，应分别保留。

## 图标

PAIA 使用仓库已采用的 soft-blue P SVG；TodayAction 使用正式 public/brand/favicon.svg。文件复制到 assets/apps/paia.svg、assets/apps/todayaction.svg，完整来源和版本写在数据中。其余三个仓库没有找到正式应用图标，使用文字占位；不把临时字母当作新 Logo。

## 数据与表达边界

数据见 data/catalog-evidence.json。项目包含版本化来源、当前/历史计划、开发轮次、完成/失败/下一步，以及少量真实 PR、Actions、主分支提交快照。此次读取不是全历史抓取；Actions 仅保留最近 12 次，未覆盖的检查保持未知。

对整体进度，只有明确的计划范围才使用完成项分母；其他项目保留未量化。对阻塞、审批或决策，只接受明确来源或对应版本的检查信号；没有新提交、PR 为 Draft、历史门槛未开放都不能单独证明“开发卡住”或“等用户批准”。
