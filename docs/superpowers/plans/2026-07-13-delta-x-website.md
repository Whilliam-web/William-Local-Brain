# Delta X Website Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and privately deploy a responsive Delta X brand website that communicates the “iterate your future” philosophy, shows current activity states, and converts visitors into community members, event participants, or partners.

**Architecture:** Create an isolated Vite + React + TypeScript site inside the existing Delta X project folder, with structured content data separated from presentational components. Use CSS custom properties and focused section components for the editorial “experiment log” visual system, then push the nested site repository to Sites, save an immutable version, and deploy it owner-only for review.

**Tech Stack:** React 19, TypeScript, Vite, CSS, Vitest, Testing Library, Playwright CLI for visual QA, OpenAI Sites for source hosting and deployment.

---

## File map

Implementation root: `01三两的打工tasks/迭代未来管培生工作内容/Delta X官网/site/`

- `.openai/hosting.json` — opaque Sites project binding; contains only `project_id` after site creation.
- `.gitignore` — ignores dependencies, build output, test artifacts, and local credentials.
- `package.json` — scripts and dependencies.
- `vite.config.ts` — Vite and Vitest configuration.
- `tsconfig.json` — strict TypeScript configuration.
- `index.html` — document shell, metadata, and font preconnects.
- `src/main.tsx` — React entry point.
- `src/App.tsx` — page composition only.
- `src/content.ts` — all brand, activity, iteration, builder, and CTA content.
- `src/types.ts` — shared content types.
- `src/styles.css` — tokens, layout, responsive rules, texture, and motion.
- `src/components/Header.tsx` — navigation and primary CTA.
- `src/components/Hero.tsx` — manifesto-led opening section.
- `src/components/Manifesto.tsx` — brand position and support elements.
- `src/components/IterationLoop.tsx` — idea/build/test/iterate framework.
- `src/components/ActivityLog.tsx` — activity cards and honest empty state.
- `src/components/BuilderArchive.tsx` — non-fictional builder philosophy cards.
- `src/components/JoinPanel.tsx` — community, activity, and partnership paths.
- `src/components/Footer.tsx` — version, contact, and return-to-top controls.
- `src/components/Annotation.tsx` — decorative accessible-hidden marks.
- `src/hooks/useActiveStage.ts` — scroll-driven stage marker with static fallback.
- `src/test/setup.ts` — DOM matcher setup.
- `src/content.test.ts` — validates content integrity and safe links.
- `src/App.test.tsx` — validates hierarchy, actions, and fallback states.
- `public/favicon.svg` — Delta X monogram.

### Task 1: Bootstrap the isolated site

**Files:**
- Create: `01三两的打工tasks/迭代未来管培生工作内容/Delta X官网/site/package.json`
- Create: `01三两的打工tasks/迭代未来管培生工作内容/Delta X官网/site/vite.config.ts`
- Create: `01三两的打工tasks/迭代未来管培生工作内容/Delta X官网/site/tsconfig.json`
- Create: `01三两的打工tasks/迭代未来管培生工作内容/Delta X官网/site/index.html`
- Create: `01三两的打工tasks/迭代未来管培生工作内容/Delta X官网/site/.gitignore`
- Create: `01三两的打工tasks/迭代未来管培生工作内容/Delta X官网/site/src/test/setup.ts`

- [ ] **Step 1: Create the package manifest**

```json
{
  "name": "delta-x-iteration-future",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "test": "vitest run",
    "test:watch": "vitest",
    "preview": "vite preview --host 127.0.0.1"
  },
  "dependencies": {
    "@vitejs/plugin-react": "latest",
    "vite": "latest",
    "typescript": "latest",
    "react": "latest",
    "react-dom": "latest"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "latest",
    "@testing-library/react": "latest",
    "@types/react": "latest",
    "@types/react-dom": "latest",
    "jsdom": "latest",
    "vitest": "latest"
  }
}
```

- [ ] **Step 2: Configure Vite, Vitest, and strict TypeScript**

Use React plugin, `jsdom`, `src/test/setup.ts`, `globals: true`, and a strict ES2022 TypeScript target. Configure Vite `base: "/"` so Sites can serve assets at the production root.

- [ ] **Step 3: Add the document shell**

Set title to `Delta X 迭代未来｜把自己的未来迭代出来`, add a Chinese description, theme color `#f25532`, viewport metadata, and a `#root` mount node.

- [ ] **Step 4: Install dependencies and initialize the nested Git repository**

Run from the implementation root:

```powershell
npm install
git init
git branch -M main
```

Expected: dependencies install successfully and `git status` shows only the new site source files.

- [ ] **Step 5: Commit the bootstrap**

```powershell
git add package.json package-lock.json vite.config.ts tsconfig.json index.html .gitignore src/test/setup.ts
git commit -m "chore: bootstrap Delta X site"
```

### Task 2: Define truthful structured content

**Files:**
- Create: `01三两的打工tasks/迭代未来管培生工作内容/Delta X官网/site/src/types.ts`
- Create: `01三两的打工tasks/迭代未来管培生工作内容/Delta X官网/site/src/content.ts`
- Test: `01三两的打工tasks/迭代未来管培生工作内容/Delta X官网/site/src/content.test.ts`

- [ ] **Step 1: Write failing content tests**

```ts
import { activities, brand, ctas, stages } from "./content";

test("brand leads with the approved manifesto", () => {
  expect(brand.headline).toContain("把自己的未来迭代出来");
  expect(brand.description).toContain("中国大学生");
});

test("iteration framework preserves the approved order", () => {
  expect(stages.map((stage) => stage.code)).toEqual([
    "IDEA_01", "BUILD_02", "TEST_03", "PMF_04", "ITERATE_05"
  ]);
});

test("unknown external destinations are not rendered as fake links", () => {
  expect(ctas.every((cta) => cta.href === null || /^https?:|^mailto:/.test(cta.href))).toBe(true);
  expect(activities.every((activity) => activity.registrationUrl === null)).toBe(true);
});
```

- [ ] **Step 2: Run the tests and verify failure**

Run: `npm test -- src/content.test.ts`

Expected: FAIL because `content.ts` does not exist.

- [ ] **Step 3: Implement types and content**

Define `Activity`, `Stage`, `BuilderNote`, and `CallToAction` types. Populate the approved manifesto, five iteration stages, three CTA paths, and an empty activities array. Use `null` for unknown links. Builder cards must describe founder states and questions without inventing named people, projects, metrics, or funding outcomes.

- [ ] **Step 4: Run the content tests**

Run: `npm test -- src/content.test.ts`

Expected: PASS for all three tests.

- [ ] **Step 5: Commit the content model**

```powershell
git add src/types.ts src/content.ts src/content.test.ts
git commit -m "feat: add Delta X content model"
```

### Task 3: Build semantic page components

**Files:**
- Create: `01三两的打工tasks/迭代未来管培生工作内容/Delta X官网/site/src/App.test.tsx`
- Create: `01三两的打工tasks/迭代未来管培生工作内容/Delta X官网/site/src/App.tsx`
- Create: `01三两的打工tasks/迭代未来管培生工作内容/Delta X官网/site/src/main.tsx`
- Create: `01三两的打工tasks/迭代未来管培生工作内容/Delta X官网/site/src/components/*.tsx`

- [ ] **Step 1: Write failing page hierarchy tests**

```tsx
import { render, screen } from "@testing-library/react";
import App from "./App";

test("introduces the belief before organizational details", () => {
  render(<App />);
  const heading = screen.getByRole("heading", { level: 1 });
  expect(heading).toHaveTextContent("把自己的未来迭代出来");
  expect(screen.getByText("查看我们正在做什么")).toHaveAttribute("href", "#now");
});

test("shows an honest activity fallback", () => {
  render(<App />);
  expect(screen.getByText(/下一次实验正在准备/)).toBeInTheDocument();
});

test("offers three distinct ways to join", () => {
  render(<App />);
  expect(screen.getByText("加入创业者社群")).toBeInTheDocument();
  expect(screen.getByText("报名近期活动")).toBeInTheDocument();
  expect(screen.getByText("成为合作伙伴")).toBeInTheDocument();
});
```

- [ ] **Step 2: Verify tests fail**

Run: `npm test -- src/App.test.tsx`

Expected: FAIL because the page components do not exist.

- [ ] **Step 3: Implement focused components**

Compose the page in this order:

```tsx
export default function App() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <Manifesto />
        <IterationLoop />
        <ActivityLog />
        <BuilderArchive />
        <JoinPanel />
      </main>
      <Footer />
    </>
  );
}
```

Use semantic headings, landmarks, lists, buttons/links, and `aria-hidden="true"` on every decorative annotation. When `href` is null, render a non-clickable element with text `入口准备中` rather than an anchor.

- [ ] **Step 4: Run all component tests**

Run: `npm test`

Expected: all content and page hierarchy tests PASS.

- [ ] **Step 5: Commit page structure**

```powershell
git add src
git commit -m "feat: build Delta X page structure"
```

### Task 4: Implement the experiment-log visual system

**Files:**
- Create: `01三两的打工tasks/迭代未来管培生工作内容/Delta X官网/site/src/styles.css`
- Create: `01三两的打工tasks/迭代未来管培生工作内容/Delta X官网/site/public/favicon.svg`
- Modify: all section components to add focused class names and decorative annotations.

- [ ] **Step 1: Add design tokens**

Define paper `#f3f0e8`, ink `#171713`, iteration orange `#f25532`, signal blue `#2563eb`, acid green `#b8ff3d`, muted gray, 8px spacing scale, editorial max-width, and fluid type with `clamp()`.

- [ ] **Step 2: Build the editorial layout**

Create a sticky paper-like header, oversized hero type, asymmetric manifesto grid, numbered iteration rail, status-led activity cards, builder archive notes, and orange closing panel. Add subtle grain with CSS gradients only; do not fetch stock photos or represent fictional people.

- [ ] **Step 3: Add hand-made annotations**

Use inline SVG paths for arrows, loops, underlines, tape, and version stamps. Keep them decorative, pointer-transparent, and limited to one or two focal annotations per section.

- [ ] **Step 4: Add responsive behavior**

At widths under 760px, collapse grids, reduce decorations, keep every CTA at least 44px tall, preserve activity metadata, and prevent horizontal page overflow. At widths above 1200px, cap paragraph measure while allowing headings to span the editorial grid.

- [ ] **Step 5: Verify the production build**

Run: `npm run build`

Expected: TypeScript and Vite finish successfully and create `dist/index.html` plus hashed assets.

- [ ] **Step 6: Commit visual implementation**

```powershell
git add src public
git commit -m "feat: add experiment log visual system"
```

### Task 5: Add restrained motion and accessibility fallbacks

**Files:**
- Create: `01三两的打工tasks/迭代未来管培生工作内容/Delta X官网/site/src/hooks/useActiveStage.ts`
- Modify: `src/components/Header.tsx`
- Modify: `src/components/IterationLoop.tsx`
- Modify: `src/styles.css`
- Test: `src/App.test.tsx`

- [ ] **Step 1: Add a failing reduced-motion assertion**

Add a test that every decorative annotation is `aria-hidden` and that the stage marker has readable static text before any intersection event.

- [ ] **Step 2: Implement stage observation**

Use `IntersectionObserver` to update the visible stage code while scrolling. When the API is unavailable, keep `IDEA_01` as the readable default. Disconnect the observer on unmount.

- [ ] **Step 3: Implement motion rules**

Use opacity, translate, and SVG stroke animation only. Under `@media (prefers-reduced-motion: reduce)`, set animation and transition durations to near-zero and disable smooth scrolling.

- [ ] **Step 4: Run tests and build**

Run: `npm test; npm run build`

Expected: tests PASS and production build succeeds.

- [ ] **Step 5: Commit interaction work**

```powershell
git add src
git commit -m "feat: add accessible iteration motion"
```

### Task 6: Browser QA and visual refinement

**Files:**
- Modify only the source files implicated by QA findings.
- Create temporarily and then remove: `output/playwright/delta-x-desktop.png`, `output/playwright/delta-x-mobile.png`.

- [ ] **Step 1: Start the preview server**

Run `npm run preview -- --port 4173` in the background with a hidden window.

- [ ] **Step 2: Capture desktop and mobile screenshots**

Use Playwright with the installed Edge channel:

```powershell
npx playwright screenshot --channel msedge --viewport-size="1440,1000" --full-page http://127.0.0.1:4173 output/playwright/delta-x-desktop.png
npx playwright screenshot --channel msedge --device="iPhone 13" --full-page http://127.0.0.1:4173 output/playwright/delta-x-mobile.png
```

- [ ] **Step 3: Inspect and correct visual issues**

Verify no text clipping, overflow, accidental empty zones, illegible annotations, unsupported glyphs, or CTA confusion. Confirm the page feels young and alive without reading as a student club poster.

- [ ] **Step 4: Re-run verification**

Run: `npm test; npm run build`

Expected: tests PASS and build succeeds after refinements.

- [ ] **Step 5: Remove temporary screenshots and commit refinements**

```powershell
git add src public
git commit -m "fix: refine responsive Delta X presentation"
```

### Task 7: Create, save, and privately deploy with Sites

**Files:**
- Create after Sites returns the opaque ID: `01三两的打工tasks/迭代未来管培生工作内容/Delta X官网/site/.openai/hosting.json`
- Modify: nested Git repository remote configuration only.

- [ ] **Step 1: Check for an existing Sites binding**

Read `.openai/hosting.json`. If it contains `project_id`, reuse it exactly. If the file is absent, list owned Sites to ensure no existing Delta X site should be reused, then create one site with title `Delta X 迭代未来`, slug `delta-x-iteration`, and the approved brand description.

- [ ] **Step 2: Persist the returned ID immediately**

Create `.openai/hosting.json` with one `project_id` property whose value is copied verbatim from the connector response. Do not add a slug, title, credential, token, or derived identifier to this file.

- [ ] **Step 3: Commit the Sites binding**

```powershell
git add .openai/hosting.json
git commit -m "chore: bind Delta X site hosting"
```

- [ ] **Step 4: Push the exact source state**

Use the short-lived Sites credential only through per-command Git authentication. Push nested-repository `HEAD` to the returned source branch, then record `git rev-parse HEAD`. Do not save the token in Git configuration, files, shell history, or logs.

- [ ] **Step 5: Save an immutable Sites version**

Call Sites `save_site_version` with the exact `project_id` and pushed `HEAD` commit SHA. Retain the returned version ID and version number.

- [ ] **Step 6: Deploy owner-only for review**

Call `deploy_private_site_version` with the exact site and version IDs. If access is not owner-only and the tool refuses, stop before public deployment and request explicit approval from the user.

- [ ] **Step 7: Verify deployment status**

If deployment is pending, building, or publishing, use `get_deployment_status` until it reaches `succeeded` or `failed`. On success, open the returned URL and verify the hero, navigation, mobile layout, and all available actions.

- [ ] **Step 8: Report the review URL and known content placeholders**

Report the Sites URL, saved version number, local source path, and the intentionally inactive community/activity/partnership links that still require real destinations.

## Final verification checklist

- [ ] `npm test` passes.
- [ ] `npm run build` succeeds.
- [ ] Desktop and mobile screenshots show no overflow or clipping.
- [ ] Core belief appears before institutional explanation.
- [ ] No fictional people, projects, metrics, events, or external links appear.
- [ ] Reduced-motion users receive a stable, readable page.
- [ ] `.openai/hosting.json` contains the exact connector-returned project ID.
- [ ] Pushed commit SHA equals the commit passed to Sites.
- [ ] A saved Sites version exists before deployment.
- [ ] Private deployment succeeds, or public deployment is paused pending explicit approval.
