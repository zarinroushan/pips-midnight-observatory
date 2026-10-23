const mixerPreferenceKey = 'dear-pip-lullaby-mixer-v2';
const bubbleStorageKey = 'dear-pip-lullaby-bubbles-v1';
const defaultMixer = Object.freeze({
  master: 0.35,
  timer: '0',
  layers: Object.freeze({ rain: 0.45, wind: 0.3, crickets: 0.25, fireplace: 0.25, tones: 0.35 }),
});
const noteFrequencies = [261.63, 329.63, 392];
const mixerSequence = [0, 2, 1, 2, 0, 1];
const targetZones = Object.freeze({
  night: Object.freeze([
    Object.freeze({ x: [0.08, 0.27], y: [0.1, 0.4], region: 'sky' }),
    Object.freeze({ x: [0.38, 0.57], y: [0.08, 0.36], region: 'sky' }),
    Object.freeze({ x: [0.72, 0.91], y: [0.12, 0.42], region: 'sky' }),
    Object.freeze({ x: [0.12, 0.38], y: [0.63, 0.87], region: 'ground' }),
    Object.freeze({ x: [0.64, 0.91], y: [0.63, 0.88], region: 'ground' }),
  ]),
  day: Object.freeze([
    Object.freeze({ x: [0.19, 0.34], y: [0.55, 0.78], region: 'bush' }),
    Object.freeze({ x: [0.43, 0.6], y: [0.55, 0.78], region: 'flowers' }),
    Object.freeze({ x: [0.72, 0.9], y: [0.2, 0.45], region: 'open-sky' }),
  ]),
});
const fallbackTargets = Object.freeze({
  night: Object.freeze([
    Object.freeze({ x: 0.14, y: 0.17, region: 'sky' }),
    Object.freeze({ x: 0.49, y: 0.12, region: 'sky' }),
    Object.freeze({ x: 0.86, y: 0.3, region: 'sky' }),
    Object.freeze({ x: 0.18, y: 0.82, region: 'ground' }),
    Object.freeze({ x: 0.78, y: 0.84, region: 'ground' }),
  ]),
  day: Object.freeze([
    Object.freeze({ x: 0.15, y: 0.55, region: 'bush' }),
    Object.freeze({ x: 0.68, y: 0.72, region: 'flowers' }),
    Object.freeze({ x: 0.84, y: 0.25, region: 'open-sky' }),
  ]),
});
const layerRows = [...document.querySelectorAll('[data-audio-layer]')];
const layerState = new Map();
const activeMixerVoices = new Set();
const activeGameVoices = new Set();
const activeBubbleVoices = new Set();

const mixer = document.querySelector('#lullabyMixer');
const playButton = document.querySelector('#lullabyPlay');
const pauseButton = document.querySelector('#lullabyPause');
const stopButton = document.querySelector('#lullabyStop');
const masterVolume = document.querySelector('#lullabyVolume');
const sleepTimer = document.querySelector('#lullabySleepTimer');
const audioStatus = document.querySelector('#lullabyStatus');
const nightlight = document.querySelector('#lullabyNightlight');
const gardenScene = document.querySelector('#lullabyGardenScene');
const hiddenTarget = document.querySelector('#lullabyHiddenTarget');
const hiddenTargets = [...document.querySelectorAll('[data-star-index]')];
const butterflyTargets = [...document.querySelectorAll('[data-butterfly-index]')];
const torchAimHandle = document.querySelector('#lullabyTorchAimHandle');
const experience = document.querySelector('#lullabyExperience');
const sceneButtons = [...document.querySelectorAll('[data-scene-select]')];
const sceneBackdrops = [...document.querySelectorAll('[data-scene-backdrop]')];
const sceneStatus = document.querySelector('#lullabySceneStatus');
const activeLayersStatus = document.querySelector('#lullabyActiveLayers');
const settingsDrawer = document.querySelector('#lullabyControls');
const discoveryTitle = document.querySelector('#nightlightTitle');
const discoveryInstructions = document.querySelector('#nightlightInstructions');
const discoveryStatus = document.querySelector('#lullabyDiscoveryStatus');
const searchStart = document.querySelector('#lullabySearchStart');
const searchBeam = document.querySelector('#lullabySearchBeam');
const pipArts = [...document.querySelectorAll('[data-pip-art]')];
const replayDiscovery = document.querySelector('#lullabyReplayDiscovery');
const bubbleForm = document.querySelector('#dreamBubbleForm');
const bubbleInput = document.querySelector('#dreamBubbleInput');
const bubbleList = document.querySelector('#dreamBubbleList');
const bubbleStatus = document.querySelector('#dreamBubbleStatus');
const bubbleClear = document.querySelector('#dreamBubbleClear');
const bubbleCreate = document.querySelector('#dreamBubbleCreate');
const bubbleSound = document.querySelector('#bubbleSound');
const bubbleDialog = document.querySelector('#dreamBubbleDialog');
const bubbleDialogText = document.querySelector('#dreamBubbleDialogText');
const bubbleDialogClose = document.querySelector('#dreamBubbleClose');
const bubbleDialogDelete = document.querySelector('#dreamBubbleDelete');
const bubbleDialogComplete = document.querySelector('#dreamBubbleComplete');
const bubbleDialogEditButton = document.querySelector('#dreamBubbleEdit');
const bubbleDialogEditForm = document.querySelector('#dreamBubbleEditForm');
const bubbleDialogEditInput = document.querySelector('#dreamBubbleEditInput');
const bubbleDialogEditSave = document.querySelector('#dreamBubbleEditSave');
const bubbleDialogEditCancel = document.querySelector('#dreamBubbleEditCancel');
const bubbleDialogActions = bubbleDialog.querySelector('.lullaby-wish-dialog__content > .lullaby-wish-dialog__actions');
const gameButtons = [...document.querySelectorAll('.lullaby-note')];
const gameStatus = document.querySelector('#lullabyGameStatus');
const gameStart = document.querySelector('#lullabyGameStart');
const gameReplay = document.querySelector('#lullabyGameReplay');
const gameMute = document.querySelector('#lullabyGameMute');
const gameRestart = document.querySelector('#lullabyGameRestart');
const musicBox = document.querySelector('#lullabyMusicBox');

let audioContext = null;
let masterGain = null;
let gameGain = null;
let bubbleGain = null;
let mixerState = 'stopped';
let playRequestId = 0;
let siteMuted = true;
let mixerStep = 0;
let mixerTimerId = 0;
let timerId = 0;
let timerDeadline = 0;
let timerRemaining = 0;
let discoveryMode = '';
let searchActive = false;
let pipPosition = { x: 0.28, y: 0.7 };
let dragPointerId = null;
let aimPointerId = null;
let torchAngle = -70 * Math.PI / 180;
let torchAiming = false;
const collectedStars = new Set();
const illuminatedStars = new Set();
const collectedButterflies = new Set();
const nearbyButterflies = new Set();
let activeStarPositions = fallbackTargets.night.map((target) => ({ ...target }));
let activeButterflyPositions = fallbackTargets.day.map((target) => ({ ...target }));
let dragOffset = { x: 0, y: 0 };
let targetDiscovered = false;
let bubbles = [];
let nextBubbleId = 1;
let selectedBubbleId = 0;
let dialogReturnBubbleId = 0;
let creatingBubble = false;
let bubbleCreateResetTimer = 0;
let gamePattern = [];
let gameInputIndex = 0;
let gameRoundLength = 3;
let gamePlaying = false;
let gameStartPending = false;
let gameInputPending = false;
let gameInputTimer = 0;
let gameMuted = false;
let gameToken = 0;
let musicBoxTimer = 0;
let discoveryNear = false;
const discoveryStorageKey = 'dear-pip-lullaby-discoveries-v1';
let hiddenStarDiscovered = false;
let hiddenButterflyDiscovered = false;

try {
  const savedDiscoveries = JSON.parse(localStorage.getItem(discoveryStorageKey) || '{}');
  if (savedDiscoveries?.hiddenStarFound === true) hiddenStarDiscovered = true;
  if (savedDiscoveries?.hiddenButterflyFound === true) hiddenButterflyDiscovered = true;
} catch (_error) {}

function lullabyProgressSnapshot() {
  const bubbleTexts = bubbles.map((b) => (typeof b === 'string' ? b : b.text)).filter(Boolean);
  return {
    version: 1,
    bubbles: bubbleTexts,
    deletedBubbles: [],
    hiddenStarFound: hiddenStarDiscovered,
    hiddenButterflyFound: hiddenButterflyDiscovered,
  };
}

function syncLullabyProgress() {
  try {
    localStorage.setItem(discoveryStorageKey, JSON.stringify({
      hiddenStarFound: hiddenStarDiscovered,
      hiddenButterflyFound: hiddenButterflyDiscovered,
    }));
  } catch (_error) {}
  const syncProvider = window['DearPip' + 'Progress'];
  if (syncProvider) {
    syncProvider.save('lullaby', lullabyProgressSnapshot()).catch((error) => {
      console.info('Could not sync Lullaby Lab progress:', error);
    });
  }
}

const loadProvider = window['DearPip' + 'Progress'];
if (loadProvider) {
  loadProvider.load('lullaby', lullabyProgressSnapshot()).then(({ data }) => {
    if (data) {
      if (data.hiddenStarFound) hiddenStarDiscovered = true;
      if (data.hiddenButterflyFound) hiddenButterflyDiscovered = true;
      try {
        localStorage.setItem(discoveryStorageKey, JSON.stringify({
          hiddenStarFound: hiddenStarDiscovered,
          hiddenButterflyFound: hiddenButterflyDiscovered,
        }));
      } catch (_error) {}
    }
  }).catch((error) => {
    console.info('Could not load Lullaby Lab progress:', error);
  });
}

function setTextStatus(element, message) {
  if (element) element.textContent = message;
}

function readPreferences() {
  try {
    const saved = JSON.parse(localStorage.getItem(mixerPreferenceKey) || 'null');
    if (!saved || saved.version !== 2) return null;
    return saved;
  } catch (error) {
    console.info('Lullaby mixer preferences could not be read:', error);
    return null;
  }
}

function savePreferences() {
  const layers = {};
  layerRows.forEach((row) => {
    const name = row.dataset.audioLayer;
    const toggle = row.querySelector('[data-layer-toggle]');
    const range = row.querySelector('[data-layer-volume]');
    layers[name] = {
      enabled: Boolean(toggle?.checked),
      volume: Number(range?.value || 0),
    };
  });
  try {
    localStorage.setItem(mixerPreferenceKey, JSON.stringify({
      version: 2,
      master: Number(masterVolume.value),
      timer: Number(sleepTimer.value),
      layers,
    }));
  } catch (error) {
    console.info('Lullaby mixer preferences could not be saved:', error);
  }
}

function applySavedPreferences() {
  const saved = readPreferences();
  if (!saved) return;
  if (Number.isFinite(saved.master)) masterVolume.value = String(Math.max(0, Math.min(1, saved.master)));
  layerRows.forEach((row) => {
    const name = row.dataset.audioLayer;
    const value = saved.layers?.[name];
    if (!value) return;
    const range = row.querySelector('[data-layer-volume]');
    if (range && !range.disabled && Number.isFinite(value.volume)) {
      range.value = String(Math.max(0, Math.min(1, value.volume)));
    }
  });
}

applySavedPreferences();
sleepTimer.value = '0';
layerRows.forEach((row) => {
  const toggle = row.querySelector('[data-layer-toggle]');
  if (toggle) toggle.checked = false;
  const media = row.querySelector('audio[data-layer-audio]');
  if (media) {
    media.autoplay = false;
    media.pause();
    try { media.currentTime = 0; } catch (_error) { /* The file may not be loaded yet. */ }
  }
});
clearSleepTimer();

window.DearPipSounds?.subscribeMute?.((muted) => {
  siteMuted = muted;
  if (masterGain && audioContext) {
    const volume = siteMuted ? 0 : Number(masterVolume.value);
    masterGain.gain.setTargetAtTime(volume, audioContext.currentTime, 0.035);
  }
  if (gameGain && audioContext) gameGain.gain.setTargetAtTime(siteMuted || gameMuted ? 0 : 0.72, audioContext.currentTime, 0.035);
  if (bubbleGain && audioContext) bubbleGain.gain.setTargetAtTime(siteMuted ? 0 : 0.72, audioContext.currentTime, 0.035);
  if (siteMuted) {
    silenceVoices(activeGameVoices);
    silenceVoices(activeBubbleVoices);
    stopMusicBoxAnimation();
    if (gamePlaying) setTextStatus(gameStatus, 'Shared sound is muted. The note pattern continues silently.');
  }
  if (mixerState === 'playing') updateMixerStatus();
});

function updateMixerStatus(message = '') {
  if (message) {
    setTextStatus(audioStatus, message);
    return;
  }
  if (mixerState === 'playing') {
    const minutes = timerDeadline ? Math.max(1, Math.ceil((timerDeadline - Date.now()) / 60000)) : 0;
    const playback = siteMuted
      ? 'Your sound layers are playing, but muted. Turn on the shared Sound control to hear them.'
      : 'Your sound layers are playing.';
    setTextStatus(audioStatus, minutes ? `${playback} Sleep timer: about ${minutes} minutes.` : playback);
  } else if (mixerState === 'paused') {
    setTextStatus(audioStatus, 'Paused. Your layer choices are ready to resume.');
  } else {
    setTextStatus(audioStatus, 'Sound is off. Play a layer whenever you are ready.');
  }
  updateActiveLayers();
}

function layerDisplayName(layer) {
  const names = { rain: 'Rain', wind: 'Soft wind', crickets: 'Nighttime crickets', fireplace: 'Fireplace', tones: 'Gentle Lullaby Tones' };
  return names[layer.name] || layer.name;
}

function updateActiveLayers() {
  if (!activeLayersStatus) return;
  const active = mixerState === 'playing'
    ? [...layerState.values()].filter((layer) => layer.available && layer.playing && layer.toggle.checked && (!layer.media || (!layer.media.paused && !layer.media.ended))).map(layerDisplayName)
    : [];
  activeLayersStatus.textContent = active.length ? `Playing: ${active.join(' · ')}` : 'No sounds playing';
  mixer?.classList.toggle('has-active-audio', active.length > 0);
}

const sceneLabels = {
  sleeping: 'Sleeping',
  rain: 'Rainy Night',
  wind: 'Windy Night',
  fireplace: 'Fireplace',
};

function selectScene(scene, announce = true) {
  if (!sceneLabels[scene]) return;
  experience.dataset.scene = scene;
  const suggestedLayerName = { sleeping: 'tones', rain: 'rain', wind: 'wind', fireplace: 'fireplace' }[scene];
  const suggestedLayerToggle = document.querySelector(`[data-audio-layer="${suggestedLayerName}"] [data-layer-toggle]`);
  if (mixerState !== 'playing' && suggestedLayerToggle && !suggestedLayerToggle.disabled && !suggestedLayerToggle.checked) {
    suggestedLayerToggle.checked = true;
    savePreferences();
  }
  sceneButtons.forEach((button) => {
    const selected = button.dataset.sceneSelect === scene;
    button.setAttribute('aria-pressed', String(selected));
  });
  sceneBackdrops.forEach((backdrop) => {
    backdrop.classList.toggle('is-active', backdrop.dataset.sceneBackdrop === scene);
  });
  if (announce) {
    const mappedLayer = { rain: 'Rain', wind: 'Soft wind', fireplace: 'Fireplace' }[scene];
    const layerRow = { rain: 'rain', wind: 'wind', fireplace: 'fireplace' }[scene];
    const layerControl = layerRow && document.querySelector(`[data-audio-layer="${layerRow}"] [data-layer-toggle]`);
    const soundNotice = mixerState === 'playing'
      ? ' Current audio playback is unchanged.'
      : mappedLayer && layerControl?.disabled
        ? ` ${mappedLayer} recording is unavailable.`
        : ' Audio remains off until you press Play.';
    setTextStatus(sceneStatus, `${sceneLabels[scene]} room selected.${soundNotice}`);
  }
}

sceneButtons.forEach((button) => {
  button.addEventListener('click', () => selectScene(button.dataset.sceneSelect));
});

if (settingsDrawer && window.matchMedia?.('(max-width: 720px)').matches) settingsDrawer.open = false;
window.matchMedia?.('(max-width: 720px)').addEventListener?.('change', (event) => {
  if (settingsDrawer) settingsDrawer.open = !event.matches;
});

function updateMixerControls() {
  const hasAvailableLayer = [...layerState.values()].some((layer) => layer.available && layer.toggle.checked);
  playButton.disabled = mixerState === 'playing' || mixerState === 'starting';
  pauseButton.disabled = mixerState !== 'playing';
  stopButton.disabled = mixerState === 'stopped';
  mixer?.classList.toggle('is-playing', mixerState === 'playing');
  mixer?.classList.toggle('is-paused', mixerState === 'paused');
  mixer?.classList.toggle('is-starting', mixerState === 'starting');
  if (!hasAvailableLayer && mixerState === 'stopped') playButton.disabled = false;
  updateActiveLayers();
}

function setLayerGain(layer) {
  if (!layer.gain || !audioContext) return;
  const active = layer.toggle.checked && layer.available && layer.playing && mixerState === 'playing';
  const value = active ? Number(layer.range.value) : 0;
  layer.gain.gain.setTargetAtTime(value, audioContext.currentTime, 0.035);
}

function markLayerUnavailable(layer, message = `The ${layer.name} recording is unavailable.`) {
  if (!layer || !layer.available) return;
  layer.available = false;
  layer.playing = false;
  layer.starting = false;
  layer.toggle.checked = false;
  layer.toggle.disabled = true;
  layer.range.disabled = true;
  layer.media?.pause();
  setLayerGain(layer);
  let notice = layer.row.querySelector('.lullaby-layer__availability');
  if (!notice) {
    notice = document.createElement('span');
    notice.className = 'lullaby-layer__availability';
    layer.row.querySelector('label')?.append(notice);
  }
  if (notice) notice.textContent = 'Audio unavailable';
  const anotherLayerCanContinue = [...layerState.values()].some((entry) => entry !== layer && entry.available && entry.toggle.checked && (entry.starting || (entry.playing && (!entry.media || (!entry.media.paused && !entry.media.ended)))));
  if (mixerState === 'playing' && !anotherLayerCanContinue) {
    stopMixer(message);
    return;
  }
  setTextStatus(audioStatus, message);
  updateMixerControls();
}

async function startMediaLayer(layer) {
  if (!layer?.available || !layer.media || !layer.toggle.checked || layer.starting) return Boolean(layer?.playing);
  if (!layer.media.paused) return true;
  layer.starting = true;
  try {
    await layer.media.play();
    if (!['starting', 'playing'].includes(mixerState) || !layer.toggle.checked) {
      layer.media.pause();
      layer.playing = false;
      setLayerGain(layer);
      return false;
    }
    layer.playing = true;
    setLayerGain(layer);
    return true;
  } catch (error) {
    layer.playing = false;
    layer.playError = error?.name === 'NotAllowedError'
      ? 'Playback was blocked by browser audio permissions.'
      : error?.name === 'NotSupportedError'
        ? 'The recording format is unsupported or the file is invalid.'
        : 'The recording could not start. Check the file and try again.';
    setLayerGain(layer);
    if (layer.media.error || error?.name === 'NotSupportedError') {
      markLayerUnavailable(layer, `${layerDisplayName(layer)} could not load or is unsupported.`);
    } else {
      console.info(`Could not play Lullaby Lab ${layer.name}:`, error);
    }
    return false;
  } finally {
    layer.starting = false;
  }
}

async function ensureAudioContext() {
  const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextConstructor) {
    updateMixerStatus('Web Audio is unavailable in this browser. The garden and dream bubbles still work.');
    return false;
  }
  try {
    if (!audioContext) {
      audioContext = new AudioContextConstructor();
      masterGain = audioContext.createGain();
      masterGain.gain.value = siteMuted ? 0 : Number(masterVolume.value);
      masterGain.connect(audioContext.destination);
      gameGain = audioContext.createGain();
      gameGain.gain.value = siteMuted || gameMuted ? 0 : 0.72;
      gameGain.connect(audioContext.destination);
      bubbleGain = audioContext.createGain();
      bubbleGain.gain.value = siteMuted ? 0 : 0.72;
      bubbleGain.connect(audioContext.destination);
      layerRows.forEach((row) => {
        const name = row.dataset.audioLayer;
        const toggle = row.querySelector('[data-layer-toggle]');
        const range = row.querySelector('[data-layer-volume]');
        const media = row.querySelector('audio[data-layer-audio]');
        const gain = audioContext.createGain();
        gain.gain.value = 0;
        gain.connect(masterGain);
        const layer = { name, row, toggle, range, media, gain, source: null, available: Boolean(toggle && range && !toggle.disabled && !range.disabled), playing: false, starting: false };
        if (media?.getAttribute('src')) {
          layer.source = audioContext.createMediaElementSource(media);
          layer.source.connect(gain);
          layer.available = true;
          toggle.disabled = false;
          range.disabled = false;
          row.querySelector('.lullaby-layer__availability')?.remove();
        }
        layerState.set(name, layer);
        media?.addEventListener('error', () => markLayerUnavailable(layer, `${layerDisplayName(layer)} could not load. Check the audio file and try again.`));
        const reconcilePausedMedia = () => {
          if (mixerState !== 'playing' || !layer.playing || !media?.paused) return;
          layer.playing = false;
          setLayerGain(layer);
          const anotherLayerCanContinue = [...layerState.values()].some((entry) => entry !== layer && entry.available && entry.toggle.checked && (entry.starting || (entry.playing && (!entry.media || (!entry.media.paused && !entry.media.ended)))));
          if (!anotherLayerCanContinue) stopMixer(`${layerDisplayName(layer)} playback stopped unexpectedly.`);
          else updateMixerStatus();
        };
        media?.addEventListener('pause', reconcilePausedMedia);
        media?.addEventListener('ended', reconcilePausedMedia);
      });
    }
    if (audioContext.state !== 'running') await audioContext.resume();
    return audioContext.state === 'running';
  } catch (error) {
    updateMixerStatus('Audio could not start. Check your browser audio settings and try again.');
    console.error('Could not start Lullaby Lab audio:', error);
    return false;
  }
}

function createTone(frequency, duration, bus, voices, volume = 0.12) {
  if (!audioContext || !bus || audioContext.state !== 'running') return false;
  try {
    const now = audioContext.currentTime;
    const oscillator = audioContext.createOscillator();
    const envelope = audioContext.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, now);
    envelope.gain.setValueAtTime(0.0001, now);
    envelope.gain.exponentialRampToValueAtTime(volume, now + 0.025);
    envelope.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(envelope);
    envelope.connect(bus);
    const voice = { oscillator, envelope };
    voices.add(voice);
    oscillator.onended = () => {
      voices.delete(voice);
      oscillator.disconnect();
      envelope.disconnect();
    };
    oscillator.start(now);
    oscillator.stop(now + duration + 0.04);
    return true;
  } catch (error) {
    console.info('A Lullaby Lab tone could not be scheduled:', error);
    return false;
  }
}

function silenceVoices(voices) {
  if (!audioContext) return;
  const now = audioContext.currentTime;
  [...voices].forEach((voice) => {
    try {
      voice.envelope.gain.cancelScheduledValues(now);
      voice.envelope.gain.setTargetAtTime(0.0001, now, 0.012);
      voice.oscillator.stop(now + 0.06);
    } catch (_error) {
      voices.delete(voice);
    }
  });
}

function stopMusicBoxAnimation() {
  if (musicBoxTimer) window.clearTimeout(musicBoxTimer);
  musicBoxTimer = 0;
  musicBox?.classList.remove('is-playing');
}

function animateMusicBox(duration) {
  if (!musicBox) return;
  stopMusicBoxAnimation();
  void musicBox.offsetWidth;
  musicBox.classList.add('is-playing');
  musicBoxTimer = window.setTimeout(stopMusicBoxAnimation, duration * 1000);
}

function playGameNote(note, duration) {
  if (!gameGain || gameMuted || siteMuted) return false;
  const frequency = noteFrequencies[note];
  const scheduled = createTone(frequency, duration, gameGain, activeGameVoices, 0.12);
  if (!scheduled) return false;
  createTone(frequency * 2.01, duration * 0.45, gameGain, activeGameVoices, 0.018);
  animateMusicBox(duration);
  return true;
}

function playMixerTone() {
  if (mixerState !== 'playing') return;
  const tones = layerState.get('tones');
  if (tones?.toggle.checked && tones.gain) {
    createTone(noteFrequencies[mixerSequence[mixerStep % mixerSequence.length]], 1.15, tones.gain, activeMixerVoices, 0.09);
    mixerStep += 1;
  }
  mixerTimerId = window.setTimeout(playMixerTone, 1550);
}

function clearSleepTimer(preserveRemaining = false) {
  if (timerId) window.clearTimeout(timerId);
  timerId = 0;
  if (preserveRemaining && timerDeadline) timerRemaining = Math.max(0, timerDeadline - Date.now());
  else if (!preserveRemaining) timerRemaining = 0;
  timerDeadline = 0;
}

function startSleepTimer(milliseconds = 0) {
  clearSleepTimer();
  if (!milliseconds) return;
  timerRemaining = milliseconds;
  timerDeadline = Date.now() + timerRemaining;
  timerId = window.setTimeout(() => {
    stopMixer('Your sleep timer is complete. The sound has gently stopped.');
    sleepTimer.value = '0';
    savePreferences();
  }, timerRemaining);
}

async function playMixer() {
  if (mixerState === 'playing' || mixerState === 'starting') return;
  const requestId = ++playRequestId;
  mixerState = 'starting';
  updateMixerControls();
  if (!await ensureAudioContext()) {
    if (requestId === playRequestId) {
      mixerState = 'stopped';
      updateMixerControls();
    }
    return;
  }
  if (requestId !== playRequestId) return;
  const availableEnabled = [...layerState.values()].filter((layer) => layer.available && layer.toggle.checked);
  if (!availableEnabled.length) {
    mixerState = 'stopped';
    updateMixerControls();
    updateMixerStatus('Choose an available sound layer before pressing Play.');
    return;
  }
  const playResults = await Promise.all(availableEnabled.map(async (layer) => {
    if (!layer.media) {
      layer.playing = layer.name === 'tones';
      setLayerGain(layer);
      return layer.playing;
    }
    return startMediaLayer(layer);
  }));
  if (requestId !== playRequestId || mixerState !== 'starting') return;
  const failedLayers = availableEnabled.filter((layer, index) => !playResults[index]);
  const activeLayers = [...layerState.values()].filter((layer) => layer.available && layer.playing && layer.toggle.checked && (!layer.media || (!layer.media.paused && !layer.media.ended)));
  if (!activeLayers.length) {
    mixerState = 'stopped';
    updateMixerControls();
    const failures = failedLayers.map((layer) => `${layerDisplayName(layer)}: ${layer.playError || 'playback failed.'}`);
    updateMixerStatus(failures.length
      ? failures.join(' ')
      : 'No selected recording could be played. Check the audio files and try again.');
    return;
  }
  mixerState = 'playing';
  activeLayers.forEach(setLayerGain);
  if (mixerTimerId) window.clearTimeout(mixerTimerId);
  const toneLayer = layerState.get('tones');
  if (toneLayer?.toggle.checked && !toneLayer.media) playMixerTone();
  if (timerRemaining > 0) {
    timerDeadline = Date.now() + timerRemaining;
    timerId = window.setTimeout(() => {
      stopMixer('Your sleep timer is complete. The sound has gently stopped.');
      sleepTimer.value = '0';
      savePreferences();
    }, timerRemaining);
  } else {
    startSleepTimer(Number(sleepTimer.value) * 60000);
  }
  updateMixerControls();
  updateMixerStatus(failedLayers.length
    ? `${siteMuted ? 'Playing available layers, but muted by the shared Sound control.' : 'Playing available layers.'} ${failedLayers.map((layer) => `${layerDisplayName(layer)}: ${layer.playError || 'playback failed.'}`).join(' ')}`
    : '');
}

function pauseMixer() {
  if (mixerState !== 'playing') return;
  playRequestId += 1;
  mixerState = 'paused';
  if (mixerTimerId) window.clearTimeout(mixerTimerId);
  mixerTimerId = 0;
  clearSleepTimer(true);
  silenceVoices(activeMixerVoices);
  layerState.forEach((layer) => {
    layer.playing = false;
    setLayerGain(layer);
    layer.media?.pause();
  });
  updateMixerControls();
  updateMixerStatus();
}

function stopMixer(message = '') {
  playRequestId += 1;
  mixerState = 'stopped';
  if (mixerTimerId) window.clearTimeout(mixerTimerId);
  mixerTimerId = 0;
  clearSleepTimer();
  timerRemaining = 0;
  mixerStep = 0;
  layerState.forEach((layer) => {
    layer.playing = false;
    setLayerGain(layer);
    if (layer.media) {
      layer.media.pause();
      layer.media.currentTime = 0;
    }
  });
  silenceVoices(activeMixerVoices);
  sleepTimer.value = '0';
  savePreferences();
  updateMixerControls();
  updateMixerStatus(message);
}

function resetMixer() {
  stopMixer();
  layerRows.forEach((row) => {
    const name = row.dataset.audioLayer;
    const toggle = row.querySelector('[data-layer-toggle]');
    const range = row.querySelector('[data-layer-volume]');
    if (toggle) toggle.checked = false;
    if (range) range.value = String(defaultMixer.layers[name] ?? 0);
  });
  masterVolume.value = String(defaultMixer.master);
  sleepTimer.value = defaultMixer.timer;
  if (masterGain && audioContext) {
    masterGain.gain.setTargetAtTime(siteMuted ? 0 : defaultMixer.master, audioContext.currentTime, 0.035);
  }
  layerState.forEach(setLayerGain);
  savePreferences();
  updateMixerControls();
  updateMixerStatus('Mix reset. No sounds are playing.');
}

playButton.addEventListener('click', playMixer);
pauseButton.addEventListener('click', pauseMixer);
stopButton.addEventListener('click', () => stopMixer());
document.querySelector('#lullabyReset').addEventListener('click', resetMixer);

masterVolume.addEventListener('input', () => {
  if (masterGain && audioContext) masterGain.gain.setTargetAtTime(siteMuted ? 0 : Number(masterVolume.value), audioContext.currentTime, 0.035);
  savePreferences();
});

sleepTimer.addEventListener('change', () => {
  savePreferences();
  if (mixerState === 'stopped') return;
  if (mixerState === 'paused') {
    timerRemaining = Number(sleepTimer.value) * 60000;
    updateMixerStatus();
    return;
  }
  startSleepTimer(Number(sleepTimer.value) * 60000);
  updateMixerStatus();
});

layerRows.forEach((row) => {
  const name = row.dataset.audioLayer;
  const toggle = row.querySelector('[data-layer-toggle]');
  const range = row.querySelector('[data-layer-volume]');
  const update = () => {
    const layer = layerState.get(name);
    if (layer) {
      if (!toggle.checked) layer.playing = false;
      setLayerGain(layer);
      if (layer.media && mixerState === 'playing' && toggle.checked && layer.media.paused) {
        startMediaLayer(layer).then((started) => {
          if (!started) updateMixerStatus(`The ${name} recording could not start.`);
          else updateMixerStatus();
        });
      } else if (layer.media && !toggle.checked) {
        layer.media.pause();
        layer.media.currentTime = 0;
      }
      if (name === 'tones' && mixerState === 'playing') {
        layer.playing = Boolean(toggle.checked && !layer.media);
        setLayerGain(layer);
      }
    }
    savePreferences();
    if (name === 'tones' && !layer?.media && toggle.checked && mixerState === 'playing' && !mixerTimerId) playMixerTone();
    if (name === 'tones' && !toggle.checked && mixerTimerId) {
      window.clearTimeout(mixerTimerId);
      mixerTimerId = 0;
      silenceVoices(activeMixerVoices);
    }
    updateMixerControls();
    updateActiveLayers();
  };
  toggle.addEventListener('change', update);
  range.addEventListener('input', update);
  const media = row.querySelector('audio[data-layer-audio]');
  if (!media?.getAttribute('src')) {
    toggle.disabled = true;
    range.disabled = true;
  }
});

window.addEventListener('pagehide', () => {
  stopMixer();
  if (audioContext && audioContext.state !== 'closed') audioContext.close();
});

function currentMood() {
  return document.documentElement.dataset.mood === 'dawn' ? 'dawn' : 'night';
}

function generateTargetPositions(mode, random = Math.random, scene = getSceneSize(), avoidPoints = []) {
  const zones = targetZones[mode];
  const fallback = fallbackTargets[mode];
  if (!zones || !fallback || !scene.width || !scene.height) return fallback ? fallback.map((target) => ({ ...target })) : [];
  const minDistance = Math.min(scene.width, scene.height) * 0.15;
  const avoidRadius = Math.min(scene.width, scene.height) * 0.14;
  const startCenter = { x: 0.28 * scene.width, y: 0.7 * scene.height };
  const blocked = [startCenter, ...avoidPoints];
  const order = zones.map((zone, index) => ({ zone, index }));
  for (let index = order.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [order[index], order[swapIndex]] = [order[swapIndex], order[index]];
  }
  const placed = [];
  for (const entry of order) {
    let candidate = null;
    for (let attempt = 0; attempt < 30; attempt += 1) {
      const { zone } = entry;
      const point = {
        x: zone.x[0] + random() * (zone.x[1] - zone.x[0]),
        y: zone.y[0] + random() * (zone.y[1] - zone.y[0]),
        region: zone.region,
      };
      const px = point.x * scene.width;
      const py = point.y * scene.height;
      const spacedFromTargets = placed.every((other) => Math.hypot((point.x - other.x) * scene.width, (point.y - other.y) * scene.height) >= minDistance);
      const spacedFromPip = blocked.every((other) => Math.hypot(px - other.x, py - other.y) >= avoidRadius);
      if (spacedFromTargets && spacedFromPip) {
        candidate = point;
        break;
      }
    }
    if (!candidate) return fallback.map((target) => ({ ...target }));
    placed.push(candidate);
  }
  return placed;
}

function getStarPosition(index) {
  return activeStarPositions[index];
}

function getButterflyPosition(index) {
  return activeButterflyPositions[index];
}

function setTargetPosition() {
  hiddenTargets.forEach((star, index) => {
    const target = getStarPosition(index);
    star.style.setProperty('--target-x', `${target.x * 100}%`);
    star.style.setProperty('--target-y', `${target.y * 100}%`);
  });
  butterflyTargets.forEach((butterfly, index) => {
    const target = getButterflyPosition(index);
    butterfly.style.setProperty('--target-x', `${target.x * 100}%`);
    butterfly.style.setProperty('--target-y', `${target.y * 100}%`);
  });
  updateTargetAvailability();
}

function updateTargetAvailability() {
  hiddenTargets.forEach((star, index) => {
    const collected = collectedStars.has(index);
    const available = discoveryMode === 'night' && searchActive && (collected || illuminatedStars.has(index));
    star.classList.toggle('is-lit', available && !collected);
    star.classList.toggle('is-collected', collected);
    star.disabled = !available;
    star.tabIndex = -1;
    star.setAttribute('aria-hidden', String(!available));
    star.setAttribute('aria-label', collected ? `Star ${index + 1} collected` : `Collect hidden star ${index + 1}`);
  });
  butterflyTargets.forEach((butterfly, index) => {
    const collected = collectedButterflies.has(index);
    const available = discoveryMode === 'day' && searchActive && (collected || nearbyButterflies.has(index));
    butterfly.classList.toggle('is-near', available && !collected);
    butterfly.classList.toggle('is-collected', collected);
    butterfly.disabled = !available;
    butterfly.tabIndex = -1;
    butterfly.setAttribute('aria-hidden', String(!available));
    butterfly.setAttribute('aria-label', collected ? `Butterfly ${index + 1} caught` : `Catch butterfly ${index + 1}`);
  });
  const nightSearch = discoveryMode === 'night' && searchActive;
  torchAimHandle.hidden = !nightSearch;
  torchAimHandle.disabled = !nightSearch;
  torchAimHandle.tabIndex = -1;
  torchAimHandle.setAttribute('aria-hidden', String(!nightSearch));
}

function updateDiscoveryStatus() {
  if (discoveryMode === 'night') {
    const count = collectedStars.size;
    if (count === hiddenTargets.length) {
      setTextStatus(discoveryStatus, `Stars found: ${count}/${hiddenTargets.length}. All five stars are home! Pip celebrates your lovely discovery.`);
      return;
    }
    const instruction = illuminatedStars.size
      ? 'A star is in the torchlight. Tap each glowing star to collect it.'
      : searchActive
        ? 'Drag Pip to explore, then drag the torch handle to sweep its light through the garden.'
        : 'Light up the garden to find five hidden stars.';
    setTextStatus(discoveryStatus, `Stars found: ${count}/${hiddenTargets.length}. ${instruction}`);
    return;
  }
  const butterflyCount = collectedButterflies.size;
  if (butterflyCount === butterflyTargets.length) {
    setTextStatus(discoveryStatus, `Butterflies found: ${butterflyCount}/${butterflyTargets.length}. All three butterflies are free! Pip celebrates your lovely discovery.`);
    return;
  }
  let message;
  if (discoveryNear && searchActive) {
    message = 'A butterfly is near Pip’s net! Tap it to catch it.';
  } else if (searchActive) {
    message = 'Drag Pip around the garden to bring the net close to each butterfly.';
  } else {
    message = 'Start the search, then touch and drag Pip around the garden. Tap each butterfly when it appears near the net.';
  }
  const activeArt = pipArts.find((art) => art.dataset.pipArt === discoveryMode);
  if (activeArt?.dataset.artError) message += ` Pip?s illustration could not load: ${activeArt.getAttribute('src')}.`;
  setTextStatus(discoveryStatus, `Butterflies found: ${butterflyCount}/${butterflyTargets.length}. ${message}`);
}

function activePipArt() {
  return pipArts.find((art) => art.dataset.pipArt === discoveryMode);
}

function getSceneSize() {
  const rect = gardenScene.getBoundingClientRect();
  return { width: rect.width, height: rect.height };
}

function getPipSize() {
  const scene = getSceneSize();
  const art = activePipArt();
  const rect = art?.getBoundingClientRect();
  const fallbackWidth = Math.min(scene.width * (window.matchMedia('(max-width: 680px)').matches ? 0.234 : 0.192), 126, scene.height * 0.7);
  const width = rect?.width || fallbackWidth;
  const height = rect?.height || width;
  return { width, height };
}

function applyPipPosition() {
  const scene = getSceneSize();
  if (!scene.width || !scene.height) return;
  const size = getPipSize();
  const centerX = Math.max(size.width / 2, Math.min(scene.width - size.width / 2, pipPosition.x * scene.width));
  const centerY = Math.max(size.height / 2, Math.min(scene.height - size.height / 2, pipPosition.y * scene.height));
  pipPosition = { x: centerX / scene.width, y: centerY / scene.height };
  gardenScene.style.setProperty('--pip-x', `${pipPosition.x * 100}%`);
  gardenScene.style.setProperty('--pip-y', `${pipPosition.y * 100}%`);
}

function resetDiscovery() {
  searchActive = false;
  targetDiscovered = false;
  discoveryNear = false;
  dragPointerId = null;
  aimPointerId = null;
  torchAiming = false;
  collectedStars.clear();
  illuminatedStars.clear();
  collectedButterflies.clear();
  nearbyButterflies.clear();
  torchAngle = -70 * Math.PI / 180;
  pipPosition = { x: 0.28, y: 0.7 };
  gardenScene.classList.remove('is-searching', 'is-near', 'is-discovered', 'is-dragging');
  gardenScene.classList.remove('is-aiming', 'has-all-stars', 'has-all-butterflies');
  gardenScene.style.removeProperty('--spot-x');
  gardenScene.style.removeProperty('--spot-y');
  gardenScene.style.removeProperty('--beam-origin-x');
  gardenScene.style.removeProperty('--beam-origin-y');
  gardenScene.style.removeProperty('--beam-length');
  gardenScene.style.removeProperty('--beam-width');
  gardenScene.style.removeProperty('--beam-angle');
  torchAimHandle.classList.remove('is-aiming');
  searchStart.disabled = false;
  searchStart.setAttribute('aria-pressed', 'false');
  searchStart.textContent = discoveryMode === 'day' ? 'Start butterfly search' : 'Light up the garden';
  applyPipPosition();
  setTargetPosition();
  updateTargetAvailability();
  updateDiscoveryStatus();
}

function startDiscoveryRound() {
  resetDiscovery();
  const scene = getSceneSize();
  if (!scene.width || !scene.height) return;
  const initialToolPoint = discoveryMode === 'day' ? netCatchPoint() : torchOrigin();
  if (discoveryMode === 'day') {
    activeButterflyPositions = generateTargetPositions('day', Math.random, scene, [initialToolPoint]);
  } else {
    activeStarPositions = generateTargetPositions('night', Math.random, scene, [initialToolPoint]);
  }
  setTargetPosition();
  searchActive = true;
  gardenScene.classList.add('is-searching');
  searchStart.disabled = true;
  searchStart.setAttribute('aria-pressed', 'true');
  searchStart.textContent = discoveryMode === 'day' ? 'Pip’s net is ready' : 'Torch lit — find five stars';
  if (discoveryMode === 'night') updateTorchBeam();
  setNearTarget(discoveryMode === 'day' ? netCatchPoint() : torchOrigin());
  updateTargetAvailability();
  updateDiscoveryStatus();
}

function updateDiscoveryTheme() {
  const nextMode = currentMood() === 'dawn' ? 'day' : 'night';
  const changed = discoveryMode !== nextMode;
  discoveryMode = nextMode;
  const isDay = discoveryMode === 'day';
  discoveryTitle.textContent = isDay ? 'Find a hidden butterfly' : 'Find a hidden star';
  discoveryInstructions.textContent = isDay
    ? 'Touch and drag Pip around the garden to search. When a butterfly appears near the net, tap it to catch it. Find all the butterflies to finish the round.'
    : 'Drag Pip around the garden to explore. Touch and drag the torch handle to aim its light in any direction. Reveal hidden stars with the beam, then tap each glowing star to collect it.';
  gardenScene.setAttribute('aria-label', isDay ? 'Daytime garden. Touch and drag Pip to bring the net close to butterflies.' : 'Nighttime garden. Drag Pip to explore, then drag the torch handle to aim its light.');
  gardenScene.dataset.mode = discoveryMode;
  gardenScene.classList.toggle('is-day', isDay);
  nightlight.classList.toggle('is-day', isDay);
  gardenScene.querySelector('svg')?.setAttribute('preserveAspectRatio', 'xMidYMid slice');
  if (changed) resetDiscovery();
  else {
    applyPipPosition();
    updateTargetAvailability();
    updateDiscoveryStatus();
  }
}

function torchOrigin() {
  const torch = pipArts.find((art) => art.dataset.pipArt === 'night');
  const sceneRect = gardenScene.getBoundingClientRect();
  const artRect = torch.getBoundingClientRect();
  return {
    x: artRect.left - sceneRect.left + artRect.width * 0.84,
    y: artRect.top - sceneRect.top + artRect.height * 0.14,
  };
}

function updateTorchBeam() {
  const scene = getSceneSize();
  const origin = torchOrigin();
  const beamLength = Math.min(scene.width * 0.78, 480);
  const beamWidth = Math.min(scene.height * 0.42, 160);
  gardenScene.style.setProperty('--spot-x', `${origin.x}px`);
  gardenScene.style.setProperty('--spot-y', `${origin.y}px`);
  gardenScene.style.setProperty('--beam-origin-x', `${origin.x}px`);
  gardenScene.style.setProperty('--beam-origin-y', `${origin.y}px`);
  gardenScene.style.setProperty('--torch-tip-x', `${origin.x}px`);
  gardenScene.style.setProperty('--torch-tip-y', `${origin.y}px`);
  gardenScene.style.setProperty('--beam-length', `${beamLength}px`);
  gardenScene.style.setProperty('--beam-width', `${beamWidth}px`);
  gardenScene.style.setProperty('--beam-angle', `${torchAngle * 180 / Math.PI}deg`);
}

function netCatchPoint() {
  const net = pipArts.find((art) => art.dataset.pipArt === 'day');
  const sceneRect = gardenScene.getBoundingClientRect();
  const artRect = net.getBoundingClientRect();
  return {
    x: artRect.left - sceneRect.left + artRect.width * 0.86,
    y: artRect.top - sceneRect.top + artRect.height * 0.25,
    width: sceneRect.width,
    height: sceneRect.height,
  };
}

function torchContainsStar(index) {
  const scene = getSceneSize();
  const origin = torchOrigin();
  const target = getStarPosition(index);
  const targetX = target.x * scene.width;
  const targetY = target.y * scene.height;
  const directionX = Math.cos(torchAngle);
  const directionY = Math.sin(torchAngle);
  const dx = targetX - origin.x;
  const dy = targetY - origin.y;
  const alongBeam = dx * directionX + dy * directionY;
  const acrossBeam = Math.abs(dx * directionY - dy * directionX);
  const beamLength = Math.min(scene.width * 0.78, 480);
  const beamWidth = Math.min(scene.height * 0.42, 160);
  const halfWidthAtTarget = (alongBeam / beamLength) * beamWidth / 2;
  return alongBeam >= 0 && alongBeam <= beamLength && acrossBeam <= halfWidthAtTarget + 8;
}

function setNearTarget(toolPoint) {
  if (!searchActive) return;
  if (discoveryMode === 'night') {
    const previousLighting = [...illuminatedStars].join(',');
    illuminatedStars.clear();
    activeStarPositions.forEach((_star, index) => {
      if (!collectedStars.has(index) && torchContainsStar(index)) illuminatedStars.add(index);
    });
    updateTargetAvailability();
    if (previousLighting !== [...illuminatedStars].join(',')) updateDiscoveryStatus();
    return;
  }
  if (targetDiscovered) return;
  const previousNearby = [...nearbyButterflies].join(',');
  nearbyButterflies.clear();
  const radius = Math.max(22, Math.min(toolPoint.width, toolPoint.height) * 0.065);
  activeButterflyPositions.forEach((target, index) => {
    if (collectedButterflies.has(index)) return;
    const targetX = target.x * toolPoint.width;
    const targetY = target.y * toolPoint.height;
    if (Math.hypot(toolPoint.x - targetX, toolPoint.y - targetY) <= radius) nearbyButterflies.add(index);
  });
  discoveryNear = nearbyButterflies.size > 0;
  const currentNearby = [...nearbyButterflies].join(',');
  if (currentNearby !== previousNearby) {
    gardenScene.classList.toggle('is-near', discoveryNear);
    updateTargetAvailability();
    updateDiscoveryStatus();
  }
}

function aimTorchAt(point) {
  if (!searchActive || discoveryMode !== 'night' || !torchAiming) return;
  const origin = torchOrigin();
  torchAngle = Math.atan2(point.y - origin.y, point.x - origin.x);
  updateTorchBeam();
  setNearTarget(origin);
}

function movePipTo(point) {
  if (!searchActive || targetDiscovered) return;
  const scene = getSceneSize();
  if (!scene.width || !scene.height) return;
  const size = getPipSize();
  const centerX = Math.max(size.width / 2, Math.min(scene.width - size.width / 2, point.x));
  const centerY = Math.max(size.height / 2, Math.min(scene.height - size.height / 2, point.y));
  pipPosition = { x: centerX / scene.width, y: centerY / scene.height };
  applyPipPosition();
  if (discoveryMode === 'night') updateTorchBeam();
  setNearTarget(discoveryMode === 'day' ? netCatchPoint() : torchOrigin());
}

function scenePoint(event) {
  const bounds = gardenScene.getBoundingClientRect();
  return {
    x: Math.max(0, Math.min(bounds.width, event.clientX - bounds.left)),
    y: Math.max(0, Math.min(bounds.height, event.clientY - bounds.top)),
    width: bounds.width,
    height: bounds.height,
  };
}

function collectStar(event) {
  const index = Number(event.currentTarget.dataset.starIndex);
  if (!searchActive || discoveryMode !== 'night' || collectedStars.has(index) || !illuminatedStars.has(index) || !torchContainsStar(index)) return;
  collectedStars.add(index);
  illuminatedStars.delete(index);
  const allStarsFound = collectedStars.size === hiddenTargets.length;
  if (allStarsFound) {
    hiddenStarDiscovered = true;
    syncLullabyProgress();
  }
  gardenScene.classList.toggle('has-all-stars', allStarsFound);
  updateTargetAvailability();
  updateDiscoveryStatus();
  ensureAudioContext().then((ready) => {
    if (ready && !siteMuted) createTone(1046.5 + collectedStars.size * 55, 0.52, masterGain, activeGameVoices, 0.075);
  });
}

function catchButterfly(event) {
  const index = Number(event.currentTarget.dataset.butterflyIndex);
  if (!searchActive || discoveryMode !== 'day' || !nearbyButterflies.has(index) || collectedButterflies.has(index)) return;
  nearbyButterflies.delete(index);
  collectedButterflies.add(index);
  targetDiscovered = collectedButterflies.size === butterflyTargets.length;
  if (targetDiscovered) {
    hiddenButterflyDiscovered = true;
    syncLullabyProgress();
  }
  discoveryNear = nearbyButterflies.size > 0;
  gardenScene.classList.toggle('is-near', discoveryNear);
  gardenScene.classList.toggle('has-all-butterflies', targetDiscovered);
  if (targetDiscovered) gardenScene.classList.add('is-discovered');
  updateTargetAvailability();
  updateDiscoveryStatus();
  ensureAudioContext().then((ready) => {
    if (ready && !siteMuted) createTone(880 + collectedButterflies.size * 55, 0.52, masterGain, activeGameVoices, 0.075);
  });
}

searchStart.addEventListener('click', startDiscoveryRound);

pipArts.forEach((art) => art.addEventListener('pointerdown', (event) => {
  if (!searchActive || art.dataset.pipArt !== discoveryMode || targetDiscovered) return;
  event.preventDefault();
  const sceneRect = gardenScene.getBoundingClientRect();
  const artRect = art.getBoundingClientRect();
  dragPointerId = event.pointerId;
  dragOffset = {
    x: event.clientX - (artRect.left + artRect.width / 2),
    y: event.clientY - (artRect.top + artRect.height / 2),
  };
  art.setPointerCapture(event.pointerId);
  gardenScene.classList.add('is-dragging');
  movePipTo({ x: event.clientX - sceneRect.left - dragOffset.x, y: event.clientY - sceneRect.top - dragOffset.y });
}));

gardenScene.addEventListener('pointermove', (event) => {
  if (event.pointerId !== dragPointerId) return;
  const sceneRect = gardenScene.getBoundingClientRect();
  movePipTo({ x: event.clientX - sceneRect.left - dragOffset.x, y: event.clientY - sceneRect.top - dragOffset.y });
});
for (const eventName of ['pointerup', 'pointercancel', 'lostpointercapture']) {
  gardenScene.addEventListener(eventName, (event) => {
    if (event.pointerId === dragPointerId) {
      dragPointerId = null;
      gardenScene.classList.remove('is-dragging');
    }
    if (event.pointerId === aimPointerId) stopTorchAiming(event.pointerId);
  });
}

function stopTorchAiming(pointerId) {
  if (pointerId !== aimPointerId) return;
  torchAiming = false;
  aimPointerId = null;
  torchAimHandle.classList.remove('is-aiming');
  gardenScene.classList.remove('is-aiming');
}

torchAimHandle.addEventListener('pointerdown', (event) => {
  if (!searchActive || discoveryMode !== 'night' || torchAimHandle.disabled) return;
  event.preventDefault();
  torchAiming = true;
  aimPointerId = event.pointerId;
  torchAimHandle.setPointerCapture(event.pointerId);
  torchAimHandle.classList.add('is-aiming');
  gardenScene.classList.add('is-aiming');
  aimTorchAt(scenePoint(event));
});
torchAimHandle.addEventListener('pointermove', (event) => {
  if (!torchAiming || event.pointerId !== aimPointerId) return;
  aimTorchAt(scenePoint(event));
});
for (const eventName of ['pointerup', 'pointercancel', 'lostpointercapture']) {
  torchAimHandle.addEventListener(eventName, (event) => stopTorchAiming(event.pointerId));
}
window.addEventListener('blur', () => {
  if (torchAiming) stopTorchAiming(aimPointerId);
});

hiddenTargets.forEach((star) => star.addEventListener('click', collectStar));
butterflyTargets.forEach((butterfly) => butterfly.addEventListener('click', catchButterfly));
replayDiscovery.addEventListener('click', startDiscoveryRound);
pipArts.forEach((art) => art.addEventListener('error', () => {
  art.dataset.artError = 'true';
  art.hidden = true;
  updateDiscoveryStatus();
}));
function updateDiscoveryGeometry() {
  applyPipPosition();
  if (!searchActive) return;
  if (discoveryMode === 'night') updateTorchBeam();
  setNearTarget(discoveryMode === 'day' ? netCatchPoint() : torchOrigin());
}
window.addEventListener('resize', updateDiscoveryGeometry);
if ('ResizeObserver' in window) new ResizeObserver(updateDiscoveryGeometry).observe(gardenScene);
updateDiscoveryTheme();
new MutationObserver(updateDiscoveryTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-mood'] });

function renderBubbles(freshId = 0) {
  bubbleList.replaceChildren();
  bubbles.forEach((bubble, index) => {
    const item = document.createElement('li');
    item.className = `lullaby-bubble${bubble.completed ? ' is-complete' : ''}${bubble.id === freshId ? ' is-new' : ''}${bubble.id === selectedBubbleId ? ' is-selected' : ''}`;
    item.dataset.bubbleId = String(bubble.id);
    item.style.setProperty('--bubble-size', `${90 + (bubble.id * 17) % 25}px`);
    item.style.setProperty('--bubble-start-x', `${(bubble.id * 7) % 13 - 6}px`);
    item.style.setProperty('--bubble-start-y', `${(bubble.id * 11) % 11 - 5}px`);
    item.style.setProperty('--bubble-delay', `${-(bubble.id % 5) * 0.63}s`);
    item.style.setProperty('--bubble-duration', `${5.2 + (bubble.id % 4) * 0.55}s`);
    const select = document.createElement('button');
    select.type = 'button';
    select.className = 'lullaby-bubble__select';
    select.setAttribute('aria-expanded', String(bubble.id === selectedBubbleId));
    select.setAttribute('aria-label', `Open wish ${index + 1}: ${bubble.text}${bubble.completed ? ', completed' : ''}`);
    const note = document.createElement('span');
    note.className = 'lullaby-bubble__text';
    note.textContent = bubble.text.length > 44 ? `${bubble.text.slice(0, 41).trimEnd()}…` : bubble.text;
    select.append(note);
    if (bubble.completed) {
      const checkmark = document.createElement('span');
      checkmark.className = 'lullaby-bubble__check';
      checkmark.setAttribute('aria-hidden', 'true');
      checkmark.textContent = '✓';
      select.append(checkmark);
    }
    select.addEventListener('click', () => {
      selectedBubbleId = bubble.id;
      dialogReturnBubbleId = bubble.id;
      bubbleDialogText.textContent = bubble.text;
      bubbleDialogText.hidden = false;
      bubbleDialogEditForm.hidden = true;
      bubbleDialogActions.hidden = false;
      bubbleDialogComplete.textContent = bubble.completed ? 'Mark as not done' : 'Mark as done';
      bubbleDialogComplete.setAttribute('aria-pressed', String(bubble.completed));
      bubbleDialogComplete.dataset.completed = String(bubble.completed);
      if (!bubbleDialog.open && typeof bubbleDialog.showModal === 'function') bubbleDialog.showModal();
      else bubbleDialog.setAttribute('open', '');
      renderBubbles();
    });
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'lullaby-bubble__remove';
    remove.textContent = '×';
    remove.setAttribute('aria-label', `Remove dream bubble ${index + 1}`);
    remove.addEventListener('click', () => {
      if (selectedBubbleId === bubble.id) closeBubbleDialog();
      bubbles = bubbles.filter((entry) => entry.id !== bubble.id);
      saveBubbles();
      setTextStatus(bubbleStatus, 'That bubble has drifted away.');
    });
    item.append(select, remove);
    bubbleList.append(item);
  });
  bubbleClear.disabled = !bubbles.length;
}

function saveBubbles(freshId = 0) {
  try {
    localStorage.setItem(bubbleStorageKey, JSON.stringify({
      version: 2,
      bubbles: bubbles.map(({ text, completed }) => ({ text, completed: Boolean(completed) })),
    }));
    setTextStatus(bubbleStatus, 'Your dream bubbles are saved only on this device.');
  } catch (error) {
    setTextStatus(bubbleStatus, 'This browser could not save the bubbles. They will stay here until you leave.');
    console.info('Could not save Lullaby Lab bubbles locally:', error);
  }
  renderBubbles(freshId);
}

try {
  const saved = JSON.parse(localStorage.getItem(bubbleStorageKey) || 'null');
  if ([1, 2].includes(saved?.version) && Array.isArray(saved.bubbles)) {
    bubbles = saved.bubbles
      .map((entry) => {
        const text = typeof entry === 'string' ? entry : entry?.text;
        if (typeof text !== 'string' || !text.trim()) return null;
        return {
          id: nextBubbleId++,
          text: text.trim().slice(0, 180),
          completed: saved.version === 2 && Boolean(entry?.completed),
        };
      })
      .filter(Boolean)
      .slice(-20);
  }
} catch (error) {
  setTextStatus(bubbleStatus, 'A saved bubble could not be read. You can still make a new one.');
  console.info('Could not read Lullaby Lab bubbles:', error);
}
renderBubbles();

function closeBubbleDialog() {
  if (bubbleDialog.open && typeof bubbleDialog.close === 'function') bubbleDialog.close();
  else bubbleDialog.removeAttribute('open');
  selectedBubbleId = 0;
  renderBubbles();
}

bubbleDialogClose.addEventListener('click', closeBubbleDialog);
bubbleDialog.addEventListener('click', (event) => {
  if (event.target === bubbleDialog) closeBubbleDialog();
});
bubbleDialog.addEventListener('close', () => {
  const returnId = dialogReturnBubbleId;
  dialogReturnBubbleId = 0;
  selectedBubbleId = 0;
  bubbleDialogText.hidden = false;
  bubbleDialogEditForm.hidden = true;
  bubbleDialogActions.hidden = false;
  renderBubbles();
  if (bubbles.some((bubble) => bubble.id === returnId)) {
    bubbleList.querySelector(`[data-bubble-id="${returnId}"] .lullaby-bubble__select`)?.focus();
  }
});
bubbleDialogDelete.addEventListener('click', () => {
  const id = selectedBubbleId;
  if (!id) return closeBubbleDialog();
  bubbles = bubbles.filter((bubble) => bubble.id !== id);
  closeBubbleDialog();
  saveBubbles();
  setTextStatus(bubbleStatus, 'That wish has been removed.');
});

bubbleDialogComplete.addEventListener('click', () => {
  const wish = bubbles.find((bubble) => bubble.id === selectedBubbleId);
  if (!wish) return;
  wish.completed = !wish.completed;
  bubbleDialogComplete.textContent = wish.completed ? 'Mark as not done' : 'Mark as done';
  bubbleDialogComplete.setAttribute('aria-pressed', String(wish.completed));
  bubbleDialogComplete.dataset.completed = String(wish.completed);
  saveBubbles();
  setTextStatus(bubbleStatus, wish.completed ? 'Wish marked as done.' : 'Wish marked as not done.');
});

bubbleDialogEditButton.addEventListener('click', () => {
  const wish = bubbles.find((bubble) => bubble.id === selectedBubbleId);
  if (!wish) return;
  bubbleDialogEditInput.value = wish.text;
  bubbleDialogText.hidden = true;
  bubbleDialogActions.hidden = true;
  bubbleDialogEditForm.hidden = false;
  bubbleDialogEditInput.focus();
});

bubbleDialogEditCancel.addEventListener('click', () => {
  bubbleDialogEditForm.hidden = true;
  bubbleDialogText.hidden = false;
  bubbleDialogActions.hidden = false;
  bubbleDialogEditButton.focus();
});

bubbleDialogEditForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const wish = bubbles.find((bubble) => bubble.id === selectedBubbleId);
  const text = bubbleDialogEditInput.value.trim().slice(0, 180);
  if (!wish || !text) {
    setTextStatus(bubbleStatus, 'Add a little wish before saving.');
    bubbleDialogEditInput.focus();
    return;
  }
  wish.text = text;
  bubbleDialogText.textContent = text;
  bubbleDialogEditForm.hidden = true;
  bubbleDialogText.hidden = false;
  bubbleDialogActions.hidden = false;
  saveBubbles();
  setTextStatus(bubbleStatus, 'Your wish has been updated.');
  bubbleDialogEditButton.focus();
});

document.querySelectorAll('[data-bubble-prompt]').forEach((button) => {
  button.addEventListener('click', () => {
    bubbleInput.value = button.dataset.bubblePrompt || '';
    bubbleInput.focus();
    bubbleInput.setSelectionRange(bubbleInput.value.length, bubbleInput.value.length);
  });
});

bubbleForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (creatingBubble) return;
  const text = bubbleInput.value.trim().slice(0, 180);
  if (!text) {
    setTextStatus(bubbleStatus, 'Write a little thought first, or choose a starter.');
    bubbleInput.focus();
    return;
  }
  const submittedAt = Date.now();
  creatingBubble = true;
  bubbleCreate.disabled = true;
  const bubble = { id: nextBubbleId++, text };
  bubbles.push(bubble);
  bubbles = bubbles.slice(-20);
  if (!bubbles.some((entry) => entry.id === selectedBubbleId)) selectedBubbleId = bubble.id;
  bubbleInput.value = '';
  saveBubbles(bubble.id);
  try {
    if (bubbleSound.checked) {
      const audioReady = await ensureAudioContext();
      silenceVoices(activeBubbleVoices);
      const played = audioReady && !siteMuted && bubbleGain && createTone(783.99, 0.32, bubbleGain, activeBubbleVoices, 0.065);
      const chimeStatus = !played
        ? siteMuted
          ? 'Your wish is saved. Shared sound is muted, so no chime played.'
          : 'Your wish is saved. The tiny chime could not play right now.'
        : 'Your wish is saved with a tiny chime.';
      setTextStatus(bubbleStatus, chimeStatus);
    }
  } finally {
    if (bubbleCreateResetTimer) window.clearTimeout(bubbleCreateResetTimer);
    bubbleCreateResetTimer = window.setTimeout(() => {
      bubbleCreateResetTimer = 0;
      creatingBubble = false;
      bubbleCreate.disabled = false;
    }, Math.max(0, 260 - (Date.now() - submittedAt)));
  }
});

bubbleClear.addEventListener('click', () => {
  closeBubbleDialog();
  bubbles = [];
  selectedBubbleId = 0;
  saveBubbles();
  setTextStatus(bubbleStatus, 'All your bubbles have drifted away.');
});

function updateGameControls() {
  const gameLocked = gamePlaying || gameStartPending || gameInputPending;
  gameStart.disabled = gameLocked;
  gameReplay.disabled = gameLocked || gamePattern.length === 0;
  gameButtons.forEach((button) => { button.disabled = gameLocked; });
  gameMute.textContent = gameMuted ? 'Unmute' : 'Mute';
  gameMute.setAttribute('aria-pressed', String(gameMuted));
}

function delay(milliseconds) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

function makeGamePattern(length) {
  const firstNotes = [0, 1, 2];
  for (let index = firstNotes.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [firstNotes[index], firstNotes[swapIndex]] = [firstNotes[swapIndex], firstNotes[index]];
  }
  return Array.from({ length }, (_, index) => index < firstNotes.length ? firstNotes[index] : Math.floor(Math.random() * noteFrequencies.length));
}

async function playPattern() {
  if (gamePlaying || gameStartPending || gameInputPending) return;
  gameStartPending = true;
  const runToken = ++gameToken;
  updateGameControls();
  if (!await ensureAudioContext()) {
    if (runToken !== gameToken) return;
    gameStartPending = false;
    updateGameControls();
    setTextStatus(gameStatus, 'Audio could not start, so the listening game cannot begin. Check browser audio settings and try again.');
    return;
  }
  if (runToken !== gameToken) return;
  gameStartPending = false;
  if (!gamePattern.length) gamePattern = makeGamePattern(gameRoundLength);
  gamePlaying = true;
  gameInputIndex = 0;
  updateGameControls();
  const mutedNotice = gameMuted || siteMuted;
  setTextStatus(gameStatus, mutedNotice
    ? `Sound is muted. Follow the ${gamePattern.length}-note pattern by watching Pip's note cues.`
    : `Listen to the ${gamePattern.length} notes, then echo them in order.`);
  for (const note of gamePattern) {
    if (runToken !== gameToken) return;
    const button = gameButtons[note];
    button.classList.add('is-active');
    button.setAttribute('aria-pressed', 'true');
    if (!gameMuted && !siteMuted && !playGameNote(note, 0.42)) {
      button.classList.remove('is-active');
      button.setAttribute('aria-pressed', 'false');
      gameToken += 1;
      gamePlaying = false;
      stopMusicBoxAnimation();
      updateGameControls();
      setTextStatus(gameStatus, 'The note audio is unavailable, so Pip cannot play the pattern right now.');
      return;
    }
    await delay(570);
    button.classList.remove('is-active');
    button.setAttribute('aria-pressed', 'false');
    await delay(190);
  }
  if (runToken !== gameToken) return;
  gamePlaying = false;
  stopMusicBoxAnimation();
  updateGameControls();
  setTextStatus(gameStatus, 'Your turn. Repeat the notes in the same order.');
}

gameStart.addEventListener('click', playPattern);
gameReplay.addEventListener('click', playPattern);
gameMute.addEventListener('click', () => {
  gameMuted = !gameMuted;
  if (gameMuted) {
    silenceVoices(activeGameVoices);
    stopMusicBoxAnimation();
  }
  if (gameGain && audioContext) gameGain.gain.setTargetAtTime(gameMuted || siteMuted ? 0 : 0.72, audioContext.currentTime, 0.035);
  updateGameControls();
  setTextStatus(gameStatus, gameMuted ? 'Game notes are muted. You can still follow the pattern.' : 'Game notes are on.');
});
gameRestart.addEventListener('click', () => {
  gameToken += 1;
  gameStartPending = false;
  gamePlaying = false;
  gameInputPending = false;
  if (gameInputTimer) window.clearTimeout(gameInputTimer);
  gameInputTimer = 0;
  gamePattern = [];
  gameInputIndex = 0;
  gameRoundLength = 3;
  silenceVoices(activeGameVoices);
  stopMusicBoxAnimation();
  gameButtons.forEach((button) => {
    button.classList.remove('is-active');
    button.setAttribute('aria-pressed', 'false');
  });
  updateGameControls();
  setTextStatus(gameStatus, 'A fresh three-note pattern is ready when you are.');
});

gameButtons.forEach((button) => {
  button.setAttribute('aria-pressed', 'false');
  button.addEventListener('click', async () => {
    if (gamePlaying || gameInputPending) return;
    gameInputPending = true;
    updateGameControls();
    const runToken = gameToken;
    if (!await ensureAudioContext()) {
      gameInputPending = false;
      updateGameControls();
      setTextStatus(gameStatus, 'Audio could not start. Check browser audio settings and try again.');
      return;
    }
    if (runToken !== gameToken || gamePlaying) {
      gameInputPending = false;
      updateGameControls();
      return;
    }
    const note = Number(button.dataset.note);
    const isAudition = !gamePattern.length;
    if (!gameMuted && !siteMuted) {
      silenceVoices(activeGameVoices);
      if (!playGameNote(note, 0.34)) {
        gameInputPending = false;
        updateGameControls();
        setTextStatus(gameStatus, 'The note audio is unavailable. Try listening again in a moment.');
        return;
      }
    }
    button.classList.add('is-active');
    button.setAttribute('aria-pressed', 'true');
    if (gameInputTimer) window.clearTimeout(gameInputTimer);
    gameInputTimer = window.setTimeout(() => {
      gameInputTimer = 0;
      gameInputPending = false;
      button.classList.remove('is-active');
      button.setAttribute('aria-pressed', 'false');
      updateGameControls();
    }, 360);
    if (note !== gamePattern[gameInputIndex]) {
      if (isAudition) {
        setTextStatus(gameStatus, gameMuted || siteMuted ? 'Sound is muted. Turn sound on to hear this note.' : `${button.textContent.trim()} played. Listen to a pattern whenever you are ready.`);
        return;
      }
      gameInputIndex = 0;
      setTextStatus(gameStatus, 'That was a lovely try. Replay the pattern and try again when you are ready.');
      return;
    }
    gameInputIndex += 1;
    if (gameInputIndex === gamePattern.length) {
      gamePattern = [];
      gameRoundLength = Math.min(10, gameRoundLength + 1);
      setTextStatus(gameStatus, 'A perfect little echo. Pip is proud of your listening. A new pattern will have one more note.');
    } else {
      setTextStatus(gameStatus, `${gameInputIndex} of ${gamePattern.length} notes echoed. Keep going.`);
    }
    updateGameControls();
  });
});

updateMixerControls();
updateGameControls();
