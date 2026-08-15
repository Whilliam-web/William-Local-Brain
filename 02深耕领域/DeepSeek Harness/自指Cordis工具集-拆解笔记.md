# 自指 Cordis 工具集（extensions 四件套）源码拆解笔记

> 调研日期：2026-08-15 ｜ 源码：`D:\deepseek-harness`（`0.1.0-rc.5`）｜ 领域：`02深耕领域/DeepSeek Harness`
> 上级：[[DeepSeek-Harness源码拆解报告]] ｜ 索引：[[总览]]
> 标注：【事实】出自源码/文档原文，【推断】为分析结论。

## 0. 结论先行

DSH"一切皆插件"的终极形态：模型（一个运行在 Cordis 插件运行时里的会话代理）通过一组模型可见工具，把承载它自己的运行时（服务注册表、事件总线、工具注册表、浏览器 UI 槽位、fiber 生命周期）当作可检查、可挂载、可卸载的对象来操作。define 只把代码存进进程内存，run 在宿主 vm 沙箱与浏览器闭包里各求值一半，stop/undefine 用普通 fiber 销毁把一切副作用逆序清掉——系统因此"可自我修改且可完全回滚"，但**它不是安全边界**（见 §4）。

## 1. 架构全景：四件套职责与 Host/Client 双半协作

- **cordis-host-runner**（`@deepseek-ai/dsh-cordis-host-runner`）：纯 Node 半。`DynamicCordisRunnerService`（`src/index.ts:124`）extends `TypertRemoteService`，以 `ctx.dynamicCordisRunner` 注入宿主组合；`src/registry.ts` 是进程内存注册表；`src/sandbox.ts` 是 vm 沙箱；`src/guard.ts` 是注册边界与运行期 ctx 门面；`src/inspect-registry.ts` 提供 `ctx.cordisInspect` 服务。
- **cordis-client-runner**（`@deepseek-ai/dsh-cordis-client-runner`）：纯浏览器能力包。Node 半 `apply` 是空的（`src/index.ts:9`），浏览器半经 `exports["./client"]` 分发，由 package.json 的 `dshClient` 声明发现。浏览器半（`src/client/`）提供求值器、guard、loader 挂载引擎、编排器、timer 服务与 Client inspect 注册表。
- **tool-cordis**（`@deepseek-ai/dsh-tool-cordis`）：7 个模型可见工具 + 系统提示 + `@pluginId` 上下文注入。peerDependency 依赖 host-runner；`inject = ['tools','systemPrompt','dynamicCordisRunner','cordisInspect']`——组合里没有 host-runner 时该插件直接 PENDING，工具永不激活。
- **ui-cordis**（`@deepseek-ai/dsh-ui-cordis`）：Node 半同样为空；浏览器半在 `sidebar.footer.action` 槽注入 `CordisPanel` 面板，在 `tool.call.toolview` 槽按 key 注册 define/run/stop/undefine 卡片，并注册 `@` 斜杠触发源。

**协作主链路**（define 在宿主、run 往返、invoke 回路由）：

1. `cordis_define` → host 侧 `define()`（非 Remote，本地调用）把源码存入注册表，返回 `pluginId/packageId`。
2. `cordis_run` → host 侧 `run()`：若 Package 带 clientCode，先 mint `approval-<n>` 请求 id、`armRequest` 挂起、`emit('cordis/request-run', …)`，工具立即返回 `awaiting-approval`/`starting`——**不在工具内等最终结果**。
3. 浏览器半 `ctx.remote.$on('cordis/request-run')` → `CordisRunOrchestrator.open()` 把请求放进 `activeRuns` 可观察量，面板渲染审批卡；用户点批准 → `approve()` → `orchestrate()` → 依次调宿主 RPC：`runHostHalf`（宿主激活 host 半）→ `getClientCode`（只对精确 `pluginRunId` 下发源码）→ `runner.load()`（本页求值挂载 client 半）→ `resolveRequestRun(requestId, resolution)` 把浏览器结果交回宿主 → 宿主 `settleActivation` + `commitActivation`（此刻才写 `currentPackageId`）→ `emit('cordis/request-run-resolved')` 关掉所有页的审批卡，同时 `steerRunOutcome` 把成败以 `agent.steer(userMessage)` 注入模型下一轮上下文。
4. **invoke 回路**：浏览器半 `host.call(method, args)`（args 缺省 `null`，因 `undefined` 不是 JSON）→ client-runner 的 invoke seam → `ctx.remote.dynamicCordisRunner.invoke(pluginId, pluginRunId, method, args)` → 宿主 `invoke()` 校验：插件在跑（`plugin-not-running`）、run id 未过期（`stale-run`）、handler 已注册（`method-not-found`）→ 调 `run.handlers.get(method)` 的宿主 handler，返回值过 `cloneJson` 跨 realm 物化。handler 抛错 → `steerHostHandlerFailure` 经 `agent.steer` 通知作者会话（按 `Host\0handler\0<method>\0<message>` 去重，一次失败只通知一次）。

## 2. 动态插件生命周期逐阶段拆解

**define**：校验 name/purpose 非空、至少一个 half；`precheckCode` 用 `new Script('(async () => {\n'+code+'\n})()')` **只编译不执行**，与运行期包装逐字一致、行号偏移可预测；语法错把 vm 打印的出错行+插入符透出。`kind:"new"` 要求 idPrefix 为 3–6 个小写字母（`mintPluginId` 产出 `<prefix>-<n>`）；`kind:"existing"` 校验 session 归属后**追加不可变 Package**（`pkg-<n>`）。只存进程内存，不落盘、不装包、不改 cordis.yml。

**run（host 半）**：`startHostHalf` 在 `requireGroup()` 惰性创建的内部 `cordis-dynamic` 组 fiber 下 `ctx.plugin(guardedPlugin(...))`，`await fiber.await()` 等 settle，失败先 dispose 再抛；`'already registered'` 碰撞错误会教"先 cordis_stop 再跑新版"。**vm 沙箱**：`createContext` 全新 realm，globals 刻意极小——带 tag 的直写 console（`[cordis:<id>]`）、`harness{defineTool,registerTool,handle}`、`btoa/atob`（宿主闭包包 Buffer，Buffer 本身不暴露）、`TextEncoder/TextDecoder`、以及 require/setTimeout/setInterval/setImmediate/clearTimeout/clearInterval/fetch 的**调用即抛陷阱**（错误文本指名 cordis 替代：`inject:['fs'|'web'|'bash'|'timer']`）；`process`/`Buffer` 保持 `undefined`（避免 `typeof process` 探测在解析期引爆）。`DUAL_REALM_INSTANCEOF_PRELUDE` 给 vm 内构造函数打 `Symbol.hasInstance` 补丁，使跨 realm `instanceof` 对宿主对象也成立。`vmTimeoutMs`（默认 5000）**只限同步求值段**，async 体逃逸（文档明示接受）。

**浏览器半**：`getClientCode` 只对当前精确激活下发源码 → `evaluateClientHalf` 用 `new Function(...parameters, 'return (async () => {...})()')` 求值，**符号面即参数表**：`React`（无 JSX，须 `React.createElement`）、tagged `console`、`styles`（`DynamicCordisStyles.insert` 注入 `<style data-dyn>`，卸载即删）、`host{call}`、`harness`（Proxy，任何触碰都抛"这属于 HOST 半"）、定时器/fetch/require 闭包陷阱、`process`/`Buffer` 传 `undefined`。返回插件经 `guardedSurface` 包一层，`apply` 收到的不是真 ctx 而是 **guard 门面**：`ctx.get(name)` 免声明可选查找；`ctx.serviceName` 必须已在 `inject` 里声明；未声明但存在的服务报"请 declare inject"；返回值若 `instanceof Context` 立即拒绝（`denyContext`）；set 陷阱只抛错；`in` 陷阱反映可达性。两个特座：`slots` 的 register 代理自动分配全局唯一 shadowing priority、`tool.view.cordis` 只接受 `key:'self'` 并改写为 `<pluginId>.<packageId>`；`theme.overrideTokens` 的 source 被强制替换为包 id。挂载：moduleId 为 `dyn/<id>`，`modules.invalidate` 后经 `window.__ModuleLoader__.load` 注册 factory，再 `loader.create({name})` 创建入口 → `fiber.await()`。**复用静态插件机制**：动态包与静态插件走同一条 loader 入口/fiber/effect 路径。

**stop**：`retract()`：删 `plugin.run` → 逆序跑 `handlerDisposers` → `await run.fiber.dispose()`（fiber 上所有 effect 级联清理）→ `emit('cordis/dynamic-retract')`；未决审批标 cancelled。对未运行插件幂等成功。**undefine**：cancelPending + retract + `registry.delete`，返回 `wasRunning`。之后所有 id 失效。

## 3. 七个工具逐个拆解（设计文档原方案是 3 个，实现演化成 7 个）

设计文档（2026-07-08）原始方案是 `cordis_inspect`/`cordis_mount`/`cordis_unmount` 三个；实现时演化成 3+4，`lifecycle.ts` 教学文案里还残留旧名 `cordis_runtime_inspect`——命名演进的活化石。

1. **cordis_inspect_list**：无参；返回 `{providers: ctx.cordisInspect.list()}`——宿主本地 provider + 客户端同步过来的完整 manifest。纯读，无副作用。
2. **cordis_inspect_query**：参数 platform(host|client)/provider/method/input(json)。宿主查询本地跑；Client 查询广播 `cordis/inspect-query`，**第一个有效页面应答者胜**（stale 应答 `accepted:false`），`exec.signal` 可取消挂起查询。内置 provider：宿主 `Service.listService`、`Event.listEvents`、`Builtin.listBuiltins`、`Tool.listTools`（按 agent scope 返回当前可见工具 schema）；客户端 `Service/Event/Builtin/Slots.listSubTree/Theme.listTokens`。
3. **cordis_inspect_self**：分层自省。无 id → 全部 Plugin 摘要（含派生 `state`：defined/awaiting-approval/client-pending/stopped/running/waiting/failed）；pluginId → 版本指针 + 最近 Run + 各 Package 摘要；pluginId+packageId → **返回源码** + 运行期诊断。
4. **cordis_define**：`code.host`/`code.client` 各是"返回 Cordis Plugin 的 JS 函数体"（function 或 `{name?, inject?, apply(ctx)}` 对象）；纯 JS，无 TS/JSX/import；只校验不入库。
5. **cordis_run**：pluginId/packageId/mode(run|update)。mode 语义严格（`resolvePlan`）：current 存在时切到别的包必须 `update`。返回三态：`awaiting-approval`/`starting`/`running`（host-only 包立即落定）。**无超时**：一旦返回 awaiting-approval，只能由人批准/拒绝、`cordis_stop`/`cordis_undefine` 或进程退出了结。
6. **cordis_stop**：停当前 Run + 取消未决审批；保留全部 Package，可随时再 run/update；幂等。
7. **cordis_undefine**：停 + 删全部；返回 `{pluginId, wasRunning}`。

另有隐藏机制：`@pluginId`（用户消息里 `@<prefix>-<n>` 由 `agent/pre-step` 钩子正则捕获，注入 `<cordis_dynamic_plugin_context>` 上下文）与 `CORDIS_SYSTEM_PROMPT`（order 115 的 systemPrompt section）。

## 4. 安全边界分析

- **vm 沙箱不是安全边界**【事实，源码注释明说】。陷阱与门面只收窄"API 面"：把文件/网络/进程/定时器导向 `ctx.fs/web/bash/timer` 以保持可检查、可卸载；但 `ctx.shell/fs/web` 直通真实运行时。文档原文："It runs in the shared DSH runtime and may affect other sessions in that process. This is an opt-in development tool with bash-equivalent trust, not a security boundary or product default."
- **guard 门面**限制的是"框架内部"与"未声明服务"，属 API 纪律而非隔离（`ctx.tools.get` 只给 schema 视图——防止直接调别的工具的 execute 绕过 `ToolRuntime.execute` 管线）。
- **运行中 Package 注册额外模型可见工具的风险**【事实+推断】：`harness.defineTool/registerTool` 允许已激活的动态包注册新工具，**模型下一轮就会看到并可能调用它**（工具集变化由"变更请求头"全量记录，保证 model-visible ⟺ logged）。风险：模型可能被自己挂的东西引导；一个会话的包影响同进程其它会话。缓解：全部挂 fiber effect 可随 stop/undefine 回滚、仅进程内存、断线/重启即失。
- 已文档化的自伤路径：waterfall 监听器不调 `next()` 会**掐断 Agent 自己的工具派发链**；mount 代码跑在当轮工具调用里，await 任何"只有回合结束后才 resolve"的东西会死锁。

## 5. 动态插件与静态插件异同

**同**：浏览器半走 `loader.create` + 模块表 factory → fiber；激活由 inject 门控；副作用经 fiber effect 逆序清理；FiberState 标签一致。
**异**：无文件/包/安装/cordis.yml 变更；只存进程内存，session resume 与重启都不恢复；`apply` 收到 guard 门面而非真 ctx；host 半在 vm realm、client 半在闭包；带 client 的包有**人审批准**与三层身份；Plugin 下挂**不可变 Package 版本**（run/update/rollback）；没有 HMR 路径，改代码 = define 新 Package + run update。

## 6. demo:cordis 演示流程走读

`scripts/demo-cordis.mjs`：web 面 spawn `dsh web --patch examples/web-cordis/cordis.yml`（端口 **3081**，避开默认 3080）。该 yml 是 overlay：pin webserver 端口 + insert `cordis-host-runner`、`tool-cordis` 两个插件。模型引导靠 `CORDIS_SYSTEM_PROMPT` + cordis-plugin-development Skill，按固定节奏推进：1 inspect_list → 2 inspect_query → 3 inspect_self → 4 define（new 需 idPrefix，existing 针对 @pluginId）→ 5 run（awaiting-approval 需人在 UI 批准）→ 6 stop / 7 undefine。失败则 inspect_self 读诊断、追加新 Package、`mode:"update"` 自主重试；被拒后不得再要同一授权。

## 7. 关键文件清单 + 10 个值得注意的实现细节

**关键文件（15）**：`packages/extensions/cordis-host-runner/src/{index,registry,sandbox,guard,lifecycle,inspect-registry,types}.ts`；`packages/extensions/cordis-client-runner/src/client/{index,runtime,evaluator,guard,orchestrator,inspect-registry,providers,timer}.ts`；`packages/extensions/tool-cordis/src/{index,prompt,inspect,providers,api-catalog,present,fiber-state}.ts`；`packages/extensions/ui-cordis/src/client/index.ts`；文档 `.agents/notes/implemented/feature/2026-07-08-self-referential-cordis-toolset.md`、`docs/subsystems/extensions.md`、`docs/tool-catalog.md` §dsh-tool-cordis；演示 `scripts/demo-cordis.mjs`、`examples/web-cordis/cordis.yml`。

**10 个设计巧思**：
1. 双 realm `instanceof`：vm 构造函数打 `Symbol.hasInstance` 补丁，同时认宿主与 vm 对象。
2. 跨 realm SyntaxError 用 `error.name === 'SyntaxError'` 判定而非 `instanceof`（vm 里构造的错在宿主侧 instanceof 恒假）。
3. define 期 `precheckCode` 与运行期共用同一 `(async () => {…})()` 包装，语法错行号与教学提示两边一致。
4. `process`/`Buffer` 保持 `undefined` 而非抛错访问器，保 `typeof` 探测惰性；`btoa/atob` 是宿主闭包包 Buffer，Buffer 永不入沙箱。
5. `harness.defineTool` 的输出 schema/render/execute 全部在宿主 realm 重建，execute 返回值过栈安全 `cloneJson`（拒绝类实例/函数/Map/Date）；`registerTool` 认 `DYNAMIC_TOOL` 标记防伪造。
6. 审批与 inspect 查询都"**先答先赢**"（`claimRequest`/`resolveClientQuery`），stale 应答 `accepted:false`。
7. 渲染崩溃按**组件身份**（WeakMap `owners`）归因而非 entry.registrant——防一个包冒充另一个包的名字。
8. `reportedRuntimeErrors` 用 `\0` 分隔的键去重，同一 handler/guard 失败只 steer 作者一次。
9. 浏览器 `ClientTimerService` 是宿主 TimerService 的 API 镜像，`ctx.timeout/interval` 全挂调用方 fiber，卸载自动清。
10. 面板 inventory `refresh()` 单飞 + generation 计数：重连时旧连接的 in-flight 读作废，防止旧宿主数据盖在新宿主上。

## 8. 一句话总结"自指"的本质

模型是运行在插件系统里的一个普通插件，而这套工具集把插件系统本身——服务注册表、事件总线、工具目录、浏览器槽位、fiber 生命周期——变成该插件可见可写的对象：**运行时通过语言模型获得了对自己运行时结构的读权限（inspect）、写权限（define/run）与撤销权限（stop/undefine），且每一次自我修改都以 fiber effect 为界做到进程内存内可逆**——"一切皆插件"的最后一环，是让插件自己也能造插件。
