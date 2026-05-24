const amountInput = document.querySelector("#amount");
const fromCurrency = document.querySelector("#fromCurrency");
const toCurrency = document.querySelector("#toCurrency");
const convertBtn = document.querySelector("#convertBtn");
const result = document.querySelector("#result");
const swapBtn = document.querySelector("#swapBtn");
const historyList = document.querySelector("#historyList");
const clearHistoryBtn = document.querySelector("#clearHistoryBtn");

let history = JSON.parse(localStorage.getItem("history")) || [];

function saveHistory() {
    localStorage.setItem("history", JSON.stringify(history));
}

async function loadCurrencies() {
  try {
    const response = await fetch("https://api.frankfurter.dev/v2/rates");
    const data = await response.json();

    const currencies = [
      data[0].base,
      ...data.map((item) => item.quote)
    ];

    currencies.sort();

    currencies.forEach((currency) => {
      fromCurrency.innerHTML += `
        <option value="${currency}">${currency}</option>
      `;

      toCurrency.innerHTML += `
        <option value="${currency}">${currency}</option>
      `;
    });

    fromCurrency.value = "EUR";
    toCurrency.value = "USD";

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
    return;
  }

  try {
    result.textContent = "Conversion en cours...";

    const response = await fetch(
      `https://api.frankfurter.dev/v2/rates?base=${from}&quotes=${to}`
    );

    const data = await response.json();

    const rate = data[0].rate;
    const convertedAmount = amount * rate;
    const conversionText = `${amount} ${from} = ${convertedAmount.toFixed(2)} ${to}`;

    result.textContent = conversionText;

    if (saveToHistory) {
        history.push(conversionText);
        saveHistory();
        displayHistory();
    }

  } catch (error) {
    console.log(error);
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
    if (amountInput.value !== "") {
        convertCurrency(false);
    }
});

toCurrency.addEventListener("change", () => {
    if (amountInput.value !== "") {
        convertCurrency(false);
    }
});