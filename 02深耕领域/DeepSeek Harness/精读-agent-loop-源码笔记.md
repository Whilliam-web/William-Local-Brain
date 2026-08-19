# agent-loop 逐行精读笔记

> 调研日期：2026-08-15 ｜ 源码：`D:\deepseek-harness`（`0.1.0-rc.5`）｜ 领域：`02深耕领域/DeepSeek Harness`
> 上级：[[DeepSeek-Harness源码拆解报告]] ｜ 索引：[[总览]]
> 精读对象：`packages/core/agent-loop/src/` 全部 6 个文件（agent.ts 496 行 / index.ts 713 行 / tool-calls.ts 289 行 / runtime-context.ts / constants.ts / invariant.ts），配套 `packages/core/agent/src/`（types、runtime-types、index、inbox、dispatch）、`packages/core/session/src/`（概要）、`packages/core/scope/src/`（概要）。文中行号均为实际行号；标注【推断】处为合理推测，其余为代码直述事实。

## 1. 整体心智模型

**定位**：`ReactLoopAgent`（agent.ts:64）是一个"队列化回合 + 步边界输入"的默认驱动。它不持有任何会话状态，所有请求都从 session 日志派生（agent.ts:2-4）——Session 是唯一事实源，Inbox 只是待处理消息的投影，Phase 是驱动器的运行状态机。

**Phase 状态机**（agent.ts:38-46）是一个带 payload 的判别联合：

- `idle`：`{ lastTurn }`——无驱动器、无维护任务；**没有** AbortController（这是"无可取消之物"的代码表达）。
- `maintenance`：`{ abort, lastTurn, wakeRequested }`——一个非回合任务占用了 agent，但它不算运行中。
- `running`：`{ abort, turn, step, wakeRequested }`——驱动器正在消耗队列；`turn/step` 是当前推进位置，`abort` 是本回合的取消信号。

`status` getter（99-101）把 idle 与 maintenance 都映射为对外可见的 `'idle'`，只有 running 才是 `'running'`。`setPhase`（104-111）先读旧 status、替换 phase、再读新 status，仅在状态翻转时 `emit('agent/status')`——注意**只发布目的状态**，且通知不携带上一状态。

**迁移矩阵**（全部迁移点）：`idle→running` 只在 `wakeDriver`（172-193）；`idle→maintenance` 只在 `runMaintenance`（142-162）；`running→idle` 只在 `kick` 的 finally（217-221）；`maintenance→idle` 只在 `runMaintenance` 的 finally（157）。**驱动器永远只在 idle 上启动**——这是整个并发模型的地基：任何时刻至多一个 activity 持锁。

**完整生命周期**：构造（80-97）→ 工厂 `prepare/publish`（index.ts:459-578，见 §7）→ `wakeDriver` 启动驱动器 → `kick` 循环 `while (await this.turn()) {}`（212）→ 队列耗尽或出错/cancel → `kick` finally 回 idle → `dispose`：`cancel({kind:'disposed'})` → `whenIdle()` → `scope.dispose()` 解开注册。

## 2. 消息通路：followup / steer / inject → Inbox → preStep

### 2.1 三个入口与 InboxTarget（agent.ts:122-132）

| 方法 | send 参数 | 语义 |
|---|---|---|
| `followup` | `'next-turn'`, wakeup=true | 排入下个独立回合；**该消息成为自己回合的唯一普通消息** |
| `steer` | `'next-step'`, wakeup=true | 交给最近的步边界；空闲时启动回合，运行中在下一步被消费 |
| `inject` | `'next-step'`, wakeup=false | 只排队不唤醒；运行中在最近的步边界被认领，空闲时等后续唤醒 |

三个入口全部收敛到 `send(message, target, wakeup)`（113-120）：

```ts
const wakingAfterAbort = wakeup && this.phase.kind !== 'idle' && this.phase.abort.signal.aborted
const resolvedTarget = wakingAfterAbort ? 'next-turn' : target
this.inbox.splice(resolvedTarget, Infinity, 0, [message])
if (wakeup) this.wakeDriver(wakingAfterAbort)
```

**设计要点**：`wakingAfterAbort` 在插入 inbox **之前**捕获——因为 splice 会同步触发 `session/event`，观察者可能重入 cancel，若此刻才判定会把唤醒消息错误分类。判定为真（唤醒输入撞上一个已 abort 的 activity）时，目标强制改为 `'next-turn'`：被取消的活动不能再接收下一步输入，只能等下一回合。

### 2.2 Inbox 的 splice/claim 语义（inbox.ts）

Inbox 是"可重放一次"的投影（inbox.ts:25）：构造时从 `session.events.slice(session.header.seedLength ?? 0)` 重放 `agent/inbox/spliced` 事件恢复出双列表 `{ 'next-turn': [], 'next-step': [] }`——**resume 后 inbox 从持久日志重建**。

- `mutate`（158-193）是核心：先对 start/deleteCount 做标准 splice 归一化，然后**先 `session.append('agent/inbox/spliced', …)` 落日志，再改内存投影**，最后发 `discarded`/`inserted` 通知。顺序反过来是有意的：同步观察者看到的是 splice 前的列表，可从归一化坐标重建被删消息。`validate`（203-219）校验坐标合法且**两条列表的消息 id 不重复**。
- `claim(target, turn)`（71-78）：**先清空整个 next-step 列表，再取一条 next-turn**——steering/inject 优先于 followup；随后对每条认领消息 `emit('agent/inbox/claimed', {message, turn})`。claim 的删除是纯删除（不触发 discarded 通知、不记 `outcome:'canceled'`）。
- `clear()`（58-61）：先 next-step 后 next-turn 各整条删除，日志记 `outcome:'canceled'`。

### 2.3 preStep() 完整顺序（agent.ts:225-243）

1. 断言 running；
2. `claimed = this.inbox.claim(target, position.turn)`——**认领发生在任何异步组装之前**，消息即刻出队；
3. `assembly = await this.loopCtx.systemPrompt.assemble(assembleContextFor(this, signal))`——`assembleContextFor` 把 `{agent, scope: agent, signal}` 一起传入，保证 agent 作用域的 prompt 贡献不会被静默漏掉；
4. `signal.throwIfAborted()`——组装可能耗时长，回来后先查取消；
5. `sections = renderContextSections(assembly)`、`context = this.runtimeContext.project(...)`——动态运行期上下文投影；
6. `dispatch.waterfall('agent/pre-step', { messages: claimed, ...position, signal }, 默认决策)`，默认决策是 `{ kind:'enter', messages: context === undefined ? claimed : [...claimed, context] }`——插件可改写 messages（含改空）或 `{kind:'reject'}`；
7. 再查 abort，最后把 `assembly` 附到 enter 决策上返回——`reject` 决策原样返回。

### 2.4 enter/reject 分支（turn 内 267-277）

- `reject` → `turnEnds = { kind: 'blocked' }`，`return false`（回合以 blocked 收尾；**已认领消息既不丢弃也不重发**）。
- enter 且 messages 为空：后续步为空则 `break`；**首步**为空则 `turnEnds = {kind:'completed'}` 并 return（被移除的唤醒消息或改写为空的 enter 仍占有初始回合边界，但不花一次模型调用）。

## 3. step() 内部逐段走读（agent.ts:332-401）

### 3.1 buildRequest（407-495）

1. **持久化 header 折叠**：`persistedHeader = session.requestHeader()`——session 维护的增量折叠。
2. **reasoningEffort 恢复规则**（422-426）：仅当持久化 header 的 provider/model 与实例声明的 route 完全一致、且该字段**不是** adapter 默认值（`adapterDefaults?.reasoningEffort !== true`）时恢复，否则置 undefined 让 adapter 重新解析。
3. **seedConfig**（428-437）：`requestHeaderLogged` 后走 `requestProposal(persistedHeader!)`（55-61：**剥离 adapterDefaults 标记过的字段**，让插件提案时看不到 adapter 填充的默认值）；否则是 `{route, reasoningEffort?, maxTokens?}`。两者都 `deepFreeze(structuredClone(...))`——克隆+冻结，提案不可变。
4. **`agent/request` waterfall**（438-441）：插件可整体替换配置。
5. 校验 provider/model 非空。
6. **prepareCall**（449-455）：`loopCtx.llm.prepareCall(proposedConfig, signal)`；**捕获 `NO_ADAPTER`**——中间件可能服务未注册路由，此时退回 `proposedConfig` 本身，由 `loopCtx.llm.stream` 兜底。
7. **header 组装**：`canonicalHeader({config, adapterDefaults?, system?, tools?})`（缺省空字段不出现）。
8. **`request/header` 增量落日志**（464-470）：首次必落（reason 按 initial/resume），之后仅当 `!headerEquals(baseline, header)` 才落 `'change'`。**header 折叠是 O(新事件) 的**，这里用 `headerEquals` 避免每次请求都刷一条日志。
9. **`request/context` 变更才落**（472-483）：provider/model/contextWindow 任何一项变化才 append（注册边界元数据，不参与请求重建）。
10. 最终 request（486-493）：`markAgentLoopRequest(deepFreeze({...}))`——**冻结 + 打标记**（invariant 依赖这个标记）。

### 3.2 流式执行与 chunk（343-351）

`stream = preparedCall?.stream(request) ?? this.loopCtx.llm.stream(request)`——有 adapter 注册走 prepared stream，否则走全局 llm 服务。逐 chunk：先 `signal.throwIfAborted()`，把 `assistant/chunk` append 进日志并记下 `seq`（`chunkSeqs`），同时 `assembler.push(chunk)`。**原始 chunk 全量入日志**（token 级重放保真）。

### 3.3 request-error 重试（353-371）

`finish.kind === 'error' | 'aborted'` 时走 `agent/request-error` waterfall（payload 含 provider/failure/retryPolicy/signal），默认 `undefined`（终端失败）。返回 `{kind:'retry'}` 则 `continue` 重新 buildRequest；否则 `throw new LlmError(...)`——保留事实、按结构化失败向上抛。

### 3.4 assistant/message 与工具提取（373-399）

`createAssistantMessage({content: assembler.blocks(), source: {provider, model, replayState?}})` 后 append `assistant/message`，携带 `surfaceOp:'append'` 与 `sourceEventSeqs: chunkSeqs`（**整条消息从 chunk 派生**，surface 把它折叠成一条）。`finish.kind==='max-tokens'` 提前返回 max-tokens。随后 `message.content.filter(block => block.type === 'tool-call')`——没有工具调用即 `completed`；有则 `executeToolCalls(...)`，`concluded ? {kind:'completed'} : null`（null 表示还有注入的下一步上下文）。

## 4. turn() 循环细节（agent.ts:246-330）

- **turn/start 落日志时机**：`turn = phase.turn + 1` 先算，**append 成功后**才 `phase.turn = turn`——事件先于状态生效，append 抛错则 `throwError`。
- **循环骨架**（263-301）：每次迭代 `step = phase.step + 1` → `preStep` → enter/reject 分支 → `step/start` append、`phase.step = step` → 逐条 append `user/message`（surfaceOp:'append'）→ `step(assembly)` → **max-tokens 粘性**更新（290：一旦某步触顶，后续正常完成的步**不得降级**回合结局）→ finally 里 `step/end`（step 抛错也落）。
- **`agent/turn-stopping` 串行检查点**（295-299）：仅当 `turnEnds` 已定 **且** `inbox.nextStep.length === 0` 时 `dispatch.serial('agent/turn-stopping', {turn, signal})`（**serial**=有顺序地逐个 await）。检查点后**重读 nextStep**：监听器若 `steer` 了新消息，`nextStep.length > 0` → 不 break，继续跑一步。
- **错误路径**（302-315）：`signal.aborted` → `turnEnds = {kind:'aborted', reason: signal.reason}` 并重抛；否则结构化失败——`LlmError` 保留 `failure`，其他错误 `errorChain(error)` 拍平。
- **finally 必落 turn/end**（316-322）：`session.append('turn/end', { turn, reason: turnEnds! })`——非空断言有注释背书"每个出口都赋值了回合结局"。
- **收尾**（324-329）：正常完成后 `if (!this.inbox.hasPending) return false`；否则**换新 AbortController**（新控制器让挂在旧控制器上的 latch 失效，活驱动器自己认领队列）、`wakeRequested=false`、`step=0`、`return true`——kick 循环进入下一回合。

## 5. 工具调度器（tool-calls.ts）

**目标**（文件头注释）：exclusive 调用形成屏障；parallel 调用用有界滚动池；**派发可重叠，但策略、结果、结果上下文保持模型顺序**；abort 或内部调度失败停止补充并排干已启动调用；abort 对未启动调用记录合成结果保证 replay 有效。

- **executeToolCalls**（59-101）：`agent = ctx.agents.requireInitiator()`——提交步的驱动器边界提供 initiating Agent；主循环**每次先提交再分类**（让注册表变化影响未启动调用）：`mode = ctx.tools.executionMode(first.exec).kind`，parallel 取 `planned.slice(next)` 整组，exclusive 取 `[first]` 单发屏障；`runGroup` 后 `next += consumed`，aborted 则对剩余全部 `appendSkippedToolCall` 并返回。
- **runGroup**（121-246）：`slots` 按组下标占位、`callSeqs` 记 `tool/call` 事件 seq 供结果引用。**commitReady**（146-160）是模型顺序的关键：`committed` 只在**连续**已定槽上前进——结果按模型顺序 finalize/finish → `appendToolResult`（`sourceEventSeqs:[callSeq]`）→ 每个 `additionalContexts` 走 `acceptContext`（**回注到下一步边界**）→ `concluded ||= result.concludesTurn === true`。**startCall**（164-196）：先 append `tool/call` 拿 seq，再 `prepare` 三分支：`dispatch`（异步派发）、`post-result`/`final-result`（同步占槽）。
- **fillPool**（198-213）：`inFlight.size < maxParallelToolCalls` 时启动；**并行组内每个后续调用重新分类**（注册表变化可在池中造出屏障，留给调用者下一个屏障组）。
- **主循环**（218-235）：`fillPool` → `Promise.race(inFlight.values())` 取最先 settled、删槽、`commitReady`、查 abort、再 `fillPool`。**调度失败**：`throwSchedulerFailure` 停止新派发，`Promise.allSettled` 排干已启动派发后抛出首个失败——**不伪造结果**。
- **abort 排干**（237-242）：未启动调用全部 `appendSkippedToolCall`——合成 `Error: tool call aborted before dispatch` 的 `tool/result`，让 replay 依然闭合。
- **容错细节**：`parseArguments` 保留非法 JSON 为文本、空输入映射 `{}`。

## 6. 错误与取消

- **throwError**（203-208）：`emit('agent/error', {turn, step, error})` 后**再 throw**——`agent/error` 是**报告边界**，抛出是为了让 `kick` 的 catch 统一收口；`turn/end` 的 error/aborted 结局在 finally 里照常落盘。
- **cancel(cause, options)**（134-140）：`!keepInbox` 时先 `inbox.clear()`（落 durable canceled splice）并把非 idle 相的 `wakeRequested` 清掉——**清空优先于 abort**；然后 `phase.abort.abort(cause)`。语义：首个 cause 对当次活动生效；无活动时是 no-op，且**不会武装后续工作**；`keepInbox` 保留队列与 steering，仅中止当前回合。
- **whenIdle**（195-200）：`do { await (activity = this.activityDone) } while (activity !== this.activityDone)`——防竞态循环：观察到的驱动器退休前可能又有新活动顶上来，二次比对保证稳定快照。
- **runMaintenance**（142-162）：非 idle 直接同步抛错；置 maintenance 相、跑 `job(maintenance.abort.signal)`，finally 回 idle 并**在 `wakeRequested && inbox.hasPending` 时补唤醒**（维护期间到达的唤醒被 latch，收敛后重放）。
- **wakeDriver 的 latch 规则**（172-193）：非 idle 时，仅当 `reason?.kind !== 'disposed'`（disposed 取消的驱动器**绝不** latch）且（maintenance 或 wakeAfterAbort）才置 `wakeRequested`；活驱动器自己认领队列无需 latch。idle 时创建新 running 相并以 `withInitiator(this, () => this.kick())` 启动。**"空闲时发送的唤醒总是打开回合边界，即使消息随后被清掉；只有 latch 重放会被 hasPending 抑制"**（cancel-convergence wake latch 修复）。

## 7. AgentLoop 工厂（index.ts）

- **FactoryOwnership**（40-90）：`accepting` 开关 + teardown AbortController + `waitWhileActive` + `liveAgents`/`startupTasks` 追踪；`dispose` 先拒绝新活再并行拆所有活 agent 与启动任务。
- **prepare（两段式第一段，459-578）**：校验 → **三源融合 abort**（callerSignal + factory teardown + owner effect 各自 abort，注册在**任何资源存在之前**）→ 构造 `ReactLoopAgent` → 返回 `{agent, signal, publish, dispose}`。`dispose` **memoized**（`disposing ??= ...`，多个竞态 owner 共享一次 quiescence）：abort → `cancel({kind:'disposed'})` → `whenIdle()` → `scope.dispose()` → detachAgent/detachSession。
- **publish（第二段，556-569）**：`sessions.enter(session)` → `agents.enter(agent)` → `sessions.announce` → `agents.announce` → `emitAgentEvent('agent/session-start', {source})`——**每个边界之间都有 assertLive 复查**（同步监听器可能已启动拆除）。setup 期间 agent 未发布，观察者永远看不到半配置的世界。
- **create/createAgent/resume**：`create` 用 `SessionPreparation.create` 包住 prepare+publish，失败 `void prepared.dispose()` 回滚。`createAgent` 多 setup 窗口：`setupCommit = await raceAbort(setup?.(agent.ctx), ...)` 后 `setupCommit?.commit()`（**setup 的同步提交点**）再 publish；任何一步失败 `await prepared.dispose()`。`resume` 要求 sessionPersistence；`resumeWith` 用 `AbortSignal.any([...])` 融合，被放弃的 `persistence.prepare` 结果会 `[Symbol.dispose()]` 释放（取消后到达的值不泄漏）。
- **声明式 agents[]**（355-381）：无 `resumeSessionId` → 自动生成 sessionId；有 sessionPersistence 走 `restoreOrCreateConfigured`（先等旧同 id 生命周期退出注册表，resume 失败时用 `persistence.list()` 区分"真不存在"→create 全新 与"损坏/后端失败"→保持响亮失败）。身份冲突在 `validateConfiguredAgents` 预检。

## 8. 值得注意的实现细节 / 设计巧思（14 条）

1. **融合派发器预构建**（agent.ts:86）：构造时建一次，`emit/serial/waterfall` 全部复用同一 carrier，热路径**零分配**；payload 用 `{...payload, agent}` **spread 在前**，结构上合法的 `agent` 字段永远无法覆盖注入主体。
2. **wakingAfterAbort 提前捕获**（agent.ts:116）：在 inbox 插入前分类，防 splice 观察者重入 cancel 导致错误归类；被 abort 活动唤醒的输入强制转 `'next-turn'`。
3. **requestProposal 剥离 adapter 默认值**（55-61）：插件提案 `agent/request` 时看不到 adapter 填充的 effort/maxTokens，只能看到调用方真实声明的配置。
4. **max-tokens 粘性**（287-290）：回合内一旦触顶，后续正常完成的步不得把结局降级为 completed——回合结局是"最坏情况"记录。
5. **turn/end 的 finally + 非空断言兜底**（316-322）：blocked/空首步等所有早期出口都在 finally 落 `turn/end`，日志永不缺回合闭合事件（这是 checkpoint policy 与 resume 的前提）。
6. **每回合换 AbortController**（325-327）：新回合拿干净信号，旧控制器上的 latch 自然失效。
7. **RuntimeContextProjection 去重投影**（runtime-context.ts:13,64-75）：仅当文本变化才产出快照；清空时写固定句；`retained` 三态（undefined=从未有快照 / null=已清除 / {seq,text}=保留中），被 surface replace 覆盖即置 null。
8. **request/header 与 request/context 的"变更才落"**（464-483）：日志体积与折叠成本都压到 O(变化)。
9. **Inbox mutate 先落日志再改投影**（inbox.ts:186-192）：同步观察者可读 pre-splice 列表重建被删消息；claim 的删除不记 canceled。
10. **claim 的优先级**（inbox.ts:71-78）：先整条清 next-step 再取一条 next-turn——steering/inject 永远先于 followup，且每个回合边界只消费一条 followup。
11. **invariant 伴生插件**（invariant.ts:21-54）：`llm/stream` 前置拦截 loop 标记的请求，校验 `Object.isFrozen`、sessionId 存活、`JSON.stringify(messages) === JSON.stringify(session.deriveMessages())`（**日志重建脱同步检测**）、header 各字段逐项比对；`prepend:true` 防止短路的重放监听器掩盖检查。
12. **工具调度结果模型顺序提交**（tool-calls.ts:146-160）：派发并发但提交按连续槽扫描，模型顺序永不乱；`additionalContexts` 经 acceptContext 回注 next-step 收尾。
13. **工厂拆除先于资源注册**（index.ts:479-520）：disposer 建在可变槽上、在任何资源存在前注册，卸载竞态不会泄漏；`disposing ??=` 让所有竞态 owner 共享一次 quiescence。
14. **raceAbort/raceAbortCall 的 abandoned 释放**（93-130）：取消后迟到的值通过 `releaseAbandoned` 回调 `[Symbol.dispose()]`，不泄漏句柄。

## 9. agent-loop 精读速查表

| 概念 | 位置 | 一句话解释 |
|---|---|---|
| Phase 状态机 | agent.ts:38-46 | idle/maintenance/running 判别联合，running 才对外可见为运行中 |
| setPhase 状态发布 | agent.ts:104-111 | 仅状态翻转时 emit `agent/status`（目的状态） |
| send 的 abort 重分类 | agent.ts:113-120 | 唤醒撞上已 abort 活动时强制转 next-turn，分类在插入前捕获 |
| followup/steer/inject | agent.ts:122-132 | 三入口=send 的 next-turn/next-step × wakeup 真/真/假 |
| Inbox splice/claim | inbox.ts:139-193 / 71-78 | 先落日志再改投影；claim 先清 next-step 再取一条 next-turn |
| preStep 顺序 | agent.ts:225-243 | claim→assemble→render→runtime-context→pre-step waterfall |
| enter/reject 分支 | agent.ts:267-277 | reject→blocked 回合；空首步→completed 不花模型调用 |
| buildRequest | agent.ts:407-495 | 折叠 header→剥离 adapter 默认→agent/request waterfall→prepareCall→增量落日志→冻结标记请求 |
| request-error 重试 | agent.ts:353-371 | 流失败走 waterfall，仅 `{kind:'retry'}` 续跑，否则结构化抛 LlmError |
| turn/start 与 step/end | agent.ts:255-259, 291-293 | 事件先于状态生效；step/end 在 finally 兜底 |
| max-tokens 粘性 | agent.ts:287-290 | 触顶后后续 completed 不降级回合结局 |
| turn-stopping 检查点 | agent.ts:295-299 | serial 派发后重读 nextStep，监听器 steer 则继续下一步 |
| turn/end 必落盘 | agent.ts:316-322 | 所有出口经 finally 落 reason（含 error/aborted） |
| 工具调度分组 | tool-calls.ts:84-101 | exclusive 单发屏障，parallel 整组滚动池，每次先提交再分类 |
| 模型顺序提交 | tool-calls.ts:146-160 | committed 连续槽扫描，结果/上下文按模型顺序落盘 |
| abort 合成结果 | tool-calls.ts:237-259 | 未启动调用记 `aborted before dispatch` 结果，replay 闭合 |
| throwError 报告边界 | agent.ts:203-208 | 报告一次 agent/error 后抛出，由 kick 围堵 |
| cancel 语义 | agent.ts:134-140 | 先清 inbox（keepInbox 可免）再 abort，首 cause 生效 |
| whenIdle 防竞态 | agent.ts:195-200 | do-while 比对 activityDone 直到稳定 |
| runMaintenance | agent.ts:142-162 | 非 idle 同步抛错；结束后回 idle 并重放唤醒 |
| wakeDriver latch | agent.ts:172-193 | 仅 maintenance/abort 后 latch，disposed 绝不 latch，idle 必开回合 |
| prepare/publish | index.ts:459-578 | 两段式：先建 scope+机器+注册拆除，再 enter/announce/session-start |
| setup 提交点 | index.ts:625-645 | setup 返回的 commit() 在发布前同步校验，失败整体回滚 |
| 声明式 agents[] | index.ts:355-381 | 无持久化直接 create；有则 restore-or-create，resume 失败按 exists 分流 |
| 运行期上下文投影 | runtime-context.ts:25-76 | 仅文本变化才产快照，清空写固定标记，replace 后置 null |
| invariant 请求校验 | invariant.ts:21-54 | 冻结/会话存活/消息与派生一致/header 逐项比对 |

**事实与推断标注**：除明确标注【推断】的处理（如 §2.4 对"已认领消息不回收"的语义归纳来自 runtime-types.ts 注释而非 agent.ts 直述；§4 末尾 abort 竞态窗口的推演）外，上述内容均为代码与注释的直读事实。建议读者交叉核对两处：① `wakeDriver` 的 latch 分支与 `turn()` 325-327 的"新控制器使 latch 失效"注释的配合（涉及 cancel-convergence 竞态）；② `invariant.ts` 依赖 `ctx.invariants` 服务，属可选伴生插件，未加载时该层校验不生效。
