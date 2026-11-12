/* Batch sequence simulation: the vessel in the hero and the sequence chart in "Try the logic". */
(() => {
  // ---- simulation ----
  const TICK_MS = 100;
  const TICKS_PER_MINUTE = 10; // simulated minutes shown in the mix readout
  const MIX_TICKS = 80;
  const AMBIENT_C = 20;
  const TARGET_C = 37;
  const WARM_C = 30; // the liquid changes colour above this
  const LEVEL_A = 50; // level (%) after charging A
  const LEVEL_B = 90; // level (%) after charging B
  const LEVEL_EMPTY = 5; // level (%) at which a transfer counts as finished
  const CHARGE_PER_TICK = 0.75; // level, %
  const DRAIN_PER_TICK = 1.25; // level, %
  const HEAT_PER_TICK = 0.3; // °C
  const COOL_PER_TICK = 0.3; // °C
  const IDLE_TICKS_BEFORE_AUTO_START = 40;

  const initialState = (repeat) => ({
    step: 0,
    level: 0,
    temp: AMBIENT_C,
    mixTicks: 0,
    idleTicks: 0,
    repeat,
  });
  const startBatch = (s) => {
    if (s.step !== 0) return;
    s.step = 1;
    s.idleTicks = 0;
  };

  /**
   * The batch, each step defined once. `run` moves the simulation on by one tick and returns true when
   * the step's exit condition is met; the next step then starts (the last one wraps round to Idle).
   * `progress` is how far through the step it is, 0 to 1. `readout` is optional extra vessel text.
   * The SVG valves, flows, jacket and agitator carry data-step="<index in this list>".
   */
  const STEPS = [
    {
      code: 'S0',
      name: 'Idle',
      description: 'Vessel empty, valves closed',
      exit: 'Start batch',
      run(s) {
        s.temp = Math.max(AMBIENT_C, s.temp - COOL_PER_TICK);
        s.idleTicks = s.repeat ? s.idleTicks + 1 : 0;
        if (s.idleTicks <= IDLE_TICKS_BEFORE_AUTO_START) return false;
        s.idleTicks = 0;
        return true;
      },
      progress: () => 0,
    },
    {
      code: 'S1',
      name: 'Charge A',
      description: 'Open XV-101: add WFI to 50 %',
      exit: 'Level ≥ 50 %',
      run: (s) => (s.level += CHARGE_PER_TICK) >= LEVEL_A,
      progress: (s) => s.level / LEVEL_A,
    },
    {
      code: 'S2',
      name: 'Heat',
      description: 'Jacket on: warm to 37 °C',
      exit: 'Temp ≥ 37 °C',
      run: (s) => (s.temp += HEAT_PER_TICK) >= TARGET_C,
      progress: (s) => (s.temp - AMBIENT_C) / (TARGET_C - AMBIENT_C),
    },
    {
      code: 'S3',
      name: 'Charge B',
      description: 'Open XV-102: add concentrate to 90 %',
      exit: 'Level ≥ 90 %',
      run: (s) => (s.level += CHARGE_PER_TICK) >= LEVEL_B,
      progress: (s) => (s.level - LEVEL_A) / (LEVEL_B - LEVEL_A),
    },
    {
      code: 'S4',
      name: 'Mix',
      description: 'Agitator M-301 on for the mix time',
      exit: 'Mix time elapsed',
      run(s) {
        if (++s.mixTicks < MIX_TICKS) return false;
        s.mixTicks = 0;
        return true;
      },
      progress: (s) => s.mixTicks / MIX_TICKS,
      readout: (s) =>
        `Mix ${Math.round(s.mixTicks / TICKS_PER_MINUTE)} / ${MIX_TICKS / TICKS_PER_MINUTE} min`,
    },
    {
      code: 'S5',
      name: 'Transfer',
      description: 'Open XV-103: move batch downstream',
      exit: 'Level ≤ 5 %',
      run(s) {
        s.level = Math.max(0, s.level - DRAIN_PER_TICK);
        if (s.level > LEVEL_EMPTY) return false;
        s.level = 0;
        return true;
      },
      progress: (s) => (LEVEL_B - s.level) / (LEVEL_B - LEVEL_EMPTY),
    },
  ];

  /** Moves the simulated batch forward by one tick of TICK_MS. */
  function advance(s) {
    if (STEPS[s.step].run(s)) s.step = (s.step + 1) % STEPS.length;
  }
  const progressPercent = (s) =>
    Math.round(Math.min(1, Math.max(0, STEPS[s.step].progress(s))) * 100);

  // ---- sequence-chart ----
  function renderSequenceChart(state) {
    const percent = progressPercent(state);
    return STEPS.map((step, index) => {
      const isActive = state.step === index;
      const progressBar =
        isActive && index > 0
          ? `<div class="progress rounded-0 mt-2" style="height: 4px" role="progressbar" aria-label="${step.name} progress" aria-valuenow="${percent}" aria-valuemin="0" aria-valuemax="100"><div class="progress-bar bg-success" style="width: ${percent}%"></div></div>`
          : '';
      const returnsToStart = index === STEPS.length - 1 ? ' ↺ S0' : '';
      return `<div class="sequence-step px-3 py-2${index === 0 ? ' sequence-step--initial' : ''}${isActive ? ' sequence-step--active' : ''}">
        <b>${step.code}</b> ${step.name}
        <small class="d-block text-body-secondary">${step.description}</small>${progressBar}
      </div>
      <div class="sequence-transition d-flex align-items-center ps-2 font-monospace small">T${index + 1}: ${step.exit}${returnsToStart}</div>`;
    }).join('');
  }

  // ---- vessel-scene ----
  const VESSEL_BOTTOM_Y = 220;
  const LIQUID_PIXELS_PER_PERCENT = 1.3;
  const LABEL = 'font-size="10" fill="currentColor" font-family="IBM Plex Mono,monospace"';
  const SCENE_MARKUP = `<svg viewBox="0 0 320 262" class="vessel-scene d-block w-100 mx-auto" role="img" aria-label="Media preparation vessel fed from tanks A and B">
  <rect x="15" y="8" width="80" height="44" rx="6" fill="none" stroke="currentColor" stroke-width="2"/>
  <text x="55" y="34" text-anchor="middle" ${LABEL}>A · WFI</text>
  <rect x="225" y="8" width="80" height="44" rx="6" fill="none" stroke="currentColor" stroke-width="2"/>
  <text x="265" y="34" text-anchor="middle" ${LABEL}>B · Conc.</text>
  <path class="vessel-pipe" d="M55 52V100H120"/><path class="vessel-flow" data-step="1" d="M55 52V100H120"/>
  <path class="vessel-pipe" d="M265 52V100H220"/><path class="vessel-flow" data-step="3" d="M265 52V100H220"/>
  <path class="vessel-pipe" d="M170 220V240H300"/><path class="vessel-flow" data-step="5" d="M170 220V240H300"/>
  <rect class="vessel-jacket" data-step="2" x="115" y="85" width="110" height="140" rx="10"/>
  <rect class="vessel-liquid" x="122" y="${VESSEL_BOTTOM_Y}" width="96" height="0"/>
  <rect x="120" y="90" width="100" height="130" rx="8" fill="none" stroke="currentColor" stroke-width="3"/>
  <path d="M120 155H220M120 103H220" stroke="currentColor" stroke-opacity=".35" stroke-dasharray="3 3"/>
  <text x="125" y="152" ${LABEL} fill-opacity=".6">50 %</text>
  <text x="125" y="100" ${LABEL} fill-opacity=".6">90 %</text>
  <path d="M170 76V210" stroke="currentColor" stroke-width="3"/>
  <path class="vessel-impeller" data-step="4" d="M148 210H192"/>
  <rect class="vessel-valve" data-step="4" x="160" y="62" width="20" height="14" rx="2"/><text x="186" y="73" ${LABEL}>M-301</text>
  <rect class="vessel-valve" data-step="1" x="49" y="70" width="12" height="12" rx="2"/><text x="66" y="80" ${LABEL}>XV-101</text>
  <rect class="vessel-valve" data-step="3" x="259" y="70" width="12" height="12" rx="2"/><text x="254" y="80" text-anchor="end" ${LABEL}>XV-102</text>
  <rect class="vessel-valve" data-step="5" x="164" y="224" width="12" height="12" rx="2"/><text x="182" y="234" ${LABEL}>XV-103</text>
  <text x="300" y="256" text-anchor="end" ${LABEL}>to next unit ▶</text>
  <text data-readout="level" x="160" y="20" text-anchor="middle" ${LABEL}></text>
  <text data-readout="temp" x="160" y="33" text-anchor="middle" ${LABEL}></text>
  <text data-readout="mix" x="160" y="46" text-anchor="middle" ${LABEL}></text>
</svg>`;
  /** Updates attributes and classes only, so the CSS animations are never restarted. */
  function updateVessel(box, state) {
    box.querySelectorAll('[data-step]').forEach((el) => {
      el.classList.toggle('is-active', Number(el.dataset.step) === state.step);
    });
    const height = state.level * LIQUID_PIXELS_PER_PERCENT;
    const liquid = box.querySelector('.vessel-liquid');
    liquid.setAttribute('y', String(VESSEL_BOTTOM_Y - height));
    liquid.setAttribute('height', String(height));
    liquid.classList.toggle('is-warm', state.temp > WARM_C);
    const setReadout = (name, text) => {
      box.querySelector(`[data-readout="${name}"]`).textContent = text;
    };
    setReadout('level', `LT-101 ${Math.round(state.level)} %`);
    setReadout('temp', `TT-201 ${state.temp.toFixed(1)} °C`);
    setReadout('mix', STEPS[state.step].readout?.(state) ?? '');
  }

  // ---- batch-simulation.client ----
  const vessels = [...document.querySelectorAll('[data-batch-vessel]')];
  const chart = document.querySelector('[data-sequence-chart]');
  const statusBadges = [...document.querySelectorAll('[data-batch-status]')];
  const repeatSwitch = document.querySelector('[data-batch-repeat]');
  let state = initialState(repeatSwitch?.checked ?? true);
  let lastChartMarkup = '';
  function render() {
    const { code, name } = STEPS[state.step];
    if (chart) {
      // Only touch the DOM when the chart changed (most ticks change nothing visible)
      const markup = renderSequenceChart(state);
      if (markup !== lastChartMarkup) chart.innerHTML = lastChartMarkup = markup;
    }
    vessels.forEach((box) => updateVessel(box, state));
    statusBadges.forEach((badge) => (badge.textContent = `${code} ${name}`));
  }
  vessels.forEach((box) => (box.innerHTML = SCENE_MARKUP));
  document.querySelector('[data-batch-start]')?.addEventListener('click', () => startBatch(state));
  document.querySelector('[data-batch-reset]')?.addEventListener('click', () => {
    state = initialState(state.repeat);
  });
  repeatSwitch?.addEventListener('change', () => {
    state.repeat = repeatSwitch.checked;
  });
  setInterval(() => {
    if (document.hidden) return; // pause while the tab is in the background
    advance(state);
    render();
  }, TICK_MS);
  render();
})();
