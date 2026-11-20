// People on foot: Rook the player, pedestrians on the sidewalks, foot police,
// and the thugs who guard mission 2's car. Pedestrians walk their block and
// run when a car or a gunshot comes too close.
import { CAR_MAX_SPEED, PLAYER_RUN_SPEED, PLAYER_SPEED } from './config.js';

export function createPlayer(x, y) {
  return {
    x, y, angle: -Math.PI / 2, speed: 0,
    health: 100, armor: 0, ammo: 24, money: 120,
    car: null, walkPhase: 0, moving: false,
    punchCooldown: 0, invuln: 0, bustedTimer: 0,
  };
}

export function createPed(world, rng, x, y) {
  const p = x === undefined ? world.randomSidewalkPoint() : { x, y };
  return {
    x: p.x, y: p.y, angle: rng.range(0, Math.PI * 2),
    speed: rng.range(28, 55), shirt: rng.pick(['#e8e4da', '#d94f3d', '#3d7dd9', '#7ed491', '#e8c33c', '#8a5fd0', '#e07b39']),
    health: 100, down: 0, flee: 0, wait: rng.range(0, 4),
    taxi: rng.next() < 0.12, // some peds want a cab; press T near one
  };
}

export function createCop(x, y) {
  return { x, y, angle: 0, speed: 0, health: 100, grabTimer: 0 };
}

export function createThug(x, y) {
  return { x, y, angle: 0, health: 100, shootTimer: 2, down: 0 };
}

// The player's feet. Returns nothing; wanted and sound hooks live in main.js.
export function updatePlayerOnFoot(G, dt, input) {
  const p = G.player;
  const ax = input.axisX();
  const ay = input.axisY();
  const len = Math.hypot(ax, ay);
  p.moving = len > 0;
  if (len > 0) {
    const speed = input.run() ? PLAYER_RUN_SPEED : PLAYER_SPEED;
    const nx = (ax / len) * speed * dt;
    const ny = (ay / len) * speed * dt;
    G.world.moveCircle(p, nx, ny, 14);
    p.angle = Math.atan2(ny, nx);
    p.walkPhase += dt * (input.run() ? 14 : 10);
  }
  if (p.punchCooldown > 0) p.punchCooldown -= dt;
  if (p.invuln > 0) p.invuln -= dt;
}

export function updatePeds(G, dt) {
  const world = G.world;
  for (const ped of G.peds) {
    if (ped.down > 0) { ped.down -= dt; continue; }
    // Flee: a speeding car nearby, or a shot just fired.
    const player = G.player;
    const car = player.car;
    let threat = null;
    if (car && Math.abs(car.speed) > 120) {
      const d = Math.hypot(ped.x - car.x, ped.y - car.y);
      if (d < 160) threat = car;
    }
    if (G.gunshotTimer > 0) {
      const d = Math.hypot(ped.x - player.x, ped.y - player.y);
      if (d < 260) threat = player;
    }
    if (threat) { ped.flee = 1.2; ped.fleeFrom = threat; }
    if (ped.flee > 0) {
      ped.flee -= dt;
      // The threat is only set on the frame it is near: keep fleeing from
      // where it was, since flee outlives the sighting by up to 1.2 s.
      const from = ped.fleeFrom || player;
      const away = Math.atan2(ped.y - from.y, ped.x - from.x);
      ped.angle = away;
      world.moveCircle(ped, Math.cos(away) * 130 * dt, Math.sin(away) * 130 * dt, 12);
      if (ped.flee <= 0) ped.fleeFrom = null;
      continue;
    }
    if (ped.wait > 0) { ped.wait -= dt; continue; }
    const nx = Math.cos(ped.angle) * ped.speed * dt;
    const ny = Math.sin(ped.angle) * ped.speed * dt;
    const ox = ped.x;
    const oy = ped.y;
    world.moveCircle(ped, nx, ny, 12);
    // Hit a wall or the sea: pick a new direction along the sidewalk.
    if (Math.hypot(ped.x - ox, ped.y - oy) < 2) {
      ped.angle += Math.PI / 2 + (G.rng.next() < 0.5 ? 0 : Math.PI);
      ped.wait = G.rng.range(0.5, 2);
    }
    // Drift back toward a road when wandering off into a block.
    if (!world.onRoad(ped.x, ped.y) && G.rng.next() < 0.01) ped.angle = Math.atan2(600 - ped.y, 1600 - ped.x);
  }
}

// Foot police chase Rook on foot and grab him if they stay close.
export function updateCops(G, dt) {
  const p = G.player;
  for (const cop of G.cops) {
    const d = Math.hypot(p.x - cop.x, p.y - cop.y);
    if (p.car) continue; // foot cops cannot catch a car; they hold position
    cop.angle = Math.atan2(p.y - cop.y, p.x - cop.x);
    const speed = 235;
    G.world.moveCircle(cop, Math.cos(cop.angle) * speed * dt, Math.sin(cop.angle) * speed * dt, 12);
    if (d < 26) {
      cop.grabTimer += dt;
      if (cop.grabTimer > 1.2) G.busted = true;
    } else cop.grabTimer = 0;
  }
  // Thugs guard the target car and shoot when Rook comes close.
  for (const thug of G.thugs) {
    if (thug.down > 0) { thug.down -= dt; continue; }
    const d = Math.hypot(p.x - thug.x, p.y - thug.y);
    if (d < 320 && !p.car) {
      thug.angle = Math.atan2(p.y - thug.y, p.x - thug.x);
      thug.shootTimer -= dt;
      if (thug.shootTimer <= 0) {
        thug.shootTimer = 1.6;
        if (d < 300 && G.rng.next() < 0.55) {
          damagePlayer(G, 8, 'thug');
          G.particles.push({ x: thug.x, y: thug.y, vx: 0, vy: 0, t: 0.15, color: '#ffd34d' });
        }
      }
    }
  }
}

export function damagePlayer(G, amount, source) {
  const p = G.player;
  if (p.invuln > 0 && source !== 'crash') return;
  let left = amount;
  if (p.armor > 0) {
    const absorbed = Math.min(p.armor, left);
    p.armor -= absorbed;
    left -= absorbed;
  }
  p.health -= left;
  p.invuln = 0.4;
  if (p.health <= 0) {
    p.health = 0;
    G.screen = 'over';
    G.overReason = source === 'busted' ? 'busted' : 'wasted';
  }
}

export function spawnCopNear(G) {
  const p = G.player;
  const spot = G.world.randomRoadPoint();
  // Prefer a spot a few hundred pixels from Rook, not on top of him.
  const dx = spot.x - p.x;
  const dy = spot.y - p.y;
  const d = Math.hypot(dx, dy) || 1;
  const k = 420 / d;
  G.cops.push(createCop(p.x + dx * k, p.y + dy * k));
}

export { CAR_MAX_SPEED };
