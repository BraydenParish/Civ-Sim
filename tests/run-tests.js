const assert = require('assert');

const game = require('../game.js');
const {
  calculateStepSegments,
  applySpeed,
  SPEED,
  setSpeed,
  Vec,
  Unit,
  Site,
  S,
  C,
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

function testUnitsSwitchToBuildWhenReachingSite() {
  const builder = new Unit(0, 0, 'RED');
  const site = new Site(0, 0, 'RED');
  const gameStub = {
    units: [builder],
    houses: [],
    sites: [site],
    redTC: { team: 'RED', dead: false, pos: new Vec(1000, 1000), r: 25 },
    blueTC: { team: 'BLUE', dead: false, pos: new Vec(1000, 1000), r: 25 },
  };

  builder.state = S.MOVE;
  builder.ent = site;
  builder.update(gameStub);

  assert.strictEqual(builder.state, S.BUILD, 'units should build when they arrive at a friendly site');
}

function propertyBuildCompletesAndAddsHouse() {
  const builder = new Unit(0, 0, 'RED');
  const site = new Site(0, 0, 'RED');
  const tc = { team: 'RED', dead: false, pos: new Vec(1000, 1000), r: 25, res: { FOOD: 0, WOOD: 0, STONE: 0, IRON: 0 } };
  const enemyTC = { team: 'BLUE', dead: false, pos: new Vec(1000, 1000), r: 25, res: { FOOD: 0, WOOD: 0, STONE: 0, IRON: 0 } };
  const g = {
    units: [builder],
    houses: [],
    sites: [site],
    redTC: tc,
    blueTC: enemyTC,
    addHouse(x, y, t) {
      this.houses.push({ x, y, team: t, dead: false });
    },
    fx() {},
  };

  builder.state = S.BUILD;
  builder.ent = site;
  const originalSpeed = game.SPEED;
  game.SPEED = 1;

  let lastProg = site.prog;
  let iterations = 0;
  while (!site.dead && iterations < C.HOUSE_TIME * 2 + 10) {
    builder.build(g);
    assert.ok(site.prog >= lastProg, 'build progress should not regress');
    lastProg = site.prog;
    iterations++;
  }

  assert.ok(site.dead, 'site should be marked dead after completing build');
  assert.strictEqual(g.houses.length, 1, 'a house should be added when construction finishes');
  assert.strictEqual(builder.state, S.IDLE, 'builder should return to idle after finishing construction');

  const knownKeys = ['FOOD', 'WOOD', 'STONE', 'IRON'];
  assert.ok(Object.keys(tc.res).every((k) => knownKeys.includes(k)), 'building should not invent new resource keys');
  game.SPEED = originalSpeed;
}

function run() {
  const tests = [
    ['calculateStepSegments handles fractional and paused speeds', testCalculateStepSegments],
    ['calculateStepSegments conserves speed (property)', propertyConservesSpeed],
    ['applySpeed updates global speed and active button', testApplySpeedUpdatesButtons],
    ['setSpeed falls back to document buttons', testSetSpeedWithDomFallback],
    ['units switch to build when reaching a site', testUnitsSwitchToBuildWhenReachingSite],
    ['building completes and adds a house (property)', propertyBuildCompletesAndAddsHouse],
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
