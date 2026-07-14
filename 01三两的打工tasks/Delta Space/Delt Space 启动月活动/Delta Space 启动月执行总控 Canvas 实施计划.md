# Delta Space 启动月执行总控 Canvas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Do not dispatch subagents for this task.

**Goal:** 把已确认的三步制启动月设计落地为可在 Obsidian 直接打开的执行总控 Canvas，并同步修订现有活动安排文档。

**Architecture:** 以一张横向 Freeform Canvas 为主交付，中央是 Prologue、Step 1、Step 2、Step 3、End 主轴，上下布置品牌、参与者、空间、组织、指标和来源支撑区。现有 Markdown 作为可检索的文字版权威说明，与 Canvas 使用同一套三步制结构。

**Tech Stack:** Obsidian Canvas JSON、Obsidian Markdown、PNG 板书附件、PowerShell JSON 验证。

---

### Task 1: 固化板书来源附件

**Files:**
- Create: `01三两的打工tasks/Delta Space/Delt Space 启动月活动/attachments/delta-space-launch-month-whiteboard-2026-07-14.png`
- Source: `C:/Users/MS66/AppData/Local/Temp/codex-clipboard-0a57139e-4959-49fb-aaf4-bc726d8f60cb.png`

- [x] **Step 1: 创建附件目录并复制原图**

```powershell
$target = '01三两的打工tasks/Delta Space/Delt Space 启动月活动/attachments'
New-Item -ItemType Directory -Force $target | Out-Null
Copy-Item -LiteralPath 'C:\Users\MS66\AppData\Local\Temp\codex-clipboard-0a57139e-4959-49fb-aaf4-bc726d8f60cb.png' -Destination "$target\delta-space-launch-month-whiteboard-2026-07-14.png"
```

- [x] **Step 2: 校验附件与原图字节一致**

```powershell
Get-FileHash 'C:\Users\MS66\AppData\Local\Temp\codex-clipboard-0a57139e-4959-49fb-aaf4-bc726d8f60cb.png' -Algorithm SHA256
Get-FileHash '01三两的打工tasks\Delta Space\Delt Space 启动月活动\attachments\delta-space-launch-month-whiteboard-2026-07-14.png' -Algorithm SHA256
```

Expected: 两个 SHA256 值完全一致。

### Task 2: 创建执行总控 Canvas

**Files:**
- Create: `01三两的打工tasks/Delta Space/Delt Space 启动月活动/Delta Space 启动月活动筹备总控.canvas`

- [x] **Step 1: 生成 Canvas JSON**

Canvas 顶层只包含 `nodes` 和 `edges`。节点按以下空间区域建立：

```text
上方：品牌与传播｜参与者与资源
中央：Delta Chapter 0 → Prologue → Step 1 → Step 2 → Step 3 → End
下方：空间与现场｜组织与保障｜衡量与决策
右下：来源与转写存疑
```

每个 Step 必须分别包含目的、活动、产出节点；`Link` 节点必须位于 Step 2 分组内，并连接伙伴匹配、外部资源、Office Hour 与验证计划。板书使用 `file` 节点，飞书妙记使用 `link` 节点。

- [x] **Step 2: 解析 JSON 并验证 Canvas 基本结构**

```powershell
$canvasPath = '01三两的打工tasks\Delta Space\Delt Space 启动月活动\Delta Space 启动月活动筹备总控.canvas'
$canvas = Get-Content -Raw -Encoding UTF8 $canvasPath | ConvertFrom-Json
if (-not $canvas.nodes -or -not $canvas.edges) { throw 'Canvas 缺少 nodes 或 edges' }
if (($canvas.nodes.id | Sort-Object -Unique).Count -ne $canvas.nodes.Count) { throw '节点 ID 重复' }
if (($canvas.edges.id | Sort-Object -Unique).Count -ne $canvas.edges.Count) { throw '连线 ID 重复' }
```

Expected: 命令退出码为 0。

- [x] **Step 3: 验证节点引用、主结构与 Link 归属**

```powershell
$ids = @{}; $canvas.nodes | ForEach-Object { $ids[$_.id] = $true }
$bad = $canvas.edges | Where-Object { -not $ids[$_.fromNode] -or -not $ids[$_.toNode] }
if ($bad) { throw '存在指向缺失节点的连线' }
$raw = Get-Content -Raw -Encoding UTF8 $canvasPath
@('Step 1 — Demand & Discuss','Step 2 — Build & Link','Step 3 — Verification & Review','End — Closing & Retention') | ForEach-Object { if (-not $raw.Contains($_)) { throw "缺少主节点：$_" } }
if ($raw -match 'Week 1|Week 2|Week 3|Week 4') { throw 'Canvas 仍包含四周制' }
```

Expected: 命令退出码为 0。

### Task 3: 同步修订活动安排 Markdown

**Files:**
- Modify: `01三两的打工tasks/Delta Space/Delt Space 启动月活动/Delta Empower 启动月活动安排.md`

- [x] **Step 1: 用三步制替换四主题周**

文档必须改为以下主结构：

```markdown
## 启动月主线

### Prologue：启动与招募
### Step 1 — Demand & Discuss
### Step 2 — Build & Link
### Step 3 — Verification & Review
### End — Closing & Retention
```

并保留空间配置、执行保障、衡量指标、风险和来源；删除 Week 1／2／3／4 与“每周五市集”等未经本次讨论确认的固定节奏。

- [x] **Step 2: 添加 Canvas 与来源链接**

文档顶部加入：

```markdown
> [!map] 执行总控图
> [[Delta Space 启动月活动筹备总控.canvas]]
```

来源区加入板书附件和飞书妙记链接。

- [x] **Step 3: 检查 Markdown 不再含四周制**

```powershell
rg -n 'Week [1-4]|Week1|Week2|Week3|Week4|四大主题周' '01三两的打工tasks\Delta Space\Delt Space 启动月活动\Delta Empower 启动月活动安排.md'
```

Expected: 无匹配，`rg` 返回 1。

### Task 4: 完整验收与提交

**Files:**
- Verify: `01三两的打工tasks/Delta Space/Delt Space 启动月活动/Delta Space 启动月活动筹备总控.canvas`
- Verify: `01三两的打工tasks/Delta Space/Delt Space 启动月活动/Delta Empower 启动月活动安排.md`
- Verify: `01三两的打工tasks/Delta Space/Delt Space 启动月活动/attachments/delta-space-launch-month-whiteboard-2026-07-14.png`

- [x] **Step 1: 检查 Canvas 节点边界没有重叠**

对所有非 group 节点执行矩形相交检查；若两个节点的矩形区域相交则失败。Group 节点作为背景容器，不参与重叠失败判断。

- [x] **Step 2: 对照设计说明逐项验收**

确认品牌、招募、资源、空间、传播、团队、预算、指标、风险、核心留存、边缘留存、板书来源和妙记来源均已出现。

- [x] **Step 3: 检查本次差异只触及目标目录**

```powershell
git status --short -- '01三两的打工tasks/Delta Space/Delt Space 启动月活动'
git diff --check -- '01三两的打工tasks/Delta Space/Delt Space 启动月活动'
```

Expected: 只出现计划内文件，`git diff --check` 无错误。

- [ ] **Step 4: 提交交付物**

```powershell
git add -- '01三两的打工tasks/Delta Space/Delt Space 启动月活动/Delta Space 启动月活动筹备总控.canvas' '01三两的打工tasks/Delta Space/Delt Space 启动月活动/Delta Empower 启动月活动安排.md' '01三两的打工tasks/Delta Space/Delt Space 启动月活动/attachments/delta-space-launch-month-whiteboard-2026-07-14.png' '01三两的打工tasks/Delta Space/Delt Space 启动月活动/Delta Space 启动月执行总控 Canvas 实施计划.md'
git commit -m 'docs: 整理 Delta Space 启动月执行总控图'
```
