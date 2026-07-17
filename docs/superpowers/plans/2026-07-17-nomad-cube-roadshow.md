# Nomad Cube Five-Minute Roadshow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce a polished Chinese Markdown roadshow script that follows all 26 PPT pages and can be delivered within five minutes.

**Architecture:** The script is organized into four narrative acts matching the approved design: motivation, technology, product and business, and proof plus vision. Every slide receives one short spoken passage with a fixed time budget; the final verification checks page coverage, total timing, unsupported claims, and rehearsal usability.

**Tech Stack:** Markdown, PowerShell text checks, Git.

---

### Task 1: Establish the deliverable frame

**Files:**
- Create: `01三两的打工tasks/Nomad Cube/Nomad Cube 五分钟路演稿.md`
- Read: `docs/superpowers/specs/2026-07-17-nomad-cube-roadshow-design.md`

- [ ] **Step 1: Create the Markdown header**

Add the title, five-minute duration, recommended delivery pace, and a one-sentence note explaining that each `P` heading corresponds to one PPT page.

- [ ] **Step 2: Create all 26 page headings**

Use the exact format `## P1｜封面（8秒）` through `## P26｜结束页（4秒）`, with page timings totaling 300 seconds.

### Task 2: Write the motivation act

**Files:**
- Modify: `01三两的打工tasks/Nomad Cube/Nomad Cube 五分钟路演稿.md`

- [ ] **Step 1: Draft P1—P4**

Introduce Zheng Yaohan, the chopstick sword, the progression from paper craft to clay, and the first 3D-printed sword. Use the personal story to establish the desire for freer physical creation.

- [ ] **Step 2: Draft P5—P7**

Explain how 3D printing lowers the manual-skill barrier, then state the two remaining constraints: fixed build volume and fragmented workflow. End with the exact narrative pivot that current 3D printing is still far from truly free creation.

### Task 3: Write the technology act

**Files:**
- Modify: `01三两的打工tasks/Nomad Cube/Nomad Cube 五分钟路演稿.md`

- [ ] **Step 1: Draft P8—P10**

Use the robot from *The Wandering Earth 2* as inspiration, introduce the multidisciplinary undergraduate team, and explain the layered multi-zone path plus the perception-to-print closed loop.

- [ ] **Step 2: Draft P11—P13**

Explain the three-degree-of-freedom quadruped platform, 30°—45° beveled overlap, segmented hot-air fusion, less-than-3-mm joining error, RGB-depth visual calibration, dual-belt structure, and dynamic center-of-gravity control. Summarize the technology as “能走、能接、能打准”.

### Task 4: Write the product and business act

**Files:**
- Modify: `01三两的打工tasks/Nomad Cube/Nomad Cube 五分钟路演稿.md`

- [ ] **Step 1: Draft P14—P17**

Pause briefly for the product reveal, then position Nomad Cube as mobile manufacturing capacity, a private creative assistant, and a hardware-plus-content ecosystem with one-stop model generation and a creator community.

- [ ] **Step 2: Draft P18—P21**

Contrast the product with desktop and industrial mobile printers. Cover modular production, controlled core technology, C-end creators, B-end small organizations, and the hardware, consumables, subscription, service, and maintenance revenue loop without repeating production strategy.

### Task 5: Write proof, roadmap, and close

**Files:**
- Modify: `01三两的打工tasks/Nomad Cube/Nomad Cube 五分钟路演稿.md`

- [ ] **Step 1: Draft P22—P24**

State the World Digital Education Conference exposure, 12 visiting groups and more than 510 visitors, the supporting e-commerce and service platforms, the 2026/2028/2030 roadmap, and the global manufacturing-network vision.

- [ ] **Step 2: Draft P25—P26**

Return to the opening theme with “造物不应受制于盒子的边界，梦想不应止步于工具的匮乏” and finish with the team name and “让创意自由行走”.

- [ ] **Step 3: Add the rehearsal memory skeleton**

Append four concise keyword chains for the four acts. Keep this section outside the formal five-minute spoken text.

### Task 6: Verify and finalize

**Files:**
- Verify: `01三两的打工tasks/Nomad Cube/Nomad Cube 五分钟路演稿.md`

- [ ] **Step 1: Check page coverage**

Run:

```powershell
$text = Get-Content -Raw -Encoding UTF8 '01三两的打工tasks\Nomad Cube\Nomad Cube 五分钟路演稿.md'
[regex]::Matches($text, '(?m)^## P\d+\｜').Count
```

Expected output: `26`.

- [ ] **Step 2: Check the timing total**

Run:

```powershell
$text = Get-Content -Raw -Encoding UTF8 '01三两的打工tasks\Nomad Cube\Nomad Cube 五分钟路演稿.md'
([regex]::Matches($text, '（(\d+)秒）') | ForEach-Object { [int]$_.Groups[1].Value } | Measure-Object -Sum).Sum
```

Expected output: `300`.

- [ ] **Step 3: Check unsupported or unfinished wording**

Run:

```powershell
Select-String -Path '01三两的打工tasks\Nomad Cube\Nomad Cube 五分钟路演稿.md' -Pattern 'TBD|TODO|待补充|无限尺寸|保证成功|绝对领先'
```

Expected output: no matches.

- [ ] **Step 4: Review delivery quality**

Read the script aloud mentally and confirm: P1—P7 establishes the problem within 60 seconds; P8—P13 explains “能走、能接、能打准”; P18—P21 states the users and revenue loop once; P25 answers the opening story.

- [ ] **Step 5: Review the final diff**

Run:

```powershell
git diff --check -- '01三两的打工tasks/Nomad Cube/Nomad Cube 五分钟路演稿.md'
git status --short -- '01三两的打工tasks/Nomad Cube/Nomad Cube 五分钟路演稿.md'
```

Expected output: no whitespace errors and exactly one new untracked or modified roadshow file.
