// Port Solmar: the city itself. A road grid, building blocks, one park, a beach
// and a harbour strip, traffic lights at the big intersections. No drawing here,
// only data and collision answers the rest of the game asks about.
import { BEACH_Y, CAR_COLORS, ROAD_W, ROAD_XS, ROAD_YS, SEA_Y, WORLD_H, WORLD_W } from './config.js';

const PARK_COL = 3; // block between road x 1400 and 1800
const PARK_ROW = 1; // block between road y 600 and 1000

export function createWorld(rng) {
  const buildings = [];
  const trees = [];
  let park = null;

  for (let col = 0; col < ROAD_XS.length - 1; col += 1) {
    for (let row = 0; row < ROAD_YS.length - 1; row += 1) {
      const x0 = ROAD_XS[col] + ROAD_W / 2 + 16;
      const x1 = ROAD_XS[col + 1] - ROAD_W / 2 - 16;
      const y0 = ROAD_YS[row] + ROAD_W / 2 + 16;
      const y1 = ROAD_YS[row + 1] - ROAD_W / 2 - 16;
      if (y0 >= BEACH_Y) continue;
      if (col === PARK_COL && row === PARK_ROW) {
        park = { x0, y0, x1, y1 };
        for (let t = 0; t < 14; t += 1) {
          trees.push({ x: rng.range(x0 + 20, x1 - 20), y: rng.range(y0 + 20, y1 - 20), r: rng.range(10, 18) });
        }
        continue;
      }
      // One or two buildings per block, with a gap between them.
      const split = rng.next() < 0.45 && x1 - x0 > 260;
      const spans = split
        ? [{ a: x0, b: x0 + (x1 - x0) / 2 - 12 }, { a: x0 + (x1 - x0) / 2 + 12, b: x1 }]
        : [{ a: x0, b: x1 }];
      for (const span of spans) {
        const w = rng.range(120, Math.min(220, span.b - span.a));
        const h = rng.range(110, Math.min(200, y1 - y0));
        const x = span.a + rng.range(0, Math.max(0, span.b - span.a - w));
        const y = y0 + rng.range(0, Math.max(0, y1 - y0 - h));
        buildings.push({
          x, y, w, h,
          color: rng.pick(['#c98f5f', '#8fa3b8', '#d9b48a', '#b87a6e', '#9db08a']),
          roof: '#5d4a3a',
          floors: Math.max(1, Math.floor(h / 46)),
        });
      }
    }
  }

  // Traffic lights at every other intersection, offset so they do not all flip together.
  const lights = [];
  for (let xi = 0; xi < ROAD_XS.length; xi += 1) {
    for (let yi = 0; yi < ROAD_YS.length; yi += 1) {
      if ((xi + yi) % 2 === 0) lights.push({ x: ROAD_XS[xi], y: ROAD_YS[yi], t: rng.range(0, 12), nsGreen: (xi + yi) % 4 < 2 });
    }
  }

  const world = {
    buildings, trees, park, lights,
    garage: { x: 1470, y: 1060, label: 'Garasi Solmar' },
    safePoint: { x: 1600, y: 2140, label: 'Pantai Selatan' },
    cafe: { x: 1030, y: 1830, label: 'Kafe Dermaga' },
    delivery: { x: 2630, y: 630, label: 'Apartemen Coral' },
    targetCarSpot: { x: 2230, y: 1430 },
    spawn: { x: 640, y: 640 },
  };

  function onRoad(x, y) {
    for (const rx of ROAD_XS) if (Math.abs(x - rx) <= ROAD_W / 2) return true;
    for (const ry of ROAD_YS) if (Math.abs(y - ry) <= ROAD_W / 2) return true;
    return false;
  }

  function hitsBuilding(x, y, r) {
    for (const b of buildings) {
      if (x + r > b.x && x - r < b.x + b.w && y + r > b.y && y - r < b.y + b.h) return b;
    }
    return null;
  }

  // A circle may walk or drive here: inside the map, out of the sea, out of buildings.
  function blocked(x, y, r) {
    if (x < r + 8 || y < r + 8 || x > WORLD_W - r - 8) return true;
    if (y > SEA_Y - 6) return true;
    if (y > WORLD_H - r) return true;
    return hitsBuilding(x, y, r) !== null;
  }

  // Move a circle by (dx, dy), axis by axis so it slides along walls instead of sticking.
  function moveCircle(e, dx, dy, r) {
    if (!blocked(e.x + dx, e.y, r)) e.x += dx;
    if (!blocked(e.x, e.y + dy, r)) e.y += dy;
  }

  function lightAt(x, y) {
    let best = null;
    let bestD = 1e9;
    for (const l of lights) {
      const d = Math.abs(l.x - x) + Math.abs(l.y - y);
      if (d < bestD) { bestD = d; best = l; }
    }
    return bestD < 220 ? best : null;
  }

  function randomRoadPoint() {
    if (rng.next() < 0.5) return { x: rng.pick(ROAD_XS), y: rng.range(120, 1900) };
    return { x: rng.range(120, 3100), y: rng.pick(ROAD_YS) };
  }

  function randomSidewalkPoint() {
    const p = randomRoadPoint();
    const off = ROAD_W / 2 + 14;
    if (rng.next() < 0.5) p.x += rng.next() < 0.5 ? off : -off;
    else p.y += rng.next() < 0.5 ? off : -off;
    p.x = Math.max(30, Math.min(WORLD_W - 30, p.x));
    p.y = Math.max(30, Math.min(BEACH_Y - 30, p.y));
    return p;
  }

  function updateLights(dt) {
    for (const l of lights) {
      l.t += dt;
      if (l.t >= 7) { l.t = 0; l.nsGreen = !l.nsGreen; }
    }
  }

  return { ...world, onRoad, blocked, hitsBuilding, moveCircle, lightAt, randomRoadPoint, randomSidewalkPoint, updateLights };
}

export { CAR_COLORS };
