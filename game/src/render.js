// Drawing only: the city, the people, the cars, the HUD and the menus.
// Camera follows Rook. HUD uses dark translucent panels behind light text so
// it stays readable over the bright daytime city (contrast first, per
// ui-ux-pro-max). The minimap is a small live map of the whole city.
import { BEACH_Y, FONT, PALETTE, ROAD_W, ROAD_XS, ROAD_YS, SEA_Y, WORLD_H, WORLD_W } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

const MINIMAP_W = 196;
const MINIMAP_H = 147;

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const view = { w: 1280, h: 800 };
  const fonts = new Map();

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    view.w = window.innerWidth;
    view.h = window.innerHeight;
    canvas.width = Math.round(view.w * ratio);
    canvas.height = Math.round(view.h * ratio);
    canvas.style.width = `${view.w}px`;
    canvas.style.height = `${view.h}px`;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  function text(value, x, y, size, color, align, weight) {
    const key = `${size}:${weight || ''}`;
    if (!fonts.has(key)) fonts.set(key, `${weight || ''} ${size}px ${FONT}`);
    ctx.font = fonts.get(key);
    ctx.fillStyle = color;
    ctx.textAlign = align || 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(value, x, y);
  }

  function panel(x, y, w, h) {
    ctx.fillStyle = PALETTE.hudPanel;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,0.14)';
    ctx.strokeRect(x + 0.5, y + 0.5, w, h);
  }

  function camera(G) {
    const p = G.player;
    const cx = Math.max(0, Math.min(WORLD_W - view.w, p.x - view.w / 2));
    const cy = Math.max(0, Math.min(WORLD_H - view.h, p.y - view.h / 2));
    return { x: cx, y: cy };
  }

  function drawGround(G, cam) {
    // Base ground: dry grass-green blocks.
    ctx.fillStyle = '#9db08a';
    ctx.fillRect(-cam.x, -cam.y, WORLD_W, WORLD_H);
    // Beach and sea along the south edge.
    ctx.fillStyle = PALETTE.sand;
    ctx.fillRect(-cam.x, BEACH_Y - cam.y, WORLD_W, WORLD_H - BEACH_Y);
    ctx.fillStyle = PALETTE.sea;
    ctx.fillRect(-cam.x, SEA_Y - cam.y, WORLD_W, WORLD_H - SEA_Y);
    ctx.fillStyle = PALETTE.seaDeep;
    for (let x = 0; x < WORLD_W; x += 90) {
      ctx.fillRect(x - cam.x, SEA_Y + 40 + ((x * 7) % 60) - cam.y, 46, 3);
    }
    // Park.
    const park = G.world.park;
    if (park) {
      ctx.fillStyle = PALETTE.grass;
      ctx.fillRect(park.x0 - cam.x, park.y0 - cam.y, park.x1 - park.x0, park.y1 - park.y0);
      ctx.fillStyle = '#6d9a4e';
      for (const t of G.world.trees) {
        ctx.beginPath();
        ctx.arc(t.x - cam.x, t.y - cam.y, t.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // Sidewalks: pale strips along every road.
    ctx.fillStyle = PALETTE.sidewalk;
    for (const rx of ROAD_XS) ctx.fillRect(rx - ROAD_W / 2 - 14 - cam.x, -cam.y, ROAD_W + 28, WORLD_H);
    for (const ry of ROAD_YS) ctx.fillRect(-cam.x, ry - ROAD_W / 2 - 14 - cam.y, WORLD_W, ROAD_W + 28);
    // Roads.
    ctx.fillStyle = PALETTE.asphalt;
    for (const rx of ROAD_XS) ctx.fillRect(rx - ROAD_W / 2 - cam.x, -cam.y, ROAD_W, WORLD_H);
    for (const ry of ROAD_YS) ctx.fillRect(-cam.x, ry - ROAD_W / 2 - cam.y, WORLD_W, ROAD_W);
    // Centre dashes.
    ctx.fillStyle = PALETTE.asphaltLine;
    for (const rx of ROAD_XS) {
      for (let y = 0; y < WORLD_H; y += 64) ctx.fillRect(rx - 3 - cam.x, y - cam.y, 6, 30);
    }
    for (const ry of ROAD_YS) {
      for (let x = 0; x < WORLD_W; x += 64) ctx.fillRect(x - cam.x, ry - 3 - cam.y, 30, 6);
    }
    // Crosswalks at intersections.
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    for (const rx of ROAD_XS) {
      for (const ry of ROAD_YS) {
        for (let i = -3; i <= 3; i += 1) {
          ctx.fillRect(rx + i * 12 - 4 - cam.x, ry - ROAD_W / 2 - 10 - cam.y, 8, 10);
          ctx.fillRect(rx + i * 12 - 4 - cam.x, ry + ROAD_W / 2 - cam.y, 8, 10);
        }
      }
    }
  }

  function drawBuildings(G, cam) {
    for (const b of G.world.buildings) {
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x - cam.x, b.y - cam.y, b.w, b.h);
      ctx.fillStyle = b.roof;
      ctx.fillRect(b.x - cam.x, b.y - cam.y, b.w, 10);
      // Windows in a grid.
      ctx.fillStyle = 'rgba(40, 60, 80, 0.55)';
      for (let wx = b.x + 14; wx < b.x + b.w - 14; wx += 26) {
        for (let wy = b.y + 22; wy < b.y + b.h - 10; wy += 30) {
          ctx.fillRect(wx - cam.x, wy - cam.y, 14, 18);
        }
      }
      ctx.strokeStyle = 'rgba(0,0,0,0.18)';
      ctx.strokeRect(b.x - cam.x + 0.5, b.y - cam.y + 0.5, b.w, b.h);
    }
  }

  function drawLights(G, cam) {
    for (const l of G.world.lights) {
      const x = l.x + ROAD_W / 2 + 8 - cam.x;
      const y = l.y - ROAD_W / 2 - 8 - cam.y;
      ctx.fillStyle = '#222';
      ctx.fillRect(x - 4, y - 14, 8, 28);
      ctx.fillStyle = l.nsGreen ? '#e5484d' : '#7ed491';
      ctx.beginPath();
      ctx.arc(x, y - 8, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = l.nsGreen ? '#7ed491' : '#e5484d';
      ctx.beginPath();
      ctx.arc(x, y + 6, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawCar(G, car, cam) {
    const x = car.x - cam.x;
    const y = car.y - cam.y;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(car.angle);
    // Shadow.
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(-24, -11, 48, 24);
    ctx.fillStyle = car.police ? '#e8e4da' : car.color;
    ctx.fillRect(-23, -11, 46, 22);
    if (car.police) {
      ctx.fillStyle = PALETTE.police;
      ctx.fillRect(-6, -11, 12, 22);
      const blink = Math.floor(G.time * 6) % 2 === 0;
      ctx.fillStyle = blink ? '#ff3b30' : '#2f6fd0';
      ctx.fillRect(-14, -11, 8, 6);
      ctx.fillStyle = blink ? '#2f6fd0' : '#ff3b30';
      ctx.fillRect(6, -11, 8, 6);
    }
    ctx.fillStyle = '#1d2733';
    ctx.fillRect(-8, -9, 16, 18); // cabin
    ctx.fillStyle = '#cfe8f5';
    ctx.fillRect(-4, -8, 8, 16); // windshield
    ctx.fillStyle = '#ffe9a8';
    ctx.fillRect(21, -8, 3, 5);
    ctx.fillRect(21, 3, 3, 5); // headlights
    ctx.fillStyle = '#e5484d';
    ctx.fillRect(-23, -8, 3, 5);
    ctx.fillRect(-23, 3, 3, 5); // taillights
    ctx.restore();
    if (car.target) {
      ctx.strokeStyle = PALETTE.mission;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x, y, 34 + Math.sin(G.time * 4) * 4, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (car.smoke) {
      ctx.fillStyle = 'rgba(120,120,120,0.5)';
      ctx.beginPath();
      ctx.arc(x + (G.rng.next() - 0.5) * 10 - 18, y - 8, 7 + Math.sin(G.time * 9) * 2, 0, Math.PI * 2);
      ctx.fill();
    }
    if (car.health < 100 && car.health > 0) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(x - 20, y - 26, 40, 5);
      ctx.fillStyle = car.health > 45 ? '#7ed491' : '#e5484d';
      ctx.fillRect(x - 20, y - 26, 40 * (car.health / 100), 5);
    }
  }

  function drawPerson(G, x, y, angle, shirt, cam, walkPhase, down) {
    const px = x - cam.x;
    const py = y - cam.y;
    if (down > 0) {
      ctx.fillStyle = shirt;
      ctx.beginPath();
      ctx.ellipse(px, py, 12, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    const swing = walkPhase ? Math.sin(walkPhase) * 3 : 0;
    ctx.fillStyle = '#2a2f38';
    ctx.fillRect(px - 5 + swing, py + 4, 4, 8);
    ctx.fillRect(px + 1 - swing, py + 4, 4, 8);
    ctx.fillStyle = shirt;
    ctx.fillRect(px - 7, py - 6, 14, 12);
    ctx.fillStyle = '#e8b98a';
    ctx.beginPath();
    ctx.arc(px, py - 11, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2a2f38';
    ctx.beginPath();
    ctx.arc(px, py - 13, 6, Math.PI, 0);
    ctx.fill();
  }

  function drawMarker(G, cam) {
    const target = G.missionTarget || (G.taxi ? G.taxi.dest : null);
    if (!target) return;
    const x = target.x - cam.x;
    const y = target.y - cam.y;
    const bob = Math.sin(G.time * 4) * 5;
    ctx.strokeStyle = PALETTE.mission;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, y - 34 + bob);
    ctx.lineTo(x + 10, y - 20 + bob);
    ctx.lineTo(x, y - 6 + bob);
    ctx.lineTo(x - 10, y - 20 + bob);
    ctx.closePath();
    ctx.stroke();
    ctx.fillStyle = 'rgba(255, 140, 66, 0.25)';
    ctx.beginPath();
    ctx.ellipse(x, y + 4, 18, 7, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawMinimap(G) {
    const x0 = view.w - MINIMAP_W - 14;
    const y0 = view.h - MINIMAP_H - 14;
    const sx = MINIMAP_W / WORLD_W;
    const sy = MINIMAP_H / WORLD_H;
    panel(x0 - 6, y0 - 6, MINIMAP_W + 12, MINIMAP_H + 12);
    ctx.fillStyle = '#5d7050';
    ctx.fillRect(x0, y0, MINIMAP_W, MINIMAP_H);
    ctx.fillStyle = PALETTE.sand;
    ctx.fillRect(x0, y0 + BEACH_Y * sy, MINIMAP_W, MINIMAP_H - BEACH_Y * sy);
    ctx.fillStyle = PALETTE.sea;
    ctx.fillRect(x0, y0 + SEA_Y * sy, MINIMAP_W, MINIMAP_H - SEA_Y * sy);
    ctx.fillStyle = '#6d6d6d';
    for (const rx of ROAD_XS) ctx.fillRect(x0 + rx * sx - 1, y0, 2, MINIMAP_H);
    for (const ry of ROAD_YS) ctx.fillRect(x0, y0 + ry * sy - 1, MINIMAP_W, 2);
    const target = G.missionTarget || (G.taxi ? G.taxi.dest : null);
    if (target) {
      ctx.fillStyle = PALETTE.mission;
      ctx.beginPath();
      ctx.arc(x0 + target.x * sx, y0 + target.y * sy, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const car of G.cars) {
      if (!car.police) continue;
      ctx.fillStyle = '#ff3b30';
      ctx.beginPath();
      ctx.arc(x0 + car.x * sx, y0 + car.y * sy, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    const p = G.player;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x0 + p.x * sx, y0 + p.y * sy, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#111';
    ctx.stroke();
    ctx.fillStyle = 'rgba(12, 16, 22, 0.6)';
    ctx.fillRect(x0 + 4, y0 + 4, 82, 15);
    text('PORT SOLMAR', x0 + 8, y0 + 15, 10, PALETTE.hudText, 'left', '700');
  }

  function drawHud(G) {
    const p = G.player;
    // Top-left: money, health, armor, ammo.
    panel(14, 14, 240, 96);
    text(`$${p.money}`, 26, 42, 26, PALETTE.money, 'left', '700');
    text(`Ammo ${p.ammo}`, 150, 42, 15, PALETTE.hudText, 'left');
    bar(26, 52, 168, 10, p.health / 100, PALETTE.health, 'HP');
    bar(26, 74, 168, 10, p.armor / 100, PALETTE.armor, 'ARMOR');
    // Top-right: wanted stars and clock.
    panel(view.w - 214, 14, 200, 56);
    for (let i = 0; i < 5; i += 1) {
      text(i < G.wanted ? '★' : '☆', view.w - 204 + i * 22, 46, 20, PALETTE.wanted, 'left', '700');
    }
    const hh = String(8 + Math.floor(G.clockMin / 60)).padStart(2, '0');
    const mm = String(Math.floor(G.clockMin % 60)).padStart(2, '0');
    text(`${hh}:${mm}`, view.w - 30, 46, 18, PALETTE.hudText, 'right', '700');
    // Objective under the top bar.
    const target = G.missionTarget || (G.taxi ? G.taxi.dest : null);
    const obj = G.taxi
      ? `Taksi: antar penumpang — $${G.taxi.fare} (${Math.ceil(G.taxi.timer)} dtk)`
      : G.mission
        ? `${G.mission.def.title}: ${G.mission.def.stages[G.mission.stage].label}`
        : G.storyDone ? 'Bebas. Port Solmar milikmu.' : 'Cari pekerjaan. Tekan T dekat penumpang taksi.';
    panel(14, 120, Math.min(520, 40 + obj.length * 7.4), 34);
    text(obj, 26, 143, 15, PALETTE.hudText, 'left', '600');
    if (target) {
      const d = Math.round(Math.hypot(p.x - target.x, p.y - target.y));
      text(`${d} m`, 26 + 40 + obj.length * 7.4, 143, 15, PALETTE.mission, 'left');
    }
    // Controls hint, bottom-left.
    text('WASD jalan · Shift lari · E masuk/keluar mobil · Space/F pukul · Klik tembak · T taksi · P jeda', 16, view.h - 16, 13, PALETTE.hudMuted, 'left');
    // Messages feed, clear of the controls hint at the very bottom.
    let my = view.h - 64;
    for (let i = G.messages.length - 1; i >= 0; i -= 1) {
      const m = G.messages[i];
      if (G.time - m.t > 6) continue;
      text(m.text, 16, my, 14, PALETTE.hudText, 'left');
      my -= 20;
    }
    // Dialogue box.
    if (G.dialog && G.dialog.idx < G.dialog.lines.length) {
      const line = G.dialog.lines[G.dialog.idx];
      panel(view.w / 2 - 320, view.h - 150, 640, 56);
      text(line, view.w / 2, view.h - 114, 16, PALETTE.hudText, 'center');
      text('Enter: lanjut', view.w / 2, view.h - 100, 12, PALETTE.hudMuted, 'center');
    }
    drawMinimap(G);
    if (G.missionCompleteFlash > 0) {
      text('MISI SELESAI', view.w / 2, 220, 44, PALETTE.accent, 'center', '800');
    }
  }

  function bar(x, y, w, h, frac, color, label) {
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w * Math.max(0, Math.min(1, frac)), h);
    text(label, x + w + 6, y + h - 1, 10, PALETTE.hudMuted, 'left', '700');
  }

  function drawScreenPanel(title, lines, prompt) {
    panel(view.w / 2 - 330, view.h / 2 - 190, 660, 380);
    text(title, view.w / 2, view.h / 2 - 120, 56, PALETTE.accent, 'center', '800');
    lines.forEach((line, i) => text(line, view.w / 2, view.h / 2 - 60 + i * 30, 18, PALETTE.hudText, 'center'));
    text(prompt, view.w / 2, view.h / 2 + 140, 20, PALETTE.money, 'center', '700');
  }

  function draw(G) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const ratio = window.devicePixelRatio || 1;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.fillStyle = '#0e1420';
    ctx.fillRect(0, 0, view.w, view.h);
    const cam = camera(G);
    drawGround(G, cam);
    drawBuildings(G, cam);
    drawLights(G, cam);
    drawMarker(G, cam);
    for (const pk of G.pickups) {
      const x = pk.x - cam.x;
      const y = pk.y - cam.y;
      ctx.fillStyle = pk.kind === 'cash' ? '#7ed491' : pk.kind === 'health' ? '#e5484d' : '#e8c33c';
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, Math.PI * 2);
      ctx.fill();
      text(pk.kind === 'cash' ? '$' : '+', x, y + 5, 12, '#111', 'center', '700');
    }
    for (const car of G.cars) drawCar(G, car, cam);
    for (const ped of G.peds) {
      drawPerson(G, ped.x, ped.y, ped.angle, ped.shirt, cam, ped.wait > 0 ? 0 : G.time * 8, ped.down);
      if (ped.taxi && ped.down <= 0) text('TAXI $', ped.x - cam.x, ped.y - 22 - cam.y, 11, PALETTE.accent, 'center', '700');
    }
    for (const cop of G.cops) drawPerson(G, cop.x, cop.y, cop.angle, '#2f6fd0', cam, G.time * 10, 0);
    for (const thug of G.thugs) drawPerson(G, thug.x, thug.y, thug.angle, '#3a3a3a', cam, 0, thug.down);
    const p = G.player;
    if (!p.car) drawPerson(G, p.x, p.y, p.angle, '#ffb020', cam, p.walkPhase, 0);
    for (const b of G.bullets) {
      ctx.fillStyle = '#ffd34d';
      ctx.fillRect(b.x - cam.x - 3, b.y - cam.y - 1, 6, 2);
    }
    for (const pt of G.particles) {
      ctx.fillStyle = pt.color;
      ctx.globalAlpha = Math.max(0, pt.t * 2);
      ctx.fillRect(pt.x - cam.x - 2, pt.y - cam.y - 2, 4, 4);
      ctx.globalAlpha = 1;
    }
    // Warm daylight wash.
    ctx.fillStyle = 'rgba(255, 190, 90, 0.05)';
    ctx.fillRect(0, 0, view.w, view.h);

    if (G.screen === SCREEN_TITLE) {
      ctx.fillStyle = 'rgba(10, 20, 30, 0.45)';
      ctx.fillRect(0, 0, view.w, view.h);
      drawScreenPanel('SOLMAR HEAT', [
        'Port Solmar. Matahari terik, jalanan panas.',
        'Rook baru keluar dari penjara. Utang menumpuk.',
        'Kerja untuk Marina dan Dario, atau cari uang sendiri.',
        'WASD jalan · E curi mobil · Space pukul · Klik tembak',
      ], 'Tekan Enter untuk mulai');
      text('Game orisinal. Bukan Vice City, bukan GTA.', view.w / 2, view.h / 2 + 176, 13, PALETTE.hudMuted, 'center');
    } else if (G.screen === SCREEN_PAUSED) {
      ctx.fillStyle = 'rgba(10, 20, 30, 0.5)';
      ctx.fillRect(0, 0, view.w, view.h);
      drawScreenPanel('JEDA', ['Istirahat dulu. Kota menunggu.', `Uang $${p.money} · Misi: ${G.mission ? G.mission.def.title : 'bebas'}`], 'P / Esc: lanjut · Enter: simpan dan lanjut');
    } else if (G.screen === SCREEN_OVER) {
      ctx.fillStyle = 'rgba(20, 8, 8, 0.55)';
      ctx.fillRect(0, 0, view.w, view.h);
      const busted = G.overReason === 'busted';
      drawScreenPanel(busted ? 'KETANGKAP' : 'ROOK TEWAS', [
        busted ? 'Polisi membawamu ke kantor. Denda $200.' : 'Kesehatanmu habis di jalanan Port Solmar.',
        `Uang $${p.money} · Misi selesai: ${G.missionsDone}`,
      ], 'Tekan Enter untuk coba lagi');
    } else {
      drawHud(G);
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw, view };
}
