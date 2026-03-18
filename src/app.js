const STORAGE_KEY = "gbc-web-prototype-prefs-v3";
const GBC_SAVE_PREFIX = "FREEZE_CUSTOM_";
const GBA_SAVE_PREFIX = "GBA_SAVE_SLOT_";
const GBA_BIOS_URL = "./vendor/gba-js/resources/bios.bin";
const DESKTOP_SYSTEMS = new Set(["snes", "n64", "ps1"]);
const EMULATORJS_SYSTEMS = new Set([...DESKTOP_SYSTEMS, "psp"]);
const CLOUD_SUPPORTED_SYSTEMS = new Set(["gbc", "gba", "ds", ...EMULATORJS_SYSTEMS]);
const LIBRARY_MAX_ITEMS = 10;
const DESKTOP_CLOUD_SYNC_INTERVAL = 12000;
const DESKTOP_EMULATOR_VERSION = "stable";
const DESKTOP_PATH_TO_DATA = `https://cdn.emulatorjs.org/${DESKTOP_EMULATOR_VERSION}/data/`;
const DESKTOP_CORE_CONFIG = {
  snes: {
    core: "snes",
    label: "SNES",
    extensions: ["smc", "sfc", "fig", "bs"],
  },
  n64: {
    core: "n64",
    label: "N64",
    extensions: ["z64", "n64", "v64"],
  },
  ps1: {
    core: "psx",
    label: "PS1",
    extensions: ["bin", "img", "pbp", "chd", "iso", "cue"],
    requiresBios: true,
  },
  psp: {
    core: "psp",
    label: "PSP",
    extensions: ["iso", "cso", "pbp", "elf"],
    requiresThreads: true,
  },
};
const ALL_SUPPORTED_ROM_EXTENSIONS = new Set([
  "gb", "gbc", "gba", "nds",
  ...Object.values(DESKTOP_CORE_CONFIG).flatMap((config) => config.extensions),
]);

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
  cloudUrl: "",
  cloudAnonKey: "",
  cloudEmail: "",
  libraryEntries: [],
  libraryView: "shelf",
};

const elements = {};
const fullscreenState = {
  active: false,
  moved: [],
};
const pspAnalogState = {
  pointerId: null,
  activeDirections: new Set(),
};
const desktopRuntime = {
  active: false,
  currentSystem: "",
  iframe: null,
  romFile: null,
  romObjectUrl: "",
  biosFile: null,
  biosObjectUrl: "",
  assetObjectUrls: [],
  pendingLaunch: null,
  bridgeReady: false,
  savePath: "",
};
const cloudState = {
  client: null,
  session: null,
  user: null,
  status: "offline",
  message: "Conecta tu proyecto Supabase para sincronizar saves locales y de core web.",
  syncInFlight: false,
  saveState: "local",
  saveMessage: "Sincronizacion local solamente.",
  lastLocalHash: "",
  lastSyncedHash: "",
  lastSyncedAt: "",
};
const desktopBridge = {
  requestId: 0,
  pending: new Map(),
  autoSyncLock: false,
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
            <div id="screen-hint" class="screen-hint hidden"></div>
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
                <div id="screen-hint" class="screen-hint hidden"></div>
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
          <div id="screen-hint" class="screen-hint hidden"></div>
          <div id="menu-overlay" class="menu-overlay hidden" aria-hidden="true"></div>
        </div>
        <button id="console-power-btn" type="button"></button>
        <div id="console-emblem">Nintendo</div>
        <div id="screen-marquee">NINTENDO DS</div>
      </div>
    </div>
  `,
  snes: `
    <div class="console-shell system-shell--desktop system-shell--snes" data-shell-system="snes">
      <section class="desktop-rig desktop-rig--snes">
        <div class="desktop-header">
          <div>
            <p class="desktop-kicker">Nintendo</p>
            <h3>Super NES</h3>
          </div>
          <span id="console-emblem" class="desktop-badge">Control Deck</span>
        </div>
        <div class="desktop-hero-strip desktop-hero-strip--snes" aria-hidden="true">
          <span></span><span></span><span></span><span></span>
        </div>
        <div class="desktop-screen-board">
          <div class="desktop-console-sculpt desktop-console-sculpt--snes" aria-hidden="true">
            <div class="snes-ridge snes-ridge--left"></div>
            <div class="snes-ridge snes-ridge--right"></div>
            <div class="snes-switches">
              <span>Power</span>
              <span>Reset</span>
            </div>
          </div>
          <div class="desktop-leds" aria-hidden="true"><span></span><span></span><span></span></div>
          <div id="screen-wrap" class="screen-wrap desktop-screen-wrap">
            <canvas id="screen" width="256" height="224" aria-label="Pantalla Super Nintendo"></canvas>
            <div id="screen-hint" class="screen-hint hidden"></div>
            <div id="menu-overlay" class="menu-overlay hidden" aria-hidden="true"></div>
          </div>
          <div id="screen-marquee" class="desktop-marquee">SUPER NINTENDO ENTERTAINMENT SYSTEM</div>
        </div>
        <div class="desktop-footer">
          <div class="desktop-slot desktop-slot--cart">
            <span class="desktop-slot-label">game pak</span>
          </div>
          <div class="desktop-meta">
            <span>4:3</span>
            <span>North America shell</span>
          </div>
          <button id="console-power-btn" type="button" class="desktop-power-button" aria-label="Power"></button>
        </div>
      </section>
    </div>
  `,
  n64: `
    <div class="console-shell system-shell--desktop system-shell--n64" data-shell-system="n64">
      <section class="desktop-rig desktop-rig--n64">
        <div class="desktop-header">
          <div>
            <p class="desktop-kicker">Nintendo</p>
            <h3>Nintendo 64</h3>
          </div>
          <span id="console-emblem" class="desktop-badge">Control Deck</span>
        </div>
        <div class="desktop-hero-strip desktop-hero-strip--n64" aria-hidden="true">
          <span></span><span></span><span></span><span></span>
        </div>
        <div class="desktop-screen-board">
          <div class="desktop-console-sculpt desktop-console-sculpt--n64" aria-hidden="true">
            <div class="n64-cart-slot"></div>
            <div class="n64-jewel">
              <span></span><span></span><span></span><span></span>
            </div>
            <div class="n64-switches">
              <span>Power</span>
              <span>Reset</span>
            </div>
          </div>
          <div class="desktop-leds" aria-hidden="true"><span></span><span></span><span></span></div>
          <div id="screen-wrap" class="screen-wrap desktop-screen-wrap desktop-screen-wrap--wide">
            <canvas id="screen" width="320" height="240" aria-label="Pantalla Nintendo 64"></canvas>
            <div id="screen-hint" class="screen-hint hidden"></div>
            <div id="menu-overlay" class="menu-overlay hidden" aria-hidden="true"></div>
          </div>
          <div id="screen-marquee" class="desktop-marquee">NINTENDO 64 DISPLAY DECK</div>
        </div>
        <div class="desktop-footer">
          <div class="desktop-port-bank" aria-hidden="true">
            <span></span><span></span><span></span><span></span>
          </div>
          <div class="desktop-meta">
            <span>4:3</span>
            <span>charcoal launch shell</span>
          </div>
          <button id="console-power-btn" type="button" class="desktop-power-button" aria-label="Power"></button>
        </div>
      </section>
    </div>
  `,
  ps1: `
    <div class="console-shell system-shell--desktop system-shell--ps1" data-shell-system="ps1">
      <section class="desktop-rig desktop-rig--ps1">
        <div class="desktop-header">
          <div>
            <p class="desktop-kicker">Sony Computer Entertainment</p>
            <div class="ps-wordmark" aria-label="PlayStation">
              <span class="ps-mark">
                <span class="ps-mark-p"></span>
                <span class="ps-mark-s"></span>
              </span>
              <span class="ps-word">PlayStation</span>
            </div>
          </div>
          <span id="console-emblem" class="desktop-badge">SCPH</span>
        </div>
        <div class="desktop-hero-strip desktop-hero-strip--ps1" aria-hidden="true">
          <span></span><span></span><span></span><span></span>
        </div>
        <div class="desktop-screen-board">
          <div class="desktop-console-sculpt desktop-console-sculpt--ps1" aria-hidden="true">
            <div class="ps1-disc-lid">
              <div class="ps1-disc-ring"></div>
            </div>
          </div>
          <div class="desktop-leds" aria-hidden="true"><span></span><span></span><span></span></div>
          <div id="screen-wrap" class="screen-wrap desktop-screen-wrap desktop-screen-wrap--wide">
            <canvas id="screen" width="320" height="240" aria-label="Pantalla PlayStation"></canvas>
            <div id="screen-hint" class="screen-hint hidden"></div>
            <div id="menu-overlay" class="menu-overlay hidden" aria-hidden="true"></div>
          </div>
          <div id="screen-marquee" class="desktop-marquee">PLAYSTATION VIDEO OUT</div>
        </div>
        <div class="desktop-footer">
          <div class="ps1-front-buttons" aria-hidden="true">
            <span>Open</span>
            <span>Reset</span>
          </div>
          <div class="desktop-memory-bays" aria-hidden="true">
            <span>MEMORY CARD 1</span>
            <span>MEMORY CARD 2</span>
          </div>
          <div class="desktop-meta">
            <span>4:3</span>
            <span>model gray deck</span>
          </div>
          <button id="console-power-btn" type="button" class="desktop-power-button" aria-label="Power"></button>
        </div>
      </section>
    </div>
  `,
  psp: `
    <div class="console-shell system-shell--handheld system-shell--psp" data-shell-system="psp">
      <div class="psp-3000">
        <div class="psp-inner">
          <button type="button" class="psp-shoulder-btn psp-shoulder-btn--left" data-button="l" aria-label="L"></button>
          <button type="button" class="psp-shoulder-btn psp-shoulder-btn--right" data-button="r" aria-label="R"></button>
          <div class="oval-half oval-half--top-left"></div>
          <div class="oval-half oval-half--top-right"></div>
          <div class="oval-half oval-half--bottom-left"></div>
          <div class="oval-half oval-half--bottom-right"></div>
          <button id="console-power-btn" type="button" class="psp-side-switch" aria-label="Power"></button>
          <div class="controls controls--left">
            <p class="sony" id="console-emblem">SONY</p>
            <div class="speaker speaker--left"></div>
            <div class="d-pad" aria-hidden="true">
              <button type="button" class="btn-direction up" data-button="up" aria-label="Arriba"></button>
              <button type="button" class="btn-direction right" data-button="right" aria-label="Derecha"></button>
              <button type="button" class="btn-direction down" data-button="down" aria-label="Abajo"></button>
              <button type="button" class="btn-direction left" data-button="left" aria-label="Izquierda"></button>
            </div>
            <div class="analog-stick" data-analog-stick="psp" aria-label="Stick analogico PSP">
              <div class="stick"></div>
            </div>
            <div class="indicator indicator--memory" aria-hidden="true">
              <div class="led led--memory"></div>
              <div class="icon-memory"></div>
            </div>
            <div class="indicator indicator--wifi" aria-hidden="true">
              <div class="led led--wifi"></div>
              <div class="icon-wifi"></div>
            </div>
          </div>
          <div class="display">
            <div id="screen-wrap" class="screen-wrap psp-display-wrap">
              <canvas id="screen" width="480" height="272" aria-label="Pantalla PlayStation Portable"></canvas>
              <div id="screen-hint" class="screen-hint hidden"></div>
              <div id="menu-overlay" class="menu-overlay hidden" aria-hidden="true"></div>
            </div>
          </div>
          <div class="controls controls--right">
            <div class="speaker speaker--right"></div>
            <div class="d-buttons" aria-hidden="true">
              <button type="button" class="btn-play btn-triangle" data-button="x" aria-label="Triangulo"></button>
              <button type="button" class="btn-play btn-circle" data-button="a" aria-label="Circulo"></button>
              <button type="button" class="btn-play btn-cross" data-button="b" aria-label="Cruz"></button>
              <button type="button" class="btn-play btn-square" data-button="y" aria-label="Cuadrado"></button>
            </div>
            <div class="indicator indicator--power" aria-hidden="true">
              <p class="power">POWER</p>
              <div class="led led--power"></div>
            </div>
            <div class="indicator indicator--hold" aria-hidden="true">
              <p class="hold">HOLD</p>
              <div class="led led--hold"></div>
            </div>
          </div>
          <div class="controls controls--bottom">
            <div class="d-option">
              <button type="button" class="btn-option btn-home" data-app-action="home" aria-label="HOME"></button>
              <div class="btn-vol-group">
                <button type="button" class="btn-option btn-vol btn-vol--minus" data-app-action="volume-down" aria-label="Bajar volumen"></button>
                <p class="vol">VOL</p>
                <button type="button" class="btn-option btn-vol btn-vol--plus" data-app-action="volume-up" aria-label="Subir volumen"></button>
              </div>
              <div class="microphone"></div>
              <div class="psp-wordmark" id="screen-marquee">PSP</div>
              <div class="btn-group-display-sound">
                <div class="btn-option btn-display"></div>
                <div class="btn-option btn-sound"></div>
              </div>
              <button type="button" class="btn-option btn-select" data-button="select">SELECT</button>
              <button type="button" class="btn-option btn-start" data-button="start">START</button>
            </div>
          </div>
        </div>
        <div class="shadow"></div>
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
  elements.desktopEmbedFrame = document.querySelector(".desktop-emulator-frame");
  elements.fullscreenStage = document.querySelector("#fullscreen-stage");
  elements.screenHint = document.querySelector("#screen-hint");
  elements.romInput = document.querySelector("#rom-input");
  elements.saveFileInput = document.querySelector("#save-file-input");
  elements.cloudUrlInput = document.querySelector("#cloud-url-input");
  elements.cloudAnonKeyInput = document.querySelector("#cloud-anon-key-input");
  elements.cloudEmailInput = document.querySelector("#cloud-email-input");
  elements.cloudConnectBtn = document.querySelector("#cloud-connect-btn");
  elements.cloudSignInBtn = document.querySelector("#cloud-signin-btn");
  elements.cloudSignOutBtn = document.querySelector("#cloud-signout-btn");
  elements.cloudUploadBtn = document.querySelector("#cloud-upload-btn");
  elements.cloudDownloadBtn = document.querySelector("#cloud-download-btn");
  elements.cloudBadge = document.querySelector("#cloud-badge");
  elements.cloudStatusCopy = document.querySelector("#cloud-status-copy");
  elements.saveSyncChip = document.querySelector("#save-sync-chip");
  elements.saveSyncChipTop = document.querySelector("#save-sync-chip-top");
  elements.ps1BiosInput = document.querySelector("#ps1-bios-input");
  elements.ps1BiosBadge = document.querySelector("#ps1-bios-badge");
  elements.statusLine = document.querySelector("#status-line");
  elements.onboardingStrip = document.querySelector("#onboarding-strip");
  elements.onboardingSteps = [...document.querySelectorAll("[data-onboarding-step]")];
  elements.onboardingRomCopy = document.querySelector("#onboarding-rom-copy");
  elements.onboardingSystemCopy = document.querySelector("#onboarding-system-copy");
  elements.onboardingBiosCopy = document.querySelector("#onboarding-bios-copy");
  elements.libraryHero = document.querySelector("#library-hero");
  elements.libraryHeroTitle = document.querySelector("#library-hero-title");
  elements.libraryHeroCopy = document.querySelector("#library-hero-copy");
  elements.libraryHeroSystem = document.querySelector("#library-hero-system");
  elements.libraryHeroTime = document.querySelector("#library-hero-time");
  elements.libraryGrid = document.querySelector("#library-grid");
  elements.libraryViewButtons = [...document.querySelectorAll("[data-library-view]")];
  elements.libraryPanel = document.querySelector("#library-panel");
  elements.stateOutput = document.querySelector("#state-output");
  elements.menuOverlay = document.querySelector("#menu-overlay");
  elements.toggleMenuBtn = document.querySelector("#toggle-menu-btn");
  elements.drawerOverlayBtn = document.querySelector("#drawer-overlay-btn");
  elements.drawerToggleBtn = document.querySelector("#drawer-toggle-btn");
  elements.drawerCloseBtn = document.querySelector("#drawer-close-btn");
  elements.drawerBackdrop = document.querySelector("#drawer-backdrop");
  elements.drawer = document.querySelector("#control-drawer");
  elements.quickMenuBtn = document.querySelector("#quick-menu-btn");
  elements.openLibraryBtn = document.querySelector("#open-library-btn");
  elements.quickSaveBtn = document.querySelector("#quick-save-btn");
  elements.quickLoadBtn = document.querySelector("#quick-load-btn");
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
  elements.pspAppButtons = [...document.querySelectorAll("[data-app-action]")];
  elements.pspAnalogStick = document.querySelector("[data-analog-stick='psp']");
  elements.pspAnalogKnob = document.querySelector("[data-analog-stick='psp'] .stick");
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
  if (pageSystem === "gba" || pageSystem === "ds" || pageSystem === "gbc" || EMULATORJS_SYSTEMS.has(pageSystem)) {
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
let dsSavePath = "";

function desktopNeedsBios(system = uiState.currentSystem) {
  return DESKTOP_CORE_CONFIG[system]?.requiresBios === true;
}

function emulatorJsNeedsThreads(system = uiState.currentSystem) {
  return DESKTOP_CORE_CONFIG[system]?.requiresThreads === true;
}

function emulatorJsDefaultControls() {
  return {
    0: {
      0: "x",
      1: "v",
      2: "Backspace",
      3: "Enter",
      4: "ArrowUp",
      5: "ArrowDown",
      6: "ArrowLeft",
      7: "ArrowRight",
      8: "z",
      9: "c",
      10: "a",
      11: "s",
    },
  };
}

function getBoundKeyForAction(action) {
  return Object.keys(uiState.keyBindings).find((candidate) => uiState.keyBindings[candidate] === action) || "";
}

function keyEventValueForBinding(key) {
  const specialMap = {
    arrowup: "ArrowUp",
    arrowdown: "ArrowDown",
    arrowleft: "ArrowLeft",
    arrowright: "ArrowRight",
    enter: "Enter",
    backspace: "Backspace",
    escape: "Escape",
    shift: "Shift",
    tab: "Tab",
    " ": " ",
  };
  const normalized = String(key || "").toLowerCase();
  return specialMap[normalized] || key;
}

function dispatchEmulatorJsKey(action, eventType) {
  const boundKey = getBoundKeyForAction(action);
  if (!boundKey || !desktopRuntime.iframe?.contentWindow) return;
  const frameWindow = desktopRuntime.iframe.contentWindow;
  const key = keyEventValueForBinding(boundKey);
  frameWindow.focus();
  if (typeof frameWindow.__codexDispatchKey === "function") {
    frameWindow.__codexDispatchKey(key, eventType);
    return;
  }
  const payload = {
    key,
    bubbles: true,
    cancelable: true,
  };
  const keyboardEvent = new KeyboardEvent(eventType, payload);
  frameWindow.dispatchEvent(keyboardEvent);
  frameWindow.document.dispatchEvent(new KeyboardEvent(eventType, payload));
  frameWindow.document.activeElement?.dispatchEvent(new KeyboardEvent(eventType, payload));
}

function sendDesktopCommand(command, value) {
  const frameWindow = desktopRuntime.iframe?.contentWindow;
  if (!frameWindow) return;
  frameWindow.postMessage({ type: "desktop-command", command, value }, "*");
  if (command === "set-volume" && typeof frameWindow.__codexApplyVolume === "function") {
    frameWindow.__codexApplyVolume(value);
  }
  if (command === "dispatch-key" && typeof frameWindow.__codexDispatchKey === "function") {
    frameWindow.__codexDispatchKey(value.key, value.eventType);
  }
}

function hasDesktopBios(system = uiState.currentSystem) {
  return !desktopNeedsBios(system) || desktopRuntime.biosFile instanceof File;
}

function revokeObjectUrl(key) {
  if (!desktopRuntime[key]) return;
  URL.revokeObjectURL(desktopRuntime[key]);
  desktopRuntime[key] = "";
}

function revokeDesktopAssetUrls() {
  desktopRuntime.assetObjectUrls.forEach((url) => {
    try {
      URL.revokeObjectURL(url);
    } catch (error) {
      console.warn("No se pudo revocar asset url", error);
    }
  });
  desktopRuntime.assetObjectUrls = [];
}

function teardownDesktopRuntime({ preserveBios = true, preserveAssets = false } = {}) {
  desktopBridge.pending.forEach(({ reject, timeoutId }) => {
    window.clearTimeout(timeoutId);
    reject(new Error("El core web se cerro antes de completar el save."));
  });
  desktopBridge.pending.clear();
  if (desktopRuntime.iframe && desktopRuntime.iframe.parentNode) {
    desktopRuntime.iframe.remove();
  }
  desktopRuntime.iframe = null;
  desktopRuntime.active = false;
  desktopRuntime.currentSystem = "";
  desktopRuntime.bridgeReady = false;
  desktopRuntime.savePath = "";
  desktopRuntime.romFile = null;
  revokeObjectUrl("romObjectUrl");
  revokeObjectUrl("biosObjectUrl");
  if (!preserveAssets) {
    revokeDesktopAssetUrls();
  }
  if (!preserveBios) {
    desktopRuntime.biosFile = null;
  }
}

function buildDesktopIframeMarkup(system, romUrl, biosUrl = "", gameId = system) {
  const config = DESKTOP_CORE_CONFIG[system];
  const escapedPath = JSON.stringify(DESKTOP_PATH_TO_DATA);
  const escapedGameUrl = JSON.stringify(romUrl);
  const escapedCore = JSON.stringify(config.core);
  const escapedSystem = JSON.stringify(system);
  const escapedGameId = JSON.stringify(gameId);
  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>
      html, body {
        margin: 0;
        width: 100%;
        height: 100%;
        overflow: hidden;
        background: #05080c;
      }
      #game {
        width: 100%;
        height: 100%;
      }
      canvas {
        image-rendering: pixelated;
      }
    </style>
  </head>
  <body>
    <div id="game"></div>
    <script>
      window.__codexTrackedGains = new Set();
      window.__codexVolume = 1;
      window.__codexCaptureCtor = function (name, storeKey) {
        let currentValue = window[name];
        Object.defineProperty(window, name, {
          configurable: true,
          enumerable: true,
          get() {
            return currentValue;
          },
          set(nextValue) {
            if (typeof nextValue !== "function") {
              currentValue = nextValue;
              return;
            }
            currentValue = new Proxy(nextValue, {
              construct(target, args, newTarget) {
                const instance = Reflect.construct(target, args, newTarget);
                window[storeKey] = instance;
                return instance;
              },
              apply(target, thisArg, args) {
                return Reflect.apply(target, thisArg, args);
              },
            });
          },
        });
      };
      window.__codexCaptureCtor("EmulatorJS", "__codexEmulatorInstance");
      window.__codexCaptureCtor("EJS_GameManager", "__codexGameManagerInstance");
      window.__codexTrackGainNode = function (node) {
        if (!node || !node.gain) return node;
        window.__codexTrackedGains.add(node);
        try {
          node.gain.value = window.__codexVolume;
        } catch (error) {}
        return node;
      };
      window.__codexPatchAudioCtor = function (name) {
        const BaseCtor = window[name];
        if (typeof BaseCtor !== "function" || BaseCtor.__codexPatched) return;
        class CodexAudioContext extends BaseCtor {
          createGain(...args) {
            return window.__codexTrackGainNode(super.createGain(...args));
          }
          createGainNode(...args) {
            return window.__codexTrackGainNode(super.createGainNode(...args));
          }
        }
        Object.defineProperty(CodexAudioContext, "__codexPatched", {
          value: true,
          configurable: false,
          enumerable: false,
          writable: false,
        });
        window[name] = CodexAudioContext;
      };
      window.__codexPatchAudioCtor("AudioContext");
      window.__codexPatchAudioCtor("webkitAudioContext");
      window.__codexApplyVolume = function (nextVolume) {
        const normalized = Math.max(0, Math.min(1, Number(nextVolume) || 0));
        window.__codexVolume = normalized;
        window.__codexTrackedGains.forEach((node) => {
          try {
            if (node && node.gain) {
              node.gain.value = normalized;
            }
          } catch (error) {}
        });
        document.querySelectorAll("audio, video").forEach((mediaNode) => {
          mediaNode.volume = normalized;
          mediaNode.muted = normalized <= 0;
        });
      };
      window.__codexDispatchKey = function (key, eventType = "keydown") {
        const payload = { key, bubbles: true, cancelable: true };
        const targets = [
          window,
          document,
          document.activeElement,
          document.querySelector("canvas"),
          document.querySelector("#game"),
        ].filter(Boolean);
        targets.forEach((target) => {
          try {
            target.dispatchEvent(new KeyboardEvent(eventType, payload));
          } catch (error) {}
        });
      };
      window.__codexBytesToBase64 = function (bytes) {
        let binary = "";
        const chunk = 32768;
        for (let offset = 0; offset < bytes.length; offset += chunk) {
          const slice = bytes.subarray(offset, offset + chunk);
          binary += String.fromCharCode(...slice);
        }
        return btoa(binary);
      };
      window.__codexBase64ToBytes = function (value) {
        const binary = atob(value);
        const bytes = new Uint8Array(binary.length);
        for (let index = 0; index < binary.length; index += 1) {
          bytes[index] = binary.charCodeAt(index);
        }
        return bytes;
      };
      window.__codexEnsureDir = function (path) {
        const parts = String(path || "").split("/");
        let current = "";
        for (let index = 0; index < parts.length - 1; index += 1) {
          const part = parts[index];
          if (!part) continue;
          current += "/" + part;
          if (!window.__codexGameManagerInstance.FS.analyzePath(current).exists) {
            window.__codexGameManagerInstance.FS.mkdir(current);
          }
        }
      };
      window.__codexExportSavePayload = async function () {
        const manager = window.__codexEmulatorInstance?.gameManager || window.__codexGameManagerInstance;
        if (!manager) {
          throw new Error("EmulatorJS aun no expone el gestor de saves.");
        }
        if (typeof manager.saveSaveFiles === "function") {
          manager.saveSaveFiles();
        }
        if (typeof manager.getSaveFile !== "function" || typeof manager.getSaveFilePath !== "function") {
          throw new Error("Este core no expone export de savefile.");
        }
        const raw = await manager.getSaveFile();
        const bytes = raw instanceof Uint8Array ? raw : new Uint8Array(raw || []);
        return {
          path: manager.getSaveFilePath(),
          payload: window.__codexBytesToBase64(bytes),
        };
      };
      window.__codexImportSavePayload = async function (value) {
        const manager = window.__codexEmulatorInstance?.gameManager || window.__codexGameManagerInstance;
        if (!manager) {
          throw new Error("EmulatorJS aun no esta listo para importar save.");
        }
        const targetPath = value?.path || manager.getSaveFilePath();
        const bytes = window.__codexBase64ToBytes(value.payload);
        window.__codexEnsureDir(targetPath);
        if (manager.FS.analyzePath(targetPath).exists) {
          manager.FS.unlink(targetPath);
        }
        manager.FS.writeFile(targetPath, bytes);
        if (typeof manager.loadSaveFiles === "function") {
          manager.loadSaveFiles();
        }
      };
      window.addEventListener("message", (event) => {
        if (event.data?.type !== "desktop-command") return;
        if (event.data.command === "set-volume") {
          window.__codexApplyVolume(event.data.value);
          return;
        }
        if (event.data.command === "dispatch-key" && event.data.value) {
          window.__codexDispatchKey(event.data.value.key, event.data.value.eventType);
          return;
        }
        if (event.data.command === "export-save-payload") {
          window.__codexExportSavePayload()
            .then((result) => {
              parent.postMessage({ type: "desktop-command-result", requestId: event.data.requestId, system: ${escapedSystem}, result }, "*");
            })
            .catch((error) => {
              parent.postMessage({ type: "desktop-command-error", requestId: event.data.requestId, system: ${escapedSystem}, message: error.message }, "*");
            });
          return;
        }
        if (event.data.command === "import-save-payload" && event.data.value) {
          window.__codexImportSavePayload(event.data.value)
            .then(() => {
              parent.postMessage({ type: "desktop-command-result", requestId: event.data.requestId, system: ${escapedSystem}, result: { ok: true } }, "*");
            })
            .catch((error) => {
              parent.postMessage({ type: "desktop-command-error", requestId: event.data.requestId, system: ${escapedSystem}, message: error.message }, "*");
            });
        }
      });
      window.EJS_player = "#game";
      window.EJS_pathToData = ${escapedPath};
      window.EJS_pathtodata = ${escapedPath};
      window.EJS_gameUrl = ${escapedGameUrl};
      window.EJS_core = ${escapedCore};
      window.EJS_gameID = ${escapedGameId};
      window.EJS_gameId = ${escapedGameId};
      window.EJS_defaultControls = ${JSON.stringify(emulatorJsDefaultControls())};
      window.EJS_language = "es-ES";
      window.EJS_startOnLoaded = true;
      window.EJS_color = "#10151b";
      window.EJS_ready = function () {
        const manager = window.__codexEmulatorInstance?.gameManager || window.__codexGameManagerInstance;
        const savePath = manager?.getSaveFilePath ? manager.getSaveFilePath() : "";
        parent.postMessage({ type: "desktop-save-ready", system: ${escapedSystem}, savePath }, "*");
      };
      ${emulatorJsNeedsThreads(system) ? "window.EJS_threads = true;" : ""}
      ${biosUrl ? `window.EJS_biosUrl = ${JSON.stringify(biosUrl)};` : ""}
      window.addEventListener("load", () => {
        window.__codexApplyVolume(1);
        parent.postMessage({ type: "desktop-frame-ready", system: ${escapedSystem} }, "*");
      });
    </script>
    <script src="${DESKTOP_PATH_TO_DATA}loader.js"></script>
  </body>
</html>`;
}

async function startDesktopRuntime({ system, file, assetUrls = [] }) {
  if (!EMULATORJS_SYSTEMS.has(system)) {
    throw new Error("Sistema EmulatorJS no soportado.");
  }
  if (desktopNeedsBios(system) && !hasDesktopBios(system)) {
    throw new Error("PS1 necesita BIOS. Carga un archivo BIOS primero.");
  }

  teardownDesktopRuntime({ preserveAssets: assetUrls.length > 0 });
  setCurrentSystem(system);

  desktopRuntime.pendingLaunch = { system, file, assetUrls };
  desktopRuntime.romFile = file;
  desktopRuntime.currentSystem = system;
  desktopRuntime.bridgeReady = false;
  desktopRuntime.savePath = "";
  desktopRuntime.assetObjectUrls = [...assetUrls];
  desktopRuntime.romObjectUrl = URL.createObjectURL(file);
  if (desktopNeedsBios(system)) {
    desktopRuntime.biosObjectUrl = URL.createObjectURL(desktopRuntime.biosFile);
  }

  const iframe = document.createElement("iframe");
  iframe.className = "desktop-emulator-frame";
  iframe.setAttribute("title", `${DESKTOP_CORE_CONFIG[system].label} emulator`);
  iframe.setAttribute("allow", "autoplay; fullscreen");
  iframe.setAttribute("loading", "eager");
  iframe.srcdoc = buildDesktopIframeMarkup(
    system,
    desktopRuntime.romObjectUrl,
    desktopRuntime.biosObjectUrl,
    `${system}:${file.name}`,
  );
  elements.screenWrap.appendChild(iframe);
  desktopRuntime.iframe = iframe;
  desktopRuntime.active = true;
  uiState.awaitingStart = false;

  await new Promise((resolve) => {
    iframe.addEventListener("load", resolve, { once: true });
  });
}

function loadPendingDesktopRuntime() {
  if (!desktopRuntime.pendingLaunch) {
    updateStatus("Carga una ROM de SNES, N64, PS1 o PSP primero.");
    return;
  }
  startDesktopRuntime(desktopRuntime.pendingLaunch)
    .then(() => {
      updateStatus(`Core ${DESKTOP_CORE_CONFIG[uiState.currentSystem].label} inicializado con EmulatorJS.`);
      renderStatePanel();
    })
    .catch((error) => {
      updateStatus(error.message);
      renderStatePanel();
    });
}

function updatePs1Bios(file) {
  desktopRuntime.biosFile = file || null;
  revokeObjectUrl("biosObjectUrl");
}

function powerOffEmulatorJsSystem() {
  if (!desktopRuntime.active) return;
  teardownDesktopRuntime({ preserveAssets: (desktopRuntime.pendingLaunch?.assetUrls || []).length > 0 });
}

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
    const configDefaults = window.__APP_CONFIG__ || {};
    if (!uiState.cloudUrl && configDefaults.supabaseUrl) {
      uiState.cloudUrl = configDefaults.supabaseUrl;
    }
    if (!uiState.cloudAnonKey && configDefaults.supabaseAnonKey) {
      uiState.cloudAnonKey = configDefaults.supabaseAnonKey;
    }
    if (!uiState.cloudEmail && configDefaults.supabaseEmail) {
      uiState.cloudEmail = configDefaults.supabaseEmail;
    }
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
    cloudUrl: uiState.cloudUrl,
    cloudAnonKey: uiState.cloudAnonKey,
    cloudEmail: uiState.cloudEmail,
    libraryEntries: uiState.libraryEntries,
    libraryView: uiState.libraryView,
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
  if (EMULATORJS_SYSTEMS.has(uiState.currentSystem)) return desktopRuntime.active;
  if (uiState.currentSystem === "gba") return isGbaReady();
  if (uiState.currentSystem === "ds") return isDsReady();
  return isGbcReady();
}

function isPlaying() {
  if (EMULATORJS_SYSTEMS.has(uiState.currentSystem)) return desktopRuntime.active;
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

function bytesToBase64(bytes) {
  let binary = "";
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return window.btoa(binary);
}

function base64ToBytes(base64) {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function getFileExtension(fileName) {
  const match = /\.([^.]+)$/.exec(fileName || "");
  return match ? match[1].toLowerCase() : "";
}

function getSystemsFromExtension(ext) {
  return Object.entries(DESKTOP_CORE_CONFIG)
    .filter(([, config]) => config.extensions.includes(ext))
    .map(([system]) => system);
}

function formatSystemList(systems) {
  return systems.map((item) => item.toUpperCase()).join(" o ");
}

function getPrimaryFile(fileList) {
  if (!Array.isArray(fileList) || fileList.length === 0) return null;
  const cueFile = fileList.find((file) => getFileExtension(file.name) === "cue");
  return cueFile || fileList[0];
}

function normalizeCueReference(fileName) {
  return String(fileName || "")
    .replace(/^['"]|['"]$/g, "")
    .split(/[\\/]/)
    .pop()
    .trim()
    .toLowerCase();
}

function parseCueReferences(cueText) {
  const lines = String(cueText || "").split(/\r?\n/);
  return lines
    .map((line, index) => {
      const match = line.match(/^\s*FILE\s+(?:"([^"]+)"|([^\s]+))\s+(.+)\s*$/i);
      if (!match) return null;
      return {
        index,
        original: match[1] || match[2] || "",
        fileType: match[3] || "BINARY",
      };
    })
    .filter(Boolean);
}

async function buildPs1CueBundle(files) {
  const cueFile = files.find((file) => getFileExtension(file.name) === "cue");
  if (!cueFile) {
    throw new Error("Para PS1 multiarchivo sube el .cue junto con todos sus .bin.");
  }
  const cueText = await cueFile.text();
  const references = parseCueReferences(cueText);
  if (references.length === 0) {
    throw new Error("El .cue no contiene pistas FILE validas.");
  }

  const fileMap = new Map(
    files
      .filter((file) => file !== cueFile)
      .map((file) => [normalizeCueReference(file.name), file]),
  );
  const lines = cueText.split(/\r?\n/);
  const assetUrls = [];
  try {
    references.forEach((reference) => {
      const matchedFile = fileMap.get(normalizeCueReference(reference.original));
      if (!matchedFile) {
        throw new Error(`Falta el archivo referenciado por el CUE: ${reference.original}`);
      }
      const assetUrl = URL.createObjectURL(matchedFile);
      assetUrls.push(assetUrl);
      lines[reference.index] = `FILE "${assetUrl}" ${reference.fileType}`;
    });
  } catch (error) {
    assetUrls.forEach((url) => URL.revokeObjectURL(url));
    throw error;
  }

  const bundledCue = new File([lines.join("\n")], cueFile.name, { type: "application/octet-stream" });
  return {
    launchFile: bundledCue,
    assetUrls,
    displayName: `${cueFile.name} + ${files.length - 1} pista(s)`,
    displaySize: files.reduce((total, file) => total + file.size, 0),
  };
}

function getSystemFromFile(file) {
  const ext = getFileExtension(file.name);
  if (ext === "gba") return "gba";
  if (ext === "nds") return "ds";
  const emulatorJsSystems = getSystemsFromExtension(ext);
  if (emulatorJsSystems.length === 1) return emulatorJsSystems[0];
  if (emulatorJsSystems.length > 1) {
    if (uiState.systemPreference !== "auto" && emulatorJsSystems.includes(uiState.systemPreference)) {
      return uiState.systemPreference;
    }
    if (emulatorJsSystems.includes(uiState.currentSystem)) {
      return uiState.currentSystem;
    }
    return "";
  }
  return "gbc";
}

function resolveTargetSystem(fileList) {
  const file = getPrimaryFile(fileList);
  const fileSystem = file ? getSystemFromFile(file) : "";
  if (!fileSystem) {
    return {
      system: "",
      forcedByRom: false,
      ambiguous: true,
    };
  }
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

function validateRomSelection(fileList) {
  const files = Array.isArray(fileList) ? fileList : [fileList].filter(Boolean);
  if (files.length === 0) {
    return "No se selecciono ningun archivo.";
  }
  const primaryFile = getPrimaryFile(files);
  if (!primaryFile) {
    return "No se encontro un archivo principal para iniciar.";
  }
  if (files.length > 1 && getFileExtension(primaryFile.name) !== "cue") {
    return "Si vas a subir varios archivos, usa el .cue junto con todos sus .bin de PS1.";
  }
  if (files.length === 1 && getFileExtension(primaryFile.name) === "cue") {
    return "Para PS1 .cue necesitas seleccionar tambien todos los .bin del juego en la misma carga.";
  }

  const file = primaryFile;
  const ext = getFileExtension(file.name);
  if (ext === "zip" || ext === "7z" || ext === "rar") {
    return "Sube la ROM descomprimida, no .zip/.7z/.rar.";
  }
  if (!ALL_SUPPORTED_ROM_EXTENSIONS.has(ext)) {
    return "Formato no soportado. Usa GB/GBC/GBA/DS o ROMs SNES, N64, PS1 y PSP en formatos sueltos.";
  }
  const emulatorJsSystems = getSystemsFromExtension(ext);
  if (emulatorJsSystems.length > 1 && uiState.systemPreference === "auto" && !emulatorJsSystems.includes(uiState.currentSystem)) {
    return `La extension .${ext} puede ser ${formatSystemList(emulatorJsSystems)}. Elige uno de esos sistemas arriba y vuelve a subir la ROM.`;
  }
  if (emulatorJsSystems.length > 1 && uiState.systemPreference !== "auto" && !emulatorJsSystems.includes(uiState.systemPreference)) {
    return `La extension .${ext} puede ser ${formatSystemList(emulatorJsSystems)}, pero ahora mismo tienes ${uiState.systemPreference.toUpperCase()} seleccionado. Cambia al sistema correcto y vuelve a subir la ROM.`;
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
  if (uiState.currentSystem !== system && EMULATORJS_SYSTEMS.has(uiState.currentSystem)) {
    teardownDesktopRuntime();
    desktopRuntime.pendingLaunch = null;
  }
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
  if (system === "psp") {
    if (!elements.canvas) return;
    elements.canvas.width = 480;
    elements.canvas.height = 272;
    return;
  }
  if (system === "snes") {
    if (!elements.canvas) return;
    elements.canvas.width = 256;
    elements.canvas.height = 224;
    return;
  }
  if (system === "n64" || system === "ps1") {
    if (!elements.canvas) return;
    elements.canvas.width = 320;
    elements.canvas.height = 240;
    return;
  }
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
  const systemLabel = EMULATORJS_SYSTEMS.has(uiState.currentSystem)
    ? uiState.currentSystem.toUpperCase()
    : uiState.currentSystem.toUpperCase();
  const powerText = uiState.awaitingStart
    ? "lista para iniciar"
    : EMULATORJS_SYSTEMS.has(uiState.currentSystem)
      ? desktopRuntime.active
        ? "corriendo"
        : desktopRuntime.pendingLaunch
          ? "lista"
          : "sin iniciar"
    : isReady()
      ? (isPlaying() ? "corriendo" : "pausado")
      : "sin iniciar";
  elements.statusLine.textContent = `${romText}. Sistema: ${systemLabel}. Estado: ${powerText}. Ultima entrada: ${uiState.lastInput}.${uiState.lastStatusExtra ? ` ${uiState.lastStatusExtra}` : ""}`;
}

function refreshOnboarding() {
  if (!elements.onboardingStrip) return;
  const primaryFile = uiState.loadedRom;
  const isPs1Session = uiState.currentSystem === "ps1" || desktopRuntime.pendingLaunch?.system === "ps1";
  const needsManualChoice = primaryFile
    ? getSystemsFromExtension(getFileExtension(primaryFile.name)).length > 1 && uiState.systemPreference === "auto"
    : false;
  const stepStates = {
    rom: Boolean(primaryFile),
    system: !needsManualChoice,
    bios: !isPs1Session || hasDesktopBios("ps1"),
  };

  elements.onboardingSteps.forEach((step) => {
    const key = step.dataset.onboardingStep;
    const isDone = stepStates[key];
    const isActive = !isDone && ((key === "rom") || (key === "system" && stepStates.rom) || (key === "bios" && stepStates.rom && stepStates.system));
    step.classList.toggle("is-done", Boolean(isDone));
    step.classList.toggle("is-active", Boolean(isActive));
  });

  if (elements.onboardingRomCopy) {
    elements.onboardingRomCopy.textContent = primaryFile
      ? `Cargada: ${primaryFile.name}`
      : "Acepta archivo suelto o pack PS1 .cue + .bin.";
  }
  if (elements.onboardingSystemCopy) {
    elements.onboardingSystemCopy.textContent = needsManualChoice
      ? `La ROM pide elegir sistema manual: ${formatSystemList(getSystemsFromExtension(getFileExtension(primaryFile.name)))}.`
      : uiState.systemPreference === "auto"
        ? "Auto funciona bien salvo extensiones ambiguas como .iso o .pbp."
        : `Modo manual activo en ${uiState.systemPreference.toUpperCase()}.`;
  }
  if (elements.onboardingBiosCopy) {
    elements.onboardingBiosCopy.textContent = isPs1Session
      ? hasDesktopBios("ps1")
        ? "BIOS PS1 lista. Ya puedes arrancar el juego."
        : "PS1 necesita BIOS local de sesion antes de iniciar el core."
      : "Solo PS1 pide BIOS; los demas sistemas arrancan directo.";
  }
}

function systemDisplayName(system) {
  return (
    {
      gbc: "GB/GBC",
      gba: "GBA",
      ds: "DS",
      snes: "SNES",
      n64: "N64",
      ps1: "PS1",
      psp: "PSP",
    }[system] || system.toUpperCase()
  );
}

function formatRelativeStamp(value) {
  if (!value) return "Sin historial";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin historial";
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(0, Math.round(diffMs / 60000));
  if (diffMinutes < 1) return "Ahora mismo";
  if (diffMinutes < 60) return `Hace ${diffMinutes} min`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `Hace ${diffHours} h`;
  const diffDays = Math.round(diffHours / 24);
  return `Hace ${diffDays} d`;
}

function triggerUiPulse(target) {
  const node = typeof target === "string" ? document.querySelector(target) : target;
  if (!node) return;
  node.classList.remove("is-pulsing");
  void node.offsetWidth;
  node.classList.add("is-pulsing");
  window.clearTimeout(node.__pulseTimer);
  node.__pulseTimer = window.setTimeout(() => node.classList.remove("is-pulsing"), 520);
}

function markSaveSyncState(state, message) {
  cloudState.saveState = state;
  cloudState.saveMessage = message;
  syncCloudUi();
}

function currentLibraryId(system, file) {
  return `${system}:${sanitizeCloudKey(file?.name || "rom")}:${file?.size || 0}`;
}

function recordLibraryEntry(file, system) {
  if (!(file instanceof File)) return;
  const entry = {
    id: currentLibraryId(system, file),
    system,
    name: file.name,
    size: file.size,
    extension: getFileExtension(file.name),
    lastPlayedAt: new Date().toISOString(),
    biosRequired: desktopNeedsBios(system),
  };
  uiState.libraryEntries = [entry, ...(uiState.libraryEntries || []).filter((item) => item.id !== entry.id)].slice(0, LIBRARY_MAX_ITEMS);
}

function posterAccentForSystem(system) {
  return (
    {
      gbc: ["emerald", "amber"],
      gba: ["indigo", "violet"],
      ds: ["slate", "ice"],
      snes: ["lavender", "plum"],
      n64: ["forest", "gold"],
      ps1: ["coral", "cobalt"],
      psp: ["steel", "sky"],
    }[system] || ["graphite", "mist"]
  );
}

function posterMonogram(title) {
  const clean = String(title || "ROM").replace(/\.[^.]+$/, "").trim();
  const parts = clean.split(/[\s_-]+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
}

function buildLibraryPoster(entry, title) {
  const [toneA, toneB] = posterAccentForSystem(entry.system);
  const label = systemDisplayName(entry.system);
  const monogram = posterMonogram(title);
  return `
    <div class="library-poster" data-poster-system="${entry.system}" data-tone-a="${toneA}" data-tone-b="${toneB}" aria-hidden="true">
      <div class="library-poster-gloss"></div>
      <div class="library-poster-inner">
        <span class="library-poster-system">${label}</span>
        <strong class="library-poster-mark">${monogram}</strong>
        <span class="library-poster-title">${title}</span>
      </div>
      <div class="library-spine">${label}</div>
    </div>
  `;
}

function shelfVarianceForIndex(index) {
  const variants = [
    { tilt: "-1.4deg", lift: "-3px", posterTilt: "1.8deg" },
    { tilt: "0.8deg", lift: "1px", posterTilt: "-1.2deg" },
    { tilt: "-0.6deg", lift: "-1px", posterTilt: "0.9deg" },
    { tilt: "1.5deg", lift: "2px", posterTilt: "-1.8deg" },
    { tilt: "-0.9deg", lift: "0px", posterTilt: "1.1deg" },
  ];
  return variants[index % variants.length];
}

function renderLibrary() {
  if (!elements.libraryGrid) return;
  const libraryView = uiState.libraryView || "shelf";
  elements.libraryGrid.dataset.libraryView = libraryView;
  elements.libraryViewButtons?.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.libraryView === libraryView);
    button.setAttribute("aria-pressed", String(button.dataset.libraryView === libraryView));
  });
  const currentEntry = uiState.loadedRom
    ? {
        id: currentLibraryId(uiState.currentSystem, uiState.loadedRom),
        system: uiState.currentSystem,
        name: uiState.loadedRom.name,
        size: uiState.loadedRom.size,
        extension: getFileExtension(uiState.loadedRom.name),
        lastPlayedAt: new Date().toISOString(),
        biosRequired: desktopNeedsBios(uiState.currentSystem),
      }
    : null;
  const featured = currentEntry || uiState.libraryEntries?.[0] || null;
  if (elements.libraryHero) {
    elements.libraryHero.classList.toggle("is-loaded", Boolean(featured));
  }
  if (elements.libraryHeroSystem) {
    elements.libraryHeroSystem.textContent = featured ? systemDisplayName(featured.system) : "Sin sistema";
  }
  if (elements.libraryHeroTime) {
    elements.libraryHeroTime.textContent = featured ? formatRelativeStamp(featured.lastPlayedAt) : "Sin historial";
  }

  if (!(uiState.libraryEntries || []).length) {
    elements.libraryGrid.innerHTML = `
      <article class="library-empty">
        <strong>Sin cartuchos todavia</strong>
        <span>La biblioteca aparecera aqui con tus ultimas ROMs, sistema preferido y estado de sync.</span>
      </article>
    `;
    return;
  }

  elements.libraryGrid.innerHTML = uiState.libraryEntries
    .map((entry, index) => {
      const isActive = currentEntry && entry.id === currentEntry.id;
      const title = entry.name.replace(/\.[^.]+$/, "");
      const detailText = `${Math.max(1, Math.round(entry.size / 1024))} KB • .${entry.extension || "rom"} • ${entry.biosRequired ? "Requiere BIOS" : "Arranque directo"}`;
      const poster = buildLibraryPoster(entry, title);
      const variance = shelfVarianceForIndex(index);
      return `
        <article class="library-card ${isActive ? "is-active" : ""}" data-library-id="${entry.id}" data-library-system="${entry.system}" style="--shelf-card-tilt:${variance.tilt}; --shelf-card-lift:${variance.lift}; --shelf-poster-tilt:${variance.posterTilt};">
          ${poster}
          <div class="library-card-top">
            <span class="library-system-badge">${systemDisplayName(entry.system)}</span>
            <span class="library-size-badge">${Math.max(1, Math.round(entry.size / 1024))} KB</span>
          </div>
          <strong>${title}</strong>
          <p>${detailText}</p>
          <div class="library-card-footer">
            <span>${formatRelativeStamp(entry.lastPlayedAt)}</span>
            <button type="button" class="library-card-action" data-library-activate="${entry.system}">
              ${isActive ? "Activo" : `Usar ${systemDisplayName(entry.system)}`}
            </button>
          </div>
        </article>
      `;
    })
    .join("");
}

function cloudSaveSupported(system = uiState.currentSystem) {
  return CLOUD_SUPPORTED_SYSTEMS.has(system);
}

function setCloudStatus(status, message) {
  cloudState.status = status;
  cloudState.message = message;
  syncCloudUi();
}

function currentCloudConfig() {
  return {
    url: (uiState.cloudUrl || "").trim(),
    anonKey: (uiState.cloudAnonKey || "").trim(),
    email: (uiState.cloudEmail || "").trim(),
  };
}

function hashString(value) {
  let hash = 2166136261;
  const text = String(value || "");
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}

function nextDesktopBridgeRequestId() {
  desktopBridge.requestId += 1;
  return `desktop-bridge-${desktopBridge.requestId}`;
}

function sendDesktopBridgeCommand(command, value) {
  const frameWindow = desktopRuntime.iframe?.contentWindow;
  if (!frameWindow || !desktopRuntime.active) {
    return Promise.reject(new Error("El core web no esta listo para guardar."));
  }
  const requestId = nextDesktopBridgeRequestId();
  return new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      desktopBridge.pending.delete(requestId);
      reject(new Error("El core web no respondio al comando de save."));
    }, 12000);
    desktopBridge.pending.set(requestId, { resolve, reject, timeoutId });
    frameWindow.postMessage({ type: "desktop-command", command, requestId, value }, "*");
  });
}

async function exportDesktopSavePayload() {
  const result = await sendDesktopBridgeCommand("export-save-payload");
  const payload = {
    type: `${uiState.currentSystem}-savefile`,
    system: uiState.currentSystem,
    rom: uiState.loadedRom,
    path: result.path || "",
    payload: result.payload,
  };
  const fingerprint = hashString(`${payload.system}:${payload.path}:${payload.payload}`);
  return { payload, fingerprint };
}

async function importDesktopSavePayload(data) {
  if (!data?.payload) {
    throw new Error("El save de nube no trae payload para restaurar.");
  }
  await sendDesktopBridgeCommand("import-save-payload", {
    payload: data.payload,
    path: data.path || "",
  });
}

async function maybeAutoSyncDesktopCloudSave() {
  if (desktopBridge.autoSyncLock) return;
  if (!EMULATORJS_SYSTEMS.has(uiState.currentSystem) || !desktopRuntime.active || !desktopRuntime.bridgeReady) return;
  if (!cloudState.client || !cloudState.user || !cloudSaveSupported()) return;
  desktopBridge.autoSyncLock = true;
  try {
    const { payload, fingerprint } = await exportDesktopSavePayload();
    cloudState.lastLocalHash = fingerprint;
    if (!payload.payload || cloudState.lastSyncedHash === fingerprint) {
      if (cloudState.lastSyncedHash === fingerprint) {
        markSaveSyncState("synced", cloudState.lastSyncedAt ? `Sincronizado ${formatRelativeStamp(cloudState.lastSyncedAt)}` : "Sincronizado");
      }
      return;
    }
    markSaveSyncState("pending", `Save ${systemDisplayName(uiState.currentSystem)} pendiente de sincronizar`);
    await syncCurrentSaveToCloud(payload, fingerprint);
  } catch (error) {
    if (!/no respondio|todavia|aun no|not ready/i.test(error.message)) {
      markSaveSyncState("error", error.message);
    }
  } finally {
    desktopBridge.autoSyncLock = false;
  }
}

function syncCloudUi() {
  const supported = cloudSaveSupported();
  if (elements.cloudBadge) {
    elements.cloudBadge.textContent = cloudState.user
      ? "conectado"
      : cloudState.client
        ? "listo"
        : cloudState.status;
  }
  if (elements.cloudStatusCopy) {
    const suffix = cloudState.user?.email ? ` Sesion: ${cloudState.user.email}.` : "";
    const syncSuffix = cloudState.saveMessage ? ` Estado save: ${cloudState.saveMessage}` : "";
    elements.cloudStatusCopy.textContent = `${cloudState.message}${syncSuffix}${suffix}`.trim();
  }
  [elements.saveSyncChip, elements.saveSyncChipTop].forEach((chip) => {
    if (!chip) return;
    chip.textContent = cloudState.saveMessage || "Solo local";
    chip.dataset.syncState = cloudState.saveState || "local";
    chip.classList.toggle("is-live", cloudState.saveState === "synced");
  });
  const ready = Boolean(cloudState.client && cloudState.user && supported && !cloudState.syncInFlight);
  if (elements.cloudConnectBtn) elements.cloudConnectBtn.disabled = !window.supabase || cloudState.syncInFlight;
  if (elements.cloudSignInBtn) elements.cloudSignInBtn.disabled = !cloudState.client || cloudState.syncInFlight;
  if (elements.cloudSignOutBtn) elements.cloudSignOutBtn.disabled = !cloudState.user || cloudState.syncInFlight;
  if (elements.cloudUploadBtn) elements.cloudUploadBtn.disabled = !ready;
  if (elements.cloudDownloadBtn) elements.cloudDownloadBtn.disabled = !ready;
}

function bindCloudAuthListener(client) {
  if (!client || client.__codexAuthBound) return;
  client.__codexAuthBound = true;
  client.auth.onAuthStateChange((_event, session) => {
    cloudState.session = session;
    cloudState.user = session?.user || null;
    setCloudStatus(
      session?.user ? "conectado" : "listo",
      session?.user
        ? "Supabase conectado y listo para sincronizar."
        : "Proyecto conectado. Envia el magic link para iniciar sesion.",
    );
    markSaveSyncState(session?.user ? "pending" : "local", session?.user ? "Esperando cambios de save para sincronizar" : "Solo local");
  });
}

async function connectSupabaseClient() {
  if (!window.supabase?.createClient) {
    throw new Error("No se pudo cargar el cliente de Supabase en esta pagina.");
  }
  const { url, anonKey } = currentCloudConfig();
  if (!url || !anonKey) {
    throw new Error("Escribe Project URL y anon key antes de conectar.");
  }
  const client = window.supabase.createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  bindCloudAuthListener(client);
  cloudState.client = client;
  const { data, error } = await client.auth.getSession();
  if (error) throw error;
  cloudState.session = data.session;
  cloudState.user = data.session?.user || null;
  setCloudStatus(
    cloudState.user ? "conectado" : "listo",
    cloudState.user
      ? "Supabase conectado y listo para sincronizar."
      : "Proyecto conectado. Envia el magic link para iniciar sesion.",
  );
  markSaveSyncState(cloudState.user ? "pending" : "local", cloudState.user ? "Esperando cambios de save para sincronizar" : "Solo local");
}

function sanitizeCloudKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96) || "save";
}

function currentCloudGameId() {
  if (EMULATORJS_SYSTEMS.has(uiState.currentSystem) && desktopRuntime.savePath) {
    return sanitizeCloudKey(desktopRuntime.savePath.replace(/^\/+/, "").replace(/\.[^.]+$/i, ""));
  }
  if (uiState.currentSystem === "ds" && dsSavePath) {
    return sanitizeCloudKey(dsSavePath.replace(/^\/savefiles\//, "").replace(/\.sav$/i, ""));
  }
  if (uiState.currentSystem === "gba" && isGbaReady() && gbaCore?.mmu?.cart?.code) {
    return sanitizeCloudKey(gbaCore.mmu.cart.code);
  }
  if (uiState.currentSystem === "gbc" && isGbcReady() && window.gameboy?.name) {
    return sanitizeCloudKey(window.gameboy.name);
  }
  return sanitizeCloudKey(uiState.loadedRom?.name || `${uiState.currentSystem}-save`);
}

function buildCloudRecord(payload) {
  if (!cloudState.user) {
    throw new Error("Inicia sesion en Supabase antes de sincronizar.");
  }
  return {
    user_id: cloudState.user.id,
    system: uiState.currentSystem,
    game_id: currentCloudGameId(),
    save_kind: payload.type,
    rom_name: uiState.loadedRom?.name || "",
    payload_json: payload,
    updated_at: new Date().toISOString(),
  };
}

function currentDsSavePayload() {
  if (!isDsReady()) {
    throw new Error("Carga primero una ROM DS.");
  }
  if (!dsSavePath) {
    throw new Error("Todavia no hay ruta de save DS activa.");
  }
  if (!window.FS?.analyzePath(dsSavePath).exists) {
    throw new Error("La partida DS aun no genero un save en /savefiles.");
  }
  const raw = window.FS.readFile(dsSavePath);
  return {
    type: "ds-savefile",
    system: uiState.currentSystem,
    rom: uiState.loadedRom,
    path: dsSavePath,
    payload: bytesToBase64(raw),
  };
}

async function currentSavePayload() {
  if (!isReady()) {
    throw new Error("No hay emulacion activa para exportar.");
  }

  if (EMULATORJS_SYSTEMS.has(uiState.currentSystem)) {
    return (await exportDesktopSavePayload()).payload;
  }

  if (uiState.currentSystem === "ds") {
    return currentDsSavePayload();
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

async function exportCurrentSave() {
  try {
    const payload = await currentSavePayload();
    const romName = uiState.loadedRom ? uiState.loadedRom.name.replace(/\.[^.]+$/, "") : "save";
    downloadJsonFile(`${romName}-${uiState.currentSystem}-save.json`, payload);
    updateStatus("Save exportado.");
    markSaveSyncState("local", `Exportado localmente para ${systemDisplayName(uiState.currentSystem)}`);
    triggerUiPulse(elements.saveSyncChipTop);
  } catch (error) {
    updateStatus(error.message);
  }
}

async function applyImportedSaveData(data) {
  if (data.system !== uiState.currentSystem) {
    throw new Error("El save importado no coincide con el sistema activo.");
  }
  if (EMULATORJS_SYSTEMS.has(uiState.currentSystem)) {
    await importDesktopSavePayload(data);
    updateStatus(`Save ${systemDisplayName(uiState.currentSystem)} importado correctamente.`);
    renderStatePanel();
    markSaveSyncState("local", `Save ${systemDisplayName(uiState.currentSystem)} restaurado en el core`);
    return;
  }
  if (uiState.currentSystem === "ds") {
    if (!isDsReady()) throw new Error("Carga primero una ROM DS.");
    if (!dsSavePath) throw new Error("Todavia no hay ruta de save DS activa.");
    const bytes = base64ToBytes(data.payload);
    window.FS.writeFile(dsSavePath, bytes);
    if (window.WebMelon?.storage?.sync) {
      window.WebMelon.storage.sync();
    }
    updateStatus("Save DS importado correctamente.");
    renderStatePanel();
    return;
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
}

async function importCurrentSave(file) {
  if (!file) return;
  try {
    const raw = await file.text();
    const data = JSON.parse(raw);
    await applyImportedSaveData(data);
  } catch (error) {
    updateStatus(`No se pudo importar el save: ${error.message}`);
  } finally {
    elements.saveFileInput.value = "";
  }
}

async function syncCurrentSaveToCloud(providedPayload = null, providedFingerprint = "") {
  if (!cloudSaveSupported()) {
    throw new Error("Este sistema aun no esta listo para sync de nube.");
  }
  if (!cloudState.client || !cloudState.user) {
    throw new Error("Conecta Supabase e inicia sesion antes de subir saves.");
  }
  const payload = providedPayload || await currentSavePayload();
  const fingerprint = providedFingerprint || hashString(`${payload.system}:${payload.path || ""}:${payload.payload || ""}`);
  const record = buildCloudRecord(payload);
  cloudState.syncInFlight = true;
  markSaveSyncState("pending", `Sincronizando ${systemDisplayName(record.system)}...`);
  syncCloudUi();
  const { error } = await cloudState.client
    .from("cloud_saves")
    .upsert(record, { onConflict: "user_id,system,game_id,save_kind" });
  cloudState.syncInFlight = false;
  syncCloudUi();
  if (error) throw error;
  cloudState.lastLocalHash = fingerprint;
  cloudState.lastSyncedHash = fingerprint;
  cloudState.lastSyncedAt = new Date().toISOString();
  markSaveSyncState("synced", `Sincronizado ${formatRelativeStamp(cloudState.lastSyncedAt)}`);
  setCloudStatus("conectado", `Save ${record.system.toUpperCase()} sincronizado en la nube.`);
}

async function restoreSaveFromCloud() {
  if (!cloudSaveSupported()) {
    throw new Error("Este sistema aun no esta listo para sync de nube.");
  }
  if (!cloudState.client || !cloudState.user) {
    throw new Error("Conecta Supabase e inicia sesion antes de restaurar saves.");
  }
  cloudState.syncInFlight = true;
  syncCloudUi();
  const { data, error } = await cloudState.client
    .from("cloud_saves")
    .select("payload_json")
    .eq("user_id", cloudState.user.id)
    .eq("system", uiState.currentSystem)
    .eq("game_id", currentCloudGameId())
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  cloudState.syncInFlight = false;
  syncCloudUi();
  if (error) throw error;
  if (!data?.payload_json) {
    throw new Error("No hay un save en nube para este juego y sistema.");
  }
  await applyImportedSaveData(data.payload_json);
  cloudState.lastLocalHash = hashString(`${data.payload_json.system}:${data.payload_json.path || ""}:${data.payload_json.payload || ""}`);
  cloudState.lastSyncedHash = cloudState.lastLocalHash;
  cloudState.lastSyncedAt = new Date().toISOString();
  markSaveSyncState("synced", `Restaurado desde nube ${formatRelativeStamp(cloudState.lastSyncedAt)}`);
  setCloudStatus("conectado", `Save ${uiState.currentSystem.toUpperCase()} restaurado desde la nube.`);
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
  elements.filterSelect.value = uiState.filterMode;
  elements.filterIntensity.value = String(uiState.filterIntensity);
  elements.touchControlsToggle.checked = uiState.touchControls;
  elements.themeSelect.value = uiState.theme;
  if (elements.cloudUrlInput) elements.cloudUrlInput.value = uiState.cloudUrl || "";
  if (elements.cloudAnonKeyInput) elements.cloudAnonKeyInput.value = uiState.cloudAnonKey || "";
  if (elements.cloudEmailInput) elements.cloudEmailInput.value = uiState.cloudEmail || "";
  elements.attackInputs.forEach((input, index) => {
    input.value = uiState.attackLabels[index];
  });
  renderKeymapButtons();
}

function applyVisualPrefs() {
  const hasTouchSurface = !EMULATORJS_SYSTEMS.has(uiState.currentSystem);
  elements.body.dataset.theme = uiState.theme;
  elements.body.dataset.system = uiState.currentSystem;
  elements.body.dataset.filter = uiState.filterMode;
  elements.body.classList.toggle("drawer-open", uiState.drawerOpen);
  elements.body.classList.toggle("focus-mode", uiState.focusMode && uiState.currentSystem !== "ds");
  elements.body.classList.toggle("touch-visible", uiState.touchControls && hasTouchSurface);
  elements.body.style.setProperty("--filter-intensity", String(uiState.filterIntensity / 100));
  elements.menuOverlay.style.setProperty("--overlay-alpha", String(uiState.overlayOpacity / 100));
  elements.screenWrap.classList.toggle("scanlines", uiState.scanlines);
  const screenHintText = getScreenHintText();
  const showStartHint = Boolean(screenHintText);
  elements.screenHint.classList.toggle("hidden", !showStartHint);
  elements.screenHint.hidden = !showStartHint;
  elements.screenHint.setAttribute("aria-hidden", String(!showStartHint));
  elements.screenHint.style.display = showStartHint ? "" : "none";
  elements.screenHint.style.pointerEvents = showStartHint ? "auto" : "none";
  elements.screenHint.textContent = screenHintText;
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
  if (elements.ps1BiosBadge) {
    elements.ps1BiosBadge.textContent = desktopRuntime.biosFile ? "cargada" : "pendiente";
  }
  syncCloudUi();
  renderLibrary();
}

function keyLabelForKey(key) {
  if (!key) return "Sin tecla";
  return key.length === 1 ? key.toUpperCase() : key;
}

function getScreenHintText() {
  if (EMULATORJS_SYSTEMS.has(uiState.currentSystem)) {
    if (uiState.currentSystem === "ps1" && uiState.loadedRom && !hasDesktopBios("ps1")) {
      return "Carga BIOS PS1 para iniciar este juego";
    }
    if (!desktopRuntime.active && desktopRuntime.pendingLaunch) {
      return "Core listo";
    }
    return "";
  }
  return "";
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
  if (elements.volumeRange) {
    elements.volumeRange.value = String(uiState.volume);
  }
  settings[0] = uiState.volume > 0;
  settings[3] = uiState.volume / 100;
  if (isGbcReady() && window.gameboy.audioHandle) {
    window.gameboy.audioHandle.changeVolume(settings[3]);
  }
  if (isGbaReady()) {
    gbaCore.audio.masterVolume = Math.max(0, Math.pow(2, settings[3]) - 1);
  }
  if (desktopRuntime.active) {
    sendDesktopCommand("set-volume", settings[3]);
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
  if (EMULATORJS_SYSTEMS.has(uiState.currentSystem)) {
    loadPendingDesktopRuntime();
    return;
  }
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
  if (EMULATORJS_SYSTEMS.has(uiState.currentSystem)) {
    if (!desktopRuntime.pendingLaunch && !desktopRuntime.active) {
      updateStatus("Carga una ROM de SNES, N64, PS1 o PSP primero.");
      return;
    }
    if (desktopRuntime.active) {
      powerOffEmulatorJsSystem();
      afterInput("power_off", "Core apagado.");
      return;
    }
    if (uiState.awaitingStart) {
      uiState.awaitingStart = false;
    }
    loadPendingDesktopRuntime();
    afterInput("power_start", "Core lanzado.");
    return;
  }
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
  const isEmulatorJs = EMULATORJS_SYSTEMS.has(uiState.currentSystem);
  const isDesktop = DESKTOP_SYSTEMS.has(uiState.currentSystem);
  const isPsp = uiState.currentSystem === "psp";
  elements.powerBtn.textContent = isEmulatorJs
    ? desktopRuntime.active
      ? "Reiniciar"
      : "Iniciar"
    : uiState.awaitingStart ? "Iniciar" : isPlaying() ? "Pausar" : "Reanudar";
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
  elements.brandChip.textContent = isPsp
    ? "Pocket Codex PSP"
    : isDesktop
    ? uiState.currentSystem === "snes"
      ? "Pocket Codex Super"
      : uiState.currentSystem === "n64"
        ? "Pocket Codex 64"
        : "Pocket Codex PS1"
    : isDs ? "Pocket Codex DS" : isGba ? "Pocket Codex Advance" : "Pocket Codex Color";
  const screenMarquee = document.querySelector("#screen-marquee");
  const consoleEmblem = document.querySelector("#console-emblem");
  if (screenMarquee) {
    screenMarquee.textContent = isPsp
      ? "PLAYSTATION PORTABLE"
      : isDesktop
      ? uiState.currentSystem === "snes"
        ? "SUPER NINTENDO ENTERTAINMENT SYSTEM"
        : uiState.currentSystem === "n64"
          ? "NINTENDO 64 DISPLAY DECK"
          : "PLAYSTATION VIDEO OUT"
      : isDs ? "NINTENDO DS" : isGba ? "GAME BOY ADVANCE" : "GAME BOY COLOR";
  }
  if (consoleEmblem) {
    consoleEmblem.textContent = isPsp
      ? "Sony"
      : isDesktop
      ? uiState.currentSystem === "ps1"
        ? "Sony"
        : "Nintendo"
      : "Nintendo";
  }
  elements.systemChip.textContent = isEmulatorJs
    ? `Sistema ${uiState.currentSystem.toUpperCase()}`
    : isDs ? "Sistema DS" : isGba ? "Sistema GBA" : "Sistema GB/GBC";
  elements.saveModeChip.textContent = isEmulatorJs
    ? "Core web"
    : isDs ? "Savefile DS" : isGba ? "SRAM por slots" : "Save states";
  elements.systemBadge.textContent = isEmulatorJs ? uiState.currentSystem : isDs ? "ds" : isGba ? "gba" : "gbc";
  elements.systemDescription.textContent = isPsp
    ? "Modo PSP activo. Corre sobre PPSSPP via EmulatorJS con un shell provisional hasta que llegue tu mockup."
    : isDesktop
    ? uiState.currentSystem === "snes"
      ? "Modo SNES activo. Corre sobre EmulatorJS dentro de una vitrina de sobremesa 4:3 con foco total en pantalla."
      : uiState.currentSystem === "n64"
        ? "Modo N64 activo. El core web vive dentro de la pantalla central para mantener el layout limpio y sin mezclarlo con carcasas portatiles."
        : "Modo PS1 activo. Usa EmulatorJS y requiere BIOS local de sesion antes de arrancar la ROM."
    : isDs
    ? "Modo Nintendo DS activo. Se usan dos pantallas y savefiles del cartucho via WebMelon."
    : isGba
    ? "Modo Advance activo. La pantalla usa proporcion GBA, los hombros L/R quedan activos y los slots guardan SRAM del juego."
    : "Modo Game Boy o Game Boy Color activo. Los slots guardan save states completos del emulador para volver exactamente al mismo punto.";
  elements.controlProfile.textContent = isPsp
    ? "Perfil PSP"
    : isDesktop
    ? "Perfil sobremesa"
    : isDs ? "Perfil DS" : isGba ? "Perfil GBA" : "Perfil GB/GBC";
  elements.controlHint.textContent = isPsp
    ? "Shell provisional sin mockup final. El core corre dentro de una pantalla 16:9 mas cercana al panel real de PSP."
    : isDesktop
    ? "Sin botones fisicos en pantalla. Este layout prioriza la vista del display, ideal para consolas de sobremesa."
    : isDs
    ? "Flechas o remapeo para DS. La pantalla inferior acepta toque directo con mouse o touch."
    : isGba
    ? "Flechas, Z, X, Enter, Backspace y hombros L/R con A y S."
    : "Flechas, Z, X, Enter y Backspace para la cruceta y botones clasicos.";
  elements.saveProfile.textContent = isEmulatorJs
    ? "Savefile + nube"
    : isDs ? "Guardado DS" : isGba ? "Guardado SRAM" : "Guardado por estado";
  elements.saveHint.textContent = isEmulatorJs
    ? "El core web ahora puede exportar e importar su savefile para sincronizarlo con Supabase."
    : isDs
    ? "Los saves DS usan archivos del cartucho y almacenamiento del navegador."
    : isGba
    ? "Los slots capturan SRAM del cartucho. Sirve para progreso del juego, no para congelar cada frame."
    : "Los slots guardan save states completos. Vuelves al mismo instante exacto de la emulacion.";
  elements.toggleMenuBtn.disabled = isEmulatorJs;
  elements.drawerOverlayBtn.disabled = isEmulatorJs;
  elements.quickSaveBtn.disabled = isEmulatorJs;
  elements.quickLoadBtn.disabled = isEmulatorJs;
  elements.importSaveBtn.disabled = false;
  elements.exportSaveBtn.disabled = false;
  elements.drawerImportSaveBtn.disabled = false;
  elements.drawerExportSaveBtn.disabled = false;
  elements.touchControlsToggle.disabled = isEmulatorJs;
  elements.speedBtn.disabled = isEmulatorJs;
  if (elements.consolePowerBtn) {
    elements.consolePowerBtn.classList.toggle("ready", uiState.awaitingStart);
    elements.consolePowerBtn.classList.toggle("active", isPlaying());
  }
  const pspShell = document.querySelector(".console-shell.system-shell--psp");
  if (pspShell) {
    pspShell.classList.toggle("is-on", isPlaying());
  }
  refreshOnboarding();
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
  renderLibrary();
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
  if (EMULATORJS_SYSTEMS.has(uiState.currentSystem)) {
    if (!desktopRuntime.active) return;
    dispatchEmulatorJsKey(button, "keydown");
    return;
  }
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
  if (EMULATORJS_SYSTEMS.has(uiState.currentSystem)) {
    if (!desktopRuntime.active) return;
    dispatchEmulatorJsKey(button, "keyup");
    return;
  }
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

function pulseHardwareControl(buttonElement, duration = 140) {
  if (!buttonElement) return;
  buttonElement.classList.add("is-pressed");
  window.clearTimeout(buttonElement.__pressTimer);
  buttonElement.__pressTimer = window.setTimeout(() => {
    buttonElement.classList.remove("is-pressed");
  }, duration);
}

function triggerPspAppAction(action) {
  if (action === "home") {
    if (uiState.focusMode) {
      setFocusMode(false);
      afterInput("home", "HOME salio del modo enfoque.");
      return;
    }
    setDrawerOpen(!uiState.drawerOpen);
    afterInput("home", uiState.drawerOpen ? "HOME cerro el menu." : "HOME abrio el menu.");
    return;
  }
  if (action === "volume-down" || action === "volume-up") {
    const delta = action === "volume-down" ? -10 : 10;
    setVolume(uiState.volume + delta);
    persistAndRender();
    afterInput(action, `Volumen ${uiState.volume}%.`);
  }
}

function updatePspAnalogDirections(nextDirections) {
  const previous = pspAnalogState.activeDirections;
  previous.forEach((direction) => {
    if (!nextDirections.has(direction)) {
      releaseInput(direction);
    }
  });
  nextDirections.forEach((direction) => {
    if (!previous.has(direction)) {
      pressInput(direction);
    }
  });
  pspAnalogState.activeDirections = new Set(nextDirections);
}

function resetPspAnalogStick() {
  updatePspAnalogDirections(new Set());
  if (elements.pspAnalogKnob) {
    elements.pspAnalogKnob.style.transform = "";
  }
  if (elements.pspAnalogStick) {
    elements.pspAnalogStick.classList.remove("is-active");
  }
  pspAnalogState.pointerId = null;
}

function bindPspAnalogStick() {
  if (!elements.pspAnalogStick || elements.pspAnalogStick.dataset.bound) return;
  elements.pspAnalogStick.dataset.bound = "true";

  const maxOffset = 9;
  const threshold = 0.45;

  const updateFromPointer = (event) => {
    if (pspAnalogState.pointerId !== event.pointerId) return;
    const rect = elements.pspAnalogStick.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dx = event.clientX - centerX;
    const dy = event.clientY - centerY;
    const nx = Math.max(-1, Math.min(1, dx / (rect.width / 2)));
    const ny = Math.max(-1, Math.min(1, dy / (rect.height / 2)));
    const nextDirections = new Set();

    if (nx <= -threshold) nextDirections.add("left");
    if (nx >= threshold) nextDirections.add("right");
    if (ny <= -threshold) nextDirections.add("up");
    if (ny >= threshold) nextDirections.add("down");

    updatePspAnalogDirections(nextDirections);

    if (elements.pspAnalogKnob) {
      elements.pspAnalogKnob.style.transform = `translate(${Math.round(nx * maxOffset)}px, ${Math.round(ny * maxOffset)}px)`;
    }
  };

  const onPointerMove = (event) => {
    event.preventDefault();
    updateFromPointer(event);
  };

  const onPointerEnd = (event) => {
    if (pspAnalogState.pointerId !== event.pointerId) return;
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerEnd);
    window.removeEventListener("pointercancel", onPointerEnd);
    resetPspAnalogStick();
  };

  elements.pspAnalogStick.addEventListener("pointerdown", (event) => {
    if (!isReady()) {
      updateStatus("Carga una ROM primero.");
      return;
    }
    event.preventDefault();
    pspAnalogState.pointerId = event.pointerId;
    elements.pspAnalogStick.classList.add("is-active");
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerEnd);
    window.addEventListener("pointercancel", onPointerEnd);
    updateFromPointer(event);
  });
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
  teardownDesktopRuntime();
  desktopRuntime.pendingLaunch = null;
  dsSavePath = "";
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
  if (!window.WebMelon) {
    throw new Error("WebMelon DS no cargo en esta pagina. Revisa que Vercel este sirviendo webmelon.js y wasmemulator.js.");
  }
  if (!window.WebMelon.assembly || typeof window.WebMelon.assembly.addLoadListener !== "function") {
    throw new Error("WebMelon DS no pudo inicializarse en este deploy. Revisa headers COOP/COEP, la ruta de wasmemulator.wasm y /app-config.js en Vercel.");
  }
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
  dsSavePath = `/savefiles/${ds.cart.getUnloadedCartCode()}.sav`;
  if (typeof ds.storage.onSaveComplete === "function") {
    ds.storage.onSaveComplete(() => {
      markSaveSyncState(cloudState.user ? "pending" : "local", cloudState.user ? "Save DS pendiente de sincronizar" : "Save DS guardado localmente");
      if (cloudState.client && cloudState.user && cloudSaveSupported("ds")) {
        syncCurrentSaveToCloud().catch((error) => setCloudStatus("error", `No pude sincronizar DS: ${error.message}`));
      }
    });
  }
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

async function loadDesktopRom(file, system, meta = {}) {
  setCurrentSystem(system);
  uiState.loadedRom = {
    name: meta.displayName || file.name,
    size: meta.displaySize || file.size,
  };
  uiState.lastInput = "rom_loaded";
  uiState.paused = false;
  desktopRuntime.pendingLaunch = { system, file, assetUrls: [...(meta.assetUrls || [])] };
  desktopRuntime.assetObjectUrls = [...(meta.assetUrls || [])];

  if (desktopNeedsBios(system) && !hasDesktopBios(system)) {
    uiState.awaitingStart = false;
    updateStatus("ROM PS1 detectada. Carga BIOS PS1 para iniciar el core.");
    renderStatePanel();
    return;
  }

  await startDesktopRuntime({ system, file, assetUrls: meta.assetUrls || [] });
  updateStatus(`Core ${DESKTOP_CORE_CONFIG[system].label} inicializado con EmulatorJS.`);
  renderStatePanel();
}

async function loadRom(fileList) {
  teardownCurrentEmulator();
  uiState.awaitingStart = false;
  cloudState.lastLocalHash = "";
  cloudState.lastSyncedHash = "";
  cloudState.lastSyncedAt = "";
  const files = Array.isArray(fileList) ? fileList : [fileList].filter(Boolean);
  const primaryFile = getPrimaryFile(files);
  const target = resolveTargetSystem(files);
  if (!target.system || target.ambiguous) {
    throw new Error("No pude resolver el sistema de esta ROM. Si la extension es ambigua, elige el sistema manualmente y vuelve a subirla.");
  }
  if (target.forcedByRom) {
    uiState.systemPreference = target.system;
    persistAndRender();
    updateStatus(`La ROM cambio el sistema a ${target.system.toUpperCase()} automaticamente.`);
  }
  if (target.system === "gba") {
    await loadGbaRom(primaryFile);
  } else if (target.system === "ds") {
    await loadDsRom(primaryFile);
  } else if (EMULATORJS_SYSTEMS.has(target.system)) {
    if (target.system === "ps1" && getFileExtension(primaryFile.name) === "cue") {
      const bundledCue = await buildPs1CueBundle(files);
      await loadDesktopRom(bundledCue.launchFile, target.system, bundledCue);
    } else {
      await loadDesktopRom(primaryFile, target.system);
    }
  } else {
    await loadGbcRom(primaryFile);
  }
  recordLibraryEntry(primaryFile, target.system);
  persistPrefs();
  renderLibrary();
  markSaveSyncState(
    cloudState.user ? "pending" : "local",
    cloudState.user ? `Sesion ${systemDisplayName(target.system)} lista para sincronizar` : `Sesion ${systemDisplayName(target.system)} solo local`,
  );
  triggerUiPulse(elements.libraryHero);
  triggerUiPulse(elements.systemChip);
}

function saveToSlot(slot) {
  if (EMULATORJS_SYSTEMS.has(uiState.currentSystem)) {
    updateStatus("SNES, N64, PS1 y PSP usan el gestor interno del core web para saves.");
    return;
  }
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
    markSaveSyncState(cloudState.user ? "pending" : "local", cloudState.user ? "Save GBA pendiente de sincronizar" : "Save GBA guardado localmente");
    if (cloudState.client && cloudState.user && cloudSaveSupported()) {
      syncCurrentSaveToCloud().catch((error) => setCloudStatus("error", `No pude sincronizar: ${error.message}`));
    }
    afterInput(`save_slot_${slot}`, `SRAM de GBA guardado en slot ${slot}. Guarda progreso del juego, no un freeze state.`);
    return;
  }

  if (uiState.currentSystem === "ds") {
    updateStatus("DS usa savefiles internos. Usa Importar/Exportar save.");
    return;
  }

  window.saveState(gbcSaveSlotName(slot));
  markSaveSyncState(cloudState.user ? "pending" : "local", cloudState.user ? "Save GB/GBC pendiente de sincronizar" : "Save GB/GBC guardado localmente");
  if (cloudState.client && cloudState.user && cloudSaveSupported()) {
    syncCurrentSaveToCloud().catch((error) => setCloudStatus("error", `No pude sincronizar: ${error.message}`));
  }
  afterInput(`save_slot_${slot}`, `Save state guardado en slot ${slot}.`);
}

function loadFromSlot(slot) {
  if (EMULATORJS_SYSTEMS.has(uiState.currentSystem)) {
    updateStatus("SNES, N64, PS1 y PSP usan el gestor interno del core web para saves.");
    return;
  }
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
      : EMULATORJS_SYSTEMS.has(system)
        ? {
            active: desktopRuntime.active,
            family: system === "psp" ? "handheld" : "desktop",
            requiresBios: desktopNeedsBios(system),
            biosLoaded: hasDesktopBios(system),
            canvas: elements.canvas ? { width: elements.canvas.width, height: elements.canvas.height } : null,
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
        enabled: false,
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
    pulseHardwareControl(buttonElement, 120);
    holdButton(button, 85);
    afterInput(button);
  };

  buttonElement.addEventListener("pointerdown", triggerInput);
  buttonElement.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    triggerInput(event);
  });
}

function bindPspAppButton(buttonElement) {
  const action = buttonElement.dataset.appAction;
  const triggerAction = (event) => {
    event.preventDefault();
    pulseHardwareControl(buttonElement, 140);
    triggerPspAppAction(action);
  };
  buttonElement.addEventListener("pointerdown", triggerAction);
  buttonElement.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    triggerAction(event);
  });
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

  elements.pspAppButtons.forEach((button) => {
    if (button.dataset.bound) return;
    button.dataset.bound = "true";
    bindPspAppButton(button);
  });

  bindPspAnalogStick();
}

loadPrefs();
renderSystemShell(uiState.currentSystem);
refreshElements();
syncCanvasResolution(uiState.currentSystem);
syncFormState();
applyVisualPrefs();
renderStatePanel();
renderLibrary();
updateStatus();
bindDynamicElements();
syncCloudUi();
if ((uiState.cloudUrl || uiState.cloudAnonKey) && window.supabase?.createClient) {
  connectSupabaseClient().catch((error) => {
    setCloudStatus("error", `No pude conectar Supabase al arrancar: ${error.message}`);
  });
}

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
        : EMULATORJS_SYSTEMS.has(uiState.systemPreference)
          ? `Modo manual ${uiState.systemPreference.toUpperCase()} activo. Esperando una ROM compatible para lanzar el core web.`
        : `Modo manual ${uiState.systemPreference.toUpperCase()} activo.`,
    );
  });
});

elements.romInput.addEventListener("change", async (event) => {
  const files = [...(event.target.files || [])];
  if (files.length === 0) return;

  const validationError = validateRomSelection(files);
  if (validationError) {
    updateStatus(validationError);
    event.target.value = "";
    return;
  }

  try {
    await loadRom(files);
    persistPrefs();
  } catch (error) {
    console.error(error);
    updateStatus(`No se pudo cargar la ROM: ${error.message}`);
  } finally {
    event.target.value = "";
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
    return;
  }

  const libraryActivate = event.target.closest("[data-library-activate]");
  if (libraryActivate) {
    const targetSystem = libraryActivate.dataset.libraryActivate;
    uiState.systemPreference = targetSystem;
    setCurrentSystem(targetSystem);
    persistAndRender();
    updateStatus(`Biblioteca preparada para ${systemDisplayName(targetSystem)}. Solo vuelve a subir esa ROM para retomarla.`);
    triggerUiPulse(elements.libraryHero);
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

elements.openLibraryBtn?.addEventListener("click", () => {
  setDrawerOpen(true);
  window.requestAnimationFrame(() => {
    elements.libraryPanel?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
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

elements.touchControlsToggle.addEventListener("change", (event) => {
  uiState.touchControls = event.target.checked;
  persistAndRender();
});

elements.themeSelect.addEventListener("change", (event) => {
  uiState.theme = event.target.value;
  persistAndRender();
});

elements.libraryViewButtons?.forEach((button) => {
  button.addEventListener("click", () => {
    uiState.libraryView = button.dataset.libraryView || "shelf";
    persistAndRender();
    updateStatus(`Vista de biblioteca: ${uiState.libraryView}.`);
    triggerUiPulse(elements.libraryGrid);
  });
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

if (elements.cloudUrlInput) {
  elements.cloudUrlInput.addEventListener("input", (event) => {
    uiState.cloudUrl = event.target.value.trim();
    persistPrefs();
  });
}

if (elements.cloudAnonKeyInput) {
  elements.cloudAnonKeyInput.addEventListener("input", (event) => {
    uiState.cloudAnonKey = event.target.value.trim();
    persistPrefs();
  });
}

if (elements.cloudEmailInput) {
  elements.cloudEmailInput.addEventListener("input", (event) => {
    uiState.cloudEmail = event.target.value.trim();
    persistPrefs();
  });
}

if (elements.cloudConnectBtn) {
  elements.cloudConnectBtn.addEventListener("click", async () => {
    try {
      await connectSupabaseClient();
      persistPrefs();
      updateStatus("Supabase conectado.");
    } catch (error) {
      setCloudStatus("error", `No pude conectar Supabase: ${error.message}`);
    }
  });
}

if (elements.cloudSignInBtn) {
  elements.cloudSignInBtn.addEventListener("click", async () => {
    try {
      if (!cloudState.client) {
        await connectSupabaseClient();
      }
      const { email } = currentCloudConfig();
      if (!email) {
        throw new Error("Escribe tu email antes de pedir el magic link.");
      }
      const { error } = await cloudState.client.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: window.location.href,
        },
      });
      if (error) throw error;
      setCloudStatus("listo", "Magic link enviado. Revisa tu correo y vuelve a esta app.");
      updateStatus("Magic link enviado.");
    } catch (error) {
      setCloudStatus("error", `No pude enviar el magic link: ${error.message}`);
    }
  });
}

if (elements.cloudSignOutBtn) {
  elements.cloudSignOutBtn.addEventListener("click", async () => {
    try {
      if (!cloudState.client) return;
      const { error } = await cloudState.client.auth.signOut();
      if (error) throw error;
      cloudState.user = null;
      cloudState.session = null;
      setCloudStatus("listo", "Sesion cerrada. Puedes iniciar con otro correo.");
      updateStatus("Sesion Supabase cerrada.");
    } catch (error) {
      setCloudStatus("error", `No pude cerrar sesion: ${error.message}`);
    }
  });
}

if (elements.cloudUploadBtn) {
  elements.cloudUploadBtn.addEventListener("click", async () => {
    try {
      await syncCurrentSaveToCloud();
      updateStatus("Save subido a la nube.");
    } catch (error) {
      setCloudStatus("error", `No pude subir el save: ${error.message}`);
      updateStatus(`No se pudo subir a nube: ${error.message}`);
    }
  });
}

if (elements.cloudDownloadBtn) {
  elements.cloudDownloadBtn.addEventListener("click", async () => {
    try {
      await restoreSaveFromCloud();
      updateStatus("Save restaurado desde la nube.");
    } catch (error) {
      setCloudStatus("error", `No pude restaurar el save: ${error.message}`);
      updateStatus(`No se pudo restaurar desde nube: ${error.message}`);
    }
  });
}

elements.exportSaveBtn.addEventListener("click", exportCurrentSave);
elements.drawerExportSaveBtn.addEventListener("click", exportCurrentSave);

elements.saveFileInput.addEventListener("change", (event) => {
  const file = event.target.files && event.target.files[0];
  importCurrentSave(file);
});

elements.ps1BiosInput.addEventListener("change", (event) => {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  updatePs1Bios(file);
  persistAndRender();
  if (
    uiState.currentSystem === "ps1"
    && desktopRuntime.pendingLaunch?.system === "ps1"
    && !desktopRuntime.active
    && !uiState.awaitingStart
  ) {
    updateStatus(`BIOS PS1 cargada: ${file.name}. Iniciando core.`);
    loadPendingDesktopRuntime();
  } else {
    updateStatus(`BIOS PS1 cargada: ${file.name}.`);
  }
  event.target.value = "";
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
window.addEventListener("message", (event) => {
  if (!event.data?.type) return;
  if (event.data.type === "desktop-frame-ready") {
    if (!desktopRuntime.iframe || event.data.system !== uiState.currentSystem) return;
    sendDesktopCommand("set-volume", uiState.volume / 100);
    desktopRuntime.iframe.focus();
    return;
  }
  if (event.data.type === "desktop-save-ready") {
    if (event.data.system !== uiState.currentSystem) return;
    desktopRuntime.bridgeReady = true;
    desktopRuntime.savePath = event.data.savePath || "";
    markSaveSyncState(cloudState.user ? "pending" : "local", cloudState.user ? `Bridge ${systemDisplayName(uiState.currentSystem)} lista para nube` : `Bridge ${systemDisplayName(uiState.currentSystem)} lista local`);
    return;
  }
  if (event.data.type === "desktop-command-result") {
    const pending = desktopBridge.pending.get(event.data.requestId);
    if (!pending) return;
    window.clearTimeout(pending.timeoutId);
    desktopBridge.pending.delete(event.data.requestId);
    pending.resolve(event.data.result);
    return;
  }
  if (event.data.type === "desktop-command-error") {
    const pending = desktopBridge.pending.get(event.data.requestId);
    if (!pending) return;
    window.clearTimeout(pending.timeoutId);
    desktopBridge.pending.delete(event.data.requestId);
    pending.reject(new Error(event.data.message || "Error del core web."));
  }
});
window.setInterval(() => {
  applyCheats();
  renderStatePanel();
}, 180);
window.setInterval(() => {
  maybeAutoSyncDesktopCloudSave();
}, DESKTOP_CLOUD_SYNC_INTERVAL);

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
