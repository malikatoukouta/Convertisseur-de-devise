const amountInput = document.querySelector("#amount");
const fromCurrency = document.querySelector("#fromCurrency");
const toCurrency = document.querySelector("#toCurrency");
const convertBtn = document.querySelector("#convertBtn");
const result = document.querySelector("#result");
const swapBtn = document.querySelector("#swapBtn");
const historyList = document.querySelector("#historyList");
const clearHistoryBtn = document.querySelector("#clearHistoryBtn");
const rateInfo = document.querySelector("#rateInfo");
const themeBtn = document.querySelector("#themeBtn");
const loader = document.querySelector("#loader");
const copyBtn = document.querySelector("#copyBtn");
const resetBtn = document.querySelector("#resetBtn");
const fromSearch = document.querySelector("#fromSearch");
const toSearch = document.querySelector("#toSearch");
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
  XOF: "Franc CFA BCEAO"
};

let history = JSON.parse(localStorage.getItem("history")) || [];

function saveHistory() {
    localStorage.setItem("history", JSON.stringify(history));
}

function saveSelectedCurrencies() {
    localStorage.setItem("fromCurrency", fromCurrency.value);
    localStorage.setItem("toCurrency", toCurrency.value);
}

function displayOptions(selectElement, currencies) {
  selectElement.innerHTML = "";

  currencies.forEach((currency) => {

    const label =
      currency.name === currency.code
        ? currency.code
        : `${currency.code} - ${currency.name}`;

    selectElement.innerHTML += `
      <option value="${currency.code}">
        ${label}
      </option>
    `;
  });
}

let allCurrencies = [];

async function loadCurrencies() {
  try {

    const ratesResponse = await fetch(
      "https://api.frankfurter.dev/v2/rates"
    );

    const ratesData = await ratesResponse.json();

    const availableCurrencies = [
      ratesData[0].base,
      ...ratesData.map((item) => item.quote)
    ];

    if (!availableCurrencies.includes("XOF")) {
        availableCurrencies.push("XOF");
    }

    const currenciesResponse = await fetch(
      "https://api.frankfurter.dev/v2/currencies"
    );

    const currenciesData = await currenciesResponse.json();

    allCurrencies = availableCurrencies.map((code) => {
        let currencyName = currenciesData[code];

        if (typeof currencyName === "object") {
            currencyName = currencyName.name;
        }

        return {
            code: code,
            name: currencyNames[code] || code
        };
    });

    displayOptions(fromCurrency, allCurrencies);
    displayOptions(toCurrency, allCurrencies);

    fromCurrency.value =
      localStorage.getItem("fromCurrency") || "EUR";

    toCurrency.value =
      localStorage.getItem("toCurrency") || "USD";

  } catch (error) {
    console.log(error);
    result.textContent = "Impossible de charger les devises.";
  }
}

async function convertCurrency(saveToHistory = true) {
  const amount = Number(amountInput.value);
  const from = fromCurrency.value;
  const to = toCurrency.value;

  if (!amount || amount <= 0) {
    result.textContent = "Veuillez entrer un montant valide.";
    return;
  }

  if (from === to) {
    result.textContent = `${amount} ${from} = ${amount} ${to}`;
    rateInfo.textContent = `Taux : 1 ${from} = 1 ${to}`;
    return;
  }

  try {
    loader.classList.remove("hidden");
    result.textContent = "";

    const response = await fetch(
      `https://api.frankfurter.dev/v2/rates?base=${from}&quotes=${to}`
    );

    const data = await response.json();

    const rate = data[0].rate;
    const rateDate = data[0].date;
    rateInfo.textContent = `Taux : 1 ${from} = ${rate.toFixed(4)} ${to} - date : ${rateDate}`;
    const convertedAmount = amount * rate;
    const conversionText = `${amount} ${from} = ${convertedAmount.toFixed(2)} ${to}`;

    result.textContent = conversionText;
    loader.classList.add("hidden");

    if (saveToHistory) {
        if (!history.includes(conversionText)) {
            history.push(conversionText);
            saveHistory();
            displayHistory();
        }
    }

  } catch (error) {
    console.log(error);
    loader.classList.add("hidden");
    result.textContent = "Impossible de convertir pour le moment.";
  }
}

function displayHistory() {
  historyList.innerHTML = history.map((conversion, index) => `
    <li>
    ${conversion}
    <button class="deleteHistoryBtn" data-index="${index}">
    ❌
    </button>
    </li>
  `).join("");
}

loadCurrencies();
displayHistory();

convertBtn.addEventListener("click", convertCurrency);

amountInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    convertCurrency();
  }
});

swapBtn.addEventListener("click", () => {
  const oldFrom = fromCurrency.value;

  fromCurrency.value = toCurrency.value;
  toCurrency.value = oldFrom;

  saveSelectedCurrencies();
  convertCurrency();
});

clearHistoryBtn.addEventListener("click", () => {
    history = [];
    saveHistory();
    displayHistory();
});

historyList.addEventListener("click", (event) => {
    if (event.target.classList.contains("deleteHistoryBtn")) {
        const index = event.target.dataset.index;

        history.splice(index, 1);

        saveHistory();
        displayHistory();
    }
});

amountInput.addEventListener("input", () => {
    if (amountInput.value !== "") {
        convertCurrency(false);
    }
});

fromCurrency.addEventListener("change", () => {
    saveSelectedCurrencies();

    if (amountInput.value !== "") {
        convertCurrency(false);
    }
});

toCurrency.addEventListener("change", () => {
    saveSelectedCurrencies();

    if (amountInput.value !== "") {
        convertCurrency(false);
    }
});

if(localStorage.getItem("theme") === "dark") {
    document.body.classList.add("dark-mode");
}

themeBtn.addEventListener("click", () => {
    
    document.body.classList.toggle("dark-mode");

    if(document.body.classList.contains("dark-mode")) {
        localStorage.setItem("theme", "dark");
    } else {
        localStorage.setItem("theme", "light");
    }
});

copyBtn.addEventListener("click", async () => {

    if(result.textContent === "") return;

    try {
        
        await navigator.clipboard.writeText(
            result.textContent
        );

        copyBtn.textContent = "✅ Copié !";

        setTimeout(() => {
            copyBtn.textContent = "Copier";
        }, 2000);

    } catch (error) {
        console.log(error);
    }
});

resetBtn.addEventListener("click", () => {
    amountInput.value = "";
    result.textContent = "";
    rateInfo.textContent = "";
    loader.classList.add("hidden");

    fromCurrency.value = "EUR";
    toCurrency.value = "USD";

    saveSelectedCurrencies();
});

fromSearch.addEventListener("input", () => {
    const searchValue = fromSearch.value.toLowerCase();

    const filteredCurrencies = allCurrencies.filter((currency) => {
        return (
            currency.code.toLowerCase().includes(searchValue) ||
            currency.name.toLowerCase().includes(searchValue)
        );
    });

    displayOptions(fromCurrency, filteredCurrencies);
});

toSearch.addEventListener("input", () => {
    const searchValue = toSearch.value.toLowerCase();

    const filteredCurrencies = allCurrencies.filter((currency) => {
        return (
            currency.code.toLowerCase().includes(searchValue) ||
            currency.name.toLowerCase().includes(searchValue)
        );
    });

    displayOptions(toCurrency, filteredCurrencies);
});