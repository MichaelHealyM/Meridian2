/* PLC logic demo: START / STOP / seal-in, shown as ladder logic and structured text. */
(() => {
  // ---- seal-in-circuit ----
  function createSealInCircuitState() {
    return { startPressed: false, stopPressed: false, lampOn: false };
  }
  /** One PLC scan: the output is its own contact (the "seal-in"), so it stays on after START is released. */
  function runScanCycle(state) {
    state.lampOn = (state.startPressed || state.lampOn) && !state.stopPressed;
  }

  // ---- svg-drawing ----
  const POWERED_COLOR = '#1f9d6b';
  const UNPOWERED_COLOR = '#9aa7b2';
  const CONTACT_BAR_OFFSET = 9;
  const CONTACT_BAR_HALF_HEIGHT = 14;
  const NORMALLY_CLOSED_SLASH_OFFSET = 12;
  const COIL_RADIUS = 14;
  const CONTACT_HALF_WIDTH = 40;
  const colorFor = (isPowered) => (isPowered ? POWERED_COLOR : UNPOWERED_COLOR);
  function drawWire(fromX, fromY, toX, toY, isPowered) {
    return `<path d="M${fromX} ${fromY}L${toX} ${toY}" stroke="${colorFor(isPowered)}" stroke-width="3" fill="none"/>`;
  }
  function drawText(x, y, text, { anchor = 'middle', opacity = 1 } = {}) {
    return `<text x="${x}" y="${y}" fill="currentColor" fill-opacity="${opacity}" font-size="11" text-anchor="${anchor}" font-family="IBM Plex Mono,monospace">${text}</text>`;
  }
  function drawContact(spec) {
    const { x, y, tagName, instruction, isNormallyClosed, isInputActive, isPoweredIn } = spec;
    const isClosed = isNormallyClosed ? !isInputActive : isInputActive;
    const isPoweredOut = isPoweredIn && isClosed;
    const slash = isNormallyClosed
      ? `M${x - NORMALLY_CLOSED_SLASH_OFFSET} ${y + NORMALLY_CLOSED_SLASH_OFFSET}L${x + NORMALLY_CLOSED_SLASH_OFFSET} ${y - NORMALLY_CLOSED_SLASH_OFFSET}`
      : '';
    const bars = `M${x - CONTACT_BAR_OFFSET} ${y - CONTACT_BAR_HALF_HEIGHT}V${y + CONTACT_BAR_HALF_HEIGHT}M${x + CONTACT_BAR_OFFSET} ${y - CONTACT_BAR_HALF_HEIGHT}V${y + CONTACT_BAR_HALF_HEIGHT}${slash}`;
    const svg =
      drawWire(x - CONTACT_HALF_WIDTH, y, x - CONTACT_BAR_OFFSET, y, isPoweredIn) +
      drawWire(x + CONTACT_BAR_OFFSET, y, x + CONTACT_HALF_WIDTH, y, isPoweredOut) +
      `<path d="${bars}" stroke="${colorFor(isPoweredOut)}" stroke-width="3.5" fill="none"/>` +
      drawText(x, y - 22, tagName) +
      drawText(x, y + 32, instruction, { opacity: 0.6 });
    return { svg, isPoweredOut };
  }
  function drawCoil({ x, y, tagName, instruction, isEnergized }) {
    return (
      drawWire(x - CONTACT_HALF_WIDTH, y, x - COIL_RADIUS, y, isEnergized) +
      `<circle cx="${x}" cy="${y}" r="${COIL_RADIUS}" fill="${isEnergized ? '#1f9d6b44' : 'none'}" stroke="${colorFor(isEnergized)}" stroke-width="3.5"/>` +
      drawWire(x + COIL_RADIUS, y, x + CONTACT_HALF_WIDTH, y, isEnergized) +
      drawText(x, y - 22, tagName) +
      drawText(x, y + 32, instruction, { opacity: 0.6 })
    );
  }

  // ---- ladder-diagram ----
  const LEFT_RAIL_X = 16;
  const RIGHT_RAIL_X = 624;
  const MAIN_RUNG_Y = 60;
  const SEAL_IN_RUNG_Y = 150;
  const START_CONTACT_X = 130;
  const STOP_CONTACT_X = 300;
  const COIL_X = 520;
  const SEAL_IN_BRANCH_START_X = 70;
  const SEAL_IN_BRANCH_JOIN_X = 210;
  const startContactLeftX = START_CONTACT_X - CONTACT_HALF_WIDTH;
  const startContactRightX = START_CONTACT_X + CONTACT_HALF_WIDTH;
  const stopContactLeftX = STOP_CONTACT_X - CONTACT_HALF_WIDTH;
  const stopContactRightX = STOP_CONTACT_X + CONTACT_HALF_WIDTH;
  const coilLeftX = COIL_X - CONTACT_HALF_WIDTH;
  const coilRightX = COIL_X + CONTACT_HALF_WIDTH;
  /** Controller tags, shared with the structured text view so both show the same names. */
  const TAG = { start: 'Start_PB', stop: 'Stop_PB', runLed: 'Run_LED' };
  function renderLadderDiagram(state) {
    const start = drawContact({
      x: START_CONTACT_X,
      y: MAIN_RUNG_Y,
      tagName: TAG.start,
      instruction: 'XIC',
      isNormallyClosed: false,
      isInputActive: state.startPressed,
      isPoweredIn: true,
    });
    const sealIn = drawContact({
      x: START_CONTACT_X,
      y: SEAL_IN_RUNG_Y,
      tagName: TAG.runLed,
      instruction: 'XIC',
      isNormallyClosed: false,
      isInputActive: state.lampOn,
      isPoweredIn: true,
    });
    const isPoweredAtBranchJoin = start.isPoweredOut || sealIn.isPoweredOut;
    const stop = drawContact({
      x: STOP_CONTACT_X,
      y: MAIN_RUNG_Y,
      tagName: TAG.stop,
      instruction: 'XIO',
      isNormallyClosed: true,
      isInputActive: state.stopPressed,
      isPoweredIn: isPoweredAtBranchJoin,
    });
    return (
      `<svg viewBox="0 0 640 200" class="ladder-svg w-100" role="img" aria-label="Ladder logic with live power flow">` +
      `<path d="M${LEFT_RAIL_X} 10V190M${RIGHT_RAIL_X} 10V190" stroke="currentColor" stroke-width="4"/>` +
      drawText(
        24,
        24,
        `Rung 0: ${TAG.start} latches ${TAG.runLed} via the seal-in; ${TAG.stop} drops it out`,
        {
          anchor: 'start',
        },
      ) +
      drawWire(LEFT_RAIL_X, MAIN_RUNG_Y, startContactLeftX, MAIN_RUNG_Y, true) +
      drawWire(SEAL_IN_BRANCH_START_X, MAIN_RUNG_Y, SEAL_IN_BRANCH_START_X, SEAL_IN_RUNG_Y, true) +
      drawWire(SEAL_IN_BRANCH_START_X, SEAL_IN_RUNG_Y, startContactLeftX, SEAL_IN_RUNG_Y, true) +
      start.svg +
      sealIn.svg +
      drawWire(
        startContactRightX,
        MAIN_RUNG_Y,
        SEAL_IN_BRANCH_JOIN_X,
        MAIN_RUNG_Y,
        start.isPoweredOut,
      ) +
      drawWire(
        startContactRightX,
        SEAL_IN_RUNG_Y,
        SEAL_IN_BRANCH_JOIN_X,
        SEAL_IN_RUNG_Y,
        sealIn.isPoweredOut,
      ) +
      drawWire(
        SEAL_IN_BRANCH_JOIN_X,
        SEAL_IN_RUNG_Y,
        SEAL_IN_BRANCH_JOIN_X,
        MAIN_RUNG_Y,
        isPoweredAtBranchJoin,
      ) +
      drawWire(
        SEAL_IN_BRANCH_JOIN_X,
        MAIN_RUNG_Y,
        stopContactLeftX,
        MAIN_RUNG_Y,
        isPoweredAtBranchJoin,
      ) +
      stop.svg +
      drawWire(stopContactRightX, MAIN_RUNG_Y, coilLeftX, MAIN_RUNG_Y, stop.isPoweredOut) +
      drawCoil({
        x: COIL_X,
        y: MAIN_RUNG_Y,
        tagName: TAG.runLed,
        instruction: 'OTE',
        isEnergized: state.lampOn,
      }) +
      drawWire(coilRightX, MAIN_RUNG_Y, RIGHT_RAIL_X, MAIN_RUNG_Y, stop.isPoweredOut) +
      '</svg>'
    );
  }

  // ---- structured-text ----
  const sourceLines = [
    { text: 'PROGRAM StartStop' },
    { text: 'VAR' },
    { text: `  ${TAG.start} : BOOL;`, showsLiveValues: true },
    { text: `  ${TAG.stop} : BOOL;`, showsLiveValues: true },
    { text: `  ${TAG.runLed} : BOOL;`, showsLiveValues: true },
    { text: 'END_VAR' },
    { text: '' },
    { text: `(* Seal-in: ${TAG.runLed} holds itself on after ${TAG.start} is released *)` },
    {
      text: `${TAG.runLed} := (${TAG.start} OR ${TAG.runLed}) AND NOT ${TAG.stop};`,
      showsLiveValues: true,
    },
    { text: 'END_PROGRAM' },
  ];
  const KEYWORDS = 'PROGRAM|END_PROGRAM|VAR|END_VAR|BOOL|AND|OR|NOT';
  const TOKEN_PATTERN = new RegExp(
    `(\\(\\*.*?\\*\\))|\\b(${KEYWORDS})\\b|\\b(${Object.values(TAG).join('|')})\\b`,
    'g',
  );
  function highlight(text, tagValues) {
    return text.replace(TOKEN_PATTERN, (match, comment, keyword, tag) => {
      if (comment) return `<span class="text-body-secondary fst-italic">${comment}</span>`;
      if (keyword) return `<span class="text-info-emphasis">${keyword}</span>`;
      if (!tagValues) return match;
      const trueClasses = tagValues[tag] ? ' bg-success text-white' : '';
      return `<span class="rounded-1 px-1${trueClasses}">${tag}</span>`;
    });
  }
  /** `isShown` says whether to light START / STOP: held down, or pressed within the last moment. */
  function renderStructuredText(state, isShown) {
    const tagValues = {
      [TAG.start]: isShown.start,
      [TAG.stop]: isShown.stop,
      [TAG.runLed]: state.lampOn,
    };
    return sourceLines
      .map(
        ({ text, showsLiveValues }, index) =>
          `<span class="d-flex gap-3 px-3"><span class="structured-text__number flex-shrink-0 text-end text-body-secondary user-select-none">${index + 1}</span><code class="small">${highlight(text, showsLiveValues ? tagValues : null)}</code></span>`,
      )
      .join(''); // inside a <pre>: Bootstrap keeps the spacing, and resets the <code> colour
  }

  // ---- plc-demo.client ----
  const KEYBOARD_SHORTCUTS = { s: 'start', x: 'stop' };
  /** A click is over in ~100 ms, too fast to see. The structured text keeps a press lit this long. */
  const MIN_HIGHLIGHT_MS = 600;
  const highlightUntil = { start: 0, stop: 0 };
  let highlightTimer;
  const circuit = createSealInCircuitState();
  const ladderDiagram = document.querySelector('[data-ladder-diagram]');
  const structuredText = document.querySelector('[data-structured-text]');
  const runLed = document.querySelector('[data-plc-led]');
  const startButton = document.querySelector('[data-plc-button="start"]');
  const stopButton = document.querySelector('[data-plc-button="stop"]');
  function render() {
    const now = performance.now();
    const isShown = {
      start: circuit.startPressed || now < highlightUntil.start,
      stop: circuit.stopPressed || now < highlightUntil.stop,
    };
    runLed.classList.toggle('is-lit', circuit.lampOn);
    startButton.classList.toggle('is-pressed', circuit.startPressed);
    stopButton.classList.toggle('is-pressed', circuit.stopPressed);
    if (ladderDiagram) ladderDiagram.innerHTML = renderLadderDiagram(circuit);
    if (structuredText) structuredText.innerHTML = renderStructuredText(circuit, isShown);
    // come back when the earliest lingering highlight runs out, so it switches off by itself
    clearTimeout(highlightTimer);
    const pending = [highlightUntil.start, highlightUntil.stop].filter((until) => until > now);
    if (pending.length) highlightTimer = setTimeout(render, Math.min(...pending) - now + 20);
  }
  function setInput(input, isPressed) {
    if (input === 'start') circuit.startPressed = isPressed;
    else circuit.stopPressed = isPressed;
    if (isPressed) highlightUntil[input] = performance.now() + MIN_HIGHLIGHT_MS;
    runScanCycle(circuit);
    render();
  }
  const panel = document.querySelector('[data-plc-panel]');
  document.querySelectorAll('[data-plc-button]').forEach((button) => {
    const input = button.dataset.plcButton;
    button.addEventListener('pointerdown', () => setInput(input, true));
    for (const type of ['pointerup', 'pointerleave', 'pointercancel']) {
      button.addEventListener(type, () => setInput(input, false));
    }
  });
  // Keyboard: Space or Enter hold the focused button down, and S / X press START / STOP, but only while
  // focus is inside the control panel (a page-wide single-key shortcut fails WCAG 2.1.4).
  const heldByKey = new Set();
  for (const type of ['keydown', 'keyup']) {
    panel.addEventListener(type, (event) => {
      const { key, repeat, target } = event;
      const isActivation = key === ' ' || key === 'Enter';
      const input = isActivation
        ? target.closest('[data-plc-button]')?.dataset.plcButton
        : KEYBOARD_SHORTCUTS[key.toLowerCase()];
      if (!input || repeat) return;
      event.preventDefault();
      const isDown = type === 'keydown';
      heldByKey[isDown ? 'add' : 'delete'](input);
      setInput(input, isDown);
    });
  }
  // Moving focus away while a key is held would swallow the keyup, so let go
  panel.addEventListener('focusout', () => {
    heldByKey.forEach((input) => setInput(input, false));
    heldByKey.clear();
  });
  render();
})();
