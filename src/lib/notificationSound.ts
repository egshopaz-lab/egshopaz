
let audioContext: AudioContext | null = null;
let listenersAttached = false;
let lastPlayedAt = 0;

function getAudioContext() {
  if (typeof window === "undefined") return null;
  audioContext ??= new AudioContext();
  return audioContext;
}

async function unlockAudio() {
  const context = getAudioContext();
  if (context?.state === "suspended") {
    await context.resume().catch(() => undefined);
  }

  if (context?.state === "running") {
    window.removeEventListener("pointerdown", unlockAudio);
    window.removeEventListener("keydown", unlockAudio);
    listenersAttached = false;
  }
}

/**
 * Browsers only allow sound after the user has interacted with the page.
 * Prepare the shared audio context on the first click/tap/key press.
 */
export function prepareNotificationSound() {
  if (typeof window === "undefined" || listenersAttached) return;
  listenersAttached = true;
  window.addEventListener("pointerdown", unlockAudio, { passive: true });
  window.addEventListener("keydown", unlockAudio);
}

/** Plays a short, low-volume two-tone chime for an incoming message. */
export function playNotificationSound() {
  const now = Date.now();
  if (now - lastPlayedAt < 300) return;

  const context = audioContext;
  if (!context || context.state !== "running") {
    prepareNotificationSound();
    return;
  }

  lastPlayedAt = now;
  const startedAt = context.currentTime;
  const gain = context.createGain();
  gain.gain.setValueAtTime(0.0001, startedAt);
  gain.gain.exponentialRampToValueAtTime(0.045, startedAt + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, startedAt + 0.42);
  gain.connect(context.destination);

  const firstTone = context.createOscillator();
  firstTone.type = "sine";
  firstTone.frequency.setValueAtTime(740, startedAt);
  firstTone.connect(gain);
  firstTone.start(startedAt);
  firstTone.stop(startedAt + 0.18);

  const secondTone = context.createOscillator();
  secondTone.type = "sine";
  secondTone.frequency.setValueAtTime(988, startedAt + 0.16);
  secondTone.connect(gain);
  secondTone.start(startedAt + 0.16);
  secondTone.stop(startedAt + 0.42);
}
