let quotes = [
  { text: "The only limit to our realization of tomorrow is our doubts of today.", category: "Motivation" },
  { text: "In the middle of every difficulty lies opportunity.", category: "Inspiration" },
  { text: "Life is what happens when you're busy making other plans.", category: "Life" }
];

const STORAGE_KEY = "quotesAppData.v2";
const FILTER_KEY = "lastSelectedCategory";
const CONFLICTS_KEY = "quotesConflicts.v1";
const SESSION_KEY = "lastViewedQuote";
const SYNC_INTERVAL_MS = 30000;
const SERVER_URL = "https://jsonplaceholder.typicode.com/posts?_limit=10";
const SERVER_POST_URL = "https://jsonplaceholder.typicode.com/posts";

const quoteDisplay = document.getElementById("quoteDisplay");
const categoryFilter = document.getElementById("categoryFilter");
const newQuoteBtn = document.getElementById("newQuote");
const addQuoteBtn = document.getElementById("addQuoteBtn");
const newQuoteText = document.getElementById("newQuoteText");
const newQuoteCategory = document.getElementById("newQuoteCategory");
const meta = document.getElementById("meta");
const statusEl = document.getElementById("status");
const syncBtn = document.getElementById("syncBtn");
const conflictBtn = document.getElementById("conflictBtn");
const conflictPanel = document.getElementById("conflictPanel");
const conflictList = document.getElementById("conflictList");
const resolveServerAllBtn = document.getElementById("resolveServerAll");
const resolveLocalAllBtn = document.getElementById("resolveLocalAll");

let conflicts = [];

function nowTs() {
  return Date.now();
}

function slug(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (h * 33) ^ s.charCodeAt(i);
  return (h >>> 0).toString(36);
}

function keyForQuote(q) {
  return slug((q.text || "").trim().toLowerCase());
}

function ensureShape(list) {
  return list.map(q => {
    const text = (q.text || "").toString();
    const category = (q.category || "General").toString();
    const id = q.id || "loc-" + slug(text + "|" + category);
    const source = q.source || "local";
    const lastModified = q.lastModified || nowTs();
    return { id, text, category, source, lastModified };
  });
}

function saveQuotes() {
  quotes = ensureShape(quotes);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(quotes));
}

function loadQuotes() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      quotes = ensureShape(JSON.parse(stored));
    } catch {}
  } else {
    quotes = ensureShape(quotes);
    saveQuotes();
  }
  const storedConflicts = localStorage.getItem(CONFLICTS_KEY);
  if (storedConflicts) {
    try {
      conflicts = JSON.parse(storedConflicts);
    } catch {}
  }
}

function saveConflicts() {
  localStorage.setItem(CONFLICTS_KEY, JSON.stringify(conflicts));
}

function populateCategories() {
  const categories = [...new Set(quotes.map(q => q.category))].sort((a, b) => a.localeCompare(b));
  categoryFilter.innerHTML = `<option value="all">All Categories</option>`;
  categories.forEach(cat => {
    const option = document.createElement("option");
    option.value = cat;
    option.textContent = cat;
    categoryFilter.appendChild(option);
  });
  const savedFilter = localStorage.getItem(FILTER_KEY);
  if (savedFilter && [...categoryFilter.options].some(o => o.value === savedFilter)) {
    categoryFilter.value = savedFilter;
  }
}

function filterQuotes() {
  const selectedCategory = categoryFilter.value;
  localStorage.setItem(FILTER_KEY, selectedCategory);
  let filteredQuotes = quotes;
  if (selectedCategory !== "all") {
    filteredQuotes = quotes.filter(q => q.category === selectedCategory);
  }
  if (!filteredQuotes.length) {
    quoteDisplay.textContent = "No quotes found in this category.";
    meta.textContent = "";
    return;
  }
  const idx = Math.floor(Math.random() * filteredQuotes.length);
  const chosen = filteredQuotes[idx];
  quoteDisplay.textContent = `"${chosen.text}" — ${chosen.category}`;
  meta.textContent = chosen.source === "server" ? "From server" : "From local";
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(chosen));
}

function createAddQuoteForm() {
  const text = newQuoteText.value.trim();
  const category = newQuoteCategory.value.trim();
  if (!text || !category) {
    alert("Please fill in both fields!");
    return;
  }
  quotes.push({ text, category });
  newQuoteText.value = "";
  newQuoteCategory.value = "";
  populateCategories();
  alert("Quote added successfully!");
  saveQuotes();
  postLocalQuote({ text, category });
}

async function postLocalQuote(q) {
  try {
    const res = await fetch(SERVER_POST_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: q.category, body: q.text, userId: 1 })
    });
    const data = await res.json();
    const key = keyForQuote(q);
    const i = quotes.findIndex(x => keyForQuote(x) === key);
    if (i !== -1) {
      quotes[i].id = "srv-" + (data.id || slug(q.text));
      quotes[i].source = "server";
      quotes[i].lastModified = nowTs();
      saveQuotes();
    }
    setStatus("Synced new quote to server.");
  } catch {
    setStatus("Failed to sync new quote to server.");
  }
}

function setStatus(t) {
  statusEl.textContent = t;
}

function openConflictsUI() {
  conflictList.innerHTML = "";
  if (!conflicts.length) {
    const li = document.createElement("li");
    li.textContent = "No conflicts.";
    conflictList.appendChild(li);
  } else {
    conflicts.forEach((c, idx) => {
      const li = document.createElement("li");
      const txt = document.createElement("div");
      txt.textContent = `Local: "${c.local.text}" — ${c.local.category} | Server: "${c.server.text}" — ${c.server.category}`;
      const actions = document.createElement("div");
      const btnServer = document.createElement("button");
      btnServer.textContent = "Use Server";
      btnServer.onclick = () => resolveConflict(idx, "server");
      const btnLocal = document.createElement("button");
      btnLocal.textContent = "Use Local";
      btnLocal.onclick = () => resolveConflict(idx, "local");
      actions.appendChild(btnServer);
      actions.appendChild(btnLocal);
      li.appendChild(txt);
      li.appendChild(actions);
      conflictList.appendChild(li);
    });
  }
  conflictPanel.style.display = conflictPanel.style.display === "none" ? "block" : "none";
}

function resolveConflict(idx, side) {
  const c = conflicts[idx];
  if (!c) return;
  const key = keyForQuote(c.server);
  const i = quotes.findIndex(x => keyForQuote(x) === key);
  if (side === "server") {
    if (i !== -1) quotes[i] = { ...c.server, id: quotes[i].id || c.server.id, source: "server", lastModified: nowTs() };
    else quotes.push({ ...c.server, source: "server", lastModified: nowTs() });
  } else {
    if (i !== -1) quotes[i] = { ...c.local, id: quotes[i].id || c.local.id, source: "local", lastModified: nowTs() };
    else quotes.push({ ...c.local, source: "local", lastModified: nowTs() });
  }
  conflicts.splice(idx, 1);
  saveConflicts();
  saveQuotes();
  populateCategories();
  filterQuotes();
  openConflictsUI();
}

function resolveAll(side) {
  for (let i = conflicts.length - 1; i >= 0; i--) resolveConflict(i, side);
}

async function fetchServerQuotes() {
  try {
    const res = await fetch(SERVER_URL);
    const posts = await res.json();
    return posts.map(p => {
      const text = (p.body || "").toString().trim();
      const category = (p.title || "Server").toString().trim() || "Server";
      return { id: "srv-" + p.id, text, category, source: "server", lastModified: nowTs() };
    });
  } catch {
    return [];
  }
}

function mergeServerData(remote) {
  const localByKey = new Map(quotes.map(q => [keyForQuote(q), q]));
  let added = 0;
  let updated = 0;
  const newConflicts = [];
  for (const r of remote) {
    const k = keyForQuote(r);
    if (!localByKey.has(k)) {
      quotes.push(r);
      added++;
    } else {
      const l = localByKey.get(k);
      if (l.text !== r.text || l.category !== r.category) {
        newConflicts.push({ key: k, local: l, server: r });
        const idx = quotes.findIndex(x => keyForQuote(x) === k);
        if (idx !== -1) {
          quotes[idx] = r;
          updated++;
        }
      }
    }
  }
  if (newConflicts.length) {
    conflicts = [...conflicts, ...newConflicts];
    saveConflicts();
  }
  saveQuotes();
  populateCategories();
  filterQuotes();
  setStatus(`Sync complete. Added ${added}, updated ${updated}, conflicts ${newConflicts.length}.`);
}

async function syncWithServer() {
  setStatus("Syncing...");
  const remote = await fetchServerQuotes();
  if (!remote.length) {
    setStatus("No server data or network issue.");
    return;
  }
  mergeServerData(remote);
}

function init() {
  loadQuotes();
  populateCategories();
  const last = sessionStorage.getItem(SESSION_KEY);
  if (last) {
    try {
      const parsed = JSON.parse(last);
      quoteDisplay.textContent = `"${parsed.text}" — ${parsed.category}`;
      meta.textContent = parsed.source === "server" ? "From server" : "From local";
    } catch {
      filterQuotes();
    }
  } else {
    filterQuotes();
  }
  syncWithServer();
  setInterval(syncWithServer, SYNC_INTERVAL_MS);
}

newQuoteBtn.addEventListener("click", filterQuotes);
addQuoteBtn.addEventListener("click", createAddQuoteForm);
categoryFilter.addEventListener("change", filterQuotes);
syncBtn.addEventListener("click", syncWithServer);
conflictBtn.addEventListener("click", openConflictsUI);
resolveServerAllBtn.addEventListener("click", () => resolveAll("server"));
resolveLocalAllBtn.addEventListener("click", () => resolveAll("local"));

init();


