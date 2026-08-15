# DeepSeek Harness 全方位源码拆解报告

> 调研日期：2026-08-15 ｜ 归档日期：2026-08-15 ｜ 源码版本：`0.1.0-rc.5`（提交 `47f943859b`）｜ 仓库：https://github.com/deepseek-ai/deepseek-harness
> 领域：`02深耕领域/DeepSeek Harness` ｜ 部署相关草稿见 [[DeepSeek Harness 部署记录]]（位于 D:\AI Workspaces\Active\2026-08-14-deploy-deepseek-harness）
> 结论先行：DSH 是一个"没有特权内核"的 Agent 框架——整个运行时是一棵由约 70 个插件组成的 Cordis 插件树；会话是只追加的事件日志（"模型可见即已记录"）；工具、LLM 适配器、agent 循环、策略、UI、甚至"让模型自己改运行时"都是插件。

---

## 0. 一句话摘要

**DeepSeek Harness（`dsh`）是 DeepSeek 官方开源（2026-08-14，MIT）的 Agent 框架**：以 vendored 的 Cordis 元框架为底座，把模型适配器、工具注册表、会话日志、agent 循环、沙箱策略、审批、Web UI 全部做成可热替换的插件；以只追加的会话事件日志为唯一事实源；通过 profile + bundle 的分层 patch 机制装配出 `web`（图形界面）、`headless`（一次性任务）、`acp`（自动化协议服务）等不同形态。它同时是本会话（我）正在运行其上的宿主框架——本报告中的工具、目标、Ralph 等机制都直接来自这套代码。

---

## 1. 项目概况

| 维度 | 事实 |
|---|---|
| 官方仓库 | `deepseek-ai/deepseek-harness`（git remote 实测确认） |
| 许可 | MIT |
| 当前版本 | `0.1.0-rc.5`（开发者预览期，官方明示"将出现破坏性变更"） |
| 定位 | 开源 agent harness（智能体框架），媒体称对标 Claude Cowork 一类的产品化 agent 运行时 |
| 底座 | [Cordis](https://github.com/cordiverse/cordis)（"现代 JS 应用的元框架"），整体 vendor 进仓库并改名为 `@deepseek-ai/cordis` v4.0.1 |
| 设计论文 | [_A Programming Paradigm for Spatiotemporal Composability_](https://github.com/cordiverse/paper) |
| 运行方式 | `npx @deepseek-ai/dsh web` → 默认 `http://127.0.0.1:3080` |
| 技术栈 | TypeScript 6 + Node ^22.19 / ≥24 + pnpm 11.7.0 monorepo；ESM 全量；React 18 + Vite 6（前端）；另有 Python SDK |
| 规模（实测） | 49 个包组、约 300+ 发布包、1293 个 package.json（含 vendor）、3784 个 .ts/.tsx 源文件；文档 40+ 子系统页 |

**发布背景**：DeepSeek 于 2026-08-14 开源 v0.1（公测），核心卖点即"一切皆插件"与 ACP（Agent Client Protocol）兼容。社区反响：
- [DeepSeek 把 Harness 开源了：模型、工具、Agent Loop 全是插件（InfoQ）](https://www.infoq.cn/article/de9AljWc4ejW2KAyW8dD)
- [对标 Claude Cowork：DeepSeek Harness 公测，同步开放插件生态（IT之家）](https://www.ithome.com/0/989/446.htm)
- [实测DeepSeek Harness！梁文锋憋的"黑色鲸鱼"大招（智东西）](https://www.zhidx.com/p/584897.html)
- [Gigazine 报道](https://gigazine.net/news/20260814-deepseek-harness-v0-1/) ｜ [VentureBeat: DeepSeek Harness 开源对标 Claude Code](https://venturebeat.com/technology/deepseek-harness-launches-as-open-source-rival-to-claude-code-alongside-v4-pro-on-api-with-higher-prices)

---

## 2. 总体架构：一棵 Cordis 插件树

### 2.1 核心主张（来自 docs/architecture.md，与源码一致）

> "产品的每一部分都是插件，包括模型适配器、工具注册表、会话日志，以及 agent loop 本身，因此每一部分都可以从配置替换。不存在需要打补丁的特权内核。"

运行中的 `dsh` 是一棵插件树，由启动时**按序叠加的各层组合**而成：

```
空条目列表
  └─ bundle 层（按 profile 列出顺序应用）  ← dsh-base 是每个 profile 的第一层
  └─ profile 的 cordis.patch.yml
  └─ $DSH_HOME/cordis.patch.yml（home 级）
  └─ --patch 覆盖层（可重复）
```

- **profile**：`$DSH_HOME/profiles/<name>` 下的具名组装，列出自己叠放的 bundle 清单（`dsh.profile.bundles`），保存树外插件与用户自己的 patch。
- **bundle（组合包）**：Cordis 配置项及其挂载代码的分发格式，本质是**可安装的 patch 层**（package.json 的 `dsh.bundle.patch` 字段指向一个 `cordis.patch.yml`）。
- **patch 语义**：按 `id` 定位某条 entry 并**整行替换**其整个 config（不深合并），或插入新条目。`dsh --profile web --dump-config` 可打印实际启动的配置树，其中任何条目都能被用户 patch 覆盖。

三个随发行版交付的 bundle：`dsh-base`（共享核心）、`dsh-web-app`（叠加浏览器应用）、`dsh-headless`（一次性任务模式，无服务器）。

### 2.2 三类事件域（扩展点即事件）

| 事件域 | 用途 | 示例 |
|---|---|---|
| **会话事件**（`session/event`） | 追加到日志的持久事实，重载后仍存在 | `turn/start`、`user/message`、`assistant/chunk`、`tool/call`、`tool/result` |
| **Agent 事件**（`agent/*`） | 携带活跃 Agent 的实时协调接口 | `agent/pre-step`、`agent/request`、`agent/turn-stopping`、`agent/status` |
| **能力事件**（seam 事件） | 无需导入循环即可向能力缝附加策略/适配器 | `fs/*`、`tools/*`、`telemetry/*` |

Waterfall（瀑布式）事件要求监听器调用 `next()` 才能委托下去，否则短路——这是拦截/改写/审批的机制基础。

### 2.3 能力缝（capability seam）

一个 **seam** = 三种角色：**Service Definition**（声明接口的 Cordis Service，如 `ShellExecutor`）、一个或多个 **Service Provider**（如 `dsh-bash-local`/`dsh-bash-sandbox`）、一个 **Consumer**（面向模型的工具，如 `dsh-tool-bash`）。**换一个 Provider 就改变整个产品**——例如把文件系统与进程提供方指向远程沙箱，Bash、PTY、LSP 一起搬过去。

### 2.4 仓库布局（实测）

```
vendor/       9 个 vendored 包：cordis、cosmokit、loader、include、group、hmr、timer、logger-console、schemastery
packages/     49 个组、约 300+ 包，@deepseek-ai/dsh-* 命名
  core/         产品 API 主干：session、system-prompt、tools、agent、agent-loop、scope
  api/          Typert RPC gateway + remotes 装配
  typert/       类型图生成器/加载器/运行时注册表（TS 类型 → 跨进程 RPC 的魔法）
  llm/          LLM 能力缝 + deepseek/pi-ai 适配器
  fs/ shell/ subprocess/ terminal/ sandbox/ code-runtime/ lsp/ skill/ web/ compaction/ ...
  client/       Web GUI 浏览器半：web、web-react、connection、hmr、runtime、modules、ui-* 系列
  host/         Web GUI 宿主半：webserver、apiproxy、plugin-inventory、directory-picker
  session/      持久化数据面：JSONL/SQLite、projection、title、telemetry(OTel)
  subagent/     子代理能力缝：in-process、fork、ACP、claude-code、codex、dsh-sdk 后端
  workflow/     工作流 + worker-thread 引擎 + workflow/ralph 工具
  goal/ schedule/ feedback/ identity/ settings/ credentials/ storage/ workspace/
  acp/ sdk/ mcp/    协议层：ACP 服务端、JSON-RPC SDK、MCP 客户端桥
  interaction/  审批/权限预设/命令/ask-user
  bundle/       base、headless、web-app 三个 patch 层
  extensions/   cordis-host-runner / client-runner / tool-cordis / ui-cordis（自指插件系统）
apps/cli       dsh CLI（bin.ts、profile-boot.ts）
apps/web       Vite 前端壳（10 行入口，依赖宿主注入）
python/        Python SDK
native/        landlock-run（Linux Landlock 沙箱启动器，C 源码）
examples/      可运行的 cordis.yml 叶子（acp-agent、headless-agent、jsonrpc-agent、mcp-memory）
.agents/       仓库自带 agent notes（决策记录）+ 11 个维护类 skills
docs/          架构/子系统/时序图/目录生成 + 全量中英双语
website/       VitePress 文档站
```

---

## 3. Cordis 底座：五个核心概念

Cordis 是 DSH 的插件框架底座，来自上游 [cordiverse/cordis](https://github.com/cordiverse/cordis)，整体 vendor 到 `vendor/cordis`（`vendor/README.md` 记录了 18 条本地修改日志，含重入卸载加固、事务化配置重载、Windows 兼容）。它自称 "Meta-Framework for Modern JavaScript Applications"。五个核心概念：

1. **Context（上下文）**：服务容器与插件挂载点。root context 用 Proxy 实现——`ctx.<key>` 读取走服务解析器；`extend()` 造原型继承的子上下文；`isolate()` 给某服务名换独立作用域（两个 agent 可各有一个不同实现的 `shell`）。
2. **Service（服务）**：命名能力。`class X extends Service { constructor(ctx){ super(ctx,'tools') } }` 即注册为 `ctx.tools`；注册本身是 effect，插件卸载自动注销。消费者用 `inject: ['tools']` 声明依赖而不 import 具体实现——**配置选择 provider，消费者零改动**。
3. **Event（事件）**：五种分发模式——`emit`（同步广播）、`parallel`、`serial`/`bail`（按序短路）、`waterfall`（around 中间件）。事件名经 TS 声明合并获得类型。
4. **Fiber（纤程）**：一个插件实例的生命周期句柄，状态机 `PENDING→LOADING→ACTIVE/FAILED→UNLOADING→DISPOSED`。`ctx.effect()` 把任意资源注册为**可逆副作用**，卸载时逆序清理——这使"热替换/重载"成为框架原语而非特例。
5. **Registry（注册表）**：把函数、`{apply}` 对象、Service 类三种插件形态规范化，解析 `inject` 依赖并驱动 fiber 状态。

最小启动器只有 4 行（`vendor/cordis/bin.js`）：`new Context()` → `ctx.plugin(Loader)` → `loader.create(Include, {path:'./cordis.yml'})`。

---

## 4. 核心运行时（packages/core）

### 4.1 六件套分工

| 包 | 职责 | `ctx` 键 |
|---|---|---|
| `core/session` | 只追加的 `SessionEvent` 日志 + 内存存储 | `ctx.sessions` |
| `core/system-prompt` | 提示词片段与工具 schema 组装 | `ctx.systemPrompt` |
| `core/tools` | 作用域化工具注册表 + 带把关的执行流水线 | `ctx.tools` |
| `core/agent` | `Agent` 接口、活跃 agent 注册表、`agent/*` 事件 | `ctx.agents` |
| `core/agent-loop` | 实现 `Agent` 接口的默认驱动器 | `ctx.agentLoop` |
| `core/scope` | 按 agent 划分作用域的注册原语（库，无 ctx 键） | — |

### 4.2 Agent 生命周期：轮次（turn）与步骤（step）

**一个 step = 一次模型请求 + 它调用的工具；一个 turn 包含零个或多个 step**（"在领取首条输入之前打开，在不再欠下任何工作时关闭"）。

```
turn/start
  claim next-step input + one queued message
  assemble prompt sections + tool schemas
  -> agent/pre-step                   reject | enter(messages)
     step/start → user/message* → request/header → agent/request
     → llm/stream → assistant/chunk* → assistant/message
     → tool/call* → tools/pre-execute → tools/execute → tools/post-execute → tool/result*
     step/end
  -> agent/turn-stopping（串行检查点）
turn/end
```

实现：`packages/core/agent-loop/src/agent.ts` 的 `ReactLoopAgent`，内部四态 `Phase`（idle/maintenance/running/…）；驱动入口 `wakeDriver()` → `ctx.agents.withInitiator(this, kick)` → `kick()` 循环 `while (await this.turn())`。`send()` 统一路由三类输入：`followup`（新轮次，唤醒）、`steer`（中途引导，唤醒）、`inject`（注入上下文，不唤醒、留在 inbox 等下一轮）。`turn/end` 的 reason 有 completed/aborted/blocked/error/max-tokens（max-tokens 粘性优先）。

### 4.3 会话日志：唯一事实源

`SessionEventMap`（TS 声明合并可扩展）派生判别联合 `SessionEvent`，事件类型共 13 种：`turn/start`、`turn/end`、`step/start`、`step/end`、`user/message`、`assistant/chunk`、`assistant/message`、`tool/call`、`tool/result`、`todo/write`、`request/header`、`request/context`、`session/end-seed`。关键不变量：

> **模型可见即已记录。** 抵达模型请求的一切都必须能从日志重建——新增一项模型可见输入 = 新增一个会话事件。原始 `assistant/chunk` 保证 token 级回放与 UI 保真；fork、恢复、transcript、遥测、持久化全部派生自该事件流。

`deriveMessages()` 从日志投影模型历史（`user/message`、`assistant/message`、`tool/result` 三类 surface 事件参与）；持久化由插件订阅 `session/event` 落盘（JSONL / SQLite 两种后端）。

### 4.4 工具执行流水线

`ToolDefinition` = 模型面 schema + 必须的 output 规范 + `execute(args, exec)` + 可选 `finalizeContent`/`isConcurrencySafe`/`presentCall`/`presentResult`。注册层用 `ScopedLayers`：`register`（全局或按 agent 作用域，scoped 影子全局）、`restrict`（allow/deny 过滤）、`guard`（只能减权的单调守卫）。

执行管线（模型触发一次工具调用的完整链路）：

```
tool/call（执行前即落日志）
  → UI presentCall
  → tools/pre-execute waterfall（钩子/权限/沙箱，可 ask）
  → 单调 guards（deny or abstain）
  → ctx.approval 一次性审批（无 answerer 即 deny）
  → tools/execute around-dispatch（超时/重试/指标）
  → 工具本体 execute()
  → fs/write-intent | fs/edit-intent（tool-fs 变更门禁）
  → tools/post-execute waterfall（accept/block/replace/add context）
  → finalizeContent（内容不变式）
  → tools/result（同步、冻结的权威结果）
  → UI presentResult
```

并行调度：`tool-calls.ts` 按 `executionMode` 把调用分为 exclusive 屏障与有界并行滚动池（`maxParallelToolCalls`），结果按模型顺序提交。

### 4.5 scope：按 agent 划分子世界

`createScope(ctx, key)` 铸造一个带 branded `ScopeKey` 的 Cordis 子上下文；每个 agent 用自身对象当 key，`agent.ctx` 即 `scope.ctx.extend({agent})`。规则只有两层、扁平：**带作用域的注册不向下继承给 subagent**；子树关系通过 lineage 数据（parentSession、delegationDepth）表达。shadowing：最具体者胜出——某 scope 内的同名工具/片段/变量替换全局项，是按 agent 定制 persona 与工具变体的机制。

### 4.6 system-prompt 组装

四类注册：`section`（按 order 升序拼接：-100 身份、0 persona、100-199 工具指南）、`context`（动态上下文）、`tools`（schema 提供者）、`variable`（`{{name}}` 插值）。`assemble(context)` 聚合 global+scope 链、跑 `system-prompt/assemble` waterfall。本会话的 AGENTS.md、skills 目录等就是通过 `context/agent-instructions`、`skill/*` 这类插件注入的。

### 4.7 CLI 启动流程

`apps/cli/src/bin.ts` → `profile-boot.ts` 的 `runProfile()`：`composeProfile` 合并 bundle 层 + profile 层 + home 层 + `--patch` overlay → 调 `packages/boot/app-boot` 的 `boot()`：`new Context` → 提供 `dshHomePath` → 挂 Loader → prepare（注入启动环境快照、`cmdlineArgs`/`appExit` 服务）→ `mountRootInclude` 应用 patch → 等待树装载并做激活审计（`assertEntriesActivated` 把未加载/失败条目变成启动失败）→ 之后 `watchUserPatches` 热重载用户 patch。`dsh` 只解析自己的启动参数（--profile/--patch/--dump-config），其后所有参数原样交给 booted 应用。

---

## 5. 默认装配：dsh-base 的 ~70 个插件行

`packages/bundle/base/cordis.patch.yml` 是"一切皆插件"的行清单证据（注释明言：**行序无加载语义，激活由服务可用性驱动**）。选录：

- 基础设施：timer、hmr、typert-registry、typert-loader、api-gateway、settings-file、credentials-local
- LLM：`dsh-llm`（缝）+ `dsh-llm-deepseek`、`dsh-llm-pi-ai`（双适配器）+ `llm-retry`；默认模型 `agent-default-model` 配 `provider: deepseek-official, model: deepseek-v4-flash`
- 核心：session、system-prompt、tools、agent、agent-loop、agent-instructions、token-meter、compaction-basic
- 执行能力：subprocess-local、sandbox-local、sandbox-policy、bash-sandbox、pwsh-sandbox、fs-sandbox、code-runtime（headless 才挂）
- 工具插件（约 30 个）：tool-bash、tool-pwsh、tool-fs、tool-fs-search、tool-str-replace-editor、tool-skill、tool-jobs、tool-subagent（+fork/report/control）、tool-workflow、tool-ralph、tool-goal、tool-todo、tool-web、tool-ask-user、tool-cordis（需显式启用）……
- 协作与安全：user-approval、permission-presets、fs-observation-policy、spill-local、spill-policy、timeout-policy、repeat-tool-reminder、session-checkpoint-policy
- 会话增强：session-persistence-jsonl、session-projection、session-telemetry-otel、session-query-sqlite、session-title-*
- 目标/计划：goal、goal-round-driver、command-goal、plan-mode、command-compact

`dsh-headless` 在 base 之上：禁用 HMR、挂 code-runtime worker、注入 headless-startup/headless-runner（把命令行任务作为普通用户消息提交，等 idle 后打印最后一条 assistant 文本并退出，退出码按 turn/end 结果 0/1）。`dsh-web-app` 在 base 之上：webserver、api gateway、workspace、storage、plugin-inventory、web-runtime glue（SPA fallback、URL 打印、信任校验）。

---

## 6. 模型可见工具目录（docs/tool-catalog.md 实测）

| 工具名 | 来源包 | 说明 |
|---|---|---|
| `ask_user_question` | dsh-tool-ask-user | 暂停工具调用直到 UI 返回人类答案 |
| `run_code` | dsh-tools（code-mode） | 对已加载能力执行 TS 程序（Code Mode 传输） |
| `bash` / `pwsh` | tool-bash / tool-pwsh | 执行器缝的模型消费方；`run_in_background` 进 `ctx.jobs` |
| `edit`/`read`/`read_image`/`write` | tool-fs | 先读后写策略由 fs-observation-policy 事件门禁实现 |
| `glob`/`grep` | tool-fs-search | 通过 ctx.subprocess spawn 随包提供的 ripgrep |
| `str_replace_editor` | tool-str-replace-editor | 独立查看/创建/唯一字面量替换 |
| `create_goal`/`get_goal`/`update_goal` | tool-goal | create/edit/pause/resume 要求直接来自人类；blocked 默认下限 3 轮 |
| `subagent`/`subagent_fork` | tool-subagent | 两个 schema 不同的实例；continuable vs one-shot |
| `interrupt_agent`/`list_agents`/`send_message` | tool-subagent-control | 全局命名控制工具 |
| `report` | tool-subagent-report | 仅可继续子级内部可见 |
| `job_kill`/`job_list`/`job_output` | tool-jobs | 与任务种类无关的后台任务控制器 |
| `todo_write` | tool-todo | 会话所有状态，UI 渲染为检查清单 |
| `workflow`/`ralph` | tool-workflow / tool-ralph | 固定工作流脚本 / 全新 agent 循环 |
| `web_fetch`/`web_search` | tool-web | 提供方选择置于 ctx.web 之后 |
| `lsp` | tool-lsp | 语言服务器能力 |
| `terminal_open/read/send/…` | tool-terminal | 6 个 PTY 终端工具（需选择启用） |
| `cordis_define/run/stop/…` | tool-cordis | 模型在运行时自省/修改插件系统（自指工具集） |
| `schedule_create/…` | dsh-schedule | 会话内定时跟进 |
| `session_event_read/search/trace` | tool-session-query | 只读会话检索（需选择启用） |
| `exit_plan_mode` | plan-mode | 计划模式审阅出口 |

工具 schema 目录由生成器在真实上下文中启动每个工具插件读取 `ctx.tools.schemas()` 生成，并有完整性守卫（glob 匹配 `packages/*/tool-*`，遗漏即 CI 失败）。

---

## 7. 沙箱与安全体系

DSH 的安全是"能力缝 + 插件化策略"，四层纵深：

1. **fs 四层**：`dsh-fs`（抽象 + `fs/write-intent`、`fs/edit-intent`、`fs/observed` 事件槽）→ `dsh-fs-local`（真实路径 targetKey、原子写、stale 守卫）→ `dsh-fs-sandbox`（对 mutation 加 per-call policy 围栏：read-only 拒绝、workspace-write 必须落在 `writableRoots` 内、danger-full-access 放行）→ `dsh-tool-fs`（工具层 escalation API：deny → `[sandbox: file access denied under <mode> mode]` 标记 + 教模型用 `sandbox_permissions` 原样重试一次；`WIDER_MODES` 严格更宽表：read-only→[workspace-write, danger-full-access]，workspace-write→[danger-full-access]；缺审批服务一律 fail-closed）。
2. **fs-observation-policy**：事件式插件，强制"先读后写/编辑"（未先读即拒 FS_NOT_OBSERVED；以观察版本做 CAS），防盲覆盖与 stale 覆盖。
3. **code-runtime**：worker-thread 隔离——`env:{}` 零环境、`execArgv:[]` 不继承 loader 钩子、堆上限 512MiB、25ms 采样的 eventLoopUtilization 忙时预算 + wall-clock 兜底、超时一律 `worker.terminate()` 硬停。文档明言：containment 而非安全边界。
4. **landlock-run（native/）**：C11 `main.c` 直接调原始 Landlock syscall（ABI 1-5 协商降级），`--ro/--rw` 白名单授权，`prctl(PR_SET_NO_NEW_PRIVS)` 防 setuid 提权，ruleset 经 execve 被子进程继承；内核不强制则退出码 125 fail-closed，绝不无沙箱 exec；`--probe` 做功能探测（真建规则集并 restrict，报告 full/partial/unusable——因为"有 syscall 但拒绝执行"的内核用 --version 式检查查不出来）。linux-x64/arm64 两个平台包（prebuilds.json + npm os/cpu 自动选包，无安装期编译回退）。消费方是 sandbox-local 的平台 runner 链：Linux bwrap→landlock（bwrap 不可用时的第二级）、macOS Seatbelt、**Windows 走 `sandbox-windows-acl`（ACL 方案）**——Windows 上没有 LSM，进程级隔离换成了基于文件 ACL 的策略。

其他：`subprocess` 用 `scrubbedParentEnv()` 按 SENSITIVE_ENV_PATTERN（KEY|PASSWORD|SECRET|TOKEN）和 DSH_* 前缀清洗环境防凭据泄漏；`approval`（实际在 packages/interaction/user-approval）支持 policy ask/never，请求必须处于 open turn 内，无 answerer 一律 fail-closed；`permission-presets` 把 sandbox/mode 与 approval/policy 两个旋钮捆成预设（默认两档：workspace-write+ask、danger-full-access+never）。

---

## 8. Web GUI（dsh web，127.0.0.1:3080）

**架构**：宿主（Node）与浏览器双半。浏览器 carrier 用 HTTP POST 做 unary/respond RPC（统一 `/api` 路由 + Fetch 桥），再开两条只下行 WebSocket（`/api/events.mux` 会话事件流、`/api/events.host` 宿主事件）。`/api` 有浏览器信任围栏（loopback/trustedHosts、Origin 校验防 DNS rebinding）；无 TLS/鉴权，`--host 0.0.0.0` 被显式拒绝。

**`window.__DSH_BOOT__`**：client-modules 的 Node 半扫描声明 `dsh.client` 的包，组成 WebBootGraph（每行 id/url/rev/inject），以 `<head>` 第一个脚本注入；浏览器半启动前解析，缺失即报错不启动——所以 apps/web 不能独立 serve（vite.config 里 `rejectStandaloneServe` 直接抛错）。

**UI 模块体系**：`dsh-client-runtime` 提供 SlotRegistry、SessionRuntime、WorkspaceRuntime，把宿主流扇出给各 owner；渲染层经 web-react 的 uSES 桥（use-sync-external-store）订阅——**无 Redux 类状态库**，状态在 cordis fiber 的可观察 store 中。ui-* 插件包按界面区域分工：ui-layout（三栏 AppFrame）、ui-sidebar、ui-conversation（会话骨架/流式渲染/composer）、ui-tool（工具调用节点 + 递归 subCalls）、ui-trajectory（turn 感知请求账本）、ui-jobs（后台任务列表，数据来自 runtime 镜像零 RPC）、ui-goal（GoalBar）、ui-subagent（子代理目录树）、ui-workflow-run、ui-settings-* 系列等约 30 个。

**HMR**：`pnpm run dev:web` = tsdown watch 重写所有 client 插件的 bundle；宿主侧 stat-poll 每个 bundle 的 rev，浏览器侧订阅系统 SSE（`/plugins/events`），收到 rebuilt 帧按序 invalidate → prefetch → 排空旧 fiber → `entry.refresh()` 重挂载。

> 📌 读文档提示：`docs/subsystems/web.md` 讲的是 `web_search`/`web_fetch` 能力缝（`ctx.web`），**不是** Web GUI；GUI 相关文档是 `web-server.md`、`client-modules.md` 及各 client 包 README。

---

## 9. 协议与集成层

### 9.1 ACP 服务端（@deepseek-ai/dsh-acp）

Automation-only ACP 服务端，用官方 `@agentclientprotocol/sdk` 的 `AgentSideConnection` 在 stdin/stdout 上跑 JSON-RPC stdio。每次 `session/new` 经 `ctx.agents.create()` 新建独立 agent；支持 `initialize`（仅 baseline prompt 能力）、`session/new`、`session/prompt`（等 whole-agent idle 才结算）、`session/cancel`、`session/update`（只发 committed 文本 `agent_message_chunk`）、`session/request_permission`（仅 allow-once/reject-once，接 `approval/request` 事件）。不暴露编辑器导航/transcript 回放/命令/图像等能力。启动：`pnpm run demo:acp`（`examples/acp-agent`）。

### 9.2 Typert API Gateway（packages/api + packages/typert）

业务服务用 `@Remote`/`@RemoteScope` 装饰器声明对 Client 开放的方法；构建期 typert-generator 以 Host `ts.Program` 为种子做严格分析，生成 Host 描述符与 Host-for-Client 类型/codec（写进各包 `lib/typert.host.js`、`typert.remote-client.js` 等）。运行时 Gateway 拦截 Connection 的 `/api` RPC 路由（`POST /api/<namespace>/<method>`），复杂对象（如 Agent）经 `ctx.typert.lookups` 以 wire id 解析。Client 侧用普通对象上的**具体函数**（非 Proxy）`ctx.remote.<namespace>` 调用，支持 AbortSignal 协作取消。这是"TS 类型即 RPC 契约"的编译期魔法。

### 9.3 LLM adapter 层（packages/llm）

`LlmAdapter` 唯一抽象方法 `stream(options): AsyncIterable<StreamChunk>`；`LlmRuntime.registerAdapter(providers, adapter)` 按 provider route 注册（重复抛错、HMR-safe、可原子 replace）；每次调用经 `llm/stream` waterfall 可被中间件拦截（retry/replay/routing）。现有实现：`llm-deepseek`（直连 HTTP+SSE，eventsource-parser）、`llm-pi-ai`（包装 npm 包 `@earendil-works/pi-ai`，自带 openai/anthropic/deepseek/openrouter/together/zai/qwen 等 provider 目录 + 可手写 route，多数 provider 是配置而非代码）。**新增 provider 只需继承 `LlmAdapter` 实现 `stream()` 并注册**——参见 docs/cookbook/adding-an-llm-adapter.md。

### 9.4 SDK / MCP / Python

- `packages/sdk/{protocol,client,server}`：从另一进程驱动 Harness 运行时的 JSON-RPC 协议栈（stdio）；`examples/jsonrpc-agent` 即 Python SDK + JSON-RPC 驱动的无人值守编码 agent。
- `packages/mcp/mcp-client`：MCP 客户端桥，把外部 MCP server 的工具注册到 `ctx.tools`，命名 `mcp__<serverName>__<rawName>`（stdio / streamable-http）；`examples/mcp-memory` 演示接入第三方记忆 MCP。
- `python/sdk`：Python SDK（client/api/models/errors）+ bundled runtime。
- 总格局："多协议适配"——ACP 面向自动化客户端、JSON-RPC SDK 面向外部进程、MCP client 面向工具服务器、Typert Gateway 面向 Web/远程调用。

---

## 10. 工程与质量体系

- **构建**：`tsc -b` 双 aggregate（tsconfig.host.json / tsconfig.client.json，因两侧对 cordis Context 做不同声明合并而必须分离）+ `tsdown` 按 `DSH_BUILD_FACE` 打包 + `build:web`（Vite）。Typert 只在 Host tsdown 中以 Host program 为种子运行。
- **测试**：vitest 单元 + 快照（keyless ACP/headless replay vs 期望输出，海量 `.expected.jsonl`）+ e2e（需 DEEPSEEK_API_KEY）+ 覆盖率门禁（per-file 100%）+ web 测试套件。
- **门禁**：scripts/run-gates.ts 聚合——knip、publint、workspace constraints、NodeNext 消费方检查、模块图/工具目录/配置目录/持久化目录等生成物新鲜度校验、文档链接校验、双语翻译配对校验（.i18n.yaml + git merge driver 自动合并）。
- **文档即门禁**：40+ 子系统页粘贴 `type-equiv` 源码等价声明并有校验；工具 schema 目录、配置目录、Cordis 目录均由生成器产出并在 CI 校验新鲜度。
- **Agent 友好**：仓库自带 `.agents/`（11 个维护 skills + 结构化的 Agent Notes 决策记录，implemented/proposed/rejected/archived 分类）、AGENTS.md 面向 agent 的完整规范（含"面向 agent 请遵循 AGENTS.md"）。
- **双语**：README/docs/包 README 全量中英双语，翻译有严格配对校验（.i18n.yaml 配对 + merge driver 自动合并 + 校验门禁）。

---

## 11. 生态现状（GitHub / npm / 社区）

### 11.1 发布与分发

- v0.1.0 于 2026-08-14 前后公开发布，MIT，HEAD 提交合并了 `feat/npm-public`（发布管线已就绪）：`npx @deepseek-ai/dsh web` 一键启动。
- npm 包族 `@deepseek-ai/dsh-*`（dsh-acp、dsh-llm、dsh-api-gateway、dsh-sdk-client、dsh-mcp-client 等，v0.1.0-rc.5）；社区还出现 `pip install deepseek-harness`、`npx @deepseek-harness/mcp` 等别名包（需 npm registry 实测为准）。

### 11.2 GitHub 插件生态（topic: dsh-plugin）

- 社区聚合仓库：`awesome-dsh-plugin/awesome-dsh-plugin`、[0xsline/awesome-deepseek-harness](https://github.com/0xsline/awesome-deepseek-harness)、[beancookie/awesome-dsh-plugin](https://github.com/beancookie/awesome-dsh-plugin)、[like-study1/Oh-My-DSH](https://github.com/like-study1/Oh-My-DSH)（自动同步 topic）、[dshfind 插件市场](https://github.com/hikariming/dshfind)；[dsh-plugin-marketplace](https://github.com/AwesomeHou/dsh-plugin-marketplace) 声称同步 1800+ 仓库，另见官方 [dsh-plugin-finder 讨论帖](https://github.com/deepseek-ai/deepseek-harness/discussions/1096)。
- 第三方实现代表：[openma-ai/deepseek-harness-acp](https://github.com/openma-ai/deepseek-harness-acp)（DSH 的 ACP server 实现）、deepseek-harness-desktop（桌面壳）、大量 fork（sunjiefeng、Lyowisee、HenryZ838978 等）。
- 插件命名约定：`dsh-plugin-*` / `dsh-*`；官方 README 建议插件仓库添加 [`dsh-plugin`](https://github.com/topics/dsh-plugin) topic 以便被发现。

### 11.3 插件分发双轨（docs/user/develop/basic/publish.md）

- **bundle**：npm 包 + `dsh.bundle.patch` 字段（一个 cordis.patch.yml），`dsh plugin --profile <name> add <pkg>` 走 pnpm 装包并追加层。
- **profile**：`$DSH_HOME/profiles/<name>` + `dsh.profile.bundles` 有序列表。
- git 直装需要作者提供 prepare 脚本 + 用户 `pnpm-workspace.yaml` 的 `allowBuilds` 白名单（"允许安装期执行代码"的信任声明）。

### 11.4 社区动态

- 官方企微群 + 问卷 + 公众号（README 二维码）；GitHub Discussions 是反馈主渠道。
- 技术分析文章：[NYU RITS 博客](http://rits.shanghai.nyu.edu/ai/deepseek-harness-cordis-everything-is-a-plugin/)、[floatboat 博客](https://floatboat.ai/blog/cordis-plugin-framework)、[53AI 对比](https://www.53ai.com/news/OpenSourceLLM/2026081542506.html)、[cnblogs 对比](https://www.cnblogs.com/qq8864/articles/22479803)。
- 理论源头：[cordiverse/paper](https://github.com/cordiverse/paper) —— *A Programming Paradigm for Spatiotemporal Composability*，即"一切皆插件"的论文依据。

---

## 12. 与同类框架对比

| 维度 | DeepSeek Harness | Claude Agent SDK / OpenAI Agents SDK / LangGraph | Claude Code / Cowork |
|---|---|---|---|
| 形态 | **运行时/宿主**（自带持久会话、本地 bash/fs、沙箱、compaction、subagent/workflow） | 编排库（在应用进程内组装 agent） | 产品化 agent CLI（闭源核心） |
| 插件化 | 一切皆插件（Cordis 树，可热替换/自指） | 库级扩展（函数/工具注册） | 有限（SlashCommand/Hooks） |
| 协议 | ACP 服务端 + JSON-RPC SDK + MCP 客户端 + Typert Gateway | 各自 SDK 内部协议 | ACP 支持 |
| 模型中立 | LlmAdapter + pi-ai 目录（openai/anthropic/deepseek/…） | 一般支持多 provider | 绑定自家模型为主 |
| 会话事实源 | 只追加事件日志（模型可见即已记录） | 内存/存储消息列表 | 私有日志格式 |
| 许可证 | MIT（开源） | 各 SDK 自有 | 专有 |

**推断**：媒体将 DSH 与 Claude Cowork 对比的技术基础是双方都构建在 ACP 之上；与"编排库"相比，DSH 的差异点在于"运行时即产品"——把 agent 需要的全部基础设施（持久化、沙箱、审批、UI、自动化协议）做成一个可装配、可插件化的宿主。

---

## 13. 学习路径建议（给 Whiliam）

1. **10 分钟总览**：读 `docs/architecture.zh.md` + `docs/agent-lifecycle.zh.md`（含时序图）——把 turn/step、三类事件、seam 概念先立住。
2. **动手看装配**：`pnpm dsh --profile web --dump-config` 看本机实际启动的插件树；对照 `packages/bundle/base/cordis.patch.yml`。
3. **核心源码精读**（按顺序）：`core/agent-loop/src/agent.ts`（循环）→ `core/session/src/types.ts`（事件模型）→ `core/tools/src/index.ts`（工具管线）→ `core/scope/src/index.ts`（作用域）。
4. **写第一个插件**：跟 `docs/cordis-tutorial/`（7 章）→ `docs/cookbook/adding-a-tool.md` → `adding-an-llm-adapter.md`；用 `--patch` 叠加自己的 `cordis.patch.yml` 而不改仓库。
5. **深水区**：`extensions/` 四件套（让模型自己改运行时）、`typert/`（类型反射 RPC）、`native/landlock-run`（C 沙箱）、`python/` SDK。
6. **对照本会话**：我身上正在运行的 goal/ralph/subagent/workflow/jobs 机制都能在 `packages/goal`、`packages/workflow`、`packages/subagent`、`packages/jobs` 找到对应实现。

---

## 14. 关键文件索引（速查表）

| 路径 | 一句话职责 |
|---|---|
| `packages/bundle/base/cordis.patch.yml` | 默认装配清单（~70 插件行） |
| `packages/core/agent-loop/src/agent.ts` | ReactLoopAgent：turn/step 状态机驱动 |
| `packages/core/agent-loop/src/index.ts` | AgentLoop 服务/工厂：create/resume/prepare/publish |
| `packages/core/agent/src/index.ts` | AgentRegistry + initiator 作用域 |
| `packages/core/agent/src/types.ts` | Agent/AgentStatus/PreStepDecision 契约 |
| `packages/core/session/src/types.ts` | SessionEventMap 事件模型（13 种事件） |
| `packages/core/session/src/surface.ts` | deriveMessages() 模型历史派生 |
| `packages/core/scope/src/index.ts` | createScope/scopeTarget 作用域原语 |
| `packages/core/system-prompt/src/index.ts` | section/context/tools/variable 组装 |
| `packages/core/tools/src/index.ts` | ToolRuntime：注册/限制/守卫/执行管线 |
| `packages/boot/app-boot/src/index.ts` | boot()：Cordis 树装载与激活审计 |
| `apps/cli/src/bin.ts` / `profile-boot.ts` | CLI 入口与 profile 组合 |
| `vendor/cordis/src/{context,fiber,events,registry,service}.ts` | Cordis 五核心 |
| `packages/extensions/cordis-host-runner/src/index.ts` | ctx.dynamicCordisRunner（vm 沙箱动态插件） |
| `packages/fs/fs-sandbox/src/index.ts` | 文件 mutation 的 policy 围栏 |
| `packages/fs/tool-fs/src/sandbox.ts` | 工具层 escalation API（deny→escalate） |
| `packages/code-runtime/code-runtime-worker-thread/src/index.ts` | worker 隔离 + 双预算 |
| `native/landlock-run/packages/entry/src/main.c` | Landlock 自限后 exec 启动器 |
| `packages/client/web/src/boot.tsx` | 前端两段启动（module face + plugin face） |
| `packages/client/connection/src/index.ts` | ctx.connection：HTTP RPC + 双 WS 流 |
| `packages/client/modules/src/client/manifest.ts` | WebBootGraph（__DSH_BOOT__） |

---

## 15. 事实 / 假设 / 待确认

- 【事实】仓库 remote、版本、规模、许可证、bundle 清单、事件模型、CLI 流程均直接读源码/文档确认。
- 【事实】本会话运行机制（goal/ralph/subagent/workflow/jobs/ask_user 等工具与文档描述一一对应）。
- 【事实】ACP/JSON-RPC/MCP/Typert 协议层结构均读源码确认；媒体发布的背景信息有来源链接。
- 【推断】"对标 Claude Cowork"为媒体表述；DSH 定位为通用 agent harness，ACP 兼容使其可被任意 ACP 客户端驱动。
- 【待确认】插件生态的活跃度（marketplace 声称 1800+ 仓库未独立核实）；`@deepseek-ai/dsh` CLI 等 npm 发布状态需 registry 实测；DeepSeek API 密钥未配置时的完整体验。
- 【风险】开发者预览期（rc 版本），破坏性变更频繁；vendor 的 cordis 有 18 条本地修改，跟随上游需关注 vendor/README.md 的同步流程。
