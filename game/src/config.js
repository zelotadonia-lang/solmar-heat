// Solmar Heat — design tokens and tuning numbers.
// Palette (ui-ux-pro-max + design-system, three layers): primitives are raw
// hexes, semantic names say what each colour is for, HUD components read the
// semantic names, never a raw hex.
export const PALETTE = {
  sky: '#8fd0e8',
  sand: '#e9d6a4',
  sea: '#2e7fa8',
  seaDeep: '#22607f',
  grass: '#7fae5a',
  asphalt: '#3b4048',
  asphaltLine: '#e8c33c',
  sidewalk: '#b9b3a4',
  building: '#c98f5f',
  building2: '#8fa3b8',
  building3: '#d9b48a',
  roof: '#5d4a3a',
  hudPanel: 'rgba(12, 16, 22, 0.72)',
  hudText: '#f5f2e8',
  hudMuted: '#c9c4b4',
  accent: '#ffb020',
  money: '#7ed491',
  health: '#e5484d',
  armor: '#5aa9e6',
  wanted: '#ffcf3f',
  mission: '#ff8c42',
  police: '#2f6fd0',
  policeLight: '#e5484d',
};

// World size in pixels. Roads run on a 400 px grid; blocks between them hold
// buildings, a park, and the beach strip along the south edge.
export const WORLD_W = 3200;
export const WORLD_H = 2400;
export const ROAD_W = 96;
export const ROAD_XS = [200, 600, 1000, 1400, 1800, 2200, 2600, 3000];
export const ROAD_YS = [200, 600, 1000, 1400, 1800];
export const BEACH_Y = 2050; // south of this: sand, then sea at the very edge
export const SEA_Y = 2260;

export const STEP = 1 / 60;
export const PLAYER_SPEED = 210; // px/s walking
export const PLAYER_RUN_SPEED = 330;
export const CAR_ACCEL = 420;
export const CAR_MAX_SPEED = 560;
export const CAR_REVERSE_SPEED = 200;
export const CAR_TURN = 2.6; // rad/s at full lock, scaled by speed
export const MAX_WANTED = 5;
export const SAVE_KEY = 'solmar-heat-save-v1';
export const MONEY_START = 120;
export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

export const CAR_COLORS = ['#d94f3d', '#3d7dd9', '#e8c33c', '#7ed491', '#e8e4da', '#8a5fd0', '#e07b39', '#4fb3a9'];
export const PED_SHIRTS = ['#e8e4da', '#d94f3d', '#3d7dd9', '#7ed491', '#e8c33c', '#8a5fd0', '#e07b39'];
