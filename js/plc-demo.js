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
      `<svg viewBox="0 0 640 200" class="ladder-svg" role="img" aria-label="Ladder logic with live power flow">` +
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
    { text: `  ${TAG.start} : BOOL;` },
    { text: `  ${TAG.stop} : BOOL;` },
    { text: `  ${TAG.runLed} : BOOL;` },
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
      if (comment) return `<span class="structured-text__comment">${comment}</span>`;
      if (keyword) return `<span class="structured-text__keyword">${keyword}</span>`;
      if (!tagValues) return match;
      const trueClass = tagValues[tag] ? ' structured-text__tag--true' : '';
      return `<span class="structured-text__tag${trueClass}">${tag}</span>`;
    });
  }
  function renderStructuredText(state) {
    const tagValues = {
      [TAG.start]: state.startPressed,
      [TAG.stop]: state.stopPressed,
      [TAG.runLed]: state.lampOn,
    };
    return sourceLines
      .map(
        ({ text, showsLiveValues }, index) =>
          `<div class="structured-text__line"><i>${index + 1}</i><code>${highlight(text, showsLiveValues ? tagValues : null)}</code></div>`,
      )
      .join('');
  }

  // ---- plc-demo.client ----
  const KEYBOARD_SHORTCUTS = { s: 'start', x: 'stop' };
  const circuit = createSealInCircuitState();
  const ladderDiagram = document.querySelector('[data-ladder-diagram]');
  const structuredText = document.querySelector('[data-structured-text]');
  const runLed = document.querySelector('[data-plc-led]');
  const startButton = document.querySelector('[data-plc-button="start"]');
  const stopButton = document.querySelector('[data-plc-button="stop"]');
  function render() {
    runLed.classList.toggle('is-lit', circuit.lampOn);
    startButton.classList.toggle('is-pressed', circuit.startPressed);
    stopButton.classList.toggle('is-pressed', circuit.stopPressed);
    if (ladderDiagram) ladderDiagram.innerHTML = renderLadderDiagram(circuit);
    if (structuredText) structuredText.innerHTML = renderStructuredText(circuit);
  }
  function setInput(input, isPressed) {
    if (input === 'start') circuit.startPressed = isPressed;
    else circuit.stopPressed = isPressed;
    runScanCycle(circuit);
    render();
  }
  document.querySelectorAll('[data-plc-button]').forEach((button) => {
    const input = button.dataset.plcButton;
    button.addEventListener('pointerdown', () => setInput(input, true));
    for (const releaseEvent of ['pointerup', 'pointerleave', 'pointercancel']) {
      button.addEventListener(releaseEvent, () => setInput(input, false));
    }
  });
  for (const keyEvent of ['keydown', 'keyup']) {
    addEventListener(keyEvent, (event) => {
      const { key, repeat, target } = event;
      const input = KEYBOARD_SHORTCUTS[key.toLowerCase()];
      const isTypingInForm = target.closest('input, textarea, select');
      if (input && !repeat && !isTypingInForm) setInput(input, keyEvent === 'keydown');
    });
  }
  render();
})();
