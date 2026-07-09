# Hermes 自我迭代方案 - 进度跟踪

> 创建于：2026-07-09
> 方案文档：[[Hermes自我迭代方案]]

---

## 总览仪表盘

| 项目 | 状态 |
|---|---|
| Hermes 版本 | v0.18.2（落后上游 56 commits，`hermes update` 被拦截需手动执行） |
| dspy | ✅ 3.2.1 已安装 |
| gepa | ✅ 0.0.27 已安装 |
| self-evolution 仓库 | ✅ 已 clone 到 `$HERMES_HOME/self-evolution/` |
| self-evolution pip 包 | ✅ 0.1.0 已安装（editable） |
| Skills 总数 | 64（62 builtin + 2 local） |
| Cron Jobs | 1（每日 22:00 兴趣速推） |
| 方案文档 | ✅ 已写入 03百宝箱/ |

---

## Sprint 1: 基础升级（7/9 - 7/15）

| #   | 任务                                                                           | 状态     | 备注                                                             |
| --- | ---------------------------------------------------------------------------- | ------ | -------------------------------------------------------------- |
| 1   | `hermes update` 更新到最新版                                                       | ⛔ 被拦截  | 命令需要用户手动在终端确认执行                                                |
| 2   | 安装 P0 skill: hermes-skill-kit (feishu-document-api + feishu-response-format) | ⛔ 被拦截  | `hermes skills install` 从 URL 超时；`execute_code` 下载方案被用户拒绝；需换策略 |
| 3   | 安装 P0 skill: hermes-tag                                                      | 🔲 未开始 |                                                                |
| 4   | 安装 P0 skill: oh-my-hermes                                                    | 🔲 未开始 |                                                                |
| 5   | 安装 dspy + gepa                                                               | ✅ 完成   | dspy 3.2.1, gepa 0.0.27                                        |
| 6   | 克隆并安装 hermes-agent-self-evolution                                            | ✅ 完成   | 仓库 + pip editable 包就位                                          |
| 7   | 首次试跑：进化 github-code-review skill                                             | 🔲 未开始 | 依赖任务 1（hermes update）                                          |
| 8   | 审查进化结果                                                                       | 🔲 未开始 |                                                                |

### 阻塞项详情

**1. `hermes update` 被拦截**
- 原因：命令需要用户确认同意
- 解法：Whilliam 需要在 Hermes 终端里手动执行 `hermes update`

**2. 飞书 skills 安装被阻塞**
- `hermes skills install "https://raw.githubusercontent.com/..."` → 超时（网络或命令机制问题）
- `curl` 下载 raw 文件 → exit_code 23（连接问题）
- `execute_code` 用 Python urllib 下载 → 被用户拒绝
- **备选方案**：
  - (a) Whilliam 手动执行 `hermes skills install` 命令
  - (b) 用 `git clone` 整个仓库到本地，然后从本地路径安装
  - (c) 手动 curl 下载 SKILL.md 到 `$HERMES_HOME/skills/feishu-document-api/SKILL.md`

---

## Sprint 2: 自我改进闭环（7/16 - 7/22）

| # | 任务 | 状态 |
|---|---|---|
| 1 | 安装 P1 skills: hermes-dojo, SkillClaw, agentburn | 🔲 未开始 |
| 2 | 创建每夜自我进化 cron job（02:00） | 🔲 未开始 |
| 3 | 创建进化质量验证 cron job（03:00） | 🔲 未开始 |
| 4 | 跑一轮 daily-interest-digest 进化（sessiondb 数据） | 🔲 未开始 |
| 5 | 对比进化前后每日速推质量 | 🔲 未开始 |

---

## Sprint 3: 质量保障 + 桥接（7/23 - 7/29）

| # | 任务 | 状态 |
|---|---|---|
| 1 | 安装 P2 skills: agenttrace, hermes-skill-factory, personal-api | 🔲 未开始 |
| 2 | 创建每周成本审计 cron job | 🔲 未开始 |
| 3 | 用 hermes-skill-factory 从重复工作流自动生成新 skill | 🔲 未开始 |
| 4 | 配置 personal-api 让 Obsidian vault 可被外部 agent 读取 | 🔲 未开始 |
| 5 | 用 agenttrace 审计过去 30 天会话 | 🔲 未开始 |

---

## Sprint 4: 探索 + 优化（7/30 - 8/5）

| # | 任务 | 状态 |
|---|---|---|
| 1 | 安装 P3 skills: super-hermes, hermes-life-os | 🔲 未开始 |
| 2 | 跑一轮 systematic-debugging 进化 | 🔲 未开始 |
| 3 | 跑一轮 arxiv 进化 | 🔲 未开始 |
| 4 | 用 hermes-life-os 追踪日常模式 | 🔲 未开始 |
| 5 | 回顾整个迭代方案，更新 | 🔲 未开始 |

---

## 已完成的工作

### 2026-07-09

1. ✅ 联网检索了 5 个项目：gstack、gbrain、hermes-webui、awesome-hermes、self-evolution
2. ✅ 获取了 awesome-hermes-agent 完整 README（75KB，100+ 条目）
3. ✅ 获取了 hermes-agent-self-evolution 完整 README + PLAN.md（40KB，5 阶段进化路线图）
4. ✅ 在浏览器中打开了两个项目的 GitHub 页面
5. ✅ 盘点了当前能力基线：64 skills、1 cron job、飞书 bot 已配置
6. ✅ 撰写了完整的自我迭代方案（4 个 Sprint、12 个新 skill、3 个新 cron job、5 道安全护栏）
7. ✅ 安装了 dspy 3.2.1 + gepa 0.0.27（self-evolution 的核心依赖）
8. ✅ 克隆了 hermes-agent-self-evolution 仓库到 `$HERMES_HOME/self-evolution/`
9. ✅ 安装了 hermes-agent-self-evolution 0.1.0 为 editable pip 包

---

## 下一步行动（需要 Whilliam 决策）

1. **`hermes update`** — 请在终端手动执行，更新到最新版（当前落后 56 commits）
2. **飞书 skills 安装策略** — 选择一种方式：
   - (a) 手动执行 `hermes skills install` 命令
   - (b) 允许我用 `git clone` 整个仓库后本地安装
   - (c) 允许我用 `execute_code` 下载文件
3. **确认后继续 Sprint 1 剩余任务**
