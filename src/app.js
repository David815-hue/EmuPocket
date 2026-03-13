const STORAGE_KEY = "gbc-web-prototype-prefs-v3";
const GBC_SAVE_PREFIX = "FREEZE_CUSTOM_";
const GBA_SAVE_PREFIX = "GBA_SAVE_SLOT_";
const GBA_BIOS_URL = "./vendor/gba-js/resources/bios.bin";

const defaultPrefs = {
  systemPreference: "auto",
  drawerOpen: false,
  startWithButton: true,
  overlayVisible: false,
  overlayContext: "battle-root",
  overlayAutoFollow: true,
  overlayOpacity: 92,
  volume: 100,
  scanlines: true,
  theme: "teal",
  attackLabels: ["Thunderbolt", "Quick Attack", "Tail Whip", "Thunder Wave"],
  speed: 1,
  cheats: [],
};

const keyMap = {
  arrowup: "up",
  arrowdown: "down",
  arrowleft: "left",
  arrowright: "right",
  z: "a",
  x: "b",
  enter: "start",
  backspace: "select",
  a: "l",
  s: "r",
};

const elements = {
  body: document.body,
  canvas: document.querySelector("#screen"),
  screenWrap: document.querySelector("#screen-wrap"),
  screenHint: document.querySelector("#screen-hint"),
  romInput: document.querySelector("#rom-input"),
  statusLine: document.querySelector("#status-line"),
  stateOutput: document.querySelector("#state-output"),
  menuOverlay: document.querySelector("#menu-overlay"),
  toggleMenuBtn: document.querySelector("#toggle-menu-btn"),
  drawerOverlayBtn: document.querySelector("#drawer-overlay-btn"),
  drawerToggleBtn: document.querySelector("#drawer-toggle-btn"),
  drawerCloseBtn: document.querySelector("#drawer-close-btn"),
  drawerBackdrop: document.querySelector("#drawer-backdrop"),
  drawer: document.querySelector("#control-drawer"),
  quickMenuBtn: document.querySelector("#quick-menu-btn"),
  powerBtn: document.querySelector("#power-btn"),
  fullscreenBtn: document.querySelector("#fullscreen-btn"),
  speedBtn: document.querySelector("#speed-btn"),
  consolePowerBtn: document.querySelector("#console-power-btn"),
  overlayContext: document.querySelector("#overlay-context"),
  overlayAutoFollow: document.querySelector("#overlay-auto-follow"),
  overlayOpacity: document.querySelector("#overlay-opacity"),
  volumeRange: document.querySelector("#volume-range"),
  scanlinesToggle: document.querySelector("#scanlines-toggle"),
  startWithButtonToggle: document.querySelector("#start-with-button-toggle"),
  themeSelect: document.querySelector("#theme-select"),
  restoreDefaultsBtn: document.querySelector("#restore-defaults-btn"),
  contextBadge: document.querySelector("#context-badge"),
  overlaySummary: document.querySelector("#overlay-summary"),
  brandChip: document.querySelector("#brand-chip"),
  systemChip: document.querySelector("#system-chip"),
  saveModeChip: document.querySelector("#save-mode-chip"),
  systemBadge: document.querySelector("#system-badge"),
  systemDescription: document.querySelector("#system-description"),
  systemToggleButtons: [...document.querySelectorAll("[data-system-toggle]")],
  controlProfile: document.querySelector("#control-profile"),
  controlHint: document.querySelector("#control-hint"),
  saveProfile: document.querySelector("#save-profile"),
  saveHint: document.querySelector("#save-hint"),
  cheatForm: document.querySelector("#cheat-form"),
  cheatAddress: document.querySelector("#cheat-address"),
  cheatValue: document.querySelector("#cheat-value"),
  cheatLabel: document.querySelector("#cheat-label"),
  cheatList: document.querySelector("#cheat-list"),
  cheatCountBadge: document.querySelector("#cheat-count-badge"),
  attackInputs: [...document.querySelectorAll("[data-attack-index]")],
  hardwareButtons: [...document.querySelectorAll("[data-button]")],
};

const uiState = {
  ...defaultPrefs,
  currentSystem: "gbc",
  loadedRom: null,
  awaitingStart: false,
  paused: false,
  lastInput: "none",
  lastStatusExtra: "",
};

let gbaCore = null;
let gbaBiosBuffer = null;

window.cout = function (message) {
  console.log("[EMU]", message);
  if (typeof message === "string" && message.includes("Illegal op code") && uiState.currentSystem === "gbc") {
    updateStatus("ROM incompatible con el core actual. Usa .gb/.gbc o cambia a una ROM GBA.");
  }
};

window.findValue = function (key) {
  try {
    const value = window.localStorage.getItem(key);
    return value == null ? null : JSON.parse(value);
  } catch (error) {
    console.warn("findValue error", error);
    return null;
  }
};

window.setValue = function (key, value) {
  window.localStorage.setItem(key, JSON.stringify(value));
};

window.deleteValue = function (key) {
  window.localStorage.removeItem(key);
};

function loadPrefs() {
  try {
    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}");
    Object.assign(uiState, defaultPrefs, stored);
    if (!Array.isArray(uiState.attackLabels) || uiState.attackLabels.length !== 4) {
      uiState.attackLabels = [...defaultPrefs.attackLabels];
    }
    if (!Array.isArray(uiState.cheats)) {
      uiState.cheats = [];
    }
  } catch (error) {
    console.warn("No se pudieron restaurar preferencias", error);
  }
}

function persistPrefs() {
  const payload = {
    systemPreference: uiState.systemPreference,
    drawerOpen: uiState.drawerOpen,
    startWithButton: uiState.startWithButton,
    overlayVisible: uiState.overlayVisible,
    overlayContext: uiState.overlayContext,
    overlayAutoFollow: uiState.overlayAutoFollow,
    overlayOpacity: uiState.overlayOpacity,
    volume: uiState.volume,
    scanlines: uiState.scanlines,
    theme: uiState.theme,
    attackLabels: uiState.attackLabels,
    cheats: uiState.cheats,
    speed: uiState.speed,
  };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function isGbcReady() {
  return typeof window.gameboy === "object" && window.gameboy !== null;
}

function isGbaReady() {
  return typeof gbaCore === "object" && gbaCore !== null && gbaCore.hasRom();
}

function isReady() {
  return uiState.currentSystem === "gba" ? isGbaReady() : isGbcReady();
}

function isPlaying() {
  if (uiState.currentSystem === "gba") {
    return isGbaReady() && !gbaCore.paused;
  }
  return isGbcReady() && (window.gameboy.stopEmulator & 2) === 0;
}

function binaryStringFromArrayBuffer(buffer) {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let result = "";
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    result += String.fromCharCode.apply(null, bytes.subarray(offset, offset + chunkSize));
  }
  return result;
}

function getFileExtension(fileName) {
  const match = /\.([^.]+)$/.exec(fileName || "");
  return match ? match[1].toLowerCase() : "";
}

function getSystemFromFile(file) {
  return getFileExtension(file.name) === "gba" ? "gba" : "gbc";
}

function resolveTargetSystem(file) {
  const fileSystem = getSystemFromFile(file);
  if (uiState.systemPreference === "auto") {
    return fileSystem;
  }
  if (uiState.systemPreference !== fileSystem) {
    throw new Error(
      uiState.systemPreference === "gba"
        ? "El modo GBA solo acepta ROMs .gba."
        : "El modo GB/GBC solo acepta ROMs .gb o .gbc.",
    );
  }
  return uiState.systemPreference;
}

function validateRomFile(file) {
  const ext = getFileExtension(file.name);
  if (ext === "zip" || ext === "7z" || ext === "rar") {
    return "Sube la ROM descomprimida, no .zip/.7z/.rar.";
  }
  if (ext !== "gb" && ext !== "gbc" && ext !== "gba") {
    return "Formato no soportado. Usa .gb, .gbc o .gba.";
  }
  return "";
}

function normalizeHex(raw, maxLength) {
  return raw
    .trim()
    .toUpperCase()
    .replace(/^0X/, "")
    .replace(/[^0-9A-F]/g, "")
    .slice(0, maxLength);
}

function parseCheat(addressRaw, valueRaw, labelRaw) {
  const addressHex = normalizeHex(addressRaw, 8);
  const valueHex = normalizeHex(valueRaw, 2);

  if (addressHex.length < 4 || valueHex.length !== 2) {
    throw new Error("Usa direccion hex valida y valor de 2 hex.");
  }

  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    address: parseInt(addressHex, 16),
    value: parseInt(valueHex, 16),
    addressHex,
    valueHex,
    label: labelRaw.trim() || `Patch ${addressHex}`,
    enabled: true,
  };
}

function setCurrentSystem(system) {
  if (uiState.currentSystem !== system) {
    elements.body.classList.add("system-switching");
    window.setTimeout(() => {
      elements.body.classList.remove("system-switching");
    }, 320);
  }
  uiState.currentSystem = system;
  elements.body.dataset.system = system;
  syncCanvasResolution(system);
}

function syncCanvasResolution(system = uiState.currentSystem) {
  if (system === "gba") {
    elements.canvas.width = 240;
    elements.canvas.height = 160;
    return;
  }
  elements.canvas.width = 160;
  elements.canvas.height = 144;
}

function getOverlayModel() {
  if (uiState.currentSystem === "gba") {
    const moveButtons = uiState.attackLabels.map((label, index) => {
      const base = ["up", "left"];
      if (index === 1) base.push("right");
      if (index === 2) base.push("down");
      if (index === 3) base.push("down", "right");
      base.push("a");
      return {
        label,
        detail: `move ${index + 1}`,
        sequence: base,
        nextContext: "battle-root",
        tone: index < 2 ? "primary" : "",
      };
    });

    return {
      "battle-root": {
        title: "Battle Command",
        hint: "Comandos de GBA en una fila horizontal tipo Advance",
        className: "gba-command-grid",
        buttons: [
          { label: "Fight", detail: "moves", sequence: ["up", "left", "a"], nextContext: "battle-fight", tone: "primary" },
          { label: "Bag", detail: "items", sequence: ["down", "left", "a"], nextContext: "bag" },
          { label: "Pokemon", detail: "party", sequence: ["up", "right", "a"], nextContext: "party" },
          { label: "Run", detail: "exit", sequence: ["down", "right", "a"], nextContext: "battle-root", tone: "secondary" },
        ],
      },
      "battle-fight": {
        title: "Move Select",
        hint: "Ataques estilo Advance con vuelta rapida al root",
        className: "gba-attack-grid",
        buttons: [
          ...moveButtons,
          { label: "L Tab", detail: "L", sequence: ["l"], nextContext: "battle-fight" },
          { label: "R Tab", detail: "R", sequence: ["r"], nextContext: "battle-fight" },
          { label: "Info", detail: "select", sequence: ["select"], nextContext: "battle-fight" },
          { label: "Back", detail: "B", sequence: ["b"], nextContext: "battle-root", tone: "secondary" },
        ],
      },
      party: {
        title: "Party Advance",
        hint: "Selecciona party y usa L/R para moverte mas rapido",
        buttons: Array.from({ length: 6 }, (_, index) => ({
          label: `Slot ${index + 1}`,
          detail: "party",
          sequence: [...Array.from({ length: 5 }, () => "up"), ...Array.from({ length: index }, () => "down"), "a"],
          nextContext: "party",
        })).concat([
          { label: "Summary", detail: "A", sequence: ["a"], nextContext: "party", tone: "primary" },
          { label: "Back", detail: "B", sequence: ["b"], nextContext: "battle-root", tone: "secondary" },
        ]),
      },
      bag: {
        title: "Bag Advance",
        hint: "Usa L/R para cambiar bolsillos y A/B para usar o salir",
        buttons: [
          { label: "Use", detail: "A", sequence: ["a"], nextContext: "bag", tone: "primary" },
          { label: "Back", detail: "B", sequence: ["b"], nextContext: "battle-root", tone: "secondary" },
          { label: "Prev Pocket", detail: "L", sequence: ["l"], nextContext: "bag" },
          { label: "Next Pocket", detail: "R", sequence: ["r"], nextContext: "bag" },
          { label: "Up", detail: "list", sequence: ["up"], nextContext: "bag" },
          { label: "Down", detail: "list", sequence: ["down"], nextContext: "bag" },
        ],
      },
      nav: {
        title: "Advance Nav",
        hint: "Pad generico con hombros activos",
        className: "nav-grid",
        buttons: [
          { label: "Up", detail: "U", sequence: ["up"], nextContext: "nav" },
          { label: "A", detail: "ok", sequence: ["a"], nextContext: "nav", tone: "primary" },
          { label: "L", detail: "shoulder", sequence: ["l"], nextContext: "nav" },
          { label: "Left", detail: "L", sequence: ["left"], nextContext: "nav" },
          { label: "B", detail: "back", sequence: ["b"], nextContext: "nav", tone: "secondary" },
          { label: "Right", detail: "R", sequence: ["right"], nextContext: "nav" },
          { label: "Down", detail: "D", sequence: ["down"], nextContext: "nav" },
          { label: "Start", detail: "menu", sequence: ["start"], nextContext: "nav" },
          { label: "R", detail: "shoulder", sequence: ["r"], nextContext: "nav" },
        ],
      },
    };
  }

  const moveButtons = uiState.attackLabels.map((label, index) => {
    const base = ["up", "left"];
    if (index === 1) base.push("right");
    if (index === 2) base.push("down");
    if (index === 3) base.push("down", "right");
    base.push("a");
    return {
      label,
      detail: `slot ${index + 1}`,
      sequence: base,
      nextContext: "battle-root",
      tone: index === 0 ? "primary" : "",
    };
  });

  const longUp = ["up", "up", "up", "up", "up"];
  const partyButtons = Array.from({ length: 6 }, (_, index) => ({
    label: `Pokemon ${index + 1}`,
    detail: uiState.currentSystem === "gba" ? "GBA party" : "party",
    sequence: [...longUp, ...Array.from({ length: index }, () => "down"), "a"],
    nextContext: "party",
  }));

  return {
    "battle-root": {
      title: uiState.currentSystem === "gba" ? "Batalla GBA" : "Batalla",
      hint: "Root 2x2 de Fight, Bag, Pokemon, Run",
      buttons: [
        { label: "Fight", detail: "abrir ataques", sequence: ["up", "left", "a"], nextContext: "battle-fight", tone: "primary" },
        { label: "Bag", detail: "abrir bolsa", sequence: ["down", "left", "a"], nextContext: "bag" },
        { label: "Pokemon", detail: "abrir party", sequence: ["up", "right", "a"], nextContext: "party" },
        { label: "Run", detail: "huir", sequence: ["down", "right", "a"], nextContext: "battle-root", tone: "secondary" },
      ],
    },
    "battle-fight": {
      title: "Ataques",
      hint: "Reposiciona al slot superior izquierdo y luego elige",
      buttons: [
        ...moveButtons,
        { label: "Back", detail: "volver", sequence: ["b"], nextContext: "battle-root", tone: "secondary" },
      ],
    },
    party: {
      title: "Party",
      hint: "Seleccion rapida de slots visibles",
      buttons: [
        ...partyButtons,
        { label: "Summary", detail: "A rapido", sequence: ["a"], nextContext: "party", tone: "primary" },
        { label: "Back", detail: "cerrar", sequence: ["b"], nextContext: "battle-root", tone: "secondary" },
      ],
    },
    bag: {
      title: "Bag",
      hint: "Navegacion de bolsa y seleccion",
      buttons: [
        { label: "Usar", detail: "A", sequence: ["a"], nextContext: "bag", tone: "primary" },
        { label: "Atras", detail: "B", sequence: ["b"], nextContext: "battle-root", tone: "secondary" },
        { label: "Arriba", detail: "navegar", sequence: ["up"], nextContext: "bag" },
        { label: "Abajo", detail: "navegar", sequence: ["down"], nextContext: "bag" },
        { label: "Izquierda", detail: uiState.currentSystem === "gba" ? "L" : "pestana", sequence: ["left"], nextContext: "bag" },
        { label: "Derecha", detail: uiState.currentSystem === "gba" ? "R" : "pestana", sequence: ["right"], nextContext: "bag" },
      ],
    },
    nav: {
      title: "Navegacion",
      hint: uiState.currentSystem === "gba" ? "Pad con L/R disponible por teclado A/S" : "Pad generico para cualquier menu",
      className: "nav-grid",
      buttons: [
        { label: "Up", detail: "U", sequence: ["up"], nextContext: "nav" },
        { label: "A", detail: "confirmar", sequence: ["a"], nextContext: "nav", tone: "primary" },
        { label: "Start", detail: "menu", sequence: ["start"], nextContext: "nav" },
        { label: "Left", detail: "L", sequence: ["left"], nextContext: "nav" },
        { label: "B", detail: "cancelar", sequence: ["b"], nextContext: "nav", tone: "secondary" },
        { label: "Right", detail: "R", sequence: ["right"], nextContext: "nav" },
        { label: "Down", detail: "D", sequence: ["down"], nextContext: "nav" },
        { label: "Select", detail: "secundario", sequence: ["select"], nextContext: "nav" },
        { label: "Root", detail: "batalla", sequence: [], nextContext: "battle-root" },
      ],
    },
  };
}

function setOverlayContext(nextContext) {
  uiState.overlayContext = nextContext;
  elements.overlayContext.value = nextContext;
}

function updateStatus(extra = uiState.lastStatusExtra) {
  uiState.lastStatusExtra = extra || "";
  const romText = uiState.loadedRom
    ? `ROM: ${uiState.loadedRom.name} (${uiState.loadedRom.size} bytes)`
    : "Sin ROM cargada";
  const powerText = uiState.awaitingStart
    ? "lista para iniciar"
    : isReady()
      ? (isPlaying() ? "corriendo" : "pausado")
      : "sin iniciar";
  elements.statusLine.textContent = `${romText}. Sistema: ${uiState.currentSystem.toUpperCase()}. Estado: ${powerText}. Ultima entrada: ${uiState.lastInput}.${uiState.lastStatusExtra ? ` ${uiState.lastStatusExtra}` : ""}`;
}

function renderOverlay() {
  const model = getOverlayModel()[uiState.overlayContext];
  const className = model.className ? `overlay-grid ${model.className}` : "overlay-grid";
  const buttonsHtml = model.buttons
    .map((button) => {
      const sequence = JSON.stringify(button.sequence || []);
      return `
        <button
          type="button"
          class="overlay-btn ${button.tone || ""}"
          data-overlay-sequence='${sequence}'
          data-next-context="${button.nextContext || uiState.overlayContext}"
        >
          ${button.label}
          <small>${button.detail || ""}</small>
        </button>`;
    })
    .join("");

  elements.menuOverlay.innerHTML = `
    <div class="overlay-head">
      <div>
        <strong>${model.title}</strong>
        <span>${model.hint}</span>
      </div>
      <button type="button" class="overlay-btn secondary" data-next-context="nav" data-overlay-sequence="[]">Nav</button>
    </div>
    <div class="${className}">
      ${buttonsHtml}
    </div>
  `;
}

function renderCheatList() {
  const activeCount = uiState.cheats.filter((cheat) => cheat.enabled).length;
  elements.cheatCountBadge.textContent = `${activeCount} activos`;

  if (uiState.cheats.length === 0) {
    elements.cheatList.innerHTML = `<div class="cheat-row"><div class="cheat-meta"><strong>Sin cheats</strong><span>Anade un codigo RAM para mantener un valor fijo.</span></div></div>`;
    return;
  }

  elements.cheatList.innerHTML = uiState.cheats
    .map(
      (cheat) => `
        <div class="cheat-row">
          <div class="cheat-meta">
            <strong>${cheat.label}</strong>
            <span>${cheat.addressHex} = ${cheat.valueHex}</span>
          </div>
          <button type="button" data-cheat-toggle="${cheat.id}">${cheat.enabled ? "On" : "Off"}</button>
          <button type="button" data-cheat-remove="${cheat.id}">Quitar</button>
        </div>`,
    )
    .join("");
}

function syncFormState() {
  elements.overlayContext.value = uiState.overlayContext;
  elements.overlayAutoFollow.checked = uiState.overlayAutoFollow;
  elements.overlayOpacity.value = String(uiState.overlayOpacity);
  elements.volumeRange.value = String(uiState.volume);
  elements.scanlinesToggle.checked = uiState.scanlines;
  elements.startWithButtonToggle.checked = uiState.startWithButton;
  elements.themeSelect.value = uiState.theme;
  elements.attackInputs.forEach((input, index) => {
    input.value = uiState.attackLabels[index];
  });
}

function applyVisualPrefs() {
  elements.body.dataset.theme = uiState.theme;
  elements.body.dataset.system = uiState.currentSystem;
  elements.body.classList.toggle("drawer-open", uiState.drawerOpen);
  elements.menuOverlay.style.setProperty("--overlay-alpha", String(uiState.overlayOpacity / 100));
  elements.screenWrap.classList.toggle("scanlines", uiState.scanlines);
  elements.screenHint.classList.toggle("hidden", !uiState.awaitingStart);
  elements.screenHint.textContent = uiState.loadedRom && uiState.awaitingStart
    ? "Presiona boton para iniciar"
    : "Presiona boton para iniciar";
  elements.speedBtn.textContent = `Velocidad x${uiState.speed}`;
  const powerLights = document.querySelectorAll(".power-light");
  powerLights.forEach((light) => {
    const active = isPlaying();
    light.style.background = active ? "#ffb800" : "#333";
    light.style.boxShadow = active ? "0 0 16px #ffb800" : "none";
  });
  if (elements.drawer) {
    elements.drawer.setAttribute("aria-hidden", String(!uiState.drawerOpen));
  }
  if (elements.drawerToggleBtn) {
    elements.drawerToggleBtn.setAttribute("aria-expanded", String(uiState.drawerOpen));
    elements.drawerToggleBtn.textContent = uiState.drawerOpen ? "Cerrar menu" : "Menu";
  }
}

function renderSystemToggle() {
  elements.systemToggleButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.systemToggle === uiState.systemPreference);
  });
}

function setVolume(volumePercent) {
  uiState.volume = Math.max(0, Math.min(100, volumePercent));
  settings[0] = uiState.volume > 0;
  settings[3] = uiState.volume / 100;
  if (isGbcReady() && window.gameboy.audioHandle) {
    window.gameboy.audioHandle.changeVolume(settings[3]);
  }
  if (isGbaReady()) {
    gbaCore.audio.masterVolume = Math.max(0, Math.pow(2, settings[3]) - 1);
  }
}

function applySpeed() {
  if (isGbcReady()) {
    window.gameboy.setSpeed(uiState.speed);
  }
  if (gbaCore) {
    gbaCore.throttle = Math.max(1, Math.round(16 / uiState.speed));
  }
}

function startCurrentEmulator() {
  if (uiState.currentSystem === "gba") {
    if (!isGbaReady()) return;
    gbaCore.runStable();
    return;
  }
  if (isGbcReady()) {
    window.run();
  }
}

function togglePowerState() {
  if (!isReady()) {
    updateStatus("Carga una ROM para iniciar la emulacion.");
    return;
  }

  if (uiState.awaitingStart) {
    uiState.awaitingStart = false;
    startCurrentEmulator();
    afterInput("power_start", "Emulacion iniciada.");
    return;
  }

  if (uiState.currentSystem === "gba") {
    if (gbaCore.paused) {
      gbaCore.runStable();
    } else {
      gbaCore.pause();
    }
  } else if (isPlaying()) {
    window.pause();
  } else {
    window.run();
  }

  afterInput("power_toggle");
}

function refreshMeta() {
  elements.powerBtn.textContent = uiState.awaitingStart ? "Iniciar" : isPlaying() ? "Pausar" : "Reanudar";
  elements.contextBadge.textContent = uiState.overlayContext;
  elements.overlaySummary.textContent = uiState.overlayVisible
    ? `Overlay ${uiState.overlayContext}`
    : "Overlay oculto";
  elements.toggleMenuBtn.textContent = uiState.overlayVisible ? "Ocultar overlay" : "Mostrar overlay";
  if (elements.drawerOverlayBtn) {
    elements.drawerOverlayBtn.textContent = uiState.overlayVisible ? "Ocultar overlay" : "Mostrar overlay";
  }
  const isGba = uiState.currentSystem === "gba";
  elements.brandChip.textContent = isGba ? "Pocket Codex Advance" : "Pocket Codex Color";
  const screenMarquee = document.querySelector("#screen-marquee");
  const consoleEmblem = document.querySelector("#console-emblem");
  if (screenMarquee) {
    screenMarquee.textContent = isGba ? "GAME BOY ADVANCE" : "GAME BOY COLOR";
  }
  if (consoleEmblem) {
    consoleEmblem.textContent = "Nintendo";
  }
  elements.systemChip.textContent = isGba ? "Sistema GBA" : "Sistema GB/GBC";
  elements.saveModeChip.textContent = isGba ? "SRAM por slots" : "Save states";
  elements.systemBadge.textContent = isGba ? "gba" : "gbc";
  elements.systemDescription.textContent = isGba
    ? "Modo Advance activo. La pantalla usa proporcion GBA, los hombros L/R quedan activos y los slots guardan SRAM del juego."
    : "Modo Game Boy o Game Boy Color activo. Los slots guardan save states completos del emulador para volver exactamente al mismo punto.";
  elements.controlProfile.textContent = isGba ? "Perfil GBA" : "Perfil GB/GBC";
  elements.controlHint.textContent = isGba
    ? "Flechas, Z, X, Enter, Backspace y hombros L/R con A y S."
    : "Flechas, Z, X, Enter y Backspace para la cruceta y botones clasicos.";
  elements.saveProfile.textContent = isGba ? "Guardado SRAM" : "Guardado por estado";
  elements.saveHint.textContent = isGba
    ? "Los slots capturan SRAM del cartucho. Sirve para progreso del juego, no para congelar cada frame."
    : "Los slots guardan save states completos. Vuelves al mismo instante exacto de la emulacion.";
  if (elements.consolePowerBtn) {
    elements.consolePowerBtn.classList.toggle("ready", uiState.awaitingStart);
  }
  renderSystemToggle();
}

function setDrawerOpen(nextOpen) {
  uiState.drawerOpen = nextOpen;
  persistAndRender();
}

function toggleOverlayVisibility() {
  uiState.overlayVisible = !uiState.overlayVisible;
  persistAndRender();
  afterInput("toggle_overlay");
}

function renderStatePanel() {
  elements.menuOverlay.classList.toggle("hidden", !uiState.overlayVisible);
  elements.menuOverlay.setAttribute("aria-hidden", String(!uiState.overlayVisible));
  renderOverlay();
  renderCheatList();
  refreshMeta();
  elements.stateOutput.textContent = window.render_game_to_text();
}

function persistAndRender() {
  persistPrefs();
  applyVisualPrefs();
  renderStatePanel();
  updateStatus();
}

function gbaButtonIndex(button) {
  const map = {
    a: "A",
    b: "B",
    select: "SELECT",
    start: "START",
    right: "RIGHT",
    left: "LEFT",
    up: "UP",
    down: "DOWN",
    r: "R",
    l: "L",
  };
  return gbaCore && gbaCore.keypad ? gbaCore.keypad[map[button]] : null;
}

function pressInput(button) {
  if (uiState.currentSystem === "gba") {
    if (!isGbaReady()) return;
    const index = gbaButtonIndex(button);
    if (typeof index !== "number") return;
    gbaCore.keypad.currentDown &= ~(1 << index);
    return;
  }
  if (isGbcReady()) {
    window.GameBoyKeyDown(button);
  }
}

function releaseInput(button) {
  if (uiState.currentSystem === "gba") {
    if (!isGbaReady()) return;
    const index = gbaButtonIndex(button);
    if (typeof index !== "number") return;
    gbaCore.keypad.currentDown |= 1 << index;
    return;
  }
  if (isGbcReady()) {
    window.GameBoyKeyUp(button);
  }
}

function holdButton(button, duration = 55) {
  if (!isReady()) {
    updateStatus("Carga una ROM primero.");
    return;
  }

  pressInput(button);
  window.setTimeout(() => {
    releaseInput(button);
    renderStatePanel();
  }, duration);
}

function tapSequence(sequence, finalContext) {
  if (!isReady()) {
    updateStatus("Carga una ROM primero.");
    return;
  }

  sequence.forEach((button, index) => {
    window.setTimeout(() => holdButton(button, 50), index * 85);
  });

  if (uiState.overlayAutoFollow && finalContext) {
    const delay = sequence.length * 85 + 25;
    window.setTimeout(() => {
      setOverlayContext(finalContext);
      persistAndRender();
    }, delay);
  }
}

function afterInput(inputName, extra = "") {
  uiState.lastInput = inputName;
  updateStatus(extra);
  renderStatePanel();
}

function gbcSaveSlotName(slot) {
  const romName = isGbcReady() && window.gameboy.name ? window.gameboy.name : "rom";
  return `${GBC_SAVE_PREFIX}${romName}_slot_${slot}`;
}

function gbaSaveSlotName(slot) {
  const romCode = isGbaReady() && gbaCore.mmu && gbaCore.mmu.cart ? gbaCore.mmu.cart.code : "gba";
  return `${GBA_SAVE_PREFIX}${romCode}_slot_${slot}`;
}

function teardownCurrentEmulator() {
  if (isGbaReady()) {
    gbaCore.pause();
  }
  if (isGbcReady()) {
    try {
      window.clearLastEmulation();
    } catch (error) {
      console.warn("No se pudo detener GBC", error);
    }
  }
}

async function ensureGbaCore() {
  if (!gbaCore) {
    gbaCore = new GameBoyAdvance();
    gbaCore.keypad.eatInput = true;
    gbaCore.logLevel = gbaCore.LOG_ERROR;
    gbaCore.setLogger(function (_level, error) {
      console.error("[GBA]", error);
      updateStatus(`Error en core GBA: ${error}`);
      gbaCore.pause();
    });
  }

  gbaCore.setCanvas(elements.canvas);

  if (!gbaBiosBuffer) {
    const response = await fetch(GBA_BIOS_URL);
    gbaBiosBuffer = await response.arrayBuffer();
  }

  gbaCore.setBios(gbaBiosBuffer);
  return gbaCore;
}

async function loadGbcRom(file) {
  const buffer = await file.arrayBuffer();
  const binary = binaryStringFromArrayBuffer(buffer);
  window.start(elements.canvas, binary);
  setCurrentSystem("gbc");
  uiState.loadedRom = {
    name: file.name,
    size: buffer.byteLength,
  };
  uiState.lastInput = "rom_loaded";
  uiState.paused = false;
  setVolume(uiState.volume);
  applySpeed();
  uiState.awaitingStart = uiState.startWithButton;
  if (uiState.startWithButton) {
    window.pause();
    updateStatus("ROM lista. Presiona boton para iniciar.");
  } else {
    updateStatus("Core GB/GBC inicializado.");
  }
  renderStatePanel();
}

async function loadGbaRom(file) {
  const core = await ensureGbaCore();
  const buffer = await file.arrayBuffer();
  const result = core.setRom(buffer);
  if (!result) {
    throw new Error("No se pudo iniciar la ROM GBA.");
  }

  setCurrentSystem("gba");
  uiState.loadedRom = {
    name: file.name,
    size: buffer.byteLength,
  };
  uiState.lastInput = "rom_loaded";
  uiState.paused = false;
  setVolume(uiState.volume);
  applySpeed();
  uiState.awaitingStart = uiState.startWithButton;
  if (uiState.startWithButton) {
    core.pause();
    updateStatus("ROM lista. Presiona boton para iniciar.");
  } else {
    core.runStable();
    updateStatus("Core GBA inicializado.");
  }
  renderStatePanel();
}

async function loadRom(file) {
  teardownCurrentEmulator();
  uiState.awaitingStart = false;
  const targetSystem = resolveTargetSystem(file);
  if (targetSystem === "gba") {
    await loadGbaRom(file);
  } else {
    await loadGbcRom(file);
  }
}

function saveToSlot(slot) {
  if (!isReady()) {
    updateStatus("No hay emulacion activa para guardar.");
    return;
  }

  if (uiState.currentSystem === "gba") {
    if (!gbaCore.mmu.save) {
      updateStatus("GBA aun no genero datos de guardado internos.");
      return;
    }
    gbaCore.storeSavedata();
    const storageKey = `${gbaCore.SYS_ID}.${gbaCore.mmu.cart.code}`;
    const savedata = window.localStorage.getItem(storageKey);
    if (!savedata) {
      updateStatus("No se pudo capturar el guardado SRAM de GBA.");
      return;
    }
    window.localStorage.setItem(gbaSaveSlotName(slot), savedata);
    afterInput(`save_slot_${slot}`, `SRAM de GBA guardado en slot ${slot}. Guarda progreso del juego, no un freeze state.`);
    return;
  }

  window.saveState(gbcSaveSlotName(slot));
  afterInput(`save_slot_${slot}`, `Save state guardado en slot ${slot}.`);
}

function loadFromSlot(slot) {
  if (!isReady()) {
    updateStatus("No hay emulacion activa.");
    return;
  }

  if (uiState.currentSystem === "gba") {
    const savedata = window.localStorage.getItem(gbaSaveSlotName(slot));
    if (!savedata) {
      updateStatus(`No existe SRAM GBA en el slot ${slot}.`);
      return;
    }
    gbaCore.decodeSavedata(savedata);
    afterInput(`load_slot_${slot}`, `SRAM de GBA cargado desde slot ${slot}.`);
    return;
  }

  const keyName = gbcSaveSlotName(slot);
  if (!window.findValue(keyName)) {
    updateStatus(`No existe un save en el slot ${slot}.`);
    return;
  }
  window.openState(keyName, elements.canvas);
  setVolume(uiState.volume);
  applySpeed();
  afterInput(`load_slot_${slot}`, `Save state cargado desde slot ${slot}.`);
}

function applyCheats() {
  if (!isReady()) {
    return;
  }

  for (const cheat of uiState.cheats) {
    if (!cheat.enabled) continue;
    try {
      if (uiState.currentSystem === "gba") {
        gbaCore.mmu.store8(cheat.address >>> 0, cheat.value);
      } else {
        window.gameboy.memoryWrite(cheat.address, cheat.value);
      }
    } catch (error) {
      console.warn("No se pudo aplicar cheat", cheat, error);
    }
  }
}

function addCheat(event) {
  event.preventDefault();
  try {
    const cheat = parseCheat(elements.cheatAddress.value, elements.cheatValue.value, elements.cheatLabel.value);
    uiState.cheats.unshift(cheat);
    elements.cheatForm.reset();
    persistAndRender();
    updateStatus(`Cheat ${cheat.addressHex}=${cheat.valueHex} anadido.`);
  } catch (error) {
    updateStatus(error.message);
  }
}

function setDefaults() {
  Object.assign(uiState, {
    ...defaultPrefs,
    currentSystem: uiState.currentSystem,
    loadedRom: uiState.loadedRom,
    paused: uiState.paused,
    lastInput: uiState.lastInput,
    lastStatusExtra: uiState.lastStatusExtra,
  });
  syncFormState();
  setVolume(uiState.volume);
  applySpeed();
  persistAndRender();
}

window.render_game_to_text = function () {
  const system = uiState.currentSystem;
  const core =
    system === "gba" && isGbaReady()
      ? {
          title: gbaCore.mmu.cart.title,
          code: gbaCore.mmu.cart.code,
          paused: gbaCore.paused,
          hasSave: !!gbaCore.mmu.save,
          canvas: { width: elements.canvas.width, height: elements.canvas.height },
        }
      : isGbcReady()
        ? {
            name: window.gameboy.name,
            cGBC: window.gameboy.cGBC,
            usedBootROM: window.gameboy.usedBootROM,
            stopEmulator: window.gameboy.stopEmulator,
            audioInitialized: !!window.gameboy.audioHandle,
            canvas: { width: elements.canvas.width, height: elements.canvas.height },
          }
        : null;

  return JSON.stringify(
    {
      system,
      mode: uiState.awaitingStart ? "ready" : isReady() ? (isPlaying() ? "running" : "paused") : "idle",
      origin: { x: 0, y: 0, note: "origen superior izquierdo, y crece hacia abajo" },
      rom: uiState.loadedRom,
      startFlow: {
        enabled: uiState.startWithButton,
        awaitingStart: uiState.awaitingStart,
      },
      overlay: {
        visible: uiState.overlayVisible,
        context: uiState.overlayContext,
        autoFollow: uiState.overlayAutoFollow,
        opacity: uiState.overlayOpacity,
        attacks: uiState.attackLabels,
      },
      cheats: uiState.cheats.map((cheat) => ({
        addressHex: cheat.addressHex,
        valueHex: cheat.valueHex,
        enabled: cheat.enabled,
        label: cheat.label,
      })),
      lastInput: uiState.lastInput,
      speed: uiState.speed,
      volume: uiState.volume,
      core,
    },
    null,
    2,
  );
};

window.advanceTime = function (ms) {
  if (!isReady()) return;
  if (uiState.currentSystem === "gba") {
    const frames = Math.max(1, Math.round(ms / 16));
    for (let index = 0; index < frames; index += 1) {
      gbaCore.advanceFrame();
    }
  } else {
    const iterations = Math.max(1, Math.round(ms / 16));
    for (let index = 0; index < iterations; index += 1) {
      window.gameboy.run();
    }
  }
  applyCheats();
  renderStatePanel();
};

function bindInputButton(buttonElement) {
  const button = buttonElement.dataset.button;
  buttonElement.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    buttonElement.classList.add("is-pressed");
    window.setTimeout(() => {
      buttonElement.classList.remove("is-pressed");
    }, 120);
    holdButton(button, 85);
    afterInput(button);
  });
}

loadPrefs();
syncCanvasResolution(uiState.currentSystem);
syncFormState();
applyVisualPrefs();
renderStatePanel();
updateStatus();

elements.systemToggleButtons.forEach((button) => {
  button.addEventListener("click", () => {
    uiState.systemPreference = button.dataset.systemToggle;
    const previewSystem = uiState.systemPreference === "auto"
      ? uiState.loadedRom
        ? getSystemFromFile(uiState.loadedRom)
        : "gbc"
      : uiState.systemPreference;
    setCurrentSystem(previewSystem);
    persistAndRender();
    updateStatus(
      uiState.systemPreference === "auto"
        ? "Modo automatico activo. La ROM decide el sistema."
        : `Modo manual ${uiState.systemPreference.toUpperCase()} activo.`,
    );
  });
});

elements.romInput.addEventListener("change", async (event) => {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  const validationError = validateRomFile(file);
  if (validationError) {
    updateStatus(validationError);
    return;
  }

  try {
    await loadRom(file);
    persistPrefs();
  } catch (error) {
    console.error(error);
    updateStatus(`No se pudo cargar la ROM: ${error.message}`);
  }
});

document.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  if (key === "escape" && uiState.drawerOpen) {
    event.preventDefault();
    setDrawerOpen(false);
    return;
  }
  if (key === "f") {
    event.preventDefault();
    toggleFullscreen();
    return;
  }
  const mapped = keyMap[key];
  if (!mapped || event.repeat) return;
  event.preventDefault();
  if (!isReady()) {
    updateStatus("Carga una ROM primero.");
    return;
  }
  pressInput(mapped);
  afterInput(mapped);
});

document.addEventListener("keyup", (event) => {
  const key = event.key.toLowerCase();
  const mapped = keyMap[key];
  if (!mapped || !isReady()) return;
  event.preventDefault();
  releaseInput(mapped);
  renderStatePanel();
});

elements.menuOverlay.addEventListener("click", (event) => {
  const target = event.target.closest("[data-overlay-sequence]");
  if (!target) return;

  const sequence = JSON.parse(target.dataset.overlaySequence || "[]");
  const nextContext = target.dataset.nextContext || uiState.overlayContext;
  if (sequence.length > 0) {
    tapSequence(sequence, nextContext);
    const label = target.firstChild && target.firstChild.textContent
      ? target.firstChild.textContent.trim()
      : target.textContent.trim().replace(/\s+/g, " ");
    afterInput(`overlay:${label}`);
  } else {
    setOverlayContext(nextContext);
    persistAndRender();
    afterInput(`overlay-context:${nextContext}`);
  }
});

document.addEventListener("click", (event) => {
  const saveSlot = event.target.closest("[data-save-slot]");
  if (saveSlot) {
    saveToSlot(saveSlot.dataset.saveSlot);
    return;
  }

  const loadSlot = event.target.closest("[data-load-slot]");
  if (loadSlot) {
    loadFromSlot(loadSlot.dataset.loadSlot);
    return;
  }

  const toggleCheat = event.target.closest("[data-cheat-toggle]");
  if (toggleCheat) {
    uiState.cheats = uiState.cheats.map((cheat) =>
      cheat.id === toggleCheat.dataset.cheatToggle ? { ...cheat, enabled: !cheat.enabled } : cheat,
    );
    persistAndRender();
    return;
  }

  const removeCheat = event.target.closest("[data-cheat-remove]");
  if (removeCheat) {
    uiState.cheats = uiState.cheats.filter((cheat) => cheat.id !== removeCheat.dataset.cheatRemove);
    persistAndRender();
  }
});

elements.toggleMenuBtn.addEventListener("click", () => {
  toggleOverlayVisibility();
});

elements.drawerOverlayBtn.addEventListener("click", () => {
  toggleOverlayVisibility();
});

elements.drawerToggleBtn.addEventListener("click", () => {
  setDrawerOpen(!uiState.drawerOpen);
});

elements.quickMenuBtn.addEventListener("click", () => {
  setDrawerOpen(true);
  afterInput("open_menu");
});

elements.drawerCloseBtn.addEventListener("click", () => {
  setDrawerOpen(false);
});

elements.drawerBackdrop.addEventListener("click", () => {
  setDrawerOpen(false);
});

elements.powerBtn.addEventListener("click", () => {
  togglePowerState();
});

elements.consolePowerBtn.addEventListener("click", () => {
  elements.consolePowerBtn.classList.add("is-pressed");
  window.setTimeout(() => {
    elements.consolePowerBtn.classList.remove("is-pressed");
  }, 140);
  togglePowerState();
});

elements.fullscreenBtn.addEventListener("click", () => {
  toggleFullscreen();
});

elements.speedBtn.addEventListener("click", () => {
  uiState.speed = uiState.speed === 1 ? 2 : uiState.speed === 2 ? 4 : 1;
  applySpeed();
  persistAndRender();
  afterInput(`speed_${uiState.speed}`);
});

elements.overlayContext.addEventListener("change", (event) => {
  setOverlayContext(event.target.value);
  persistAndRender();
});

elements.overlayAutoFollow.addEventListener("change", (event) => {
  uiState.overlayAutoFollow = event.target.checked;
  persistAndRender();
});

elements.overlayOpacity.addEventListener("input", (event) => {
  uiState.overlayOpacity = Number(event.target.value);
  persistAndRender();
});

elements.volumeRange.addEventListener("input", (event) => {
  setVolume(Number(event.target.value));
  persistAndRender();
});

elements.scanlinesToggle.addEventListener("change", (event) => {
  uiState.scanlines = event.target.checked;
  persistAndRender();
});

elements.startWithButtonToggle.addEventListener("change", (event) => {
  uiState.startWithButton = event.target.checked;
  if (!uiState.startWithButton && uiState.awaitingStart) {
    uiState.awaitingStart = false;
    startCurrentEmulator();
    updateStatus("Arranque automatico activado. La ROM inicio de inmediato.");
  }
  persistAndRender();
});

elements.themeSelect.addEventListener("change", (event) => {
  uiState.theme = event.target.value;
  persistAndRender();
});

elements.attackInputs.forEach((input) => {
  input.addEventListener("input", (event) => {
    const index = Number(event.target.dataset.attackIndex);
    uiState.attackLabels[index] = event.target.value.trim() || `Ataque ${index + 1}`;
    persistAndRender();
  });
});

elements.restoreDefaultsBtn.addEventListener("click", () => {
  setDefaults();
  afterInput("restore_defaults", "Preferencias restauradas.");
});

elements.cheatForm.addEventListener("submit", addCheat);
elements.hardwareButtons.forEach(bindInputButton);

window.setInterval(() => {
  applyCheats();
  renderStatePanel();
}, 180);

async function toggleFullscreen() {
  if (document.fullscreenElement) {
    await document.exitFullscreen();
    return;
  }
  await document.documentElement.requestFullscreen();
}
