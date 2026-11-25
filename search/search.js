"use strict";

const query = document.querySelector("#query");
const grade = document.querySelector("#grade");
const results = document.querySelector("#results");
const message = document.querySelector("#message");
const announcement = document.querySelector("#announcement");
const groupNames = {chapter: "Chapter sections", example: "Examples"};
const typeNames = {chapter: "Chapter section", example: "Example"};
const tiers = ["Direct match", "Also called", "Related representation", "Builds on this"];
const filler = new Set("help with the how to for and".split(" "));
const plurals = new Map();
for (const word of "block rod bundle group array model product quotient fraction strip plot number estimate bond line graph problem clock shape pattern factor pair multiple triangle quadrilateral decimal share conversion algorithm sum remainder".split(" ")) {
  plurals.set(word + "s", word);
}
function normalize(text) {
  return (text.normalize("NFKC").toLowerCase().replace(/[-\p{Pd}]+/gu, " ")
    .match(/[\p{L}\p{N}]+/gu) || []).map(word => plurals.get(word) || word).join(" ");
}
const vocabulary = new Map();
let destinations, expanded, announceTimer;

function loadVocabulary(data) {
  destinations = data.destinations;
  for (const dest of destinations) {
    for (const claim of dest.claims) {
      claim.terms = claim.terms.map(normalize);
      for (const term of claim.terms) vocabulary.set(term, term);
    }
  }
  for (const [variant, term] of Object.entries(data.variants)) vocabulary.set(normalize(variant), normalize(term));
}

function requestTerms(text) {
  const phrase = normalize(text);
  if (vocabulary.has(phrase)) return {exact: vocabulary.get(phrase)};
  const tokens = new Set(phrase.split(" ").filter(word => word && !filler.has(word)));
  const phrases = [];
  for (const [words, term] of vocabulary) {
    const parts = words.split(" ").filter(word => !filler.has(word));
    if (parts.every(word => tokens.has(word))) phrases.push({term, parts});
  }
  return {tokens, phrases};
}

function tier(claim) {
  if (claim.relation === "prerequisite") return 3;
  if (claim.relation === "related") return 2;
  return claim.alias ? 1 : 0;
}
function compare(a, b) {
  return a.tier - b.tier || a.claims.length - b.claims.length || a.order - b.order;
}
function candidate(claims) {
  return {claims, tier: Math.max(...claims.map(tier)), order: Math.min(...claims.map(c => c.order))};
}

// Cover complete phrases within one grade at one heading. Prefer a single explanation
// for a conjunction when the passage explicitly teaches both parts together.
function matchGrade(request, claims) {
  if (request.exact) {
    return claims.filter(c => c.terms.includes(request.exact)).map(c => candidate([c])).sort(compare)[0];
  }
  if (!request.tokens.size) return;
  const options = claims.map(claim => {
    const words = new Set(request.phrases.filter(p => claim.terms.includes(p.term)).flatMap(p => p.parts));
    return {claim, words};
  }).filter(o => o.words.size);
  let best;
  function cover(remaining, chosen) {
    if (!remaining.size) {
      const hit = candidate(chosen);
      if (!best || compare(hit, best) < 0) best = hit;
      return;
    }
    const first = remaining.values().next().value;
    for (const {claim, words} of options) {
      if (words.has(first)) cover(new Set([...remaining].filter(w => !words.has(w))), [...chosen, claim]);
    }
  }
  cover(request.tokens, []);
  return best;
}

function search(text, selected) {
  const groups = {chapter: [], example: []};
  const request = requestTerms(text);
  for (const dest of destinations) {
    const byGrade = new Map();
    for (const c of dest.claims) {
      if (selected && c.grade !== selected) continue;
      if (!byGrade.has(c.grade)) byGrade.set(c.grade, []);
      byGrade.get(c.grade).push(c);
    }
    const hits = [...byGrade.values()].map(claims => matchGrade(request, claims)).filter(Boolean);
    if (hits.length) groups[dest.type].push({...hits.sort(compare)[0], dest});
  }
  for (const list of Object.values(groups)) list.sort((a,b) => compare(a,b) || a.dest.id.localeCompare(b.dest.id, "en"));
  return groups;
}

function element(tag, text, className) {
  const item = document.createElement(tag);
  if (text) item.textContent = text;
  if (className) item.className = className;
  return item;
}
function card(hit) {
  const {dest, claims} = hit;
  const primary = claims.find(c => tier(c) === hit.tier);
  const li = element("li", "", "card");
  const heading = element("h3");
  const link = element("a", dest.title);
  link.id = dest.id;
  link.href = dest.url;
  heading.append(link);
  const reason = element("p", "", "reason");
  const label = hit.tier === 1 ? "Also called " + primary.terms.join(" or ") : tiers[hit.tier];
  reason.append(element("strong", label + " · "), [...new Set(claims.map(c => c.reason))].join(" "));
  li.append(heading, element("p", typeNames[dest.type] + " · Grade " + primary.grade, "meta"),
    element("p", primary.preview || dest.preview), reason);
  return li;
}

const listbox = document.querySelector("#suggestions");
const byId = new Map();
const spellings = new Map();
const suggestionRanks = new Map();
let standards, phrases, optionLabels = [], activeOption = -1;
let feedback = {};

function loadDiscovery(data) {
  standards = data.standards;
  phrases = new Map(Object.entries(data.phrases).map(([text, hits]) => [normalize(text), hits]));
  // Save the authored spellings before the historical matcher normalizes its claims.
  for (const dest of data.destinations) {
    byId.set(dest.id, dest);
    for (const claim of dest.claims) {
      for (const label of claim.terms) spellings.set(label, normalize(label));
    }
  }
  for (const [label, target] of Object.entries(data.variants)) spellings.set(label, normalize(target));
  for (const label of Object.keys(data.phrases)) {
    if (!spellings.has(label)) spellings.set(label, normalize(label));
  }
}

// Codes keep every period and suffix. Phrase matching uses only the reviewed spellings.
function standardMatches(text, selected) {
  const code = text.trim().toUpperCase();
  if (/^[K1-5]\./.test(code)) {
    const key = Object.keys(standards).find(id => id.toUpperCase() === code);
    if (!key) return [];
    const row = standards[key];
    return !selected || row.grade === selected || row.boundary ? [{code: key}] : [];
  }
  return (phrases.get(normalize(text)) || []).filter(({code}) => !selected || selected === standards[code].grade);
}

function standardCourses(matches) {
  const groups = {chapter: [], example: []};
  const found = new Map();
  function add(id, code, reason) {
    let hit = found.get(id);
    if (!hit) {
      const dest = byId.get(id);
      hit = {dest, grade: standards[code].grade, codes: [], reasons: []};
      groups[dest.type].push(hit);
      found.set(id, hit);
    }
    if (!hit.codes.includes(code)) hit.codes.push(code);
    if (reason && !hit.reasons.includes(reason)) hit.reasons.push(reason);
  }
  for (const {code} of matches) {
    const row = standards[code];
    for (const id of row.worked) add(id, code);
    for (const {id, reason} of row.teaching) add(id, code, reason);
  }
  return groups;
}

function standardCourseCard({dest, grade, codes, reasons}) {
  const li = element("li", "", "card");
  const heading = element("h3");
  const link = element("a", dest.title);
  link.id = dest.id;
  link.href = dest.url;
  heading.append(link);
  const relation = dest.type === "chapter" ? "Teaching explanation" : "Worked example";
  const reason = element("p", "", "reason");
  reason.append(element("strong", relation + " · "), codes.join(", "));
  if (reasons.length) reason.append(". " + reasons.join(" "));
  li.append(heading, element("p", typeNames[dest.type] + " · Grade " + grade, "meta"),
    element("p", dest.preview), reason);
  return li;
}

const phraseSources = {
  numbered: "Wording of this standard",
  cluster: "Wording of the standards cluster",
  strategy: "A strategy described for this standard",
  worked: "A strategy demonstrated in the course"
};

function standardSection(matches, legacyHits) {
  const section = element("section", "", "standard-results");
  section.append(element("h2", "Standards (" + matches.length + ")"));
  const list = element("ol");
  for (const {code, provenance} of matches) {
    const row = standards[code];
    const li = element("li");
    li.append(element("p", row.boundary ? "Later-grade reference · Grade 5 fluency" : "Grade " + row.grade, "meta"));
    const ref = window.standardPreviewLink(code, row.url, row.summary, "reference-" + code);
    li.append(ref);
    if (provenance) li.append(element("p", phraseSources[provenance]));
    const citations = new Set(row.citations.map(c => c.record + " · " + c.heading));
    for (const place of citations) {
      const p = element("p");
      p.append(element("strong", "Cited standard · "), place);
      li.append(p);
    }
    // Existing card copy and ordering stay intact for classroom-vocabulary matches.
    if (legacyHits) {
      for (const [label, ids] of [["Worked example", row.worked], ["Teaching explanation", row.teaching.map(t => t.id)]]) {
        if (!ids.length) continue;
        const p = element("p");
        p.append(element("strong", label + " · "), ids.map(id => byId.get(id).title).join(" · "));
        li.append(p);
      }
    }
    list.append(li);
  }
  section.append(list);
  return section;
}

function lexical(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

// The longest token consumes its word first. Prefix sets are nested or disjoint,
// so this also finds valid out-of-order matches where two prefixes share a start.
function prefixRank(key, typed, tokens) {
  const words = key.split(" ").filter(word => !filler.has(word));
  if (!tokens.every(token => {
    const index = words.findIndex(word => word.startsWith(token));
    if (index < 0) return false;
    words.splice(index, 1);
    return true;
  })) return;
  if (key === typed) return 0;
  if (key.startsWith(typed)) return 1;
  return tokens.every(token => key.split(" ").includes(token)) ? 2 : 3;
}

function selectionRank(label, selected) {
  const cacheKey = selected + "/" + label;
  if (!suggestionRanks.has(cacheKey)) {
    const {chapter, example} = search(label, selected);
    const hit = [...chapter, ...example].sort(compare)[0];
    suggestionRanks.set(cacheKey, hit ? [hit.tier, hit.order] :
      standardMatches(label, selected).length ? [0, Infinity] : null);
  }
  return suggestionRanks.get(cacheKey);
}

function suggestions(text, selected) {
  const dotted = text.trim().toUpperCase();
  if (/^[K1-5]\./.test(dotted)) {
    return Object.keys(standards).filter(code => code.toUpperCase().startsWith(dotted) &&
      (!selected || standards[code].grade === selected)).sort(lexical).slice(0, 5);
  }
  const typed = normalize(text);
  const tokens = typed.split(" ").filter(w => w && !filler.has(w)).sort((a, b) => b.length - a.length);
  if (tokens.join("").length < 2) return [];
  const options = [];
  for (const [label, target] of spellings) {
    const rank = prefixRank(normalize(label), typed, tokens);
    if (rank === undefined) continue;
    const eligible = selectionRank(label, selected);
    if (eligible) options.push({label, target, rank, tier: eligible[0], order: eligible[1]});
  }
  options.sort((a, b) => a.rank - b.rank || a.tier - b.tier || a.order - b.order ||
    a.label.length - b.label.length || lexical(a.label, b.label));
  const unique = new Map();
  for (const {label, target} of options) if (!unique.has(target)) unique.set(target, label);
  return [...unique.values()].slice(0, 5);
}

function closeSuggestions() {
  const wasOpen = optionLabels.length > 0;
  optionLabels = [];
  activeOption = -1;
  query.removeAttribute("aria-activedescendant");
  query.setAttribute("aria-expanded", "false");
  listbox.hidden = true;
  listbox.replaceChildren();
  if (wasOpen) showFeedback();
}

function openSuggestions() {
  closeSuggestions();
  optionLabels = suggestions(query.value, grade.value);
  for (const label of optionLabels) {
    const option = element("li", label);
    option.id = "suggest-" + encodeURIComponent(label);
    option.setAttribute("role", "option");
    option.setAttribute("aria-selected", "false");
    listbox.append(option);
  }
  listbox.hidden = !optionLabels.length;
  query.setAttribute("aria-expanded", String(!listbox.hidden));
  if (optionLabels.length) showFeedback();
}

function highlight(index) {
  if (activeOption >= 0) listbox.children[activeOption].setAttribute("aria-selected", "false");
  activeOption = index;
  const option = listbox.children[index];
  option.setAttribute("aria-selected", "true");
  query.setAttribute("aria-activedescendant", option.id);
  const top = option.offsetTop;
  if (top < listbox.scrollTop) listbox.scrollTop = top;
  else if (top + option.offsetHeight > listbox.scrollTop + listbox.clientHeight) {
    listbox.scrollTop = top + option.offsetHeight - listbox.clientHeight;
  }
}

function acceptSuggestion(index) {
  const changed = query.value !== optionLabels[index];
  query.value = optionLabels[index];
  query.focus({preventScroll: true});
  closeSuggestions();
  if (changed) edit();
}

function handleSuggestionKey(e) {
  if (e.isComposing || e.keyCode === 229 || e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
  if (e.key === "Escape" || e.key === "Tab") {
    if (e.key === "Escape" && !listbox.hidden) e.preventDefault();
    closeSuggestions();
  } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
    if (listbox.hidden) openSuggestions();
    if (listbox.hidden) return;
    e.preventDefault();
    const n = optionLabels.length;
    const index = e.key === "ArrowDown" ? (activeOption + 1) % n : (activeOption < 0 ? n - 1 : (activeOption + n - 1) % n);
    highlight(index);
  } else if (e.key === "Enter" && activeOption !== -1) {
    e.preventDefault();
    acceptSuggestion(activeOption);
  }
}

function savePosition(focus) {
  history.replaceState({...history.state, expanded: [...expanded], focus, y: window.scrollY}, "");
}
function showFeedback() {
  clearTimeout(announceTimer);
  let {status, counts, canComplete} = feedback;
  query.form.classList.toggle("suggestion-only", canComplete && optionLabels.length > 0);
  if (canComplete) status = optionLabels.length ? "Choose a suggested search, or keep typing." :
    "Keep typing to complete your search.";
  message.textContent = status;
  message.hidden = !status;
  if (query.value.trim()) {
    announceTimer = setTimeout(() => {
      const n = optionLabels.length;
      const options = n ? " " + n + (n === 1 ? " suggested search available." : " suggested searches available.") : "";
      announcement.textContent = (status || counts) + options;
    }, 180);
  } else announcement.textContent = "";
}

function draw() {
  results.replaceChildren();
  let status = "Enter a skill or strategy to find a chapter section or worked example.";
  const counts = [];
  let canComplete = false;
  if (query.value.trim()) {
    let groups = search(query.value, grade.value);
    const matches = standardMatches(query.value, grade.value);
    const legacyHits = Boolean(groups.chapter.length || groups.example.length);
    if (!legacyHits && matches.length) groups = standardCourses(matches);
    for (const [type, hits] of Object.entries(groups)) {
      counts.push(hits.length + " " + groupNames[type].toLowerCase());
      if (!hits.length) continue;
      const section = element("section");
      section.append(element("h2", groupNames[type] + " (" + hits.length + ")"));
      const list = element("ol");
      for (const hit of (expanded.has(type) ? hits : hits.slice(0, 5))) {
        list.append(legacyHits ? card(hit) : standardCourseCard(hit));
      }
      section.append(list);
      if (hits.length > 5 && !expanded.has(type)) {
        const button = element("button", "Show all " + hits.length + " " + groupNames[type].toLowerCase());
        button.onclick = () => {
          expanded.add(type);
          draw();
          const link = document.getElementById(hits[5].dest.id);
          link.focus();
          savePosition(link.id);
        };
        section.append(button);
      }
      results.append(section);
    }
    if (matches.length) {
      const section = standardSection(matches, legacyHits);
      results.append(section);
      window.enableStandardPreviews(section);
      counts.push(matches.length + (matches.length === 1 ? " standard" : " standards"));
    }
    if (results.children.length) status = "";
    else {
      canComplete = optionLabels.length > 0 || suggestions(query.value, grade.value).length > 0;
      if (!canComplete) {
        status = "No matches for ‘" + query.value.trim() + "’ " + (grade.value ? "in Grade " + grade.value : "across all grades") + ". Try different words.";
        if (normalize(query.value) === "block") {
          const qualified = search("base-ten blocks", grade.value);
          if (qualified.chapter.length || qualified.example.length) status += " Did you mean base-ten blocks?";
        }
      }
      if (grade.value) {
        const reset = element("button", "Choose All grades");
        reset.onclick = () => { grade.value = ""; edit(); grade.focus(); };
        results.append(reset);
      }
    }
  }
  feedback = {status, counts: counts.join(", "), canComplete};
  showFeedback();
}

function edit() {
  expanded = new Set();
  const params = new URLSearchParams();
  if (query.value) params.set("q", query.value);
  if (grade.value) params.set("grade", grade.value);
  const url = new URL(location.href);
  url.hash = params.toString();
  history.replaceState({}, "", url);
  draw();
}
function restore() {
  closeSuggestions();
  const params = new URLSearchParams(location.hash.slice(1));
  query.value = params.get("q") || "";
  grade.value = ["K","1","2","3","4"].includes(params.get("grade")) ? params.get("grade") : "";
  const state = history.state || {};
  expanded = new Set(state.expanded || []);
  draw();
  if (state.focus || Number.isFinite(state.y)) requestAnimationFrame(() => {
    document.getElementById(state.focus)?.focus({preventScroll: true});
    closeSuggestions();
    if (Number.isFinite(state.y)) window.scrollTo(0, state.y);
  });
}
document.querySelector("form").addEventListener("submit", e => e.preventDefault());
async function start() {
  const response = await fetch("index.json");
  if (!response.ok) throw Error("Search index unavailable");
  const data = await response.json();
  loadDiscovery(data);
  loadVocabulary(data);
  history.scrollRestoration = "manual";
  restore();
  query.addEventListener("input", e => {
    if (e.isComposing) closeSuggestions();
    else openSuggestions();
    edit();
  });
  query.addEventListener("focus", openSuggestions);
  query.addEventListener("blur", closeSuggestions);
  query.addEventListener("keydown", handleSuggestionKey);
  // Preserve focus until the browser dispatches the completed click or tap.
  // Let touch scrolling and pointer cancellation follow native behavior.
  listbox.addEventListener("mousedown", e => e.preventDefault());
  listbox.addEventListener("click", e => {
    const option = e.target.closest('[role="option"]');
    if (option) acceptSuggestion(optionLabels.indexOf(option.textContent));
  });
  document.addEventListener("pointerdown", e => {
    if (e.target !== query && !listbox.contains(e.target)) closeSuggestions();
  });
  grade.addEventListener("change", () => { closeSuggestions(); edit(); });
  results.addEventListener("click", e => {
    const link = e.target.closest("a");
    if (!link) return;
    if (link.getAttribute("href") === "#standards-notice" && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
      // The fragment holds the current query. Jump to this page's notice without replacing it.
      e.preventDefault();
      document.getElementById("standards-notice").focus();
    } else if (link.id) savePosition(link.id);
  });
  window.addEventListener("pageshow", e => { if (e.persisted) restore(); });
  window.addEventListener("popstate", restore);
  window.addEventListener("pagehide", () => savePosition(document.activeElement.id || history.state?.focus));
}
start().catch(() => { message.hidden = false; message.textContent = "The search index could not be loaded. Reload this page to try again."; });
