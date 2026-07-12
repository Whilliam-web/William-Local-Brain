# Delta X × 未来学习中心微信公众号推文 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将一篇以 Delta X 为唯一叙事主角、准确说明其与浙江大学未来学习中心关系的微信公众号推文写入既定 Markdown 文档。

**Architecture:** 保留目标文档已有 YAML 元信息，在其后写入可直接编辑和发布的完整推文。文章从 Delta X 的品牌问题意识切入，以未来学习中心和世界数字教育大会作为场景与窗口，最后回到 Delta X 的行动、价值和开放邀请。

**Tech Stack:** Markdown、Obsidian YAML front matter、PowerShell 只读校验、Git 单文件提交。

---

### Task 1: 写入品牌主角型推文

**Files:**
- Modify: `01三两的打工tasks/迭代未来管培生工作内容/文案work Stuff/Delta X × 未来学习中心推文.md`
- Reference: `docs/superpowers/specs/2026-07-12-delta-x-future-learning-center-wechat-design.md`

- [ ] **Step 1: 核对并保留目标文档元信息**

读取目标文件，确认 YAML 中的 `type`、`status`、`created`、`project`、`updated` 与 `tags` 保持不变，正文从第二个 `---` 之后开始。

- [ ] **Step 2: 写入完整正文**

正文按以下六段逻辑连续成文：

1. 用“校园不缺想法，稀缺的是走向真实需求与市场验证的路径”引出 Delta X。
2. 明确 Delta X 由浙大学生自主发起，关注中国年轻人原生创新与 PMF 商业闭环，聚焦 AI 应用落地。
3. 使用已确认的正式关系口径：Delta X 是浙江大学启真交叉学科创新创业实验室创投生态中面向市场侧的孵化平台，现已入驻浙江大学未来学习中心。
4. 具体说明在中心内链接市场资源、资本资源并推动产业孵化，同时概括技术基建、团队招募与活动连接等支持方式，但不写未经确认的案例、机构或数据。
5. 简述 2026 世界数字教育大会和未来学习中心的亮相，把大会定义为让 Delta X 所代表的青年创新实践被看见的窗口。
6. 以“从想法到产品、从学习到创造、从校园到市场”收束，并发出面向青年创新者的开放邀请。

文章使用 Delta X 第一人称“我们”，正文控制在约 1400—1800 个汉字，并配备一个主标题、一个摘要、四至六个移动端友好的小标题和两个备选标题。

- [ ] **Step 3: 运行文本结构与事实关键词检查**

Run:

```powershell
$path = '01三两的打工tasks\迭代未来管培生工作内容\文案work Stuff\Delta X × 未来学习中心推文.md'
$text = [System.IO.File]::ReadAllText((Resolve-Path -LiteralPath $path), [System.Text.Encoding]::UTF8)
@('Delta X','浙江大学启真交叉学科创新创业实验室','未来学习中心','市场资源','资本资源','产业孵化','2026 世界数字教育大会') | ForEach-Object { "$_=$($text.Contains($_))" }
```

Expected: 七个关键词的检查结果均为 `True`。

- [ ] **Step 4: 运行篇幅与占位内容检查**

Run:

```powershell
$path = '01三两的打工tasks\迭代未来管培生工作内容\文案work Stuff\Delta X × 未来学习中心推文.md'
$text = [System.IO.File]::ReadAllText((Resolve-Path -LiteralPath $path), [System.Text.Encoding]::UTF8)
"Chars=$($text.Length)"
rg -n 'TBD|TODO|待补|待定|某项目|XX|占位' -- $path
```

Expected: 全文含元信息的长度处于约 1700—2600 字符范围；搜索命令不返回任何占位内容。

- [ ] **Step 5: 审阅品牌主体性与事实边界**

逐段确认：开篇首个品牌名是 Delta X；大会介绍不先于品牌介绍；未来学习中心只作为育人平台与实践场景；文中没有把 Delta X 写成中心建设方、运营方或唯一孵化主体；结尾主语重新回到“我们 / Delta X”。

- [ ] **Step 6: 单独提交目标文档**

Run:

```powershell
git add -- '01三两的打工tasks/迭代未来管培生工作内容/文案work Stuff/Delta X × 未来学习中心推文.md'
git diff --cached --check
git commit -m 'content: 完成 Delta X 未来学习中心推文'
```

Expected: 仅目标推文文档进入该次提交，提交成功且不包含仓库中的其他修改。
