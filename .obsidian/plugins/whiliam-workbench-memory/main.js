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
var ReviewStatePersistenceError = class extends Error {
  constructor(reviewPath, cause) {
    super("Review note was written, but workbench state could not be saved.", { cause });
    this.reviewPath = reviewPath;
    this.name = "ReviewStatePersistenceError";
  }
  reviewPath;
};
function reviewDateForCandidate(candidate) {
  if (typeof candidate.reviewDate === "string" && candidate.reviewDate.trim()) {
    return candidate.reviewDate.trim();
  }
  if (typeof candidate.date === "string" && candidate.date.trim()) return candidate.date.trim();
  const basename = normalizePath(candidate.path).split("/").at(-1)?.replace(/\.md$/i, "");
  return basename && /^\d{4}-\d{2}-\d{2}$/.test(basename) ? basename : void 0;
}
function selectCompletedReviewRepair(date, candidates, scanComplete) {
  if (!scanComplete) return { kind: "inconclusive" };
  const matches = candidates.filter((candidate) => reviewDateForCandidate(candidate) === date && candidate.reviewStatus === "done").map((candidate) => normalizePath(candidate.path)).sort((left, right) => left.localeCompare(right));
  if (matches.length === 0) return { kind: "clear" };
  if (matches.length === 1) return { kind: "rename", path: matches[0] };
  return { kind: "ambiguous", paths: matches };
}
function planCompletedReviewRepairs(completedReviews, availablePaths, candidates, scanComplete) {
  const available = /* @__PURE__ */ new Map();
  for (const path of availablePaths) {
    const normalized = normalizePath(path);
    available.set(normalized.toLowerCase(), normalized);
  }
  const dates = /* @__PURE__ */ new Set();
  for (const date of Object.keys(completedReviews)) dates.add(date);
  for (const candidate of candidates) {
    if (candidate.reviewStatus !== "done") continue;
    const date = reviewDateForCandidate(candidate);
    if (date) dates.add(date);
  }
  return [...dates].sort((left, right) => left.localeCompare(right)).flatMap((date) => {
    const previousPath = completedReviews[date];
    if (previousPath) {
      const normalizedPrevious = normalizePath(previousPath);
      const validCandidate = candidates.find((candidate) => {
        if (candidate.reviewStatus !== "done" || reviewDateForCandidate(candidate) !== date) return false;
        return normalizePath(candidate.path).toLowerCase() === normalizedPrevious.toLowerCase();
      });
      if (validCandidate) {
        const candidatePath = normalizePath(validCandidate.path);
        const canonicalPath = available.get(candidatePath.toLowerCase());
        if (canonicalPath && canonicalPath === normalizedPrevious) return [];
        if (canonicalPath) {
          return [{
            date,
            previousPath,
            decision: { kind: "rename", path: canonicalPath }
          }];
        }
      }
    }
    const plan = {
      date,
      decision: selectCompletedReviewRepair(date, candidates, scanComplete)
    };
    if (previousPath) plan.previousPath = previousPath;
    return [plan];
  });
}
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
function applyCompletedReviewPathSync(completedReviews, kind, path, previousPath) {
  const target = kind === "rename" ? previousPath : kind === "delete" ? path : void 0;
  if (!target) return false;
  const normalizedTarget = normalizePath(target).toLowerCase();
  let changed = false;
  for (const [date, reviewPath] of Object.entries(completedReviews)) {
    if (normalizePath(reviewPath).toLowerCase() !== normalizedTarget) continue;
    if (kind === "rename") completedReviews[date] = normalizePath(path);
    else delete completedReviews[date];
    changed = true;
  }
  return changed;
}
var WorkbenchController = class {
  constructor(dependencies) {
    this.dependencies = dependencies;
  }
  dependencies;
  dirty = false;
  captureState() {
    return {
      data: cloneData(this.dependencies.store.data),
      dirty: this.dirty
    };
  }
  restoreState(snapshot) {
    this.dependencies.store.data = cloneData(snapshot.data);
    this.dirty = snapshot.dirty;
  }
  syncCompletedReviewPath(kind, path, previousPath) {
    const changed = applyCompletedReviewPathSync(
      this.dependencies.store.data.completedReviews,
      kind,
      normalizePath(path),
      previousPath ? normalizePath(previousPath) : void 0
    );
    if (changed) this.dirty = true;
    return changed;
  }
  setCompletedReviewPath(date, path) {
    const normalized = normalizePath(path);
    if (this.dependencies.store.data.completedReviews[date] === normalized) return false;
    this.dependencies.store.data.completedReviews[date] = normalized;
    this.dirty = true;
    return true;
  }
  async reconcileStartup(currentSignatures) {
    const data = this.dependencies.store.data;
    const timestamp = this.dependencies.now();
    data.events = pruneEvents(data.events, timestamp, RETENTION_DAYS);
    data.candidates = pruneEvents(data.candidates, timestamp, RETENTION_DAYS);
    if (data.lastReconciledAt === 0) {
      data.fileSignatures = reconcileSnapshots(currentSignatures, currentSignatures, timestamp).signatures;
      data.lastReconciledAt = timestamp;
      this.dirty = true;
      await this.flush({ refresh: false });
      return;
    }
    const result = reconcileSnapshots(data.fileSignatures, currentSignatures, timestamp);
    for (const event of result.events) {
      await this.handleVaultEvent(event.kind, event.path, {}, event.previousPath);
    }
    data.fileSignatures = result.signatures;
    data.lastReconciledAt = timestamp;
    this.dirty = true;
    await this.flush({ refresh: false });
  }
  async handleVaultEvent(kind, path, frontmatter, previousPath) {
    const normalized = normalizePath(path);
    const normalizedPreviousPath = previousPath ? normalizePath(previousPath) : void 0;
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
    if (normalizedPreviousPath) event.previousPath = normalizedPreviousPath;
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
  async completeReview(submission, existingReviewPath) {
    const path = await this.dependencies.reviewWriter.write(submission, existingReviewPath);
    this.dependencies.store.data.completedReviews[submission.date] = path;
    this.dirty = true;
    try {
      await this.flush({ refresh: false });
    } catch (error) {
      throw new ReviewStatePersistenceError(path, error);
    }
    return path;
  }
  async flush(options = {}) {
    if (!this.dirty) return;
    await this.dependencies.store.save(cloneData(this.dependencies.store.data));
    this.dirty = false;
    if (options.refresh !== false) this.dependencies.refresh();
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
function normalizedReviewPath(path) {
  return path.replace(/\\/g, "/").replace(/\.md$/i, "").toLowerCase();
}
function buildReviewCandidateRows(candidates, storedSelections) {
  const storedByPath = new Map(
    (storedSelections ?? []).map((selection) => [normalizedReviewPath(selection.sourcePath), selection])
  );
  const currentPaths = new Set(candidates.map((candidate) => normalizedReviewPath(candidate.path)));
  const currentRows = candidates.map((candidate) => {
    const stored = storedByPath.get(normalizedReviewPath(candidate.path));
    const row = {
      rowId: `current:${candidate.id}`,
      candidateId: candidate.id,
      title: candidate.title,
      summary: stored?.summary ?? candidate.title,
      sourcePath: candidate.path,
      category: stored?.category ?? candidate.category,
      checked: storedSelections === void 0 ? candidate.selectedByDefault : Boolean(stored),
      storedOnly: false,
      changeCount: candidate.changeCount
    };
    if (candidate.project) row.project = candidate.project;
    return row;
  });
  const storedOnlyRows = (storedSelections ?? []).flatMap((selection) => {
    const normalizedPath = normalizedReviewPath(selection.sourcePath);
    if (currentPaths.has(normalizedPath)) return [];
    return [{
      rowId: `stored:${normalizedPath}`,
      candidateId: `stored:${normalizedPath}`,
      title: selection.summary,
      summary: selection.summary,
      sourcePath: selection.sourcePath,
      category: selection.category,
      checked: true,
      storedOnly: true,
      statusLabel: "\u5DF2\u4E0D\u5728\u4ECA\u65E5\u5019\u9009 \xB7 \u4FDD\u7559\u5386\u53F2\u786E\u8BA4"
    }];
  });
  return [...currentRows, ...storedOnlyRows];
}
function reviewSelectionsFromCandidateRows(rows) {
  return rows.filter((row) => row.checked).map((row) => ({
    candidateId: row.candidateId,
    category: row.category,
    summary: row.summary,
    sourcePath: row.sourcePath
  }));
}
function parseStoredReviewState(content) {
  const startCount = occurrences(content, REVIEW_START);
  const endCount = occurrences(content, REVIEW_END);
  const legacyStartCount = occurrences(content, LEGACY_REVIEW_START);
  const legacyEndCount = occurrences(content, LEGACY_REVIEW_END);
  const hasCurrentPair = startCount === 1 && endCount === 1 && legacyStartCount === 0 && legacyEndCount === 0;
  const hasLegacyPair = legacyStartCount === 1 && legacyEndCount === 1 && startCount === 0 && endCount === 0;
  if (!hasCurrentPair && !hasLegacyPair) throw new ReviewMarkerError();
  const startMarker = hasCurrentPair ? REVIEW_START : LEGACY_REVIEW_START;
  const endMarker = hasCurrentPair ? REVIEW_END : LEGACY_REVIEW_END;
  const start = content.indexOf(startMarker);
  const end = content.indexOf(endMarker);
  if (start < 0 || end < start) throw new ReviewMarkerError();
  const lines = content.slice(start + startMarker.length, end).split(/\r?\n/);
  const headings = [
    "> **\u4ECA\u5929\u771F\u6B63\u63A8\u8FDB\u4E86\u4EC0\u4E48\uFF1F**",
    "> **\u4ECA\u5929\u5F62\u6210\u4E86\u4EC0\u4E48\u65B0\u7406\u89E3\uFF1F**",
    "> **\u660E\u5929\u6700\u91CD\u8981\u7684\u4E00\u6B65\u662F\u4EC0\u4E48\uFF1F**",
    "> **\u786E\u8BA4\u53D8\u5316**"
  ];
  const indices = headings.map((heading) => {
    const matches = lines.flatMap((line, index) => line === heading ? [index] : []);
    if (matches.length !== 1) throw new ReviewMarkerError(`Workbench review heading is invalid: ${heading}`);
    return matches[0];
  });
  const [progressIndex, learningIndex, tomorrowIndex, selectionsIndex] = indices;
  if (progressIndex === void 0 || learningIndex === void 0 || tomorrowIndex === void 0 || selectionsIndex === void 0) {
    throw new ReviewMarkerError("Workbench review headings are missing.");
  }
  if (!(progressIndex < learningIndex && learningIndex < tomorrowIndex && tomorrowIndex < selectionsIndex)) {
    throw new ReviewMarkerError("Workbench review headings are out of order.");
  }
  const answerBetween = (headingIndex, nextHeadingIndex) => {
    const section = lines.slice(headingIndex + 1, nextHeadingIndex);
    if (section.at(-1) !== ">") throw new ReviewMarkerError("Workbench review answer separator is missing.");
    const answerLines = section.slice(0, -1);
    if (answerLines.length === 0 || answerLines.some((line) => !line.startsWith("> "))) {
      throw new ReviewMarkerError("Workbench review answer is missing or invalid.");
    }
    return answerLines.map((line) => line.slice(2)).join("\n");
  };
  return {
    progress: answerBetween(progressIndex, learningIndex),
    learning: answerBetween(learningIndex, tomorrowIndex),
    tomorrowFocus: answerBetween(tomorrowIndex, selectionsIndex),
    selections: parseStoredReviewSelections(content)
  };
}
function parseStoredReviewSelections(content) {
  const startCount = occurrences(content, REVIEW_START);
  const endCount = occurrences(content, REVIEW_END);
  const legacyStartCount = occurrences(content, LEGACY_REVIEW_START);
  const legacyEndCount = occurrences(content, LEGACY_REVIEW_END);
  const hasCurrentPair = startCount === 1 && endCount === 1 && legacyStartCount === 0 && legacyEndCount === 0;
  const hasLegacyPair = legacyStartCount === 1 && legacyEndCount === 1 && startCount === 0 && endCount === 0;
  if (!hasCurrentPair && !hasLegacyPair) throw new ReviewMarkerError();
  const startMarker = hasCurrentPair ? REVIEW_START : LEGACY_REVIEW_START;
  const endMarker = hasCurrentPair ? REVIEW_END : LEGACY_REVIEW_END;
  const start = content.indexOf(startMarker);
  const end = content.indexOf(endMarker);
  if (start < 0 || end < start) throw new ReviewMarkerError();
  const blockLines = content.slice(start + startMarker.length, end).split(/\r?\n/);
  const headingIndex = blockLines.findIndex((line) => line.trim() === "> **\u786E\u8BA4\u53D8\u5316**");
  if (headingIndex < 0) throw new ReviewMarkerError("Workbench review selection heading is missing.");
  const selectionLines = blockLines.slice(headingIndex + 1).map((line) => line.trim()).filter(Boolean);
  if (selectionLines.length === 1 && selectionLines[0] === "> - \u4ECA\u65E5\u6CA1\u6709\u9009\u62E9\u5019\u9009\u53D8\u5316\u3002") return [];
  if (selectionLines.length === 0) throw new ReviewMarkerError("Workbench review selections are missing.");
  return selectionLines.map((line) => {
    const match = line.match(/^> - `([^`]+)` (.+?) — \[\[([^|\]]+)(?:\|[^\]]*)?\]\]$/u);
    if (!match) throw new ReviewMarkerError("Workbench review selection line is invalid.");
    const [, categoryLabel, summary, sourcePath] = match;
    const category = categoryLabel ? CATEGORY_BY_LABEL[categoryLabel] : void 0;
    if (!category || !summary || !sourcePath) {
      throw new ReviewMarkerError("Workbench review selection line is invalid.");
    }
    return { category, summary, sourcePath };
  });
}
function isCompletedReviewFrontmatter(frontmatter) {
  return frontmatter.review_status === "done";
}
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
var CATEGORY_BY_LABEL = Object.fromEntries(
  Object.entries(CATEGORY_LABEL).map(([category, label]) => [label, category])
);
function countCategory(submission, categories) {
  return submission.selections.filter((selection) => categories.includes(selection.category)).length;
}
function buildFrontmatterPatch(submission) {
  return {
    review_status: "done",
    review_date: submission.date,
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
  const newline = content.includes("\r\n") ? "\r\n" : "\n";
  const normalizedBlock = renderedBlock.replace(/\r\n?|\n/g, newline);
  const startCount = occurrences(content, REVIEW_START);
  const endCount = occurrences(content, REVIEW_END);
  const legacyStartCount = occurrences(content, LEGACY_REVIEW_START);
  const legacyEndCount = occurrences(content, LEGACY_REVIEW_END);
  if (startCount === 0 && endCount === 0 && legacyStartCount === 0 && legacyEndCount === 0) {
    const separator = content.length === 0 || content.endsWith(`${newline}${newline}`) ? "" : content.endsWith(newline) ? newline : `${newline}${newline}`;
    return `${content}${separator}${normalizedBlock.trim()}${newline}`;
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
  return `${content.slice(0, start)}${normalizedBlock.trim()}${content.slice(afterEnd)}`;
}

// src/review-document.ts
function newlineFor(content) {
  return content.includes("\r\n") ? "\r\n" : "\n";
}
function yamlObject(value) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Review frontmatter YAML must be an object.");
  }
  return { ...value };
}
function hasLeadingFrontmatterFence(content) {
  return /^---[\t ]*(?:\r?\n|$)/.test(content.replace(/^\uFEFF/, ""));
}
function parsedFrontmatter(info, codec) {
  if (!info.exists) return {};
  const parsed = codec.parseYaml(info.frontmatter);
  const blankOrComments = info.frontmatter.split(/\r?\n/).every((line) => line.trim() === "" || line.trimStart().startsWith("#"));
  if ((parsed === null || parsed === void 0) && blankOrComments) return {};
  return yamlObject(parsed);
}
function frontMatterInfoForContent(content, codec) {
  const bomOffset = content.startsWith("\uFEFF") ? 1 : 0;
  const info = codec.getFrontMatterInfo(content.slice(bomOffset));
  return info.exists && bomOffset > 0 ? {
    ...info,
    from: info.from + bomOffset,
    to: info.to + bomOffset,
    contentStart: info.contentStart + bomOffset
  } : info;
}
function normalizeYamlNewlines(yaml, newline) {
  return yaml.replace(/\r\n?/g, "\n").trim().replace(/\n/g, newline);
}
var MANAGED_FRONTMATTER_KEYS = [
  "review_status",
  "review_date",
  "work_changes",
  "learning_changes",
  "planning_changes",
  "review_progress",
  "review_learning",
  "tomorrow_focus"
];
function managedKeyAtLine(line) {
  const match = line.match(/^(?:"([^"]+)"|'([^']+)'|([A-Za-z_][A-Za-z0-9_-]*))[ \t]*:/u);
  const key = match?.[1] ?? match?.[2] ?? match?.[3];
  return key && MANAGED_FRONTMATTER_KEYS.includes(key) ? key : void 0;
}
function yamlLinesWithEndings(yaml) {
  return yaml.match(/.*(?:\r\n|\n|$)/g)?.filter((line) => line.length > 0) ?? [];
}
function removeManagedFrontmatterEntries(yaml) {
  const lines = yamlLinesWithEndings(yaml);
  const kept = [];
  const removed = /* @__PURE__ */ new Set();
  let index = 0;
  while (index < lines.length) {
    const line = lines[index];
    const key = managedKeyAtLine(line.replace(/\r?\n$/, ""));
    if (!key) {
      kept.push(line);
      index += 1;
      continue;
    }
    removed.add(key);
    index += 1;
    while (index < lines.length) {
      const continuation = lines[index];
      const body = continuation.replace(/\r?\n$/, "");
      if (body.trim() === "" || body.startsWith("#")) {
        kept.push(continuation);
        index += 1;
        continue;
      }
      if (/^[ \t]/u.test(body)) {
        index += 1;
        continue;
      }
      break;
    }
  }
  return { yaml: kept.join(""), removed };
}
function validateYamlObject(yaml, codec) {
  yamlObject(codec.parseYaml(yaml));
}
function hasPreservationSensitiveYamlSyntax(yaml) {
  for (const line of yaml.split(/\r?\n/)) {
    if (/^[ \t]*<<[ \t]*:/u.test(line)) return true;
    let singleQuoted = false;
    let doubleQuoted = false;
    for (let index = 0; index < line.length; index += 1) {
      const character = line[index];
      if (character === "'" && !doubleQuoted) {
        if (singleQuoted && line[index + 1] === "'") {
          index += 1;
        } else {
          singleQuoted = !singleQuoted;
        }
        continue;
      }
      if (character === '"' && !singleQuoted && line[index - 1] !== "\\") {
        doubleQuoted = !doubleQuoted;
        continue;
      }
      if (singleQuoted || doubleQuoted) continue;
      if (character === "#") return true;
      if ((character === "&" || character === "*") && /[A-Za-z0-9_-]/u.test(line[index + 1] ?? "")) {
        return true;
      }
    }
  }
  return false;
}
function buildPatchedFrontmatter(originalYaml, parsed, patch, codec, newline) {
  const { yaml: preserved, removed } = removeManagedFrontmatterEntries(originalYaml);
  const existingManaged = MANAGED_FRONTMATTER_KEYS.filter((key) => Object.hasOwn(parsed, key));
  const unlocatedManaged = existingManaged.filter((key) => !removed.has(key));
  const topLevelFlowMap = originalYaml.trimStart().startsWith("{");
  if (topLevelFlowMap || unlocatedManaged.length > 0) {
    if (hasPreservationSensitiveYamlSyntax(originalYaml)) {
      throw new Error("Managed review fields use unsupported YAML syntax and cannot be updated without data loss.");
    }
    const normalized = `${normalizeYamlNewlines(codec.stringifyYaml({ ...parsed, ...patch }), newline)}${newline}`;
    validateYamlObject(normalized, codec);
    return normalized;
  }
  const patchYaml = normalizeYamlNewlines(codec.stringifyYaml(patch), newline);
  const separator = preserved.length === 0 || preserved.endsWith(newline) ? "" : newline;
  const combined = `${preserved}${separator}${patchYaml}${newline}`;
  validateYamlObject(combined, codec);
  return combined;
}
function normalizedStoredPath(path) {
  return path.replace(/\\/g, "/").replace(/\.md$/i, "");
}
function renderedAnswer(value) {
  return (value || "\u672A\u586B\u5199").trim();
}
function assertReviewRoundTrip(document2, submission) {
  for (const selection of submission.selections) {
    const path = normalizedStoredPath(selection.sourcePath);
    if (!path || /[\[\]|#^\r\n]/u.test(path)) {
      throw new Error(`Review source path cannot be represented safely as a wikilink: ${selection.sourcePath}`);
    }
  }
  const stored = parseStoredReviewState(document2);
  if (stored.progress !== renderedAnswer(submission.progress) || stored.learning !== renderedAnswer(submission.learning) || stored.tomorrowFocus !== renderedAnswer(submission.tomorrowFocus) || stored.selections.length !== submission.selections.length) {
    throw new Error("Generated review content cannot be read back without changing its meaning.");
  }
  for (let index = 0; index < submission.selections.length; index += 1) {
    const expected = submission.selections[index];
    const actual = stored.selections[index];
    if (!expected || !actual || actual.category !== expected.category || actual.summary !== expected.summary.trim() || actual.sourcePath !== normalizedStoredPath(expected.sourcePath)) {
      throw new Error("Generated review selection cannot be read back without changing its meaning.");
    }
  }
}
function buildReviewDocument(content, submission, codec) {
  const newline = newlineFor(content);
  const info = frontMatterInfoForContent(content, codec);
  if (!info.exists && hasLeadingFrontmatterFence(content)) {
    throw new Error("Review frontmatter fence is not closed.");
  }
  const frontmatter = parsedFrontmatter(info, codec);
  const patch = { ...buildFrontmatterPatch(submission) };
  const yaml = info.exists ? buildPatchedFrontmatter(info.frontmatter, frontmatter, patch, codec, newline) : `${normalizeYamlNewlines(codec.stringifyYaml(patch), newline)}${newline}`;
  const withFrontmatter = info.exists ? `${content.slice(0, info.from)}${yaml}${content.slice(info.to)}` : `${content.startsWith("\uFEFF") ? "\uFEFF" : ""}---${newline}${yaml}---${newline}${content.replace(/^\uFEFF/, "")}`;
  const renderedBlock = renderReviewBlock(submission).replace(/\n/g, newline);
  const document2 = upsertReviewBlock(withFrontmatter, renderedBlock);
  assertReviewRoundTrip(document2, submission);
  return document2;
}
async function writeReviewDocumentAtomically(adapter, target, submission, codec) {
  if (target.kind === "existing") {
    await adapter.process(
      target.file,
      (currentContent) => buildReviewDocument(currentContent, submission, codec)
    );
    return adapter.path(target.file);
  }
  const finalContent = buildReviewDocument(target.initialContent, submission, codec);
  const file = await adapter.create(target.path, finalContent);
  return adapter.path(file);
}

// src/obsidian-review-writer.ts
var makeMoment = import_obsidian.moment;
function stringSetting(value) {
  return typeof value === "string" && value.trim() ? value.trim() : void 0;
}
var reviewYamlCodec = {
  getFrontMatterInfo: import_obsidian.getFrontMatterInfo,
  parseYaml: import_obsidian.parseYaml,
  stringifyYaml: import_obsidian.stringifyYaml
};
var ObsidianReviewWriter = class {
  constructor(app) {
    this.app = app;
  }
  app;
  async write(submission, existingReviewPath) {
    const parsedDate = makeMoment(submission.date, "YYYY-MM-DD", true);
    if (!parsedDate.isValid()) throw new Error(`\u65E0\u6548\u590D\u76D8\u65E5\u671F\uFF1A${submission.date}`);
    let target;
    if (existingReviewPath) {
      const existing = this.app.vault.getAbstractFileByPath((0, import_obsidian.normalizePath)(existingReviewPath));
      if (!(existing instanceof import_obsidian.TFile)) throw new Error(`\u590D\u76D8\u6E90\u6587\u4EF6\u4E0D\u5B58\u5728\uFF1A${existingReviewPath}`);
      target = { kind: "existing", file: existing };
    } else {
      const config = await this.readDailyNotesConfig();
      const format = stringSetting(config.format) ?? "YYYY-MM-DD";
      const title = parsedDate.format(format);
      const path = (0, import_obsidian.normalizePath)(dailyNotePath(title, stringSetting(config.folder) ?? ""));
      const existing = this.app.vault.getAbstractFileByPath(path);
      if (existing instanceof import_obsidian.TFile) {
        target = { kind: "existing", file: existing };
      } else {
        if (existing) throw new Error(`\u65E5\u8BB0\u8DEF\u5F84\u88AB\u975E\u6587\u4EF6\u5360\u7528\uFF1A${path}`);
        const template = await this.readTemplate(config.template);
        const initialContent = renderDailyTemplate(template, {
          date: title,
          time: makeMoment().format("HH:mm"),
          title
        });
        target = { kind: "new", path, initialContent };
      }
    }
    const adapter = {
      process: async (file, transform) => {
        await this.app.vault.process(file, transform);
      },
      create: async (path, finalContent) => {
        const folder = path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "";
        await this.ensureFolder(folder);
        return this.app.vault.create(path, finalContent);
      },
      path: (file) => file.path
    };
    return writeReviewDocumentAtomically(adapter, target, submission, reviewYamlCodec);
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
    const missing = [];
    for (let index = 1; index <= parts.length; index += 1) {
      const partial = parts.slice(0, index).join("/");
      const existing = this.app.vault.getAbstractFileByPath(partial);
      if (existing && !(existing instanceof import_obsidian.TFolder)) {
        throw new Error(`\u65E5\u8BB0\u76EE\u5F55\u8DEF\u5F84\u88AB\u6587\u4EF6\u5360\u7528\uFF1A${partial}`);
      }
      if (!existing) missing.push(partial);
    }
    for (const path of missing) await this.app.vault.createFolder(path);
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
  if (snapshot.reviewed) model.editActionLabel = "\u4FEE\u6539\u590D\u76D8";
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
  if (model.editActionLabel) {
    const edit = document.createElement("button");
    edit.type = "button";
    edit.className = "wwm-secondary wwm-edit-review";
    edit.textContent = model.editActionLabel;
    edit.addEventListener("click", () => actions.editReview(snapshot));
    footer.append(edit);
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
  constructor(app, snapshot, submitReview, options = {}) {
    super(app);
    this.snapshot = snapshot;
    this.submitReview = submitReview;
    this.options = options;
  }
  snapshot;
  submitReview;
  options;
  onOpen() {
    this.modalEl.addClass("wwm-review-modal");
    this.titleEl.setText("\u4ECA\u665A\uFF0C\u628A\u4ECA\u5929\u6536\u675F\u6210\u4E09\u53E5\u8BDD");
    const content = this.contentEl;
    content.replaceChildren();
    const introduction = document.createElement("p");
    introduction.className = "wwm-review-intro";
    introduction.textContent = "\u7CFB\u7EDF\u53EA\u63D0\u4F9B\u5019\u9009\uFF0C\u6700\u7EC8\u5199\u8FDB\u65E5\u8BB0\u7684\u5185\u5BB9\u7531\u4F60\u786E\u8BA4\u3002\u672A\u9009\u4E2D\u7684\u53D8\u5316\u4ECD\u4FDD\u7559\u5728\u672C\u5730\u6D3B\u52A8\u8BB0\u5FC6\u4E2D\u3002";
    content.append(introduction);
    if (this.options.loadError) {
      const error = document.createElement("p");
      error.className = "wwm-review-error";
      error.textContent = `${this.options.loadError} \u4E3A\u907F\u514D\u8986\u76D6\u65E7\u590D\u76D8\uFF0C\u672C\u6B21\u5DF2\u7981\u7528\u4FDD\u5B58\u3002`;
      content.append(error);
    }
    const candidateSection = document.createElement("section");
    candidateSection.className = "wwm-review-section";
    const candidateHeading = document.createElement("h3");
    candidateHeading.textContent = "\u786E\u8BA4\u4ECA\u5929\u771F\u6B63\u53D1\u751F\u7684\u53D8\u5316";
    candidateSection.append(candidateHeading);
    const rows = [];
    const candidates = buildReviewCandidateRows(
      this.snapshot.candidates,
      this.options.initialState?.selections
    );
    if (candidates.length === 0) {
      const empty = document.createElement("p");
      empty.className = "wwm-review-empty";
      empty.textContent = "\u4ECA\u5929\u6CA1\u6709\u81EA\u52A8\u5019\u9009\uFF0C\u4E5F\u53EF\u4EE5\u53EA\u5B8C\u6210\u4E09\u53E5\u8BDD\u590D\u76D8\u3002";
      candidateSection.append(empty);
    } else {
      candidates.forEach((candidate, rowIndex) => {
        const row = document.createElement("div");
        row.className = "wwm-review-candidate";
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.id = `wwm-review-candidate-${rowIndex}-selected`;
        checkbox.checked = candidate.checked;
        const main = document.createElement("label");
        main.className = "wwm-review-candidate__main";
        main.htmlFor = checkbox.id;
        const title = document.createElement("strong");
        title.textContent = candidate.title;
        const path = document.createElement("small");
        path.textContent = candidate.statusLabel ?? (candidate.project ? `${candidate.project} \xB7 ${candidate.changeCount ?? 0} \u6B21\u53D8\u5316` : `${candidate.changeCount ?? 0} \u6B21\u53D8\u5316`);
        main.append(title, path);
        const select = document.createElement("select");
        select.id = `wwm-review-candidate-${rowIndex}-category`;
        for (const option of CATEGORY_OPTIONS) {
          const element = document.createElement("option");
          element.value = option.value;
          element.textContent = option.label;
          element.selected = option.value === candidate.category;
          select.append(element);
        }
        const categoryLabel = document.createElement("label");
        categoryLabel.className = "wwm-review-candidate__category";
        categoryLabel.htmlFor = select.id;
        const categoryText = document.createElement("span");
        categoryText.textContent = "\u7C7B\u522B";
        categoryLabel.append(categoryText, select);
        row.append(checkbox, main, categoryLabel);
        candidateSection.append(row);
        rows.push({ checked: checkbox, category: select, candidate });
      });
    }
    content.append(candidateSection);
    const progress = this.createQuestion(
      content,
      "\u4ECA\u5929\u771F\u6B63\u63A8\u8FDB\u4E86\u4EC0\u4E48\uFF1F",
      "\u5199\u4E0B\u4E00\u4E2A\u5177\u4F53\u7ED3\u679C\uFF0C\u800C\u4E0D\u662F\u4EFB\u52A1\u6E05\u5355\u3002",
      this.options.initialState?.progress ?? ""
    );
    const learning = this.createQuestion(
      content,
      "\u4ECA\u5929\u5F62\u6210\u4E86\u4EC0\u4E48\u65B0\u7406\u89E3\uFF1F",
      "\u53EF\u4EE5\u662F\u4E00\u4E2A\u5224\u65AD\u3001\u65B9\u6CD5\u6216\u9700\u8981\u7EE7\u7EED\u9A8C\u8BC1\u7684\u95EE\u9898\u3002",
      this.options.initialState?.learning ?? ""
    );
    const tomorrow = this.createQuestion(
      content,
      "\u660E\u5929\u6700\u91CD\u8981\u7684\u4E00\u6B65\u662F\u4EC0\u4E48\uFF1F",
      "\u53EA\u7559\u4E00\u4E2A\u8DB3\u591F\u660E\u786E\u3001\u53EF\u4EE5\u5F00\u59CB\u7684\u52A8\u4F5C\u3002",
      this.options.initialState?.tomorrowFocus ?? ""
    );
    const actions = document.createElement("div");
    actions.className = "wwm-review-actions";
    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.textContent = "\u7A0D\u540E\u518D\u8BF4";
    cancel.addEventListener("click", () => this.close());
    const save = document.createElement("button");
    save.type = "button";
    save.className = "mod-cta";
    save.disabled = Boolean(this.options.loadError);
    save.textContent = this.options.loadError ? "\u65E7\u590D\u76D8\u8BFB\u53D6\u5931\u8D25\uFF0C\u65E0\u6CD5\u4FDD\u5B58" : "\u5B8C\u6210\u4ECA\u65E5\u6536\u520A";
    save.addEventListener("click", () => {
      void this.save(rows, progress, learning, tomorrow, save);
    });
    actions.append(cancel, save);
    content.append(actions);
  }
  onClose() {
    this.contentEl.replaceChildren();
  }
  createQuestion(parent, question, hint, initialValue) {
    const label = document.createElement("label");
    label.className = "wwm-review-question";
    const heading = document.createElement("strong");
    heading.textContent = question;
    const helper = document.createElement("small");
    helper.textContent = hint;
    const textarea = document.createElement("textarea");
    textarea.rows = 3;
    textarea.placeholder = "\u5728\u8FD9\u91CC\u5199\u4E00\u53E5\u8BDD\u2026";
    textarea.value = initialValue;
    label.append(heading, helper, textarea);
    parent.append(label);
    return textarea;
  }
  async save(rows, progress, learning, tomorrow, button) {
    if (this.options.loadError) {
      new import_obsidian2.Notice("\u65E7\u590D\u76D8\u8BFB\u53D6\u5931\u8D25\uFF0C\u672C\u6B21\u4E0D\u80FD\u4FDD\u5B58\u3002", 8e3);
      return;
    }
    if (![progress.value, learning.value, tomorrow.value].every((value) => value.trim())) {
      new import_obsidian2.Notice("\u518D\u8865\u5B8C\u4E09\u53E5\u8BDD\u5C31\u53EF\u4EE5\u6536\u520A\u4E86\u3002");
      return;
    }
    const selections = reviewSelectionsFromCandidateRows(rows.map((row) => ({
      ...row.candidate,
      checked: row.checked.checked,
      category: row.category.value
    })));
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
      const successMessage = await this.submitReview(submission);
      new import_obsidian2.Notice(successMessage ?? "\u4ECA\u65E5\u590D\u76D8\u5DF2\u7ECF\u5199\u56DE\u65E5\u8BB0\u3002");
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
var AsyncMutationQueue = class {
  tail = Promise.resolve();
  run(operation) {
    const result = this.tail.then(operation, operation);
    this.tail = result.then(() => void 0, () => void 0);
    return result;
  }
};
var SingleFlightRefresh = class {
  inFlight;
  notifyRequested = false;
  run(notify, operation, notifySuccess) {
    if (notify) this.notifyRequested = true;
    if (this.inFlight) return this.inFlight;
    const execution = Promise.resolve().then(operation);
    const owner = execution.then((succeeded) => {
      if (succeeded && this.notifyRequested) notifySuccess();
      return succeeded;
    }).finally(() => {
      if (this.inFlight === owner) this.inFlight = void 0;
      this.notifyRequested = false;
    });
    this.inFlight = owner;
    return owner;
  }
};
function runAllSafely(operations, onError) {
  for (const operation of operations) {
    try {
      operation();
    } catch (error) {
      try {
        onError(error);
      } catch {
      }
    }
  }
}
function shouldCaptureVaultEvent(baselineReady, path) {
  return baselineReady && shouldTrackPath(path);
}
function nextDisplayedDate(displayedDate, timestamp) {
  const currentDate = dateInShanghai(timestamp);
  return currentDate === displayedDate ? void 0 : currentDate;
}
function shouldCaptureSignature(storedSignature, currentSignature) {
  return storedSignature !== currentSignature;
}
async function runRefreshTransaction(steps) {
  const snapshot = steps.snapshot();
  try {
    await steps.repair();
    await steps.reconcile();
  } catch (error) {
    await steps.restore(snapshot);
    throw error;
  }
  await steps.complete();
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
  mutations = new AsyncMutationQueue();
  refreshSingleFlight = new SingleFlightRefresh();
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
      refresh: () => this.refreshRenderersSafely()
    });
    this.registerMarkdownCodeBlockProcessor("workbench-memory", (_source, element, context) => {
      this.registerRenderer(element, context);
    });
    this.registerActivityEvents();
    this.addCommand({
      id: "open-evening-review",
      name: "\u6253\u5F00\u4ECA\u65E5\u665A\u95F4\u590D\u76D8",
      callback: () => this.openReview()
    });
    this.addCommand({
      id: "refresh-workbench-memory",
      name: "\u5237\u65B0\u4ECA\u65E5\u5DE5\u4F5C\u8BB0\u5FC6",
      callback: () => {
        void this.refreshFromVault({ notify: true });
      }
    });
    this.registerInterval(window.setInterval(() => {
      const nextDate = nextDisplayedDate(this.displayedDate, Date.now());
      if (!nextDate) return;
      this.displayedDate = nextDate;
      this.refreshRenderersSafely();
    }, DATE_CHECK_MS));
    this.app.workspace.onLayoutReady(() => {
      void this.refreshFromVault({ notify: false });
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
          void this.app.workspace.openLinkText(path.replace(/\.md$/i, ""), context.sourcePath).catch((error) => {
            this.reportError(`\u6253\u5F00\u7B14\u8BB0 ${path} \u5931\u8D25`, error);
            new import_obsidian3.Notice("\u65E0\u6CD5\u6253\u5F00\u7B14\u8BB0\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5\u3002", 8e3);
          });
        },
        startReview: () => this.openReview(snapshot),
        editReview: (renderedSnapshot) => this.openReview(renderedSnapshot)
      });
    };
    this.renderers.add(refresh);
    context.addChild(new RendererRegistration(element, () => this.renderers.delete(refresh)));
    refresh();
  }
  refreshRenderersSafely() {
    runAllSafely(this.renderers, (error) => this.reportError("\u5237\u65B0\u5DE5\u4F5C\u53F0\u754C\u9762\u5931\u8D25", error));
  }
  openReview(snapshot) {
    const targetSnapshot = snapshot ?? this.controller.snapshotForDate(dateInShanghai(Date.now()));
    void this.openReviewModal(targetSnapshot);
  }
  async openReviewModal(snapshot) {
    let initialState;
    let loadError;
    if (snapshot.reviewed) {
      try {
        if (!snapshot.reviewPath) throw new Error("\u5DF2\u5B8C\u6210\u590D\u76D8\u7F3A\u5C11\u65E5\u8BB0\u8DEF\u5F84\u3002");
        const file = this.app.vault.getAbstractFileByPath(snapshot.reviewPath);
        if (!(file instanceof import_obsidian3.TFile)) throw new Error(`\u590D\u76D8\u65E5\u8BB0\u4E0D\u5B58\u5728\uFF1A${snapshot.reviewPath}`);
        const content = await this.app.vault.cachedRead(file);
        initialState = parseStoredReviewState(content);
      } catch (error) {
        this.reportError("\u8BFB\u53D6\u6216\u89E3\u6790\u5DF2\u6709\u590D\u76D8\u5931\u8D25", error);
        loadError = `\u65E0\u6CD5\u8BFB\u53D6\u6216\u89E3\u6790\u5DF2\u6709\u590D\u76D8\uFF1A${error instanceof Error ? error.message : String(error)}`;
      }
    }
    const submitReview = async (submission) => {
      try {
        if (snapshot.reviewed && snapshot.reviewPath) {
          const reviewPath = snapshot.reviewPath;
          await this.runMutation(() => this.controller.completeReview(submission, reviewPath));
        } else {
          await this.runMutation(() => this.controller.completeReview(submission));
        }
      } catch (error) {
        if (!(error instanceof ReviewStatePersistenceError)) throw error;
        this.scheduleFlush();
        this.reportError("\u590D\u76D8\u5DF2\u5199\u5165\u65E5\u8BB0\uFF0C\u4F46\u5DE5\u4F5C\u53F0\u72B6\u6001\u4FDD\u5B58\u5931\u8D25\uFF0C\u5DF2\u5B89\u6392\u540E\u53F0\u8865\u5B58", error.cause ?? error);
        this.refreshRenderersSafely();
        return "\u590D\u76D8\u5DF2\u5199\u5165\u65E5\u8BB0\uFF0C\u5DE5\u4F5C\u53F0\u72B6\u6001\u5C06\u5728\u540E\u53F0\u8865\u5B58\u3002";
      }
      this.refreshRenderersSafely();
      return void 0;
    };
    const modal = loadError ? new WorkbenchReviewModal(this.app, snapshot, submitReview, { loadError }) : initialState ? new WorkbenchReviewModal(this.app, snapshot, submitReview, { initialState }) : new WorkbenchReviewModal(this.app, snapshot, submitReview);
    modal.open();
  }
  registerActivityEvents() {
    this.registerEvent(this.app.vault.on("create", (file) => {
      if (file instanceof import_obsidian3.TFile) void this.captureFileEvent("create", file);
    }));
    this.registerEvent(this.app.vault.on("modify", (file) => {
      if (file instanceof import_obsidian3.TFile) void this.captureFileEvent("modify", file);
    }));
    this.registerEvent(this.app.vault.on("delete", (file) => {
      if (file instanceof import_obsidian3.TFile) void this.captureDelete(file);
    }));
    this.registerEvent(this.app.vault.on("rename", (file, oldPath) => {
      if (!(file instanceof import_obsidian3.TFile)) return;
      void this.captureRename(file, oldPath);
    }));
  }
  async captureFileEvent(kind, file) {
    return this.runMutation(async () => {
      if (!shouldCaptureVaultEvent(this.baselineReady, file.path)) return;
      try {
        const signature = await this.signatureFor(file);
        if (!shouldCaptureSignature(this.store.data.fileSignatures[file.path], signature)) return;
        const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter ?? {};
        await this.controller.handleVaultEvent(kind, file.path, frontmatter);
        this.store.data.fileSignatures[file.path] = signature;
        this.scheduleFlush();
      } catch (error) {
        this.reportError(`\u8BB0\u5F55 ${file.path} \u7684\u53D8\u5316\u5931\u8D25`, error);
      }
    });
  }
  async captureDelete(file) {
    return this.runMutation(async () => {
      const reviewPathChanged = this.controller.syncCompletedReviewPath("delete", file.path);
      if (reviewPathChanged) this.scheduleFlush();
      if (!shouldCaptureVaultEvent(this.baselineReady, file.path)) return;
      if (!(file.path in this.store.data.fileSignatures)) return;
      try {
        await this.controller.handleVaultEvent("delete", file.path, {});
        delete this.store.data.fileSignatures[file.path];
        this.scheduleFlush();
      } catch (error) {
        this.reportError("\u8BB0\u5F55\u5220\u9664\u4E8B\u4EF6\u5931\u8D25", error);
      }
    });
  }
  async captureRename(file, oldPath) {
    return this.runMutation(async () => {
      const reviewPathChanged = this.controller.syncCompletedReviewPath("rename", file.path, oldPath);
      if (reviewPathChanged) this.scheduleFlush();
      if (!this.baselineReady) return;
      const oldTracked = shouldTrackPath(oldPath);
      const newTracked = shouldTrackPath(file.path);
      if (!oldTracked && !newTracked) return;
      try {
        if (newTracked) {
          const signature = await this.signatureFor(file);
          const alreadyReconciled = !shouldCaptureSignature(
            this.store.data.fileSignatures[file.path],
            signature
          ) && !(oldPath in this.store.data.fileSignatures);
          if (alreadyReconciled) return;
          const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter ?? {};
          await this.controller.handleVaultEvent(oldTracked ? "rename" : "create", file.path, frontmatter, oldTracked ? oldPath : void 0);
          this.store.data.fileSignatures[file.path] = signature;
        } else if (oldPath in this.store.data.fileSignatures) {
          await this.controller.handleVaultEvent("delete", oldPath, {});
        }
        delete this.store.data.fileSignatures[oldPath];
        this.scheduleFlush();
      } catch (error) {
        this.reportError(`\u8BB0\u5F55\u91CD\u547D\u540D ${oldPath} \u2192 ${file.path} \u5931\u8D25`, error);
      }
    });
  }
  scheduleFlush() {
    if (this.flushTimer !== void 0) window.clearTimeout(this.flushTimer);
    this.flushTimer = window.setTimeout(() => {
      this.flushTimer = void 0;
      void this.runMutation(() => this.controller.flush()).catch((error) => this.reportError("\u4FDD\u5B58\u5DE5\u4F5C\u53F0\u6D3B\u52A8\u6570\u636E\u5931\u8D25", error, true));
    }, FLUSH_DELAY_MS);
  }
  runMutation(operation) {
    return this.mutations.run(operation);
  }
  async repairCompletedReviewPaths() {
    const markdownFiles = this.app.vault.getMarkdownFiles();
    const availablePaths = new Set(markdownFiles.map((file) => file.path));
    const candidates = [];
    let scanComplete = true;
    for (const file of markdownFiles) {
      try {
        const content = await this.app.vault.read(file);
        if (!content.includes("workbench-review:start") && !content.includes("workbench-review:end")) continue;
        const frontMatterInfo = (0, import_obsidian3.getFrontMatterInfo)(content.replace(/^\uFEFF/, ""));
        let frontmatter = {};
        if (frontMatterInfo.exists) {
          const parsed = (0, import_obsidian3.parseYaml)(frontMatterInfo.frontmatter);
          if (parsed !== null && parsed !== void 0) {
            if (typeof parsed !== "object" || Array.isArray(parsed)) {
              throw new Error("YAML \u5C5E\u6027\u5FC5\u987B\u662F\u5BF9\u8C61\u3002");
            }
            frontmatter = parsed;
          }
        }
        if (!isCompletedReviewFrontmatter(frontmatter)) continue;
        parseStoredReviewState(content);
        candidates.push({
          path: file.path,
          reviewDate: frontmatter.review_date,
          date: frontmatter.date,
          reviewStatus: frontmatter.review_status
        });
      } catch (error) {
        scanComplete = false;
        this.reportError(`\u626B\u63CF\u590D\u76D8\u5019\u9009 ${file.path} \u5931\u8D25`, error);
      }
    }
    const plans = planCompletedReviewRepairs(
      this.store.data.completedReviews,
      availablePaths,
      candidates,
      scanComplete
    );
    for (const { date, previousPath, decision } of plans) {
      if (decision.kind === "rename") {
        this.controller.setCompletedReviewPath(date, decision.path);
      } else if (decision.kind === "clear" && previousPath) {
        this.controller.syncCompletedReviewPath("delete", previousPath);
      } else if (decision.kind === "ambiguous") {
        this.reportError(
          previousPath ? `\u65E5\u671F ${date} \u627E\u5230\u591A\u4E2A\u5019\u9009\u590D\u76D8\u6587\u4EF6\uFF0C\u5DF2\u4FDD\u7559\u65E7\u6620\u5C04` : `\u65E5\u671F ${date} \u627E\u5230\u591A\u4E2A\u5019\u9009\u590D\u76D8\u6587\u4EF6\uFF0C\u672A\u81EA\u52A8\u6062\u590D\u5B8C\u6210\u72B6\u6001`,
          new Error(decision.paths.join("\uFF1B")),
          true
        );
      } else if (decision.kind === "inconclusive" && previousPath) {
        this.reportError(
          `\u65E5\u671F ${date} \u7684\u590D\u76D8\u5019\u9009\u626B\u63CF\u4E0D\u5B8C\u6574\uFF0C\u5DF2\u4FDD\u7559\u65E7\u6620\u5C04`,
          new Error("\u81F3\u5C11\u4E00\u4E2A Markdown \u6587\u4EF6\u8BFB\u53D6\u3001YAML \u89E3\u6790\u6216\u590D\u76D8\u533A\u5757\u9A8C\u8BC1\u5931\u8D25\u3002"),
          true
        );
      }
    }
  }
  async reconcileAtStartup() {
    const signatures = {};
    for (const file of this.app.vault.getMarkdownFiles()) {
      if (!shouldTrackPath(file.path)) continue;
      signatures[file.path] = await this.signatureFor(file);
    }
    await this.controller.reconcileStartup(signatures);
  }
  async refreshFromVault(options) {
    return this.refreshSingleFlight.run(
      options.notify,
      () => this.runMutation(async () => {
        try {
          await runRefreshTransaction({
            snapshot: () => ({
              controller: this.controller.captureState(),
              baselineReady: this.baselineReady
            }),
            repair: () => this.repairCompletedReviewPaths(),
            reconcile: () => this.reconcileAtStartup(),
            complete: () => {
              this.baselineReady = true;
            },
            restore: (snapshot) => {
              this.controller.restoreState(snapshot.controller);
              this.baselineReady = snapshot.baselineReady;
            }
          });
        } catch (error) {
          this.reportError("\u5237\u65B0\u5DE5\u4F5C\u8BB0\u5FC6\u5931\u8D25\uFF0C\u5DE5\u4F5C\u53F0\u4FDD\u7559\u4E0A\u6B21\u6570\u636E", error, true);
          return false;
        }
        this.refreshRenderersSafely();
        return true;
      }),
      () => new import_obsidian3.Notice("\u4ECA\u65E5\u5DE5\u4F5C\u8BB0\u5FC6\u5DF2\u5237\u65B0\u3002")
    );
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
