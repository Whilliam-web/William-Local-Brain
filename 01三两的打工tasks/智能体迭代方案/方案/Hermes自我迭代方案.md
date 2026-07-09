# Hermes 自我迭代方案

> 基于对 awesome-hermes-agent 和 hermes-agent-self-evolution 的深入检索分析，制定的分阶段自我升级计划。
> 创建于：2026-07-09

---

## 一、当前基线盘点

### 环境信息
- Hermes Agent v0.18.2（落后上游 56 commits，需 `hermes update`）
- Python 3.11.15，Windows 10
- 知识库：D:\Whiliam local brain（Obsidian PARA 结构）
- 飞书 bot：已配置（群「郑尧涵」）
- 模型：glm-5.2

### 已装 Skills：64 个（62 builtin + 2 local）
- **autonomous-ai-agents**: claude-code, codex, hermes-agent, opencode
- **creative**: 15 个（architecture-diagram, ascii-art, baoyu-infographic, claude-design, comfyui, humanizer, manim-video, p5js 等）
- **data-science**: jupyter-live-kernel
- **email**: himalaya
- **github**: 7 个（完整 PR 工作流、代码审查、仓库管理）
- **media**: gif-search, heartmula, songsee, youtube-content
- **mlops**: huggingface-hub, llama-cpp, segment-anything-model, weights-and-biases
- **note-taking**: obsidian
- **productivity**: airtable, google-workspace, maps, nano-pdf, notion, ocr-and-documents, powerpoint 等
- **research**: arxiv, blogwatcher, llm-wiki, polymarket
- **software-development**: plan, systematic-debugging, TDD, requesting-code-review, simplify-code 等
- **local**: daily-interest-digest, github-repo-research

### 已有 Cron Job
- `3e4539aea1c3`：每日 22:00 兴趣信息速推（daily-interest-digest → 00收件箱/每日速推/）

### 缺失依赖
- dspy ❌ 未安装
- gepa ❌ 未安装

---

## 二、要安装的新 Skills（按优先级排序）

### P0 — 立即安装（直接提升日常能力）

| # | Skill | 来源 | 理由 |
|---|---|---|---|
| 1 | **hermes-skill-kit** | [duruonanni/hermes-skill-kit](https://github.com/duruonanni/hermes-skill-kit) | 飞书文档 API + 响应格式化（53 测试），与已配置的飞书 bot 直接配合 |
| 2 | **hermes-tag** | [DanielLi202/hermes-tag](https://github.com/DanielLi202/hermes-tag) | 飞书/Slack 群聊上下文选择层，@-mention 触发线程回复，给飞书 bot 加精准回复能力 |
| 3 | **oh-my-hermes** | [witt3rd/oh-my-hermes](https://github.com/witt3rd/oh-my-hermes) | 多 agent 编排：deep-research → deep-interview → consensus plan → verified execution，端到端研究能力 |

### P1 — 第二批安装（自我改进 + 监控）

| # | Skill | 来源 | 理由 |
|---|---|---|---|
| 4 | **hermes-dojo** | [Yonkoo11/hermes-dojo](https://github.com/Yonkoo11/hermes-dojo) | 自我改进系统：监控 agent 性能 → 识别弱 skill → 自动迭代 |
| 5 | **SkillClaw** | [AMAP-ML/SkillClaw](https://github.com/AMAP-ML/SkillClaw) | 从真实会话数据自动进化/去重/改进 skill 库（705⭐，production） |
| 6 | **agentburn** | [Socialpranker/agentburn](https://github.com/Socialpranker/agentburn) | 成本分析器：按来源（cron、gateway、subagent、CLI）拆分花费，找出烧钱的模式 |

### P2 — 第三批安装（质量保障 + 桥接）

| # | Skill | 来源 | 理由 |
|---|---|---|---|
| 7 | **agenttrace** | [luoyuctl/agenttrace](https://github.com/luoyuctl/agenttrace) | 会话审计 TUI：cost/token 峰值、工具失败、重试循环、异常检测，本地 MIT |
| 8 | **hermes-skill-factory** | [Romanescu11/hermes-skill-factory](https://github.com/Romanescu11/hermes-skill-factory) | 元 skill：从重复工作流自动生成可复用 skill |
| 9 | **personal-api** | [beiyuii/personal-api-skill](https://github.com/beiyuii/personal-api-skill) | 把 Obsidian vault 变成身份层，任何 AI agent 30 秒内可读 |

### P3 — 探索性（按需安装）

| # | Skill | 来源 | 理由 |
|---|---|---|---|
| 10 | **super-hermes** | [Cranot/super-hermes](https://github.com/Cranot/super-hermes) | 教 Hermes 写自己的分析型 prompt，加元推理层 |
| 11 | **hermes-life-os** | [Lethe044/hermes-life-os](https://github.com/Lethe044/hermes-life-os) | 个人 OS agent，检测日常模式，学习生活规律 |
| 12 | **MisakaNet** | [Ikalus1988/MisakaNet](https://github.com/Ikalus1988/MisakaNet) | Git 分布式集群记忆，多设备共享学习 |

---

## 三、Self-Evolution 部署方案

### 前置条件
1. `hermes update`（更新到最新版，当前落后 56 commits）
2. `pip install dspy gepa`（安装 GEPA 优化引擎依赖）

### 安装步骤
```bash
# 1. 克隆 self-evolution 仓库
git clone https://github.com/NousResearch/hermes-agent-self-evolution.git ~/AppData/Local/hermes/self-evolution

# 2. 安装为可编辑包
cd ~/AppData/Local/hermes/self-evolution
pip install -e ".[dev]"

# 3. 指向 hermes-agent 仓库
export HERMES_AGENT_REPO=~/AppData/Local/hermes/hermes-agent
```

### 进化目标选择（Phase 1: Skill 进化）

优先进化以下已有 skill（有清晰成功指标）：

| 优先级 | Skill | 评测方式 | 预期改进 |
|---|---|---|---|
| 1 | `github-code-review` | 植入已知问题的 PR → 检查是否被发现 | 提高审查召回率 |
| 2 | `systematic-debugging` | 植入 bug → 跑 skill → 检查测试是否通过 | 减少调试轮次 |
| 3 | `daily-interest-digest` | 对比每日速推质量评分 | 提高信息整理质量 |
| 4 | `arxiv` | 搜索已知论文 → 检查是否找到 | 提高搜索召回率 |

### 进化运行命令
```bash
# 用合成数据进化 skill
python -m evolution.skills.evolve_skill \
    --skill github-code-review \
    --iterations 10 \
    --eval-source synthetic

# 用真实会话历史进化（更准但需要积累数据）
python -m evolution.skills.evolve_skill \
    --skill daily-interest-digest \
    --iterations 10 \
    --eval-source sessiondb
```

---

## 四、Cron Job 升级方案

### 现有 Job 保留
- `3e4539aea1c3`：每日 22:00 兴趣信息速推 ✅

### 新增 Job

| Job | Schedule | Purpose | Deliver |
|---|---|---|---|
| **每夜自我进化** | `0 2 * * *`（每日 02:00） | 跑 self-evolution 进化 1 个 skill，输出进化报告到 reports/ | local |
| **进化质量验证** | `0 3 * * *`（每日 03:00） | 验证昨夜进化结果，如果基准测试退化则回滚 | local |
| **每周成本审计** | `0 9 * * 1`（每周一 09:00） | 跑 agentburn 生成本周成本报告 | local |

---

## 五、迭代时间线

### Sprint 1: 基础升级（本周 7/9 - 7/15）

**目标：** 更新 Hermes + 安装核心新 skills + 部署 self-evolution

- [ ] `hermes update`（更新到最新版）
- [ ] 安装 P0 skills：hermes-skill-kit, hermes-tag, oh-my-hermes
- [ ] 安装 dspy + gepa
- [ ] 克隆并安装 hermes-agent-self-evolution
- [ ] 首次试跑：进化 github-code-review skill（合成数据，3 iterations）
- [ ] 审查进化结果，确认 PR diff 是否合理

### Sprint 2: 自我改进闭环（7/16 - 7/22）

**目标：** 建立"进化 → 验证 → 部署"闭环

- [ ] 安装 P1 skills：hermes-dojo, SkillClaw, agentburn
- [ ] 创建每夜自我进化 cron job（02:00）
- [ ] 创建进化质量验证 cron job（03:00）
- [ ] 跑一轮 daily-interest-digest 的进化（用 sessiondb 数据）
- [ ] 对比进化前后的每日速推质量

### Sprint 3: 质量保障 + 桥接（7/23 - 7/29）

**目标：** 可观测性 + Obsidian 深度集成

- [ ] 安装 P2 skills：agenttrace, hermes-skill-factory, personal-api
- [ ] 创建每周成本审计 cron job
- [ ] 用 hermes-skill-factory 从重复工作流自动生成新 skill
- [ ] 配置 personal-api 让 Obsidian vault 可被外部 agent 读取
- [ ] 用 agenttrace 审计过去 30 天的会话，找出低效模式

### Sprint 4: 探索 + 优化（7/30 - 8/5）

**目标：** 元推理 + 生活方式追踪

- [ ] 安装 P3 skills：super-hermes, hermes-life-os
- [ ] 跑一轮 systematic-debugging 的进化
- [ ] 跑一轮 arxiv 的进化
- [ ] 用 hermes-life-os 开始追踪日常模式
- [ ] 回顾整个迭代方案，总结经验，更新方案

---

## 六、安全护栏（自遵守）

以下规则在自我进化过程中不可违反：

1. **不直接提交** — 所有进化变体通过 PR/patch 审查后才能生效
2. **完整测试** — 进化后的 skill 必须在实际任务中验证通过
3. **大小限制** — Skills ≤15KB，避免膨胀
4. **缓存兼容** — 不在对话中途变更 skill，只在新会话生效
5. **语义保持** — 进化不能偏离 skill 原始目的
6. **基准门控** — 如果进化导致任何基准测试退化 >2%，自动回滚
7. **人工审查** — 每次进化的 diff 必须由 Whilliam 确认后才合并

---

## 七、成功指标

| 指标 | 当前 | 目标 | 测量方式 |
|---|---|---|---|
| Skills 数量 | 64 | 75+ | `hermes skills list` |
| 飞书 bot 能力 | 仅发消息 | 文档创建 + 线程回复 + 上下文选择 | 实际测试 |
| 自我进化闭环 | 无 | 每夜自动进化 + 验证 | cron job 执行记录 |
| 成本可观测性 | 无 | 每周成本报告 | agentburn 输出 |
| 会话审计 | 无 | 30 天模式分析 | agenttrace 输出 |
| 多 agent 编排 | 无 | deep-research → plan → execute | oh-my-hermes 端到端跑通 |

---

## 八、风险与应对

| 风险 | 概率 | 应对 |
|---|---|---|
| self-evolution 在 Windows 上有兼容问题 | 中 | 先在 WSL2 里试跑，不行就降级为手动优化 |
| dspy/gepa 安装冲突 | 中 | 用独立 venv 隔离 |
| 进化后的 skill 质量下降 | 低 | 5 道安全护栏 + 人工审查兜底 |
| 新 skill 与现有冲突 | 低 | 逐个安装，每次安装后验证 |
| 飞书 API 限流 | 低 | hermes-tag 已设计为 @-mention 触发，非全量扫描 |

---

## 九、执行进度跟踪

> 实时更新，记录每次执行的实际结果。最后更新：2026-07-09

### 总览仪表盘

| 项目 | 状态 |
|---|---|
| Hermes 版本 | v0.18.2（落后 56 commits，`hermes update` 待手动执行） |
| dspy | ✅ 3.2.1 已安装 |
| gepa | ✅ 0.0.27 已安装 |
| optuna | ✅ 4.9.0 已安装（MIPROv2 依赖） |
| self-evolution 仓库 | ✅ 已 clone 到 `$HERMES_HOME/self-evolution/` |
| self-evolution pip 包 | ✅ 0.1.0 editable 已安装 |
| Skills 总数 | **77**（62 builtin + 15 local，+13 新增） |
| Cron Jobs | 1（每日 22:00 兴趣速推） |
| 百炼 API 连通性 | ✅ qwen3.7-plus 可用（OpenAI 兼容接口） |

### Sprint 1: 基础升级（7/9 - 7/15）

| # | 任务 | 状态 | 完成时间 | 备注 |
|---|---|---|---|---|
| 1 | `hermes update` 更新到最新版 | ⛔ 待执行 | — | 需 Whilliam 手动在终端确认 |
| 2 | 安装 dspy + gepa | ✅ 完成 | 7/9 11:26 | dspy 3.2.1, gepa 0.0.27 |
| 3 | 安装 optuna | ✅ 完成 | 7/9 12:00 | MIPROv2 必需依赖，4.9.0 |
| 4 | 克隆并安装 hermes-agent-self-evolution | ✅ 完成 | 7/9 11:26 | 仓库 + pip editable 包 |
| 5 | 安装 P0 skills: hermes-skill-kit | ✅ 完成 | 7/9 11:39 | 3 个 skill 全部识别 |
| 6 | 安装 P0 skills: oh-my-hermes | ✅ 完成 | 7/9 11:39 | 10 个 omh-* skill 全部识别 |
| 7 | 安装 P0 plugin: hermes-tag | ⛔ 被阻塞 | — | GitHub IP 限流(429)，待恢复后重试 |
| 8 | self-evolution dry-run 验证 | ✅ 完成 | 7/9 11:49 | github-code-review 加载成功(13,531 chars) |
| 9 | 首次试跑：进化 github-code-review | ✅ 完成 | 7/9 13:03 | 10 trials，56 分钟，最高分 61.81%。MIPROv2 优化了 few-shot 组合而非重写文本。约束检查 bug 已修复 |
| 10 | 审查进化结果 | ✅ 完成 | 7/9 13:10 | 最优变体=原版 skill（MD5 一致），MIPROv2 验证了原版质量已是最优组合 |

#### 新安装的 13 个 local skills 清单

| Skill | 来源 | 用途 |
|---|---|---|
| feishu-document-api | hermes-skill-kit | 飞书文档创建/管理（修复了 platforms 加 windows） |
| feishu-response-format | hermes-skill-kit | 飞书响应格式化（53 测试） |
| hermes-memory-maintenance | hermes-skill-kit | MEMORY.md/USER.md 审计维护 |
| omh-autopilot | oh-my-hermes | 自动驾驶模式 |
| omh-deep-interview | oh-my-hermes | 深度访谈 |
| omh-deep-research | oh-my-hermes | 深度研究 |
| omh-ralph | oh-my-hermes | 验证执行→验证→迭代 |
| omh-ralph-driver | oh-my-hermes | Ralph 驱动器 |
| omh-ralph-task | oh-my-hermes | Ralph 任务 |
| omh-ralplan | oh-my-hermes | Planner→Architect→Critic 共识 |
| omh-ralplan-driver | oh-my-hermes | Ralplan 驱动器 |
| omh-triage | oh-my-hermes | 分诊 |
| omh-triage-driver | oh-my-hermes | Triage 驱动器 |

#### 首次进化试跑详情

- **目标 skill**: github-code-review (13,531 chars)
- **模型**: qwen3.7-plus（百炼 OpenAI 兼容接口）
- **评测数据**: synthetic（合成生成）
- **进度**: 数据集生成✅ → Bootstrapping 6/6✅ → MIPROv2 Step 2 指令候选生成✅ → Step 3 因缺 optuna 报错
- **GEPA 状态**: dspy 3.2.1 中 GEPA 不可用，自动回退到 MIPROv2
- **重跑命令**:
```bash
export HERMES_AGENT_REPO="$HERMES_HOME/hermes-agent"
export OPENAI_API_KEY="<百炼key>"
export OPENAI_API_BASE="https://llm-gi90520nvn936o0d.cn-beijing.maas.aliyuncs.com/compatible-mode/v1"
cd "$HERMES_HOME/self-evolution"
python -m evolution.skills.evolve_skill \
    --skill github-code-review --iterations 3 \
    --eval-source synthetic \
    --optimizer-model "openai/qwen3.7-plus" \
    --eval-model "openai/qwen3.7-plus"
```

#### 阻塞项与解法

| 阻塞项 | 原因 | 解法 |
|---|---|---|
| `hermes update` | 命令需用户确认 | Whilliam 在终端手动执行 |
| hermes-tag 安装 | GitHub 限流(429) | 限流恢复后 `hermes plugins install DanielLi202/hermes-tag --enable` |
| 进化试跑 | 缺 optuna | ✅ 已解决，重跑即可 |

### Sprint 2: 自我改进闭环（7/16 - 7/22）

| # | 任务 | 状态 |
|---|---|---|
| 1 | 安装 P1 skills: hermes-dojo, SkillClaw, agentburn | 🔲 未开始 |
| 2 | 创建每夜自我进化 cron job（02:00） | 🔲 未开始 |
| 3 | 创建进化质量验证 cron job（03:00） | 🔲 未开始 |
| 4 | 跑一轮 daily-interest-digest 进化（sessiondb 数据） | 🔲 未开始 |
| 5 | 对比进化前后每日速推质量 | 🔲 未开始 |

### Sprint 3: 质量保障 + 桥接（7/23 - 7/29）

| # | 任务 | 状态 |
|---|---|---|
| 1 | 安装 P2 skills: agenttrace, hermes-skill-factory, personal-api | 🔲 未开始 |
| 2 | 创建每周成本审计 cron job | 🔲 未开始 |
| 3 | 用 hermes-skill-factory 从重复工作流自动生成新 skill | 🔲 未开始 |
| 4 | 配置 personal-api 让 Obsidian vault 可被外部 agent 读取 | 🔲 未开始 |
| 5 | 用 agenttrace 审计过去 30 天会话 | 🔲 未开始 |

### Sprint 4: 探索 + 优化（7/30 - 8/5）

| # | 任务 | 状态 |
|---|---|---|
| 1 | 安装 P3 skills: super-hermes, hermes-life-os | 🔲 未开始 |
| 2 | 跑一轮 systematic-debugging 进化 | 🔲 未开始 |
| 3 | 跑一轮 arxiv 进化 | 🔲 未开始 |
| 4 | 用 hermes-life-os 追踪日常模式 | 🔲 未开始 |
| 5 | 回顾整个迭代方案，更新 | 🔲 未开始 |

### 执行日志

#### 2026-07-09

- 11:26 ✅ 安装 dspy 3.2.1 + gepa 0.0.27
- 11:26 ✅ 克隆 hermes-agent-self-evolution 仓库
- 11:26 ✅ 安装 self-evolution 0.1.0 editable pip 包
- 11:39 ✅ 安装 hermes-skill-kit 3 个 skills（feishu-document-api, feishu-response-format, hermes-memory-maintenance）
  - 发现 `platforms: [linux, macos]` 导致 Windows 不加载，手动加 windows 后修复
- 11:39 ✅ 安装 oh-my-hermes 10 个 omh-* skills
- 11:45 ⛔ hermes-tag 安装失败（GitHub git clone 超时，API 限流 429）
- 11:49 ✅ self-evolution dry-run 验证通过
- 11:49 ✅ 百炼 API 连通性验证通过（qwen3.7-plus）
- 11:51 🔄 首次进化试跑启动（github-code-review, 3 iterations, synthetic）
- 11:56 ✅ 数据集生成完成，Bootstrapping 6/6 完成
- 11:58 ✅ MIPROv2 Step 2 指令候选生成
- 12:00 ⛔ MIPROv2 Step 3 报错：缺 optuna
- 12:00 ✅ 安装 optuna 4.9.0
- 12:00 📝 进度跟踪写入方案文件
- 12:07 🔄 重跑进化试跑（github-code-review, 3 iterations, qwen3.7-plus）
- 12:08 ✅ 数据集生成完成，Bootstrapping 6/6
- 12:09 ✅ MIPROv2 Step 2 指令候选生成
- 12:15 ✅ Trial 2 得分 59.06%（当前最高）
- 12:17 ✅ Trial 3 得分 55.51%
- 12:57 ⚠️ Trial 4-8 被百炼限流拖慢（单请求 40 分钟），后续恢复
- 13:03 ✅ 全部 10+1 trials 完成，最高分 61.81%（Trial 8 & 10 并列）
- 13:03 ⚠️ 约束检查误报 FAILED：skill_structure 检查传入 evolved_body（无 frontmatter）而非 evolved_full
- 13:05 🔧 修复 bug：`evolve_skill.py:188` 将 `evolved_body` 改为 `evolved_full`
- 13:10 ✅ 重新验证约束：4/4 全部通过
- 13:10 ✅ 审查结果：最优变体 = 原版 skill（MD5 一致），MIPROv2 优化的是 few-shot 组合策略而非文本重写
