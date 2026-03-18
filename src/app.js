const STORAGE_KEY = "gbc-web-prototype-prefs-v3";
const GBC_SAVE_PREFIX = "FREEZE_CUSTOM_";
const GBA_SAVE_PREFIX = "GBA_SAVE_SLOT_";
const GBA_BIOS_URL = "./vendor/gba-js/resources/bios.bin";

const defaultKeyBindings = {
  arrowup: "up",
  arrowdown: "down",
  arrowleft: "left",
  arrowright: "right",
  z: "a",
  x: "b",
  c: "x",
  v: "y",
  enter: "start",
  backspace: "select",
  a: "l",
  s: "r",
};

const defaultPrefs = {
  systemPreference: "auto",
  drawerOpen: false,
  focusMode: false,
  startWithButton: false,
  overlayVisible: false,
  overlayContext: "battle-root",
  overlayAutoFollow: true,
  overlayOpacity: 92,
  volume: 100,
  scanlines: true,
  theme: "teal",
  filterMode: "lcd",
  filterIntensity: 55,
  touchControls: true,
  attackLabels: ["Thunderbolt", "Quick Attack", "Tail Whip", "Thunder Wave"],
  speed: 1,
  cheats: [],
  keyBindings: defaultKeyBindings,
};

const elements = {};
const fullscreenState = {
  active: false,
  moved: [],
};

const gbcSpeakerDots = `
  <div class="dot placeholder"></div>
  <div class="dot open"></div>
  <div class="dot closed"></div>
  <div class="dot open"></div>
  <div class="dot closed"></div>
  <div class="dot open"></div>
  <div class="dot closed"></div>
  <div class="dot placeholder"></div>
  <div class="dot open"></div>
  <div class="dot closed"></div>
  <div class="dot open"></div>
  <div class="dot closed"></div>
  <div class="dot open"></div>
  <div class="dot closed"></div>
  <div class="dot open"></div>
  <div class="dot closed"></div>
  <div class="dot closed"></div>
  <div class="dot open"></div>
  <div class="dot closed"></div>
  <div class="dot open"></div>
  <div class="dot closed"></div>
  <div class="dot open"></div>
  <div class="dot closed"></div>
  <div class="dot open"></div>
  <div class="dot open"></div>
  <div class="dot closed"></div>
  <div class="dot open"></div>
  <div class="dot closed"></div>
  <div class="dot open"></div>
  <div class="dot closed"></div>
  <div class="dot open"></div>
  <div class="dot closed"></div>
`;

const gbaSpeakerDots = `
  <div class="dot small-dot"></div>
  <div class="dot small-dot"></div>
  <div class="dot small-dot"></div>
  <div class="dot small-dot"></div>
  <div class="dot small-dot"></div>
  <div class="dot large-dot"></div>
  <div class="dot large-dot"></div>
  <div class="dot small-dot"></div>
  <div class="dot small-dot"></div>
  <div class="dot large-dot"></div>
  <div class="dot large-dot"></div>
  <div class="dot small-dot"></div>
  <div class="dot small-dot"></div>
  <div class="dot small-dot"></div>
  <div class="dot small-dot"></div>
  <div class="dot small-dot"></div>
`;

const shellTemplates = {
  gbc: `
    <div class="console-shell system-shell--gbc">
      <div class="gameboy" id="GameBoy">
        <div class="screen-area">
          <div class="power">
            <div class="indicator">
              <div class="led"></div>
              <span class="arc" style="z-index:2"></span>
              <span class="arc" style="z-index:1"></span>
              <span class="arc" style="z-index:0"></span>
            </div>
            POWER
          </div>

          <div id="screen-wrap" class="screen-wrap">
            <canvas class="display" id="screen" width="160" height="144" aria-label="Pantalla Game Boy"></canvas>
            <div id="screen-hint" class="screen-hint hidden">Presiona boton para iniciar</div>
            <div id="menu-overlay" class="menu-overlay hidden" aria-hidden="true"></div>
          </div>

          <div class="label">
            <div class="title">GAME BOY</div>
            <div class="subtitle">
              <span class="c">C</span><span class="o1">O</span><span class="l">L</span><span class="o2">O</span><span class="r">R</span>
            </div>
          </div>
        </div>

        <div class="nintendo" id="console-emblem">Nintendo</div>
        <div id="screen-marquee" hidden>GAME BOY COLOR</div>

        <div class="controls">
          <div class="dpad">
            <div class="up" data-button="up"><i class="fa fa-caret-up"></i></div>
            <div class="right" data-button="right"><i class="fa fa-caret-right"></i></div>
            <div class="down" data-button="down"><i class="fa fa-caret-down"></i></div>
            <div class="left" data-button="left"><i class="fa fa-caret-left"></i></div>
            <div class="middle"></div>
          </div>
          <div class="a-b">
            <div class="b" data-button="b">B</div>
            <div class="a" data-button="a">A</div>
          </div>
        </div>

        <div class="start-select">
          <div class="select" data-button="select">SELECT</div>
          <div class="start" data-button="start">START</div>
        </div>

        <div class="speaker">
          ${gbcSpeakerDots}
        </div>
      </div>

      <div class="app-compat-placeholder" aria-hidden="true">
        <div id="ds-screens"></div>
        <canvas id="ds-top-screen" width="256" height="192"></canvas>
        <canvas id="ds-bottom-screen" width="256" height="192"></canvas>
        <button id="console-power-btn" type="button"></button>
      </div>
    </div>
  `,
  gba: `
    <div class="console-shell system-shell--gba">
      <div class="system-container" id="gbasp">
        <div class="screen-body">
          <div class="screen-bumper" id="bumper-ul"></div>
          <div class="screen-bumper" id="bumper-ur"></div>
          <div class="screen-bumper small-bumper" id="bumper-tm"></div>
          <div class="screen-bumper small-bumper" id="bumper-ll"></div>
          <div class="screen-bumper small-bumper" id="bumper-lr"></div>
          <div class="screen-border">
            <div class="screen">
              <div id="screen-wrap" class="screen-wrap">
                <canvas id="screen" width="240" height="160" aria-label="Pantalla Game Boy Advance"></canvas>
                <div id="screen-hint" class="screen-hint hidden">Presiona boton para iniciar</div>
                <div id="menu-overlay" class="menu-overlay hidden" aria-hidden="true"></div>
              </div>
            </div>
            <img src="./assets/gba-sp-logo.svg" alt="Game Boy Advance SP" />
          </div>
        </div>

        <div class="swivel"></div>
        <div id="console-emblem" hidden>Nintendo</div>
        <div id="screen-marquee" hidden>GAME BOY ADVANCE</div>

        <div class="gamepad-body">
          <div class="power-light"></div>
          <div class="power-light"></div>

          <div class="pad-container dpad-container">
            <div class="d-pad">
              <button type="button" class="d-up" data-button="up" aria-label="Arriba"></button>
              <button type="button" class="d-right" data-button="right" aria-label="Derecha"></button>
              <button type="button" class="d-down" data-button="down" aria-label="Abajo"></button>
              <button type="button" class="d-left" data-button="left" aria-label="Izquierda"></button>
            </div>
          </div>

          <div class="pad-container buttons-container">
            <button type="button" class="b-button" data-button="b"><span class="letter">B</span></button>
            <button type="button" class="a-button" data-button="a"><span class="letter">A</span></button>
          </div>

          <div class="pad-container power-container">
            <button id="console-power-btn" type="button" class="b-button power-button" aria-label="Power"></button>
          </div>

          <div class="speaker-holder">
            ${gbaSpeakerDots}
          </div>

          <div class="pad-container select-container">
            <button type="button" class="a-button select-button" data-button="select"></button>
          </div>

          <div class="pad-container start-container">
            <button type="button" class="a-button start-button" data-button="start"></button>
          </div>

          <div class="select-label">SELECT</div>
          <div class="select-label shadow">SELECT</div>
          <div class="start-label">START</div>
          <div class="start-label shadow">START</div>
        </div>
      </div>

      <div class="app-compat-placeholder" aria-hidden="true">
        <div id="ds-screens"></div>
        <canvas id="ds-top-screen" width="256" height="192"></canvas>
        <canvas id="ds-bottom-screen" width="256" height="192"></canvas>
      </div>
    </div>
  `,
  ds: `
    <div class="console-shell system-shell--ds">
      <div class="container">
        <div class="topbody">
          <div class="inner-topbody">
            <div class="dark-inner-top">
              <div class="circle-box-left">
                <table class="circles">
                  <tr>
                    <td><div class="mini-circle"></div></td>
                    <td><div class="mini-circle"></div></td>
                    <td><div class="mini-circle"></div></td>
                  </tr>
                  <tr>
                    <td><div class="mini-circle"></div></td>
                    <td><div class="mini-circle"></div></td>
                    <td><div class="mini-circle"></div></td>
                  </tr>
                </table>
              </div>
              <div class="circle-box-right">
                <table class="circles">
                  <tr>
                    <td><div class="mini-circle"></div></td>
                    <td><div class="mini-circle"></div></td>
                    <td><div class="mini-circle"></div></td>
                  </tr>
                  <tr>
                    <td><div class="mini-circle"></div></td>
                    <td><div class="mini-circle"></div></td>
                    <td><div class="mini-circle"></div></td>
                  </tr>
                </table>
              </div>
              <div class="screen-outer">
                <div class="screen-inner">
                  <canvas id="ds-top-screen" width="256" height="192" aria-label="Pantalla superior Nintendo DS"></canvas>
                </div>
              </div>
              <div class="black-square blk-top-left"></div>
              <div class="black-square blk-top-right"></div>
              <div class="black-square blk-bot-left"></div>
              <div class="black-square blk-bot-right"></div>
            </div>
          </div>
        </div>
        <div class="midbar">
          <div class="midbar-line left-line"></div>
          <div class="midbar-line right-line"></div>
          <div class="battery-light battery-left"></div>
          <div class="battery-light battery-right"></div>
          <div class="mic-hole"></div>
          <p class="mic-text">mic</p>
        </div>
        <div class="botbody">
          <div class="dark-inner-bot">
            <div class="screen-outer">
              <div class="screen-inner">
                <canvas id="ds-bottom-screen" width="256" height="192" aria-label="Pantalla inferior Nintendo DS"></canvas>
              </div>
            </div>
            <div class="buttons-box">
              <table>
                <tr>
                  <td></td>
                  <td><button type="button" class="game-button" data-button="x">X</button></td>
                  <td></td>
                </tr>
                <tr>
                  <td><button type="button" class="game-button" data-button="y">Y</button></td>
                  <td></td>
                  <td><button type="button" class="game-button" data-button="a">A</button></td>
                </tr>
                <tr>
                  <td></td>
                  <td><button type="button" class="game-button" data-button="b">B</button></td>
                  <td></td>
                </tr>
              </table>
            </div>
            <div class="set-button-box">
              <ul>
                <li>
                  <button type="button" class="set-button" data-button="start"></button>
                  <div class="set-text">Start</div>
                </li>
                <li>
                  <button type="button" class="set-button" data-button="select"></button>
                  <div class="set-text">Select</div>
                </li>
              </ul>
            </div>
            <div class="cross-box">
              <button type="button" class="top-cross" data-button="up"><div class="verti-line verti-top"></div></button>
              <button type="button" class="bot-cross" data-button="down"><div class="verti-line verti-bot"></div></button>
              <button type="button" class="left-cross" data-button="left"><div class="horiz-line horiz-left"></div></button>
              <button type="button" class="right-cross" data-button="right"><div class="horiz-line horiz-right"></div></button>
            </div>
          </div>
        </div>
      </div>

      <div class="app-compat-placeholder" aria-hidden="true">
        <div id="screen-wrap" class="screen-wrap">
          <canvas id="screen" width="160" height="144"></canvas>
          <div id="ds-screens"></div>
          <div id="screen-hint" class="screen-hint hidden">Presiona boton para iniciar</div>
          <div id="menu-overlay" class="menu-overlay hidden" aria-hidden="true"></div>
        </div>
        <button id="console-power-btn" type="button"></button>
        <div id="console-emblem">Nintendo</div>
        <div id="screen-marquee">NINTENDO DS</div>
      </div>
    </div>
  `,
};

function renderSystemShell(system = "gbc") {
  const shellHost = document.querySelector("#console-shell-host");
  if (!shellHost) return;
  shellHost.innerHTML = shellTemplates[system] || shellTemplates.gbc;
}

function refreshElements() {
  elements.body = document.body;
  elements.canvas = document.querySelector("#screen");
  elements.dsTopCanvas = document.querySelector("#ds-top-screen");
  elements.dsBottomCanvas = document.querySelector("#ds-bottom-screen");
  elements.dsScreens = document.querySelector("#ds-screens");
  elements.screenWrap = document.querySelector("#screen-wrap");
  elements.fullscreenStage = document.querySelector("#fullscreen-stage");
  elements.screenHint = document.querySelector("#screen-hint");
  elements.romInput = document.querySelector("#rom-input");
  elements.saveFileInput = document.querySelector("#save-file-input");
  elements.statusLine = document.querySelector("#status-line");
  elements.stateOutput = document.querySelector("#state-output");
  elements.menuOverlay = document.querySelector("#menu-overlay");
  elements.toggleMenuBtn = document.querySelector("#toggle-menu-btn");
  elements.drawerOverlayBtn = document.querySelector("#drawer-overlay-btn");
  elements.drawerToggleBtn = document.querySelector("#drawer-toggle-btn");
  elements.drawerCloseBtn = document.querySelector("#drawer-close-btn");
  elements.drawerBackdrop = document.querySelector("#drawer-backdrop");
  elements.drawer = document.querySelector("#control-drawer");
  elements.quickMenuBtn = document.querySelector("#quick-menu-btn");
  elements.powerBtn = document.querySelector("#power-btn");
  elements.fullscreenBtn = document.querySelector("#fullscreen-btn");
  elements.focusModeBtn = document.querySelector("#focus-mode-btn");
  elements.focusBar = document.querySelector("#focus-bar");
  elements.focusExitBtn = document.querySelector("#focus-exit-btn");
  elements.speedBtn = document.querySelector("#speed-btn");
  elements.consolePowerBtn = document.querySelector("#console-power-btn");
  elements.importSaveBtn = document.querySelector("#import-save-btn");
  elements.exportSaveBtn = document.querySelector("#export-save-btn");
  elements.drawerImportSaveBtn = document.querySelector("#drawer-import-save-btn");
  elements.drawerExportSaveBtn = document.querySelector("#drawer-export-save-btn");
  elements.resetFilterBtn = document.querySelector("#reset-filter-btn");
  elements.overlayContext = document.querySelector("#overlay-context");
  elements.overlayAutoFollow = document.querySelector("#overlay-auto-follow");
  elements.overlayOpacity = document.querySelector("#overlay-opacity");
  elements.volumeRange = document.querySelector("#volume-range");
  elements.scanlinesToggle = document.querySelector("#scanlines-toggle");
  elements.startWithButtonToggle = document.querySelector("#start-with-button-toggle");
  elements.filterSelect = document.querySelector("#filter-select");
  elements.filterIntensity = document.querySelector("#filter-intensity");
  elements.touchControlsToggle = document.querySelector("#touch-controls-toggle");
  elements.themeSelect = document.querySelector("#theme-select");
  elements.restoreDefaultsBtn = document.querySelector("#restore-defaults-btn");
  elements.resetKeymapBtn = document.querySelector("#reset-keymap-btn");
  elements.contextBadge = document.querySelector("#context-badge");
  elements.overlaySummary = document.querySelector("#overlay-summary");
  elements.brandChip = document.querySelector("#brand-chip");
  elements.systemChip = document.querySelector("#system-chip");
  elements.saveModeChip = document.querySelector("#save-mode-chip");
  elements.systemBadge = document.querySelector("#system-badge");
  elements.systemDescription = document.querySelector("#system-description");
  elements.systemToggleButtons = [...document.querySelectorAll("[data-system-toggle]")];
  elements.controlProfile = document.querySelector("#control-profile");
  elements.controlHint = document.querySelector("#control-hint");
  elements.saveProfile = document.querySelector("#save-profile");
  elements.saveHint = document.querySelector("#save-hint");
  elements.cheatForm = document.querySelector("#cheat-form");
  elements.cheatAddress = document.querySelector("#cheat-address");
  elements.cheatValue = document.querySelector("#cheat-value");
  elements.cheatLabel = document.querySelector("#cheat-label");
  elements.cheatList = document.querySelector("#cheat-list");
  elements.cheatCountBadge = document.querySelector("#cheat-count-badge");
  elements.attackInputs = [...document.querySelectorAll("[data-attack-index]")];
  elements.hardwareButtons = [...document.querySelectorAll("[data-button]")];
  elements.keymapButtons = [...document.querySelectorAll("[data-keymap-action]")];
}

function cleanupEmulationFullscreen() {
  const stage = elements.fullscreenStage || document.querySelector("#fullscreen-stage");
  if (stage) {
    fullscreenState.moved.forEach(({ node, parent, nextSibling }) => {
      if (!node || !parent) return;
      if (nextSibling && nextSibling.parentNode === parent) {
        parent.insertBefore(node, nextSibling);
      } else {
        parent.appendChild(node);
      }
    });
    stage.innerHTML = "";
    stage.hidden = true;
  }
  fullscreenState.moved = [];
  fullscreenState.active = false;
  if (elements.body) {
    elements.body.classList.remove("emulation-fullscreen");
    delete elements.body.dataset.fullscreenSystem;
    delete elements.body.dataset.fullscreenMode;
  }
}

function moveNodeToFullscreen(node, targetParent = elements.fullscreenStage) {
  if (!targetParent || !node || !node.parentNode) return;
  fullscreenState.moved.push({
    node,
    parent: node.parentNode,
    nextSibling: node.nextSibling,
  });
  targetParent.appendChild(node);
}

function fitDsShellInFullscreen(shell) {
  if (!shell) return;
  const horizontalGutter = 0;
  const verticalGutter = 0;
  const visibleDsWidth = 500;
  const visibleDsHeight = 522;
  const visibleTopInset = 29;
  const scale = Math.min(
    (window.innerWidth - horizontalGutter) / visibleDsWidth,
    (window.innerHeight - verticalGutter) / visibleDsHeight
  );
  const nextScale = Math.max(scale, 0.1);
  shell.style.transform = `scale(${nextScale})`;
  shell.style.transformOrigin = "top center";
  shell.style.marginTop = `${Math.round(-visibleTopInset * nextScale)}px`;
}

async function enterEmulationFullscreen(mode = "screens") {
  const stage = elements.fullscreenStage || document.querySelector("#fullscreen-stage");
  if (!stage) return;

  cleanupEmulationFullscreen();
  stage.hidden = false;
  fullscreenState.active = true;

  if (elements.body) {
    elements.body.classList.add("emulation-fullscreen");
    elements.body.dataset.fullscreenSystem = uiState.currentSystem;
    elements.body.dataset.fullscreenMode = mode;
  }

  if (uiState.currentSystem === "ds") {
    if (mode === "shell") {
      const dsContainer = document.querySelector(".console-shell.system-shell--ds .container");
      if (dsContainer) {
        const dsShell = document.createElement("div");
        dsShell.className = "console-shell system-shell--ds fullscreen-ds-shell";
        stage.appendChild(dsShell);
        moveNodeToFullscreen(dsContainer, dsShell);
        fitDsShellInFullscreen(dsShell);
      }
    } else {
      moveNodeToFullscreen(elements.dsTopCanvas);
      moveNodeToFullscreen(elements.dsBottomCanvas);
    }
  } else {
    moveNodeToFullscreen(elements.canvas);
  }

  try {
    if (!document.fullscreenElement && stage.requestFullscreen) {
      await stage.requestFullscreen();
    }
  } catch (error) {
    console.warn("No se pudo activar fullscreen nativo", error);
  }
}

async function exitEmulationFullscreen() {
  if (document.fullscreenElement) {
    try {
      await document.exitFullscreen();
    } catch (error) {
      console.warn("No se pudo salir de fullscreen nativo", error);
    }
  }
  cleanupEmulationFullscreen();
}

refreshElements();

function getInitialSystemFromPage() {
  const pageSystem = (elements.body?.dataset?.system || "").toLowerCase();
  if (pageSystem === "gba" || pageSystem === "ds" || pageSystem === "gbc") {
    return pageSystem;
  }
  return "gbc";
}

const uiState = {
  ...defaultPrefs,
  currentSystem: getInitialSystemFromPage(),
  loadedRom: null,
  awaitingStart: false,
  dsStarted: false,
  dsPaused: false,
  paused: false,
  lastInput: "none",
  lastStatusExtra: "",
  keymapCaptureAction: "",
};

let gbaCore = null;
let gbaBiosBuffer = null;
let dsReadyPromise = null;

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
    uiState.keyBindings = { ...defaultKeyBindings, ...(stored.keyBindings || {}) };
  } catch (error) {
    console.warn("No se pudieron restaurar preferencias", error);
  }
}

function persistPrefs() {
  const payload = {
    systemPreference: uiState.systemPreference,
    drawerOpen: uiState.drawerOpen,
    focusMode: uiState.focusMode,
    startWithButton: uiState.startWithButton,
    overlayVisible: uiState.overlayVisible,
    overlayContext: uiState.overlayContext,
    overlayAutoFollow: uiState.overlayAutoFollow,
    overlayOpacity: uiState.overlayOpacity,
    volume: uiState.volume,
    scanlines: uiState.scanlines,
    theme: uiState.theme,
    filterMode: uiState.filterMode,
    filterIntensity: uiState.filterIntensity,
    touchControls: uiState.touchControls,
    attackLabels: uiState.attackLabels,
    cheats: uiState.cheats,
    speed: uiState.speed,
    keyBindings: uiState.keyBindings,
  };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function isGbcReady() {
  return typeof window.gameboy === "object" && window.gameboy !== null;
}

function isGbaReady() {
  return typeof gbaCore === "object" && gbaCore !== null && gbaCore.hasRom();
}

function isDsReady() {
  return typeof window.WebMelon === "object" && window.WebMelon.emulator.hasEmulator();
}

function isReady() {
  if (uiState.currentSystem === "gba") return isGbaReady();
  if (uiState.currentSystem === "ds") return isDsReady();
  return isGbcReady();
}

function isPlaying() {
  if (uiState.currentSystem === "gba") {
    return isGbaReady() && !gbaCore.paused;
  }
  if (uiState.currentSystem === "ds") {
    return isDsReady() && uiState.dsStarted && !uiState.dsPaused;
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
  const ext = getFileExtension(file.name);
  if (ext === "gba") return "gba";
  if (ext === "nds") return "ds";
  return "gbc";
}

function resolveTargetSystem(file) {
  const fileSystem = getSystemFromFile(file);
  if (uiState.systemPreference === "auto") {
    return {
      system: fileSystem,
      forcedByRom: false,
    };
  }
  if (uiState.systemPreference !== fileSystem) {
    return {
      system: fileSystem,
      forcedByRom: true,
      previousPreference: uiState.systemPreference,
    };
  }
  return {
    system: uiState.systemPreference,
    forcedByRom: false,
  };
}

function validateRomFile(file) {
  const ext = getFileExtension(file.name);
  if (ext === "zip" || ext === "7z" || ext === "rar") {
    return "Sube la ROM descomprimida, no .zip/.7z/.rar.";
  }
  if (ext !== "gb" && ext !== "gbc" && ext !== "gba" && ext !== "nds") {
    return "Formato no soportado. Usa .gb, .gbc, .gba o .nds.";
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
  const shouldRenderShell = uiState.currentSystem !== system
    || document.querySelector("#console-shell-host .console-shell")?.dataset.shellSystem !== system;
  if (uiState.currentSystem !== system) {
    elements.body.classList.add("system-switching");
    window.setTimeout(() => {
      elements.body.classList.remove("system-switching");
    }, 320);
  }
  uiState.currentSystem = system;
  elements.body.dataset.system = system;
  if (shouldRenderShell) {
    renderSystemShell(system);
    refreshElements();
    bindDynamicElements();
  }
  syncCanvasResolution(system);
  if (gbaCore && elements.canvas) {
    gbaCore.setCanvas(elements.canvas);
  }
}

function ensureShellElements(system = uiState.currentSystem) {
  const missingShellCanvas = system === "ds"
    ? !elements.dsTopCanvas || !elements.dsBottomCanvas
    : !elements.canvas;

  if (!missingShellCanvas) return;

  renderSystemShell(system);
  refreshElements();
  bindDynamicElements();
}

function syncCanvasResolution(system = uiState.currentSystem) {
  ensureShellElements(system);
  if (system === "gba") {
    if (!elements.canvas) return;
    elements.canvas.width = 240;
    elements.canvas.height = 160;
    return;
  }
  if (system === "ds") {
    if (!elements.dsTopCanvas || !elements.dsBottomCanvas) return;
    elements.dsTopCanvas.width = 256;
    elements.dsTopCanvas.height = 192;
    elements.dsBottomCanvas.width = 256;
    elements.dsBottomCanvas.height = 192;
    return;
  }
  if (!elements.canvas) return;
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

function currentSavePayload() {
  if (!isReady()) {
    throw new Error("No hay emulacion activa para exportar.");
  }

  if (uiState.currentSystem === "ds") {
    throw new Error("La exportacion DS aun no esta conectada. Por ahora usa el guardado interno.");
  }

  if (uiState.currentSystem === "gba") {
    if (!gbaCore.mmu.save) {
      throw new Error("La ROM GBA aun no genero SRAM.");
    }
    gbaCore.storeSavedata();
    const storageKey = `${gbaCore.SYS_ID}.${gbaCore.mmu.cart.code}`;
    return {
      type: "gba-sram",
      system: uiState.currentSystem,
      rom: uiState.loadedRom,
      payload: window.localStorage.getItem(storageKey),
    };
  }

  const keyName = gbcSaveSlotName("export");
  window.saveState(keyName);
  return {
    type: "gbc-state",
    system: uiState.currentSystem,
    rom: uiState.loadedRom,
    payload: window.localStorage.getItem(keyName),
  };
}

function downloadJsonFile(filename, payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function exportCurrentSave() {
  try {
    const payload = currentSavePayload();
    const romName = uiState.loadedRom ? uiState.loadedRom.name.replace(/\.[^.]+$/, "") : "save";
    downloadJsonFile(`${romName}-${uiState.currentSystem}-save.json`, payload);
    updateStatus("Save exportado.");
  } catch (error) {
    updateStatus(error.message);
  }
}

async function importCurrentSave(file) {
  if (!file) return;
  try {
    const raw = await file.text();
    const data = JSON.parse(raw);
    if (data.system !== uiState.currentSystem) {
      throw new Error("El save importado no coincide con el sistema activo.");
    }
    if (uiState.currentSystem === "ds") {
      throw new Error("La importacion DS aun no esta conectada.");
    }
    if (uiState.currentSystem === "gba") {
      if (!isGbaReady()) throw new Error("Carga primero una ROM GBA.");
      gbaCore.decodeSavedata(data.payload);
    } else {
      if (!isGbcReady()) throw new Error("Carga primero una ROM GB/GBC.");
      const keyName = gbcSaveSlotName("import");
      window.localStorage.setItem(keyName, data.payload);
      window.openState(keyName, elements.canvas);
      setVolume(uiState.volume);
      applySpeed();
    }
    updateStatus("Save importado correctamente.");
    renderStatePanel();
  } catch (error) {
    updateStatus(`No se pudo importar el save: ${error.message}`);
  } finally {
    elements.saveFileInput.value = "";
  }
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
  elements.filterSelect.value = uiState.filterMode;
  elements.filterIntensity.value = String(uiState.filterIntensity);
  elements.touchControlsToggle.checked = uiState.touchControls;
  elements.themeSelect.value = uiState.theme;
  elements.attackInputs.forEach((input, index) => {
    input.value = uiState.attackLabels[index];
  });
  renderKeymapButtons();
}

function applyVisualPrefs() {
  elements.body.dataset.theme = uiState.theme;
  elements.body.dataset.system = uiState.currentSystem;
  elements.body.dataset.filter = uiState.filterMode;
  elements.body.classList.toggle("drawer-open", uiState.drawerOpen);
  elements.body.classList.toggle("focus-mode", uiState.focusMode && uiState.currentSystem !== "ds");
  elements.body.classList.toggle("touch-visible", uiState.touchControls);
  elements.body.style.setProperty("--filter-intensity", String(uiState.filterIntensity / 100));
  elements.menuOverlay.style.setProperty("--overlay-alpha", String(uiState.overlayOpacity / 100));
  elements.screenWrap.classList.toggle("scanlines", uiState.scanlines);
  const showStartHint = Boolean(uiState.awaitingStart && uiState.loadedRom);
  elements.screenHint.classList.toggle("hidden", !showStartHint);
  elements.screenHint.hidden = !showStartHint;
  elements.screenHint.setAttribute("aria-hidden", String(!showStartHint));
  elements.screenHint.style.display = showStartHint ? "" : "none";
  elements.screenHint.style.pointerEvents = showStartHint ? "auto" : "none";
  elements.screenHint.textContent = showStartHint ? "Presiona boton para iniciar" : "";
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
  if (elements.focusModeBtn) {
    elements.focusModeBtn.textContent = uiState.focusMode ? "Salir enfoque" : "Modo enfoque";
    elements.focusModeBtn.setAttribute("aria-pressed", String(uiState.focusMode));
  }
  if (elements.focusBar) {
    elements.focusBar.hidden = !uiState.focusMode;
  }
}

function keyLabelForKey(key) {
  if (!key) return "Sin tecla";
  return key.length === 1 ? key.toUpperCase() : key;
}

function renderKeymapButtons() {
  elements.keymapButtons.forEach((button) => {
    const action = button.dataset.keymapAction;
    const boundKey = Object.keys(uiState.keyBindings).find((key) => uiState.keyBindings[key] === action);
    const label = button.textContent.split(":")[0];
    button.textContent = `${label}: ${uiState.keymapCaptureAction === action ? "Pulsa tecla..." : keyLabelForKey(boundKey)}`;
    button.classList.toggle("listening", uiState.keymapCaptureAction === action);
  });
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

function resumeGbcEmulator() {
  if (!isGbcReady()) return;

  if (typeof window.run === "function") {
    window.run();
  }

  if (isPlaying()) return;

  window.gameboy.stopEmulator &= 1;
  window.gameboy.firstIteration = Date.now();
  window.gameboy.iterations = 0;
  window.gameboy.run();

  if (!isPlaying()) return;

  if (window.gbRunInterval) {
    window.clearInterval(window.gbRunInterval);
  }
  const intervalMs = Array.isArray(window.settings) ? window.settings[6] : 8;
  window.gbRunInterval = window.setInterval(() => {
    if (!document.hidden && !document.msHidden && !document.mozHidden && !document.webkitHidden) {
      window.gameboy.run();
    }
  }, intervalMs);
}

function startCurrentEmulator() {
  if (uiState.currentSystem === "ds") {
    if (!isDsReady()) return;
    window.WebMelon.emulator.resume();
    uiState.dsPaused = false;
    return;
  }
  if (uiState.currentSystem === "gba") {
    if (!isGbaReady()) return;
    gbaCore.runStable();
    return;
  }
  if (isGbcReady()) {
    resumeGbcEmulator();
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
  } else if (uiState.currentSystem === "ds") {
    if (uiState.dsPaused) {
      window.WebMelon.emulator.resume();
      uiState.dsPaused = false;
    } else {
      window.WebMelon.emulator.pause();
      uiState.dsPaused = true;
    }
  } else if (isPlaying()) {
    window.pause();
  } else {
    resumeGbcEmulator();
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
  const isDs = uiState.currentSystem === "ds";
  elements.brandChip.textContent = isDs ? "Pocket Codex DS" : isGba ? "Pocket Codex Advance" : "Pocket Codex Color";
  const screenMarquee = document.querySelector("#screen-marquee");
  const consoleEmblem = document.querySelector("#console-emblem");
  if (screenMarquee) {
    screenMarquee.textContent = isDs ? "NINTENDO DS" : isGba ? "GAME BOY ADVANCE" : "GAME BOY COLOR";
  }
  if (consoleEmblem) {
    consoleEmblem.textContent = "Nintendo";
  }
  elements.systemChip.textContent = isDs ? "Sistema DS" : isGba ? "Sistema GBA" : "Sistema GB/GBC";
  elements.saveModeChip.textContent = isDs ? "Savefile DS" : isGba ? "SRAM por slots" : "Save states";
  elements.systemBadge.textContent = isDs ? "ds" : isGba ? "gba" : "gbc";
  elements.systemDescription.textContent = isDs
    ? "Modo Nintendo DS activo. Se usan dos pantallas y savefiles del cartucho via WebMelon."
    : isGba
    ? "Modo Advance activo. La pantalla usa proporcion GBA, los hombros L/R quedan activos y los slots guardan SRAM del juego."
    : "Modo Game Boy o Game Boy Color activo. Los slots guardan save states completos del emulador para volver exactamente al mismo punto.";
  elements.controlProfile.textContent = isDs ? "Perfil DS" : isGba ? "Perfil GBA" : "Perfil GB/GBC";
  elements.controlHint.textContent = isDs
    ? "Flechas o remapeo para DS. La pantalla inferior acepta toque directo con mouse o touch."
    : isGba
    ? "Flechas, Z, X, Enter, Backspace y hombros L/R con A y S."
    : "Flechas, Z, X, Enter y Backspace para la cruceta y botones clasicos.";
  elements.saveProfile.textContent = isDs ? "Guardado DS" : isGba ? "Guardado SRAM" : "Guardado por estado";
  elements.saveHint.textContent = isDs
    ? "Los saves DS usan archivos del cartucho y almacenamiento del navegador."
    : isGba
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

function setFocusMode(nextFocus) {
  uiState.focusMode = nextFocus;
  uiState.drawerOpen = false;

  if (uiState.currentSystem === "ds") {
    persistAndRender();
    if (nextFocus) {
      enterEmulationFullscreen("shell").catch((err) => console.log(err));
    } else {
      exitEmulationFullscreen().catch((err) => console.log(err));
    }
    return;
  }

  if (nextFocus) {
    document.documentElement.requestFullscreen().catch((err) => console.log(err));
  } else if (document.fullscreenElement) {
    document.exitFullscreen().catch((err) => console.log(err));
  }
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
  if (uiState.currentSystem === "ds" && typeof window.WebMelon === "object") {
    applyDsInputSettings();
  }
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
  if (uiState.currentSystem === "ds") {
    const key = Object.keys(uiState.keyBindings).find((candidate) => uiState.keyBindings[candidate] === button);
    if (!key) return;
    window.dispatchEvent(new KeyboardEvent("keydown", { key }));
    return;
  }
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
  if (uiState.currentSystem === "ds") {
    const key = Object.keys(uiState.keyBindings).find((candidate) => uiState.keyBindings[candidate] === button);
    if (!key) return;
    window.dispatchEvent(new KeyboardEvent("keyup", { key }));
    return;
  }
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
  if (isDsReady()) {
    try {
      window.WebMelon.emulator.shutdown();
    } catch (error) {
      console.warn("No se pudo detener DS", error);
    }
    uiState.dsStarted = false;
    uiState.dsPaused = false;
  }
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

function applyDsInputSettings() {
  if (!window.WebMelon) return;
  const settings = window.WebMelon.input.getInputSettings();
  const nextKeybinds = {};
  const dsButtonMap = {
    up: "DPAD_UP",
    down: "DPAD_DOWN",
    left: "DPAD_LEFT",
    right: "DPAD_RIGHT",
    a: "A",
    b: "B",
    x: "X",
    y: "Y",
    start: "START",
    select: "SELECT",
    l: "L",
    r: "R",
  };
  Object.entries(uiState.keyBindings).forEach(([key, action]) => {
    const dsButtonName = dsButtonMap[action];
    if (!dsButtonName) return;
    nextKeybinds[key] = window.WebMelon.constants.DS_INPUT_MAP[dsButtonName];
  });
  settings.keybinds = nextKeybinds;
  window.WebMelon.input.setInputSettings(settings);
}

function ensureDsRuntime() {
  if (dsReadyPromise) {
    return dsReadyPromise;
  }
  dsReadyPromise = new Promise((resolve) => {
    window.WebMelon.assembly.addLoadListener(() => {
      applyDsInputSettings();
      resolve(window.WebMelon);
    });
  });
  return dsReadyPromise;
}

async function loadGbcRom(file) {
  setCurrentSystem("gbc");
  const buffer = await file.arrayBuffer();
  const binary = binaryStringFromArrayBuffer(buffer);
  window.start(elements.canvas, binary);
  uiState.loadedRom = {
    name: file.name,
    size: buffer.byteLength,
  };
  uiState.lastInput = "rom_loaded";
  uiState.paused = false;
  setVolume(uiState.volume);
  applySpeed();
  uiState.awaitingStart = false;
  resumeGbcEmulator();
  updateStatus("Core GB/GBC inicializado.");
  renderStatePanel();
}

async function loadGbaRom(file) {
  setCurrentSystem("gba");
  const core = await ensureGbaCore();
  const buffer = await file.arrayBuffer();
  const result = core.setRom(buffer);
  if (!result) {
    throw new Error("No se pudo iniciar la ROM GBA.");
  }
  uiState.loadedRom = {
    name: file.name,
    size: buffer.byteLength,
  };
  uiState.lastInput = "rom_loaded";
  uiState.paused = false;
  setVolume(uiState.volume);
  applySpeed();
  uiState.awaitingStart = false;
  core.runStable();
  updateStatus("Core GBA inicializado.");
  renderStatePanel();
}

async function loadDsRom(file) {
  setCurrentSystem("ds");
  const ds = await ensureDsRuntime();
  const romData = new Uint8Array(await file.arrayBuffer());

  ds.cart.createCart();
  ds.storage.createDirectory("/roms");
  ds.storage.write("/roms/game.nds", romData);
  ds.emulator.createEmulator();
  if (!ds.cart.loadFileIntoCart("/roms/game.nds")) {
    throw new Error("No se pudo cargar la ROM DS.");
  }

  await new Promise((resolve) => {
    ds.storage.onPrepare(() => {
      const gameCode = ds.cart.getUnloadedCartCode();
      ds.emulator.setSavePath(`/savefiles/${gameCode}.sav`);
      ds.emulator.loadFreeBIOS();
      ds.emulator.loadCart();
      ds.emulator.startEmulation("ds-top-screen", "ds-bottom-screen");
      uiState.dsStarted = true;
      uiState.dsPaused = false;
      resolve(null);
    });
    ds.storage.prepareVirtualFilesystem();
  });
  uiState.loadedRom = {
    name: file.name,
    size: romData.byteLength,
  };
  uiState.lastInput = "rom_loaded";
  uiState.awaitingStart = false;
  applyDsInputSettings();
  updateStatus("Core DS inicializado.");
  renderStatePanel();
}

async function loadRom(file) {
  teardownCurrentEmulator();
  uiState.awaitingStart = false;
  const target = resolveTargetSystem(file);
  if (target.forcedByRom) {
    uiState.systemPreference = target.system;
    persistAndRender();
    updateStatus(`La ROM cambio el sistema a ${target.system.toUpperCase()} automaticamente.`);
  }
  if (target.system === "gba") {
    await loadGbaRom(file);
  } else if (target.system === "ds") {
    await loadDsRom(file);
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

  if (uiState.currentSystem === "ds") {
    updateStatus("DS usa savefiles internos. Usa Importar/Exportar save.");
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

  if (uiState.currentSystem === "ds") {
    updateStatus("DS usa savefiles internos. Usa Importar/Exportar save.");
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
    system === "ds" && isDsReady()
      ? {
          title: window.WebMelon.emulator.getGameTitle(),
          started: uiState.dsStarted,
          paused: uiState.dsPaused,
          canvas: {
            top: { width: elements.dsTopCanvas.width, height: elements.dsTopCanvas.height },
            bottom: { width: elements.dsBottomCanvas.width, height: elements.dsBottomCanvas.height },
          },
        }
      : system === "gba" && isGbaReady()
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
      visual: {
        filterMode: uiState.filterMode,
        filterIntensity: uiState.filterIntensity,
        touchControls: uiState.touchControls,
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
  if (uiState.currentSystem === "ds") {
    window.setTimeout(() => {
      renderStatePanel();
    }, ms);
    return;
  }
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
  const triggerInput = (event) => {
    event.preventDefault();
    const now = performance.now();
    if (buttonElement.__inputGuardUntil && buttonElement.__inputGuardUntil > now) {
      return;
    }
    buttonElement.__inputGuardUntil = now + 120;
    buttonElement.classList.add("is-pressed");
    window.setTimeout(() => {
      buttonElement.classList.remove("is-pressed");
    }, 120);
    holdButton(button, 85);
    afterInput(button);
  };

  buttonElement.addEventListener("pointerdown", triggerInput);
  buttonElement.addEventListener("click", triggerInput);
}

function bindDynamicElements() {
  if (elements.menuOverlay && !elements.menuOverlay.dataset.bound) {
    elements.menuOverlay.dataset.bound = "true";
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
  }

  if (elements.consolePowerBtn && !elements.consolePowerBtn.dataset.bound) {
    elements.consolePowerBtn.dataset.bound = "true";
    elements.consolePowerBtn.addEventListener("click", () => {
      elements.consolePowerBtn.classList.add("is-pressed");
      window.setTimeout(() => {
        elements.consolePowerBtn.classList.remove("is-pressed");
      }, 140);
      togglePowerState();
    });
  }

  elements.hardwareButtons.forEach((button) => {
    if (button.dataset.bound) return;
    button.dataset.bound = "true";
    bindInputButton(button);
  });
}

loadPrefs();
renderSystemShell(uiState.currentSystem);
refreshElements();
syncCanvasResolution(uiState.currentSystem);
syncFormState();
applyVisualPrefs();
renderStatePanel();
updateStatus();
bindDynamicElements();

elements.systemToggleButtons.forEach((button) => {
  button.addEventListener("click", () => {
    uiState.systemPreference = button.dataset.systemToggle;
    const previewSystem = uiState.systemPreference === "auto"
      ? uiState.loadedRom
        ? getSystemFromFile(uiState.loadedRom)
        : getInitialSystemFromPage()
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
  if (uiState.keymapCaptureAction) {
    event.preventDefault();
    if (key === "escape") {
      uiState.keymapCaptureAction = "";
      renderKeymapButtons();
      updateStatus("Escucha de remapeo cancelada.");
      return;
    }
    Object.keys(uiState.keyBindings).forEach((boundKey) => {
      if (uiState.keyBindings[boundKey] === uiState.keymapCaptureAction) {
        delete uiState.keyBindings[boundKey];
      }
    });
    uiState.keyBindings[key] = uiState.keymapCaptureAction;
    const action = uiState.keymapCaptureAction;
    uiState.keymapCaptureAction = "";
    persistAndRender();
    updateStatus(`Tecla ${keyLabelForKey(key)} asignada a ${action}.`);
    return;
  }
  if (key === "escape" && uiState.drawerOpen) {
    event.preventDefault();
    setDrawerOpen(false);
    return;
  }
  if (key === "escape" && fullscreenState.active) {
    event.preventDefault();
    if (uiState.focusMode) {
      setFocusMode(false);
    } else {
      exitEmulationFullscreen();
    }
    return;
  }
  if (key === "escape" && uiState.focusMode) {
    event.preventDefault();
    setFocusMode(false);
    return;
  }
  if (key === "f") {
    event.preventDefault();
    toggleFullscreen();
    return;
  }
  const mapped = uiState.keyBindings[key];
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
  const mapped = uiState.keyBindings[key];
  if (!mapped || !isReady()) return;
  event.preventDefault();
  releaseInput(mapped);
  renderStatePanel();
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

elements.fullscreenBtn.addEventListener("click", () => {
  toggleFullscreen();
});

if (elements.focusModeBtn) {
  elements.focusModeBtn.addEventListener("click", () => {
    setFocusMode(!uiState.focusMode);
  });
}

if (elements.focusExitBtn) {
  elements.focusExitBtn.addEventListener("click", () => {
    setFocusMode(false);
  });
}

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

document.addEventListener("fullscreenchange", () => {
  if (!document.fullscreenElement && uiState.focusMode) {
    setFocusMode(false);
  }
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

elements.filterSelect.addEventListener("change", (event) => {
  uiState.filterMode = event.target.value;
  persistAndRender();
});

elements.filterIntensity.addEventListener("input", (event) => {
  uiState.filterIntensity = Number(event.target.value);
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

elements.touchControlsToggle.addEventListener("change", (event) => {
  uiState.touchControls = event.target.checked;
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

elements.resetFilterBtn.addEventListener("click", () => {
  uiState.filterMode = defaultPrefs.filterMode;
  uiState.filterIntensity = defaultPrefs.filterIntensity;
  persistAndRender();
  updateStatus("Filtro visual restaurado.");
});

elements.importSaveBtn.addEventListener("click", () => {
  elements.saveFileInput.click();
});

elements.drawerImportSaveBtn.addEventListener("click", () => {
  elements.saveFileInput.click();
});

elements.exportSaveBtn.addEventListener("click", exportCurrentSave);
elements.drawerExportSaveBtn.addEventListener("click", exportCurrentSave);

elements.saveFileInput.addEventListener("change", (event) => {
  const file = event.target.files && event.target.files[0];
  importCurrentSave(file);
});

elements.keymapButtons.forEach((button) => {
  button.addEventListener("click", () => {
    uiState.keymapCaptureAction = button.dataset.keymapAction;
    renderKeymapButtons();
    updateStatus(`Pulsa la nueva tecla para ${button.dataset.keymapAction}. Escape cancela.`);
  });
});

elements.resetKeymapBtn.addEventListener("click", () => {
  uiState.keyBindings = { ...defaultKeyBindings };
  uiState.keymapCaptureAction = "";
  persistAndRender();
  updateStatus("Remapeo restaurado.");
});

elements.cheatForm.addEventListener("submit", addCheat);
window.setInterval(() => {
  applyCheats();
  renderStatePanel();
}, 180);

document.addEventListener("fullscreenchange", () => {
  if (!document.fullscreenElement && fullscreenState.active) {
    cleanupEmulationFullscreen();
  }
});

async function toggleFullscreen() {
  if (fullscreenState.active || document.fullscreenElement) {
    await exitEmulationFullscreen();
    return;
  }
  await enterEmulationFullscreen("screens");
}
