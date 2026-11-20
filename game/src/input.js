// Keyboard and pointer input. Held keys give movement and driving; one-shot
// presses (enter car, punch, pause, confirm, taxi) are queued as bit flags and
// taken once by the loop, so a press between two frames is never lost or counted twice.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_ENTER_CAR = 4;
export const ACTION_PUNCH = 8;
export const ACTION_TAXI = 16;

const UP = new Set(['ArrowUp', 'KeyW']);
const DOWN = new Set(['ArrowDown', 'KeyS']);
const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const CONFIRM = new Set(['Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);

export function createInput(canvas) {
  const keys = new Set();
  let actions = 0;
  let mouseX = 0;
  let mouseY = 0;
  let mouseDown = false;
  let mouseClicked = false;

  window.addEventListener('keydown', (event) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) event.preventDefault();
    if (event.repeat) return;
    keys.add(event.code);
    if (CONFIRM.has(event.code)) actions |= ACTION_CONFIRM;
    else if (PAUSE.has(event.code)) actions |= ACTION_PAUSE;
    else if (event.code === 'KeyE') actions |= ACTION_ENTER_CAR;
    else if (event.code === 'KeyF' || event.code === 'Space') actions |= ACTION_PUNCH;
    else if (event.code === 'KeyT') actions |= ACTION_TAXI;
  });
  window.addEventListener('keyup', (event) => keys.delete(event.code));
  window.addEventListener('blur', () => keys.clear());

  canvas.addEventListener('mousemove', (event) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = event.clientX - rect.left;
    mouseY = event.clientY - rect.top;
  });
  canvas.addEventListener('mousedown', (event) => {
    mouseDown = true;
    mouseClicked = true;
    const rect = canvas.getBoundingClientRect();
    mouseX = event.clientX - rect.left;
    mouseY = event.clientY - rect.top;
  });
  window.addEventListener('mouseup', () => { mouseDown = false; });

  return {
    up() { return [...keys].some((k) => UP.has(k)); },
    down() { return [...keys].some((k) => DOWN.has(k)); },
    left() { return [...keys].some((k) => LEFT.has(k)); },
    right() { return [...keys].some((k) => RIGHT.has(k)); },
    run() { return keys.has('ShiftLeft') || keys.has('ShiftRight'); },
    axisX() { return (this.right() ? 1 : 0) - (this.left() ? 1 : 0); },
    axisY() { return (this.down() ? 1 : 0) - (this.up() ? 1 : 0); },
    mouse() { return { x: mouseX, y: mouseY, down: mouseDown }; },
    takeClick() { const c = mouseClicked; mouseClicked = false; return c; },
    takeActions() { const taken = actions; actions = 0; return taken; },
  };
}
