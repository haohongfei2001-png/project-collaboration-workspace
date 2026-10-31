// Generated from data/*-evidence.json and original repository icon assets.
export const catalogRevision = '2026-11-01-watch-r3';
export const watchCatalog = [
  {
    "id": "riftlet",
    "title": "Riftlet",
    "repo": "haohongfei2001-png/Riftlet",
    "visibility": "public",
    "icon": {
      "path": "assets/apps/riftlet.svg",
      "kind": "source-asset",
      "sourceUrl": "https://github.com/haohongfei2001-png/Riftlet/blob/307335f6f1511fc49d57275ab19cf9c55496ba5a/favicon.svg",
      "ref": "307335f6f1511fc49d57275ab19cf9c55496ba5a",
      "sha": "0b3bd76e4db66be4eaff53c3274121c6da866b82",
      "data": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMTIgMTEyIj48cmVjdCB3aWR0aD0iMTEyIiBoZWlnaHQ9IjExMiIgcng9IjI2Ljg4IiBmaWxsPSIjMTlCN0E0Ii8+PHN2ZyB4PSIyMi40IiB5PSIxOS42IiB3aWR0aD0iNjcuMiIgaGVpZ2h0PSI3Mi44IiB2aWV3Qm94PSIwIDAgNjQgODAiIGZpbGw9IiMxMDJBMjciPjxwYXRoIGQ9Ik0xMyA5aDIxdjYySDEzYy01IDAtOS00LTktOVYxOGMwLTUgNC05IDktOVoiLz48cGF0aCBkPSJNNDAgOWg1YzEyIDAgMTkgOSAxOSAyMCAwIDEwLTcgMTctMTcgMjBsMTcgMjJINDhMNDAgNTlWOVoiLz48L3N2Zz48L3N2Zz4K"
    },
    "observedAt": "2026-10-31T18:28:52Z",
    "sourceRef": "main",
    "headSha": "307335f6f1511fc49d57275ab19cf9c55496ba5a",
    "primaryPullNumber": 27,
    "phase": {
      "key": "validation",
      "label": "实机验收",
      "basis": "工程与 R2.1 已合并；当前仅推进真实使用验证和阻断修复。",
      "sourceUrl": "https://github.com/haohongfei2001-png/Riftlet/pull/27"
    },
    "current": {
      "headline": "工程已合入，冷首击还没有完成实机复验",
      "done": [
        "Chrome 进程身份修复已合入 main",
        "R2.1 视觉已冻结",
        "当前 main 的 Native、Feedback、官网工作流通过"
      ],
      "blocked": [
        "专用聊天跳回 Home，冷首击与选区保留复验未运行"
      ],
      "next": "先取得稳定的专用聊天，再复验冷首击和选区保留。",
      "needsUserDecision": false,
      "decisionReason": "来源没有要求此刻批准发布；生产准入仍关闭是边界，不是待办审批。",
      "sources": [
        {
          "label": "最新工程与实机回执",
          "url": "https://github.com/haohongfei2001-png/Riftlet/pull/27",
          "ref": "307335f6f1511fc49d57275ab19cf9c55496ba5a"
        },
        {
          "label": "最终实机清单",
          "url": "https://github.com/haohongfei2001-png/Riftlet/blob/307335f6f1511fc49d57275ab19cf9c55496ba5a/docs/R21_UI_FREEZE_AND_MAC_ACCEPTANCE.md",
          "ref": "307335f6f1511fc49d57275ab19cf9c55496ba5a"
        }
      ]
    },
    "plan": {
      "title": "完成统一 App 的最终实机验收",
      "scopeLabel": "当前收尾计划；不是完整产品进度分母",
      "sourceUrl": "https://github.com/haohongfei2001-png/Riftlet/blob/307335f6f1511fc49d57275ab19cf9c55496ba5a/docs/R21_UI_FREEZE_AND_MAC_ACCEPTANCE.md",
      "ref": "307335f6f1511fc49d57275ab19cf9c55496ba5a",
      "items": [
        {
          "id": "r-build",
          "title": "统一 App 与 R2.1 集成",
          "status": "done",
          "sourceUrl": "https://github.com/haohongfei2001-png/Riftlet/pull/26"
        },
        {
          "id": "r-identity",
          "title": "Chrome 进程身份与旧未决操作锁修复",
          "status": "done",
          "sourceUrl": "https://github.com/haohongfei2001-png/Riftlet/pull/27"
        },
        {
          "id": "r-cold",
          "title": "稳定聊天里的自然冷首击",
          "status": "blocked",
          "sourceUrl": "https://github.com/haohongfei2001-png/Riftlet/pull/27"
        },
        {
          "id": "r-selection",
          "title": "原草稿和选区保持",
          "status": "blocked",
          "sourceUrl": "https://github.com/haohongfei2001-png/Riftlet/pull/27"
        },
        {
          "id": "r-feedback",
          "title": "原生反馈到云端的完整链路",
          "status": "todo",
          "sourceUrl": "https://github.com/haohongfei2001-png/Riftlet/blob/307335f6f1511fc49d57275ab19cf9c55496ba5a/docs/R21_UI_FREEZE_AND_MAC_ACCEPTANCE.md"
        },
        {
          "id": "r-environment",
          "title": "实际多屏、权限和物理输入",
          "status": "todo",
          "sourceUrl": "https://github.com/haohongfei2001-png/Riftlet/blob/307335f6f1511fc49d57275ab19cf9c55496ba5a/docs/R21_UI_FREEZE_AND_MAC_ACCEPTANCE.md"
        }
      ],
      "selectionBasis": "实际 main 的最终实机验收清单，加上最新 PR #27 的修复和实机结果。",
      "scopeComplete": false
    },
    "rounds": [
      {
        "id": "r27",
        "title": "修复 Chrome 身份与未决操作锁",
        "date": "2026-10-31T15:48:22Z",
        "ref": "main",
        "headSha": "307335f6f1511fc49d57275ab19cf9c55496ba5a",
        "status": "merged",
        "done": [
          "Chrome 启动时间缺失时仍可识别同一进程",
          "旧 UNKNOWN 操作不会被新的会话格式绕过",
          "当前 main 的必要工作流通过"
        ],
        "failed": [
          "实机专用聊天跳回 Home；本轮未进入冷首击复验"
        ],
        "next": [
          "稳定专用聊天后复验冷首击、草稿选区"
        ],
        "sources": [
          {
            "label": "PR #27",
            "url": "https://github.com/haohongfei2001-png/Riftlet/pull/27",
            "ref": "307335f6f1511fc49d57275ab19cf9c55496ba5a"
          }
        ]
      },
      {
        "id": "r26",
        "title": "R2.1 正式集成，冻结当前 UI",
        "date": "2026-10-31T11:18:06Z",
        "ref": "main",
        "headSha": "60eaaef64848fc5535580e4fcb65e45f3f41e814",
        "status": "merged",
        "done": [
          "纸片微图、稳定暖预览进入正式 App",
          "退出过程中刷新布局不再让图像回到裂缝",
          "双架构构建及来源检查通过"
        ],
        "failed": [
          "首次组合回归发现退出平移被抵消，已在本轮修复"
        ],
        "next": [
          "完成最终实机使用清单"
        ],
        "sources": [
          {
            "label": "PR #26",
            "url": "https://github.com/haohongfei2001-png/Riftlet/pull/26",
            "ref": "60eaaef64848fc5535580e4fcb65e45f3f41e814"
          }
        ]
      },
      {
        "id": "r25",
        "title": "正式工程迁入 main",
        "date": "2026-10-31T10:01:34Z",
        "ref": "main",
        "headSha": "749f3ae81b8a75a9462506bfeb3d3cf2796ed154",
        "status": "merged",
        "done": [
          "统一 App 与主线治理正式合并",
          "Native、Feedback 与官网分别验证"
        ],
        "failed": [],
        "next": [
          "集成独立 R2.1 候选"
        ],
        "sources": [
          {
            "label": "PR #25",
            "url": "https://github.com/haohongfei2001-png/Riftlet/pull/25",
            "ref": "749f3ae81b8a75a9462506bfeb3d3cf2796ed154"
          }
        ]
      },
      {
        "id": "r23",
        "title": "R2 原生配置与分页",
        "date": "2026-10-31T07:16:16Z",
        "ref": "PR #23",
        "headSha": "4c92f6e639538bc7f3b1e06cf71fb07086add278",
        "status": "merged",
        "done": [
          "位置、遮挡、分页和原图查看可配置",
          "原生和反馈执行测试通过"
        ],
        "failed": [
          "当时来源准入未更新，工作流整体失败；后续正式集成已通过"
        ],
        "next": [],
        "sources": [
          {
            "label": "PR #23（历史）",
            "url": "https://github.com/haohongfei2001-png/Riftlet/pull/23",
            "ref": "4c92f6e639538bc7f3b1e06cf71fb07086add278"
          }
        ]
      }
    ],
    "workflows": [
      {
        "id": 41214944880,
        "name": "pages build and deployment",
        "headSha": "307335f6f1511fc49d57275ab19cf9c55496ba5a",
        "status": "completed",
        "conclusion": "success",
        "url": "https://github.com/haohongfei2001-png/Riftlet/actions/runs/41214944880"
      },
      {
        "id": 41214945392,
        "name": "Feedback v0.1",
        "headSha": "307335f6f1511fc49d57275ab19cf9c55496ba5a",
        "status": "completed",
        "conclusion": "success",
        "url": "https://github.com/haohongfei2001-png/Riftlet/actions/runs/41214945392"
      },
      {
        "id": 41214945466,
        "name": "Native foundation",
        "headSha": "307335f6f1511fc49d57275ab19cf9c55496ba5a",
        "status": "completed",
        "conclusion": "success",
        "url": "https://github.com/haohongfei2001-png/Riftlet/actions/runs/41214945466"
      }
    ],
    "evidenceLimitations": [
      "当前没有整体百分比的可靠分母。",
      "普通生产上传、安全重试和公开发行保持关闭。",
      "历史失败仅在相应新证据成立时解除，最新 CI 成功不替代真实验收。"
    ],
    "currentSummary": "工程已合入，冷首击还没有完成实机复验",
    "currentWork": "先取得稳定的专用聊天，再复验冷首击和选区保留。",
    "previousPlans": [
      {
        "title": "R2.1 外观集成与 UI 冻结",
        "status": "completed",
        "date": "2026-10-31T11:18:06Z",
        "sourceUrl": "https://github.com/haohongfei2001-png/Riftlet/pull/26",
        "ref": "60eaaef64848fc5535580e4fcb65e45f3f41e814",
        "done": [
          "纸片式微图与连续预览正式集成",
          "修复退出动画被布局刷新抵消的问题",
          "完成双架构构建与包核验"
        ],
        "remaining": [
          "真实使用与物理输入另行验收"
        ],
        "items": [],
        "summary": ""
      }
    ],
    "trackedPr": null,
    "planPath": "docs/R21_UI_FREEZE_AND_MAC_ACCEPTANCE.md",
    "statusPath": "docs/EXECUTION_BOARD.md",
    "name": "Riftlet",
    "watching": true,
    "commentIssue": 27,
    "attention": [
      {
        "id": "riftlet-device-blocked",
        "kind": "blocked",
        "title": "冷首击复验尚未开始",
        "detail": "专用聊天导航跳回 Home；未启动候选 App、未点击截图，原因未确定。",
        "sourceUrl": "https://github.com/haohongfei2001-png/Riftlet/pull/27",
        "sourceRef": "307335f6f1511fc49d57275ab19cf9c55496ba5a",
        "sourceUpdatedAt": "2026-10-31T15:48:22Z",
        "requiresUserAction": false,
        "ref": "307335f6f1511fc49d57275ab19cf9c55496ba5a",
        "at": "2026-10-31T15:48:22Z"
      },
      {
        "id": "riftlet-selection-pending",
        "kind": "verify",
        "title": "选区保留仍待复验",
        "detail": "历史选区失败保留；当前候选尚未产生新的实机通过证据。",
        "sourceUrl": "https://github.com/haohongfei2001-png/Riftlet/pull/27",
        "sourceRef": "307335f6f1511fc49d57275ab19cf9c55496ba5a",
        "requiresUserAction": false,
        "ref": "307335f6f1511fc49d57275ab19cf9c55496ba5a",
        "at": "2026-10-31T18:28:52Z"
      }
    ],
    "initials": "R",
    "notes": [
      {
        "id": "source-riftlet",
        "title": "完成统一 App 的最终实机验收",
        "text": "当前收尾计划；不是完整产品进度分母",
        "url": "https://github.com/haohongfei2001-png/Riftlet/blob/307335f6f1511fc49d57275ab19cf9c55496ba5a/docs/R21_UI_FREEZE_AND_MAC_ACCEPTANCE.md",
        "createdAt": "2026-10-31T18:28:52Z"
      }
    ],
    "tasks": []
  },
  {
    "id": "vaiwl",
    "title": "VAIWL",
    "repo": "haohongfei2001-png/Virtual-AI-Workspace-Layer",
    "visibility": "public",
    "icon": {
      "kind": "initials",
      "text": "V",
      "reason": "当前生产构建 manifest 无 icons；批准原型没有独立 App 标识。工作台占位不代表正式品牌。",
      "sourceUrl": "https://github.com/haohongfei2001-png/Virtual-AI-Workspace-Layer/blob/5593e02eb81b1fc8fda3a12dc945d0280cf67d60/extension/build.mjs",
      "ref": "5593e02eb81b1fc8fda3a12dc945d0280cf67d60"
    },
    "observedAt": "2026-10-31T18:28:52Z",
    "sourceRef": "codex/vaiwl-free-first-20261013",
    "headSha": "5593e02eb81b1fc8fda3a12dc945d0280cf67d60",
    "primaryPullNumber": 16,
    "phase": {
      "key": "repair",
      "label": "实机修复",
      "basis": "离线 CI 已通过；最新实机回执确认 Project 增强面失败。",
      "sourceUrl": "https://github.com/haohongfei2001-png/Virtual-AI-Workspace-Layer/pull/16#issuecomment-6547186156"
    },
    "current": {
      "headline": "普通聊天能打开工作区，Project 页面仍打不开",
      "done": [
        "普通聊天已能点击展开工作区",
        "当前 Free 自动检查通过",
        "Free + Pro 候选已完成工程集成"
      ],
      "blocked": [
        "项目页工作区和返回按钮未出现",
        "失败原因还未被诊断准确记录"
      ],
      "next": "先修复 Project 专属入口和拒绝阶段诊断，再做一次定向实机复验。",
      "needsUserDecision": false,
      "decisionReason": "最新派工要求远程负责人直接修复，不以重复审批代替开发。",
      "sources": [
        {
          "label": "当前工程阻断",
          "url": "https://github.com/haohongfei2001-png/Virtual-AI-Workspace-Layer/pull/16#issuecomment-6547186156",
          "ref": "5593e02eb81b1fc8fda3a12dc945d0280cf67d60"
        },
        {
          "label": "诊断接线差额",
          "url": "https://github.com/haohongfei2001-png/Virtual-AI-Workspace-Layer/pull/16#issuecomment-6547191328",
          "ref": "5593e02eb81b1fc8fda3a12dc945d0280cf67d60"
        },
        {
          "label": "Mac 实际结果",
          "url": "https://github.com/haohongfei2001-png/Virtual-AI-Workspace-Layer/pull/16#issuecomment-6546368431",
          "ref": "5593e02eb81b1fc8fda3a12dc945d0280cf67d60"
        }
      ]
    },
    "plan": {
      "title": "先修复 Project，再集中完成个人日用验收",
      "scopeLabel": "当前关键路径；不是完整产品进度分母",
      "sourceUrl": "https://github.com/haohongfei2001-png/Virtual-AI-Workspace-Layer/pull/16#issuecomment-6547186156",
      "ref": "5593e02eb81b1fc8fda3a12dc945d0280cf67d60",
      "items": [
        {
          "id": "v-ci",
          "title": "Free 当前候选统一 CI",
          "status": "done",
          "sourceUrl": "https://github.com/haohongfei2001-png/Virtual-AI-Workspace-Layer/actions/runs/41210280508"
        },
        {
          "id": "v-chat",
          "title": "普通聊天真实四格展开",
          "status": "done",
          "sourceUrl": "https://github.com/haohongfei2001-png/Virtual-AI-Workspace-Layer/pull/16#issuecomment-6546368431"
        },
        {
          "id": "v-project",
          "title": "Project 页面增强面",
          "status": "blocked",
          "sourceUrl": "https://github.com/haohongfei2001-png/Virtual-AI-Workspace-Layer/pull/16#issuecomment-6547186156"
        },
        {
          "id": "v-diagnostic",
          "title": "接通当前拒绝阶段诊断",
          "status": "active",
          "sourceUrl": "https://github.com/haohongfei2001-png/Virtual-AI-Workspace-Layer/pull/16#issuecomment-6547191328"
        },
        {
          "id": "v-return",
          "title": "完整阅读往返、输入与工具",
          "status": "todo",
          "sourceUrl": "https://github.com/haohongfei2001-png/Virtual-AI-Workspace-Layer/pull/16#issuecomment-6546368431"
        },
        {
          "id": "v-source",
          "title": "正向 NONE 与新片段生产来源",
          "status": "todo",
          "sourceUrl": "https://github.com/haohongfei2001-png/Virtual-AI-Workspace-Layer/pull/16#issuecomment-6546368431"
        },
        {
          "id": "v-assets",
          "title": "本人旧资产确认与持续日用",
          "status": "todo",
          "sourceUrl": "https://github.com/haohongfei2001-png/Virtual-AI-Workspace-Layer/blob/5593e02eb81b1fc8fda3a12dc945d0280cf67d60/docs/AUTHORITY.md"
        }
      ],
      "selectionBasis": "正式计划的当前任务由更新更晚的 PR 评论细化；此摘要不修改原计划。",
      "scopeComplete": false
    },
    "parallelCandidate": {
      "title": "Free + Pro R1 统一候选",
      "pullNumber": 24,
      "headSha": "976487fab544baaefcd490460c98cd9dc26385df",
      "phase": "独立候选，未合并",
      "sourceUrl": "https://github.com/haohongfei2001-png/Virtual-AI-Workspace-Layer/pull/24",
      "checks": "44/44 jobs 通过",
      "limits": "真实 ChatGPT、本人 Mac 和真实模型能力仍须独立验收"
    },
    "rounds": [
      {
        "id": "v-project-block",
        "title": "Project 实机阻断转入定向修复",
        "date": "2026-10-31T18:06:21Z",
        "ref": "PR #16",
        "headSha": "5593e02eb81b1fc8fda3a12dc945d0280cf67d60",
        "status": "blocked",
        "done": [
          "确认普通聊天展开有真实正例",
          "确认 Project 原生页面与成员关系存在"
        ],
        "failed": [
          "Project 增强面与返回入口没有出现",
          "现有诊断没有提供具体拒绝阶段"
        ],
        "next": [
          "复现 Project 专属入口问题",
          "补齐有限、无正文的当前拒绝阶段"
        ],
        "sources": [
          {
            "label": "工程任务",
            "url": "https://github.com/haohongfei2001-png/Virtual-AI-Workspace-Layer/pull/16#issuecomment-6547186156",
            "ref": "5593e02eb81b1fc8fda3a12dc945d0280cf67d60"
          },
          {
            "label": "诊断差额",
            "url": "https://github.com/haohongfei2001-png/Virtual-AI-Workspace-Layer/pull/16#issuecomment-6547191328",
            "ref": "5593e02eb81b1fc8fda3a12dc945d0280cf67d60"
          }
        ]
      },
      {
        "id": "v-mac",
        "title": "原 Mac 同 ID 更新与有限验收",
        "date": "2026-10-31T16:54:33Z",
        "ref": "PR #16",
        "headSha": "5593e02eb81b1fc8fda3a12dc945d0280cf67d60",
        "status": "partial",
        "done": [
          "同 ID 更新与备份核验",
          "普通聊天真实四格点击展开"
        ],
        "failed": [
          "Project 页面增强面失败"
        ],
        "next": [
          "完整返回往返仍未运行",
          "NONE 归属仍未知；工具取消只部分验证"
        ],
        "sources": [
          {
            "label": "Mac 接续验收",
            "url": "https://github.com/haohongfei2001-png/Virtual-AI-Workspace-Layer/pull/16#issuecomment-6546368431",
            "ref": "5593e02eb81b1fc8fda3a12dc945d0280cf67d60"
          }
        ]
      },
      {
        "id": "v-unified",
        "title": "Free + Pro R1 工程接线完成",
        "date": "2026-10-31T15:51:51Z",
        "ref": "PR #24（独立候选）",
        "headSha": "976487fab544baaefcd490460c98cd9dc26385df",
        "status": "review",
        "done": [
          "人工主题、标题、Series 和统一备份接入 Free",
          "统一工程与继承 Free 共 44/44 jobs 通过"
        ],
        "failed": [],
        "next": [
          "真实宿主、本人 Mac 与模型质量仍需验证"
        ],
        "sources": [
          {
            "label": "统一候选 #24",
            "url": "https://github.com/haohongfei2001-png/Virtual-AI-Workspace-Layer/pull/24",
            "ref": "976487fab544baaefcd490460c98cd9dc26385df"
          }
        ]
      },
      {
        "id": "v-clock",
        "title": "修复合法观察被小数时钟误拒绝",
        "date": "2026-10-31T14:45:38Z",
        "ref": "PR #16",
        "headSha": "5593e02eb81b1fc8fda3a12dc945d0280cf67d60",
        "status": "completed",
        "done": [
          "修复合法六秒观察在发送前被误拒绝",
          "新候选正式 CI 42/42 通过"
        ],
        "failed": [
          "上一候选正式旅程 41/42；旧失败保留"
        ],
        "next": [
          "转入真实 Mac 验收"
        ],
        "sources": [
          {
            "label": "当前 CI",
            "url": "https://github.com/haohongfei2001-png/Virtual-AI-Workspace-Layer/actions/runs/41210280508",
            "ref": "5593e02eb81b1fc8fda3a12dc945d0280cf67d60"
          },
          {
            "label": "状态依据",
            "url": "https://github.com/haohongfei2001-png/Virtual-AI-Workspace-Layer/blob/5593e02eb81b1fc8fda3a12dc945d0280cf67d60/docs/STATUS.md",
            "ref": "5593e02eb81b1fc8fda3a12dc945d0280cf67d60"
          }
        ]
      }
    ],
    "workflows": [
      {
        "id": 41210280508,
        "name": "Free offline Host slices (not release acceptance)",
        "headSha": "5593e02eb81b1fc8fda3a12dc945d0280cf67d60",
        "status": "completed",
        "conclusion": "success",
        "url": "https://github.com/haohongfei2001-png/Virtual-AI-Workspace-Layer/actions/runs/41210280508"
      },
      {
        "id": 41215418356,
        "name": "Unified R1 inherited Free offline matrix (not live acceptance)",
        "headSha": "976487fab544baaefcd490460c98cd9dc26385df",
        "status": "completed",
        "conclusion": "success",
        "url": "https://github.com/haohongfei2001-png/Virtual-AI-Workspace-Layer/actions/runs/41215418356"
      },
      {
        "id": 41215418359,
        "name": "VAIWL unified Free + Pro R1 candidate",
        "headSha": "976487fab544baaefcd490460c98cd9dc26385df",
        "status": "completed",
        "conclusion": "success",
        "url": "https://github.com/haohongfei2001-png/Virtual-AI-Workspace-Layer/actions/runs/41215418359"
      }
    ],
    "evidenceLimitations": [
      "最后两条评论比源码 STATUS 更新，监控不能只读默认分支 README。",
      "缺少新增提交不能推出开发者停止工作。",
      "旧私人资产确认是条件性本人操作，不应制造为当前开发的必选审批。",
      "真实来源、完整阅读往返、新片段捕获与定位仍未全部完成。"
    ],
    "currentSummary": "普通聊天能打开工作区，项目页仍打不开",
    "currentWork": "修复项目页入口，补齐失败原因，再定向复验。",
    "previousPlans": [
      {
        "title": "统一候选冻结后进行 Mac 集中验收",
        "status": "superseded-by-findings",
        "date": "2026-10-31T14:54:49Z",
        "sourceUrl": "https://github.com/haohongfei2001-png/Virtual-AI-Workspace-Layer/pull/16#issuecomment-6545003635",
        "ref": "5593e02eb81b1fc8fda3a12dc945d0280cf67d60",
        "done": [
          "同 ID 更新与来源核验",
          "普通聊天四格展开"
        ],
        "remaining": [
          "Project 入口实机暴露阻断，先回到定向修复"
        ],
        "items": [],
        "summary": ""
      }
    ],
    "trackedPr": 16,
    "planPath": "docs/DEVELOPMENT_PLAN.md",
    "statusPath": "docs/STATUS.md",
    "name": "VAIWL",
    "watching": true,
    "commentIssue": 16,
    "attention": [
      {
        "id": "v-project",
        "kind": "blocked",
        "title": "项目页工作区没有打开",
        "detail": "原生项目列表可见，但工作区与返回按钮没有出现；正在定位原因。",
        "sourceUrl": "https://github.com/haohongfei2001-png/Virtual-AI-Workspace-Layer/pull/16#issuecomment-6547186156",
        "sourceRef": "5593e02eb81b1fc8fda3a12dc945d0280cf67d60",
        "sourceUpdatedAt": "2026-10-31T18:05:54Z",
        "requiresUserAction": false,
        "ref": "5593e02eb81b1fc8fda3a12dc945d0280cf67d60",
        "at": "2026-10-31T18:05:54Z"
      }
    ],
    "initials": "V",
    "notes": [
      {
        "id": "source-vaiwl",
        "title": "先修复 Project，再集中完成个人日用验收",
        "text": "当前关键路径；不是完整产品进度分母",
        "url": "https://github.com/haohongfei2001-png/Virtual-AI-Workspace-Layer/pull/16#issuecomment-6547186156",
        "createdAt": "2026-10-31T18:28:52Z"
      }
    ],
    "tasks": []
  },
  {
    "id": "paia",
    "name": "PAIA",
    "repo": "haohongfei2001-png/paia",
    "icon": {
      "path": "assets/apps/paia.svg",
      "kind": "source-asset",
      "sourceUrl": "https://github.com/haohongfei2001-png/paia/blob/52c589efa27534cf84b7a7daf8712bc90635c2b4/design/brand/soft-blue-p-20261021/source/app-icon.svg",
      "data": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDI0IDEwMjQiIHJvbGU9ImltZyIgYXJpYS1sYWJlbGxlZGJ5PSJ0aXRsZSBkZXNjIj4KICA8dGl0bGUgaWQ9InRpdGxlIj5QQUlBIOKAlCBzb2Z0IGJsdWUgUDwvdGl0bGU+CiAgPGRlc2MgaWQ9ImRlc2MiPlBBSUEgYnJhbmQgbWFyayBhZG9wdGVkIG9uIDIwMjYtMTAtMjEuIEV4aXN0aW5nIGZsb2F0aW5nIGNvbnRyb2xzIGFuZCB0aGUgd2Vic2l0ZSBjbG9zaW5nIHN0b3J5IHJldGFpbiB0aGVpciBwcmV2aW91cyBhcnR3b3JrLjwvZGVzYz4KICA8cmVjdCBpZD0iYmFja2dyb3VuZCIgd2lkdGg9IjEwMjQiIGhlaWdodD0iMTAyNCIgZmlsbD0iI0ZGRkZGRiIvPgogIDxwYXRoIGlkPSJwYWlhLW1hcmsiIGZpbGw9IiM2Mjg0Q0QiIGQ9Ik0gMTkyLjMyIDg1MS40NCBMIDE5Mi4zMiA0NDkuNjggQyAxOTIuMzIgMzM3LjM2IDI1Ny4xMiAyNTkuNDc1IDM2NS4xMiAyMzAuNTM5IEwgNjExLjM2IDE2NC41NiBDIDczNi42NCAxMzAuOTg5IDgzMS42OCAyMDMuNDQgODMxLjY4IDMyOC43MiBMIDgzMS42OCA1MTguOCBDIDgzMS42OCA2NzguNjQgNzI4IDc3OCA1NjguMTYgNzc4IEwgNDg2LjA4IDc3OCBRIDQ3Ny40NCA3NzggNDc3LjQ0IDc2OS4zNiBMIDQ3Ny40NCA2NDguNCBRIDQ3Ny40NCA2MzkuNzYgNDg2LjA4IDYzOS43NiBMIDU1MC44OCA2MzkuNzYgQyA2NDEuNiA2MzkuNzYgNjkzLjQ0IDU4Ny45MiA2OTMuNDQgNTA1Ljg0IEwgNjkzLjQ0IDM3MS45MiBDIDY5My40NCAzMTUuNzYgNjU4Ljg4IDI4OC45MTEgNjA3LjA0IDMwMi44IEwgNDIxLjI4IDM1Mi41NzUgQyAzNjAuOCAzNjguNzc5IDMzNC44OCA0MTAuOCAzMzQuODggNDc1LjYgTCAzMzQuODggODUxLjQ0IFEgMzM0Ljg4IDg2MC4wOCAzMjYuMjQgODYwLjA4IEwgMjAwLjk2IDg2MC4wOCBRIDE5Mi4zMiA4NjAuMDggMTkyLjMyIDg1MS40NCBaIi8+Cjwvc3ZnPgo="
    },
    "iconKind": "repository-asset",
    "iconSource": "https://github.com/haohongfei2001-png/paia/blob/52c589efa27534cf84b7a7daf8712bc90635c2b4/design/brand/soft-blue-p-20261021/source/app-icon.svg",
    "observedAt": "2026-10-31T18:30:33Z",
    "sourceRef": "main",
    "sourceSha": "52c589efa27534cf84b7a7daf8712bc90635c2b4",
    "planPath": "extension/docs/consumer-product-v1/STATUS.md",
    "trackedPr": null,
    "phase": {
      "label": "内测迭代",
      "sourceUrl": "https://github.com/haohongfei2001-png/paia/blob/52c589efa27534cf84b7a7daf8712bc90635c2b4/README.md",
      "ref": "52c589efa27534cf84b7a7daf8712bc90635c2b4",
      "key": "development"
    },
    "currentSummary": "官网已恢复到上一版；扩展仍在内测迭代。",
    "currentWork": "跟进扩展接线与完整验收，保留当前官网。",
    "plan": {
      "title": "Consumer Product v1 · 当前重点",
      "sourceUrl": "https://github.com/haohongfei2001-png/paia/blob/52c589efa27534cf84b7a7daf8712bc90635c2b4/extension/docs/consumer-product-v1/STATUS.md",
      "ref": "52c589efa27534cf84b7a7daf8712bc90635c2b4",
      "scopeLabel": "计划摘录 · 非整体完成比例",
      "completeScope": false,
      "items": [
        {
          "id": "paia-r3",
          "title": "R3 悬浮界面方案采用",
          "status": "done",
          "sourceUrl": "https://github.com/haohongfei2001-png/paia/blob/52c589efa27534cf84b7a7daf8712bc90635c2b4/extension/docs/consumer-product-v1/AUTHORITY.md"
        },
        {
          "id": "paia-maintenance",
          "title": "整理、维护与 Context 接线",
          "status": "active",
          "sourceUrl": "https://github.com/haohongfei2001-png/paia/pull/313"
        },
        {
          "id": "paia-service",
          "title": "真实身份、模型与服务资格",
          "status": "todo",
          "sourceUrl": "https://github.com/haohongfei2001-png/paia/blob/52c589efa27534cf84b7a7daf8712bc90635c2b4/extension/docs/consumer-product-v1/STATUS.md"
        },
        {
          "id": "paia-acceptance",
          "title": "完整产品与实机验收",
          "status": "unknown",
          "sourceUrl": "https://github.com/haohongfei2001-png/paia/blob/52c589efa27534cf84b7a7daf8712bc90635c2b4/extension/docs/consumer-product-v1/STATUS.md"
        }
      ],
      "scopeComplete": false
    },
    "previousPlans": [
      {
        "title": "Atelier 17 官网方案",
        "date": "2026-10-30T13:34:54Z",
        "status": "reverted",
        "sourceUrl": "https://github.com/haohongfei2001-png/paia/pull/331",
        "summary": "双栏首页与产品预览已合入，随后按最新 main 提交回退到 Atelier 16。",
        "items": []
      }
    ],
    "rounds": [
      {
        "id": "paia-restore",
        "title": "官网恢复到上一版",
        "date": "2026-10-30T14:59:14Z",
        "headSha": "52c589efa27534cf84b7a7daf8712bc90635c2b4",
        "status": "merged",
        "done": [
          "恢复中英文 Atelier 16 首页",
          "保留 HTTP 503 回读修复"
        ],
        "failed": [],
        "next": [
          "扩展开发不受这次官网回退影响"
        ],
        "sources": [
          {
            "label": "回退提交",
            "url": "https://github.com/haohongfei2001-png/paia/commit/52c589efa27534cf84b7a7daf8712bc90635c2b4"
          },
          {
            "label": "该提交网站检查",
            "url": "https://github.com/haohongfei2001-png/paia/actions/runs/41076548646"
          }
        ]
      },
      {
        "id": "paia-readback",
        "title": "修复官网验证的临时网络失败",
        "date": "2026-10-30T13:52:18Z",
        "headSha": "47e42e194db8cd087e4f3bf22cb5cce3a9145b0d",
        "status": "merged",
        "done": [
          "对同一个 HTTP 503 请求有限重试",
          "最终网站与线上回读检查通过"
        ],
        "failed": [
          "此前两次回读遇到 HTTP 503；原失败保留"
        ],
        "next": [],
        "sources": [
          {
            "label": "PR #332",
            "url": "https://github.com/haohongfei2001-png/paia/pull/332"
          }
        ]
      },
      {
        "id": "paia-redesign",
        "title": "新版首页设计与发布",
        "date": "2026-10-30T13:34:55Z",
        "headSha": "0facb35078c5bdb6b2026ab1367a42afc1a3bd92",
        "status": "reverted",
        "done": [
          "完成中英文首页、预览页签和移动布局"
        ],
        "failed": [
          "发布后的回读曾失败，后由 #332 修复",
          "该版已被后续回退替换"
        ],
        "next": [],
        "sources": [
          {
            "label": "PR #331",
            "url": "https://github.com/haohongfei2001-png/paia/pull/331"
          }
        ]
      }
    ],
    "attention": [],
    "limitations": [
      "官网 CI 成功不等于扩展或真实模型资格通过。",
      "计划文件顶部日期早于近期官网提交；整体进度不从 PR 数量推算。"
    ],
    "headSha": "52c589efa27534cf84b7a7daf8712bc90635c2b4",
    "watching": false,
    "commentIssue": null,
    "evidenceLimitations": [
      "官网 CI 成功不等于扩展或真实模型资格通过。",
      "计划文件顶部日期早于近期官网提交；整体进度不从 PR 数量推算。"
    ],
    "initials": "P",
    "snapshot": {
      "repo": "haohongfei2001-png/paia",
      "source": "github-reviewed-snapshot",
      "fetchedAt": "2026-10-31T18:30:33Z",
      "repository": {
        "fullName": "haohongfei2001-png/paia",
        "defaultBranch": "main",
        "url": "https://github.com/haohongfei2001-png/paia",
        "pushedAt": "2026-10-30T14:59:30Z",
        "private": false
      },
      "pullRequests": [
        {
          "number": 332,
          "title": "Keep live readback strict while retrying transient HTTP 503",
          "state": "closed",
          "draft": false,
          "merged": true,
          "headSha": "fdd661ab68f22bb7876f964107a79accfc3edd24",
          "branch": "fix/paia-readback-transient-503-20261030",
          "base": "main",
          "url": "https://github.com/haohongfei2001-png/paia/pull/332",
          "updatedAt": "2026-10-30T14:03:52Z",
          "mergedAt": "2026-10-30T13:52:18Z"
        },
        {
          "number": 331,
          "title": "Refine PAIA homepage: lighter composition, readable product stories, purposeful interactions",
          "state": "closed",
          "draft": false,
          "merged": true,
          "headSha": "3f6976be7cd68c7da711541a21077b778ff9ae12",
          "branch": "design/paia-craft-refinement-20261030",
          "base": "main",
          "url": "https://github.com/haohongfei2001-png/paia/pull/331",
          "updatedAt": "2026-10-30T14:03:51Z",
          "mergedAt": "2026-10-30T13:34:55Z"
        },
        {
          "number": 330,
          "title": "website: optical PAIA presentation with layered native-scroll depth",
          "state": "closed",
          "draft": false,
          "merged": true,
          "headSha": "368520b2054c50e31cac93728ca355f3d92985db",
          "branch": "website/prism-art-direction-20261024",
          "base": "main",
          "url": "https://github.com/haohongfei2001-png/paia/pull/330",
          "updatedAt": "2026-10-24T12:55:07Z",
          "mergedAt": "2026-10-24T12:52:17Z"
        },
        {
          "number": 329,
          "title": "website: finish V15 publication with a version-specific entry",
          "state": "closed",
          "draft": false,
          "merged": true,
          "headSha": "55d0f3bdead626c8db5d56de8a528d55914944da",
          "branch": "website/folio15-release-20261024",
          "base": "main",
          "url": "https://github.com/haohongfei2001-png/paia/pull/329",
          "updatedAt": "2026-10-24T12:22:11Z",
          "mergedAt": "2026-10-24T12:18:13Z"
        },
        {
          "number": 328,
          "title": "website: repair V14 spatial whitespace and rebuild Thought Library V15",
          "state": "closed",
          "draft": false,
          "merged": true,
          "headSha": "c39733eeef6b78655dfe138c3c77bf3f4542f93b",
          "branch": "website/atelier-v15-rebuild-20261024",
          "base": "main",
          "url": "https://github.com/haohongfei2001-png/paia/pull/328",
          "updatedAt": "2026-10-24T09:55:20Z",
          "mergedAt": "2026-10-24T09:55:20Z"
        },
        {
          "number": 327,
          "title": "website: publish approved spatial Thought Library on the official home",
          "state": "closed",
          "draft": false,
          "merged": true,
          "headSha": "a00a3d52c6dc563d6e09ae33e2d86c51ff2f9b24",
          "branch": "website/spatial-official-home-20261024",
          "base": "main",
          "url": "https://github.com/haohongfei2001-png/paia/pull/327",
          "updatedAt": "2026-10-24T09:16:09Z",
          "mergedAt": "2026-10-24T09:16:09Z"
        },
        {
          "number": 326,
          "title": "design: spatial glass Thought Library preview, homepage unchanged",
          "state": "closed",
          "draft": false,
          "merged": true,
          "headSha": "eb8b18a348b8ac1e2bf2d4522ee101b96e70213d",
          "branch": "design/thought-spatial-20261024",
          "base": "main",
          "url": "https://github.com/haohongfei2001-png/paia/pull/326",
          "updatedAt": "2026-10-24T08:28:45Z",
          "mergedAt": "2026-10-24T08:25:28Z"
        },
        {
          "number": 325,
          "title": "website: V13 product-world narrative and art direction",
          "state": "closed",
          "draft": false,
          "merged": true,
          "headSha": "e117a57ef5e54dbe9e7ed9da72e4e0f5f750af5b",
          "branch": "website/atelier-v13-product-world-20261024",
          "base": "main",
          "url": "https://github.com/haohongfei2001-png/paia/pull/325",
          "updatedAt": "2026-10-24T05:13:25Z",
          "mergedAt": "2026-10-24T05:10:06Z"
        },
        {
          "number": 313,
          "title": "Wire bounded Organize and preserve independent Maintenance progress",
          "state": "open",
          "draft": false,
          "merged": false,
          "headSha": "02144bccf5e0e0b6842aaa4e7c6958cedecdfde1",
          "branch": "codex/organize-handoff-validation-20261022",
          "base": "main",
          "url": "https://github.com/haohongfei2001-png/paia/pull/313",
          "updatedAt": "2026-10-23T00:25:19Z",
          "mergedAt": null
        },
        {
          "number": 312,
          "title": "Preserve latest Settings selection during pending restore (0.55.9)",
          "state": "open",
          "draft": false,
          "merged": false,
          "headSha": "7cd62ab4faf2940db7d3b57822e72c6e249a24e5",
          "branch": "fix/settings-restore-intent-v0559-20261022",
          "base": "main",
          "url": "https://github.com/haohongfei2001-png/paia/pull/312",
          "updatedAt": "2026-10-22T14:52:17Z",
          "mergedAt": null
        },
        {
          "number": 310,
          "title": "PAIA 官网重新设计：表达、原文与自主开放（第三版）",
          "state": "open",
          "draft": true,
          "merged": false,
          "headSha": "360c15b75941c14a2eebe5dd39480d080b123551",
          "branch": "design/paia-website-flagship-20261021",
          "base": "main",
          "url": "https://github.com/haohongfei2001-png/paia/pull/310",
          "updatedAt": "2026-10-21T03:55:41Z",
          "mergedAt": null
        },
        {
          "number": 297,
          "title": "design(prompt): v1.2 horizontal double-card R1 runnable refinement",
          "state": "open",
          "draft": true,
          "merged": false,
          "headSha": "7e5322d2241fd13112751a5170d3902179e00081",
          "branch": "design/float-ui-1.2-polish-20261018",
          "base": "main",
          "url": "https://github.com/haohongfei2001-png/paia/pull/297",
          "updatedAt": "2026-10-18T03:33:02Z",
          "mergedAt": null
        },
        {
          "number": 298,
          "title": "design(prompt): R2 unified capsule and separate-panel geometry",
          "state": "open",
          "draft": true,
          "merged": false,
          "headSha": "9a770b22f3e1be88f146905fbd31ff204139710d",
          "branch": "design/float-ui-1.2-geometry-r2-20261018",
          "base": "main",
          "url": "https://github.com/haohongfei2001-png/paia/pull/298",
          "updatedAt": "2026-10-18T03:31:21Z",
          "mergedAt": null
        },
        {
          "number": 296,
          "title": "fix: verify complete authored restore journal continuity",
          "state": "open",
          "draft": false,
          "merged": false,
          "headSha": "a19a9c6c0c8e71d4b9e90f152f879d27699cc617",
          "branch": "codex/authored-restore-continuity-20261018",
          "base": "main",
          "url": "https://github.com/haohongfei2001-png/paia/pull/296",
          "updatedAt": "2026-10-18T01:06:27Z",
          "mergedAt": null
        },
        {
          "number": 287,
          "title": "design: open-canvas revision 02; fixed-stage prototype rejected",
          "state": "open",
          "draft": true,
          "merged": false,
          "headSha": "a7c3635469052808e4bf1a10abfd469463281632",
          "branch": "design/website-three-act-20261014",
          "base": "main",
          "url": "https://github.com/haohongfei2001-png/paia/pull/287",
          "updatedAt": "2026-10-13T17:11:18Z",
          "mergedAt": null
        },
        {
          "number": 264,
          "title": "refactor(ci): unify browser admission and simplify the existing execution entry",
          "state": "open",
          "draft": false,
          "merged": false,
          "headSha": "6ed7bf75942d2696af32f72d9f6cb143572c7582",
          "branch": "engineering/execution-efficiency-20261012",
          "base": "main",
          "url": "https://github.com/haohongfei2001-png/paia/pull/264",
          "updatedAt": "2026-10-12T22:23:53Z",
          "mergedAt": null
        },
        {
          "number": 267,
          "title": "website: live-based art direction with frozen copy",
          "state": "open",
          "draft": true,
          "merged": false,
          "headSha": "d2f74539845e6530cc7612689ab3e137108ef256",
          "branch": "design/website-live-art-direction-20261012",
          "base": "main",
          "url": "https://github.com/haohongfei2001-png/paia/pull/267",
          "updatedAt": "2026-10-12T15:32:58Z",
          "mergedAt": null
        },
        {
          "number": 240,
          "title": "website: refine the current live layouts, preserve existing copy",
          "state": "open",
          "draft": true,
          "merged": false,
          "headSha": "21c76b9d676a7b3d5aa5492e9d41b96be1badaae",
          "branch": "feat/website-words-worth-returning-20261010",
          "base": "main",
          "url": "https://github.com/haohongfei2001-png/paia/pull/240",
          "updatedAt": "2026-10-10T17:44:41Z",
          "mergedAt": null
        }
      ],
      "workflowRuns": [
        {
          "id": 41076548646,
          "name": "PAIA Website",
          "headSha": "52c589efa27534cf84b7a7daf8712bc90635c2b4",
          "workflowId": 367203420,
          "status": "completed",
          "conclusion": "success",
          "url": "https://github.com/haohongfei2001-png/paia/actions/runs/41076548646",
          "createdAt": "2026-10-30T14:59:32Z",
          "updatedAt": "2026-10-30T15:03:34Z"
        },
        {
          "id": 41076547090,
          "name": "pages build and deployment",
          "headSha": "52c589efa27534cf84b7a7daf8712bc90635c2b4",
          "workflowId": 353533668,
          "status": "completed",
          "conclusion": "success",
          "url": "https://github.com/haohongfei2001-png/paia/actions/runs/41076547090",
          "createdAt": "2026-10-30T14:59:31Z",
          "updatedAt": "2026-10-30T15:00:38Z"
        },
        {
          "id": 41066851811,
          "name": "PAIA Website",
          "headSha": "47e42e194db8cd087e4f3bf22cb5cce3a9145b0d",
          "workflowId": 367203420,
          "status": "completed",
          "conclusion": "success",
          "url": "https://github.com/haohongfei2001-png/paia/actions/runs/41066851811",
          "createdAt": "2026-10-30T13:52:21Z",
          "updatedAt": "2026-10-30T14:02:50Z"
        },
        {
          "id": 41066850366,
          "name": "pages build and deployment",
          "headSha": "47e42e194db8cd087e4f3bf22cb5cce3a9145b0d",
          "workflowId": 353533668,
          "status": "completed",
          "conclusion": "success",
          "url": "https://github.com/haohongfei2001-png/paia/actions/runs/41066850366",
          "createdAt": "2026-10-30T13:52:20Z",
          "updatedAt": "2026-10-30T13:53:39Z"
        },
        {
          "id": 41066490772,
          "name": "PAIA Website",
          "headSha": "fdd661ab68f22bb7876f964107a79accfc3edd24",
          "workflowId": 367203420,
          "status": "completed",
          "conclusion": "success",
          "url": "https://github.com/haohongfei2001-png/paia/actions/runs/41066490772",
          "createdAt": "2026-10-30T13:49:45Z",
          "updatedAt": "2026-10-30T13:51:50Z"
        },
        {
          "id": 41064445656,
          "name": "PAIA Website",
          "headSha": "0facb35078c5bdb6b2026ab1367a42afc1a3bd92",
          "workflowId": 367203420,
          "status": "completed",
          "conclusion": "failure",
          "url": "https://github.com/haohongfei2001-png/paia/actions/runs/41064445656",
          "createdAt": "2026-10-30T13:34:58Z",
          "updatedAt": "2026-10-30T13:43:41Z"
        },
        {
          "id": 41064445097,
          "name": "pages build and deployment",
          "headSha": "0facb35078c5bdb6b2026ab1367a42afc1a3bd92",
          "workflowId": 353533668,
          "status": "completed",
          "conclusion": "success",
          "url": "https://github.com/haohongfei2001-png/paia/actions/runs/41064445097",
          "createdAt": "2026-10-30T13:34:57Z",
          "updatedAt": "2026-10-30T13:37:05Z"
        },
        {
          "id": 41063914096,
          "name": "PAIA Website",
          "headSha": "3f6976be7cd68c7da711541a21077b778ff9ae12",
          "workflowId": 367203420,
          "status": "completed",
          "conclusion": "success",
          "url": "https://github.com/haohongfei2001-png/paia/actions/runs/41063914096",
          "createdAt": "2026-10-30T13:31:11Z",
          "updatedAt": "2026-10-30T13:33:30Z"
        },
        {
          "id": 40883073851,
          "name": "UI same-head 5 recovery states 1cf86b13c631beb27f38f527bc5e89b88ce6bfe9",
          "headSha": "1cf86b13c631beb27f38f527bc5e89b88ce6bfe9",
          "workflowId": 400333935,
          "status": "completed",
          "conclusion": "success",
          "url": "https://github.com/haohongfei2001-png/paia/actions/runs/40883073851",
          "createdAt": "2026-10-29T13:33:50Z",
          "updatedAt": "2026-10-29T13:34:21Z"
        },
        {
          "id": 40880787438,
          "name": "UI same-head 8 recovery states 65dd4f51dd58adefa1256447026cb7b751630a04",
          "headSha": "65dd4f51dd58adefa1256447026cb7b751630a04",
          "workflowId": 400333935,
          "status": "completed",
          "conclusion": "failure",
          "url": "https://github.com/haohongfei2001-png/paia/actions/runs/40880787438",
          "createdAt": "2026-10-29T13:18:53Z",
          "updatedAt": "2026-10-29T13:19:49Z"
        },
        {
          "id": 40859950271,
          "name": "UI same-head 10 recovery states d82086269a4fa134b089bdd944908b2eb30c4ad6",
          "headSha": "d82086269a4fa134b089bdd944908b2eb30c4ad6",
          "workflowId": 400333935,
          "status": "completed",
          "conclusion": "failure",
          "url": "https://github.com/haohongfei2001-png/paia/actions/runs/40859950271",
          "createdAt": "2026-10-29T10:44:38Z",
          "updatedAt": "2026-10-29T10:45:11Z"
        },
        {
          "id": 40849816756,
          "name": "UI same-head 49 remaining states 4429f31b1d29e022f491522b61c2f9f4b78e6061",
          "headSha": "4429f31b1d29e022f491522b61c2f9f4b78e6061",
          "workflowId": 400333935,
          "status": "completed",
          "conclusion": "failure",
          "url": "https://github.com/haohongfei2001-png/paia/actions/runs/40849816756",
          "createdAt": "2026-10-29T09:27:49Z",
          "updatedAt": "2026-10-29T09:29:31Z"
        }
      ],
      "commits": [
        {
          "sha": "52c589efa27534cf84b7a7daf8712bc90635c2b4",
          "title": "website: restore October 29 live homepage (Atelier 16)",
          "body": "website: restore October 29 live homepage (Atelier 16)\n\nRestore the published EN/ZH homepages, source templates and version-specific checks from the last pre-Atelier17 production baseline (e99e7ac). Remove the Atelier17 assets and review artifacts. Preserve all extension/product code and the newer HTTP 503 readback fix. No history rewrite.",
          "date": "2026-10-30T14:59:14Z",
          "url": "https://github.com/haohongfei2001-png/paia/commit/52c589efa27534cf84b7a7daf8712bc90635c2b4"
        },
        {
          "sha": "47e42e194db8cd087e4f3bf22cb5cce3a9145b0d",
          "title": "Retry transient 503 responses in strict website readback (#332)",
          "body": "Retry transient 503 responses in strict website readback (#332)\n\nKeep all exact-byte, host, asset and browser assertions intact. Retry only HTTP 503 on the same request up to three attempts with bounded 2s/4s backoff, preserving useful URL diagnostics. Five deterministic unit tests and 10,485 website checks pass.",
          "date": "2026-10-30T13:52:17Z",
          "url": "https://github.com/haohongfei2001-png/paia/commit/47e42e194db8cd087e4f3bf22cb5cce3a9145b0d"
        },
        {
          "sha": "0facb35078c5bdb6b2026ab1367a42afc1a3bd92",
          "title": "Refine PAIA homepage with Atelier 17 (#331)",
          "body": "Refine PAIA homepage with Atelier 17 (#331)\n\nContent-first Chinese and English homepages with lighter typography, accessible preview tabs and refined responsive layouts. Preserve original source records, Context permission boundaries and the approved R3 component. Verified by 10,484 website checks with zero failures and desktop/mobile visual review.",
          "date": "2026-10-30T13:34:54Z",
          "url": "https://github.com/haohongfei2001-png/paia/commit/0facb35078c5bdb6b2026ab1367a42afc1a3bd92"
        },
        {
          "sha": "e99e7ac5aeea73f727acf707fc7f7e651fa2cf2f",
          "title": "Release 0.55.30 maintenance status document revalidation",
          "body": "Release 0.55.30 maintenance status document revalidation",
          "date": "2026-10-28T17:33:01Z",
          "url": "https://github.com/haohongfei2001-png/paia/commit/e99e7ac5aeea73f727acf707fc7f7e651fa2cf2f"
        }
      ],
      "issues": [],
      "comments": [],
      "warnings": [],
      "coverage": {
        "recentPulls": 18,
        "recentRuns": 12,
        "allHistory": false,
        "reviewedSource": true
      }
    },
    "workflows": [
      {
        "id": 41076548646,
        "name": "PAIA Website",
        "headSha": "52c589efa27534cf84b7a7daf8712bc90635c2b4",
        "workflowId": 367203420,
        "status": "completed",
        "conclusion": "success",
        "url": "https://github.com/haohongfei2001-png/paia/actions/runs/41076548646",
        "createdAt": "2026-10-30T14:59:32Z",
        "updatedAt": "2026-10-30T15:03:34Z"
      },
      {
        "id": 41076547090,
        "name": "pages build and deployment",
        "headSha": "52c589efa27534cf84b7a7daf8712bc90635c2b4",
        "workflowId": 353533668,
        "status": "completed",
        "conclusion": "success",
        "url": "https://github.com/haohongfei2001-png/paia/actions/runs/41076547090",
        "createdAt": "2026-10-30T14:59:31Z",
        "updatedAt": "2026-10-30T15:00:38Z"
      },
      {
        "id": 41066851811,
        "name": "PAIA Website",
        "headSha": "47e42e194db8cd087e4f3bf22cb5cce3a9145b0d",
        "workflowId": 367203420,
        "status": "completed",
        "conclusion": "success",
        "url": "https://github.com/haohongfei2001-png/paia/actions/runs/41066851811",
        "createdAt": "2026-10-30T13:52:21Z",
        "updatedAt": "2026-10-30T14:02:50Z"
      },
      {
        "id": 41066850366,
        "name": "pages build and deployment",
        "headSha": "47e42e194db8cd087e4f3bf22cb5cce3a9145b0d",
        "workflowId": 353533668,
        "status": "completed",
        "conclusion": "success",
        "url": "https://github.com/haohongfei2001-png/paia/actions/runs/41066850366",
        "createdAt": "2026-10-30T13:52:20Z",
        "updatedAt": "2026-10-30T13:53:39Z"
      },
      {
        "id": 41066490772,
        "name": "PAIA Website",
        "headSha": "fdd661ab68f22bb7876f964107a79accfc3edd24",
        "workflowId": 367203420,
        "status": "completed",
        "conclusion": "success",
        "url": "https://github.com/haohongfei2001-png/paia/actions/runs/41066490772",
        "createdAt": "2026-10-30T13:49:45Z",
        "updatedAt": "2026-10-30T13:51:50Z"
      },
      {
        "id": 41064445656,
        "name": "PAIA Website",
        "headSha": "0facb35078c5bdb6b2026ab1367a42afc1a3bd92",
        "workflowId": 367203420,
        "status": "completed",
        "conclusion": "failure",
        "url": "https://github.com/haohongfei2001-png/paia/actions/runs/41064445656",
        "createdAt": "2026-10-30T13:34:58Z",
        "updatedAt": "2026-10-30T13:43:41Z"
      },
      {
        "id": 41064445097,
        "name": "pages build and deployment",
        "headSha": "0facb35078c5bdb6b2026ab1367a42afc1a3bd92",
        "workflowId": 353533668,
        "status": "completed",
        "conclusion": "success",
        "url": "https://github.com/haohongfei2001-png/paia/actions/runs/41064445097",
        "createdAt": "2026-10-30T13:34:57Z",
        "updatedAt": "2026-10-30T13:37:05Z"
      },
      {
        "id": 41063914096,
        "name": "PAIA Website",
        "headSha": "3f6976be7cd68c7da711541a21077b778ff9ae12",
        "workflowId": 367203420,
        "status": "completed",
        "conclusion": "success",
        "url": "https://github.com/haohongfei2001-png/paia/actions/runs/41063914096",
        "createdAt": "2026-10-30T13:31:11Z",
        "updatedAt": "2026-10-30T13:33:30Z"
      },
      {
        "id": 40883073851,
        "name": "UI same-head 5 recovery states 1cf86b13c631beb27f38f527bc5e89b88ce6bfe9",
        "headSha": "1cf86b13c631beb27f38f527bc5e89b88ce6bfe9",
        "workflowId": 400333935,
        "status": "completed",
        "conclusion": "success",
        "url": "https://github.com/haohongfei2001-png/paia/actions/runs/40883073851",
        "createdAt": "2026-10-29T13:33:50Z",
        "updatedAt": "2026-10-29T13:34:21Z"
      },
      {
        "id": 40880787438,
        "name": "UI same-head 8 recovery states 65dd4f51dd58adefa1256447026cb7b751630a04",
        "headSha": "65dd4f51dd58adefa1256447026cb7b751630a04",
        "workflowId": 400333935,
        "status": "completed",
        "conclusion": "failure",
        "url": "https://github.com/haohongfei2001-png/paia/actions/runs/40880787438",
        "createdAt": "2026-10-29T13:18:53Z",
        "updatedAt": "2026-10-29T13:19:49Z"
      },
      {
        "id": 40859950271,
        "name": "UI same-head 10 recovery states d82086269a4fa134b089bdd944908b2eb30c4ad6",
        "headSha": "d82086269a4fa134b089bdd944908b2eb30c4ad6",
        "workflowId": 400333935,
        "status": "completed",
        "conclusion": "failure",
        "url": "https://github.com/haohongfei2001-png/paia/actions/runs/40859950271",
        "createdAt": "2026-10-29T10:44:38Z",
        "updatedAt": "2026-10-29T10:45:11Z"
      },
      {
        "id": 40849816756,
        "name": "UI same-head 49 remaining states 4429f31b1d29e022f491522b61c2f9f4b78e6061",
        "headSha": "4429f31b1d29e022f491522b61c2f9f4b78e6061",
        "workflowId": 400333935,
        "status": "completed",
        "conclusion": "failure",
        "url": "https://github.com/haohongfei2001-png/paia/actions/runs/40849816756",
        "createdAt": "2026-10-29T09:27:49Z",
        "updatedAt": "2026-10-29T09:29:31Z"
      }
    ],
    "current": {
      "headline": "官网已恢复到上一版；扩展仍在内测迭代。",
      "done": [
        "恢复中英文 Atelier 16 首页",
        "保留 HTTP 503 回读修复"
      ],
      "blocked": [],
      "next": "跟进扩展接线与完整验收，保留当前官网。",
      "sources": [
        {
          "label": "回退提交",
          "url": "https://github.com/haohongfei2001-png/paia/commit/52c589efa27534cf84b7a7daf8712bc90635c2b4"
        },
        {
          "label": "该提交网站检查",
          "url": "https://github.com/haohongfei2001-png/paia/actions/runs/41076548646"
        }
      ]
    },
    "notes": [
      {
        "id": "source-paia",
        "title": "Consumer Product v1 · 当前重点",
        "text": "计划摘录 · 非整体完成比例",
        "url": "https://github.com/haohongfei2001-png/paia/blob/52c589efa27534cf84b7a7daf8712bc90635c2b4/extension/docs/consumer-product-v1/STATUS.md",
        "createdAt": "2026-10-31T18:30:33Z"
      }
    ],
    "tasks": []
  },
  {
    "id": "todayaction",
    "name": "TodayAction",
    "repo": "haohongfei2001-png/pjsdas",
    "icon": {
      "path": "assets/apps/todayaction.svg",
      "kind": "source-asset",
      "sourceUrl": "https://github.com/haohongfei2001-png/pjsdas/blob/b934a58f038a946ec7bd3b199efe7a4083e7d943/public/brand/favicon.svg",
      "data": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNTYgMjU2IiBmaWxsPSJub25lIj48dGl0bGU+VG9kYXlBY3Rpb248L3RpdGxlPjxwYXRoIGQ9Ik03OCAxNkgxODJDMjAxIDE2IDIwOCAzNCAxOTQgNDlMMTg0IDU5QzE2OSA3MyAxNTEgODAgMTMyIDgwSDI0QzE3IDgwIDE0IDc3IDE2IDY5QzIwIDM5IDQ2IDE2IDc4IDE2WiIgZmlsbD0iIzc2OThERCIvPjxwYXRoIGQ9Ik0yMjQgNDhDMjM0IDQ0IDIzOCA1MyAyMzggNjZWMTgxQzIzOCAyMTIgMjE0IDIzNSAxODUgMjM2SDE4MEMxNzQgMjM2IDE3MSAyMzMgMTcxIDIyNVYxMjhDMTcxIDEwNCAxODEgODIgMjAwIDY1TDIxMiA1NUMyMTcgNTEgMjIwIDQ5IDIyNCA0OFoiIGZpbGw9IiM3Njk4REQiLz48cGF0aCBkPSJNMjUgMTc5TDEwNiA5OEMxMTkgODUgMTM4IDg1IDE1MSA5OEMxNjQgMTExIDE2NCAxMzAgMTUxIDE0M0w3MCAyMjRDNTcgMjM3IDM4IDIzNyAyNSAyMjRDMTIgMjExIDEyIDE5MiAyNSAxNzlaIiBmaWxsPSIjMjQ2NERDIi8+PC9zdmc+Cg=="
    },
    "iconKind": "repository-asset",
    "iconSource": "https://github.com/haohongfei2001-png/pjsdas/blob/b934a58f038a946ec7bd3b199efe7a4083e7d943/public/brand/favicon.svg",
    "observedAt": "2026-10-31T18:30:33Z",
    "sourceRef": "dot/ta-row-storage-stage-a-20261025",
    "sourceSha": "4ce14933526940d55bd18facf1431dca31911dbf",
    "planPath": "docs/engineering/workspace-rows-integrated-candidate-contract.md",
    "trackedPr": 307,
    "phase": {
      "label": "恢复链路验证",
      "sourceUrl": "https://github.com/haohongfei2001-png/pjsdas/pull/307",
      "ref": "4ce14933526940d55bd18facf1431dca31911dbf",
      "key": "validation"
    },
    "currentSummary": "新恢复检查通过，候选仍为 Draft；完整发布门槛未关闭。",
    "currentWork": "补齐恢复、混合负载和发布验收。",
    "plan": {
      "title": "行级恢复 · 集成候选",
      "sourceUrl": "https://github.com/haohongfei2001-png/pjsdas/blob/4ce14933526940d55bd18facf1431dca31911dbf/docs/engineering/workspace-rows-integrated-candidate-contract.md",
      "ref": "4ce14933526940d55bd18facf1431dca31911dbf",
      "scopeLabel": "候选验收重点 · 非全部发布门槛",
      "completeScope": false,
      "items": [
        {
          "id": "ta-core",
          "title": "原始身份的中断恢复与保护检查",
          "status": "done",
          "sourceUrl": "https://github.com/haohongfei2001-png/pjsdas/actions/runs/40944076403"
        },
        {
          "id": "ta-storage",
          "title": "浏览器持久化与重载恢复",
          "status": "done",
          "sourceUrl": "https://github.com/haohongfei2001-png/pjsdas/actions/runs/40944076239"
        },
        {
          "id": "ta-uipg",
          "title": "真实界面到 PostgreSQL 恢复测试",
          "status": "done",
          "sourceUrl": "https://github.com/haohongfei2001-png/pjsdas/actions/runs/40944076377"
        },
        {
          "id": "ta-mixed",
          "title": "混合负载与截止预算问题",
          "status": "blocked",
          "sourceUrl": "https://github.com/haohongfei2001-png/pjsdas/pull/307"
        },
        {
          "id": "ta-release",
          "title": "完整兼容、部署与生产准入",
          "status": "todo",
          "sourceUrl": "https://github.com/haohongfei2001-png/pjsdas/pull/307"
        }
      ],
      "scopeComplete": false
    },
    "previousPlans": [
      {
        "title": "Stage A 分层验证",
        "date": "2026-10-25T16:33:36Z",
        "status": "historical",
        "sourceUrl": "https://github.com/haohongfei2001-png/pjsdas/pull/307",
        "summary": "先验证行级存储，再加入原始身份恢复、浏览器重载和真实界面到数据库检查；旧失败未被后续局部通过抹去。",
        "items": []
      }
    ],
    "rounds": [
      {
        "id": "ta-ui-pg",
        "title": "补齐真实界面到数据库的恢复检查",
        "date": "2026-10-29T19:52:49Z",
        "headSha": "4ce14933526940d55bd18facf1431dca31911dbf",
        "status": "review",
        "done": [
          "Stop 与原始 Undo 的真实界面 / API / PostgreSQL 检查通过",
          "修正测试对参与状态与招聘事实的区分"
        ],
        "failed": [
          "完整 Browser E2E 与 Matrix 按 Draft 策略跳过"
        ],
        "next": [
          "继续处理发布前的剩余门槛"
        ],
        "sources": [
          {
            "label": "当前候选",
            "url": "https://github.com/haohongfei2001-png/pjsdas/pull/307"
          },
          {
            "label": "真实 UI → PostgreSQL 检查",
            "url": "https://github.com/haohongfei2001-png/pjsdas/actions/runs/40944076377"
          }
        ]
      },
      {
        "id": "ta-reciprocal",
        "title": "停止同步时间戳引发的互相回读",
        "date": "2026-10-29T15:56:01Z",
        "headSha": "c63b08762346cee0e9b64c8d0ca80d4f5809313f",
        "status": "review",
        "done": [
          "修复同步时间戳通知引发的互相读取"
        ],
        "failed": [],
        "next": [],
        "sources": [
          {
            "label": "修复提交",
            "url": "https://github.com/haohongfei2001-png/pjsdas/commit/c63b08762346cee0e9b64c8d0ca80d4f5809313f"
          }
        ]
      },
      {
        "id": "ta-gmail",
        "title": "减少邮件批次中的重复处理",
        "date": "2026-10-25T15:21:58Z",
        "headSha": "70fa03f16494d381e69ef8e78edff311087c6466",
        "status": "merged",
        "done": [
          "复用批次内的邮件身份计算",
          "跳过重复回放的完整克隆"
        ],
        "failed": [],
        "next": [],
        "sources": [
          {
            "label": "PR #306",
            "url": "https://github.com/haohongfei2001-png/pjsdas/pull/306"
          }
        ]
      }
    ],
    "attention": [
      {
        "id": "ta-release-gap",
        "title": "恢复候选仍有未关闭的发布门槛",
        "kind": "blocked",
        "sourceUrl": "https://github.com/haohongfei2001-png/pjsdas/pull/307",
        "ref": "4ce14933526940d55bd18facf1431dca31911dbf",
        "reason": "PR 明确保留混合负载、截止预算和生产准入缺口；通过的新检查只覆盖其标明的范围。",
        "confidence": "explicit-source",
        "detail": "PR 明确保留混合负载、截止预算和生产准入缺口；通过的新检查只覆盖其标明的范围。",
        "at": "2026-10-31T18:30:33Z"
      }
    ],
    "limitations": [
      "当前 PR 文案含多个历史提交的验收段；最新检查以 4ce1493 对应 Actions 为准。",
      "没有发现当前明确要求用户批准的独立事项，不将 Draft 自动当作待批准。"
    ],
    "headSha": "4ce14933526940d55bd18facf1431dca31911dbf",
    "watching": true,
    "commentIssue": 307,
    "evidenceLimitations": [
      "当前 PR 文案含多个历史提交的验收段；最新检查以 4ce1493 对应 Actions 为准。",
      "没有发现当前明确要求用户批准的独立事项，不将 Draft 自动当作待批准。"
    ],
    "initials": "T",
    "snapshot": {
      "repo": "haohongfei2001-png/pjsdas",
      "source": "github-reviewed-snapshot",
      "fetchedAt": "2026-10-31T18:30:33Z",
      "repository": {
        "fullName": "haohongfei2001-png/pjsdas",
        "defaultBranch": "main",
        "url": "https://github.com/haohongfei2001-png/pjsdas",
        "pushedAt": "2026-10-29T19:52:59Z",
        "private": false
      },
      "pullRequests": [
        {
          "number": 307,
          "title": "Draft: default-off integrated row recovery (not deployable)",
          "state": "open",
          "draft": true,
          "merged": false,
          "headSha": "4ce14933526940d55bd18facf1431dca31911dbf",
          "branch": "dot/ta-row-storage-stage-a-20261025",
          "base": "main",
          "url": "https://github.com/haohongfei2001-png/pjsdas/pull/307",
          "updatedAt": "2026-10-29T19:53:06Z",
          "mergedAt": null
        },
        {
          "number": 306,
          "title": "perf: bound batch-local Gmail identity reuse and skip replay clones",
          "state": "closed",
          "draft": false,
          "merged": true,
          "headSha": "70fa03f16494d381e69ef8e78edff311087c6466",
          "branch": "dot/ta-gmail-bounded-cpu-20261025",
          "base": "main",
          "url": "https://github.com/haohongfei2001-png/pjsdas/pull/306",
          "updatedAt": "2026-10-25T15:21:58Z",
          "mergedAt": "2026-10-25T15:21:58Z"
        },
        {
          "number": 305,
          "title": "feat: default-off bounded empty Gmail checkpoint candidate",
          "state": "closed",
          "draft": false,
          "merged": true,
          "headSha": "1514e27426ee4a030a65368ad6bfa8a775cbc318",
          "branch": "dot/ta-empty-poll-checkpoint-candidate-20261025",
          "base": "main",
          "url": "https://github.com/haohongfei2001-png/pjsdas/pull/305",
          "updatedAt": "2026-10-25T13:47:05Z",
          "mergedAt": "2026-10-25T13:47:05Z"
        },
        {
          "number": 304,
          "title": "Require complete attributable evidence for automatic Discovery scope",
          "state": "closed",
          "draft": false,
          "merged": true,
          "headSha": "74c602fa999186f17d36f574efb7adec24b8d535",
          "branch": "dot/ta-complete-scope-evidence-20261025",
          "base": "main",
          "url": "https://github.com/haohongfei2001-png/pjsdas/pull/304",
          "updatedAt": "2026-10-25T13:29:51Z",
          "mergedAt": "2026-10-25T13:29:51Z"
        },
        {
          "number": 303,
          "title": "Ground AI capture time fields in attributable source evidence",
          "state": "closed",
          "draft": false,
          "merged": true,
          "headSha": "60cbcc4c53c8506f29c59dd34992e5f5e2245d33",
          "branch": "dot/ta-ai-temporal-grounding-20261025",
          "base": "main",
          "url": "https://github.com/haohongfei2001-png/pjsdas/pull/303",
          "updatedAt": "2026-10-25T13:08:36Z",
          "mergedAt": "2026-10-25T13:08:35Z"
        },
        {
          "number": 302,
          "title": "Avoid unused full-snapshot hashing for semantic commits",
          "state": "closed",
          "draft": false,
          "merged": true,
          "headSha": "f2bde4c431e555fe76d5f7ffe57f4c9d04dd6ef6",
          "branch": "dot/ta-semantic-fingerprint-20261025",
          "base": "main",
          "url": "https://github.com/haohongfei2001-png/pjsdas/pull/302",
          "updatedAt": "2026-10-25T12:35:49Z",
          "mergedAt": "2026-10-25T12:35:49Z"
        },
        {
          "number": 301,
          "title": "Reserve commit budget while slicing Gmail polling",
          "state": "closed",
          "draft": false,
          "merged": true,
          "headSha": "82c733d9e1d93fe9324805d0bef6bfbc7b0a1e87",
          "branch": "dot/ta-gmail-budget-slice-20261025",
          "base": "main",
          "url": "https://github.com/haohongfei2001-png/pjsdas/pull/301",
          "updatedAt": "2026-10-25T11:32:13Z",
          "mergedAt": "2026-10-25T11:32:13Z"
        },
        {
          "number": 300,
          "title": "Add payload-free workspace commit failure diagnostics",
          "state": "closed",
          "draft": false,
          "merged": true,
          "headSha": "14b4315453b6757aa68de7fe5c924193a27af868",
          "branch": "dot/ta-commit-failure-diagnostics-20261025",
          "base": "main",
          "url": "https://github.com/haohongfei2001-png/pjsdas/pull/300",
          "updatedAt": "2026-10-25T10:20:53Z",
          "mergedAt": "2026-10-25T10:20:53Z"
        }
      ],
      "workflowRuns": [
        {
          "id": 40944076660,
          "name": "TodayAction UI Review",
          "headSha": "4ce14933526940d55bd18facf1431dca31911dbf",
          "workflowId": 367529244,
          "status": "completed",
          "conclusion": "success",
          "url": "https://github.com/haohongfei2001-png/pjsdas/actions/runs/40944076660",
          "createdAt": "2026-10-29T19:53:10Z",
          "updatedAt": "2026-10-29T19:56:19Z"
        },
        {
          "id": 40944076526,
          "name": "TSUI-05 Browser Matrix",
          "headSha": "4ce14933526940d55bd18facf1431dca31911dbf",
          "workflowId": 366961302,
          "status": "completed",
          "conclusion": "skipped",
          "url": "https://github.com/haohongfei2001-png/pjsdas/actions/runs/40944076526",
          "createdAt": "2026-10-29T19:53:10Z",
          "updatedAt": "2026-10-29T19:53:12Z"
        },
        {
          "id": 40944076520,
          "name": "Consumer Management SQL",
          "headSha": "4ce14933526940d55bd18facf1431dca31911dbf",
          "workflowId": 373123821,
          "status": "completed",
          "conclusion": "success",
          "url": "https://github.com/haohongfei2001-png/pjsdas/actions/runs/40944076520",
          "createdAt": "2026-10-29T19:53:10Z",
          "updatedAt": "2026-10-29T19:55:43Z"
        },
        {
          "id": 40944076403,
          "name": "Workspace rows Stage A (synthetic only)",
          "headSha": "4ce14933526940d55bd18facf1431dca31911dbf",
          "workflowId": 396168137,
          "status": "completed",
          "conclusion": "success",
          "url": "https://github.com/haohongfei2001-png/pjsdas/actions/runs/40944076403",
          "createdAt": "2026-10-29T19:53:10Z",
          "updatedAt": "2026-10-29T19:57:42Z"
        },
        {
          "id": 40944076377,
          "name": "Consumer UI recovery to PostgreSQL (synthetic only)",
          "headSha": "4ce14933526940d55bd18facf1431dca31911dbf",
          "workflowId": 398086304,
          "status": "completed",
          "conclusion": "success",
          "url": "https://github.com/haohongfei2001-png/pjsdas/actions/runs/40944076377",
          "createdAt": "2026-10-29T19:53:10Z",
          "updatedAt": "2026-10-29T19:55:38Z"
        },
        {
          "id": 40944076339,
          "name": "TodayAction Brand Gate",
          "headSha": "4ce14933526940d55bd18facf1431dca31911dbf",
          "workflowId": 367515311,
          "status": "completed",
          "conclusion": "success",
          "url": "https://github.com/haohongfei2001-png/pjsdas/actions/runs/40944076339",
          "createdAt": "2026-10-29T19:53:10Z",
          "updatedAt": "2026-10-29T19:54:20Z"
        },
        {
          "id": 40944076334,
          "name": "Secondary surfaces visual adaptation",
          "headSha": "4ce14933526940d55bd18facf1431dca31911dbf",
          "workflowId": 372183180,
          "status": "completed",
          "conclusion": "success",
          "url": "https://github.com/haohongfei2001-png/pjsdas/actions/runs/40944076334",
          "createdAt": "2026-10-29T19:53:10Z",
          "updatedAt": "2026-10-29T19:58:39Z"
        },
        {
          "id": 40944076318,
          "name": "Browser E2E",
          "headSha": "4ce14933526940d55bd18facf1431dca31911dbf",
          "workflowId": 357468554,
          "status": "completed",
          "conclusion": "skipped",
          "url": "https://github.com/haohongfei2001-png/pjsdas/actions/runs/40944076318",
          "createdAt": "2026-10-29T19:53:10Z",
          "updatedAt": "2026-10-29T19:53:11Z"
        },
        {
          "id": 40944076311,
          "name": "CGR-02 Read-only Rollback",
          "headSha": "4ce14933526940d55bd18facf1431dca31911dbf",
          "workflowId": 365098675,
          "status": "completed",
          "conclusion": "success",
          "url": "https://github.com/haohongfei2001-png/pjsdas/actions/runs/40944076311",
          "createdAt": "2026-10-29T19:53:10Z",
          "updatedAt": "2026-10-29T19:54:12Z"
        },
        {
          "id": 40944076309,
          "name": "CI",
          "headSha": "4ce14933526940d55bd18facf1431dca31911dbf",
          "workflowId": 354561684,
          "status": "completed",
          "conclusion": "success",
          "url": "https://github.com/haohongfei2001-png/pjsdas/actions/runs/40944076309",
          "createdAt": "2026-10-29T19:53:10Z",
          "updatedAt": "2026-10-29T19:55:12Z"
        },
        {
          "id": 40944076290,
          "name": "CGR-02 VoiceOver",
          "headSha": "4ce14933526940d55bd18facf1431dca31911dbf",
          "workflowId": 365081891,
          "status": "completed",
          "conclusion": "success",
          "url": "https://github.com/haohongfei2001-png/pjsdas/actions/runs/40944076290",
          "createdAt": "2026-10-29T19:53:10Z",
          "updatedAt": "2026-10-29T19:57:50Z"
        },
        {
          "id": 40944076239,
          "name": "Instant Recovery Draft Gate",
          "headSha": "4ce14933526940d55bd18facf1431dca31911dbf",
          "workflowId": 372018064,
          "status": "completed",
          "conclusion": "success",
          "url": "https://github.com/haohongfei2001-png/pjsdas/actions/runs/40944076239",
          "createdAt": "2026-10-29T19:53:10Z",
          "updatedAt": "2026-10-29T19:58:20Z"
        }
      ],
      "commits": [],
      "issues": [],
      "comments": [],
      "warnings": [],
      "coverage": {
        "recentPulls": 8,
        "recentRuns": 12,
        "allHistory": false,
        "reviewedSource": true
      }
    },
    "workflows": [
      {
        "id": 40944076660,
        "name": "TodayAction UI Review",
        "headSha": "4ce14933526940d55bd18facf1431dca31911dbf",
        "workflowId": 367529244,
        "status": "completed",
        "conclusion": "success",
        "url": "https://github.com/haohongfei2001-png/pjsdas/actions/runs/40944076660",
        "createdAt": "2026-10-29T19:53:10Z",
        "updatedAt": "2026-10-29T19:56:19Z"
      },
      {
        "id": 40944076526,
        "name": "TSUI-05 Browser Matrix",
        "headSha": "4ce14933526940d55bd18facf1431dca31911dbf",
        "workflowId": 366961302,
        "status": "completed",
        "conclusion": "skipped",
        "url": "https://github.com/haohongfei2001-png/pjsdas/actions/runs/40944076526",
        "createdAt": "2026-10-29T19:53:10Z",
        "updatedAt": "2026-10-29T19:53:12Z"
      },
      {
        "id": 40944076520,
        "name": "Consumer Management SQL",
        "headSha": "4ce14933526940d55bd18facf1431dca31911dbf",
        "workflowId": 373123821,
        "status": "completed",
        "conclusion": "success",
        "url": "https://github.com/haohongfei2001-png/pjsdas/actions/runs/40944076520",
        "createdAt": "2026-10-29T19:53:10Z",
        "updatedAt": "2026-10-29T19:55:43Z"
      },
      {
        "id": 40944076403,
        "name": "Workspace rows Stage A (synthetic only)",
        "headSha": "4ce14933526940d55bd18facf1431dca31911dbf",
        "workflowId": 396168137,
        "status": "completed",
        "conclusion": "success",
        "url": "https://github.com/haohongfei2001-png/pjsdas/actions/runs/40944076403",
        "createdAt": "2026-10-29T19:53:10Z",
        "updatedAt": "2026-10-29T19:57:42Z"
      },
      {
        "id": 40944076377,
        "name": "Consumer UI recovery to PostgreSQL (synthetic only)",
        "headSha": "4ce14933526940d55bd18facf1431dca31911dbf",
        "workflowId": 398086304,
        "status": "completed",
        "conclusion": "success",
        "url": "https://github.com/haohongfei2001-png/pjsdas/actions/runs/40944076377",
        "createdAt": "2026-10-29T19:53:10Z",
        "updatedAt": "2026-10-29T19:55:38Z"
      },
      {
        "id": 40944076339,
        "name": "TodayAction Brand Gate",
        "headSha": "4ce14933526940d55bd18facf1431dca31911dbf",
        "workflowId": 367515311,
        "status": "completed",
        "conclusion": "success",
        "url": "https://github.com/haohongfei2001-png/pjsdas/actions/runs/40944076339",
        "createdAt": "2026-10-29T19:53:10Z",
        "updatedAt": "2026-10-29T19:54:20Z"
      },
      {
        "id": 40944076334,
        "name": "Secondary surfaces visual adaptation",
        "headSha": "4ce14933526940d55bd18facf1431dca31911dbf",
        "workflowId": 372183180,
        "status": "completed",
        "conclusion": "success",
        "url": "https://github.com/haohongfei2001-png/pjsdas/actions/runs/40944076334",
        "createdAt": "2026-10-29T19:53:10Z",
        "updatedAt": "2026-10-29T19:58:39Z"
      },
      {
        "id": 40944076318,
        "name": "Browser E2E",
        "headSha": "4ce14933526940d55bd18facf1431dca31911dbf",
        "workflowId": 357468554,
        "status": "completed",
        "conclusion": "skipped",
        "url": "https://github.com/haohongfei2001-png/pjsdas/actions/runs/40944076318",
        "createdAt": "2026-10-29T19:53:10Z",
        "updatedAt": "2026-10-29T19:53:11Z"
      },
      {
        "id": 40944076311,
        "name": "CGR-02 Read-only Rollback",
        "headSha": "4ce14933526940d55bd18facf1431dca31911dbf",
        "workflowId": 365098675,
        "status": "completed",
        "conclusion": "success",
        "url": "https://github.com/haohongfei2001-png/pjsdas/actions/runs/40944076311",
        "createdAt": "2026-10-29T19:53:10Z",
        "updatedAt": "2026-10-29T19:54:12Z"
      },
      {
        "id": 40944076309,
        "name": "CI",
        "headSha": "4ce14933526940d55bd18facf1431dca31911dbf",
        "workflowId": 354561684,
        "status": "completed",
        "conclusion": "success",
        "url": "https://github.com/haohongfei2001-png/pjsdas/actions/runs/40944076309",
        "createdAt": "2026-10-29T19:53:10Z",
        "updatedAt": "2026-10-29T19:55:12Z"
      },
      {
        "id": 40944076290,
        "name": "CGR-02 VoiceOver",
        "headSha": "4ce14933526940d55bd18facf1431dca31911dbf",
        "workflowId": 365081891,
        "status": "completed",
        "conclusion": "success",
        "url": "https://github.com/haohongfei2001-png/pjsdas/actions/runs/40944076290",
        "createdAt": "2026-10-29T19:53:10Z",
        "updatedAt": "2026-10-29T19:57:50Z"
      },
      {
        "id": 40944076239,
        "name": "Instant Recovery Draft Gate",
        "headSha": "4ce14933526940d55bd18facf1431dca31911dbf",
        "workflowId": 372018064,
        "status": "completed",
        "conclusion": "success",
        "url": "https://github.com/haohongfei2001-png/pjsdas/actions/runs/40944076239",
        "createdAt": "2026-10-29T19:53:10Z",
        "updatedAt": "2026-10-29T19:58:20Z"
      }
    ],
    "current": {
      "headline": "新恢复检查通过，候选仍为 Draft；完整发布门槛未关闭。",
      "done": [
        "Stop 与原始 Undo 的真实界面 / API / PostgreSQL 检查通过",
        "修正测试对参与状态与招聘事实的区分"
      ],
      "blocked": [
        "完整 Browser E2E 与 Matrix 按 Draft 策略跳过"
      ],
      "next": "补齐恢复、混合负载和发布验收。",
      "sources": [
        {
          "label": "当前候选",
          "url": "https://github.com/haohongfei2001-png/pjsdas/pull/307"
        },
        {
          "label": "真实 UI → PostgreSQL 检查",
          "url": "https://github.com/haohongfei2001-png/pjsdas/actions/runs/40944076377"
        }
      ]
    },
    "notes": [
      {
        "id": "source-todayaction",
        "title": "行级恢复 · 集成候选",
        "text": "候选验收重点 · 非全部发布门槛",
        "url": "https://github.com/haohongfei2001-png/pjsdas/blob/4ce14933526940d55bd18facf1431dca31911dbf/docs/engineering/workspace-rows-integrated-candidate-contract.md",
        "createdAt": "2026-10-31T18:30:33Z"
      }
    ],
    "tasks": []
  },
  {
    "id": "workspace",
    "name": "项目工作台",
    "repo": "haohongfei2001-png/project-collaboration-workspace",
    "observedAt": "2026-10-31T18:39:31.347Z",
    "sourceRef": "design/prototype-r1-20261031",
    "headSha": "f8280807345d82df1da8b6efec9af7e62968a0c2",
    "trackedPr": 1,
    "planPath": "docs/personal-v1.md",
    "watching": false,
    "icon": {
      "kind": "initials",
      "text": "W"
    },
    "phase": {
      "key": "prototype",
      "label": "原型迭代",
      "sourceUrl": "https://github.com/haohongfei2001-png/project-collaboration-workspace/pull/1"
    },
    "currentSummary": "个人版原型已交付，当前候选还在评审中。",
    "currentWork": "完善项目卡片、开发历史与选定项目的持续跟进。",
    "current": {
      "done": [
        "个人项目、待办和资料可以实际操作",
        "公开 GitHub 读取与前台同步已接通",
        "55 项本地测试与远端 CI 通过"
      ],
      "blocked": [],
      "next": "完善项目卡片、开发历史与选定项目的持续跟进。",
      "sources": [
        {
          "label": "当前原型 PR",
          "url": "https://github.com/haohongfei2001-png/project-collaboration-workspace/pull/1"
        },
        {
          "label": "已验证的提交",
          "url": "https://github.com/haohongfei2001-png/project-collaboration-workspace/commit/f8280807345d82df1da8b6efec9af7e62968a0c2"
        }
      ]
    },
    "plan": {
      "title": "个人工作台 · 第一版",
      "scopeLabel": "当前原型重点",
      "ref": "f8280807345d82df1da8b6efec9af7e62968a0c2",
      "sourceUrl": "https://github.com/haohongfei2001-png/project-collaboration-workspace/blob/f8280807345d82df1da8b6efec9af7e62968a0c2/docs/personal-v1.md",
      "scopeComplete": false,
      "items": [
        {
          "id": "workspace-personal",
          "title": "个人项目、待办与资料",
          "status": "done",
          "sourceUrl": "https://github.com/haohongfei2001-png/project-collaboration-workspace/pull/1"
        },
        {
          "id": "workspace-github",
          "title": "公开 GitHub 只读同步",
          "status": "done",
          "sourceUrl": "https://github.com/haohongfei2001-png/project-collaboration-workspace/pull/1"
        },
        {
          "id": "workspace-cards",
          "title": "紧凑卡片与开发历史",
          "status": "active",
          "sourceUrl": "https://github.com/haohongfei2001-png/project-collaboration-workspace/pull/1"
        },
        {
          "id": "workspace-understanding",
          "title": "真实模型理解与本人日用验证",
          "status": "todo",
          "sourceUrl": "https://github.com/haohongfei2001-png/project-collaboration-workspace/blob/f8280807345d82df1da8b6efec9af7e62968a0c2/docs/personal-v1.md"
        }
      ]
    },
    "previousPlans": [
      {
        "title": "团队协作原型 R1",
        "date": "2026-10-31T13:44:05Z",
        "status": "superseded",
        "sourceUrl": "https://github.com/haohongfei2001-png/project-collaboration-workspace/commit/3f8134effa55a078a9955c6d16fa6b6db3930830",
        "done": [
          "团队任务、方案比较、验收的模拟闭环"
        ],
        "remaining": [
          "产品优先级转向个人使用"
        ],
        "items": [],
        "summary": ""
      }
    ],
    "rounds": [
      {
        "id": "workspace-personal-v1",
        "title": "先做个人工作台，接入真实公开仓库",
        "date": "2026-10-31T18:11:02Z",
        "headSha": "f8280807345d82df1da8b6efec9af7e62968a0c2",
        "status": "review",
        "done": [
          "创建项目、编辑资料、安排待办",
          "真实读取公开 GitHub；55 项测试通过"
        ],
        "failed": [],
        "next": [
          "根据反馈重新设计项目卡片与开发历史"
        ],
        "sources": [
          {
            "label": "PR #1",
            "url": "https://github.com/haohongfei2001-png/project-collaboration-workspace/pull/1"
          },
          {
            "label": "CI",
            "url": "https://github.com/haohongfei2001-png/project-collaboration-workspace/actions/runs/41227991260"
          }
        ]
      },
      {
        "id": "workspace-r1",
        "title": "协作原型完成首条端到端流程",
        "date": "2026-10-31T13:44:05Z",
        "headSha": "3f8134effa55a078a9955c6d16fa6b6db3930830",
        "status": "completed",
        "done": [
          "任务、资料、方案采用、验收可交互"
        ],
        "failed": [
          "团队功能优先，未先解决个人日用价值"
        ],
        "next": [
          "按个人使用重新确定产品入口"
        ],
        "sources": [
          {
            "label": "历史提交",
            "url": "https://github.com/haohongfei2001-png/project-collaboration-workspace/commit/3f8134effa55a078a9955c6d16fa6b6db3930830"
          }
        ]
      }
    ],
    "attention": [],
    "workflows": [
      {
        "id": 41227991260,
        "workflowId": 402768826,
        "name": "Prototype validation",
        "headSha": "f8280807345d82df1da8b6efec9af7e62968a0c2",
        "status": "completed",
        "conclusion": "success",
        "event": "pull_request",
        "createdAt": "2026-10-31T18:09:21Z",
        "url": "https://github.com/haohongfei2001-png/project-collaboration-workspace/actions/runs/41227991260"
      },
      {
        "id": 41227986448,
        "workflowId": 402768826,
        "name": "Prototype validation",
        "headSha": "f8280807345d82df1da8b6efec9af7e62968a0c2",
        "status": "completed",
        "conclusion": "success",
        "event": "push",
        "createdAt": "2026-10-31T18:09:17Z",
        "url": "https://github.com/haohongfei2001-png/project-collaboration-workspace/actions/runs/41227986448"
      },
      {
        "id": 41206902507,
        "workflowId": 402768826,
        "name": "Prototype validation",
        "headSha": "3f8134effa55a078a9955c6d16fa6b6db3930830",
        "status": "completed",
        "conclusion": "success",
        "event": "pull_request",
        "createdAt": "2026-10-31T13:44:08Z",
        "url": "https://github.com/haohongfei2001-png/project-collaboration-workspace/actions/runs/41206902507"
      },
      {
        "id": 41206861232,
        "workflowId": 402768826,
        "name": "Prototype validation",
        "headSha": "3f8134effa55a078a9955c6d16fa6b6db3930830",
        "status": "completed",
        "conclusion": "success",
        "event": "push",
        "createdAt": "2026-10-31T13:43:34Z",
        "url": "https://github.com/haohongfei2001-png/project-collaboration-workspace/actions/runs/41206861232"
      }
    ],
    "snapshot": {
      "repo": "haohongfei2001-png/project-collaboration-workspace",
      "source": "github-reviewed-snapshot",
      "fetchedAt": "2026-10-31T18:39:31.347Z",
      "repository": {
        "fullName": "haohongfei2001-png/project-collaboration-workspace",
        "defaultBranch": "main",
        "url": "https://github.com/haohongfei2001-png/project-collaboration-workspace"
      },
      "pullRequests": [
        {
          "number": 1,
          "title": "feat: 个人优先的卡片工作台与真实 GitHub 状态同步",
          "state": "open",
          "draft": false,
          "merged": false,
          "mergedAt": null,
          "headSha": "f8280807345d82df1da8b6efec9af7e62968a0c2",
          "branch": "design/prototype-r1-20261031",
          "base": "main",
          "url": "https://github.com/haohongfei2001-png/project-collaboration-workspace/pull/1",
          "updatedAt": "2026-10-31T18:11:02Z"
        }
      ],
      "workflowRuns": [
        {
          "id": 41227991260,
          "workflowId": 402768826,
          "name": "Prototype validation",
          "headSha": "f8280807345d82df1da8b6efec9af7e62968a0c2",
          "status": "completed",
          "conclusion": "success",
          "event": "pull_request",
          "createdAt": "2026-10-31T18:09:21Z",
          "url": "https://github.com/haohongfei2001-png/project-collaboration-workspace/actions/runs/41227991260"
        },
        {
          "id": 41227986448,
          "workflowId": 402768826,
          "name": "Prototype validation",
          "headSha": "f8280807345d82df1da8b6efec9af7e62968a0c2",
          "status": "completed",
          "conclusion": "success",
          "event": "push",
          "createdAt": "2026-10-31T18:09:17Z",
          "url": "https://github.com/haohongfei2001-png/project-collaboration-workspace/actions/runs/41227986448"
        },
        {
          "id": 41206902507,
          "workflowId": 402768826,
          "name": "Prototype validation",
          "headSha": "3f8134effa55a078a9955c6d16fa6b6db3930830",
          "status": "completed",
          "conclusion": "success",
          "event": "pull_request",
          "createdAt": "2026-10-31T13:44:08Z",
          "url": "https://github.com/haohongfei2001-png/project-collaboration-workspace/actions/runs/41206902507"
        },
        {
          "id": 41206861232,
          "workflowId": 402768826,
          "name": "Prototype validation",
          "headSha": "3f8134effa55a078a9955c6d16fa6b6db3930830",
          "status": "completed",
          "conclusion": "success",
          "event": "push",
          "createdAt": "2026-10-31T13:43:34Z",
          "url": "https://github.com/haohongfei2001-png/project-collaboration-workspace/actions/runs/41206861232"
        }
      ],
      "commits": [],
      "issues": [],
      "comments": [],
      "warnings": []
    },
    "commentIssue": 1,
    "evidenceLimitations": [],
    "initials": "W",
    "notes": [
      {
        "id": "source-workspace",
        "title": "个人工作台 · 第一版",
        "text": "当前原型重点",
        "url": "https://github.com/haohongfei2001-png/project-collaboration-workspace/blob/f8280807345d82df1da8b6efec9af7e62968a0c2/docs/personal-v1.md",
        "createdAt": "2026-10-31T18:39:31.347Z"
      }
    ],
    "tasks": []
  },
  {
    "id": "paia-ime",
    "name": "PAIA IME",
    "repo": "haohongfei2001-png/paia-ime",
    "icon": {
      "kind": "initials",
      "text": "拼"
    },
    "iconKind": "fallback-initials",
    "initials": "拼",
    "observedAt": "2026-10-31T18:30:33Z",
    "sourceRef": "main",
    "sourceSha": "b0a7358ea83573cc073cf854d98594f1ea8f917b",
    "planPath": "README.md",
    "trackedPr": null,
    "phase": {
      "label": "离线候选验证",
      "sourceUrl": "https://github.com/haohongfei2001-png/paia-ime/blob/b0a7358ea83573cc073cf854d98594f1ea8f917b/README.md",
      "ref": "b0a7358ea83573cc073cf854d98594f1ea8f917b",
      "key": "validation"
    },
    "currentSummary": "原生候选已集成；尚未作为系统输入法安装验证。",
    "currentWork": "继续资格验证与词库来源准备。",
    "plan": {
      "title": "从离线候选到可安装输入法",
      "sourceUrl": "https://github.com/haohongfei2001-png/paia-ime/blob/b0a7358ea83573cc073cf854d98594f1ea8f917b/README.md",
      "ref": "b0a7358ea83573cc073cf854d98594f1ea8f917b",
      "scopeLabel": "当前资格门槛摘录",
      "completeScope": false,
      "items": [
        {
          "id": "ime-native",
          "title": "原生引擎与候选操作",
          "status": "done",
          "sourceUrl": "https://github.com/haohongfei2001-png/paia-ime/blob/b0a7358ea83573cc073cf854d98594f1ea8f917b/README.md"
        },
        {
          "id": "ime-integration",
          "title": "整合设置、词条和恢复",
          "status": "done",
          "sourceUrl": "https://github.com/haohongfei2001-png/paia-ime/blob/b0a7358ea83573cc073cf854d98594f1ea8f917b/docs/PRODUCT_CANDIDATE.md"
        },
        {
          "id": "ime-vocabulary",
          "title": "生产词库来源与分发资格",
          "status": "blocked",
          "sourceUrl": "https://github.com/haohongfei2001-png/paia-ime/blob/b0a7358ea83573cc073cf854d98594f1ea8f917b/docs/PRODUCTION_DICTIONARY_GATE.md"
        },
        {
          "id": "ime-installed",
          "title": "系统安装与真实应用兼容",
          "status": "todo",
          "sourceUrl": "https://github.com/haohongfei2001-png/paia-ime/blob/b0a7358ea83573cc073cf854d98594f1ea8f917b/README.md"
        }
      ],
      "scopeComplete": false
    },
    "previousPlans": [],
    "rounds": [
      {
        "id": "ime-unicode",
        "title": "加入可选的 Unicode 17 词典比较",
        "date": "2026-10-16T18:28:46Z",
        "headSha": "46bf3e6e146b4781e9ce451e1e3916e77cce66e4",
        "status": "merged",
        "done": [
          "加入独立开启的词典比较实验"
        ],
        "failed": [],
        "next": [
          "不把研究实验当作生产词库资格"
        ],
        "sources": [
          {
            "label": "PR #24",
            "url": "https://github.com/haohongfei2001-png/paia-ime/pull/24"
          }
        ]
      },
      {
        "id": "ime-timeout",
        "title": "保留超时退出的失败证据",
        "date": "2026-10-16T16:29:07Z",
        "headSha": "bde1fca5e11399162aa5761f10daf2b79da59868",
        "status": "merged",
        "done": [
          "子进程先退出时仍保留超时失败记录"
        ],
        "failed": [],
        "next": [],
        "sources": [
          {
            "label": "PR #23",
            "url": "https://github.com/haohongfei2001-png/paia-ime/pull/23"
          }
        ]
      },
      {
        "id": "ime-million",
        "title": "完成有界原生回放与资源观测",
        "date": "2026-10-11T02:47:10Z",
        "headSha": "97416025dc42658aeec4c90d49c55b80690771f6",
        "status": "merged",
        "done": [
          "记录原生百万输入操作与资源观察"
        ],
        "failed": [
          "部分延迟长尾仍未解释"
        ],
        "next": [
          "继续真实安装与语言质量验证"
        ],
        "sources": [
          {
            "label": "PR #22",
            "url": "https://github.com/haohongfei2001-png/paia-ime/pull/22"
          }
        ]
      }
    ],
    "attention": [],
    "limitations": [
      "默认候选只有 46 条人工词条；不能声称可以日用。",
      "仓库未发现正式应用图标，使用文字占位。"
    ],
    "headSha": "b0a7358ea83573cc073cf854d98594f1ea8f917b",
    "watching": false,
    "commentIssue": null,
    "evidenceLimitations": [
      "默认候选只有 46 条人工词条；不能声称可以日用。",
      "仓库未发现正式应用图标，使用文字占位。"
    ],
    "snapshot": {
      "repo": "haohongfei2001-png/paia-ime",
      "source": "github-reviewed-snapshot",
      "fetchedAt": "2026-10-31T18:30:33Z",
      "repository": {
        "fullName": "haohongfei2001-png/paia-ime",
        "defaultBranch": "main",
        "url": "https://github.com/haohongfei2001-png/paia-ime",
        "pushedAt": "2026-10-16T18:28:46Z",
        "private": false
      },
      "pullRequests": [
        {
          "number": 24,
          "title": "Add opt-in Unicode 17 dictionary comparison experiment",
          "state": "closed",
          "draft": false,
          "merged": true,
          "headSha": "46bf3e6e146b4781e9ce451e1e3916e77cce66e4",
          "branch": "feature/unicode-dictionary-experiment",
          "base": "main",
          "url": "https://github.com/haohongfei2001-png/paia-ime/pull/24",
          "updatedAt": "2026-10-16T18:51:29Z",
          "mergedAt": "2026-10-16T18:28:46Z"
        },
        {
          "number": 23,
          "title": "Preserve timeout failure evidence when qualification child exits before kill",
          "state": "closed",
          "draft": false,
          "merged": true,
          "headSha": "bde1fca5e11399162aa5761f10daf2b79da59868",
          "branch": "fix/qualification-timeout-exit-race",
          "base": "main",
          "url": "https://github.com/haohongfei2001-png/paia-ime/pull/23",
          "updatedAt": "2026-10-16T16:29:07Z",
          "mergedAt": "2026-10-16T16:29:07Z"
        },
        {
          "number": 22,
          "title": "Qualify native million-event replay and precompiled resource observations",
          "state": "closed",
          "draft": false,
          "merged": true,
          "headSha": "97416025dc42658aeec4c90d49c55b80690771f6",
          "branch": "feature/native-reliability-qualification",
          "base": "main",
          "url": "https://github.com/haohongfei2001-png/paia-ime/pull/22",
          "updatedAt": "2026-10-11T02:47:10Z",
          "mergedAt": "2026-10-11T02:47:10Z"
        },
        {
          "number": 21,
          "title": "Qualify existing-data compatibility with frozen native N → N+1 → N",
          "state": "closed",
          "draft": false,
          "merged": true,
          "headSha": "43f04ecded67cf14f3fe5bcb5761a1b4bd8d7b3a",
          "branch": "feature/release-compatibility",
          "base": "main",
          "url": "https://github.com/haohongfei2001-png/paia-ime/pull/21",
          "updatedAt": "2026-10-11T00:01:59Z",
          "mergedAt": "2026-10-11T00:01:58Z"
        },
        {
          "number": 20,
          "title": "Integrate candidate resource publication and startup recovery",
          "state": "closed",
          "draft": false,
          "merged": true,
          "headSha": "94a83f2cddf34a4af5470237b11e1f4ea2f9f6cd",
          "branch": "feature/candidate-resource-recovery",
          "base": "main",
          "url": "https://github.com/haohongfei2001-png/paia-ime/pull/20",
          "updatedAt": "2026-10-10T22:06:24Z",
          "mergedAt": "2026-10-10T22:05:58Z"
        },
        {
          "number": 19,
          "title": "Integrate authored candidate resources and product data startup",
          "state": "closed",
          "draft": false,
          "merged": true,
          "headSha": "30e867c97de2b02b584900d18f55e5ec06906588",
          "branch": "feature/product-candidate-contract",
          "base": "main",
          "url": "https://github.com/haohongfei2001-png/paia-ime/pull/19",
          "updatedAt": "2026-10-10T20:00:54Z",
          "mergedAt": "2026-10-10T20:00:54Z"
        },
        {
          "number": 18,
          "title": "Consolidate spelling policies, per-app initial modes and system character entry",
          "state": "closed",
          "draft": false,
          "merged": true,
          "headSha": "fe914431d348b40a9abaf30efd443e3e57f28144",
          "branch": "feature/input-habits-contract",
          "base": "main",
          "url": "https://github.com/haohongfei2001-png/paia-ime/pull/18",
          "updatedAt": "2026-10-10T18:32:29Z",
          "mergedAt": "2026-10-10T18:16:07Z"
        },
        {
          "number": 17,
          "title": "Integrate lossless typed Chinese and literal composition through native IMK path",
          "state": "closed",
          "draft": false,
          "merged": true,
          "headSha": "d4f1894ebca6b4a8ef3139b2e0679f88a466d291",
          "branch": "feature/lossless-mixed-input",
          "base": "main",
          "url": "https://github.com/haohongfei2001-png/paia-ime/pull/17",
          "updatedAt": "2026-10-10T17:16:11Z",
          "mergedAt": "2026-10-10T17:03:43Z"
        }
      ],
      "workflowRuns": [
        {
          "id": 38947655382,
          "name": "Batch B3 explicit settings and safe mode recovery",
          "headSha": "b0a7358ea83573cc073cf854d98594f1ea8f917b",
          "workflowId": 380079799,
          "status": "completed",
          "conclusion": "success",
          "url": "https://github.com/haohongfei2001-png/paia-ime/actions/runs/38947655382",
          "createdAt": "2026-10-16T18:28:49Z",
          "updatedAt": "2026-10-16T18:35:34Z"
        },
        {
          "id": 38947655380,
          "name": "Uninstalled IMK client integration",
          "headSha": "b0a7358ea83573cc073cf854d98594f1ea8f917b",
          "workflowId": 380416442,
          "status": "completed",
          "conclusion": "success",
          "url": "https://github.com/haohongfei2001-png/paia-ime/actions/runs/38947655380",
          "createdAt": "2026-10-16T18:28:49Z",
          "updatedAt": "2026-10-16T18:48:14Z"
        },
        {
          "id": 38947655363,
          "name": "Batch B4 visible native candidate navigation",
          "headSha": "b0a7358ea83573cc073cf854d98594f1ea8f917b",
          "workflowId": 380115459,
          "status": "completed",
          "conclusion": "success",
          "url": "https://github.com/haohongfei2001-png/paia-ime/actions/runs/38947655363",
          "createdAt": "2026-10-16T18:28:49Z",
          "updatedAt": "2026-10-16T18:31:45Z"
        },
        {
          "id": 38947655355,
          "name": "Batch B6 fully readable long candidates",
          "headSha": "b0a7358ea83573cc073cf854d98594f1ea8f917b",
          "workflowId": 380154683,
          "status": "completed",
          "conclusion": "success",
          "url": "https://github.com/haohongfei2001-png/paia-ime/actions/runs/38947655355",
          "createdAt": "2026-10-16T18:28:49Z",
          "updatedAt": "2026-10-16T18:37:56Z"
        },
        {
          "id": 38947655336,
          "name": "Batch B5 explicit settings save verification",
          "headSha": "b0a7358ea83573cc073cf854d98594f1ea8f917b",
          "workflowId": 380132218,
          "status": "completed",
          "conclusion": "success",
          "url": "https://github.com/haohongfei2001-png/paia-ime/actions/runs/38947655336",
          "createdAt": "2026-10-16T18:28:49Z",
          "updatedAt": "2026-10-16T18:36:01Z"
        },
        {
          "id": 38947655330,
          "name": "Batch B1 native research controls",
          "headSha": "b0a7358ea83573cc073cf854d98594f1ea8f917b",
          "workflowId": 380000983,
          "status": "completed",
          "conclusion": "success",
          "url": "https://github.com/haohongfei2001-png/paia-ime/actions/runs/38947655330",
          "createdAt": "2026-10-16T18:28:49Z",
          "updatedAt": "2026-10-16T18:35:27Z"
        },
        {
          "id": 38947655307,
          "name": "Batch A1 native engine and synthetic host",
          "headSha": "b0a7358ea83573cc073cf854d98594f1ea8f917b",
          "workflowId": 379942491,
          "status": "completed",
          "conclusion": "success",
          "url": "https://github.com/haohongfei2001-png/paia-ime/actions/runs/38947655307",
          "createdAt": "2026-10-16T18:28:49Z",
          "updatedAt": "2026-10-16T18:31:24Z"
        },
        {
          "id": 38947655298,
          "name": "Batch A2 constrained native research",
          "headSha": "b0a7358ea83573cc073cf854d98594f1ea8f917b",
          "workflowId": 379977985,
          "status": "completed",
          "conclusion": "success",
          "url": "https://github.com/haohongfei2001-png/paia-ime/actions/runs/38947655298",
          "createdAt": "2026-10-16T18:28:49Z",
          "updatedAt": "2026-10-16T18:34:32Z"
        },
        {
          "id": 38947655295,
          "name": "Exact local expression IMK loop",
          "headSha": "b0a7358ea83573cc073cf854d98594f1ea8f917b",
          "workflowId": 380481526,
          "status": "completed",
          "conclusion": "success",
          "url": "https://github.com/haohongfei2001-png/paia-ime/actions/runs/38947655295",
          "createdAt": "2026-10-16T18:28:49Z",
          "updatedAt": "2026-10-16T18:38:08Z"
        },
        {
          "id": 38947655274,
          "name": "Batch B8 lossless keyboard boundary",
          "headSha": "b0a7358ea83573cc073cf854d98594f1ea8f917b",
          "workflowId": 380197960,
          "status": "completed",
          "conclusion": "success",
          "url": "https://github.com/haohongfei2001-png/paia-ime/actions/runs/38947655274",
          "createdAt": "2026-10-16T18:28:49Z",
          "updatedAt": "2026-10-16T18:37:31Z"
        },
        {
          "id": 38947655262,
          "name": "Batch B2 explicit personal lexicon",
          "headSha": "b0a7358ea83573cc073cf854d98594f1ea8f917b",
          "workflowId": 380032379,
          "status": "completed",
          "conclusion": "success",
          "url": "https://github.com/haohongfei2001-png/paia-ime/actions/runs/38947655262",
          "createdAt": "2026-10-16T18:28:49Z",
          "updatedAt": "2026-10-16T18:33:37Z"
        },
        {
          "id": 38947655260,
          "name": "Batch B7 explicit Unicode character entry",
          "headSha": "b0a7358ea83573cc073cf854d98594f1ea8f917b",
          "workflowId": 380179178,
          "status": "completed",
          "conclusion": "success",
          "url": "https://github.com/haohongfei2001-png/paia-ime/actions/runs/38947655260",
          "createdAt": "2026-10-16T18:28:49Z",
          "updatedAt": "2026-10-16T18:38:23Z"
        }
      ],
      "commits": [],
      "issues": [],
      "comments": [],
      "warnings": [],
      "coverage": {
        "recentPulls": 8,
        "recentRuns": 12,
        "allHistory": false,
        "reviewedSource": true
      }
    },
    "workflows": [
      {
        "id": 38947655382,
        "name": "Batch B3 explicit settings and safe mode recovery",
        "headSha": "b0a7358ea83573cc073cf854d98594f1ea8f917b",
        "workflowId": 380079799,
        "status": "completed",
        "conclusion": "success",
        "url": "https://github.com/haohongfei2001-png/paia-ime/actions/runs/38947655382",
        "createdAt": "2026-10-16T18:28:49Z",
        "updatedAt": "2026-10-16T18:35:34Z"
      },
      {
        "id": 38947655380,
        "name": "Uninstalled IMK client integration",
        "headSha": "b0a7358ea83573cc073cf854d98594f1ea8f917b",
        "workflowId": 380416442,
        "status": "completed",
        "conclusion": "success",
        "url": "https://github.com/haohongfei2001-png/paia-ime/actions/runs/38947655380",
        "createdAt": "2026-10-16T18:28:49Z",
        "updatedAt": "2026-10-16T18:48:14Z"
      },
      {
        "id": 38947655363,
        "name": "Batch B4 visible native candidate navigation",
        "headSha": "b0a7358ea83573cc073cf854d98594f1ea8f917b",
        "workflowId": 380115459,
        "status": "completed",
        "conclusion": "success",
        "url": "https://github.com/haohongfei2001-png/paia-ime/actions/runs/38947655363",
        "createdAt": "2026-10-16T18:28:49Z",
        "updatedAt": "2026-10-16T18:31:45Z"
      },
      {
        "id": 38947655355,
        "name": "Batch B6 fully readable long candidates",
        "headSha": "b0a7358ea83573cc073cf854d98594f1ea8f917b",
        "workflowId": 380154683,
        "status": "completed",
        "conclusion": "success",
        "url": "https://github.com/haohongfei2001-png/paia-ime/actions/runs/38947655355",
        "createdAt": "2026-10-16T18:28:49Z",
        "updatedAt": "2026-10-16T18:37:56Z"
      },
      {
        "id": 38947655336,
        "name": "Batch B5 explicit settings save verification",
        "headSha": "b0a7358ea83573cc073cf854d98594f1ea8f917b",
        "workflowId": 380132218,
        "status": "completed",
        "conclusion": "success",
        "url": "https://github.com/haohongfei2001-png/paia-ime/actions/runs/38947655336",
        "createdAt": "2026-10-16T18:28:49Z",
        "updatedAt": "2026-10-16T18:36:01Z"
      },
      {
        "id": 38947655330,
        "name": "Batch B1 native research controls",
        "headSha": "b0a7358ea83573cc073cf854d98594f1ea8f917b",
        "workflowId": 380000983,
        "status": "completed",
        "conclusion": "success",
        "url": "https://github.com/haohongfei2001-png/paia-ime/actions/runs/38947655330",
        "createdAt": "2026-10-16T18:28:49Z",
        "updatedAt": "2026-10-16T18:35:27Z"
      },
      {
        "id": 38947655307,
        "name": "Batch A1 native engine and synthetic host",
        "headSha": "b0a7358ea83573cc073cf854d98594f1ea8f917b",
        "workflowId": 379942491,
        "status": "completed",
        "conclusion": "success",
        "url": "https://github.com/haohongfei2001-png/paia-ime/actions/runs/38947655307",
        "createdAt": "2026-10-16T18:28:49Z",
        "updatedAt": "2026-10-16T18:31:24Z"
      },
      {
        "id": 38947655298,
        "name": "Batch A2 constrained native research",
        "headSha": "b0a7358ea83573cc073cf854d98594f1ea8f917b",
        "workflowId": 379977985,
        "status": "completed",
        "conclusion": "success",
        "url": "https://github.com/haohongfei2001-png/paia-ime/actions/runs/38947655298",
        "createdAt": "2026-10-16T18:28:49Z",
        "updatedAt": "2026-10-16T18:34:32Z"
      },
      {
        "id": 38947655295,
        "name": "Exact local expression IMK loop",
        "headSha": "b0a7358ea83573cc073cf854d98594f1ea8f917b",
        "workflowId": 380481526,
        "status": "completed",
        "conclusion": "success",
        "url": "https://github.com/haohongfei2001-png/paia-ime/actions/runs/38947655295",
        "createdAt": "2026-10-16T18:28:49Z",
        "updatedAt": "2026-10-16T18:38:08Z"
      },
      {
        "id": 38947655274,
        "name": "Batch B8 lossless keyboard boundary",
        "headSha": "b0a7358ea83573cc073cf854d98594f1ea8f917b",
        "workflowId": 380197960,
        "status": "completed",
        "conclusion": "success",
        "url": "https://github.com/haohongfei2001-png/paia-ime/actions/runs/38947655274",
        "createdAt": "2026-10-16T18:28:49Z",
        "updatedAt": "2026-10-16T18:37:31Z"
      },
      {
        "id": 38947655262,
        "name": "Batch B2 explicit personal lexicon",
        "headSha": "b0a7358ea83573cc073cf854d98594f1ea8f917b",
        "workflowId": 380032379,
        "status": "completed",
        "conclusion": "success",
        "url": "https://github.com/haohongfei2001-png/paia-ime/actions/runs/38947655262",
        "createdAt": "2026-10-16T18:28:49Z",
        "updatedAt": "2026-10-16T18:33:37Z"
      },
      {
        "id": 38947655260,
        "name": "Batch B7 explicit Unicode character entry",
        "headSha": "b0a7358ea83573cc073cf854d98594f1ea8f917b",
        "workflowId": 380179178,
        "status": "completed",
        "conclusion": "success",
        "url": "https://github.com/haohongfei2001-png/paia-ime/actions/runs/38947655260",
        "createdAt": "2026-10-16T18:28:49Z",
        "updatedAt": "2026-10-16T18:38:23Z"
      }
    ],
    "current": {
      "headline": "原生候选已集成；尚未作为系统输入法安装验证。",
      "done": [
        "加入独立开启的词典比较实验"
      ],
      "blocked": [],
      "next": "继续资格验证与词库来源准备。",
      "sources": [
        {
          "label": "PR #24",
          "url": "https://github.com/haohongfei2001-png/paia-ime/pull/24"
        }
      ]
    },
    "notes": [
      {
        "id": "source-paia-ime",
        "title": "从离线候选到可安装输入法",
        "text": "当前资格门槛摘录",
        "url": "https://github.com/haohongfei2001-png/paia-ime/blob/b0a7358ea83573cc073cf854d98594f1ea8f917b/README.md",
        "createdAt": "2026-10-31T18:30:33Z"
      }
    ],
    "tasks": []
  },
  {
    "id": "hcl-assistant",
    "name": "HCL Assistant",
    "repo": "haohongfei2001-png/hcl-assistant",
    "icon": {
      "kind": "initials",
      "text": "H"
    },
    "iconKind": "fallback-initials",
    "initials": "H",
    "observedAt": "2026-10-31T18:30:33Z",
    "sourceRef": "main",
    "sourceSha": "3e8ad86cacefe51310fd519b2c1c2c803c1fd61e",
    "planPath": "DEVELOPMENT_PLAN.md",
    "trackedPr": null,
    "phase": {
      "label": "会员链路开发",
      "sourceUrl": "https://github.com/haohongfei2001-png/hcl-assistant/blob/3e8ad86cacefe51310fd519b2c1c2c803c1fd61e/DEVELOPMENT_PLAN.md",
      "ref": "3e8ad86cacefe51310fd519b2c1c2c803c1fd61e",
      "key": "development"
    },
    "currentSummary": "账号与会员基础已合入；真实商户适配仍待完成。",
    "currentWork": "M3-01 会员、支付和完整商业验收。",
    "plan": {
      "title": "Assistant-first · 当前开发计划",
      "sourceUrl": "https://github.com/haohongfei2001-png/hcl-assistant/blob/3e8ad86cacefe51310fd519b2c1c2c803c1fd61e/DEVELOPMENT_PLAN.md",
      "ref": "3e8ad86cacefe51310fd519b2c1c2c803c1fd61e",
      "scopeLabel": "当前 11 个工程包",
      "completeScope": true,
      "items": [
        {
          "id": "P0-01",
          "title": "预览契约与开发队列统一",
          "status": "done",
          "sourceUrl": "https://github.com/haohongfei2001-png/hcl-assistant/blob/3e8ad86cacefe51310fd519b2c1c2c803c1fd61e/DEVELOPMENT_PLAN.md"
        },
        {
          "id": "P1-01",
          "title": "首页与聊天界面",
          "status": "done",
          "sourceUrl": "https://github.com/haohongfei2001-png/hcl-assistant/blob/3e8ad86cacefe51310fd519b2c1c2c803c1fd61e/DEVELOPMENT_PLAN.md"
        },
        {
          "id": "P1-02",
          "title": "更正、依据与历史",
          "status": "done",
          "sourceUrl": "https://github.com/haohongfei2001-png/hcl-assistant/blob/3e8ad86cacefe51310fd519b2c1c2c803c1fd61e/DEVELOPMENT_PLAN.md"
        },
        {
          "id": "D1-01",
          "title": "开发态模型对话",
          "status": "done",
          "sourceUrl": "https://github.com/haohongfei2001-png/hcl-assistant/blob/3e8ad86cacefe51310fd519b2c1c2c803c1fd61e/DEVELOPMENT_PLAN.md"
        },
        {
          "id": "P1-03",
          "title": "检查器与设置",
          "status": "done",
          "sourceUrl": "https://github.com/haohongfei2001-png/hcl-assistant/blob/3e8ad86cacefe51310fd519b2c1c2c803c1fd61e/DEVELOPMENT_PLAN.md"
        },
        {
          "id": "C1-01",
          "title": "隔离托管工程",
          "status": "done",
          "sourceUrl": "https://github.com/haohongfei2001-png/hcl-assistant/blob/3e8ad86cacefe51310fd519b2c1c2c803c1fd61e/DEVELOPMENT_PLAN.md"
        },
        {
          "id": "U1-01",
          "title": "聊天交互优化",
          "status": "done",
          "sourceUrl": "https://github.com/haohongfei2001-png/hcl-assistant/blob/3e8ad86cacefe51310fd519b2c1c2c803c1fd61e/DEVELOPMENT_PLAN.md"
        },
        {
          "id": "M1-01",
          "title": "普通账号与隔离",
          "status": "done",
          "sourceUrl": "https://github.com/haohongfei2001-png/hcl-assistant/blob/3e8ad86cacefe51310fd519b2c1c2c803c1fd61e/DEVELOPMENT_PLAN.md"
        },
        {
          "id": "U2-01",
          "title": "账号入口与首次聊天",
          "status": "done",
          "sourceUrl": "https://github.com/haohongfei2001-png/hcl-assistant/blob/3e8ad86cacefe51310fd519b2c1c2c803c1fd61e/DEVELOPMENT_PLAN.md"
        },
        {
          "id": "M2-01",
          "title": "密码找回与登录撤销",
          "status": "done",
          "sourceUrl": "https://github.com/haohongfei2001-png/hcl-assistant/blob/3e8ad86cacefe51310fd519b2c1c2c803c1fd61e/DEVELOPMENT_PLAN.md"
        },
        {
          "id": "M3-01",
          "title": "会员、商户适配与商业验收",
          "status": "active",
          "sourceUrl": "https://github.com/haohongfei2001-png/hcl-assistant/blob/3e8ad86cacefe51310fd519b2c1c2c803c1fd61e/DEVELOPMENT_PLAN.md"
        }
      ],
      "scopeComplete": false
    },
    "previousPlans": [
      {
        "title": "L0–L2.5 原型与受限开发桥接",
        "status": "historical",
        "sourceUrl": "https://github.com/haohongfei2001-png/hcl-assistant/blob/3e8ad86cacefe51310fd519b2c1c2c803c1fd61e/DEVELOPMENT_PLAN.md",
        "summary": "历史阶段已完成，当前产品任务由 Assistant-first 队列管理。",
        "items": []
      }
    ],
    "rounds": [
      {
        "id": "hcl-upstream",
        "title": "上游运行时同步检查失败",
        "date": "2026-10-31T17:47:06Z",
        "headSha": "3e8ad86cacefe51310fd519b2c1c2c803c1fd61e",
        "status": "failed",
        "done": [],
        "failed": [
          "最近一次上游同步 Actions 失败；未据此判断整个产品不可用"
        ],
        "next": [
          "打开失败运行检查具体原因"
        ],
        "sources": [
          {
            "label": "最新同步运行",
            "url": "https://github.com/haohongfei2001-png/hcl-assistant/actions/runs/41226195405"
          }
        ]
      },
      {
        "id": "hcl-expired",
        "title": "过期账号保持只读直到核验恢复",
        "date": "2026-10-16T16:48:28Z",
        "headSha": "faea18d22d5b1d8af4c1a7f38e9668b61ebf5fde",
        "status": "merged",
        "done": [
          "保留会话、历史与草稿",
          "过期状态在核验恢复前禁止新发送"
        ],
        "failed": [],
        "next": [],
        "sources": [
          {
            "label": "PR #61",
            "url": "https://github.com/haohongfei2001-png/hcl-assistant/pull/61"
          }
        ]
      },
      {
        "id": "hcl-history",
        "title": "核对刷新与重新登录后的历史",
        "date": "2026-10-07T11:02:27Z",
        "headSha": "eeb63e9d3800f87b53b76a9566e807d292c26796",
        "status": "merged",
        "done": [
          "验证普通账号历史恢复"
        ],
        "failed": [],
        "next": [],
        "sources": [
          {
            "label": "PR #59",
            "url": "https://github.com/haohongfei2001-png/hcl-assistant/pull/59"
          }
        ]
      }
    ],
    "attention": [
      {
        "id": "hcl-upstream-failure",
        "title": "上游同步检查失败",
        "kind": "blocked",
        "sourceUrl": "https://github.com/haohongfei2001-png/hcl-assistant/actions/runs/41226195405",
        "ref": "3e8ad86cacefe51310fd519b2c1c2c803c1fd61e",
        "reason": "这是上游同步任务的失败信号，不等同于应用运行失败。",
        "confidence": "exact-run",
        "detail": "这是上游同步任务的失败信号，不等同于应用运行失败。",
        "at": "2026-10-31T18:30:33Z"
      }
    ],
    "limitations": [
      "10/11 表示登记的工程包完成数，不是生产、模型质量或商业验收 91%。",
      "仓库未发现正式应用图标，使用文字占位。"
    ],
    "headSha": "3e8ad86cacefe51310fd519b2c1c2c803c1fd61e",
    "watching": false,
    "commentIssue": null,
    "evidenceLimitations": [
      "10/11 表示登记的工程包完成数，不是生产、模型质量或商业验收 91%。",
      "仓库未发现正式应用图标，使用文字占位。"
    ],
    "snapshot": {
      "repo": "haohongfei2001-png/hcl-assistant",
      "source": "github-reviewed-snapshot",
      "fetchedAt": "2026-10-31T18:30:33Z",
      "repository": {
        "fullName": "haohongfei2001-png/hcl-assistant",
        "defaultBranch": "main",
        "url": "https://github.com/haohongfei2001-png/hcl-assistant",
        "pushedAt": "2026-10-16T16:48:28Z",
        "private": false
      },
      "pullRequests": [
        {
          "number": 61,
          "title": "Keep late expired account sessions read-only until verified recovery",
          "state": "closed",
          "draft": false,
          "merged": true,
          "headSha": "faea18d22d5b1d8af4c1a7f38e9668b61ebf5fde",
          "branch": "product/consumer-continuation-20261016",
          "base": "main",
          "url": "https://github.com/haohongfei2001-png/hcl-assistant/pull/61",
          "updatedAt": "2026-10-16T16:48:29Z",
          "mergedAt": "2026-10-16T16:48:28Z"
        },
        {
          "number": 60,
          "title": "test: stabilize membership expiry and concurrent history alerts",
          "state": "closed",
          "draft": false,
          "merged": true,
          "headSha": "d8af4c40ac28a1aea7547f0e33cab271eea970d5",
          "branch": "product/membership-expiry-alert-regression",
          "base": "main",
          "url": "https://github.com/haohongfei2001-png/hcl-assistant/pull/60",
          "updatedAt": "2026-10-09T09:06:47Z",
          "mergedAt": "2026-10-09T08:56:22Z"
        },
        {
          "number": 59,
          "title": "Verify ordinary account history after reload and re-login",
          "state": "closed",
          "draft": false,
          "merged": true,
          "headSha": "eeb63e9d3800f87b53b76a9566e807d292c26796",
          "branch": "product/ordinary-history-durability",
          "base": "main",
          "url": "https://github.com/haohongfei2001-png/hcl-assistant/pull/59",
          "updatedAt": "2026-10-07T11:17:09Z",
          "mergedAt": "2026-10-07T11:02:27Z"
        },
        {
          "number": 58,
          "title": "Reconcile HCLA delivery status and remaining consumer work",
          "state": "closed",
          "draft": false,
          "merged": true,
          "headSha": "a23362aedd579823c22d877c857e5285be27c9dc",
          "branch": "product/delivery-status-closeout",
          "base": "main",
          "url": "https://github.com/haohongfei2001-png/hcl-assistant/pull/58",
          "updatedAt": "2026-10-07T04:34:41Z",
          "mergedAt": "2026-10-07T04:34:41Z"
        },
        {
          "number": 57,
          "title": "Make offline diagnostic timeout metadata tests deterministic",
          "state": "closed",
          "draft": false,
          "merged": true,
          "headSha": "3138af5702ca0e56270436cee683c35ea5ec675e",
          "branch": "product/deterministic-diagnostics",
          "base": "main",
          "url": "https://github.com/haohongfei2001-png/hcl-assistant/pull/57",
          "updatedAt": "2026-10-06T21:10:29Z",
          "mergedAt": "2026-10-06T21:10:29Z"
        },
        {
          "number": 56,
          "title": "Apply the accepted clear-glass style across HCLA",
          "state": "closed",
          "draft": false,
          "merged": true,
          "headSha": "b03ef2fc358e23ca228d55ee270afe69f0c44063",
          "branch": "product/glass-home-preview",
          "base": "main",
          "url": "https://github.com/haohongfei2001-png/hcl-assistant/pull/56",
          "updatedAt": "2026-10-06T20:33:32Z",
          "mergedAt": "2026-10-06T20:33:31Z"
        },
        {
          "number": 55,
          "title": "style: unify HCLA with the requested minimal consumer design",
          "state": "open",
          "draft": true,
          "merged": false,
          "headSha": "8f5e0a5630de9be65d016f025e62f6822bee7c1d",
          "branch": "product/consumer-visual-refresh",
          "base": "main",
          "url": "https://github.com/haohongfei2001-png/hcl-assistant/pull/55",
          "updatedAt": "2026-10-06T18:00:48Z",
          "mergedAt": null
        },
        {
          "number": 54,
          "title": "fix: clear stale payment feedback when orders refresh",
          "state": "closed",
          "draft": false,
          "merged": true,
          "headSha": "4753356680ca49900c67f3bbd5995a42420e1fd8",
          "branch": "product/order-feedback-refresh",
          "base": "main",
          "url": "https://github.com/haohongfei2001-png/hcl-assistant/pull/54",
          "updatedAt": "2026-10-06T03:27:23Z",
          "mergedAt": "2026-10-06T03:27:23Z"
        }
      ],
      "workflowRuns": [
        {
          "id": 41226195405,
          "name": "Upstream HCL Runtime Sync",
          "headSha": "3e8ad86cacefe51310fd519b2c1c2c803c1fd61e",
          "workflowId": 371565331,
          "status": "completed",
          "conclusion": "failure",
          "url": "https://github.com/haohongfei2001-png/hcl-assistant/actions/runs/41226195405",
          "createdAt": "2026-10-31T17:47:06Z",
          "updatedAt": "2026-10-31T17:47:23Z"
        },
        {
          "id": 41202134903,
          "name": "Upstream HCL Runtime Sync",
          "headSha": "3e8ad86cacefe51310fd519b2c1c2c803c1fd61e",
          "workflowId": 371565331,
          "status": "completed",
          "conclusion": "success",
          "url": "https://github.com/haohongfei2001-png/hcl-assistant/actions/runs/41202134903",
          "createdAt": "2026-10-31T12:40:14Z",
          "updatedAt": "2026-10-31T12:47:46Z"
        },
        {
          "id": 41174235683,
          "name": "Upstream HCL Runtime Sync",
          "headSha": "3e8ad86cacefe51310fd519b2c1c2c803c1fd61e",
          "workflowId": 371565331,
          "status": "completed",
          "conclusion": "success",
          "url": "https://github.com/haohongfei2001-png/hcl-assistant/actions/runs/41174235683",
          "createdAt": "2026-10-31T05:51:28Z",
          "updatedAt": "2026-10-31T05:57:55Z"
        },
        {
          "id": 41146921780,
          "name": "Upstream HCL Runtime Sync",
          "headSha": "3e8ad86cacefe51310fd519b2c1c2c803c1fd61e",
          "workflowId": 371565331,
          "status": "completed",
          "conclusion": "success",
          "url": "https://github.com/haohongfei2001-png/hcl-assistant/actions/runs/41146921780",
          "createdAt": "2026-10-30T23:51:32Z",
          "updatedAt": "2026-10-30T23:58:54Z"
        },
        {
          "id": 41115663782,
          "name": "Upstream HCL Runtime Sync",
          "headSha": "3e8ad86cacefe51310fd519b2c1c2c803c1fd61e",
          "workflowId": 371565331,
          "status": "completed",
          "conclusion": "success",
          "url": "https://github.com/haohongfei2001-png/hcl-assistant/actions/runs/41115663782",
          "createdAt": "2026-10-30T19:29:28Z",
          "updatedAt": "2026-10-30T19:37:16Z"
        },
        {
          "id": 41070448091,
          "name": "Upstream HCL Runtime Sync",
          "headSha": "3e8ad86cacefe51310fd519b2c1c2c803c1fd61e",
          "workflowId": 371565331,
          "status": "completed",
          "conclusion": "success",
          "url": "https://github.com/haohongfei2001-png/hcl-assistant/actions/runs/41070448091",
          "createdAt": "2026-10-30T14:16:41Z",
          "updatedAt": "2026-10-30T14:24:32Z"
        },
        {
          "id": 41018727540,
          "name": "Upstream HCL Runtime Sync",
          "headSha": "3e8ad86cacefe51310fd519b2c1c2c803c1fd61e",
          "workflowId": 371565331,
          "status": "completed",
          "conclusion": "success",
          "url": "https://github.com/haohongfei2001-png/hcl-assistant/actions/runs/41018727540",
          "createdAt": "2026-10-30T07:13:08Z",
          "updatedAt": "2026-10-30T07:19:48Z"
        },
        {
          "id": 40983730773,
          "name": "Upstream HCL Runtime Sync",
          "headSha": "3e8ad86cacefe51310fd519b2c1c2c803c1fd61e",
          "workflowId": 371565331,
          "status": "completed",
          "conclusion": "success",
          "url": "https://github.com/haohongfei2001-png/hcl-assistant/actions/runs/40983730773",
          "createdAt": "2026-10-30T01:05:32Z",
          "updatedAt": "2026-10-30T01:13:25Z"
        },
        {
          "id": 40955689596,
          "name": "Upstream HCL Runtime Sync",
          "headSha": "3e8ad86cacefe51310fd519b2c1c2c803c1fd61e",
          "workflowId": 371565331,
          "status": "completed",
          "conclusion": "success",
          "url": "https://github.com/haohongfei2001-png/hcl-assistant/actions/runs/40955689596",
          "createdAt": "2026-10-29T21:11:51Z",
          "updatedAt": "2026-10-29T21:19:47Z"
        },
        {
          "id": 40909275874,
          "name": "Upstream HCL Runtime Sync",
          "headSha": "3e8ad86cacefe51310fd519b2c1c2c803c1fd61e",
          "workflowId": 371565331,
          "status": "completed",
          "conclusion": "success",
          "url": "https://github.com/haohongfei2001-png/hcl-assistant/actions/runs/40909275874",
          "createdAt": "2026-10-29T16:12:30Z",
          "updatedAt": "2026-10-29T16:20:23Z"
        },
        {
          "id": 40843165754,
          "name": "Upstream HCL Runtime Sync",
          "headSha": "3e8ad86cacefe51310fd519b2c1c2c803c1fd61e",
          "workflowId": 371565331,
          "status": "completed",
          "conclusion": "success",
          "url": "https://github.com/haohongfei2001-png/hcl-assistant/actions/runs/40843165754",
          "createdAt": "2026-10-29T08:34:55Z",
          "updatedAt": "2026-10-29T08:42:44Z"
        },
        {
          "id": 40802865106,
          "name": "Upstream HCL Runtime Sync",
          "headSha": "3e8ad86cacefe51310fd519b2c1c2c803c1fd61e",
          "workflowId": 371565331,
          "status": "completed",
          "conclusion": "success",
          "url": "https://github.com/haohongfei2001-png/hcl-assistant/actions/runs/40802865106",
          "createdAt": "2026-10-29T01:50:55Z",
          "updatedAt": "2026-10-29T01:57:41Z"
        }
      ],
      "commits": [],
      "issues": [],
      "comments": [],
      "warnings": [],
      "coverage": {
        "recentPulls": 8,
        "recentRuns": 12,
        "allHistory": false,
        "reviewedSource": true
      }
    },
    "workflows": [
      {
        "id": 41226195405,
        "name": "Upstream HCL Runtime Sync",
        "headSha": "3e8ad86cacefe51310fd519b2c1c2c803c1fd61e",
        "workflowId": 371565331,
        "status": "completed",
        "conclusion": "failure",
        "url": "https://github.com/haohongfei2001-png/hcl-assistant/actions/runs/41226195405",
        "createdAt": "2026-10-31T17:47:06Z",
        "updatedAt": "2026-10-31T17:47:23Z"
      },
      {
        "id": 41202134903,
        "name": "Upstream HCL Runtime Sync",
        "headSha": "3e8ad86cacefe51310fd519b2c1c2c803c1fd61e",
        "workflowId": 371565331,
        "status": "completed",
        "conclusion": "success",
        "url": "https://github.com/haohongfei2001-png/hcl-assistant/actions/runs/41202134903",
        "createdAt": "2026-10-31T12:40:14Z",
        "updatedAt": "2026-10-31T12:47:46Z"
      },
      {
        "id": 41174235683,
        "name": "Upstream HCL Runtime Sync",
        "headSha": "3e8ad86cacefe51310fd519b2c1c2c803c1fd61e",
        "workflowId": 371565331,
        "status": "completed",
        "conclusion": "success",
        "url": "https://github.com/haohongfei2001-png/hcl-assistant/actions/runs/41174235683",
        "createdAt": "2026-10-31T05:51:28Z",
        "updatedAt": "2026-10-31T05:57:55Z"
      },
      {
        "id": 41146921780,
        "name": "Upstream HCL Runtime Sync",
        "headSha": "3e8ad86cacefe51310fd519b2c1c2c803c1fd61e",
        "workflowId": 371565331,
        "status": "completed",
        "conclusion": "success",
        "url": "https://github.com/haohongfei2001-png/hcl-assistant/actions/runs/41146921780",
        "createdAt": "2026-10-30T23:51:32Z",
        "updatedAt": "2026-10-30T23:58:54Z"
      },
      {
        "id": 41115663782,
        "name": "Upstream HCL Runtime Sync",
        "headSha": "3e8ad86cacefe51310fd519b2c1c2c803c1fd61e",
        "workflowId": 371565331,
        "status": "completed",
        "conclusion": "success",
        "url": "https://github.com/haohongfei2001-png/hcl-assistant/actions/runs/41115663782",
        "createdAt": "2026-10-30T19:29:28Z",
        "updatedAt": "2026-10-30T19:37:16Z"
      },
      {
        "id": 41070448091,
        "name": "Upstream HCL Runtime Sync",
        "headSha": "3e8ad86cacefe51310fd519b2c1c2c803c1fd61e",
        "workflowId": 371565331,
        "status": "completed",
        "conclusion": "success",
        "url": "https://github.com/haohongfei2001-png/hcl-assistant/actions/runs/41070448091",
        "createdAt": "2026-10-30T14:16:41Z",
        "updatedAt": "2026-10-30T14:24:32Z"
      },
      {
        "id": 41018727540,
        "name": "Upstream HCL Runtime Sync",
        "headSha": "3e8ad86cacefe51310fd519b2c1c2c803c1fd61e",
        "workflowId": 371565331,
        "status": "completed",
        "conclusion": "success",
        "url": "https://github.com/haohongfei2001-png/hcl-assistant/actions/runs/41018727540",
        "createdAt": "2026-10-30T07:13:08Z",
        "updatedAt": "2026-10-30T07:19:48Z"
      },
      {
        "id": 40983730773,
        "name": "Upstream HCL Runtime Sync",
        "headSha": "3e8ad86cacefe51310fd519b2c1c2c803c1fd61e",
        "workflowId": 371565331,
        "status": "completed",
        "conclusion": "success",
        "url": "https://github.com/haohongfei2001-png/hcl-assistant/actions/runs/40983730773",
        "createdAt": "2026-10-30T01:05:32Z",
        "updatedAt": "2026-10-30T01:13:25Z"
      },
      {
        "id": 40955689596,
        "name": "Upstream HCL Runtime Sync",
        "headSha": "3e8ad86cacefe51310fd519b2c1c2c803c1fd61e",
        "workflowId": 371565331,
        "status": "completed",
        "conclusion": "success",
        "url": "https://github.com/haohongfei2001-png/hcl-assistant/actions/runs/40955689596",
        "createdAt": "2026-10-29T21:11:51Z",
        "updatedAt": "2026-10-29T21:19:47Z"
      },
      {
        "id": 40909275874,
        "name": "Upstream HCL Runtime Sync",
        "headSha": "3e8ad86cacefe51310fd519b2c1c2c803c1fd61e",
        "workflowId": 371565331,
        "status": "completed",
        "conclusion": "success",
        "url": "https://github.com/haohongfei2001-png/hcl-assistant/actions/runs/40909275874",
        "createdAt": "2026-10-29T16:12:30Z",
        "updatedAt": "2026-10-29T16:20:23Z"
      },
      {
        "id": 40843165754,
        "name": "Upstream HCL Runtime Sync",
        "headSha": "3e8ad86cacefe51310fd519b2c1c2c803c1fd61e",
        "workflowId": 371565331,
        "status": "completed",
        "conclusion": "success",
        "url": "https://github.com/haohongfei2001-png/hcl-assistant/actions/runs/40843165754",
        "createdAt": "2026-10-29T08:34:55Z",
        "updatedAt": "2026-10-29T08:42:44Z"
      },
      {
        "id": 40802865106,
        "name": "Upstream HCL Runtime Sync",
        "headSha": "3e8ad86cacefe51310fd519b2c1c2c803c1fd61e",
        "workflowId": 371565331,
        "status": "completed",
        "conclusion": "success",
        "url": "https://github.com/haohongfei2001-png/hcl-assistant/actions/runs/40802865106",
        "createdAt": "2026-10-29T01:50:55Z",
        "updatedAt": "2026-10-29T01:57:41Z"
      }
    ],
    "current": {
      "headline": "账号与会员基础已合入；真实商户适配仍待完成。",
      "done": [],
      "blocked": [
        "最近一次上游同步 Actions 失败；未据此判断整个产品不可用"
      ],
      "next": "M3-01 会员、支付和完整商业验收。",
      "sources": [
        {
          "label": "最新同步运行",
          "url": "https://github.com/haohongfei2001-png/hcl-assistant/actions/runs/41226195405"
        }
      ]
    },
    "notes": [
      {
        "id": "source-hcl-assistant",
        "title": "Assistant-first · 当前开发计划",
        "text": "当前 11 个工程包",
        "url": "https://github.com/haohongfei2001-png/hcl-assistant/blob/3e8ad86cacefe51310fd519b2c1c2c803c1fd61e/DEVELOPMENT_PLAN.md",
        "createdAt": "2026-10-31T18:30:33Z"
      }
    ],
    "tasks": []
  },
  {
    "id": "semantic-lab",
    "name": "Semantic Lab",
    "repo": "haohongfei2001-png/paia-semantic-lab",
    "icon": {
      "kind": "initials",
      "text": "S"
    },
    "iconKind": "fallback-initials",
    "initials": "S",
    "observedAt": "2026-10-31T18:30:33Z",
    "sourceRef": "main",
    "sourceSha": "7d80f2fd7833fed37853c30917b88dc69ae115ed",
    "planPath": "status/ZERO_MODEL_REFOUNDATION_STATUS.json",
    "trackedPr": null,
    "phase": {
      "label": "研究准备",
      "sourceUrl": "https://github.com/haohongfei2001-png/paia-semantic-lab/blob/7d80f2fd7833fed37853c30917b88dc69ae115ed/status/ZERO_MODEL_REFOUNDATION_STATUS.json",
      "ref": "7d80f2fd7833fed37853c30917b88dc69ae115ed",
      "key": "research"
    },
    "currentSummary": "独立评估条件尚未具备，研究能力仍未验证。",
    "currentWork": "等待真实独立角色、数据与隔离运行条件的证据。",
    "plan": {
      "title": "ZMR · 最小研究轮准备",
      "sourceUrl": "https://github.com/haohongfei2001-png/paia-semantic-lab/blob/7d80f2fd7833fed37853c30917b88dc69ae115ed/docs/zero-model-refoundation-v1/DEVELOPMENT_PLAN.md",
      "ref": "7d80f2fd7833fed37853c30917b88dc69ae115ed",
      "scopeLabel": "当前获准准备范围",
      "completeScope": false,
      "items": [
        {
          "id": "lab-protocol",
          "title": "协议与工程基础登记",
          "status": "done",
          "sourceUrl": "https://github.com/haohongfei2001-png/paia-semantic-lab/blob/7d80f2fd7833fed37853c30917b88dc69ae115ed/status/ZERO_MODEL_REFOUNDATION_STATUS.json"
        },
        {
          "id": "lab-independent",
          "title": "独立人员、数据与隔离条件",
          "status": "blocked",
          "sourceUrl": "https://github.com/haohongfei2001-png/paia-semantic-lab/blob/7d80f2fd7833fed37853c30917b88dc69ae115ed/status/ZERO_MODEL_REFOUNDATION_STATUS.json"
        },
        {
          "id": "lab-admission",
          "title": "数据资格与候选冻结",
          "status": "todo",
          "sourceUrl": "https://github.com/haohongfei2001-png/paia-semantic-lab/blob/7d80f2fd7833fed37853c30917b88dc69ae115ed/docs/zero-model-refoundation-v1/DEVELOPMENT_PLAN.md"
        },
        {
          "id": "lab-test",
          "title": "独立评估执行",
          "status": "todo",
          "sourceUrl": "https://github.com/haohongfei2001-png/paia-semantic-lab/blob/7d80f2fd7833fed37853c30917b88dc69ae115ed/docs/zero-model-refoundation-v1/DEVELOPMENT_PLAN.md"
        }
      ],
      "scopeComplete": false
    },
    "previousPlans": [
      {
        "title": "CIG-v1 研究路线",
        "status": "failed",
        "sourceUrl": "https://github.com/haohongfei2001-png/paia-semantic-lab/blob/7d80f2fd7833fed37853c30917b88dc69ae115ed/README.md",
        "summary": "独立盲测未达既定门槛，已按失败关闭；没有把工程通过改写成能力通过。",
        "items": []
      }
    ],
    "rounds": [
      {
        "id": "lab-ci",
        "title": "当前主分支一项检查失败",
        "date": "2026-10-06T21:25:53Z",
        "headSha": "7d80f2fd7833fed37853c30917b88dc69ae115ed",
        "status": "failed",
        "done": [],
        "failed": [
          "ZMR isolated package validation 失败",
          "另一项 Semantic Lab CI 成功"
        ],
        "next": [
          "核对失败作业；不推断研究能力结论"
        ],
        "sources": [
          {
            "label": "ZMR 检查",
            "url": "https://github.com/haohongfei2001-png/paia-semantic-lab/actions/runs/37533834044"
          }
        ]
      },
      {
        "id": "lab-provision",
        "title": "登记独立评估所需条件",
        "date": "2026-10-04T14:20:00Z",
        "headSha": "a209cf2df6e146e80204eb8f11c1b0b397ab1fe3",
        "status": "merged",
        "done": [
          "列明独立角色、数据、审核与隔离运行条件"
        ],
        "failed": [
          "独立条件尚未 provision，AS_READY 未达到"
        ],
        "next": [
          "等待具体独立条件证据，不重复无变化的研究执行"
        ],
        "sources": [
          {
            "label": "PR #264",
            "url": "https://github.com/haohongfei2001-png/paia-semantic-lab/pull/264"
          }
        ]
      },
      {
        "id": "lab-minimal",
        "title": "登记最小研究轮授权边界",
        "date": "2026-10-04T14:01:04Z",
        "headSha": "7578817daea3f54637bb7b27c1c7f73696f2cf40",
        "status": "merged",
        "done": [
          "允许有限准备工作"
        ],
        "failed": [],
        "next": [
          "实际独立评估执行仍需后续明确授权"
        ],
        "sources": [
          {
            "label": "PR #262",
            "url": "https://github.com/haohongfei2001-png/paia-semantic-lab/pull/262"
          }
        ]
      }
    ],
    "attention": [
      {
        "id": "lab-independent-gap",
        "title": "独立评估条件未具备",
        "kind": "blocked",
        "sourceUrl": "https://github.com/haohongfei2001-png/paia-semantic-lab/blob/7d80f2fd7833fed37853c30917b88dc69ae115ed/status/ZERO_MODEL_REFOUNDATION_STATUS.json",
        "ref": "7d80f2fd7833fed37853c30917b88dc69ae115ed",
        "reason": "当前门槛是 INDEPENDENCE_NOT_PROVISIONED，不是“用户尚未点击批准”。",
        "confidence": "explicit-source",
        "detail": "当前门槛是 INDEPENDENCE_NOT_PROVISIONED，不是“用户尚未点击批准”。",
        "at": "2026-10-31T18:30:33Z"
      }
    ],
    "limitations": [
      "研究仓库，不是独立应用或 PAIA 生产依赖。",
      "不把旧盲测失败、当前工程 CI 失败与未完成的新能力验证混成同一状态。",
      "仓库未发现正式图标，使用文字占位。"
    ],
    "headSha": "7d80f2fd7833fed37853c30917b88dc69ae115ed",
    "watching": false,
    "commentIssue": null,
    "evidenceLimitations": [
      "研究仓库，不是独立应用或 PAIA 生产依赖。",
      "不把旧盲测失败、当前工程 CI 失败与未完成的新能力验证混成同一状态。",
      "仓库未发现正式图标，使用文字占位。"
    ],
    "snapshot": {
      "repo": "haohongfei2001-png/paia-semantic-lab",
      "source": "github-reviewed-snapshot",
      "fetchedAt": "2026-10-31T18:30:33Z",
      "repository": {
        "fullName": "haohongfei2001-png/paia-semantic-lab",
        "defaultBranch": "main",
        "url": "https://github.com/haohongfei2001-png/paia-semantic-lab",
        "pushedAt": "2026-10-06T21:25:51Z",
        "private": false
      },
      "pullRequests": [
        {
          "number": 264,
          "title": "ZMR: bounded independent provisioning inventory and admission contract",
          "state": "closed",
          "draft": false,
          "merged": true,
          "headSha": "a209cf2df6e146e80204eb8f11c1b0b397ab1fe3",
          "branch": "zmr-independent-provisioning-inventory-20261004",
          "base": "main",
          "url": "https://github.com/haohongfei2001-png/paia-semantic-lab/pull/264",
          "updatedAt": "2026-10-04T14:23:48Z",
          "mergedAt": "2026-10-04T14:20:00Z"
        },
        {
          "number": 263,
          "title": "ZMR: repair PR262 actual-main metadata transport with existing read authority",
          "state": "closed",
          "draft": false,
          "merged": true,
          "headSha": "606f8dfdaa5a122136a7d4dc94dabbf6e775b6eb",
          "branch": "zmr-pr262-actual-main-transport-20261004",
          "base": "main",
          "url": "https://github.com/haohongfei2001-png/paia-semantic-lab/pull/263",
          "updatedAt": "2026-10-04T14:10:07Z",
          "mergedAt": "2026-10-04T14:07:42Z"
        },
        {
          "number": 262,
          "title": "ZMR: capped minimal epoch authorization; AS execution withheld",
          "state": "closed",
          "draft": false,
          "merged": true,
          "headSha": "7578817daea3f54637bb7b27c1c7f73696f2cf40",
          "branch": "zmr-minimal-epoch-authorization-20261004",
          "base": "main",
          "url": "https://github.com/haohongfei2001-png/paia-semantic-lab/pull/262",
          "updatedAt": "2026-10-04T14:10:05Z",
          "mergedAt": "2026-10-04T14:01:04Z"
        },
        {
          "number": 261,
          "title": "ZMR: retain finite streaming allocation observations and original fixture failure",
          "state": "closed",
          "draft": false,
          "merged": true,
          "headSha": "83887e046d77547d28cc79d6e578884151c218c0",
          "branch": "zmr-streaming-allocation-20261004",
          "base": "main",
          "url": "https://github.com/haohongfei2001-png/paia-semantic-lab/pull/261",
          "updatedAt": "2026-10-04T08:56:56Z",
          "mergedAt": "2026-10-04T08:26:20Z"
        }
      ],
      "workflowRuns": [
        {
          "id": 37533834044,
          "name": "ZMR isolated package validation",
          "headSha": "7d80f2fd7833fed37853c30917b88dc69ae115ed",
          "workflowId": 369872131,
          "status": "completed",
          "conclusion": "failure",
          "url": "https://github.com/haohongfei2001-png/paia-semantic-lab/actions/runs/37533834044",
          "createdAt": "2026-10-06T21:25:53Z",
          "updatedAt": "2026-10-06T21:26:20Z"
        },
        {
          "id": 37533834042,
          "name": "Semantic Lab CI",
          "headSha": "7d80f2fd7833fed37853c30917b88dc69ae115ed",
          "workflowId": 361487923,
          "status": "completed",
          "conclusion": "success",
          "url": "https://github.com/haohongfei2001-png/paia-semantic-lab/actions/runs/37533834042",
          "createdAt": "2026-10-06T21:25:53Z",
          "updatedAt": "2026-10-06T21:32:59Z"
        },
        {
          "id": 37208867932,
          "name": "ZMR isolated package validation",
          "headSha": "0ec6d9748cb88422d20a1e02c8d2047343f8bf96",
          "workflowId": 369872131,
          "status": "completed",
          "conclusion": "success",
          "url": "https://github.com/haohongfei2001-png/paia-semantic-lab/actions/runs/37208867932",
          "createdAt": "2026-10-04T14:20:03Z",
          "updatedAt": "2026-10-04T14:20:28Z"
        },
        {
          "id": 37208867808,
          "name": "Semantic Lab CI",
          "headSha": "0ec6d9748cb88422d20a1e02c8d2047343f8bf96",
          "workflowId": 361487923,
          "status": "completed",
          "conclusion": "success",
          "url": "https://github.com/haohongfei2001-png/paia-semantic-lab/actions/runs/37208867808",
          "createdAt": "2026-10-04T14:20:03Z",
          "updatedAt": "2026-10-04T14:20:09Z"
        },
        {
          "id": 37208609786,
          "name": "SEM-03 Qualified Runtime Candidate Stability",
          "headSha": "a209cf2df6e146e80204eb8f11c1b0b397ab1fe3",
          "workflowId": 361576525,
          "status": "completed",
          "conclusion": "skipped",
          "url": "https://github.com/haohongfei2001-png/paia-semantic-lab/actions/runs/37208609786",
          "createdAt": "2026-10-04T14:15:50Z",
          "updatedAt": "2026-10-04T14:15:51Z"
        },
        {
          "id": 37208609784,
          "name": "SEM-01 Local Runtime Bakeoff",
          "headSha": "a209cf2df6e146e80204eb8f11c1b0b397ab1fe3",
          "workflowId": 361546678,
          "status": "completed",
          "conclusion": "skipped",
          "url": "https://github.com/haohongfei2001-png/paia-semantic-lab/actions/runs/37208609784",
          "createdAt": "2026-10-04T14:15:50Z",
          "updatedAt": "2026-10-04T14:15:51Z"
        },
        {
          "id": 37208609724,
          "name": "ZMR isolated package validation",
          "headSha": "a209cf2df6e146e80204eb8f11c1b0b397ab1fe3",
          "workflowId": 369872131,
          "status": "completed",
          "conclusion": "success",
          "url": "https://github.com/haohongfei2001-png/paia-semantic-lab/actions/runs/37208609724",
          "createdAt": "2026-10-04T14:15:50Z",
          "updatedAt": "2026-10-04T14:16:15Z"
        },
        {
          "id": 37208609694,
          "name": "Semantic Lab CI",
          "headSha": "a209cf2df6e146e80204eb8f11c1b0b397ab1fe3",
          "workflowId": 361487923,
          "status": "completed",
          "conclusion": "success",
          "url": "https://github.com/haohongfei2001-png/paia-semantic-lab/actions/runs/37208609694",
          "createdAt": "2026-10-04T14:15:50Z",
          "updatedAt": "2026-10-04T14:15:56Z"
        },
        {
          "id": 37208110721,
          "name": "Semantic Lab CI",
          "headSha": "cf6560117854c94b7a5a187bd4776d345f45c47c",
          "workflowId": 361487923,
          "status": "completed",
          "conclusion": "success",
          "url": "https://github.com/haohongfei2001-png/paia-semantic-lab/actions/runs/37208110721",
          "createdAt": "2026-10-04T14:07:44Z",
          "updatedAt": "2026-10-04T14:07:53Z"
        },
        {
          "id": 37208110680,
          "name": "ZMR isolated package validation",
          "headSha": "cf6560117854c94b7a5a187bd4776d345f45c47c",
          "workflowId": 369872131,
          "status": "completed",
          "conclusion": "success",
          "url": "https://github.com/haohongfei2001-png/paia-semantic-lab/actions/runs/37208110680",
          "createdAt": "2026-10-04T14:07:44Z",
          "updatedAt": "2026-10-04T14:08:10Z"
        },
        {
          "id": 37208042331,
          "name": "Semantic Lab CI",
          "headSha": "606f8dfdaa5a122136a7d4dc94dabbf6e775b6eb",
          "workflowId": 361487923,
          "status": "completed",
          "conclusion": "success",
          "url": "https://github.com/haohongfei2001-png/paia-semantic-lab/actions/runs/37208042331",
          "createdAt": "2026-10-04T14:06:33Z",
          "updatedAt": "2026-10-04T14:06:39Z"
        },
        {
          "id": 37208042263,
          "name": "ZMR isolated package validation",
          "headSha": "606f8dfdaa5a122136a7d4dc94dabbf6e775b6eb",
          "workflowId": 369872131,
          "status": "completed",
          "conclusion": "success",
          "url": "https://github.com/haohongfei2001-png/paia-semantic-lab/actions/runs/37208042263",
          "createdAt": "2026-10-04T14:06:33Z",
          "updatedAt": "2026-10-04T14:06:57Z"
        }
      ],
      "commits": [],
      "issues": [],
      "comments": [],
      "warnings": [],
      "coverage": {
        "recentPulls": 4,
        "recentRuns": 12,
        "allHistory": false,
        "reviewedSource": true
      }
    },
    "workflows": [
      {
        "id": 37533834044,
        "name": "ZMR isolated package validation",
        "headSha": "7d80f2fd7833fed37853c30917b88dc69ae115ed",
        "workflowId": 369872131,
        "status": "completed",
        "conclusion": "failure",
        "url": "https://github.com/haohongfei2001-png/paia-semantic-lab/actions/runs/37533834044",
        "createdAt": "2026-10-06T21:25:53Z",
        "updatedAt": "2026-10-06T21:26:20Z"
      },
      {
        "id": 37533834042,
        "name": "Semantic Lab CI",
        "headSha": "7d80f2fd7833fed37853c30917b88dc69ae115ed",
        "workflowId": 361487923,
        "status": "completed",
        "conclusion": "success",
        "url": "https://github.com/haohongfei2001-png/paia-semantic-lab/actions/runs/37533834042",
        "createdAt": "2026-10-06T21:25:53Z",
        "updatedAt": "2026-10-06T21:32:59Z"
      },
      {
        "id": 37208867932,
        "name": "ZMR isolated package validation",
        "headSha": "0ec6d9748cb88422d20a1e02c8d2047343f8bf96",
        "workflowId": 369872131,
        "status": "completed",
        "conclusion": "success",
        "url": "https://github.com/haohongfei2001-png/paia-semantic-lab/actions/runs/37208867932",
        "createdAt": "2026-10-04T14:20:03Z",
        "updatedAt": "2026-10-04T14:20:28Z"
      },
      {
        "id": 37208867808,
        "name": "Semantic Lab CI",
        "headSha": "0ec6d9748cb88422d20a1e02c8d2047343f8bf96",
        "workflowId": 361487923,
        "status": "completed",
        "conclusion": "success",
        "url": "https://github.com/haohongfei2001-png/paia-semantic-lab/actions/runs/37208867808",
        "createdAt": "2026-10-04T14:20:03Z",
        "updatedAt": "2026-10-04T14:20:09Z"
      },
      {
        "id": 37208609786,
        "name": "SEM-03 Qualified Runtime Candidate Stability",
        "headSha": "a209cf2df6e146e80204eb8f11c1b0b397ab1fe3",
        "workflowId": 361576525,
        "status": "completed",
        "conclusion": "skipped",
        "url": "https://github.com/haohongfei2001-png/paia-semantic-lab/actions/runs/37208609786",
        "createdAt": "2026-10-04T14:15:50Z",
        "updatedAt": "2026-10-04T14:15:51Z"
      },
      {
        "id": 37208609784,
        "name": "SEM-01 Local Runtime Bakeoff",
        "headSha": "a209cf2df6e146e80204eb8f11c1b0b397ab1fe3",
        "workflowId": 361546678,
        "status": "completed",
        "conclusion": "skipped",
        "url": "https://github.com/haohongfei2001-png/paia-semantic-lab/actions/runs/37208609784",
        "createdAt": "2026-10-04T14:15:50Z",
        "updatedAt": "2026-10-04T14:15:51Z"
      },
      {
        "id": 37208609724,
        "name": "ZMR isolated package validation",
        "headSha": "a209cf2df6e146e80204eb8f11c1b0b397ab1fe3",
        "workflowId": 369872131,
        "status": "completed",
        "conclusion": "success",
        "url": "https://github.com/haohongfei2001-png/paia-semantic-lab/actions/runs/37208609724",
        "createdAt": "2026-10-04T14:15:50Z",
        "updatedAt": "2026-10-04T14:16:15Z"
      },
      {
        "id": 37208609694,
        "name": "Semantic Lab CI",
        "headSha": "a209cf2df6e146e80204eb8f11c1b0b397ab1fe3",
        "workflowId": 361487923,
        "status": "completed",
        "conclusion": "success",
        "url": "https://github.com/haohongfei2001-png/paia-semantic-lab/actions/runs/37208609694",
        "createdAt": "2026-10-04T14:15:50Z",
        "updatedAt": "2026-10-04T14:15:56Z"
      },
      {
        "id": 37208110721,
        "name": "Semantic Lab CI",
        "headSha": "cf6560117854c94b7a5a187bd4776d345f45c47c",
        "workflowId": 361487923,
        "status": "completed",
        "conclusion": "success",
        "url": "https://github.com/haohongfei2001-png/paia-semantic-lab/actions/runs/37208110721",
        "createdAt": "2026-10-04T14:07:44Z",
        "updatedAt": "2026-10-04T14:07:53Z"
      },
      {
        "id": 37208110680,
        "name": "ZMR isolated package validation",
        "headSha": "cf6560117854c94b7a5a187bd4776d345f45c47c",
        "workflowId": 369872131,
        "status": "completed",
        "conclusion": "success",
        "url": "https://github.com/haohongfei2001-png/paia-semantic-lab/actions/runs/37208110680",
        "createdAt": "2026-10-04T14:07:44Z",
        "updatedAt": "2026-10-04T14:08:10Z"
      },
      {
        "id": 37208042331,
        "name": "Semantic Lab CI",
        "headSha": "606f8dfdaa5a122136a7d4dc94dabbf6e775b6eb",
        "workflowId": 361487923,
        "status": "completed",
        "conclusion": "success",
        "url": "https://github.com/haohongfei2001-png/paia-semantic-lab/actions/runs/37208042331",
        "createdAt": "2026-10-04T14:06:33Z",
        "updatedAt": "2026-10-04T14:06:39Z"
      },
      {
        "id": 37208042263,
        "name": "ZMR isolated package validation",
        "headSha": "606f8dfdaa5a122136a7d4dc94dabbf6e775b6eb",
        "workflowId": 369872131,
        "status": "completed",
        "conclusion": "success",
        "url": "https://github.com/haohongfei2001-png/paia-semantic-lab/actions/runs/37208042263",
        "createdAt": "2026-10-04T14:06:33Z",
        "updatedAt": "2026-10-04T14:06:57Z"
      }
    ],
    "current": {
      "headline": "独立评估条件尚未具备，研究能力仍未验证。",
      "done": [],
      "blocked": [
        "ZMR isolated package validation 失败",
        "另一项 Semantic Lab CI 成功"
      ],
      "next": "等待真实独立角色、数据与隔离运行条件的证据。",
      "sources": [
        {
          "label": "ZMR 检查",
          "url": "https://github.com/haohongfei2001-png/paia-semantic-lab/actions/runs/37533834044"
        }
      ]
    },
    "notes": [
      {
        "id": "source-semantic-lab",
        "title": "ZMR · 最小研究轮准备",
        "text": "当前获准准备范围",
        "url": "https://github.com/haohongfei2001-png/paia-semantic-lab/blob/7d80f2fd7833fed37853c30917b88dc69ae115ed/docs/zero-model-refoundation-v1/DEVELOPMENT_PLAN.md",
        "createdAt": "2026-10-31T18:30:33Z"
      }
    ],
    "tasks": []
  }
];
