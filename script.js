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
    rateInfo.textContent = `Taux : 1 ${from} = ${rate.toFixed(4)} ${to}`;
    const convertedAmount = amount * rate;
    const conversionText = `${amount} ${from} = ${convertedAmount.toFixed(2)} ${to}`;

    result.textContent = conversionText;
    loader.classList.add("hidden");

    if (saveToHistory) {
        history.push(conversionText);
        saveHistory();
        displayHistory();
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