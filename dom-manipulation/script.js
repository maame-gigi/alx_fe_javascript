let quotes = JSON.parse(localStorage.getItem("quotes")) || [
  { text: "The only limit to our realization of tomorrow is our doubts of today.", category: "Motivation" },
  { text: "In the middle of every difficulty lies opportunity.", category: "Inspiration" },
  { text: "Life is what happens when you're busy making other plans.", category: "Life" }
];

const quoteDisplay = document.getElementById("quoteDisplay");
const categoryFilter = document.getElementById("categoryFilter");
const newQuoteBtn = document.getElementById("newQuote");
const addQuoteBtn = document.getElementById("addQuoteBtn");
const newQuoteText = document.getElementById("newQuoteText");
const newQuoteCategory = document.getElementById("newQuoteCategory");

function saveQuotes() {
  localStorage.setItem("quotes", JSON.stringify(quotes));
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

  const savedCategory = localStorage.getItem("selectedCategory");
  if (savedCategory) {
    categoryFilter.value = savedCategory;
  }
}

function showRandomQuote() {
  let filteredQuotes = quotes;
  const selectedCategory = categoryFilter.value;

  if (selectedCategory !== "all") {
    filteredQuotes = quotes.filter(q => q.category === selectedCategory);
  }

  if (filteredQuotes.length === 0) {
    quoteDisplay.textContent = "No quotes found in this category.";
    return;
  }

  const randomIndex = Math.floor(Math.random() * filteredQuotes.length);
  quoteDisplay.textContent = `"${filteredQuotes[randomIndex].text}" — ${filteredQuotes[randomIndex].category}`;

  sessionStorage.setItem("lastViewedQuote", JSON.stringify(filteredQuotes[randomIndex]));
}

function createAddQuoteForm() {
  const text = newQuoteText.value.trim();
  const category = newQuoteCategory.value.trim();

  if (!text || !category) {
    alert("Please fill in both fields!");
    return;
  }

  quotes.push({ text, category });
  saveQuotes();
  populateCategories();
  newQuoteText.value = "";
  newQuoteCategory.value = "";
  alert("Quote added successfully!");
}

function filterQuotes() {
  const selectedCategory = categoryFilter.value;
  localStorage.setItem("selectedCategory", selectedCategory);
  showRandomQuote();
}

async function fetchQuotesFromServer() {
  try {
    const res = await fetch("https://jsonplaceholder.typicode.com/posts?_limit=5");
    const serverData = await res.json();

    const serverQuotes = serverData.map(item => ({
      text: item.title,
      category: "Server"
    }));

    const localSet = new Set(quotes.map(q => q.text + "|" + q.category));
    let conflicts = 0;

    serverQuotes.forEach(sq => {
      const key = sq.text + "|" + sq.category;
      if (!localSet.has(key)) {
        quotes.push(sq);
      } else {
        conflicts++;
      }
    });

    if (conflicts > 0) {
      alert(`${conflicts} conflicts resolved. Server data took precedence.`);
    }

    saveQuotes();
    populateCategories();
  } catch (err) {
    console.error("Error fetching from server:", err);
  }
}

async function postQuotesToServer() {
  try {
    for (const quote of quotes) {
      await fetch("https://jsonplaceholder.typicode.com/posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          title: quote.text,
          body: quote.category,
          userId: 1
        })
      });
    }
    console.log("Quotes synced with server!");
  } catch (err) {
    console.error("Error posting to server:", err);
  }
}

async function syncQuotes() {
  await fetchQuotesFromServer();
  await postQuotesToServer();
}

newQuoteBtn.addEventListener("click", showRandomQuote);
addQuoteBtn.addEventListener("click", createAddQuoteForm);
categoryFilter.addEventListener("change", filterQuotes);

populateCategories();

const lastQuote = sessionStorage.getItem("lastViewedQuote");
if (lastQuote) {
  const parsed = JSON.parse(lastQuote);
  quoteDisplay.textContent = `"${parsed.text}" — ${parsed.category}`;
} else {
  showRandomQuote();
}

syncQuotes();
setInterval(syncQuotes, 15000);
