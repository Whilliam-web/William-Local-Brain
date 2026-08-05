"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => WhiliamWorkbenchMemoryPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian3 = require("obsidian");

// src/activity.ts
var DAY_MS = 24 * 60 * 60 * 1e3;
function eventKey(event) {
  return `${event.date}:${event.path.replace(/\\/g, "/").toLowerCase()}`;
}
function mergedKind(current, incoming) {
  if (current.kind === "create" || incoming.kind === "create") return "create";
  return incoming.kind;
}
function foldActivity(existing, incoming) {
  const byKey = /* @__PURE__ */ new Map();
  for (const event of [...existing, ...incoming]) {
    const key = eventKey(event);
    const current = byKey.get(key);
    if (!current) {
      byKey.set(key, { ...event });
      continue;
    }
    byKey.set(key, {
      ...current,
      ...event,
      id: current.id,
      firstSeen: Math.min(current.firstSeen, event.firstSeen),
      lastSeen: Math.max(current.lastSeen, event.lastSeen),
      kind: mergedKind(current, event),
      changeCount: current.changeCount + event.changeCount
    });
  }
  return [...byKey.values()].sort((a, b) => a.firstSeen - b.firstSeen || a.path.localeCompare(b.path));
}
function toCandidate(event, selectedByDefault) {
  return { ...event, selectedByDefault };
}
function pruneEvents(events, now, retentionDays) {
  const cutoff = now - retentionDays * DAY_MS;
  return events.filter((event) => event.lastSeen >= cutoff);
}

// src/rules.ts
var TRACKED_PREFIXES = [
  "00\u6536\u4EF6\u7BB1/\u65E5\u5386\u5907\u5FD8\u5F55/",
  "01\u4E09\u4E24\u7684\u6253\u5DE5tasks/",
  "02\u6DF1\u8015\u9886\u57DF/",
  "03\u767E\u5B9D\u7BB1/",
  "05\u5FC3\u6CD5/"
];
var EXCLUDED_PREFIXES = [
  ".obsidian/",
  ".git/",
  ".claudian/",
  "06\u6A21\u7248/",
  "99\u7CFB\u7EDF/\u9644\u4EF6\u5E93/"
];
function normalize(path) {
  return path.replace(/\\/g, "/").replace(/^\.\//, "");
}
function shouldTrackPath(path) {
  const normalized = normalize(path);
  const lower = normalized.toLowerCase();
  if (!lower.endsWith(".md")) return false;
  if (EXCLUDED_PREFIXES.some((prefix) => lower.startsWith(prefix.toLowerCase()))) return false;
  if (lower.includes("/node_modules/")) return false;
  if (/\.bak(?:_|$)/i.test(lower) || /(?:^|\/)temp(?:\.|-|_)/i.test(lower)) return false;
  if (normalized === "01\u4E09\u4E24\u7684\u6253\u5DE5tasks/\u4E2A\u4EBA\u5DE5\u4F5C\u53F0/\u5386\u53F2\u4E1A\u52A1\u8BB0\u5F55\u7D22\u5F15.md") return false;
  if (normalized === "99\u7CFB\u7EDF/\u9879\u76EE\u8BB0\u5FC6\u7D22\u5F15.md") return true;
  return TRACKED_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}
function stringValue(value) {
  if (typeof value !== "string") return void 0;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : void 0;
}
function tagsFrom(frontmatter) {
  const tags = frontmatter.tags;
  if (Array.isArray(tags)) return tags.filter((tag) => typeof tag === "string");
  if (typeof tags === "string") return tags.split(/[\s,]+/).filter(Boolean);
  return [];
}
function inferProject(path, frontmatter) {
  const explicit = stringValue(frontmatter.project);
  if (explicit) return explicit;
  const normalized = normalize(path);
  if (normalized.includes("/Delta X\u5B98\u7F51/")) return "Delta X \u5B98\u7F51";
  if (normalized.includes("/Delta Space/")) return "Delta Space";
  if (normalized.includes("/SRTP\u9879\u76EE/")) return "SRTP";
  if (normalized.includes("/\u4E2A\u4EBA\u5DE5\u4F5C\u53F0/")) return "\u4E2A\u4EBA\u5DE5\u4F5C\u53F0";
  const taskPrefix = "01\u4E09\u4E24\u7684\u6253\u5DE5tasks/";
  if (normalized.startsWith(taskPrefix)) {
    return normalized.slice(taskPrefix.length).split("/")[0] || void 0;
  }
  return void 0;
}
function inferCategory(path, frontmatter) {
  const normalized = normalize(path);
  const fileName = normalized.split("/").at(-1) ?? normalized;
  const type = stringValue(frontmatter.type)?.toLowerCase();
  const explicit = stringValue(frontmatter.category)?.toLowerCase();
  const tags = tagsFrom(frontmatter).map((tag) => tag.toLowerCase());
  if (explicit === "work" || explicit === "learning" || explicit === "planning" || explicit === "knowledge") {
    return explicit;
  }
  if (type === "record" || tags.includes("work-record") || fileName.includes("\u5DE5\u4F5C\u8BB0\u5F55")) return "work";
  if (type === "learning" || tags.includes("learning") || normalized.startsWith("02\u6DF1\u8015\u9886\u57DF/")) return "learning";
  if (/(计划|规划|方案|路线图)/.test(fileName)) return "planning";
  if (normalized.startsWith("03\u767E\u5B9D\u7BB1/") || normalized.startsWith("05\u5FC3\u6CD5/") || /(知识库|整理|归档|索引)/.test(fileName)) {
    return "knowledge";
  }
  return "work";
}
function classifyPath(path, frontmatter) {
  const normalized = normalize(path);
  const category = inferCategory(normalized, frontmatter);
  const project = inferProject(normalized, frontmatter);
  const selectedByDefault = normalized.startsWith("01\u4E09\u4E24\u7684\u6253\u5DE5tasks/") || normalized.startsWith("02\u6DF1\u8015\u9886\u57DF/") || normalized.startsWith("03\u767E\u5B9D\u7BB1/") || normalized.startsWith("05\u5FC3\u6CD5/");
  return project ? { category, project, selectedByDefault } : { category, selectedByDefault };
}

// src/reconcile.ts
function fileSignature(input) {
  return `${input.mtime}:${input.size}:${input.contentHashPrefix}`;
}
function dateInShanghai(timestamp) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date(timestamp));
  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${byType.year}-${byType.month}-${byType.day}`;
}
function titleFrom(path) {
  const fileName = path.replace(/\\/g, "/").split("/").at(-1) ?? path;
  return fileName.replace(/\.md$/i, "");
}
function makeEvent(path, kind, timestamp, previousPath) {
  const date = dateInShanghai(timestamp);
  const classification = classifyPath(path, {});
  const base = {
    id: `${date}:${path.replace(/\\/g, "/").toLowerCase()}`,
    date,
    firstSeen: timestamp,
    lastSeen: timestamp,
    kind,
    path,
    title: titleFrom(path),
    category: classification.category,
    changeCount: 1
  };
  if (classification.project) base.project = classification.project;
  if (previousPath) base.previousPath = previousPath;
  return base;
}
function trackedEntries(snapshot) {
  return Object.entries(snapshot).filter(([path]) => shouldTrackPath(path));
}
function reconcileSnapshots(previous, current, timestamp) {
  const previousTracked = Object.fromEntries(trackedEntries(previous));
  const currentTracked = Object.fromEntries(trackedEntries(current));
  const events = [];
  const removed = new Set(Object.keys(previousTracked).filter((path) => !(path in currentTracked)));
  const added = new Set(Object.keys(currentTracked).filter((path) => !(path in previousTracked)));
  for (const addedPath of [...added]) {
    const signature = currentTracked[addedPath];
    const previousPath = [...removed].find((path) => previousTracked[path] === signature);
    if (!previousPath) continue;
    events.push(makeEvent(addedPath, "rename", timestamp, previousPath));
    added.delete(addedPath);
    removed.delete(previousPath);
  }
  for (const path of added) {
    events.push(makeEvent(path, "reconcile", timestamp));
  }
  for (const [path, signature] of Object.entries(currentTracked)) {
    if (!(path in previousTracked) || previousTracked[path] === signature) continue;
    events.push(makeEvent(path, "reconcile", timestamp));
  }
  for (const path of removed) {
    events.push(makeEvent(path, "delete", timestamp));
  }
  return {
    events: events.sort((a, b) => a.path.localeCompare(b.path)),
    signatures: currentTracked
  };
}

// src/controller.ts
var RETENTION_DAYS = 90;
function normalizePath(path) {
  return path.replace(/\\/g, "/").replace(/^\.\//, "");
}
function titleFrom2(path) {
  return normalizePath(path).split("/").at(-1)?.replace(/\.md$/i, "") ?? path;
}
function eventKey2(event) {
  return `${event.date}:${normalizePath(event.path).toLowerCase()}`;
}
function cloneData(data) {
  return structuredClone(data);
}
var WorkbenchController = class {
  constructor(dependencies) {
    this.dependencies = dependencies;
  }
  dependencies;
  dirty = false;
  async reconcileStartup(currentSignatures) {
    const data = this.dependencies.store.data;
    const timestamp = this.dependencies.now();
    if (data.lastReconciledAt === 0) {
      data.fileSignatures = reconcileSnapshots(currentSignatures, currentSignatures, timestamp).signatures;
      data.lastReconciledAt = timestamp;
      this.dirty = true;
      await this.flush();
      return;
    }
    const result = reconcileSnapshots(data.fileSignatures, currentSignatures, timestamp);
    for (const event of result.events) {
      await this.handleVaultEvent(event.kind, event.path, {}, event.previousPath);
    }
    data.fileSignatures = result.signatures;
    data.lastReconciledAt = timestamp;
    this.dirty = true;
    await this.flush();
  }
  async handleVaultEvent(kind, path, frontmatter, previousPath) {
    const normalized = normalizePath(path);
    if (!shouldTrackPath(normalized)) return;
    const timestamp = this.dependencies.now();
    const date = dateInShanghai(timestamp);
    const classification = classifyPath(normalized, frontmatter);
    const event = {
      id: `${date}:${normalized.toLowerCase()}`,
      date,
      firstSeen: timestamp,
      lastSeen: timestamp,
      kind,
      path: normalized,
      title: titleFrom2(normalized),
      category: classification.category,
      changeCount: 1
    };
    if (classification.project) event.project = classification.project;
    if (previousPath) event.previousPath = normalizePath(previousPath);
    const data = this.dependencies.store.data;
    data.events = pruneEvents(foldActivity(data.events, [event]), timestamp, RETENTION_DAYS);
    const incomingKey = eventKey2(event);
    if (kind === "delete") {
      data.candidates = data.candidates.filter((candidate) => eventKey2(candidate) !== incomingKey);
    } else {
      const selectedByKey = new Map(
        data.candidates.map((candidate) => [eventKey2(candidate), candidate.selectedByDefault])
      );
      if (!selectedByKey.has(incomingKey)) {
        selectedByKey.set(incomingKey, classification.selectedByDefault);
      }
      data.candidates = pruneEvents(
        foldActivity(data.candidates, [event]),
        timestamp,
        RETENTION_DAYS
      ).map((candidate) => toCandidate(candidate, selectedByKey.get(eventKey2(candidate)) ?? false));
    }
    this.dirty = true;
  }
  snapshotForDate(date) {
    const data = this.dependencies.store.data;
    const candidates = data.candidates.filter((candidate) => candidate.date === date).map((candidate) => ({ ...candidate })).sort((left, right) => right.lastSeen - left.lastSeen || left.path.localeCompare(right.path));
    const projects = [...new Set(candidates.flatMap((candidate) => candidate.project ? [candidate.project] : []))].sort((left, right) => left.localeCompare(right));
    const reviewPath = data.completedReviews[date];
    const snapshot = {
      date,
      reviewed: Boolean(reviewPath),
      projects,
      candidates
    };
    if (reviewPath) snapshot.reviewPath = reviewPath;
    return snapshot;
  }
  async completeReview(submission) {
    const path = await this.dependencies.reviewWriter.write(submission);
    this.dependencies.store.data.completedReviews[submission.date] = path;
    await this.dependencies.store.save(cloneData(this.dependencies.store.data));
    this.dependencies.refresh();
    return path;
  }
  async flush() {
    if (!this.dirty) return;
    await this.dependencies.store.save(cloneData(this.dependencies.store.data));
    this.dirty = false;
    this.dependencies.refresh();
  }
};

// src/obsidian-review-writer.ts
var import_obsidian = require("obsidian");

// src/daily-note.ts
function normalize2(path) {
  return path.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
}
function dailyNotePath(date, folder) {
  const normalizedFolder = normalize2(folder);
  return normalizedFolder ? `${normalizedFolder}/${date}.md` : `${date}.md`;
}
function templatePathCandidates(configuredPath) {
  const normalized = normalize2(configuredPath);
  if (!normalized) return [];
  if (/\.md$/i.test(normalized)) return [normalized];
  return [normalized, `${normalized}.md`];
}
function renderDailyTemplate(template, values) {
  return template.replace(/{{date}}/g, values.date).replace(/{{time}}/g, values.time).replace(/{{title}}/g, values.title);
}

// src/review.ts
var REVIEW_START = "%% workbench-review:start %%";
var REVIEW_END = "%% workbench-review:end %%";
var LEGACY_REVIEW_START = "<!-- workbench-review:start -->";
var LEGACY_REVIEW_END = "<!-- workbench-review:end -->";
var ReviewMarkerError = class extends Error {
  constructor(message = "Workbench review markers are missing, duplicated, or out of order.") {
    super(message);
    this.name = "ReviewMarkerError";
  }
};
var CATEGORY_LABEL = {
  work: "\u5DE5\u4F5C",
  learning: "\u5B66\u4E60",
  planning: "\u89C4\u5212",
  knowledge: "\u77E5\u8BC6\u6574\u7406"
};
function countCategory(submission, categories) {
  return submission.selections.filter((selection) => categories.includes(selection.category)).length;
}
function buildFrontmatterPatch(submission) {
  return {
    review_status: "done",
    work_changes: countCategory(submission, ["work"]),
    learning_changes: countCategory(submission, ["learning", "knowledge"]),
    planning_changes: countCategory(submission, ["planning"]),
    review_progress: submission.progress.trim(),
    review_learning: submission.learning.trim(),
    tomorrow_focus: submission.tomorrowFocus.trim()
  };
}
function noteTitle(path) {
  return path.replace(/\\/g, "/").replace(/\.md$/i, "").split("/").at(-1) ?? path;
}
function linkFor(path) {
  const normalized = path.replace(/\\/g, "/").replace(/\.md$/i, "");
  return `[[${normalized}|${noteTitle(path).replace(/\|/g, "\uFF5C")}]]`;
}
function quoted(value) {
  const lines = value.trim().split(/\r?\n/);
  return lines.map((line) => `> ${line}`);
}
function renderReviewBlock(submission) {
  const lines = [
    REVIEW_START,
    "> [!closing-edition] \u4ECA\u65E5\u6536\u520A",
    "> **\u4ECA\u5929\u771F\u6B63\u63A8\u8FDB\u4E86\u4EC0\u4E48\uFF1F**",
    ...quoted(submission.progress || "\u672A\u586B\u5199"),
    ">",
    "> **\u4ECA\u5929\u5F62\u6210\u4E86\u4EC0\u4E48\u65B0\u7406\u89E3\uFF1F**",
    ...quoted(submission.learning || "\u672A\u586B\u5199"),
    ">",
    "> **\u660E\u5929\u6700\u91CD\u8981\u7684\u4E00\u6B65\u662F\u4EC0\u4E48\uFF1F**",
    ...quoted(submission.tomorrowFocus || "\u672A\u586B\u5199"),
    ">",
    "> **\u786E\u8BA4\u53D8\u5316**"
  ];
  if (submission.selections.length === 0) {
    lines.push("> - \u4ECA\u65E5\u6CA1\u6709\u9009\u62E9\u5019\u9009\u53D8\u5316\u3002");
  } else {
    for (const selection of submission.selections) {
      const summary = selection.summary.trim().replace(/\|/g, "\uFF5C");
      lines.push(`> - \`${CATEGORY_LABEL[selection.category]}\` ${summary} \u2014 ${linkFor(selection.sourcePath)}`);
    }
  }
  lines.push(REVIEW_END);
  return lines.join("\n");
}
function occurrences(content, marker) {
  return content.split(marker).length - 1;
}
function upsertReviewBlock(content, renderedBlock) {
  const startCount = occurrences(content, REVIEW_START);
  const endCount = occurrences(content, REVIEW_END);
  const legacyStartCount = occurrences(content, LEGACY_REVIEW_START);
  const legacyEndCount = occurrences(content, LEGACY_REVIEW_END);
  if (startCount === 0 && endCount === 0 && legacyStartCount === 0 && legacyEndCount === 0) {
    return `${content.trimEnd()}

${renderedBlock.trim()}
`;
  }
  const hasCurrentPair = startCount === 1 && endCount === 1 && legacyStartCount === 0 && legacyEndCount === 0;
  const hasLegacyPair = legacyStartCount === 1 && legacyEndCount === 1 && startCount === 0 && endCount === 0;
  if (!hasCurrentPair && !hasLegacyPair) throw new ReviewMarkerError();
  const startMarker = hasCurrentPair ? REVIEW_START : LEGACY_REVIEW_START;
  const endMarker = hasCurrentPair ? REVIEW_END : LEGACY_REVIEW_END;
  const start = content.indexOf(startMarker);
  const end = content.indexOf(endMarker);
  if (start < 0 || end < start) throw new ReviewMarkerError();
  const afterEnd = end + endMarker.length;
  return `${content.slice(0, start)}${renderedBlock.trim()}${content.slice(afterEnd)}`;
}

// src/obsidian-review-writer.ts
var makeMoment = import_obsidian.moment;
function stringSetting(value) {
  return typeof value === "string" && value.trim() ? value.trim() : void 0;
}
var ObsidianReviewWriter = class {
  constructor(app) {
    this.app = app;
  }
  app;
  async write(submission) {
    const config = await this.readDailyNotesConfig();
    const parsedDate = makeMoment(submission.date, "YYYY-MM-DD", true);
    if (!parsedDate.isValid()) throw new Error(`\u65E0\u6548\u590D\u76D8\u65E5\u671F\uFF1A${submission.date}`);
    const format = stringSetting(config.format) ?? "YYYY-MM-DD";
    const title = parsedDate.format(format);
    const path = (0, import_obsidian.normalizePath)(dailyNotePath(title, stringSetting(config.folder) ?? ""));
    const file = await this.ensureDailyNote(path, config, title);
    const renderedBlock = renderReviewBlock(submission);
    await this.app.vault.process(file, (content) => upsertReviewBlock(content, renderedBlock));
    const patch = buildFrontmatterPatch(submission);
    await this.app.fileManager.processFrontMatter(file, (frontmatter) => {
      Object.assign(frontmatter, patch);
    });
    return file.path;
  }
  async readDailyNotesConfig() {
    const path = (0, import_obsidian.normalizePath)(`${this.app.vault.configDir}/daily-notes.json`);
    if (!await this.app.vault.adapter.exists(path)) return {};
    try {
      const parsed = JSON.parse(await this.app.vault.adapter.read(path));
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return {};
      const raw = parsed;
      const config = {};
      const folder = stringSetting(raw.folder);
      const format = stringSetting(raw.format);
      const template = stringSetting(raw.template);
      if (folder) config.folder = folder;
      if (format) config.format = format;
      if (template) config.template = template;
      return config;
    } catch (error) {
      throw new Error(`\u65E0\u6CD5\u8BFB\u53D6 Daily Notes \u914D\u7F6E\uFF1A${String(error)}`);
    }
  }
  async ensureDailyNote(path, config, title) {
    const existing = this.app.vault.getAbstractFileByPath(path);
    if (existing instanceof import_obsidian.TFile) return existing;
    if (existing) throw new Error(`\u65E5\u8BB0\u8DEF\u5F84\u88AB\u975E\u6587\u4EF6\u5360\u7528\uFF1A${path}`);
    const folder = path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "";
    await this.ensureFolder(folder);
    const template = await this.readTemplate(config.template);
    const initial = renderDailyTemplate(template, {
      date: title,
      time: makeMoment().format("HH:mm"),
      title
    });
    return this.app.vault.create(path, initial);
  }
  async readTemplate(configuredPath) {
    if (!configuredPath) return "";
    for (const path of templatePathCandidates(configuredPath)) {
      const file = this.app.vault.getAbstractFileByPath((0, import_obsidian.normalizePath)(path));
      if (file instanceof import_obsidian.TFile) return this.app.vault.read(file);
    }
    throw new Error(`Daily Notes \u6A21\u677F\u4E0D\u5B58\u5728\uFF1A${configuredPath}`);
  }
  async ensureFolder(folder) {
    if (!folder) return;
    const parts = (0, import_obsidian.normalizePath)(folder).split("/");
    for (let index = 1; index <= parts.length; index += 1) {
      const partial = parts.slice(0, index).join("/");
      if (!this.app.vault.getAbstractFileByPath(partial)) await this.app.vault.createFolder(partial);
    }
  }
};

// src/renderer.ts
var CATEGORY_LABEL2 = {
  work: "\u5DE5\u4F5C",
  learning: "\u5B66\u4E60",
  planning: "\u89C4\u5212",
  knowledge: "\u77E5\u8BC6\u6574\u7406"
};
function candidateView(candidate) {
  const view = {
    id: candidate.id,
    title: candidate.title,
    path: candidate.path,
    categoryLabel: CATEGORY_LABEL2[candidate.category],
    changeLabel: candidate.changeCount === 1 ? "1 \u6B21\u53D8\u5316" : `${candidate.changeCount} \u6B21\u53D8\u5316`
  };
  if (candidate.project) view.project = candidate.project;
  return view;
}
function buildWorkbenchViewModel(snapshot) {
  const allCandidates = snapshot.candidates.map(candidateView);
  const reviewPath = snapshot.reviewPath;
  const model = {
    date: snapshot.date,
    reviewed: snapshot.reviewed,
    statusLabel: snapshot.reviewed ? "\u4ECA\u65E5\u5DF2\u6536\u675F" : allCandidates.length > 0 ? `\u5DF2\u6355\u6349 ${allCandidates.length} \u9879\u6709\u6548\u53D8\u5316` : "\u7B49\u5F85\u4ECA\u5929\u7684\u6709\u6548\u53D8\u5316",
    projectSummary: snapshot.projects.length > 0 ? snapshot.projects.join(" \xB7 ") : "\u5C1A\u672A\u8BC6\u522B\u5230\u8FDB\u884C\u4E2D\u7684\u9879\u76EE",
    candidateCount: allCandidates.length,
    visibleCandidates: allCandidates.slice(0, 6),
    allCandidates,
    hiddenCount: Math.max(0, allCandidates.length - 6),
    emptyMessage: "\u5F00\u59CB\u5DE5\u4F5C\u540E\uFF0C\u7B26\u5408\u89C4\u5219\u7684\u7B14\u8BB0\u53D8\u5316\u4F1A\u6E29\u548C\u5730\u51FA\u73B0\u5728\u8FD9\u91CC\u3002",
    primaryActionLabel: snapshot.reviewed ? "\u67E5\u770B\u4ECA\u65E5\u590D\u76D8" : "\u5F00\u59CB\u665A\u95F4\u590D\u76D8"
  };
  if (reviewPath) model.reviewPath = reviewPath;
  return model;
}
function textElement(tag, className, text) {
  const element = document.createElement(tag);
  element.className = className;
  element.textContent = text;
  return element;
}
function renderCandidate(candidate, actions) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "wwm-candidate";
  button.addEventListener("click", () => actions.openPath(candidate.path));
  const heading = document.createElement("span");
  heading.className = "wwm-candidate__heading";
  heading.append(
    textElement("span", "wwm-candidate__title", candidate.title),
    textElement("span", "wwm-candidate__count", candidate.changeLabel)
  );
  const metadata = [candidate.categoryLabel, candidate.project].filter(Boolean).join(" \xB7 ");
  button.append(heading, textElement("span", "wwm-candidate__meta", metadata));
  return button;
}
function renderWorkbenchMemory(element, snapshot, actions) {
  const model = buildWorkbenchViewModel(snapshot);
  element.replaceChildren();
  element.classList.add("wwm-root");
  const header = document.createElement("header");
  header.className = "wwm-header";
  const headingGroup = document.createElement("div");
  headingGroup.append(
    textElement("span", "wwm-eyebrow", "TODAY \xB7 AUTO MEMORY"),
    textElement("h3", "wwm-title", "\u4ECA\u65E5\u5DE5\u4F5C\u8BB0\u5FC6")
  );
  header.append(headingGroup, textElement("span", `wwm-status${model.reviewed ? " is-done" : ""}`, model.statusLabel));
  const project = document.createElement("div");
  project.className = "wwm-project";
  project.append(
    textElement("span", "wwm-project__label", "\u5F53\u524D\u8109\u7EDC"),
    textElement("span", "wwm-project__value", model.projectSummary)
  );
  const list = document.createElement("div");
  list.className = "wwm-list";
  const renderList = (candidates) => {
    list.replaceChildren();
    if (candidates.length === 0) {
      list.append(textElement("p", "wwm-empty", model.emptyMessage));
      return;
    }
    list.append(...candidates.map((candidate) => renderCandidate(candidate, actions)));
  };
  renderList(model.visibleCandidates);
  const footer = document.createElement("footer");
  footer.className = "wwm-footer";
  if (model.hiddenCount > 0) {
    const showAll = document.createElement("button");
    showAll.type = "button";
    showAll.className = "wwm-secondary";
    showAll.textContent = `\u67E5\u770B\u5176\u4F59 ${model.hiddenCount} \u9879`;
    showAll.addEventListener("click", () => {
      renderList(model.allCandidates);
      showAll.remove();
    });
    footer.append(showAll);
  } else {
    footer.append(textElement("span", "wwm-candidate-total", `${model.candidateCount} \u9879\u5019\u9009`));
  }
  const primary = document.createElement("button");
  primary.type = "button";
  primary.className = "wwm-primary";
  primary.textContent = model.primaryActionLabel;
  primary.addEventListener("click", () => {
    if (model.reviewed && model.reviewPath) actions.openPath(model.reviewPath);
    else actions.startReview();
  });
  footer.append(primary);
  element.append(header, project, list, footer);
}

// src/review-modal.ts
var import_obsidian2 = require("obsidian");
var CATEGORY_OPTIONS = [
  { value: "work", label: "\u5DE5\u4F5C\u63A8\u8FDB" },
  { value: "learning", label: "\u5B66\u4E60\u8BB0\u5F55" },
  { value: "planning", label: "\u8BA1\u5212\u8C03\u6574" },
  { value: "knowledge", label: "\u77E5\u8BC6\u6574\u7406" }
];
var WorkbenchReviewModal = class extends import_obsidian2.Modal {
  constructor(app, snapshot, submitReview) {
    super(app);
    this.snapshot = snapshot;
    this.submitReview = submitReview;
  }
  snapshot;
  submitReview;
  onOpen() {
    this.modalEl.addClass("wwm-review-modal");
    this.titleEl.setText("\u4ECA\u665A\uFF0C\u628A\u4ECA\u5929\u6536\u675F\u6210\u4E09\u53E5\u8BDD");
    const content = this.contentEl;
    content.replaceChildren();
    const introduction = document.createElement("p");
    introduction.className = "wwm-review-intro";
    introduction.textContent = "\u7CFB\u7EDF\u53EA\u63D0\u4F9B\u5019\u9009\uFF0C\u6700\u7EC8\u5199\u8FDB\u65E5\u8BB0\u7684\u5185\u5BB9\u7531\u4F60\u786E\u8BA4\u3002\u672A\u9009\u4E2D\u7684\u53D8\u5316\u4ECD\u4FDD\u7559\u5728\u672C\u5730\u6D3B\u52A8\u8BB0\u5FC6\u4E2D\u3002";
    content.append(introduction);
    const candidateSection = document.createElement("section");
    candidateSection.className = "wwm-review-section";
    const candidateHeading = document.createElement("h3");
    candidateHeading.textContent = "\u786E\u8BA4\u4ECA\u5929\u771F\u6B63\u53D1\u751F\u7684\u53D8\u5316";
    candidateSection.append(candidateHeading);
    const rows = [];
    if (this.snapshot.candidates.length === 0) {
      const empty = document.createElement("p");
      empty.className = "wwm-review-empty";
      empty.textContent = "\u4ECA\u5929\u6CA1\u6709\u81EA\u52A8\u5019\u9009\uFF0C\u4E5F\u53EF\u4EE5\u53EA\u5B8C\u6210\u4E09\u53E5\u8BDD\u590D\u76D8\u3002";
      candidateSection.append(empty);
    } else {
      this.snapshot.candidates.forEach((candidate, candidateIndex) => {
        const row = document.createElement("label");
        row.className = "wwm-review-candidate";
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = candidate.selectedByDefault;
        const main = document.createElement("span");
        main.className = "wwm-review-candidate__main";
        const title = document.createElement("strong");
        title.textContent = candidate.title;
        const path = document.createElement("small");
        path.textContent = candidate.project ? `${candidate.project} \xB7 ${candidate.changeCount} \u6B21\u53D8\u5316` : `${candidate.changeCount} \u6B21\u53D8\u5316`;
        main.append(title, path);
        const select = document.createElement("select");
        select.setAttribute("aria-label", `${candidate.title} \u7684\u7C7B\u522B`);
        for (const option of CATEGORY_OPTIONS) {
          const element = document.createElement("option");
          element.value = option.value;
          element.textContent = option.label;
          element.selected = option.value === candidate.category;
          select.append(element);
        }
        row.append(checkbox, main, select);
        candidateSection.append(row);
        rows.push({ checked: checkbox, category: select, candidateIndex });
      });
    }
    content.append(candidateSection);
    const progress = this.createQuestion(content, "\u4ECA\u5929\u771F\u6B63\u63A8\u8FDB\u4E86\u4EC0\u4E48\uFF1F", "\u5199\u4E0B\u4E00\u4E2A\u5177\u4F53\u7ED3\u679C\uFF0C\u800C\u4E0D\u662F\u4EFB\u52A1\u6E05\u5355\u3002");
    const learning = this.createQuestion(content, "\u4ECA\u5929\u5F62\u6210\u4E86\u4EC0\u4E48\u65B0\u7406\u89E3\uFF1F", "\u53EF\u4EE5\u662F\u4E00\u4E2A\u5224\u65AD\u3001\u65B9\u6CD5\u6216\u9700\u8981\u7EE7\u7EED\u9A8C\u8BC1\u7684\u95EE\u9898\u3002");
    const tomorrow = this.createQuestion(content, "\u660E\u5929\u6700\u91CD\u8981\u7684\u4E00\u6B65\u662F\u4EC0\u4E48\uFF1F", "\u53EA\u7559\u4E00\u4E2A\u8DB3\u591F\u660E\u786E\u3001\u53EF\u4EE5\u5F00\u59CB\u7684\u52A8\u4F5C\u3002");
    const actions = document.createElement("div");
    actions.className = "wwm-review-actions";
    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.textContent = "\u7A0D\u540E\u518D\u8BF4";
    cancel.addEventListener("click", () => this.close());
    const save = document.createElement("button");
    save.type = "button";
    save.className = "mod-cta";
    save.textContent = "\u5B8C\u6210\u4ECA\u65E5\u6536\u520A";
    save.addEventListener("click", () => {
      void this.save(rows, progress, learning, tomorrow, save);
    });
    actions.append(cancel, save);
    content.append(actions);
  }
  onClose() {
    this.contentEl.replaceChildren();
  }
  createQuestion(parent, question, hint) {
    const label = document.createElement("label");
    label.className = "wwm-review-question";
    const heading = document.createElement("strong");
    heading.textContent = question;
    const helper = document.createElement("small");
    helper.textContent = hint;
    const textarea = document.createElement("textarea");
    textarea.rows = 3;
    textarea.placeholder = "\u5728\u8FD9\u91CC\u5199\u4E00\u53E5\u8BDD\u2026";
    label.append(heading, helper, textarea);
    parent.append(label);
    return textarea;
  }
  async save(rows, progress, learning, tomorrow, button) {
    if (![progress.value, learning.value, tomorrow.value].every((value) => value.trim())) {
      new import_obsidian2.Notice("\u518D\u8865\u5B8C\u4E09\u53E5\u8BDD\u5C31\u53EF\u4EE5\u6536\u520A\u4E86\u3002");
      return;
    }
    const selections = rows.flatMap((row) => {
      if (!row.checked.checked) return [];
      const candidate = this.snapshot.candidates[row.candidateIndex];
      if (!candidate) return [];
      return [{
        candidateId: candidate.id,
        category: row.category.value,
        summary: candidate.title,
        sourcePath: candidate.path
      }];
    });
    const submission = {
      date: this.snapshot.date,
      progress: progress.value.trim(),
      learning: learning.value.trim(),
      tomorrowFocus: tomorrow.value.trim(),
      selections
    };
    button.disabled = true;
    button.textContent = "\u6B63\u5728\u5199\u5165\u2026";
    try {
      await this.submitReview(submission);
      new import_obsidian2.Notice("\u4ECA\u65E5\u590D\u76D8\u5DF2\u7ECF\u5199\u56DE\u65E5\u8BB0\u3002");
      this.close();
    } catch (error) {
      button.disabled = false;
      button.textContent = "\u5B8C\u6210\u4ECA\u65E5\u6536\u520A";
      new import_obsidian2.Notice(`\u590D\u76D8\u6CA1\u6709\u5199\u5165\uFF0C\u8BF7\u68C0\u67E5\u540E\u91CD\u8BD5\uFF1A${error instanceof Error ? error.message : String(error)}`, 8e3);
    }
  }
};

// src/signatures.ts
function contentHashPrefix(content) {
  let hash = 2166136261;
  for (let index = 0; index < content.length; index += 1) {
    hash ^= content.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

// src/types.ts
function createDefaultData() {
  return {
    schemaVersion: 1,
    events: [],
    candidates: [],
    fileSignatures: {},
    completedReviews: {},
    lastReconciledAt: 0
  };
}

// src/store.ts
var UnsupportedSchemaError = class extends Error {
  constructor(version) {
    super(`Unsupported workbench memory schema: ${version}`);
    this.name = "UnsupportedSchemaError";
  }
};
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function recordOfStrings(value) {
  if (!isRecord(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter((entry) => typeof entry[1] === "string")
  );
}
function migrateData(raw) {
  if (!isRecord(raw)) return createDefaultData();
  const version = typeof raw.schemaVersion === "number" ? raw.schemaVersion : 0;
  if (version > 1) throw new UnsupportedSchemaError(version);
  return {
    schemaVersion: 1,
    events: Array.isArray(raw.events) ? raw.events : [],
    candidates: Array.isArray(raw.candidates) ? raw.candidates : [],
    fileSignatures: recordOfStrings(raw.fileSignatures),
    completedReviews: recordOfStrings(raw.completedReviews),
    lastReconciledAt: typeof raw.lastReconciledAt === "number" ? raw.lastReconciledAt : 0
  };
}

// src/lifecycle.ts
function shouldCaptureVaultEvent(baselineReady, path) {
  return baselineReady && shouldTrackPath(path);
}

// src/main.ts
var FLUSH_DELAY_MS = 750;
var DATE_CHECK_MS = 6e4;
var ObsidianControllerStore = class {
  constructor(data, persist) {
    this.data = data;
    this.persist = persist;
  }
  data;
  persist;
  async save(data) {
    this.data = data;
    await this.persist(data);
  }
};
var RendererRegistration = class extends import_obsidian3.MarkdownRenderChild {
  constructor(containerEl, dispose) {
    super(containerEl);
    this.dispose = dispose;
  }
  dispose;
  onunload() {
    this.dispose();
  }
};
var WhiliamWorkbenchMemoryPlugin = class extends import_obsidian3.Plugin {
  store;
  controller;
  renderers = /* @__PURE__ */ new Set();
  flushTimer;
  displayedDate = dateInShanghai(Date.now());
  baselineReady = false;
  async onload() {
    this.store = new ObsidianControllerStore(migrateData(await this.loadData()), (data) => this.saveData(data));
    this.controller = new WorkbenchController({
      store: this.store,
      reviewWriter: new ObsidianReviewWriter(this.app),
      now: () => Date.now(),
      refresh: () => this.refreshRenderers()
    });
    this.registerMarkdownCodeBlockProcessor("workbench-memory", (_source, element, context) => {
      this.registerRenderer(element, context);
    });
    this.registerActivityEvents();
    this.addCommand({
      id: "open-evening-review",
      name: "\u6253\u5F00\u4ECA\u65E5\u665A\u95F4\u590D\u76D8",
      callback: () => this.openReviewOrNote()
    });
    this.registerInterval(window.setInterval(() => {
      const today = dateInShanghai(Date.now());
      if (today === this.displayedDate) return;
      this.displayedDate = today;
      this.refreshRenderers();
    }, DATE_CHECK_MS));
    this.app.workspace.onLayoutReady(() => {
      void this.reconcileAtStartup().then((succeeded) => {
        this.baselineReady = succeeded;
      });
    });
  }
  onunload() {
    if (this.flushTimer !== void 0) window.clearTimeout(this.flushTimer);
    this.renderers.clear();
  }
  registerRenderer(element, context) {
    const refresh = () => {
      const snapshot = this.controller.snapshotForDate(dateInShanghai(Date.now()));
      renderWorkbenchMemory(element, snapshot, {
        openPath: (path) => {
          void this.app.workspace.openLinkText(path.replace(/\.md$/i, ""), context.sourcePath);
        },
        startReview: () => this.openReviewOrNote()
      });
    };
    this.renderers.add(refresh);
    context.addChild(new RendererRegistration(element, () => this.renderers.delete(refresh)));
    refresh();
  }
  refreshRenderers() {
    for (const render of this.renderers) render();
  }
  openReviewOrNote() {
    const snapshot = this.controller.snapshotForDate(dateInShanghai(Date.now()));
    if (snapshot.reviewed && snapshot.reviewPath) {
      void this.app.workspace.openLinkText(snapshot.reviewPath.replace(/\.md$/i, ""), "");
      return;
    }
    new WorkbenchReviewModal(this.app, snapshot, async (submission) => {
      await this.controller.completeReview(submission);
    }).open();
  }
  registerActivityEvents() {
    this.registerEvent(this.app.vault.on("create", (file) => {
      if (file instanceof import_obsidian3.TFile) void this.captureFileEvent("create", file);
    }));
    this.registerEvent(this.app.vault.on("modify", (file) => {
      if (file instanceof import_obsidian3.TFile) void this.captureFileEvent("modify", file);
    }));
    this.registerEvent(this.app.vault.on("delete", (file) => {
      if (!(file instanceof import_obsidian3.TFile) || !shouldCaptureVaultEvent(this.baselineReady, file.path)) return;
      void this.controller.handleVaultEvent("delete", file.path, {}).then(() => {
        delete this.store.data.fileSignatures[file.path];
        this.scheduleFlush();
      }).catch((error) => this.reportError("\u8BB0\u5F55\u5220\u9664\u4E8B\u4EF6\u5931\u8D25", error));
    }));
    this.registerEvent(this.app.vault.on("rename", (file, oldPath) => {
      if (!(file instanceof import_obsidian3.TFile)) return;
      void this.captureRename(file, oldPath);
    }));
  }
  async captureFileEvent(kind, file) {
    if (!shouldCaptureVaultEvent(this.baselineReady, file.path)) return;
    try {
      const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter ?? {};
      await this.controller.handleVaultEvent(kind, file.path, frontmatter);
      this.store.data.fileSignatures[file.path] = await this.signatureFor(file);
      this.scheduleFlush();
    } catch (error) {
      this.reportError(`\u8BB0\u5F55 ${file.path} \u7684\u53D8\u5316\u5931\u8D25`, error);
    }
  }
  async captureRename(file, oldPath) {
    if (!this.baselineReady) return;
    const oldTracked = shouldTrackPath(oldPath);
    const newTracked = shouldTrackPath(file.path);
    if (!oldTracked && !newTracked) return;
    try {
      if (newTracked) {
        const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter ?? {};
        await this.controller.handleVaultEvent(oldTracked ? "rename" : "create", file.path, frontmatter, oldTracked ? oldPath : void 0);
        this.store.data.fileSignatures[file.path] = await this.signatureFor(file);
      } else {
        await this.controller.handleVaultEvent("delete", oldPath, {});
      }
      delete this.store.data.fileSignatures[oldPath];
      this.scheduleFlush();
    } catch (error) {
      this.reportError(`\u8BB0\u5F55\u91CD\u547D\u540D ${oldPath} \u2192 ${file.path} \u5931\u8D25`, error);
    }
  }
  scheduleFlush() {
    if (this.flushTimer !== void 0) window.clearTimeout(this.flushTimer);
    this.flushTimer = window.setTimeout(() => {
      this.flushTimer = void 0;
      void this.controller.flush().catch((error) => this.reportError("\u4FDD\u5B58\u5DE5\u4F5C\u53F0\u6D3B\u52A8\u6570\u636E\u5931\u8D25", error));
    }, FLUSH_DELAY_MS);
  }
  async reconcileAtStartup() {
    try {
      const signatures = {};
      for (const file of this.app.vault.getMarkdownFiles()) {
        if (!shouldTrackPath(file.path)) continue;
        signatures[file.path] = await this.signatureFor(file);
      }
      await this.controller.reconcileStartup(signatures);
      return true;
    } catch (error) {
      this.reportError("\u542F\u52A8\u8865\u626B\u5931\u8D25\uFF0C\u5DE5\u4F5C\u53F0\u4FDD\u7559\u4E0A\u6B21\u6570\u636E", error, true);
      return false;
    }
  }
  async signatureFor(file) {
    const content = await this.app.vault.cachedRead(file);
    return fileSignature({
      mtime: file.stat.mtime,
      size: file.stat.size,
      contentHashPrefix: contentHashPrefix(content)
    });
  }
  reportError(context, error, notify = false) {
    console.error(`[Whiliam Workbench Memory] ${context}`, error);
    if (notify) new import_obsidian3.Notice(`${context}\u3002\u8BE6\u60C5\u89C1\u5F00\u53D1\u8005\u63A7\u5236\u53F0\u3002`, 8e3);
  }
};
