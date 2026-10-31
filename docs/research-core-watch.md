# 真实项目监控研究：Riftlet 与 VAIWL

读取时间：2026-11-01 02:28:52（北京时间）。本轮只读，未向两仓库写入、评论、修改任务或批准操作。结构化结果在 `data/core-evidence.json`；所有 UI 摘要均保留确切来源和版本。

## 当前事实

| 项目 | 当前来源 | 简短产品结论 | 不能误判 |
| --- | --- | --- | --- |
| Riftlet | main `307335f6`、[PR #27](https://github.com/haohongfei2001-png/Riftlet/pull/27) | R2.1 和 Chrome 身份修复已合入；冷首击/选区保持尚待真实复验 | 旧 R2/R2.1 来源门失败不是当前 main CI 失败；专用聊天跳回 Home 也不证明修复 App 再次失败 |
| VAIWL | Free [PR #16](https://github.com/haohongfei2001-png/Virtual-AI-Workspace-Layer/pull/16) `5593e02e`、最新实机评论 | 普通聊天真实四格展开成功；Project 增强面没有出现，需先修复 | 42/42 CI 不证明真实 Project 可用；普通聊天正例也不证明完整往返、NONE 来源或新增片段接线已完成 |

Riftlet 的 [当前 main Actions](https://github.com/haohongfei2001-png/Riftlet/actions/runs/41214945466) 与 Feedback、Pages 均为 success。VAIWL 的 [Free 同 SHA 检查](https://github.com/haohongfei2001-png/Virtual-AI-Workspace-Layer/actions/runs/41210280508) 成功；独立 [统一候选 #24](https://github.com/haohongfei2001-png/Virtual-AI-Workspace-Layer/pull/24) 是 `976487fa`，44/44 jobs 通过，尚未合并到 Free 或 main。两个候选必须保持各自身份。

## 当前计划与上一轮

Riftlet 当前 [最终实机清单](https://github.com/haohongfei2001-png/Riftlet/blob/307335f6f1511fc49d57275ab19cf9c55496ba5a/docs/R21_UI_FREEZE_AND_MAC_ACCEPTANCE.md) 包含普通 App 启动恢复、R2.1 真实交互、系统截图、一键附加、草稿选区保留、原生反馈到云端及真实多屏/权限。上一轮是 [R2.1 集成 #26](https://github.com/haohongfei2001-png/Riftlet/pull/26)，已合并并冻结当前 UI；新 #27 是该阶段内的阻断修复。

VAIWL 保持唯一 DEVELOPMENT_PLAN。源码 STATUS 的接管/时钟修复记录之后，更新更晚的 [实机回执](https://github.com/haohongfei2001-png/Virtual-AI-Workspace-Layer/pull/16#issuecomment-6546368431)、[当前工程任务](https://github.com/haohongfei2001-png/Virtual-AI-Workspace-Layer/pull/16#issuecomment-6547186156) 与 [诊断差额](https://github.com/haohongfei2001-png/Virtual-AI-Workspace-Layer/pull/16#issuecomment-6547191328) 收窄为 Project 专属入口阻断。上一轮“冻结候选后集中 Mac 验收”已经产生实际发现；现在应先定向修复，再复验相应路径。

## 审批和阻塞的产品语义

- VAIWL 最新派工要求远程负责人直接修复。当前不应显示“等你批准才能开发”。
- [AUTHORITY](https://github.com/haohongfei2001-png/Virtual-AI-Workspace-Layer/blob/5593e02eb81b1fc8fda3a12dc945d0280cf67d60/docs/AUTHORITY.md) 中的旧私人资产恢复需要本人确认，属于条件性本地操作；不把它列成当前修复的阻塞。
- Riftlet 生产能力关闭是尚未通过相应准入的事实。未发现明确的当前批准请求，不能将所有 NO_GO 自动变成用户审批卡。
- 失去更新时间、没有新提交、PR 为 Draft、没有评审人，都不能单独推出“卡住”或“等你决定”。
- “开发中”与“执行器此刻正在运行”不同。GitHub 中的任务安排只能支持前者，不能证明代理实时运行状态。

## 整体进度

两项目都没有一个可信、稳定、覆盖整个产品的任务分母。结构化记录将 `progress.percent` 保留为 null，用阶段与已完成/未完成的明确范围表达。当前收尾清单可以显示条目状态，但不能将其完成比称为整个产品完成率；不能用 PR 数量、测试通过率或代码行数补出百分比。

## 图标

- Riftlet 直接复用当前 main 的 [favicon.svg](https://github.com/haohongfei2001-png/Riftlet/blob/307335f6f1511fc49d57275ab19cf9c55496ba5a/favicon.svg)，Git blob `0b3bd76e4db66be4eaff53c3274121c6da866b82`，本地 `assets/apps/riftlet.svg`。
- VAIWL 生产构建 manifest 没有 icons，批准的 v2.7 原型亦没有独立应用 logo。可使用工作台字母占位，不能将新绘图标成现有正式品牌资产。

## 读取覆盖

实际读取 current refs、最新 PR 集合、指定 PR 正文、VAIWL PR16 完整评论集合、对应 SHA 的 Actions、Riftlet ENGINEERING_PLAN / EXECUTION_BOARD / 最终实机清单、VAIWL DEVELOPMENT_PLAN / AUTHORITY 和 STATUS 当前顶部。STATUS 超过 contents API 的正文范围，已通过确切 blob SHA 读取；未把最初返回空正文当作无状态。文档中大量历史检查点仅用于对应开发轮次，不覆盖更新更晚的事实。
