// Combat: fists and the pistol. A punch drops a pedestrian; a shot costs one
// bullet and one wanted star's worth of attention. Bullets fly straight and
// hit the first person or car in their path.
import { damagePlayer } from './entities.js';

const PUNCH_RANGE = 46;
const PUNCH_DAMAGE = 34;
const SHOT_DAMAGE = 34;
const BULLET_SPEED = 900;

export function punch(G) {
  const p = G.player;
  if (p.car || p.punchCooldown > 0) return;
  p.punchCooldown = 0.45;
  G.audio.punch();
  const px = p.x + Math.cos(p.angle) * 30;
  const py = p.y + Math.sin(p.angle) * 30;
  // Nearest person in front of Rook.
  let best = null;
  let bestD = PUNCH_RANGE;
  for (const ped of G.peds) {
    if (ped.down > 0) continue;
    const d = Math.hypot(ped.x - px, ped.y - py);
    if (d < bestD) { bestD = d; best = ped; }
  }
  for (const cop of G.cops) {
    const d = Math.hypot(cop.x - px, cop.y - py);
    if (d < bestD) { bestD = d; best = cop; }
  }
  for (const thug of G.thugs) {
    if (thug.down > 0) continue;
    const d = Math.hypot(thug.x - px, thug.y - py);
    if (d < bestD) { bestD = d; best = thug; }
  }
  if (!best) return;
  best.health -= PUNCH_DAMAGE;
  best.x += Math.cos(p.angle) * 14;
  best.y += Math.sin(p.angle) * 14;
  G.particles.push({ x: best.x, y: best.y, vx: 0, vy: -20, t: 0.3, color: '#ffffff' });
  if (best.health <= 0) {
    best.down = 999;
    best.health = 0;
    dropCash(G, best.x, best.y);
    if (best.taxi) G.addMessage('Penumpang taksi itu kabur. Cari yang lain.');
  }
  if (best === G.cops[0] || G.cops.includes(best)) G.raiseWanted(1, 'serang polisi');
  else G.raiseWanted(1, 'serang warga');
}

export function shoot(G, worldX, worldY) {
  const p = G.player;
  if (p.car || p.ammo <= 0) {
    if (p.ammo <= 0) G.addMessage('Peluru habis. Cari amunisi di jalan.');
    return;
  }
  p.ammo -= 1;
  const angle = Math.atan2(worldY - p.y, worldX - p.x);
  p.angle = angle;
  G.bullets.push({ x: p.x + Math.cos(angle) * 22, y: p.y + Math.sin(angle) * 22, vx: Math.cos(angle) * BULLET_SPEED, vy: Math.sin(angle) * BULLET_SPEED, dist: 0 });
  G.gunshotTimer = 0.8;
  G.audio.shot();
  G.raiseWanted(1, 'tembakan');
}

export function updateBullets(G, dt) {
  for (const b of G.bullets) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.dist += BULLET_SPEED * dt;
    if (b.dist > 520) { b.dead = true; continue; }
    if (G.world.blocked(b.x, b.y, 1)) { b.dead = true; spark(G, b.x, b.y); continue; }
    for (const ped of G.peds) {
      if (ped.down > 0) continue;
      if (Math.hypot(ped.x - b.x, ped.y - b.y) < 16) {
        ped.health -= SHOT_DAMAGE;
        b.dead = true;
        if (ped.health <= 0) { ped.down = 999; dropCash(G, ped.x, ped.y); }
        G.raiseWanted(1, 'tembakan');
        break;
      }
    }
    if (b.dead) continue;
    for (const cop of G.cops) {
      if (Math.hypot(cop.x - b.x, cop.y - b.y) < 16) {
        cop.health -= SHOT_DAMAGE;
        b.dead = true;
        if (cop.health <= 0) { cop.health = 0; G.cops.splice(G.cops.indexOf(cop), 1); }
        G.raiseWanted(1, 'tembak polisi');
        break;
      }
    }
    if (b.dead) continue;
    for (const thug of G.thugs) {
      if (thug.down > 0) continue;
      if (Math.hypot(thug.x - b.x, thug.y - b.y) < 16) {
        thug.health -= SHOT_DAMAGE;
        b.dead = true;
        if (thug.health <= 0) { thug.down = 999; dropCash(G, thug.x, thug.y); }
        break;
      }
    }
    if (b.dead) continue;
    for (const car of G.cars) {
      if (car === G.player.car) continue;
      if (Math.hypot(car.x - b.x, car.y - b.y) < 24) {
        car.health -= SHOT_DAMAGE;
        b.dead = true;
        if (car.health <= 0) car.speed = 0;
        break;
      }
    }
  }
  G.bullets = G.bullets.filter((b) => !b.dead);
}

function spark(G, x, y) {
  for (let i = 0; i < 5; i += 1) {
    G.particles.push({ x, y, vx: G.rng.range(-80, 80), vy: G.rng.range(-80, 80), t: 0.25, color: '#ffd34d' });
  }
}

export function dropCash(G, x, y) {
  const amount = G.rng.int(10, 30);
  G.pickups.push({ x, y, kind: 'cash', amount, t: 30 });
}

export function updatePickups(G, dt) {
  const p = G.player;
  for (const pk of G.pickups) {
    pk.t -= dt;
    if (Math.hypot(pk.x - p.x, pk.y - p.y) < 30) {
      pk.dead = true;
      if (pk.kind === 'cash') {
        p.money += pk.amount;
        G.addMessage(`+$${pk.amount}`);
        G.audio.pickup();
      } else if (pk.kind === 'health') {
        p.health = Math.min(100, p.health + 40);
        G.addMessage('Kesehatan +40');
        G.audio.pickup();
      } else if (pk.kind === 'ammo') {
        p.ammo += 12;
        G.addMessage('Amunisi +12');
        G.audio.pickup();
      }
    }
  }
  G.pickups = G.pickups.filter((pk) => !pk.dead && pk.t > 0);
}

export { damagePlayer };
