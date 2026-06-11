const amountInput = document.querySelector("#amount");
const fromCurrency = document.querySelector("#fromCurrency");
const toCurrency = document.querySelector("#toCurrency");
const convertBtn = document.querySelector("#convertBtn");
const result = document.querySelector("#result");
const resultCard = document.querySelector("#resultCard");
const swapBtn = document.querySelector("#swapBtn");
const historyList = document.querySelector("#historyList");
const historyEmpty = document.querySelector("#historyEmpty");
const clearHistoryBtn = document.querySelector("#clearHistoryBtn");
const rateInfo = document.querySelector("#rateInfo");
const themeBtn = document.querySelector("#themeBtn");
const loader = document.querySelector("#loader");
const copyBtn = document.querySelector("#copyBtn");
const resetBtn = document.querySelector("#resetBtn");
const fromSearch = document.querySelector("#fromSearch");
const toSearch = document.querySelector("#toSearch");
const popularSection = document.querySelector("#popularSection");
const popularGrid = document.querySelector("#popularGrid");
const chartSection = document.querySelector("#chartSection");
const chart = document.querySelector("#chart");
const chartInfo = document.querySelector("#chartInfo");

const API_BASE = "https://api.frankfurter.dev";

// L'API Frankfurter (données BCE) ne couvre pas le XOF,
// mais le franc CFA a une parité fixe avec l'euro.
const XOF_PER_EUR = 655.957;

const HISTORY_MAX = 10;

const POPULAR_CURRENCIES = ["USD", "EUR", "GBP", "JPY", "CHF", "CAD", "CNY", "XOF"];

const currencyNames = {
  EUR: "Euro",
  USD: "Dollar américain",
  GBP: "Livre sterling",
  JPY: "Yen japonais",
  CHF: "Franc suisse",
  CAD: "Dollar canadien",
  AUD: "Dollar australien",
  NZD: "Dollar néo-zélandais",
  CNY: "Yuan chinois",
  INR: "Roupie indienne",
  BRL: "Réal brésilien",
  MXN: "Peso mexicain",
  SEK: "Couronne suédoise",
  NOK: "Couronne norvégienne",
  DKK: "Couronne danoise",
  PLN: "Zloty polonais",
  CZK: "Couronne tchèque",
  HUF: "Forint hongrois",
  TRY: "Livre turque",
  ZAR: "Rand sud-africain",
  XOF: "Franc CFA (BCEAO)"
};

const flagOverrides = {
  EUR: "🇪🇺",
  XOF: "🌍"
};

function flagEmoji(code) {
  if (flagOverrides[code]) return flagOverrides[code];

  // Les 2 premières lettres d'un code devise correspondent au pays (USD → US).
  return code
    .slice(0, 2)
    .split("")
    .map((letter) => String.fromCodePoint(0x1f1e6 + letter.charCodeAt(0) - 65))
    .join("");
}

const numberFormat = new Intl.NumberFormat("fr-FR", {
  maximumFractionDigits: 2
});

function formatDate(isoDate) {
  return new Date(isoDate).toLocaleDateString("fr-FR");
}

let history = JSON.parse(localStorage.getItem("history")) || [];

// Compatibilité avec l'ancien format (simples chaînes de caractères).
history = history.map((item) =>
  typeof item === "string" ? { text: item } : item
);

function saveHistory() {
  localStorage.setItem("history", JSON.stringify(history));
}

function saveSelectedCurrencies() {
  localStorage.setItem("fromCurrency", fromCurrency.value);
  localStorage.setItem("toCurrency", toCurrency.value);
}

function displayOptions(selectElement, currencies) {
  const previousValue = selectElement.value;

  selectElement.innerHTML = currencies
    .map(
      (currency) =>
        `<option value="${currency.code}">${flagEmoji(currency.code)} ${currency.code} - ${currency.name}</option>`
    )
    .join("");

  if (currencies.some((currency) => currency.code === previousValue)) {
    selectElement.value = previousValue;
  }
}

let allCurrencies = [];

async function fetchJSON(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Erreur API (${response.status})`);
  }

  return response.json();
}

async function loadCurrencies() {
  try {
    const ratesData = await fetchJSON(`${API_BASE}/v2/rates`);

    const availableCurrencies = [
      ratesData[0].base,
      ...ratesData.map((item) => item.quote)
    ];

    if (!availableCurrencies.includes("XOF")) {
      availableCurrencies.push("XOF");
    }

    const currenciesData = await fetchJSON(`${API_BASE}/v2/currencies`);

    allCurrencies = availableCurrencies.map((code) => {
      let apiName = currenciesData[code];

      if (typeof apiName === "object" && apiName !== null) {
        apiName = apiName.name;
      }

      return {
        code: code,
        name: currencyNames[code] || apiName || code
      };
    });

    allCurrencies.sort((a, b) => a.code.localeCompare(b.code));

    displayOptions(fromCurrency, allCurrencies);
    displayOptions(toCurrency, allCurrencies);

    fromCurrency.value = localStorage.getItem("fromCurrency") || "EUR";
    toCurrency.value = localStorage.getItem("toCurrency") || "USD";
  } catch (error) {
    console.log(error);
    showError("Impossible de charger les devises.");
  }
}

// Retourne la date du taux et tous les taux par rapport à `from`,
// en synthétisant le XOF via la parité fixe EUR/XOF.
async function getRates(from) {
  if (from === "XOF") {
    const data = await fetchJSON(`${API_BASE}/v2/rates?base=EUR`);
    const rates = { EUR: 1 / XOF_PER_EUR };

    data.forEach((item) => {
      rates[item.quote] = item.rate / XOF_PER_EUR;
    });

    return { date: data[0].date, rates };
  }

  const data = await fetchJSON(`${API_BASE}/v2/rates?base=${from}`);
  const rates = {};

  data.forEach((item) => {
    rates[item.quote] = item.rate;
  });

  rates.XOF = from === "EUR" ? XOF_PER_EUR : rates.EUR * XOF_PER_EUR;

  return { date: data[0].date, rates };
}

function showError(message) {
  resultCard.classList.remove("hidden");
  result.textContent = message;
  rateInfo.textContent = "";
}

function showResult(amount, from, rate, to, date) {
  const convertedAmount = amount * rate;

  resultCard.classList.remove("hidden");
  result.innerHTML = `${flagEmoji(from)} ${numberFormat.format(amount)} ${from} = <strong>${numberFormat.format(convertedAmount)}</strong> ${to} ${flagEmoji(to)}`;
  rateInfo.textContent = `Taux : 1 ${from} = ${rate.toFixed(4)} ${to} • ${formatDate(date)}`;

  return `${numberFormat.format(amount)} ${from} = ${numberFormat.format(convertedAmount)} ${to}`;
}

function displayPopular(amount, from, to, rates) {
  const others = POPULAR_CURRENCIES.filter(
    (code) => code !== from && code !== to && rates[code] !== undefined
  );

  if (others.length === 0) {
    popularSection.classList.add("hidden");
    return;
  }

  popularGrid.innerHTML = others
    .map(
      (code) => `
        <div class="popular-item">
          <span class="popular-code">${flagEmoji(code)} ${code}</span>
          <span class="popular-value">${numberFormat.format(amount * rates[code])}</span>
        </div>
      `
    )
    .join("");

  popularSection.classList.remove("hidden");
}

async function convertCurrency(saveToHistory = true) {
  const amount = Number(amountInput.value);
  const from = fromCurrency.value;
  const to = toCurrency.value;

  if (!amount || amount <= 0) {
    showError("Veuillez entrer un montant valide.");
    return;
  }

  try {
    loader.classList.remove("hidden");

    let rate;
    let date;
    let rates = null;

    if (from === to) {
      rate = 1;
      date = new Date().toISOString().slice(0, 10);
    } else {
      const ratesData = await getRates(from);
      rates = ratesData.rates;
      date = ratesData.date;
      rate = rates[to];

      if (rate === undefined) {
        throw new Error(`Taux indisponible pour ${from} → ${to}`);
      }
    }

    loader.classList.add("hidden");

    const conversionText = showResult(amount, from, rate, to, date);

    if (rates) {
      displayPopular(amount, from, to, rates);
    } else {
      popularSection.classList.add("hidden");
    }

    loadChart(from, to);

    if (saveToHistory) {
      const alreadySaved = history.some((item) => item.text === conversionText);

      if (!alreadySaved) {
        history.unshift({
          text: conversionText,
          time: Date.now(),
          amount: amount,
          from: from,
          to: to
        });

        history = history.slice(0, HISTORY_MAX);

        saveHistory();
        displayHistory();
      }
    }
  } catch (error) {
    console.log(error);
    loader.classList.add("hidden");
    showError("Impossible de convertir pour le moment.");
  }
}

// Graphique de l'évolution du taux sur les 30 derniers jours (SVG).
async function loadChart(from, to) {
  chartSection.classList.add("hidden");
  chart.innerHTML = "";
  chartInfo.textContent = "";

  if (from === to) return;

  const isFixedPair =
    (from === "EUR" && to === "XOF") || (from === "XOF" && to === "EUR");

  if (isFixedPair) {
    chartInfo.textContent =
      "Parité fixe EUR/XOF : ce taux ne varie pas (1 EUR = 655,957 XOF).";
    chartSection.classList.remove("hidden");
    return;
  }

  // Le XOF passe par l'EUR (parité fixe) pour la série historique.
  const base = from === "XOF" ? "EUR" : from;
  const quote = to === "XOF" ? "EUR" : to;

  let factor = 1;
  if (from === "XOF") factor = 1 / XOF_PER_EUR;
  if (to === "XOF") factor = XOF_PER_EUR;

  try {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);

    const startStr = start.toISOString().slice(0, 10);
    const endStr = end.toISOString().slice(0, 10);

    const data = await fetchJSON(
      `${API_BASE}/v1/${startStr}..${endStr}?base=${base}&symbols=${quote}`
    );

    const dates = Object.keys(data.rates).sort();
    const values = dates.map((d) => data.rates[d][quote] * factor);

    if (values.length < 2) return;

    drawChart(dates, values);

    const min = Math.min(...values);
    const max = Math.max(...values);
    chartInfo.textContent = `1 ${from} en ${to} — min : ${min.toFixed(4)} • max : ${max.toFixed(4)}`;

    chartSection.classList.remove("hidden");
  } catch (error) {
    // Le graphique est un bonus : en cas d'échec, on le masque simplement.
    console.log(error);
  }
}

function drawChart(dates, values) {
  const width = 600;
  const height = 180;
  const padding = 14;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points = values.map((value, i) => {
    const x = padding + (i / (values.length - 1)) * (width - 2 * padding);
    const y =
      height - padding - ((value - min) / range) * (height - 2 * padding);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const areaPoints = [
    `${padding},${height - padding}`,
    ...points,
    `${width - padding},${height - padding}`
  ];

  chart.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Évolution du taux sur 30 jours">
      <polygon class="chart-area" points="${areaPoints.join(" ")}" />
      <polyline class="chart-line" points="${points.join(" ")}" fill="none" />
    </svg>
    <div class="chart-dates">
      <span>${formatDate(dates[0])}</span>
      <span>${formatDate(dates[dates.length - 1])}</span>
    </div>
  `;
}

function displayHistory() {
  historyEmpty.classList.toggle("hidden", history.length > 0);
  clearHistoryBtn.classList.toggle("hidden", history.length === 0);

  historyList.innerHTML = history
    .map((item, index) => {
      const time = item.time
        ? `<span class="history-time">${new Date(item.time).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}</span>`
        : "";

      return `
        <li class="history-item" data-index="${index}" title="Cliquer pour relancer cette conversion">
          <div>
            <span>${item.text}</span>
            ${time}
          </div>
          <button class="deleteHistoryBtn" data-index="${index}" aria-label="Supprimer">❌</button>
        </li>
      `;
    })
    .join("");
}

loadCurrencies();
displayHistory();

convertBtn.addEventListener("click", () => convertCurrency());

amountInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    convertCurrency();
  }
});

// Conversion automatique pendant la saisie, avec un délai
// pour ne pas appeler l'API à chaque touche.
let liveConvertTimer = null;

function liveConvert() {
  clearTimeout(liveConvertTimer);

  liveConvertTimer = setTimeout(() => {
    if (amountInput.value !== "") {
      convertCurrency(false);
    }
  }, 500);
}

amountInput.addEventListener("input", liveConvert);

fromCurrency.addEventListener("change", () => {
  saveSelectedCurrencies();
  liveConvert();
});

toCurrency.addEventListener("change", () => {
  saveSelectedCurrencies();
  liveConvert();
});

swapBtn.addEventListener("click", () => {
  const oldFrom = fromCurrency.value;

  // On réaffiche toutes les options pour que les deux valeurs existent
  // même si une recherche avait filtré les listes.
  fromSearch.value = "";
  toSearch.value = "";
  displayOptions(fromCurrency, allCurrencies);
  displayOptions(toCurrency, allCurrencies);

  fromCurrency.value = toCurrency.value;
  toCurrency.value = oldFrom;

  saveSelectedCurrencies();

  if (amountInput.value !== "") {
    convertCurrency();
  }
});

clearHistoryBtn.addEventListener("click", () => {
  history = [];
  saveHistory();
  displayHistory();
});

historyList.addEventListener("click", (event) => {
  const deleteBtn = event.target.closest(".deleteHistoryBtn");

  if (deleteBtn) {
    history.splice(deleteBtn.dataset.index, 1);
    saveHistory();
    displayHistory();
    return;
  }

  // Cliquer sur une entrée relance la conversion correspondante.
  const item = event.target.closest(".history-item");

  if (item) {
    const entry = history[item.dataset.index];

    if (entry && entry.from && allCurrencies.length > 0) {
      fromSearch.value = "";
      toSearch.value = "";
      displayOptions(fromCurrency, allCurrencies);
      displayOptions(toCurrency, allCurrencies);

      amountInput.value = entry.amount;
      fromCurrency.value = entry.from;
      toCurrency.value = entry.to;

      saveSelectedCurrencies();
      convertCurrency(false);
    }
  }
});

if (localStorage.getItem("theme") === "dark") {
  document.body.classList.add("dark-mode");
  themeBtn.textContent = "☀️";
}

themeBtn.addEventListener("click", () => {
  document.body.classList.toggle("dark-mode");

  const isDark = document.body.classList.contains("dark-mode");

  themeBtn.textContent = isDark ? "☀️" : "🌙";
  localStorage.setItem("theme", isDark ? "dark" : "light");
});

copyBtn.addEventListener("click", async () => {
  if (result.textContent === "") return;

  try {
    await navigator.clipboard.writeText(result.textContent);

    copyBtn.textContent = "✅ Copié !";

    setTimeout(() => {
      copyBtn.textContent = "📋 Copier";
    }, 2000);
  } catch (error) {
    console.log(error);
  }
});

resetBtn.addEventListener("click", () => {
  amountInput.value = "";
  result.textContent = "";
  rateInfo.textContent = "";
  fromSearch.value = "";
  toSearch.value = "";

  loader.classList.add("hidden");
  resultCard.classList.add("hidden");
  popularSection.classList.add("hidden");
  chartSection.classList.add("hidden");

  displayOptions(fromCurrency, allCurrencies);
  displayOptions(toCurrency, allCurrencies);

  fromCurrency.value = "EUR";
  toCurrency.value = "USD";

  saveSelectedCurrencies();
});

function filterCurrencies(searchValue) {
  const value = searchValue.toLowerCase();

  return allCurrencies.filter(
    (currency) =>
      currency.code.toLowerCase().includes(value) ||
      currency.name.toLowerCase().includes(value)
  );
}

fromSearch.addEventListener("input", () => {
  displayOptions(fromCurrency, filterCurrencies(fromSearch.value));
});

toSearch.addEventListener("input", () => {
  displayOptions(toCurrency, filterCurrencies(toSearch.value));
});
