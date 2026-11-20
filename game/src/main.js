// Boot and the one loop. The game state G is one plain object every module
// reads and writes: the world, the people, the cars, the wanted level, the
// mission, the HUD messages. Input is read every frame, the world advances in
// fixed 1/60 s steps, the renderer paints what is there.
//
// ?seed=N fixes the city. ?shot=start|drive|mission|foot (with &seed=N) stages
// that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import { CAR_MAX_SPEED, MAX_WANTED, MONEY_START, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld } from './world.js';
import { ACTION_CONFIRM, ACTION_ENTER_CAR, ACTION_PAUSE, ACTION_PUNCH, ACTION_TAXI, createInput } from './input.js';
import { createAudio } from './audio.js';
import { createCop, createPed, createPlayer, damagePlayer, spawnCopNear, updateCops, updatePeds, updatePlayerOnFoot } from './entities.js';
import { createCar, drivePlayerCar, spawnPoliceCar, spawnTrafficCar, updatePoliceCar, updateTrafficCar } from './vehicles.js';
import { punch, shoot, updateBullets, updatePickups } from './combat.js';
import { loadGame, saveGame } from './save.js';
import { startMission, tryStartTaxi, updateMission, updateTaxi } from './missions.js';
import { SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, createRenderer } from './render.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;
const AUTOSAVE_EVERY = 20;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const audio = createAudio();
const renderer = createRenderer(canvas);

function freshState() {
  const rng = createRandom(seed);
  const world = createWorld(rng);
  const G = {
    rng, world, audio,
    time: 0, clockMin: 0, screen: SCREEN_TITLE, overReason: 'wasted',
    player: createPlayer(world.spawn.x, world.spawn.y),
    cars: [], peds: [], cops: [], thugs: [], bullets: [], particles: [], pickups: [],
    wanted: 0, wantedTimer: 0, lastCrime: -999, busted: false,
    messages: [], dialog: null, mission: null, missionTarget: null,
    nextMissionIndex: 0, nextMissionAt: 0, storyDone: false, missionsDone: 0,
    taxi: null, targetCar: null, gunshotTimer: 0, missionCompleteFlash: 0,
    autosaveTimer: AUTOSAVE_EVERY,
    addMessage(text) {
      G.messages.push({ text, t: G.time });
      if (G.messages.length > 6) G.messages.shift();
    },
    raiseWanted(n, reason) {
      if (G.wanted >= MAX_WANTED) return;
      G.wanted = Math.min(MAX_WANTED, G.wanted + n);
      G.lastCrime = G.time;
      G.wantedTimer = 0;
    },
  };
  G.player.money = MONEY_START;
  // Parked cars and traffic.
  for (let i = 0; i < 10; i += 1) G.cars.push(spawnTrafficCar(G));
  const parked = world.randomRoadPoint();
  G.cars.push(createCar(parked.x, parked.y, 0, '#e8e4da', { npc: false }));
  for (let i = 0; i < 24; i += 1) G.peds.push(createPed(world, rng));
  G.pickups.push({ x: 700, y: 700, kind: 'health', amount: 0, t: 9999 });
  G.pickups.push({ x: 1500, y: 1100, kind: 'ammo', amount: 0, t: 9999 });
  return G;
}

let G = freshState();

function applySave(G, data) {
  const p = G.player;
  p.money = data.money;
  p.health = data.health;
  p.armor = data.armor;
  p.ammo = data.ammo;
  p.x = data.x;
  p.y = data.y;
  p.angle = data.angle;
  G.wanted = data.wanted;
  G.clockMin = data.clockMin;
  G.nextMissionIndex = data.missionIndex >= 99 ? 99 : data.missionIndex;
  G.storyDone = data.missionIndex >= 99;
  if (G.nextMissionIndex < 3) G.nextMissionAt = 3;
}

function nearestCar(maxDist) {
  const p = G.player;
  let best = null;
  let bestD = maxDist;
  for (const car of G.cars) {
    const d = Math.hypot(car.x - p.x, car.y - p.y);
    if (d < bestD) { bestD = d; best = car; }
  }
  return best;
}

function enterOrExitCar() {
  const p = G.player;
  if (p.car) {
    const car = p.car;
    car.speed = 0;
    car.driver = 'none';
    p.car = null;
    p.x = car.x + Math.cos(car.angle + Math.PI / 2) * 30;
    p.y = car.y + Math.sin(car.angle + Math.PI / 2) * 30;
    G.world.moveCircle(p, 0, 0, 14);
    audio.engine(false);
    G.addMessage('Keluar dari mobil.');
    return;
  }
  const car = nearestCar(64);
  if (!car) return;
  if (car.health <= 0) {
    G.addMessage('Mobil ini mogok. Cari yang lain.');
    audio.denied();
    return;
  }
  p.car = car;
  car.driver = 'player';
  car.npc = false;
  p.x = car.x;
  p.y = car.y;
  if (car.police) {
    G.raiseWanted(2, 'curi mobil polisi');
    G.addMessage('Kau curi mobil polisi. Mereka tidak terima.');
  } else {
    G.raiseWanted(1, 'curi mobil');
    G.addMessage('Mobil dicuri. Pemiliknya lari melapor.');
  }
  audio.engine(true, 0);
}

// A speeding car that hits a pedestrian: the ped goes down, the law notices.
function carHitsPeds() {
  const car = G.player.car;
  if (!car || Math.abs(car.speed) < 120) return;
  for (const ped of G.peds) {
    if (ped.down > 0) continue;
    if (Math.hypot(ped.x - car.x, ped.y - car.y) < 26) {
      ped.down = 999;
      ped.health = 0;
      G.raiseWanted(1, 'tabrak pejalan kaki');
      G.addMessage('Kau menabrak pejalan kaki.');
      audio.crash();
      car.speed *= 0.7;
    }
  }
}

function managePolice(dt) {
  const p = G.player;
  const wantCars = G.wanted >= 1 ? Math.min(G.wanted, 3) : 0;
  const policeCars = G.cars.filter((c) => c.police);
  if (policeCars.length < wantCars && G.time - (managePolice.lastSpawn || 0) > 2) {
    spawnPoliceCar(G);
    managePolice.lastSpawn = G.time;
  }
  if (G.wanted === 0) {
    for (const car of policeCars) {
      const d = Math.hypot(car.x - p.x, car.y - p.y);
      if (d > 900) G.cars.splice(G.cars.indexOf(car), 1);
    }
    if (G.cops.length > 0) G.cops = [];
  }
  const wantCops = G.wanted >= 2 && !p.car ? Math.min(G.wanted - 1, 2) : 0;
  if (G.cops.length < wantCops) spawnCopNear(G);
  if (G.cops.length > wantCops) G.cops.length = wantCops;
}

function wantedDecay(dt) {
  if (G.wanted === 0) return;
  if (G.time - G.lastCrime < 10) return;
  const p = G.player;
  let nearest = 1e9;
  for (const car of G.cars) if (car.police) nearest = Math.min(nearest, Math.hypot(car.x - p.x, car.y - p.y));
  for (const cop of G.cops) nearest = Math.min(nearest, Math.hypot(cop.x - p.x, cop.y - p.y));
  if (nearest < 500) return;
  G.wantedTimer += dt;
  if (G.wantedTimer > 20) {
    G.wantedTimer = 0;
    G.wanted -= 1;
    G.addMessage(G.wanted === 0 ? 'Polisi kehilangan jejakmu.' : `Bintang berkurang. Sisa ${G.wanted}.`);
  }
}

function step(dt, input) {
  G.time += dt;
  G.clockMin += dt; // one game minute per real second
  if (G.gunshotTimer > 0) G.gunshotTimer -= dt;
  if (G.missionCompleteFlash > 0) G.missionCompleteFlash -= dt;
  G.world.updateLights(dt);

  // Traffic and pedestrians keep the city alive.
  for (const car of [...G.cars]) {
    if (car.police) updatePoliceCar(G, car, dt);
    else if (car.driver === 'npc') updateTrafficCar(G, car, dt);
  }
  // Thin or top up traffic.
  const npcCount = G.cars.filter((c) => c.driver === 'npc').length;
  if (npcCount < 9 && G.rng.next() < 0.02) G.cars.push(spawnTrafficCar(G));
  if (G.peds.length < 22 && G.rng.next() < 0.02) G.peds.push(createPed(G.world, G.rng));
  updatePeds(G, dt);
  updateCops(G, dt);
  updateBullets(G, dt);
  updatePickups(G, dt);
  for (const pt of G.particles) {
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    pt.t -= dt;
  }
  G.particles = G.particles.filter((pt) => pt.t > 0);

  const p = G.player;
  if (p.car) {
    drivePlayerCar(G, dt, input);
    audio.engine(true, Math.abs(p.car.speed) / CAR_MAX_SPEED);
    carHitsPeds();
  } else {
    updatePlayerOnFoot(G, dt, input);
    audio.engine(false);
  }

  // Missions.
  if (!G.mission && !G.storyDone && G.nextMissionIndex < 3 && G.time >= G.nextMissionAt) {
    startMission(G, G.nextMissionIndex);
  }
  if (G.mission) {
    const result = updateMission(G, dt);
    if (result === 'complete') {
      G.missionsDone += 1;
      G.nextMissionIndex = G.mission.index + 1;
      G.mission = null;
      saveGame(G);
    }
    G.missionTarget = G.mission ? G.mission.target : null;
  } else {
    G.missionTarget = null;
  }
  updateTaxi(G, dt);
  managePolice(dt);
  wantedDecay(dt);

  if (G.busted) {
    G.busted = false;
    p.money = Math.max(0, p.money - 200);
    p.health = 100;
    p.car = null;
    p.x = G.world.spawn.x;
    p.y = G.world.spawn.y;
    G.wanted = 0;
    G.cops = [];
    G.screen = SCREEN_OVER;
    G.overReason = 'busted';
    status.textContent = 'Busted. Denda $200.';
  }

  G.autosaveTimer -= dt;
  if (G.autosaveTimer <= 0) {
    G.autosaveTimer = AUTOSAVE_EVERY;
    saveGame(G);
  }
  audio.siren(G.wanted > 0, dt);
}

function startGame() {
  const saved = loadGame();
  G = freshState();
  if (saved) {
    applySave(G, saved);
    G.addMessage('Save lama dimuat. Lanjutkan dari tempatmu berhenti.');
  }
  G.screen = SCREEN_PLAY;
  G.nextMissionAt = G.mission ? 0 : 2;
  status.textContent = 'Playing. Port Solmar.';
}

function runShot(name) {
  stageShot(name, G, { freshState, startMission });
  let painted = 0;
  function paint() {
    renderer.draw(G);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let accumulator = 0;
  let last = performance.now();

  function announce(message) {
    status.textContent = message;
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_CONFIRM) {
      if (G.screen === SCREEN_TITLE) startGame();
      else if (G.screen === SCREEN_OVER) startGame();
      else if (G.screen === SCREEN_PAUSED) { G.screen = SCREEN_PLAY; saveGame(G); announce('Playing.'); }
      else if (G.dialog && G.dialog.idx < G.dialog.lines.length) {
        G.dialog.idx += 1;
        if (G.dialog.idx >= G.dialog.lines.length) G.dialog = null;
      }
    }
    if (actions & ACTION_PAUSE) {
      if (G.screen === SCREEN_PLAY) { G.screen = SCREEN_PAUSED; saveGame(G); announce('Paused.'); }
      else if (G.screen === SCREEN_PAUSED) { G.screen = SCREEN_PLAY; announce('Playing.'); }
    }
    if (G.screen !== SCREEN_PLAY) return;
    if (actions & ACTION_ENTER_CAR) enterOrExitCar();
    if (actions & ACTION_PUNCH) punch(G);
    if (actions & ACTION_TAXI) {
      if (!tryStartTaxi(G)) G.addMessage('Tidak ada penumpang taksi di dekatmu.');
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (G.screen === SCREEN_PLAY) {
      while (accumulator >= STEP) {
        step(STEP, input);
        accumulator -= STEP;
        if (G.screen !== SCREEN_PLAY) { accumulator = 0; break; }
      }
    } else {
      accumulator = 0;
    }
    // Mouse click shoots (only while playing and on foot).
    if (G.screen === SCREEN_PLAY && input.takeClick()) {
      audio.unlock();
      const m = input.mouse();
      const cam = { x: Math.max(0, Math.min(3200 - window.innerWidth, G.player.x - window.innerWidth / 2)), y: Math.max(0, Math.min(2400 - window.innerHeight, G.player.y - window.innerHeight / 2)) };
      shoot(G, cam.x + m.x, cam.y + m.y);
    }
    renderer.draw(G);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && G.screen === SCREEN_PLAY) {
      G.screen = SCREEN_PAUSED;
      saveGame(G);
      announce('Paused.');
    }
  });
  window.addEventListener('pointerdown', () => audio.unlock(), { once: true });

  announce('Solmar Heat. Press Enter to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();

export { damagePlayer };
