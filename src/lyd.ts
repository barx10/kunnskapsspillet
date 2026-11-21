// Enkle lyder laget med Web Audio, så vi slipper lydfiler.
let ctx: AudioContext | null = null

function tone(frekvens: number, start: number, varighet: number, type: OscillatorType = 'sine', volum = 0.18) {
  ctx ??= new AudioContext()
  const t = ctx.currentTime + start
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = type
  osc.frequency.value = frekvens
  gain.gain.setValueAtTime(0.0001, t)
  gain.gain.exponentialRampToValueAtTime(volum, t + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + varighet)
  osc.connect(gain).connect(ctx.destination)
  osc.start(t)
  osc.stop(t + varighet + 0.05)
}

export const lyd = {
  riktig: () => [523, 659, 784].forEach((f, i) => tone(f, i * 0.09, 0.35, 'triangle')),
  feil: () => [220, 185].forEach((f, i) => tone(f, i * 0.16, 0.3, 'square', 0.08)),
  tikk: () => tone(880, 0, 0.06, 'sine', 0.08),
  slutt: () => tone(330, 0, 0.9, 'sawtooth', 0.09),
  buzz: () => [196, 262].forEach((f, i) => tone(f, i * 0.06, 0.4, 'sawtooth', 0.1)),
  dobbel: () => [392, 523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.07, 0.25, 'triangle')),
}
