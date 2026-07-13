# Delta X × 未来学习中心推文精简修订 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将现有推文改写为约 900—1100 个汉字的四段式 Delta X 品牌稿，并插入三张经过视觉检查的浙江大学官方图片。

**Architecture:** 保留目标 Markdown 的 YAML 元信息，完整替换正文。图片下载到文档同级的独立目录，通过相对路径插入，正文依次完成 Delta X 定位、未来学习中心介绍、入驻工作和价值观收束。

**Tech Stack:** Markdown、Obsidian YAML front matter、浙江大学官方公开图片、PowerShell 内容与路径校验、Git 精确文件提交。

---

### Task 1: 下载并核验三张官方配图

**Files:**
- Create: `01三两的打工tasks/迭代未来管培生工作内容/文案work Stuff/images/delta-x-future-learning-center/01-future-learning-center-exterior.jpg`
- Create: `01三两的打工tasks/迭代未来管培生工作内容/文案work Stuff/images/delta-x-future-learning-center/02-four-floor-growth-path.jpg`
- Create: `01三两的打工tasks/迭代未来管培生工作内容/文案work Stuff/images/delta-x-future-learning-center/03-project-showcase.jpg`

- [ ] **Step 1: 建立图片目录并下载指定官方图片**

Run:

```powershell
$dir = '01三两的打工tasks\迭代未来管培生工作内容\文案work Stuff\images\delta-x-future-learning-center'
New-Item -ItemType Directory -Force -Path $dir | Out-Null
$images = [ordered]@{
  '01-future-learning-center-exterior.jpg' = 'https://www.zju.edu.cn/_upload/article/images/7d/03/8dfa17814e1aa3819fd93c278ad1/2837b9fb-71ef-44a0-89cc-df35d082d482.jpg'
  '02-four-floor-growth-path.jpg' = 'https://www.zju.edu.cn/_upload/article/images/7d/03/8dfa17814e1aa3819fd93c278ad1/44c1c38f-ea5d-4fb5-bcd8-7a1af151333b.jpg'
  '03-project-showcase.jpg' = 'https://www.zju.edu.cn/_upload/article/images/7d/03/8dfa17814e1aa3819fd93c278ad1/e749a313-1e11-4d70-b0de-1429e072a0d6.jpg'
}
$images.GetEnumerator() | ForEach-Object {
  Invoke-WebRequest -Uri $_.Value -OutFile (Join-Path $dir $_.Key) -UseBasicParsing
}
```

Expected: 三个 JPG 文件均成功创建。

- [ ] **Step 2: 校验图片格式、尺寸与文件大小**

Run:

```powershell
Add-Type -AssemblyName System.Drawing
$dir = '01三两的打工tasks\迭代未来管培生工作内容\文案work Stuff\images\delta-x-future-learning-center'
Get-ChildItem -LiteralPath $dir -Filter '*.jpg' | ForEach-Object {
  $img = [System.Drawing.Image]::FromFile($_.FullName)
  [pscustomobject]@{ Name=$_.Name; Width=$img.Width; Height=$img.Height; Bytes=$_.Length }
  $img.Dispose()
}
```

Expected: 三张图片宽度均约 599—600 像素，高度不低于 399 像素，文件大小大于 40 KB。

- [ ] **Step 3: 逐张打开进行视觉核验**

使用本地图片查看工具检查三张图片，确认依次为：大会标识与未来学习中心建筑外观、四层空间功能示意、嘉宾观看校内创新项目展示。三张图均不得出现下载错误页、裁切异常或与正文无关的内容。

### Task 2: 重写四段式推文正文

**Files:**
- Modify: `01三两的打工tasks/迭代未来管培生工作内容/文案work Stuff/Delta X × 未来学习中心推文.md`
- Reference: `docs/superpowers/specs/2026-07-13-delta-x-future-learning-center-wechat-revision-design.md`

- [ ] **Step 1: 保留 YAML 并替换正文**

保留现有 `type`、`status`、`created`、`project`、`domain`、`updated` 和 `tags`。正文使用标题“浙大这栋让全球高校都‘酸了’的新楼里，Delta X 在做什么？”，并按以下四个小节成文：

1. `01 先用一段话，说清 Delta X`：同段写明 X-Lab 创投生态市场侧孵化平台定位、AI＋高校方向，以及从技术或作品到产品和市场的断点；
2. `02 浙大这栋新楼，为什么让人“酸了”`：用“玩—做—赛—创”概括四层成长路径，强调 AI 成为创造基础设施；
3. `03 在未来学习中心，Delta X 做什么`：展开市场资源、资本资源、产业孵化三项动作；
4. `04 从“会读书”到“会创造”，差的是机会`：说明未来学习中心提供环境，Delta X 把创造推向用户、市场与产业，并以“让改变真实发生，一起迭代未来”收束。

- [ ] **Step 2: 在对应位置插入三张图片**

使用以下 Markdown 相对链接：

```markdown
![2026世界数字教育大会期间的浙江大学未来学习中心](images/delta-x-future-learning-center/01-future-learning-center-exterior.jpg)

![浙江大学未来学习中心四层成长路径](images/delta-x-future-learning-center/02-four-floor-growth-path.jpg)

![嘉宾在未来学习中心了解创新项目](images/delta-x-future-learning-center/03-project-showcase.jpg)
```

第一张放在导语后，第二张放在“玩—做—赛—创”介绍后，第三张放在 Delta X 三项工作之前。

- [ ] **Step 3: 添加图片来源说明**

文末添加：

```markdown
> 图片来源：[浙江大学官方报道《Future learning center opens at Zhejiang University》](https://www.zju.edu.cn/english/2026/0515/c19573a3162908/page.htm)
```

### Task 3: 校验正文、图片链接与提交范围

**Files:**
- Verify: `01三两的打工tasks/迭代未来管培生工作内容/文案work Stuff/Delta X × 未来学习中心推文.md`
- Verify: `01三两的打工tasks/迭代未来管培生工作内容/文案work Stuff/images/delta-x-future-learning-center/*.jpg`

- [ ] **Step 1: 校验篇幅、结构和事实关键词**

Run:

```powershell
$path = '01三两的打工tasks\迭代未来管培生工作内容\文案work Stuff\Delta X × 未来学习中心推文.md'
$text = [System.IO.File]::ReadAllText((Resolve-Path -LiteralPath $path), [System.Text.Encoding]::UTF8)
$body = $text -replace '(?s)^---.*?---\s*',''
$han = [regex]::Matches($body, '[\p{IsCJKUnifiedIdeographs}]').Count
"HanCharacters=$han"
@('Delta X','ZJU X-Lab','AI＋高校','玩—做—赛—创','市场资源','资本资源','产业孵化','从“会读书”到“会创造”') | ForEach-Object { "$_=$($body.Contains($_))" }
```

Expected: 汉字数为 900—1100；八个关键词检查结果均为 `True`。

- [ ] **Step 2: 校验三条图片链接均可解析**

Run:

```powershell
$doc = Resolve-Path -LiteralPath '01三两的打工tasks\迭代未来管培生工作内容\文案work Stuff\Delta X × 未来学习中心推文.md'
$text = [System.IO.File]::ReadAllText($doc, [System.Text.Encoding]::UTF8)
$links = [regex]::Matches($text, '!\[[^\]]*\]\(([^)]+)\)')
$links | ForEach-Object {
  $resolved = Join-Path (Split-Path -Parent $doc) $_.Groups[1].Value
  "{0}={1}" -f $_.Groups[1].Value,(Test-Path -LiteralPath $resolved)
}
```

Expected: 恰好三条图片链接，结果均为 `True`。

- [ ] **Step 3: 校验无占位和错误角色表述**

Run:

```powershell
$path = '01三两的打工tasks\迭代未来管培生工作内容\文案work Stuff\Delta X × 未来学习中心推文.md'
rg -n 'TBD|TODO|待补|待定|某项目|XX|占位|Delta X.{0,12}(建设方|运营方|唯一孵化主体)' -- $path
```

Expected: 无任何匹配。

- [ ] **Step 4: 仅提交目标正文与三张图片**

Run:

```powershell
git add -- '01三两的打工tasks/迭代未来管培生工作内容/文案work Stuff/Delta X × 未来学习中心推文.md' '01三两的打工tasks/迭代未来管培生工作内容/文案work Stuff/images/delta-x-future-learning-center/01-future-learning-center-exterior.jpg' '01三两的打工tasks/迭代未来管培生工作内容/文案work Stuff/images/delta-x-future-learning-center/02-four-floor-growth-path.jpg' '01三两的打工tasks/迭代未来管培生工作内容/文案work Stuff/images/delta-x-future-learning-center/03-project-showcase.jpg'
git diff --cached --check
git commit -m 'content: 精简 Delta X 未来学习中心推文并配图'
```

Expected: 提交只包含一个 Markdown 文件和三张 JPG 图片，不包含仓库中的其他用户修改。
