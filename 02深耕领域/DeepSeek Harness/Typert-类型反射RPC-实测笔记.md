# Typert 系统原理实测拆解笔记

> 调研日期：2026-08-15 ｜ 源码：`D:\deepseek-harness`（`0.1.0-rc.5`）｜ 领域：`02深耕领域/DeepSeek Harness`
> 上级：[[DeepSeek-Harness源码拆解报告]] ｜ 索引：[[总览]]
> 标注：【事实】= 读到源码/产物原文；【实测】= 实际跑出来的；【推断】= 由源码推导；【未验证】= 没跑通/没验证。

## 0. 一句话结论

Typert 是"构建期代码生成 + 运行时注册表 + 共享 RPC 通道"三件套：生成器从 Host 的 `ts.Program` 里**同时做 AST 装饰器识别和 TypeChecker 语义类型图提取**，产出 Host 本地反射与 Host-for-Client 投影两类文件；运行时双方各持一份 `InvocationDescriptor`（从不上线），wire 上只走 `POST /api/<namespace>/<method>` + `{args}`；Client 侧拿到的是 `Object.defineProperty` getter 返回的**真实闭包函数**，与 Proxy 无关。

## 1. 全链路架构图

```
业务源码 (Host)                           构建期                           运行时
GoalService extends TypertRemoteService
  @Remote('create') remoteExportCreate(...)
        │ ①tsc -b tsconfig.host.json 编译
        ▼
Host tsdown --env.DSH_BUILD_FACE host
  └─ plugins:[typertPlugin({mode:'workspace',faces:['host']})]
        │ ②writeBundle 钩子跑 WorkspaceTypertGenerator
        ▼
lib/typert.host.{js,d.ts}   ──► Loader(typert-loader) 动态 import TYPERT 清单
                                      validateTypertManifest → ctx.typert.register()
lib/typert.remote-client.{js,d.ts,d.ts.map} ──► api-remotes/client: import goalsRemote
                                                      ctx.remote.$mount(goalsRemote)
        ▼ ③tsc -b tsconfig.client.json 消费 remote-client.d.ts（声明合并进 ctx.remote 类型）
Client 源码 ctx.remote.goals.create(agentId, request, signal?)
        ▼
ClientRemoteService.invoke → codec.parse → connection.rpc.call('/api','goals/create',{args},signal)
        ▼ HTTP POST /api/goals/create
Connection Host 侧共享 trust → TypertGateway.intercept 判断 endpoint 归属
        ▼
ctx.typertGateway.invoke({namespace,method,args,signal})
  → 查 ctx.typert.local 描述符 → assertExactArguments → Zod 解码每个参数
  → lookup provider 把 agentId 解析成活 Agent → Reflect.apply(receiver,'remoteExportCreate',[agent,request])
  → result codec 校验 → 走既有 RPC envelope 返回
```

## 2. 生成器到底"分析"什么【事实】

核心在 `packages/typert/generator/src/analyzer.ts`（3113 行），三路输入：

1. **AST 装饰器扫描**：遍历类成员识别 `@Remote` / `@Remote('name')` / `@RemoteScope('agent','name')`，并做严格语法校验：public 实例方法、非泛型、参数必须是简单 identifier、无 rest/默认值/解构、`signal: AbortSignal` 必须是**全局类型**且为最后一个参数。
2. **ts.Program 语义提取**：用 TypeChecker 解析方法签名与参数/返回类型；解析 `TypertRemoteService` 继承（`super(ctx,'goals')`）或 `typertRemote = bindTypertRemote(this,key)` 字段绑定出 service/namespace；按模块字符串扫全 Program 里的 `declare module '@deepseek-ai/dsh-typert-protocol'` 声明合并（`TypertLookupMap`/`TypertContextMap`）。
3. **类型图（TypeGraph）**：把边界类型 `convertType` 成编译器无关的 `TypeNodeModel`，再用 TypeChecker 求值后的 `ts.Type` 走 `assertRemoteJsonType` 做 JSON 合法性断言（拒绝 any/unknown、bigint、symbol、class 实例、callable、symbol 键），产出可渲染 Zod 的 codecType。模型在 `model.ts`，渲染在 `emitter.ts`+`renderer.ts`。

**产物清单与消费方**【事实】（写进各业务包自己的 `lib/`）：

| 文件 | 消费方 | 内容 |
|---|---|---|
| `typert.host.js` | Loader | `export const TYPERT = {package, face:'host', schemas, invocations, model}` |
| `typert.host.d.ts` | Host 类型 | 实测只有 `export declare const TYPERT: unknown`——Loader 负责窄化校验 |
| `typert.remote-client.js` | api-remotes | `export const TYPERT_REMOTE = {package, descriptors}` + default 导出 |
| `typert.remote-client.d.ts` | Client 类型 | `declare module '@deepseek-ai/dsh-typert-protocol'` 声明合并 |
| `typert.remote-client.d.ts.map` | 编辑器 | 生成属性映射回 Host 源码方法 |

生成时机【事实】：根 `build:lib:host = tsc -b tsconfig.host.json && tsdown --env.DSH_BUILD_FACE host`，Host tsdown 的 `writeBundle` 里生成；Client 阶段不跑生成器。

## 3. @Remote vs @RemoteScope、lookup/context 的 wire 机制

**@Remote（direct）**【事实】：`@Remote('create')` 挂在 `remoteExportCreate` 上时，描述符 `method:'create'` + `implementation:'remoteExportCreate'`（别名）。Host 参数 `agent: Agent` 命中 `TypertLookupMap.agent`（agent 包声明），生成参数 `{name:'agent', wire:'agentId', source:'lookup', lookup:'agent'}`——**wire 字段名来自 lookup 声明的 provider 约定**。运行时 provider 由 AgentRegistry 构造时 `ctx.typert.lookups.register('agent',{...})` 注册。

**@RemoteScope（context）**【事实】：描述符 `invocation:{kind:'context', context:'agent', wire:'agentId', codec}`——wire 身份是 receiver 的独立字段，不进 parameters。fixture 实测：`@RemoteScope('agent') rename` 只进 `TypertRemoteScopeMap` 的 `'agent:goals/rename'`，不进 `TypertRemoteMap`。而 @Remote 且恰好一个 lookup 参数 + 同名 ContextMap + wire 类型一致时额外写 `scope:{context,wire}`，同时生成根签名（带 agentId）和 scoped 签名（省略 agentId）。

**scope 的客户端绑定**【事实】：`packages/client/runtime/src/client/index.ts:196` 注册 `ctx.typert.contexts.registerClient('agent',{ identity: candidate => sessions.scopeOf(candidate) })`；`agentCtx.remote.goals.create(request)` 时 getter 捕获调用方 ctx，binder 从 ctx 取 SessionId 填入 `scope.wire` 位置。

## 4. Gateway 运行时调用流程【事实】

`packages/api/gateway/src/index.ts`（685 行）：构造时 `ctx.connection.rpc.intercept('/api', claimsEndpoint, dispatchRpc, {authority:'trusted-host'})`。`claimsEndpoint` 只认两段式 endpoint，命中 `typert.local.get` 或 `hasSeen`（历史严格定义，撤了也不许回退 SRC）就接管，否则走 API Proxy 遗留通道。

- **SRC 开发回退**：`resolveSrcDescriptor` 扫 Cordis `ctx.reflect.props` 找 active service → `Reflect.get(original,'typertRemote')` 取 binding → `remoteMethods(original)`（协议包 WeakMap 里装饰器 initializer 记录的 marker）→ `methodParameterNames` 解析参数名 → 结合 lookup definitions 派生弱描述符（codec 全是 `src-json`）。
- **严格路径**：`assertExactArguments`（args 键集与描述符 wire 集完全一致）→ `resolveReceiverContext`（context 模式先解析 scoped Context）→ `resolveParameter`：`decode()` 先 `codec.schema.parse`（Zod）再 `assertJsonValue` → lookup 调 provider（wire 字段、wireTypeSymbol 必须一致，否则 `provider-mismatch`）→ `Reflect.apply(receiver, implementation, args)`，有 cancellation 时把 `request.signal ?? NEVER_ABORTED_SIGNAL` 追加到业务参数末尾（**signal 永远不进 wire args**）→ result codec 校验。
- 错误分类：进程内保留 `TypertGatewayError.code`；过 RPC 边界折叠成 `{code:'internal'}`，只有 `cancelled` 和 `TypertLookupFailure` 保留身份。

## 5. Client 侧"具体函数非 Proxy"如何实现【事实】

`packages/api/gateway/src/client/index.ts`：`ctx.remote` 是 `ClientRemoteService`；`$mount(contribution)` 先把描述符注册进 `ctx.typert.remotes`，再为每个 namespace 用 `ctx.plugin({name:'remote.<namespace>'})` 建一个 **Cordis 子服务**；`RemoteNamespaceService.install` 对每个方法 `Object.defineProperty(this, method, {get(){...}})`，getter 返回**每次调用新建的闭包** `(...args)=>this.invokeRemote(direct, scoped, callerCtx, args)`——真实函数、捕获调用时 ctx；卸载时 `Reflect.deleteProperty` 删属性并 abort 该 namespace 的 `AbortController`，旧句柄再调用返回 `withdrawn`。`invoke` 里 `AbortSignal.any([token.abort.signal, callerSignal])` 合并挂载生命周期与调用方取消。类型侧靠 `typert.remote-client.d.ts` 的 `declare module` 合并进 `TypertRemoteNamespaceMap`。

## 6. 实测产物（goal 包，真实文件）【事实】

`packages/goal/goal/lib/typert.remote-client.d.ts`（节选）：
```ts
interface TypertRemoteNamespace$676f616c73 {   // 'goals' 的 UTF-8 hex
  create: (agentId: SessionId, request: CreateGoalRequest) => Promise<RemoteResult<CreateGoalResult>>
}
interface TypertRemoteMap { 'goals/create': (...) => Promise<RemoteResult<CreateGoalResult>>; ... }
interface TypertRemoteScopeMap {
  'agent:goals/create': (request: CreateGoalRequest) => Promise<RemoteResult<CreateGoalResult>>; // 省略 agentId
  ...
}
```
`typert.remote-client.js` 的 create 描述符（节选）：
```js
{ id: '@deepseek-ai/dsh-goal#goals/create', service:'goals', namespace:'goals', method:'create',
  implementation:'remoteExportCreate', invocation:{kind:'direct'},
  scope:{context:'agent', wire:'agentId'},
  parameters:[ {name:'agent',wire:'agentId',source:'lookup',lookup:'agent',
                codec:{mode:'strict',typeSymbol:'@deepseek-ai/dsh-session/types#SessionId',
                       schema: z.intersection(z.string(), z.unknown())}},
                {name:'request',wire:'request',source:'json',
                 codec:{mode:'strict',typeSymbol:'@deepseek-ai/dsh-goal/client#CreateGoalRequest',
                        schema: z.object({'objective':z.string().readonly(),
                                          'maxGoalRounds':z.number().readonly().optional()})}} ],
  result:{mode:'strict',typeSymbol:'@deepseek-ai/dsh-goal/client#CreateGoalResult',...},
  sourceLocation:{file:'packages/goal/goal/src/index.ts',line:586,column:3} }
```
d.ts.map（单行 JSON）：每个生成属性映射回 Host 源码方法名。`typert.host.js` 的 `TYPERT.model.services` 把**整个公开类面**都录了（含非 Remote 方法），Remote 方法在 signature 文本里带 `@Remote('edit')` 前缀。

## 7. 生成器实测（实际跑通的）【实测】

用 tsx 加载 `workspace.ts` 对 `packages/typert/generator/tests/fixtures/remote-model` 执行 `generate(['@fixture/remote'],['host'])`，一次成功。fixture 里 `@Remote create(agent, request, signal: AbortSignal)` 生成：参数 codec `z.string()`（AgentId 是纯 branded string）、**`cancellation:{parameter:'signal'}`**、scope 投影；DTS 里 scoped 签名带 `signal?: AbortSignal`。`@RemoteScope('agent') rename` 生成 `invocation:{kind:'context',context:'agent',wire:'agentId',...}` 且只进 ScopeMap。【推断】goal 的 SessionId 是 phantom-brand 所以是 `z.intersection(z.string(), z.unknown())`（声明含 `& {}` 类约束）。

## 8. 端到端链（goal create）【事实+推断】

`remoteExportCreate(agent, request)`（Host 源码 585 行）→ 产物描述符 → Client 类型 `ctx.remote.goals.create(agentId, request)` → 闭包组装 `{args:{agentId, request}}` → `connection.rpc.call('/api','goals/create',{args})` → POST → Gateway Zod 校验 → `lookups.get('agent')`（api-remotes 的 `agentFor`：复用活 Agent、冷 session 去重 resume、子代理身份抛 `agent-busy` 围栏）→ `Reflect.apply(goalService,'remoteExportCreate',[agent,request])` → result codec 校验 → RPC envelope 返回。（**未验证**：没实际起 Host+Client 发真实 HTTP 请求，此链为源码+文档+测试推导。）

## 9. 边界与设计取舍【事实/推断】

- **只做一元调用**：session 事件流、增量、投影走别的协议，不许伪装成 Remote 进描述符。
- **两侧不同 ts.Program 的原因**：各自 augment Cordis `Context`（Host 有 `ctx.typert`，Client 有 `ctx.remote`）；remote-client.d.ts 只引用公共 type-only 子路径，不进 Host 实现/Service 类。仓库里没有 `typert.client.*` 产物【事实】：根 tsdown 只传 `faces:['host']`。
- **Proxy 的取舍**：文档写明"Proxy remains an implementation option"，当前用 getter+闭包，因为类型与反射全部来自生成物。
- **严格性优先**：`hasSeen()` 让撤掉的严格端点宁报 `definition-unavailable` 也不回退 SRC；lookup 的 wire 声明在 provider 卸载后保留，防止 wire 值被当普通 JSON。
- **构建序依赖**：`typecheck`=build:lib:host 先行，Client tsc 依赖 remote-client.d.ts；`api/remotes` 是全仓唯一 split-face 包。

## 10. 关键文件清单（10 个）

1. `packages/typert/generator/src/analyzer.ts` — 装饰器+Program+类型图分析核心（3113 行）
2. `packages/typert/generator/src/model.ts` — 编译器无关模型
3. `packages/typert/generator/src/emitter.ts` — 产物渲染（Zod/d.ts/d.ts.map）
4. `packages/typert/generator/src/workspace.ts` — 编排+exports/files 校验
5. `packages/typert/generator/src/tsdown-plugin.ts` — tsdown 集成（writeBundle 生成）
6. `packages/typert/protocol/src/types.ts` — InvocationDescriptor/TypertCodec/Registry 契约
7. `packages/typert/protocol/src/index.ts` — Remote/RemoteScope 装饰器 + WeakMap marker
8. `packages/typert/registry/src/service.ts` — ctx.typert 四注册表（local/remotes/lookups/contexts）
9. `packages/api/gateway/src/index.ts` — Host 分发（intercept、SRC、lookup、Reflect.apply）
10. `packages/api/gateway/src/client/index.ts` — Client Remote（$mount、namespace 服务、具体函数）
（备选：`packages/api/remotes/src/agent-lookup.ts`、`packages/typert/loader/src/index.ts`、`packages/core/agent/src/index.ts`、根 `tsdown.config.ts`）

## 11. 实测过程记录

读了 4 篇文档（api-gateway.md 全文、typert.md、两份 agent note）；生成器 9 个源文件（analyzer 3113 行全文、model、emitter、workspace、tsdown-plugin、renderer 前 100 行、index）；protocol 2 文件、registry service 全文、loader 全文；gateway 2 文件、remotes 3 文件；goal 产物 5 文件全文 + goal src/index.ts 的 GoalService（177-592 行）；grep 全仓 `TypertLookupMap`/`TypertContextMap`、`lookups.register`/`configure`、`typertPlugin`；读根 package.json scripts 与 mtime 核对生成时序；最后跑通一次 fixture 级生成。**未验证**：全量 `build:lib`、真实 HTTP /api 往返、Client 侧实际挂载调用。
