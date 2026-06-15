"use strict";

const TEXT = {
  notSet: "Nesetat",
  unavailable: "Indisponibil\u0103",
  available: "Disponibil\u0103",
  onlyPublic:
    "Ai introdus doar cheia public\u0103 N. Po\u021Bi cripta mesaje, dar pentru decriptare este necesar trapdoor-ul, adic\u0103 factorizarea lui N.",
  publicFactorFound:
    "Am factorizat N pentru acest exemplu didactic. Decriptarea devine disponibil\u0103 deoarece p \u0219i q au fost recuperate.",
  publicFactorFoundButInvalid:
    "Am g\u0103sit o factorizare pentru N, dar factorii nu respect\u0103 toate condi\u021Biile metodei de decriptare alese.",
  publicFactorNotFound:
    "Aplica\u021Bia a \u00EEncercat factorizarea lui N prin c\u0103utare didactic\u0103, dar nu a g\u0103sit rapid factorii. Po\u021Bi cripta, iar pentru decriptare este necesar trapdoor-ul.",
  trapdoorReady:
    "Cunosc\u00E2nd p \u0219i q, putem decripta prin calculul r\u0103d\u0103cinilor p\u0103trate modulo p \u0219i modulo q.",
  setFirst: "Seteaz\u0103 mai \u00EEnt\u00E2i datele ini\u021Biale.",
  nTooSmall:
    "N este prea mic pentru criptarea textului. Alege p \u0219i q mai mari, astfel \u00EEnc\u00E2t N > 126.",
  initialResult:
    "Seteaz\u0103 datele ini\u021Biale \u0219i ruleaz\u0103 o ac\u021Biune pentru a vedea rezultatele."
};

const DECRYPTION_MODES = {
  simple: {
    label: "Mod simplu: p,q \u2261 3 mod 4",
    shortLabel: "Mod simplu",
    explanation:
      "Acest mod este folosit \u00EEn lucrare pentru c\u0103 permite formula simpl\u0103 r = c^((p+1)/4) mod p.",
    resultExplanation:
      "Mod simplu: r = c^((p+1)/4) mod p, valabil pentru p \u2261 3 mod 4."
  },
  general: {
    label: "Mod general: orice prime impare",
    shortLabel: "Mod general",
    explanation:
      "Acest mod folose\u0219te algoritmul Tonelli-Shanks \u0219i permite folosirea oric\u0103ror prime impare distincte.",
    resultExplanation:
      "Mod general: r\u0103d\u0103cinile p\u0103trate sunt calculate cu algoritmul Tonelli-Shanks."
  }
};

const FACTORIZATION_SEARCH_LIMIT = 200000n;

const ACTIONS = {
  encryptNumber: {
    label: "Mesaj numeric m",
    help: "Introdu un num\u0103r m cu 0 <= m < N.",
    hint: "Cripteaz\u0103 un bloc numeric prin formula c = m^2 mod N."
  },
  decryptNumber: {
    label: "Criptotext numeric c",
    help: "Introdu criptotextul c pentru care vrei r\u0103d\u0103cinile modulo N.",
    hint: "Folose\u0219te trapdoor-ul (p, q) \u0219i metoda de decriptare selectat\u0103."
  },
  encryptText: {
    label: "Text de criptat",
    help: "Introdu textul normal, de exemplu: rabin. Conversia numeric\u0103 se face automat \u00EEn aplica\u021Bie.",
    hint: "Scrii textul direct, iar aplica\u021Bia genereaz\u0103 automat lista de criptotexte."
  },
  decryptText: {
    label: "List\u0103 de criptotexte",
    help: "Introdu criptotextele separate prin virgul\u0103, de exemplu: 25, 36, 49.",
    hint: "Pentru fiecare bloc, aplica\u021Bia p\u0103streaz\u0103 doar candida\u021Bii text printabili."
  }
};

const state = {
  N: null,
  p: null,
  q: null,
  hasTrapdoor: false,
  factorization: null,
  rootMode: "simple"
};

const ui = {
  keyModeRadios: [...document.querySelectorAll("input[name='key-mode']")],
  rootModeRadios: [...document.querySelectorAll("input[name='root-mode']")],
  publicFields: document.getElementById("public-fields"),
  trapdoorFields: document.getElementById("trapdoor-fields"),
  publicN: document.getElementById("public-n"),
  secretP: document.getElementById("secret-p"),
  secretQ: document.getElementById("secret-q"),
  rootModeExplanation: document.getElementById("root-mode-explanation"),
  setData: document.getElementById("set-data"),
  setupFeedback: document.getElementById("setup-feedback"),
  currentN: document.getElementById("current-n"),
  currentRootMode: document.getElementById("current-root-mode"),
  currentFactorization: document.getElementById("current-factorization"),
  currentFactorizationWrapper: document.getElementById("current-factorization-wrapper"),
  currentPq: document.getElementById("current-pq"),
  currentPqWrapper: document.getElementById("current-pq-wrapper"),
  decryptStatus: document.getElementById("decrypt-status"),
  actionSelect: document.getElementById("action-select"),
  actionHint: document.getElementById("action-hint"),
  inputHelp: document.getElementById("input-help"),
  inputLabel: document.getElementById("input-label"),
  actionInput: document.getElementById("action-input"),
  runAction: document.getElementById("run-action"),
  results: document.getElementById("results")
};

init();

function init() {
  ui.keyModeRadios.forEach((radio) => radio.addEventListener("change", updateKeyModeFields));
  ui.rootModeRadios.forEach((radio) => radio.addEventListener("change", handleRootModeChange));
  ui.setData.addEventListener("click", handleSetData);
  ui.actionSelect.addEventListener("change", updateActionForm);
  ui.runAction.addEventListener("click", handleRunAction);

  updateKeyModeFields();
  updateRootModeExplanation();
  renderCurrentData();
  updateActionAvailability();
  updateActionForm();
}

function updateKeyModeFields() {
  const mode = getSelectedKeyMode();
  ui.publicFields.hidden = mode !== "public";
  ui.trapdoorFields.hidden = mode !== "trapdoor";
  clearFeedback();
}

function handleRootModeChange() {
  state.rootMode = getSelectedRootMode();
  updateRootModeExplanation();
  reevaluateCurrentTrapdoor();
  renderCurrentData();
  updateActionAvailability();
  updateActionForm();

  if (state.N !== null && state.factorization !== null) {
    renderSetDataResult();
  }
}

function updateRootModeExplanation() {
  const mode = getSelectedRootMode();
  state.rootMode = mode;
  ui.rootModeExplanation.textContent = DECRYPTION_MODES[mode].explanation;
}

function handleSetData() {
  try {
    const keyMode = getSelectedKeyMode();
    state.rootMode = getSelectedRootMode();

    if (keyMode === "public") {
      const N = parseBigIntField(ui.publicN.value, "N");
      if (N <= 1n) {
        throw new Error("N trebuie s\u0103 fie un num\u0103r \u00EEntreg mai mare dec\u00E2t 1.");
      }

      state.N = N;
      state.p = null;
      state.q = null;
      state.hasTrapdoor = false;
      state.factorization = factorizeN(N);

      if (state.factorization.status === "found") {
        state.p = state.factorization.p;
        state.q = state.factorization.q;
        state.hasTrapdoor = isUsableTrapdoor(state.p, state.q, state.rootMode);

        if (state.hasTrapdoor) {
          setFeedback(TEXT.publicFactorFound, "success");
        } else {
          setFeedback(`${TEXT.publicFactorFoundButInvalid} ${getTrapdoorValidationError(state.p, state.q, state.rootMode)}`, "info");
        }
      } else {
        setFeedback(TEXT.publicFactorNotFound, "info");
      }
    } else {
      const p = parseBigIntField(ui.secretP.value, "p");
      const q = parseBigIntField(ui.secretQ.value, "q");
      validateTrapdoor(p, q, state.rootMode);

      state.p = p;
      state.q = q;
      state.N = p * q;
      state.hasTrapdoor = true;
      state.factorization = { status: "known", p, q };
      setFeedback(TEXT.trapdoorReady, "success");
    }

    renderCurrentData();
    updateActionAvailability();
    updateActionForm();
    renderSetDataResult();
  } catch (error) {
    setFeedback(error.message, "error");
  }
}

function validateTrapdoor(p, q, mode) {
  const error = getTrapdoorValidationError(p, q, mode);
  if (error) {
    throw new Error(error);
  }
}

function getTrapdoorValidationError(p, q, mode) {
  if (p <= 1n || q <= 1n) {
    return "p \u0219i q trebuie s\u0103 fie numere \u00EEntregi mai mari dec\u00E2t 1.";
  }

  if (!isPrime(p) || !isPrime(q)) {
    return "p \u0219i q trebuie s\u0103 fie prime.";
  }

  if (p === q) {
    return "p \u0219i q trebuie s\u0103 fie distincte.";
  }

  if (mode === "simple" && (p % 4n !== 3n || q % 4n !== 3n)) {
    return "\u00CEn modul simplu, p \u0219i q trebuie s\u0103 fie congruente cu 3 mod 4.";
  }

  if (mode === "general" && (p % 2n === 0n || q % 2n === 0n)) {
    return "\u00CEn modul general, p \u0219i q trebuie s\u0103 fie prime impare distincte.";
  }

  return "";
}

function isUsableTrapdoor(p, q, mode) {
  return getTrapdoorValidationError(p, q, mode) === "";
}

function isRabinTrapdoor(p, q) {
  return isUsableTrapdoor(p, q, "simple");
}

function reevaluateCurrentTrapdoor() {
  if (state.p === null || state.q === null) {
    state.hasTrapdoor = false;
    return;
  }

  state.hasTrapdoor = isUsableTrapdoor(state.p, state.q, state.rootMode);
}

// Cautare prin divizori succesivi: simpla si usor de explicat, dar doar didactica.
function factorizeN(N) {
  if (N === 2n) {
    return { status: "prime" };
  }

  if (N % 2n === 0n) {
    return { status: "found", p: 2n, q: N / 2n };
  }

  let divisor = 3n;
  let checks = 0n;

  while (divisor * divisor <= N && checks < FACTORIZATION_SEARCH_LIMIT) {
    if (N % divisor === 0n) {
      return { status: "found", p: divisor, q: N / divisor };
    }

    divisor += 2n;
    checks += 1n;
  }

  if (divisor * divisor > N) {
    return { status: "prime" };
  }

  return { status: "limit", checkedDivisors: checks };
}

function formatFactorizationSummary(factorization) {
  if (!factorization) {
    return TEXT.notSet;
  }

  if (factorization.status === "known" || factorization.status === "found") {
    return `N = ${factorization.p} \u00B7 ${factorization.q}`;
  }

  if (factorization.status === "prime") {
    return "Nu s-a g\u0103sit factorizare; N pare prim.";
  }

  return "Factorizare neg\u0103sit\u0103 rapid; c\u0103utarea didactic\u0103 a fost oprit\u0103.";
}

function renderCurrentData() {
  ui.currentN.textContent = state.N === null ? TEXT.notSet : state.N.toString();
  ui.currentRootMode.textContent = DECRYPTION_MODES[state.rootMode].shortLabel;
  ui.currentFactorizationWrapper.hidden = state.N === null;
  ui.currentFactorization.textContent = formatFactorizationSummary(state.factorization);
  ui.currentPqWrapper.hidden = state.p === null || state.q === null;
  ui.currentPq.textContent = state.p !== null && state.q !== null ? `p = ${state.p}, q = ${state.q}` : TEXT.notSet;
  ui.decryptStatus.textContent = state.hasTrapdoor
    ? `${TEXT.available} (${DECRYPTION_MODES[state.rootMode].shortLabel})`
    : TEXT.unavailable;
}

function updateActionAvailability() {
  const hasN = state.N !== null;
  ui.actionSelect.disabled = !hasN;
  ui.actionInput.disabled = !hasN;
  ui.runAction.disabled = !hasN;

  [...ui.actionSelect.options].forEach((option) => {
    const requiresTrapdoor = option.dataset.requiresTrapdoor === "true";
    option.disabled = requiresTrapdoor && !state.hasTrapdoor;
  });

  if (ui.actionSelect.selectedOptions[0]?.disabled) {
    ui.actionSelect.value = "encryptNumber";
  }
}

function updateActionForm() {
  const action = ACTIONS[ui.actionSelect.value] || ACTIONS.encryptNumber;
  ui.inputLabel.textContent = action.label;
  ui.inputHelp.textContent = state.N === null ? "Zona de input se activeaz\u0103 dup\u0103 setarea datelor." : action.help;
  ui.actionHint.textContent = state.N === null ? TEXT.setFirst : action.hint;
  ui.actionInput.placeholder = getPlaceholder(ui.actionSelect.value);
}

function handleRunAction() {
  if (state.N === null) {
    renderError(TEXT.setFirst);
    return;
  }

  try {
    const action = ui.actionSelect.value;
    const rawInput = ui.actionInput.value.trim();

    if (action === "encryptNumber") {
      renderEncryptNumber(rawInput);
    } else if (action === "decryptNumber") {
      requireTrapdoor();
      renderDecryptNumber(rawInput);
    } else if (action === "encryptText") {
      renderEncryptText(ui.actionInput.value);
    } else if (action === "decryptText") {
      requireTrapdoor();
      renderDecryptText(rawInput);
    }
  } catch (error) {
    renderError(error.message);
  }
}

function renderEncryptNumber(rawInput) {
  const m = parseBigIntField(rawInput, "m");
  ensureInRange(m, state.N, "m");
  const c = rabinEncryptNumber(m, state.N);

  renderCards([
    {
      title: "Criptare num\u0103r",
      meta: [`N = ${state.N}`],
      body: `
        <p>Mesaj numeric m: <code>${m}</code></p>
        <p>Criptotext c: <code>${c}</code></p>
        <div class="formula-line">c = m<sup>2</sup> mod N = ${m}<sup>2</sup> mod ${state.N} = <strong>${c}</strong></div>
      `
    }
  ]);
}

function renderSetDataResult() {
  if (state.N === null || state.factorization === null) {
    renderEmptyResult("Datele au fost setate. Alege o ac\u021Biune \u0219i introdu mesajul sau criptotextul.");
    return;
  }

  renderCards([
    {
      title: "Factorizarea lui N",
      meta: [
        `N = ${state.N}`,
        DECRYPTION_MODES[state.rootMode].shortLabel,
        state.hasTrapdoor ? "Decriptare disponibil\u0103" : "Decriptarea necesit\u0103 p \u0219i q valizi"
      ],
      secret: state.hasTrapdoor,
      body: buildFactorizationBody(state.factorization)
    }
  ]);
}

function buildFactorizationBody(factorization) {
  if (factorization.status === "known" || factorization.status === "found") {
    const error = getTrapdoorValidationError(factorization.p, factorization.q, state.rootMode);
    const note = error
      ? `Factorii sunt afi\u0219a\u021Bi, dar metoda curent\u0103 nu poate decripta cu ei: ${error}`
      : "Factorii respect\u0103 toate condi\u021Biile metodei selectate, deci pot fi folosi\u021Bi ca trapdoor.";

    return `
      <p>Factorizare: <code>${state.N} = ${factorization.p} &middot; ${factorization.q}</code></p>
      <div class="formula-line">Trapdoor-ul este perechea <strong>(p, q) = (${factorization.p}, ${factorization.q})</strong>.</div>
      <p>Metoda aleas\u0103: <code>${escapeHtml(DECRYPTION_MODES[state.rootMode].label)}</code></p>
      <p>${escapeHtml(note)}</p>
      <div class="warning">Factorizarea automat\u0103 este o c\u0103utare simpl\u0103, potrivit\u0103 doar pentru numere mici folosite \u00EEn scop didactic.</div>
    `;
  }

  if (factorization.status === "prime") {
    return `
      <p>Nu a fost g\u0103sit un divizor: <code>N = ${state.N}</code> pare prim \u00EEn aceast\u0103 verificare.</p>
      <div class="warning">Pentru criptosistemul Rabin, N trebuie s\u0103 fie produsul a dou\u0103 numere prime distincte. Decriptarea necesit\u0103 p \u0219i q.</div>
    `;
  }

  return `
    <p>Nu s-au g\u0103sit factorii lui <code>N = ${state.N}</code> \u00EEn limita de c\u0103utare didactic\u0103.</p>
    <div class="warning">Pentru valori mari, factorizarea lui N este dificil\u0103. De aceea, f\u0103r\u0103 trapdoor-ul (p, q), decriptarea nu este eficient\u0103.</div>
  `;
}

function renderDecryptNumber(rawInput) {
  const c = parseBigIntField(rawInput, "c");
  ensureInRange(c, state.N, "c");
  const result = rabinDecryptNumber(c, state.p, state.q, state.rootMode);
  const invalidRoots = result.roots.filter((root) => rabinEncryptNumber(root, state.N) !== result.c);
  const warning = invalidRoots.length
    ? `<div class="warning">Criptotextul introdus nu pare s\u0103 provin\u0103 dintr-o criptare Rabin valid\u0103 pentru acest N.</div>`
    : "";

  renderCards([
    {
      title: "Decriptare num\u0103r",
      meta: [`N = ${state.N}`, `p = ${state.p}, q = ${state.q}`, DECRYPTION_MODES[state.rootMode].shortLabel],
      secret: true,
      body: `
        <p>Criptotext c: <code>${result.c}</code></p>
        <div class="formula-line">${escapeHtml(DECRYPTION_MODES[state.rootMode].resultExplanation)}</div>
        <p>R\u0103d\u0103cinile modulo p: ${formatInlineBigInts(result.rootsP)}</p>
        <p>R\u0103d\u0103cinile modulo q: ${formatInlineBigInts(result.rootsQ)}</p>
        <p>Cele patru solu\u021Bii modulo N:</p>
        <div class="candidate-grid">${formatCandidates(result.roots)}</div>
        <p>Mesajul ini\u021Bial este unul dintre ace\u0219ti candida\u021Bi modulo N.</p>
        ${warning}
      `
    }
  ]);
}

function renderEncryptText(text) {
  if (text.length === 0) {
    throw new Error("Introdu un text pentru criptare.");
  }

  const result = encryptText(text, state.N);

  renderCards([
    {
      title: "Criptare text",
      meta: [`N = ${state.N}`, `${result.ascii.length} caractere`],
      body: `
        <p>Text introdus: <code>${escapeHtml(text)}</code></p>
        <p>Codul ASCII pentru fiecare caracter: ${formatTextAsciiPairs(text, result.ascii)}</p>
        <div class="formula-line">Formula: c<sub>i</sub> = m<sub>i</sub><sup>2</sup> mod N.</div>
        <p>Criptotext generat automat: <code>${result.cipher.join(", ")}</code></p>
      `
    }
  ]);
}

function renderDecryptText(rawInput) {
  const cipherArray = parseCipherList(rawInput);
  const result = decryptText(cipherArray, state.p, state.q, state.rootMode);
  const rows = result.blocks
    .map((block, index) => {
      const candidates = block.printableCandidates.length
        ? block.printableCandidates.map(formatAsciiCandidate).join(", ")
        : "?";

      return `
        <tr>
          <td><code>${index + 1}</code></td>
          <td><code>${block.cipher}</code></td>
          <td>${block.roots.map((root) => `<code>${root}</code>`).join(" ")}</td>
          <td>${candidates}</td>
          <td>${formatChoice(block.printableCandidates)}</td>
        </tr>
      `;
    })
    .join("");

  renderCards([
    {
      title: "Decriptare text",
      meta: [`N = ${state.N}`, `p = ${state.p}, q = ${state.q}`, DECRYPTION_MODES[state.rootMode].shortLabel],
      secret: true,
      body: `
        <div class="formula-line">${escapeHtml(DECRYPTION_MODES[state.rootMode].resultExplanation)}</div>
        <p>Text reconstruit aproximativ: <code>${escapeHtml(result.approximateText)}</code></p>
        <div class="result-table-wrap">
          <table class="result-table">
            <thead>
              <tr>
                <th>Bloc</th>
                <th>Criptotext</th>
                <th>R\u0103d\u0103cinile modulo N</th>
                <th>Candida\u021Bi text printabili</th>
                <th>Caracter ales / ambiguitate</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      `
    }
  ]);
}

function requireTrapdoor() {
  if (!state.hasTrapdoor) {
    throw new Error("Pentru decriptare este necesar trapdoor-ul, adic\u0103 p \u0219i q valida\u021Bi pentru metoda aleas\u0103.");
  }
}

function getSelectedKeyMode() {
  return ui.keyModeRadios.find((radio) => radio.checked)?.value || "public";
}

function getSelectedRootMode() {
  return ui.rootModeRadios.find((radio) => radio.checked)?.value || "simple";
}

function getPlaceholder(action) {
  if (action === "encryptNumber") return "Exemplu: 20";
  if (action === "decryptNumber") return "Exemplu: 15";
  if (action === "encryptText") return "Exemplu: Rabin";
  return "Exemplu: 25, 36, 49";
}

function parseBigIntField(value, label) {
  const cleaned = value.trim();
  if (!/^\d+$/.test(cleaned)) {
    throw new Error(`${label} trebuie s\u0103 fie un num\u0103r \u00EEntreg pozitiv.`);
  }
  return BigInt(cleaned);
}

function parseCipherList(value) {
  if (!value.trim()) {
    throw new Error("Introdu cel pu\u021Bin un criptotext.");
  }

  return value
    .split(/[,\s;]+/)
    .filter(Boolean)
    .map((part, index) => parseBigIntField(part, `c_${index + 1}`));
}

function ensureInRange(value, N, label) {
  if (value < 0n || value >= N) {
    throw new Error(`${label} trebuie s\u0103 respecte 0 <= ${label} < N.`);
  }
}

// Test Miller-Rabin pentru primalitate cu BigInt.
function isPrime(n) {
  if (n < 2n) return false;

  const smallPrimes = [2n, 3n, 5n, 7n, 11n, 13n, 17n, 19n, 23n, 29n, 31n, 37n];
  for (const prime of smallPrimes) {
    if (n === prime) return true;
    if (n % prime === 0n) return false;
  }

  let d = n - 1n;
  let s = 0n;
  while (d % 2n === 0n) {
    d /= 2n;
    s += 1n;
  }

  for (const base of smallPrimes) {
    const a = base % n;
    if (a === 0n) continue;
    let x = modPow(a, d, n);
    if (x === 1n || x === n - 1n) continue;

    let composite = true;
    for (let r = 1n; r < s; r += 1n) {
      x = (x * x) % n;
      if (x === n - 1n) {
        composite = false;
        break;
      }
    }

    if (composite) return false;
  }

  return true;
}

function gcd(a, b) {
  a = absBigInt(a);
  b = absBigInt(b);
  while (b !== 0n) {
    const temp = b;
    b = a % b;
    a = temp;
  }
  return a;
}

function egcd(a, b) {
  let oldR = a;
  let r = b;
  let oldS = 1n;
  let s = 0n;
  let oldT = 0n;
  let t = 1n;

  while (r !== 0n) {
    const quotient = oldR / r;
    [oldR, r] = [r, oldR - quotient * r];
    [oldS, s] = [s, oldS - quotient * s];
    [oldT, t] = [t, oldT - quotient * t];
  }

  return { gcd: oldR, x: oldS, y: oldT };
}

function modInv(a, mod) {
  const result = egcd(positiveMod(a, mod), mod);
  if (result.gcd !== 1n) {
    throw new Error("Inversul modular nu exist\u0103 pentru aceste valori.");
  }
  return positiveMod(result.x, mod);
}

function modPow(base, exponent, mod) {
  if (mod <= 0n) {
    throw new Error("Modulul trebuie s\u0103 fie pozitiv.");
  }

  let result = 1n;
  let current = positiveMod(base, mod);
  let exp = exponent;

  while (exp > 0n) {
    if (exp % 2n === 1n) {
      result = (result * current) % mod;
    }
    current = (current * current) % mod;
    exp /= 2n;
  }

  return result;
}

function legendreSymbol(a, p) {
  const normalizedA = positiveMod(a, p);
  if (normalizedA === 0n) {
    return 0n;
  }

  const value = modPow(normalizedA, (p - 1n) / 2n, p);
  return value === p - 1n ? -1n : value;
}

function modularSqrt(a, p) {
  const normalizedA = positiveMod(a, p);

  if (p === 2n) {
    return [normalizedA];
  }

  if (normalizedA === 0n) {
    return [0n];
  }

  if (legendreSymbol(normalizedA, p) !== 1n) {
    return [];
  }

  if (p % 4n === 3n) {
    const r = modPow(normalizedA, (p + 1n) / 4n, p);
    return uniqueBigInts([r, positiveMod(-r, p)]).sort(compareBigInts);
  }

  // Tonelli-Shanks: scriem p - 1 = q * 2^s, cu q impar.
  let q = p - 1n;
  let s = 0n;
  while (q % 2n === 0n) {
    q /= 2n;
    s += 1n;
  }

  // Alegem primul nereziduu patratic modulo p.
  let z = 2n;
  while (legendreSymbol(z, p) !== -1n) {
    z += 1n;
  }

  let m = s;
  let c = modPow(z, q, p);
  let t = modPow(normalizedA, q, p);
  let r = modPow(normalizedA, (q + 1n) / 2n, p);

  while (t !== 1n) {
    let i = 1n;
    let tPower = (t * t) % p;

    while (tPower !== 1n && i < m) {
      tPower = (tPower * tPower) % p;
      i += 1n;
    }

    if (i === m) {
      return [];
    }

    const exponent = 2n ** (m - i - 1n);
    const b = modPow(c, exponent, p);
    m = i;
    c = (b * b) % p;
    t = (t * c) % p;
    r = (r * b) % p;
  }

  return uniqueBigInts([r, positiveMod(-r, p)]).sort(compareBigInts);
}

function crtPair(a, p, b, q) {
  const N = p * q;
  const qInv = modInv(q, p);
  const pInv = modInv(p, q);
  return positiveMod(a * q * qInv + b * p * pInv, N);
}

function getSquareRootsModuloPrime(c, prime, mode) {
  const residue = positiveMod(c, prime);

  if (residue === 0n) {
    return [0n];
  }

  if (mode === "simple") {
    if (prime % 4n !== 3n) {
      return [];
    }

    const r = modPow(residue, (prime + 1n) / 4n, prime);
    if ((r * r) % prime !== residue) {
      return [];
    }

    return uniqueBigInts([r, positiveMod(-r, prime)]).sort(compareBigInts);
  }

  return modularSqrt(residue, prime);
}

function rabinEncryptNumber(m, N) {
  return positiveMod(m * m, N);
}

function rabinDecryptNumber(c, p, q, mode) {
  const N = p * q;
  const normalizedC = positiveMod(c, N);
  const rootsP = getSquareRootsModuloPrime(normalizedC, p, mode);
  const rootsQ = getSquareRootsModuloPrime(normalizedC, q, mode);

  if (rootsP.length === 0 || rootsQ.length === 0) {
    throw new Error("Criptotextul nu este reziduu p\u0103tratic modulo p sau modulo q.");
  }

  const roots = [];
  rootsP.forEach((rootP) => {
    rootsQ.forEach((rootQ) => {
      roots.push(crtPair(rootP, p, rootQ, q));
    });
  });

  return {
    c: normalizedC,
    N,
    mode,
    rootsP,
    rootsQ,
    roots: uniqueBigInts(roots).sort(compareBigInts)
  };
}

function textToAscii(text) {
  return Array.from(text).map((char) => BigInt(char.charCodeAt(0)));
}

function asciiToText(asciiArray) {
  return asciiArray.map((code) => String.fromCharCode(Number(code))).join("");
}

function encryptText(text, N) {
  if (N <= 126n) {
    throw new Error(TEXT.nTooSmall);
  }

  const ascii = textToAscii(text);
  const invalid = ascii.find((code) => code < 32n || code > 126n);
  if (invalid !== undefined) {
    throw new Error("Textul trebuie s\u0103 con\u021Bin\u0103 doar caractere printabile simple, de exemplu litere, cifre, spa\u021Bii \u0219i semne de punctua\u021Bie uzuale.");
  }

  const cipher = ascii.map((code) => rabinEncryptNumber(code, N));
  return { ascii, cipher };
}

function decryptText(cipherArray, p, q, mode) {
  const blocks = cipherArray.map((cipher) => {
    const result = rabinDecryptNumber(cipher, p, q, mode);
    const printableCandidates = result.roots.filter((root) => root >= 32n && root <= 126n);

    return {
      cipher,
      roots: result.roots,
      printableCandidates
    };
  });

  const approximateText = blocks
    .map((block) => {
      if (block.printableCandidates.length === 0) return "?";
      if (block.printableCandidates.length === 1) return asciiToText(block.printableCandidates);
      return `[${block.printableCandidates.map((code) => asciiToText([code])).join("|")}]`;
    })
    .join("");

  return { blocks, approximateText };
}

function positiveMod(value, mod) {
  return ((value % mod) + mod) % mod;
}

function absBigInt(value) {
  return value < 0n ? -value : value;
}

function uniqueBigInts(values) {
  return [...new Set(values.map((value) => value.toString()))].map((value) => BigInt(value));
}

function compareBigInts(a, b) {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

function formatCandidates(candidates) {
  return candidates.map((candidate) => `<div class="candidate"><code>${candidate}</code></div>`).join("");
}

function formatInlineBigInts(values) {
  return values.map((value) => `<code>${value}</code>`).join(" ");
}

function formatAsciiCandidate(code) {
  const char = asciiToText([code]);
  const label = char === " " ? "spa\u021Biu" : escapeHtml(char);
  return `<code>${label}</code>`;
}

function formatTextAsciiPairs(text, asciiValues) {
  return Array.from(text)
    .map((char, index) => {
      const label = char === " " ? "spa\u021Biu" : escapeHtml(char);
      return `<code>${label} = ${asciiValues[index]}</code>`;
    })
    .join(" ");
}

function formatChoice(printableCandidates) {
  if (printableCandidates.length === 0) {
    return "<code>?</code>";
  }

  if (printableCandidates.length === 1) {
    return `<code>${escapeHtml(asciiToText(printableCandidates))}</code>`;
  }

  const options = printableCandidates.map((code) => escapeHtml(asciiToText([code]))).join(" | ");
  return `<code>Ambiguu: ${options}</code>`;
}

function renderCards(cards) {
  ui.results.innerHTML = cards
    .map((card) => {
      const meta = card.meta
        .map((item) => `<span class="badge ${card.secret ? "secret" : "info"}">${escapeHtml(item)}</span>`)
        .join("");

      return `
        <article class="result-card">
          <h3>${escapeHtml(card.title)}</h3>
          <div class="result-meta">${meta}</div>
          ${card.body}
        </article>
      `;
    })
    .join("");
}

function renderEmptyResult(message = TEXT.initialResult) {
  ui.results.innerHTML = `<div class="empty-state">${escapeHtml(message)}</div>`;
}

function renderError(message) {
  ui.results.innerHTML = `<div class="error-box">${escapeHtml(message)}</div>`;
}

function setFeedback(message, type) {
  ui.setupFeedback.textContent = message;
  ui.setupFeedback.className = `feedback is-${type}`;
}

function clearFeedback() {
  ui.setupFeedback.textContent = "";
  ui.setupFeedback.className = "feedback";
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
