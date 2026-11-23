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

function savePosition(focus) {
  history.replaceState({...history.state, expanded: [...expanded], focus, y: window.scrollY}, "");
}
function draw() {
  clearTimeout(announceTimer);
  results.replaceChildren();
  let status = "Enter a skill or strategy to find a chapter section or worked example.";
  if (query.value.trim()) {
    const groups = search(query.value, grade.value);
    const counts = [];
    for (const [type, hits] of Object.entries(groups)) {
      counts.push(hits.length + " " + groupNames[type].toLowerCase());
      if (!hits.length) continue;
      const section = element("section");
      section.append(element("h2", groupNames[type] + " (" + hits.length + ")"));
      const list = element("ol");
      for (const hit of (expanded.has(type) ? hits : hits.slice(0, 5))) list.append(card(hit));
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
    if (results.children.length) status = "";
    else {
      status = "No matches for ‘" + query.value.trim() + "’ " + (grade.value ? "in Grade " + grade.value : "across all grades") + ". Try different words.";
      if (normalize(query.value) === "block") {
        const qualified = search("base-ten blocks", grade.value);
        if (qualified.chapter.length || qualified.example.length) status += " Did you mean base-ten blocks?";
      }
      if (grade.value) {
        const reset = element("button", "Choose All grades");
        reset.onclick = () => { grade.value = ""; edit(); grade.focus(); };
        results.append(reset);
      }
    }
    announceTimer = setTimeout(() => { announcement.textContent = status || counts.join(", "); }, 180);
  } else announcement.textContent = "";
  message.textContent = status;
  message.hidden = !status;
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
  const params = new URLSearchParams(location.hash.slice(1));
  query.value = params.get("q") || "";
  grade.value = ["K","1","2","3","4"].includes(params.get("grade")) ? params.get("grade") : "";
  const state = history.state || {};
  expanded = new Set(state.expanded || []);
  draw();
  if (state.focus || Number.isFinite(state.y)) requestAnimationFrame(() => {
    document.getElementById(state.focus)?.focus({preventScroll: true});
    if (Number.isFinite(state.y)) window.scrollTo(0, state.y);
  });
}
document.querySelector("form").addEventListener("submit", e => e.preventDefault());
async function start() {
  const response = await fetch("index.json");
  if (!response.ok) throw Error("Search index unavailable");
  loadVocabulary(await response.json());
  history.scrollRestoration = "manual";
  restore();
  query.addEventListener("input", edit);
  grade.addEventListener("change", edit);
  results.addEventListener("click", e => {
    const link = e.target.closest("a");
    if (link) savePosition(link.id);
  });
  window.addEventListener("pageshow", e => { if (e.persisted) restore(); });
  window.addEventListener("popstate", restore);
  window.addEventListener("pagehide", () => savePosition(document.activeElement.id || history.state?.focus));
}
start().catch(() => { message.hidden = false; message.textContent = "The search index could not be loaded. Reload this page to try again."; });
