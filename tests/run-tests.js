const assert = require('assert');

const game = require('../game.js');
const {
  calculateStepSegments,
  applySpeed,
  SPEED,
  setSpeed,
  Vec,
} = game;

function createStubButtons() {
  return [0, 1, 2, 5].map((value) => ({ value, className: '' }));
}

function testCalculateStepSegments() {
  const fast = calculateStepSegments(2.5);
  assert.strictEqual(fast.iterations, 3, 'ceil should control iterations for fractional speed');
  assert.ok(Math.abs(fast.subStep * fast.iterations - 2.5) < 1e-9, 'substeps should conserve total speed');

  const paused = calculateStepSegments(0);
  assert.strictEqual(paused.iterations, 0, 'paused state should not iterate');
  assert.strictEqual(paused.subStep, 0, 'paused state should skip sub steps');
}

function propertyConservesSpeed() {
  // property test: aggregated subSteps equals requested speed (monotonic scaling)
  for (let s = 0; s <= 5; s += 0.25) {
    const { iterations, subStep } = calculateStepSegments(s);
    const total = iterations * subStep;
    assert.ok(Math.abs(total - s) < 1e-6, `speed ${s} should be preserved across segments`);
  }
}

function testApplySpeedUpdatesButtons() {
  const buttons = createStubButtons();
  applySpeed(2, buttons);
  assert.strictEqual(global.SPEED, 2, 'global SPEED should update');
  const activeCount = buttons.filter((b) => b.className === 'active').length;
  assert.strictEqual(activeCount, 1, 'only one button should be active');
  assert.strictEqual(buttons[2].className, 'active', 'matching button should be active');
}

function testSetSpeedWithDomFallback() {
  const buttons = createStubButtons();
  global.document = {
    querySelectorAll: () => buttons,
  };
  setSpeed(1);
  assert.strictEqual(buttons[1].className, 'active', 'setSpeed should use document buttons when available');
  delete global.document;
}

function run() {
  const tests = [
    ['calculateStepSegments handles fractional and paused speeds', testCalculateStepSegments],
    ['calculateStepSegments conserves speed (property)', propertyConservesSpeed],
    ['applySpeed updates global speed and active button', testApplySpeedUpdatesButtons],
    ['setSpeed falls back to document buttons', testSetSpeedWithDomFallback],
  ];
  let passed = 0;
  tests.forEach(([name, fn]) => {
    try {
      fn();
      passed++;
      console.log(`✓ ${name}`);
    } catch (err) {
      console.error(`✗ ${name}`);
      console.error(err.message || err);
      process.exitCode = 1;
    }
  });
  console.log(`\n${passed}/${tests.length} tests passed`);
  if (process.exitCode) {
    process.exit(process.exitCode);
  }
}

run();
