# Delta X Activity Timeline, Calendar, and Theme Prototype Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a version-controlled Delta X homepage framework prototype whose activity section combines a NOW-first historical timeline, a synchronized calendar card, and persistent day/night themes.

**Architecture:** Preserve the approved homepage sequence by copying the current `framework-v1.html` into a stable prototype directory, then replace only its activity module and navigation theme control. Keep timeline grouping and calendar calculations in a pure ES module with Node tests; keep browser DOM behavior in a separate UI module; keep all visual overrides in one CSS file loaded after the copied inline styles.

**Tech Stack:** Static HTML, CSS custom properties, browser ES modules, Node.js 24 built-in test runner, Playwright CLI, Python static HTTP server.

---

## Scope and file map

Prototype source root:

`D:\Whiliam local brain\01三两的打工tasks\迭代未来管培生工作内容\Delta X官网\prototypes\homepage-framework-v2`

Files:

- Create `index.html`: copied homepage framework with the approved activity markup and theme button.
- Create `styles.css`: theme tokens, activity timeline, calendar, responsive, focus, and reduced-motion styles.
- Create `model.mjs`: sample activity records plus pure grouping, calendar, and theme-resolution functions.
- Create `app.mjs`: DOM rendering, theme persistence, event selection, calendar navigation, and two-way synchronization.
- Create `model.test.mjs`: Node tests for timeline grouping, missing dates, calendar markers, and theme resolution.
- Create `assets/event-aura.jpg`, `assets/event-game.jpg`, `assets/event-agent.jpg`, and `assets/event-hackathon.jpg`: copied public Delta Events poster assets used only by the prototype.

The existing `deltaxworld.cn` directory and its `events.js` publishing chain remain read-only.

### Task 1: Establish the pure activity model with tests

**Files:**

- Create: `prototypes/homepage-framework-v2/model.test.mjs`
- Create: `prototypes/homepage-framework-v2/model.mjs`

- [ ] **Step 1: Create the prototype directory**

Run from `D:\Whiliam local brain`:

```powershell
$prototypeRoot = 'D:\Whiliam local brain\01三两的打工tasks\迭代未来管培生工作内容\Delta X官网\prototypes\homepage-framework-v2'
New-Item -ItemType Directory -Force $prototypeRoot, "$prototypeRoot\assets" | Out-Null
```

Expected: both directories exist and no production-site files change.

- [ ] **Step 2: Write the failing model tests**

Create `model.test.mjs`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import {
  buildCalendarCells,
  groupTimeline,
  resolveInitialTheme,
  sampleEvents,
} from "./model.mjs";

test("NOW is first and archive years descend", () => {
  const groups = groupTimeline(sampleEvents);
  assert.deepEqual(groups.map((group) => group.key), ["now", "2026", "2025"]);
  assert.equal(groups[0].events[0].status, "upcoming");
  assert.ok(groups[1].events[0].date > groups[1].events.at(-1).date);
});

test("undated events are isolated and never fabricated", () => {
  const groups = groupTimeline([
    ...sampleEvents,
    { id: "undated", title: "未标注日期活动", status: "done", date: "" },
  ]);
  const undated = groups.find((group) => group.key === "undated");
  assert.equal(undated.events[0].date, "");
});

test("calendar always returns 42 cells and marks event dates", () => {
  const cells = buildCalendarCells(2026, 7, sampleEvents);
  assert.equal(cells.length, 42);
  const augustEighth = cells.find((cell) => cell.iso === "2026-08-08");
  assert.equal(augustEighth.events.length, 1);
  assert.equal(augustEighth.events[0].id, "aura");
});

test("stored theme wins over the operating-system preference", () => {
  assert.equal(resolveInitialTheme("light", true), "light");
  assert.equal(resolveInitialTheme("dark", false), "dark");
  assert.equal(resolveInitialTheme(null, true), "dark");
  assert.equal(resolveInitialTheme(null, false), "light");
});
```

- [ ] **Step 3: Run the tests and verify they fail because the model is absent**

Run:

```powershell
node --test 'D:\Whiliam local brain\01三两的打工tasks\迭代未来管培生工作内容\Delta X官网\prototypes\homepage-framework-v2\model.test.mjs'
```

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `model.mjs`.

- [ ] **Step 4: Implement the complete pure model**

Create `model.mjs`:

```js
export const sampleEvents = [
  {
    id: "match-day",
    date: "2026-08-22",
    time: "14:00",
    title: "Delta Match Day · 产业合作落地沙龙",
    category: "Founder 系列",
    partner: "浙江电信",
    status: "upcoming",
    statusLabel: "即将开始",
    image: "./assets/event-hackathon.jpg",
    url: "https://deltaxworld.cn/",
    sampleDate: true,
  },
  {
    id: "aura",
    date: "2026-08-08",
    time: "13:30",
    title: "Aura Pioneers · 开放硬件先行者大会",
    category: "Founder 系列",
    partner: "Frontier X · X·Lab",
    status: "live",
    statusLabel: "进行中",
    image: "./assets/event-aura.jpg",
    url: "https://mp.weixin.qq.com/s/UuXaFpQfHb8rrG06TD_55A",
    sampleDate: true,
  },
  {
    id: "game",
    date: "2026-06-28",
    time: "10:00",
    title: "抖音 AI 创变者计划 · 杭州 AI 游戏专场",
    category: "高校 Builder",
    partner: "抖音",
    status: "done",
    statusLabel: "活动回顾",
    image: "./assets/event-game.jpg",
    url: "https://mp.weixin.qq.com/s/ZI7voRfrLFSX6fIfQToG3Q",
    sampleDate: true,
  },
  {
    id: "agent",
    date: "2026-04-26",
    time: "15:00",
    title: "2050 · Personal Agent 实验室",
    category: "Delta Bites",
    partner: "SaySo · 宇生月伴",
    status: "done",
    statusLabel: "活动回顾",
    image: "./assets/event-agent.jpg",
    url: "https://mp.weixin.qq.com/s/oOC473oegOdpI4vAYaqnww",
    sampleDate: true,
  },
  {
    id: "hackathon",
    date: "2025-12-21",
    time: "09:30",
    title: "AI Hackathon Tour · 高校联赛",
    category: "高校 Builder",
    partner: "ModelScope · Datawhale · AMD",
    status: "done",
    statusLabel: "活动回顾",
    image: "./assets/event-hackathon.jpg",
    url: "https://mp.weixin.qq.com/s/XaPFeKbKhkmfxae8VM51QQ",
    sampleDate: true,
  },
];

export function groupTimeline(events) {
  const dated = events.filter((event) => /^\d{4}-\d{2}-\d{2}$/.test(event.date));
  const undated = events.filter((event) => !/^\d{4}-\d{2}-\d{2}$/.test(event.date));
  const current = dated
    .filter((event) => event.status !== "done")
    .sort((a, b) => a.date.localeCompare(b.date));
  const archive = dated
    .filter((event) => event.status === "done")
    .sort((a, b) => b.date.localeCompare(a.date));
  const years = [...new Set(archive.map((event) => event.date.slice(0, 4)))];
  const groups = [];
  if (current.length) groups.push({ key: "now", label: "NOW", events: current });
  for (const year of years) {
    groups.push({
      key: year,
      label: year,
      events: archive.filter((event) => event.date.startsWith(year)),
    });
  }
  if (undated.length) {
    groups.push({ key: "undated", label: "未标注日期", events: undated });
  }
  return groups;
}

function toIso(year, monthIndex, day) {
  return new Date(Date.UTC(year, monthIndex, day)).toISOString().slice(0, 10);
}

export function buildCalendarCells(year, monthIndex, events) {
  const firstWeekday = new Date(Date.UTC(year, monthIndex, 1)).getUTCDay();
  return Array.from({ length: 42 }, (_, index) => {
    const iso = toIso(year, monthIndex, index - firstWeekday + 1);
    const date = new Date(`${iso}T00:00:00Z`);
    return {
      iso,
      day: date.getUTCDate(),
      inMonth: date.getUTCMonth() === monthIndex,
      events: events.filter((event) => event.date === iso),
    };
  });
}

export function resolveInitialTheme(storedTheme, prefersDark) {
  if (storedTheme === "light" || storedTheme === "dark") return storedTheme;
  return prefersDark ? "dark" : "light";
}
```

- [ ] **Step 5: Run the tests and verify they pass**

Run the same `node --test` command.

Expected: 4 tests pass, 0 fail.

- [ ] **Step 6: Commit the model checkpoint**

```powershell
git add -- '01三两的打工tasks/迭代未来管培生工作内容/Delta X官网/prototypes/homepage-framework-v2/model.mjs' '01三两的打工tasks/迭代未来管培生工作内容/Delta X官网/prototypes/homepage-framework-v2/model.test.mjs'
git commit -m 'test: define Delta X activity timeline model'
```

### Task 2: Create the stable prototype and persistent theme foundation

**Files:**

- Create: `prototypes/homepage-framework-v2/index.html`
- Create: `prototypes/homepage-framework-v2/styles.css`
- Create: `prototypes/homepage-framework-v2/app.mjs`
- Create: `prototypes/homepage-framework-v2/assets/*.jpg`

- [ ] **Step 1: Copy the approved v1 framework and public poster assets**

```powershell
$prototypeRoot = 'D:\Whiliam local brain\01三两的打工tasks\迭代未来管培生工作内容\Delta X官网\prototypes\homepage-framework-v2'
Copy-Item -LiteralPath 'C:\Users\MS66\.codex\visualizations\2026\07\27\019fa212-db82-7391-85d0-eb6350d6b1d1\delta-x-hero-concept\framework-v1.html' -Destination "$prototypeRoot\index.html"
Copy-Item -LiteralPath 'D:\Whiliam local brain\01三两的打工tasks\迭代未来管培生工作内容\Delta X官网\deltaxworld.cn\brand\posters\YT0dbC4iso5kNpx7nFfcZaE5nGf.jpg' -Destination "$prototypeRoot\assets\event-aura.jpg"
Copy-Item -LiteralPath 'D:\Whiliam local brain\01三两的打工tasks\迭代未来管培生工作内容\Delta X官网\deltaxworld.cn\brand\posters\EpLVbRABmoRghuxGUTzccBSNnjh.jpg' -Destination "$prototypeRoot\assets\event-game.jpg"
Copy-Item -LiteralPath 'D:\Whiliam local brain\01三两的打工tasks\迭代未来管培生工作内容\Delta X官网\deltaxworld.cn\brand\posters\U2RUbV26WoBG11xHUU9cuN0tn2e.jpg' -Destination "$prototypeRoot\assets\event-agent.jpg"
Copy-Item -LiteralPath 'D:\Whiliam local brain\01三两的打工tasks\迭代未来管培生工作内容\Delta X官网\deltaxworld.cn\brand\posters\GbgNb7fuuoEhrmx4TjTc999snOe.jpg' -Destination "$prototypeRoot\assets\event-hackathon.jpg"
```

Expected: v1 remains unchanged and the new prototype owns its copied assets.

- [ ] **Step 2: Add the theme bootstrap, stylesheet, module, and navigation control**

In `index.html`, add before `</head>`:

```html
<script>
  (() => {
    const stored = localStorage.getItem("delta-x-theme");
    const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.dataset.theme = stored === "light" || stored === "dark"
      ? stored
      : dark ? "dark" : "light";
  })();
</script>
<link rel="stylesheet" href="./styles.css" />
```

Add as the final child of `.nav`:

```html
<button class="theme-toggle" id="theme-toggle" type="button" aria-label="切换为夜间模式">
  <span aria-hidden="true" id="theme-toggle-label">夜</span>
</button>
```

Replace the old inline activity-switching `<script>` with:

```html
<script type="module" src="./app.mjs"></script>
```

- [ ] **Step 3: Create the theme CSS foundation**

Create `styles.css` with these initial rules:

```css
:root,
:root[data-theme="light"] {
  color-scheme: light;
  --paper: #f1eee6;
  --paper-2: #e7e2d7;
  --ink: #141412;
  --muted: #6c6860;
  --delta: #ed5a22;
  --line: rgba(20, 20, 18, 0.24);
  --white: #f9f7f1;
  --card: #f7f4ed;
  --header-bg: rgba(241, 238, 230, 0.9);
}

:root[data-theme="dark"] {
  color-scheme: dark;
  --paper: #111111;
  --paper-2: #191919;
  --ink: #fbf6ee;
  --muted: #8f8f8f;
  --delta: #fd6509;
  --line: rgba(251, 246, 238, 0.2);
  --white: #fbf6ee;
  --card: #191919;
  --header-bg: rgba(17, 17, 17, 0.9);
}

body,
.site-header,
.section,
.calendar-card,
.timeline-card {
  transition: background-color 180ms ease, color 180ms ease, border-color 180ms ease;
}

.site-header { background: var(--header-bg); }

.theme-toggle {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  padding: 0;
  border: 1px solid var(--line);
  border-radius: 50%;
  color: var(--ink);
  background: transparent;
  font-size: 11px;
}

.theme-toggle:hover { border-color: var(--delta); }
.theme-toggle:focus-visible { outline: 2px solid var(--delta); outline-offset: 3px; }
```

- [ ] **Step 4: Implement theme persistence in `app.mjs`**

```js
import { resolveInitialTheme } from "./model.mjs";

const THEME_KEY = "delta-x-theme";
const root = document.documentElement;
const themeToggle = document.querySelector("#theme-toggle");
const themeToggleLabel = document.querySelector("#theme-toggle-label");

function applyTheme(theme) {
  root.dataset.theme = theme;
  const nextLabel = theme === "dark" ? "切换为日间模式" : "切换为夜间模式";
  themeToggle.setAttribute("aria-label", nextLabel);
  themeToggle.title = nextLabel;
  themeToggleLabel.textContent = theme === "dark" ? "日" : "夜";
}

const initialTheme = resolveInitialTheme(
  localStorage.getItem(THEME_KEY),
  window.matchMedia("(prefers-color-scheme: dark)").matches,
);
applyTheme(initialTheme);

themeToggle.addEventListener("click", () => {
  const nextTheme = root.dataset.theme === "dark" ? "light" : "dark";
  localStorage.setItem(THEME_KEY, nextTheme);
  applyTheme(nextTheme);
});
```

- [ ] **Step 5: Serve and verify the theme control**

Start a hidden local server from the prototype directory:

```powershell
Start-Process python -ArgumentList '-m','http.server','8766','--bind','127.0.0.1' -WorkingDirectory 'D:\Whiliam local brain\01三两的打工tasks\迭代未来管培生工作内容\Delta X官网\prototypes\homepage-framework-v2' -WindowStyle Hidden
```

Run:

```powershell
npx.cmd --yes --package @playwright/cli playwright-cli -s=dxv2 open 'http://127.0.0.1:8766/'
npx.cmd --yes --package @playwright/cli playwright-cli -s=dxv2 snapshot
npx.cmd --yes --package @playwright/cli playwright-cli -s=dxv2 run-code "await page.evaluate(() => localStorage.setItem('delta-x-theme', 'light')); await page.reload(); await page.getByRole('button', { name: '切换为夜间模式' }).click(); await page.reload(); if ((await page.locator('html').getAttribute('data-theme')) !== 'dark') throw new Error('dark theme was not persisted')"
```

Expected: the page reloads with `data-theme="dark"` and the button accessible name becomes `切换为日间模式`.

- [ ] **Step 6: Commit the theme checkpoint**

```powershell
git add -- '01三两的打工tasks/迭代未来管培生工作内容/Delta X官网/prototypes/homepage-framework-v2'
git commit -m 'feat: add Delta X prototype theme foundation'
```

### Task 3: Replace the activity slider with the NOW-first timeline

**Files:**

- Modify: `prototypes/homepage-framework-v2/index.html`
- Modify: `prototypes/homepage-framework-v2/styles.css`
- Modify: `prototypes/homepage-framework-v2/app.mjs`

- [ ] **Step 1: Replace the existing `#events` section markup**

Use this complete section:

```html
<section class="section events-v2" id="events">
  <div class="events-section-label">
    <span>03 / 近期活动</span>
    <span>NOW → 2026 → 2025 / CONTINUOUS ITERATION</span>
  </div>
  <div class="activity-layout">
    <div class="timeline-panel">
      <div class="timeline-heading">
        <p>DELTA X ACTIVITIES</p>
        <h2>事情持续发生，关系也在持续生长。</h2>
      </div>
      <div class="timeline" id="activity-timeline" aria-live="polite"></div>
    </div>
    <aside class="calendar-panel" aria-label="活动日历">
      <div class="calendar-card" id="calendar-card"></div>
      <a class="calendar-link" href="https://deltaxworld.cn/" target="_blank" rel="noreferrer">
        <span>进入 Delta Events 完整活动日历</span><span>↗</span>
      </a>
    </aside>
  </div>
</section>
```

- [ ] **Step 2: Add the timeline CSS**

Append to `styles.css`:

```css
.events-v2 { min-height: 100vh; }
.activity-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.9fr) minmax(280px, .9fr);
  gap: clamp(42px, 6vw, 88px);
  align-items: start;
  margin-top: 5vh;
}
.timeline-heading { margin: 0 0 42px 42px; }
.timeline-heading p { margin: 0 0 10px; color: var(--muted); font-size: 10px; letter-spacing: .12em; }
.timeline-heading h2 { max-width: 620px; margin: 0; font-size: clamp(24px, 2.4vw, 36px); line-height: 1.2; font-weight: 500; }
.timeline { position: relative; }
.timeline::before { content: ""; position: absolute; top: 8px; bottom: 0; left: 10px; width: 1px; background: var(--line); }
.timeline-group { position: relative; padding: 0 0 46px 42px; }
.timeline-group:last-child { padding-bottom: 0; }
.timeline-group::before { content: ""; position: absolute; top: 7px; left: 5px; width: 11px; height: 11px; border: 1px solid var(--muted); border-radius: 50%; background: var(--paper); }
.timeline-group[data-group="now"]::before { border-color: var(--delta); background: var(--delta); }
.timeline-year { margin: 0 0 16px; font: 500 clamp(20px, 1.8vw, 24px)/1 Georgia, serif; }
.timeline-cards { display: grid; gap: 12px; }
.timeline-card { border: 1px solid var(--line); color: var(--ink); background: var(--card); }
.timeline-card.is-active { border-color: var(--delta); }
.timeline-card-select {
  width: 100%; display: grid; grid-template-columns: minmax(0, 1fr) 112px; gap: 18px;
  padding: 18px; border: 0; color: inherit; background: transparent; text-align: left; cursor: pointer;
}
.timeline-card-copy { min-width: 0; }
.timeline-card-meta { display: flex; flex-wrap: wrap; gap: 8px 14px; margin-bottom: 12px; color: var(--muted); font-size: 12px; }
.timeline-card-status { color: var(--delta); }
.timeline-card h3 { margin: 0 0 10px; font-size: clamp(18px, 1.6vw, 22px); line-height: 1.3; font-weight: 600; }
.timeline-card p { margin: 0; color: var(--muted); font-size: 13px; line-height: 1.5; }
.timeline-card img { width: 112px; height: 112px; object-fit: cover; background: var(--paper-2); }
.timeline-card-link { display: inline-flex; margin: 0 18px 16px; color: var(--ink); font-size: 12px; text-decoration: none; border-bottom: 1px solid var(--ink); }
.sample-date-note { display: inline-block; margin-top: 10px; color: var(--muted); font-size: 10px; }
```

- [ ] **Step 3: Extend `app.mjs` to render the complete timeline**

Replace its import line with:

```js
import { buildCalendarCells, groupTimeline, resolveInitialTheme, sampleEvents } from "./model.mjs";
```

Append:

```js
const timeline = document.querySelector("#activity-timeline");
let activeEventId = groupTimeline(sampleEvents)[0].events[0].id;

function formatDate(iso) {
  if (!iso) return "日期未标注";
  const [, month, day] = iso.split("-");
  return `${Number(month)}月${Number(day)}日`;
}

function eventCard(event) {
  const article = document.createElement("article");
  article.className = "timeline-card";
  article.classList.toggle("is-active", event.id === activeEventId);
  const button = document.createElement("button");
  button.type = "button";
  button.className = "timeline-card-select";
  button.dataset.eventId = event.id;
  button.dataset.eventDate = event.date;
  button.setAttribute("aria-pressed", String(event.id === activeEventId));
  button.innerHTML = `
    <span class="timeline-card-copy">
      <span class="timeline-card-meta">
        <span>${formatDate(event.date)} · ${event.time}</span>
        <span class="timeline-card-status">${event.statusLabel}</span>
      </span>
      <h3>${event.title}</h3>
      <p>${event.category} · ${event.partner}</p>
      ${event.sampleDate ? '<span class="sample-date-note">日期仅用于结构演示</span>' : ""}
    </span>
    <img src="${event.image}" alt="${event.title} 活动视觉" />
  `;
  button.addEventListener("click", () => selectEvent(event.id, { scroll: false }));
  const link = document.createElement("a");
  link.className = "timeline-card-link";
  link.href = event.url;
  link.target = "_blank";
  link.rel = "noreferrer";
  link.textContent = event.status === "done" ? "查看活动回顾 ↗" : "查看活动详情 ↗";
  article.append(button, link);
  return article;
}

function renderTimeline() {
  timeline.replaceChildren();
  for (const group of groupTimeline(sampleEvents)) {
    const section = document.createElement("section");
    section.className = "timeline-group";
    section.dataset.group = group.key;
    const heading = document.createElement("h3");
    heading.className = "timeline-year";
    heading.textContent = group.label;
    const cards = document.createElement("div");
    cards.className = "timeline-cards";
    group.events.forEach((event) => cards.append(eventCard(event)));
    section.append(heading, cards);
    timeline.append(section);
  }
}
```

Define a temporary selection function before calling `renderTimeline()`:

```js
function selectEvent(eventId) {
  activeEventId = eventId;
  document.querySelectorAll(".timeline-card-select").forEach((button) => {
    const active = button.dataset.eventId === eventId;
    button.setAttribute("aria-pressed", String(active));
    button.closest(".timeline-card").classList.toggle("is-active", active);
  });
}

renderTimeline();
```

- [ ] **Step 4: Verify typography and default activity selection**

```powershell
npx.cmd --yes --package @playwright/cli playwright-cli -s=dxv2 goto 'http://127.0.0.1:8766/#events'
npx.cmd --yes --package @playwright/cli playwright-cli -s=dxv2 resize 1440 900
npx.cmd --yes --package @playwright/cli playwright-cli -s=dxv2 run-code "const active = page.locator('.timeline-card-select[aria-pressed=true]'); if ((await active.count()) !== 1) throw new Error('expected one active event'); const size = parseFloat(await active.locator('h3').evaluate(el => getComputedStyle(el).fontSize)); if (size > 22) throw new Error('activity title exceeds 22px')"
```

Expected: exactly one NOW event is active and its heading is at most 22px.

- [ ] **Step 5: Commit the timeline checkpoint**

```powershell
git add -- '01三两的打工tasks/迭代未来管培生工作内容/Delta X官网/prototypes/homepage-framework-v2'
git commit -m 'feat: replace activity slider with iteration timeline'
```

### Task 4: Add the synchronized sticky calendar card

**Files:**

- Modify: `prototypes/homepage-framework-v2/styles.css`
- Modify: `prototypes/homepage-framework-v2/app.mjs`

- [ ] **Step 1: Add calendar CSS**

Append:

```css
.calendar-panel { position: sticky; top: 104px; }
.calendar-card { padding: 20px; border: 1px solid var(--line); background: var(--card); }
.calendar-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
.calendar-header h3 { margin: 0; font-size: 19px; font-weight: 600; }
.calendar-nav { display: flex; gap: 6px; }
.calendar-nav button, .calendar-collapse {
  width: 30px; height: 30px; padding: 0; border: 1px solid var(--line); color: var(--ink); background: transparent;
}
.calendar-collapse { display: none; width: auto; padding: 0 10px; font-size: 11px; }
.calendar-weekdays, .calendar-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; }
.calendar-weekdays { margin-bottom: 8px; color: var(--muted); font-size: 10px; text-align: center; }
.calendar-day {
  position: relative; min-height: 34px; display: grid; place-items: center; padding: 0;
  border: 0; color: var(--ink); background: transparent; font-size: 13px;
}
.calendar-day:not(.is-in-month) { opacity: .25; }
.calendar-day.has-events { cursor: pointer; }
.calendar-day.has-events::after { content: ""; position: absolute; bottom: 3px; width: 4px; height: 4px; border-radius: 50%; background: var(--muted); }
.calendar-day.has-live-events::after { background: var(--delta); }
.calendar-day[aria-pressed="true"] { color: var(--paper); background: var(--ink); }
.calendar-day[aria-pressed="true"]::after { background: var(--delta); }
.calendar-legend { display: flex; gap: 16px; margin-top: 16px; padding-top: 14px; border-top: 1px solid var(--line); color: var(--muted); font-size: 10px; }
.calendar-legend i { width: 5px; height: 5px; display: inline-block; margin-right: 6px; border-radius: 50%; background: var(--muted); }
.calendar-legend .is-live { background: var(--delta); }
```

- [ ] **Step 2: Add the calendar renderer and synchronization**

Replace the temporary `selectEvent` implementation and the final `renderTimeline()` call with:

```js
const calendarCard = document.querySelector("#calendar-card");
const initialEvent = sampleEvents.find((event) => event.id === activeEventId);
let calendarYear = Number(initialEvent.date.slice(0, 4));
let calendarMonth = Number(initialEvent.date.slice(5, 7)) - 1;

function renderCalendar() {
  const cells = buildCalendarCells(calendarYear, calendarMonth, sampleEvents);
  const monthLabel = new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "long", timeZone: "UTC" })
    .format(new Date(Date.UTC(calendarYear, calendarMonth, 1)));
  calendarCard.innerHTML = `
    <div class="calendar-header">
      <h3>${monthLabel}</h3>
      <div class="calendar-nav">
        <button type="button" data-calendar-nav="previous" aria-label="上个月">←</button>
        <button type="button" data-calendar-nav="next" aria-label="下个月">→</button>
      </div>
      <button class="calendar-collapse" type="button" aria-expanded="true" aria-controls="calendar-body">收起日历</button>
    </div>
    <div id="calendar-body">
      <div class="calendar-weekdays" aria-hidden="true"><span>日</span><span>一</span><span>二</span><span>三</span><span>四</span><span>五</span><span>六</span></div>
      <div class="calendar-grid"></div>
      <div class="calendar-legend"><span><i class="is-live"></i>正在发生</span><span><i></i>活动回顾</span></div>
    </div>
  `;
  const grid = calendarCard.querySelector(".calendar-grid");
  for (const cell of cells) {
    const day = document.createElement(cell.events.length ? "button" : "span");
    day.className = "calendar-day";
    day.classList.toggle("is-in-month", cell.inMonth);
    day.classList.toggle("has-events", cell.events.length > 0);
    day.classList.toggle("has-live-events", cell.events.some((event) => event.status !== "done"));
    day.textContent = String(cell.day);
    if (cell.events.length) {
      day.type = "button";
      day.setAttribute("aria-label", `${cell.iso}，${cell.events.length} 场活动`);
      day.setAttribute("aria-pressed", String(cell.events.some((event) => event.id === activeEventId)));
      day.addEventListener("click", () => selectEvent(cell.events[0].id, { scroll: true }));
    }
    grid.append(day);
  }
  calendarCard.querySelector('[data-calendar-nav="previous"]').addEventListener("click", () => changeMonth(-1));
  calendarCard.querySelector('[data-calendar-nav="next"]').addEventListener("click", () => changeMonth(1));
  const collapse = calendarCard.querySelector(".calendar-collapse");
  collapse.addEventListener("click", () => {
    const expanded = collapse.getAttribute("aria-expanded") === "true";
    collapse.setAttribute("aria-expanded", String(!expanded));
    collapse.textContent = expanded ? "展开日历" : "收起日历";
    calendarCard.querySelector("#calendar-body").hidden = expanded;
  });
}

function changeMonth(delta) {
  const next = new Date(Date.UTC(calendarYear, calendarMonth + delta, 1));
  calendarYear = next.getUTCFullYear();
  calendarMonth = next.getUTCMonth();
  renderCalendar();
}

function selectEvent(eventId, { scroll }) {
  activeEventId = eventId;
  const event = sampleEvents.find((candidate) => candidate.id === eventId);
  document.querySelectorAll(".timeline-card-select").forEach((button) => {
    const active = button.dataset.eventId === eventId;
    button.setAttribute("aria-pressed", String(active));
    button.closest(".timeline-card").classList.toggle("is-active", active);
  });
  if (event?.date) {
    calendarYear = Number(event.date.slice(0, 4));
    calendarMonth = Number(event.date.slice(5, 7)) - 1;
    renderCalendar();
  }
  if (scroll) {
    document.querySelector(`[data-event-id="${eventId}"]`)?.closest(".timeline-card")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

renderTimeline();
renderCalendar();
```

- [ ] **Step 3: Verify two-way synchronization**

```powershell
npx.cmd --yes --package @playwright/cli playwright-cli -s=dxv2 goto 'http://127.0.0.1:8766/#events'
npx.cmd --yes --package @playwright/cli playwright-cli -s=dxv2 run-code "await page.locator('.timeline-card-select[data-event-id=game]').click(); const selected = await page.locator('.calendar-day[aria-pressed=true]').getAttribute('aria-label'); if (!selected.startsWith('2026-06-28')) throw new Error('timeline did not synchronize calendar'); await page.getByRole('button', { name: '2026-06-28，1 场活动' }).click(); if ((await page.locator('.timeline-card-select[data-event-id=game]').getAttribute('aria-pressed')) !== 'true') throw new Error('calendar did not synchronize timeline')"
```

Expected: both assertions pass.

- [ ] **Step 4: Commit the calendar checkpoint**

```powershell
git add -- '01三两的打工tasks/迭代未来管培生工作内容/Delta X官网/prototypes/homepage-framework-v2'
git commit -m 'feat: synchronize activity timeline and calendar'
```

### Task 5: Complete responsive, accessibility, and visual verification

**Files:**

- Modify: `prototypes/homepage-framework-v2/styles.css`
- Verify: `prototypes/homepage-framework-v2/index.html`
- Verify: `Delta X官网/deltaxworld.cn/**` remains unchanged

- [ ] **Step 1: Add responsive and reduced-motion rules**

Append:

```css
@media (max-width: 900px) {
  .activity-layout { grid-template-columns: minmax(0, 1fr) minmax(250px, .62fr); gap: 28px; }
  .timeline-card-select { grid-template-columns: minmax(0, 1fr) 88px; }
  .timeline-card img { width: 88px; height: 88px; }
}

@media (max-width: 680px) {
  .activity-layout { display: flex; flex-direction: column; }
  .calendar-panel { position: static; width: 100%; order: -1; }
  .calendar-collapse { display: inline-flex; align-items: center; justify-content: center; }
  .calendar-nav { margin-left: auto; }
  .timeline-heading { margin-left: 28px; }
  .timeline-group { padding-left: 28px; }
  .timeline::before { left: 6px; }
  .timeline-group::before { left: 1px; }
  .timeline-card-select { grid-template-columns: minmax(0, 1fr) 72px; padding: 14px; }
  .timeline-card img { width: 72px; height: 72px; }
  .timeline-card h3 { font-size: 18px; }
}

@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  body, .site-header, .section, .calendar-card, .timeline-card { transition: none; }
}
```

- [ ] **Step 2: Run model tests again**

```powershell
node --test 'D:\Whiliam local brain\01三两的打工tasks\迭代未来管培生工作内容\Delta X官网\prototypes\homepage-framework-v2\model.test.mjs'
```

Expected: 4 tests pass.

- [ ] **Step 3: Verify desktop rendering and capture evidence**

```powershell
npx.cmd --yes --package @playwright/cli playwright-cli -s=dxv2 goto 'http://127.0.0.1:8766/#events'
npx.cmd --yes --package @playwright/cli playwright-cli -s=dxv2 resize 1440 900
npx.cmd --yes --package @playwright/cli playwright-cli -s=dxv2 snapshot
npx.cmd --yes --package @playwright/cli playwright-cli -s=dxv2 screenshot
```

Expected: the viewport shows a timeline node, at least one event card, and the calendar card without horizontal scrolling.

- [ ] **Step 4: Verify mobile rendering and calendar collapse**

```powershell
npx.cmd --yes --package @playwright/cli playwright-cli -s=dxv2 resize 390 844
npx.cmd --yes --package @playwright/cli playwright-cli -s=dxv2 run-code "await page.getByRole('button', { name: '收起日历' }).click(); const body = page.locator('#calendar-body'); if (!(await body.isHidden())) throw new Error('mobile calendar did not collapse'); if ((await page.locator('body').evaluate(el => el.scrollWidth > el.clientWidth))) throw new Error('mobile page has horizontal overflow')"
npx.cmd --yes --package @playwright/cli playwright-cli -s=dxv2 screenshot
```

Expected: calendar body collapses and the page has no horizontal overflow.

- [ ] **Step 5: Verify accessibility hooks and production-site isolation**

```powershell
npx.cmd --yes --package @playwright/cli playwright-cli -s=dxv2 run-code "const toggle = page.getByRole('button', { name: /切换为/ }); if ((await toggle.count()) !== 1) throw new Error('theme toggle name missing'); if ((await page.locator('.timeline-card').count()) < 5) throw new Error('timeline cards missing'); if ((await page.locator('.calendar-day.has-events').count()) < 1) throw new Error('calendar event markers missing'); if ((await page.locator('.timeline-card-link').count()) !== 5) throw new Error('activity detail links missing')"
$checks = @(
  @{ Path='D:\Whiliam local brain\01三两的打工tasks\迭代未来管培生工作内容\Delta X官网\deltaxworld.cn\events.js'; Hash='03D3155A6CEA4EE7AD539622D2AFEFF36A4E0B02FAADB9DE31C2403D53E998AC' },
  @{ Path='D:\Whiliam local brain\01三两的打工tasks\迭代未来管培生工作内容\Delta X官网\deltaxworld.cn\styles.css'; Hash='018FC5C93DDA6A8C7A65D6F78B54D19C067A37336C497017F8F9F3DB491DD94A' },
  @{ Path='D:\Whiliam local brain\01三两的打工tasks\迭代未来管培生工作内容\Delta X官网\deltaxworld.cn\app.jsx'; Hash='CCBF2CF552CED3DFE788496CB05317E41312E3B037149B361BAD2BFFE9FC646F' }
)
$checks | ForEach-Object { if ((Get-FileHash $_.Path -Algorithm SHA256).Hash -ne $_.Hash) { throw "Delta Events source changed: $($_.Path)" } }
```

Expected: browser assertions pass and all three production-source hashes match their recorded values.

- [ ] **Step 6: Commit the verified prototype**

```powershell
git add -- '01三两的打工tasks/迭代未来管培生工作内容/Delta X官网/prototypes/homepage-framework-v2'
git commit -m 'test: verify responsive Delta X activity prototype'
```

- [ ] **Step 7: Close the browser session and hand off the review URL**

```powershell
npx.cmd --yes --package @playwright/cli playwright-cli -s=dxv2 close
```

Review URL:

`http://127.0.0.1:8766/#events`

The handoff must explicitly say that all displayed dates are prototype examples until the existing Feishu `举办时间` field is normalized and exported as a real date.
