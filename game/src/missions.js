// Missions: three story jobs in order, plus a taxi side job. Each mission is a
// short chain of stages; a stage ends when Rook reaches its marker (or does
// what it asks), and the next stage starts with one plain line of dialogue.
// Dialogue is written plain: short sentences, no filler, no AI-slop patterns.

import { createCar } from './vehicles.js';

export const MISSION_DEFS = [
  {
    id: 'm1', title: 'Paket untuk Marina',
    brief: 'Ambil paket di Kafe Dermaga, antar ke Apartemen Coral.',
    stages: [
      { label: 'Ambil paket di Kafe Dermaga', target: 'cafe', say: ['Marina: "Paketnya di kafe dermaga. Jangan dibuka."', 'Rook: "Dibayar berapa?"', 'Marina: "Cukup. Jalan."'] },
      { label: 'Antar paket ke Apartemen Coral', target: 'delivery', say: ['Rook: "Paket sampai. Uangnya?"', 'Marina: "Sudah ditransfer. Kerja bagus."'] },
    ],
    reward: 150,
  },
  {
    id: 'm2', title: 'Mobil Pesanan',
    brief: 'Curi sedan kuning di dekat pasar, bawa ke Garasi Solmar. Ada yang jaga.',
    stages: [
      { label: 'Curi sedan kuning di dekat pasar', target: 'targetCar', say: ['Dario: "Sedan kuning, dekat pasar. Ada penjaganya."', 'Rook: "Satu orang bukan masalah."'] },
      { label: 'Bawa sedan ke Garasi Solmar', target: 'garage', say: ['Dario: "Bawa masuk, jangan lecet."'] },
    ],
    reward: 250,
  },
  {
    id: 'm3', title: 'Kabur ke Pantai',
    brief: 'Polisi sudah di ekormu. Sampai ke Pantai Selatan tanpa ketangkap.',
    stages: [
      { label: 'Kabur ke Pantai Selatan', target: 'safePoint', say: ['Polisi: "Berhenti! Turun dari mobil!"', 'Rook: "Pantai selatan. Di sana mereka berhenti ngejar."'] },
    ],
    reward: 300,
  },
];

function targetPoint(G, name) {
  const w = G.world;
  if (name === 'cafe') return { x: w.cafe.x, y: w.cafe.y, label: w.cafe.label };
  if (name === 'delivery') return { x: w.delivery.x, y: w.delivery.y, label: w.delivery.label };
  if (name === 'garage') return { x: w.garage.x, y: w.garage.y, label: w.garage.label };
  if (name === 'safePoint') return { x: w.safePoint.x, y: w.safePoint.y, label: w.safePoint.label };
  if (name === 'targetCar') return { x: w.targetCarSpot.x, y: w.targetCarSpot.y, label: 'Sedan kuning' };
  return { x: 1600, y: 1200, label: 'Tujuan' };
}

export function startMission(G, index) {
  const def = MISSION_DEFS[index];
  if (!def) return;
  G.mission = { index, def, stage: 0, target: targetPoint(G, def.stages[0].target), done: false };
  G.missionTarget = G.mission.target;
  G.dialog = { lines: def.stages[0].say, idx: 0 };
  G.addMessage(`${def.title} — ${def.brief}`);
  if (index === 1) spawnTargetCar(G);
  if (index === 2) {
    G.raiseWanted(3, 'misi');
    G.addMessage('Polisi mengejarmu. Kabur ke pantai selatan.');
  }
}

function spawnTargetCar(G) {
  const spot = G.world.targetCarSpot;
  const car = createCar(spot.x, spot.y, 0, '#e8c33c', { npc: false, target: true });
  G.cars.push(car);
  G.targetCar = car;
  G.thugs.push({ x: spot.x + 40, y: spot.y + 30, angle: 0, health: 100, shootTimer: 2, down: 0 });
}

export function missionTarget(G) {
  return G.mission && !G.mission.done ? G.mission.target : null;
}

// Called every frame while a mission runs. Returns 'complete' when the last stage ends.
export function updateMission(G, dt) {
  const m = G.mission;
  if (!m || m.done) return null;
  const p = G.player;
  const stage = m.def.stages[m.stage];
  if (m.index === 1 && m.stage === 0) {
    // Stage 0 of mission 2 ends when Rook sits in the yellow sedan.
    if (p.car === G.targetCar) {
      advanceStage(G);
      return null;
    }
    return null;
  }
  if (m.index === 1 && m.stage === 1) {
    if (p.car === G.targetCar && Math.hypot(p.x - m.target.x, p.y - m.target.y) < 70) {
      completeMission(G);
      return 'complete';
    }
    return null;
  }
  const d = Math.hypot(p.x - m.target.x, p.y - m.target.y);
  if (d < 60) {
    if (m.stage < m.def.stages.length - 1) advanceStage(G);
    else completeMission(G);
    return m.done ? 'complete' : null;
  }
  return null;
}

function advanceStage(G) {
  const m = G.mission;
  m.stage += 1;
  const stage = m.def.stages[m.stage];
  m.target = targetPoint(G, stage.target);
  G.missionTarget = m.target;
  G.dialog = { lines: stage.say, idx: 0 };
  G.audio.mission();
  G.addMessage(stage.label);
}

function completeMission(G) {
  const m = G.mission;
  m.done = true;
  G.player.money += m.def.reward;
  G.audio.mission();
  G.addMessage(`${m.def.title} selesai. +$${m.def.reward}`);
  G.missionCompleteFlash = 3;
  if (m.index < MISSION_DEFS.length - 1) {
    G.mission = null;
    G.nextMissionAt = G.time + 2; // next job starts shortly after
  } else {
    G.storyDone = true;
    G.addMessage('Cerita selesai. Port Solmar milikmu sekarang.');
  }
}

// Taxi side job: press T near a waiting pedestrian, drive them to the marker.
export function tryStartTaxi(G) {
  const p = G.player;
  if (p.car || G.taxi) return false;
  for (const ped of G.peds) {
    if (!ped.taxi || ped.down > 0) continue;
    if (Math.hypot(ped.x - p.x, ped.y - p.y) < 50) {
      const dest = G.world.randomRoadPoint();
      const fare = 40 + Math.floor(Math.hypot(dest.x - p.x, dest.y - p.y) / 40);
      G.taxi = { ped, dest: { x: dest.x, y: dest.y, label: 'Tujuan penumpang' }, fare, timer: 90 };
      G.peds.splice(G.peds.indexOf(ped), 1);
      G.addMessage(`Penumpang naik. Antar ke penanda kuning. Tarif $${fare}.`);
      G.audio.pickup();
      return true;
    }
  }
  return false;
}

export function updateTaxi(G, dt) {
  const t = G.taxi;
  if (!t) return;
  t.timer -= dt;
  if (t.timer <= 0) {
    G.addMessage('Penumpang turun di tengah jalan. Tarif hangus.');
    G.taxi = null;
    return;
  }
  const p = G.player;
  if (p.car && Math.hypot(p.x - t.dest.x, p.y - t.dest.y) < 60) {
    p.money += t.fare;
    G.addMessage(`Taksi selesai. +$${t.fare}`);
    G.audio.mission();
    G.taxi = null;
  }
}
