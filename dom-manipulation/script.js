let quotes = [
  { text: "The only limit to our realization of tomorrow is our doubts of today.", category: "Motivation" },
  { text: "In the middle of every difficulty lies opportunity.", category: "Inspiration" },
  { text: "Life is what happens when you're busy making other plans.", category: "Life" }
];

const STORAGE_KEY = "quotesAppData";
const FILTER_KEY = "lastSelectedCategory";

const quoteDisplay = document.getElementById("quoteDisplay");
const categoryFilter = document.getElementById("categoryFilter");
const newQuoteBtn = document.getElementById("newQuote");
const addQuoteBtn = document.getElementById("addQuoteBtn");
const newQuoteText = document.getElementById("newQuoteText");
const newQuoteCategory = document.getElementById("newQuoteCategory");

function saveQuotes() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(quotes));
}

function loadQuotes() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      quotes = JSON.parse(stored);
    } catch {}
  }
}

function populateCategories() {
  const categories = [...new Set(quotes.map(q => q.category))];
  categoryFilter.innerHTML = `<option value="all">All Categories</option>`;
  categories.forEach(cat => {
    const option = document.createElement("option");
    option.value = cat;
    option.textContent = cat;
    categoryFilter.appendChild(option);
  });
  const savedFilter = localStorage.getItem(FILTER_KEY);
  if (savedFilter && [...categoryFilter.options].some(opt => opt.value === savedFilter)) {
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
  if (filteredQuotes.length === 0) {
    quoteDisplay.textContent = "No quotes found in this category.";
    return;
  }
  const randomIndex = Math.floor(Math.random() * filteredQuotes.length);
  const chosen = filteredQuotes[randomIndex];
  quoteDisplay.textContent = `"${chosen.text}" — ${chosen.category}`;
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
}

newQuoteBtn.addEventListener("click", filterQuotes);
addQuoteBtn.addEventListener("click", createAddQuoteForm);
categoryFilter.addEventListener("change", filterQuotes);

loadQuotes();
populateCategories();
filterQuotes();

