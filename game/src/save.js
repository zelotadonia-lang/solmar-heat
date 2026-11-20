// Save and load through localStorage. Only plain numbers and positions are
// stored: money, health, ammo, wanted, mission progress, the clock, and where
// Rook stands. Traffic and pedestrians are rebuilt fresh on load.
import { SAVE_KEY } from './config.js';

export function saveGame(G) {
  try {
    const p = G.player;
    const data = {
      money: p.money, health: p.health, armor: p.armor, ammo: p.ammo,
      wanted: G.wanted, missionIndex: G.mission ? G.mission.index : (G.storyDone ? 99 : G.nextMissionIndex || 0),
      missionDone: G.mission ? G.mission.done : false,
      clockMin: G.clockMin, x: p.x, y: p.y, angle: p.angle,
      time: G.time,
    };
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function loadGame() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (typeof data.money !== 'number' || typeof data.x !== 'number') return null;
    return data;
  } catch {
    return null;
  }
}

export function hasSave() {
  return loadGame() !== null;
}
