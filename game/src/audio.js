// All sound is procedural WebAudio: oscillators and filtered noise, no audio
// files, no network. The context starts on the first user gesture; every call
// is a no-op until then, so headless screenshots stay silent and error-free.

export function createAudio() {
  let ctx = null;
  let engineOsc = null;
  let engineGain = null;
  let sirenOsc = null;
  let sirenGain = null;
  let sirenTimer = 0;

  function ensure() {
    if (ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
    } catch { return false; }
    return true;
  }

  function unlock() {
    if (ensure() && ctx.state === 'suspended') ctx.resume().catch(() => {});
  }

  function blip(freq, dur, type, vol) {
    if (!ensure()) return;
    try {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type || 'sine';
      o.frequency.value = freq;
      g.gain.setValueAtTime(vol || 0.12, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      o.connect(g).connect(ctx.destination);
      o.start();
      o.stop(ctx.currentTime + dur);
    } catch { /* sound is decoration; never break the game */ }
  }

  function noise(dur, vol, filterFreq) {
    if (!ensure()) return;
    try {
      const len = Math.floor(ctx.sampleRate * dur);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = filterFreq || 1200;
      const g = ctx.createGain();
      g.gain.value = vol || 0.2;
      src.connect(f).connect(g).connect(ctx.destination);
      src.start();
    } catch { /* ignore */ }
  }

  return {
    unlock,
    shot() { noise(0.12, 0.3, 3000); },
    punch() { noise(0.08, 0.2, 500); blip(90, 0.08, 'triangle', 0.15); },
    crash() { noise(0.25, 0.3, 700); },
    pickup() { blip(660, 0.09, 'sine', 0.12); blip(990, 0.12, 'sine', 0.1); },
    mission() { blip(523, 0.12, 'triangle', 0.14); setTimeout(() => blip(659, 0.12, 'triangle', 0.14), 120); setTimeout(() => blip(784, 0.2, 'triangle', 0.14), 240); },
    denied() { blip(160, 0.15, 'square', 0.08); },
    engine(on, speedRatio) {
      if (!ensure()) return;
      try {
        if (on && !engineOsc) {
          engineOsc = ctx.createOscillator();
          engineOsc.type = 'sawtooth';
          engineGain = ctx.createGain();
          engineGain.gain.value = 0.03;
          const f = ctx.createBiquadFilter();
          f.type = 'lowpass';
          f.frequency.value = 600;
          engineOsc.connect(f).connect(engineGain).connect(ctx.destination);
          engineOsc.start();
        }
        if (engineOsc) engineOsc.frequency.value = 55 + (speedRatio || 0) * 90;
        if (!on && engineOsc) {
          engineOsc.stop();
          engineOsc = null;
          engineGain = null;
        }
      } catch { /* ignore */ }
    },
    siren(on, dt) {
      if (!ensure()) return;
      try {
        if (on && !sirenOsc) {
          sirenOsc = ctx.createOscillator();
          sirenOsc.type = 'sine';
          sirenGain = ctx.createGain();
          sirenGain.gain.value = 0.035;
          sirenOsc.connect(sirenGain).connect(ctx.destination);
          sirenOsc.start();
          sirenTimer = 0;
        }
        if (sirenOsc) {
          sirenTimer += dt || 0;
          sirenOsc.frequency.value = Math.sin(sirenTimer * 4.4) > 0 ? 780 : 580;
        }
        if (!on && sirenOsc) {
          sirenOsc.stop();
          sirenOsc = null;
          sirenGain = null;
        }
      } catch { /* ignore */ }
    },
  };
}
