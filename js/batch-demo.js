/* Batch sequence simulation: the vessel in the hero and the sequence chart in "Try the logic". */
(() => {
  // ---- batch-sequence ----
  /** Index of each step in the media-prep batch, matching `sequenceSteps`. */
  const STEP = {
    idle: 0,
    chargeA: 1,
    heat: 2,
    chargeB: 3,
    mix: 4,
    transfer: 5,
  };
  const sequenceSteps = [
    {
      code: 'S0',
      name: 'Idle',
      description: 'Vessel empty, valves closed',
      exitCondition: 'Start batch',
    },
    {
      code: 'S1',
      name: 'Charge A',
      description: 'Open XV-101: add WFI to 50 %',
      exitCondition: 'Level ≥ 50 %',
    },
    {
      code: 'S2',
      name: 'Heat',
      description: 'Jacket on: warm to 37 °C',
      exitCondition: 'Temp ≥ 37 °C',
    },
    {
      code: 'S3',
      name: 'Charge B',
      description: 'Open XV-102: add concentrate to 90 %',
      exitCondition: 'Level ≥ 90 %',
    },
    {
      code: 'S4',
      name: 'Mix',
      description: 'Agitator M-301 on for the mix time',
      exitCondition: 'Mix time elapsed',
    },
    {
      code: 'S5',
      name: 'Transfer',
      description: 'Open XV-103: move batch downstream',
      exitCondition: 'Level ≤ 5 %',
    },
  ];

  // ---- batch-simulation ----
  const TICK_INTERVAL_MS = 100;
  const TICKS_PER_SIMULATED_MINUTE = 10;
  const MIX_DURATION_TICKS = 80;
  const AMBIENT_TEMPERATURE_CELSIUS = 20;
  const TARGET_TEMPERATURE_CELSIUS = 37;
  const LEVEL_AFTER_CHARGE_A_PERCENT = 50;
  const LEVEL_AFTER_CHARGE_B_PERCENT = 90;
  const EMPTY_LEVEL_PERCENT = 5;
  const CHARGE_PERCENT_PER_TICK = 0.75;
  const TRANSFER_PERCENT_PER_TICK = 1.25;
  const HEAT_CELSIUS_PER_TICK = 0.3;
  const COOL_CELSIUS_PER_TICK = 0.3;
  const IDLE_TICKS_BEFORE_AUTO_START = 40;
  function createInitialBatchState(repeatAutomatically) {
    return {
      stepIndex: STEP.idle,
      levelPercent: 0,
      temperatureCelsius: AMBIENT_TEMPERATURE_CELSIUS,
      mixTicksElapsed: 0,
      idleTicks: 0,
      repeatAutomatically,
    };
  }
  function startBatch(state) {
    if (state.stepIndex !== STEP.idle) return;
    state.stepIndex = STEP.chargeA;
    state.idleTicks = 0;
  }
  /** Moves the simulated batch forward by one tick of TICK_INTERVAL_MS. */
  function advanceBatchState(state) {
    switch (state.stepIndex) {
      case STEP.idle:
        state.temperatureCelsius = Math.max(
          AMBIENT_TEMPERATURE_CELSIUS,
          state.temperatureCelsius - COOL_CELSIUS_PER_TICK,
        );
        state.idleTicks = state.repeatAutomatically ? state.idleTicks + 1 : 0;
        if (state.idleTicks > IDLE_TICKS_BEFORE_AUTO_START) startBatch(state);
        break;
      case STEP.chargeA:
        state.levelPercent += CHARGE_PERCENT_PER_TICK;
        if (state.levelPercent >= LEVEL_AFTER_CHARGE_A_PERCENT) state.stepIndex = STEP.heat;
        break;
      case STEP.heat:
        state.temperatureCelsius += HEAT_CELSIUS_PER_TICK;
        if (state.temperatureCelsius >= TARGET_TEMPERATURE_CELSIUS) state.stepIndex = STEP.chargeB;
        break;
      case STEP.chargeB:
        state.levelPercent += CHARGE_PERCENT_PER_TICK;
        if (state.levelPercent >= LEVEL_AFTER_CHARGE_B_PERCENT) state.stepIndex = STEP.mix;
        break;
      case STEP.mix:
        state.mixTicksElapsed += 1;
        if (state.mixTicksElapsed >= MIX_DURATION_TICKS) {
          state.mixTicksElapsed = 0;
          state.stepIndex = STEP.transfer;
        }
        break;
      case STEP.transfer:
        state.levelPercent = Math.max(0, state.levelPercent - TRANSFER_PERCENT_PER_TICK);
        if (state.levelPercent <= EMPTY_LEVEL_PERCENT) {
          state.levelPercent = 0;
          state.stepIndex = STEP.idle;
        }
        break;
    }
  }
  /** How far through the current step the batch is, from 0 to 100. */
  function stepProgressPercent(state) {
    const fractionDone = (() => {
      switch (state.stepIndex) {
        case STEP.chargeA:
          return state.levelPercent / LEVEL_AFTER_CHARGE_A_PERCENT;
        case STEP.heat:
          return (
            (state.temperatureCelsius - AMBIENT_TEMPERATURE_CELSIUS) /
            (TARGET_TEMPERATURE_CELSIUS - AMBIENT_TEMPERATURE_CELSIUS)
          );
        case STEP.chargeB:
          return (
            (state.levelPercent - LEVEL_AFTER_CHARGE_A_PERCENT) /
            (LEVEL_AFTER_CHARGE_B_PERCENT - LEVEL_AFTER_CHARGE_A_PERCENT)
          );
        case STEP.mix:
          return state.mixTicksElapsed / MIX_DURATION_TICKS;
        case STEP.transfer:
          return (
            (LEVEL_AFTER_CHARGE_B_PERCENT - state.levelPercent) /
            (LEVEL_AFTER_CHARGE_B_PERCENT - EMPTY_LEVEL_PERCENT)
          );
        default:
          return 0;
      }
    })();
    return Math.round(Math.min(1, Math.max(0, fractionDone)) * 100);
  }

  // ---- sequence-chart ----
  function renderSequenceChart(state) {
    const progressPercent = stepProgressPercent(state);
    return sequenceSteps
      .map((step, index) => {
        const isActive = state.stepIndex === index;
        const progressBar =
          isActive && index > 0
            ? `<div class="sequence-step__progress"><i style="width:${progressPercent}%"></i></div>`
            : '';
        const returnsToStart = index === sequenceSteps.length - 1 ? ' ↺ S0' : '';
        return `<div class="sequence-step${index === 0 ? ' sequence-step--initial' : ''}${isActive ? ' sequence-step--active' : ''}">
        <b>${step.code}</b> ${step.name}
        <small class="sequence-step__description">${step.description}</small>${progressBar}
      </div>
      <div class="sequence-transition">T${index + 1}: ${step.exitCondition}${returnsToStart}</div>`;
      })
      .join('');
  }

  // ---- vessel-scene ----
  const VESSEL_BOTTOM_Y = 220;
  const LIQUID_PIXELS_PER_PERCENT = 1.3;
  const WARM_LIQUID_THRESHOLD_CELSIUS = 30;
  const LABEL = 'font-size="10" fill="currentColor" font-family="IBM Plex Mono,monospace"';
  const SCENE_MARKUP = `<svg viewBox="0 0 320 262" class="vessel-scene" role="img" aria-label="Media preparation vessel fed from tanks A and B">
  <rect x="15" y="8" width="80" height="44" rx="6" fill="none" stroke="currentColor" stroke-width="2"/>
  <text x="55" y="34" text-anchor="middle" ${LABEL}>A · WFI</text>
  <rect x="225" y="8" width="80" height="44" rx="6" fill="none" stroke="currentColor" stroke-width="2"/>
  <text x="265" y="34" text-anchor="middle" ${LABEL}>B · Conc.</text>
  <path class="vessel-pipe" d="M55 52V100H120"/><path class="vessel-flow vessel-flow--source-a" d="M55 52V100H120"/>
  <path class="vessel-pipe" d="M265 52V100H220"/><path class="vessel-flow vessel-flow--source-b" d="M265 52V100H220"/>
  <path class="vessel-pipe" d="M170 220V240H300"/><path class="vessel-flow vessel-flow--transfer" d="M170 220V240H300"/>
  <rect class="vessel-jacket" x="115" y="85" width="110" height="140" rx="10"/>
  <rect class="vessel-liquid" x="122" y="${VESSEL_BOTTOM_Y}" width="96" height="0"/>
  <rect x="120" y="90" width="100" height="130" rx="8" fill="none" stroke="currentColor" stroke-width="3"/>
  <path d="M120 155H220M120 103H220" stroke="currentColor" stroke-opacity=".35" stroke-dasharray="3 3"/>
  <text x="125" y="152" ${LABEL} fill-opacity=".6">50 %</text>
  <text x="125" y="100" ${LABEL} fill-opacity=".6">90 %</text>
  <path d="M170 76V210" stroke="currentColor" stroke-width="3"/>
  <path class="vessel-impeller" d="M148 210H192"/>
  <rect class="vessel-valve vessel-valve--agitator" x="160" y="62" width="20" height="14" rx="2"/><text x="186" y="73" ${LABEL}>M-301</text>
  <rect class="vessel-valve vessel-valve--source-a" x="49" y="70" width="12" height="12" rx="2"/><text x="66" y="80" ${LABEL}>XV-101</text>
  <rect class="vessel-valve vessel-valve--source-b" x="259" y="70" width="12" height="12" rx="2"/><text x="254" y="80" text-anchor="end" ${LABEL}>XV-102</text>
  <rect class="vessel-valve vessel-valve--transfer" x="164" y="224" width="12" height="12" rx="2"/><text x="182" y="234" ${LABEL}>XV-103</text>
  <text x="300" y="256" text-anchor="end" ${LABEL}>to next unit ▶</text>
  <text class="vessel-readout vessel-readout--level" x="160" y="20" text-anchor="middle" ${LABEL}></text>
  <text class="vessel-readout vessel-readout--temperature" x="160" y="33" text-anchor="middle" ${LABEL}></text>
  <text class="vessel-readout vessel-readout--mix" x="160" y="46" text-anchor="middle" ${LABEL}></text>
</svg>`;
  /** Which batch step opens each valve, runs each flow animation and runs the agitator. */
  const FLOW_STEP_BY_SELECTOR = {
    '.vessel-flow--source-a': STEP.chargeA,
    '.vessel-flow--source-b': STEP.chargeB,
    '.vessel-flow--transfer': STEP.transfer,
  };
  const OPEN_VALVE_STEP_BY_SELECTOR = {
    '.vessel-valve--source-a': STEP.chargeA,
    '.vessel-valve--source-b': STEP.chargeB,
    '.vessel-valve--transfer': STEP.transfer,
    '.vessel-valve--agitator': STEP.mix,
  };
  function mountVessel(container) {
    container.innerHTML = SCENE_MARKUP;
  }
  /** Updates attributes and classes only, so the CSS animations are never restarted. */
  function updateVessel(container, state) {
    const part = (selector) => container.querySelector(selector);
    const liquidHeight = state.levelPercent * LIQUID_PIXELS_PER_PERCENT;
    const liquid = part('.vessel-liquid');
    liquid.setAttribute('y', String(VESSEL_BOTTOM_Y - liquidHeight));
    liquid.setAttribute('height', String(liquidHeight));
    liquid.classList.toggle('is-warm', state.temperatureCelsius > WARM_LIQUID_THRESHOLD_CELSIUS);
    for (const [selector, step] of Object.entries(FLOW_STEP_BY_SELECTOR)) {
      part(selector).classList.toggle('is-active', state.stepIndex === step);
    }
    for (const [selector, step] of Object.entries(OPEN_VALVE_STEP_BY_SELECTOR)) {
      part(selector).classList.toggle('is-open', state.stepIndex === step);
    }
    part('.vessel-jacket').classList.toggle('is-active', state.stepIndex === STEP.heat);
    part('.vessel-impeller').classList.toggle('is-active', state.stepIndex === STEP.mix);
    const mixMinutes = Math.round(state.mixTicksElapsed / TICKS_PER_SIMULATED_MINUTE);
    const mixTotalMinutes = MIX_DURATION_TICKS / TICKS_PER_SIMULATED_MINUTE;
    part('.vessel-readout--level').textContent = `LT-101 ${Math.round(state.levelPercent)} %`;
    part('.vessel-readout--temperature').textContent =
      `TT-201 ${state.temperatureCelsius.toFixed(1)} °C`;
    part('.vessel-readout--mix').textContent =
      state.stepIndex === STEP.mix ? `Mix ${mixMinutes} / ${mixTotalMinutes} min` : '';
  }

  // ---- batch-simulation.client ----
  const vesselContainers = [...document.querySelectorAll('[data-batch-vessel]')];
  const sequenceChart = document.querySelector('[data-sequence-chart]');
  const statusBadges = [...document.querySelectorAll('[data-batch-status]')];
  const repeatSwitch = document.querySelector('[data-batch-repeat]');
  let batchState = createInitialBatchState(repeatSwitch?.checked ?? true);
  function render() {
    const currentStep = sequenceSteps[batchState.stepIndex];
    if (sequenceChart) sequenceChart.innerHTML = renderSequenceChart(batchState);
    vesselContainers.forEach((container) => updateVessel(container, batchState));
    statusBadges.forEach(
      (badge) => (badge.textContent = `${currentStep.code} ${currentStep.name}`),
    );
  }
  vesselContainers.forEach((container) => mountVessel(container));
  document
    .querySelector('[data-batch-start]')
    ?.addEventListener('click', () => startBatch(batchState));
  document.querySelector('[data-batch-reset]')?.addEventListener('click', () => {
    batchState = createInitialBatchState(batchState.repeatAutomatically);
  });
  repeatSwitch?.addEventListener('change', () => {
    batchState.repeatAutomatically = repeatSwitch.checked;
  });
  setInterval(() => {
    if (document.hidden) return; // pause while the tab is in the background
    advanceBatchState(batchState);
    render();
  }, TICK_INTERVAL_MS);
  render();
})();
