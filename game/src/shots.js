// The screenshot scenes behind ?shot=start|drive|mission|foot. Each one sets
// up a real game state — a fresh seeded city, the player placed in the scene,
// traffic already moving — so the frame is what playing actually looks like
// and the same seed always gives the same frame.
import { SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { createCar, spawnPoliceCar, spawnTrafficCar, updateTrafficCar } from './vehicles.js';
import { createPed } from './entities.js';
import { startMission } from './missions.js';

function runTraffic(G, seconds) {
  const steps = Math.floor(seconds * 60);
  for (let i = 0; i < steps; i += 1) {
    for (const car of G.cars) {
      if (car.driver === 'npc') updateTrafficCar(G, car, 1 / 60);
    }
    G.time += 1 / 60;
  }
}

export function stageShot(name, G, helpers) {
  const fresh = helpers.freshState();
  Object.keys(fresh).forEach((k) => { G[k] = fresh[k]; });
  G.addMessage = fresh.addMessage;
  G.raiseWanted = fresh.raiseWanted;

  if (name === 'drive') {
    G.screen = SCREEN_PLAY;
    const car = createCar(1400, 1000, 0, '#d94f3d', { npc: false });
    car.speed = 320;
    G.cars.push(car);
    G.player.car = car;
    car.driver = 'player';
    G.player.x = car.x;
    G.player.y = car.y;
    G.wanted = 2;
    G.lastCrime = 0;
    G.clockMin = 620;
    spawnPoliceCar(G);
    spawnPoliceCar(G);
    // Pull the cruisers into frame: one behind Rook on the same road, one ahead.
    const cruisers = G.cars.filter((c) => c.police);
    if (cruisers[0]) { cruisers[0].x = 1080; cruisers[0].y = 1000; cruisers[0].angle = 0; cruisers[0].speed = 260; }
    if (cruisers[1]) { cruisers[1].x = 1760; cruisers[1].y = 1040; cruisers[1].angle = Math.PI; cruisers[1].speed = 200; }
    for (let i = 0; i < 6; i += 1) G.cars.push(spawnTrafficCar(G));
    runTraffic(G, 2);
    G.addMessage('Polisi mengejarmu. Kabur!');
    return { screen: SCREEN_PLAY };
  }

  if (name === 'mission') {
    G.screen = SCREEN_PLAY;
    startMission(G, 0);
    G.player.x = 1000;
    G.player.y = 1750;
    G.player.angle = Math.PI / 2;
    G.clockMin = 540;
    for (let i = 0; i < 8; i += 1) {
      const ped = createPed(G.world, G.rng, 1000 + G.rng.range(-160, 160), 1750 + G.rng.range(-120, 120));
      G.peds.push(ped);
    }
    runTraffic(G, 2);
    return { screen: SCREEN_PLAY };
  }

  if (name === 'foot') {
    G.screen = SCREEN_PLAY;
    G.player.x = 1420;
    G.player.y = 1020;
    G.player.angle = 0;
    G.player.money = 340;
    G.clockMin = 780;
    for (let i = 0; i < 14; i += 1) {
      const ped = createPed(G.world, G.rng, 1420 + G.rng.range(-260, 260), 1020 + G.rng.range(-200, 200));
      G.peds.push(ped);
    }
    for (let i = 0; i < 6; i += 1) G.cars.push(spawnTrafficCar(G));
    runTraffic(G, 3);
    G.addMessage('Port Solmar siang ini ramai.');
    return { screen: SCREEN_PLAY };
  }

  // Default: the title screen over a living city.
  G.screen = SCREEN_TITLE;
  G.player.x = 1400;
  G.player.y = 1000;
  G.clockMin = 540;
  runTraffic(G, 5);
  return { screen: SCREEN_TITLE };
}
