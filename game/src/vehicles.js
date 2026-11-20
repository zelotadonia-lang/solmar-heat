// Cars: the player's driving physics, NPC traffic that follows the roads and
// stops at red lights, and police cruisers that chase Rook.
import { CAR_ACCEL, CAR_COLORS, CAR_MAX_SPEED, CAR_REVERSE_SPEED, CAR_TURN, ROAD_W } from './config.js';

let nextCarId = 1;

export function createCar(x, y, angle, color, opts) {
  const o = opts || {};
  return {
    id: nextCarId, x, y, angle, speed: 0,
    color: color || '#d94f3d',
    health: 100, smoke: 0,
    police: !!o.police, npc: !!o.npc, target: !!o.target,
    axis: o.axis || 'x', dir: o.dir || 1, road: o.road || 0,
    targetSpeed: o.targetSpeed || 0, driver: o.driver || 'none',
    w: 46, h: 22,
  };
}

export function spawnTrafficCar(G) {
  const world = G.world;
  const p = world.randomRoadPoint();
  const vertical = G.rng.next() < 0.5;
  const road = vertical ? p.x : p.y;
  const dir = G.rng.next() < 0.5 ? 1 : -1;
  // Keep traffic off the exact lane Rook drives on when he is close.
  const car = createCar(p.x, p.y, vertical ? (dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (dir > 0 ? 0 : Math.PI),
    G.rng.pick(CAR_COLORS), { npc: true, axis: vertical ? 'y' : 'x', dir, road, targetSpeed: G.rng.range(140, 210), driver: 'npc' });
  // Offset into the right-hand lane.
  if (vertical) car.x += dir > 0 ? -20 : 20;
  else car.y += dir > 0 ? 20 : -20;
  return car;
}

function angleLerp(a, b, t) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

// One NPC traffic car: follow its road, stop at red lights and behind cars ahead.
export function updateTrafficCar(G, car, dt) {
  const world = G.world;
  const wantAngle = car.axis === 'x' ? (car.dir > 0 ? 0 : Math.PI) : (car.dir > 0 ? Math.PI / 2 : -Math.PI / 2);
  car.angle = angleLerp(car.angle, wantAngle, Math.min(1, dt * 3));
  let target = car.targetSpeed;
  // Red light ahead on my axis.
  const ahead = 70;
  const ax = car.x + Math.cos(car.angle) * ahead;
  const ay = car.y + Math.sin(car.angle) * ahead;
  const light = world.lightAt(ax, ay);
  if (light) {
    const redForMe = car.axis === 'x' ? light.nsGreen : !light.nsGreen;
    if (redForMe) target = 0;
  }
  // Car ahead in my lane.
  for (const other of G.cars) {
    if (other === car) continue;
    const dx = other.x - car.x;
    const dy = other.y - car.y;
    const along = dx * Math.cos(car.angle) + dy * Math.sin(car.angle);
    const side = Math.abs(-dx * Math.sin(car.angle) + dy * Math.cos(car.angle));
    if (along > 0 && along < 64 && side < 26) { target = 0; break; }
  }
  const accel = target > car.speed ? 160 : -320;
  car.speed += accel * dt;
  if (car.speed > target && accel > 0) car.speed = target;
  if (car.speed < 0) car.speed = 0;
  const nx = Math.cos(car.angle) * car.speed * dt;
  const ny = Math.sin(car.angle) * car.speed * dt;
  const ox = car.x;
  const oy = car.y;
  world.moveCircle(car, nx, ny, 20);
  if (Math.hypot(car.x - ox, car.y - oy) < 1 && car.speed > 10) {
    // Blocked by a building corner: turn around at the next intersection instead of pushing.
    car.speed = 0;
  }
  // Reached the edge of the map: respawn on the far side so traffic never runs dry.
  if (car.x < 60 || car.x > 3140 || car.y < 60 || car.y > 2040) {
    const fresh = spawnTrafficCar(G);
    car.x = fresh.x; car.y = fresh.y; car.angle = fresh.angle; car.axis = fresh.axis;
    car.dir = fresh.dir; car.road = fresh.road; car.targetSpeed = fresh.targetSpeed; car.speed = 0;
  }
}

// The player's car: accelerate, brake, reverse, steer with speed. Returns events.
export function drivePlayerCar(G, dt, input) {
  const car = G.player.car;
  if (!car) return;
  const throttle = input.up() ? 1 : input.down() ? -1 : 0;
  const steer = input.axisX();
  if (throttle > 0) car.speed += CAR_ACCEL * dt;
  else if (throttle < 0) {
    car.speed += car.speed > 5 ? -CAR_ACCEL * 1.4 * dt : -CAR_ACCEL * 0.6 * dt;
  } else {
    car.speed -= Math.sign(car.speed) * 140 * dt;
    if (Math.abs(car.speed) < 8) car.speed = 0;
  }
  if (car.speed > CAR_MAX_SPEED) car.speed = CAR_MAX_SPEED;
  if (car.speed < -CAR_REVERSE_SPEED) car.speed = -CAR_REVERSE_SPEED;
  const steerScale = Math.min(1, Math.abs(car.speed) / 120);
  car.angle += steer * CAR_TURN * steerScale * dt * Math.sign(car.speed || 1);
  const nx = Math.cos(car.angle) * car.speed * dt;
  const ny = Math.sin(car.angle) * car.speed * dt;
  const before = Math.abs(car.speed);
  const ox = car.x;
  const oy = car.y;
  G.world.moveCircle(car, nx, ny, 20);
  const moved = Math.hypot(car.x - ox, car.y - oy);
  const wanted = Math.hypot(nx, ny);
  if (wanted > 2 && moved < wanted * 0.4) {
    // Hit a wall: bounce, take damage, maybe smoke.
    if (before > 200) {
      car.health -= 12;
      G.audio.crash();
      G.addMessage('Mobilmu rusak. Cari bengkel? Belum ada — hati-hati.');
      if (before > 320) G.raiseWanted(1, 'tabrakan');
      for (let i = 0; i < 8; i += 1) {
        G.particles.push({ x: car.x, y: car.y, vx: G.rng.range(-60, 60), vy: G.rng.range(-60, 60), t: 0.5, color: '#ffb020' });
      }
    }
    car.speed *= -0.25;
  }
  if (car.health < 45) car.smoke = 1;
  if (car.health <= 0) {
    car.health = 0;
    car.speed = 0;
    G.addMessage('Mobilmu mogok. Keluar dengan E.');
  }
  // Car-to-car bumps.
  for (const other of G.cars) {
    if (other === car) continue;
    const dx = other.x - car.x;
    const dy = other.y - car.y;
    const d = Math.hypot(dx, dy);
    if (d > 0 && d < 46) {
      const push = (46 - d) / 2;
      const ux = dx / d;
      const uy = dy / d;
      other.x += ux * push;
      other.y += uy * push;
      car.x -= ux * push * 0.5;
      car.y -= uy * push * 0.5;
      if (Math.abs(car.speed) > 160) {
        other.health -= 8;
        car.health -= 5;
        G.audio.crash();
        if (other.npc) G.raiseWanted(1, 'tabrakan');
      }
    }
  }
  G.player.x = car.x;
  G.player.y = car.y;
  G.player.angle = car.angle;
}

// Police cruisers chase Rook and ram his car; on foot they stop and let foot cops work.
export function updatePoliceCar(G, car, dt) {
  const p = G.player;
  const dx = p.x - car.x;
  const dy = p.y - car.y;
  const d = Math.hypot(dx, dy);
  const wantAngle = Math.atan2(dy, dx);
  car.angle = angleLerp(car.angle, wantAngle, Math.min(1, dt * 2.2));
  const target = p.car ? 520 : (d > 90 ? 380 : 0);
  car.speed += (target - car.speed) * Math.min(1, dt * 1.5);
  const nx = Math.cos(car.angle) * car.speed * dt;
  const ny = Math.sin(car.angle) * car.speed * dt;
  G.world.moveCircle(car, nx, ny, 20);
  if (p.car && d < 52 && Math.abs(car.speed) > 60) {
    p.car.health -= 6;
    car.health -= 2;
    G.audio.crash();
    G.particles.push({ x: (car.x + p.x) / 2, y: (car.y + p.y) / 2, vx: 0, vy: 0, t: 0.4, color: '#ffb020' });
  }
  if (!p.car && d < 60) car.speed = 0;
}

export function spawnPoliceCar(G) {
  const p = G.player;
  const angle = G.rng.range(0, Math.PI * 2);
  const x = Math.max(80, Math.min(3120, p.x + Math.cos(angle) * 560));
  const y = Math.max(80, Math.min(1980, p.y + Math.sin(angle) * 560));
  const car = createCar(x, y, Math.atan2(p.y - y, p.x - x), '#2f6fd0', { police: true, driver: 'police' });
  G.cars.push(car);
  return car;
}
