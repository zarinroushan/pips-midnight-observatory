(() => {
  const preferenceKey = 'dear-pip-sound-effects-v1';
  const ambienceVolume = 0.12; // Gentle master level; adjust this value after listening.
  const ambienceFadeMs = 2500;
  const effectNotes = {
    'curtain-open': [523.25, 659.25, 783.99],
    'portal-open': [392, 523.25, 783.99],
    'map-arrival': [659.25, 783.99, 987.77],
    'portal-select': [440, 587.33],
    'star-collect': [783.99, 1046.5],
    'butterfly-collect': [659.25, 880, 1174.66],
    'theme-toggle': [587.33, 783.99],
    'story-page': [523.25, 392],
    'constellation-discover': [659.25, 880, 1046.5],
    'garden-plant': [392, 523.25],
    'garden-water': [587.33, 783.99],
    'garden-harvest': [783.99, 987.77, 1174.66],
    'workshop-open': [440, 659.25, 880],
    'nightlight-reveal': [523.25, 783.99, 1046.5],
    secret: [880, 1174.66],
    'game-win': [659.25, 783.99, 1046.5],
    'pip-hello': [523.25, 659.25],
  };
  let enabled = false;
  let queuedEffect = null;
  let audioContext = null;
  let masterGain = null;
  let lastEffectAt = 0;
  let ambienceTracks = null;
  let ambienceMood = document.documentElement.dataset.mood || document.body?.dataset.mood || 'night';
  let ambienceFadeFrame = 0;
  const pendingAmbiencePlays = new WeakSet();

  try {
    const makeAmbienceTrack = (file) => {
      const track = new Audio(new URL(`assets/${file}`, document.baseURI).href);
      track.loop = true;
      track.preload = 'auto';
      track.volume = 0;
      return track;
    };
    ambienceTracks = {
      dawn: makeAmbienceTrack('day-ambience.mp3'),
      night: makeAmbienceTrack('night-ambience.mp3'),
    };
  } catch (error) {
    console.info('Ambient audio is unavailable in this browser:', error);
  }

  function stopAmbience() {
    if (ambienceFadeFrame) cancelAnimationFrame(ambienceFadeFrame);
    ambienceFadeFrame = 0;
    if (!ambienceTracks) return;
    Object.values(ambienceTracks).forEach((track) => {
      track.volume = 0;
      track.pause();
    });
  }

  function ensureAmbiencePlaying(track) {
    if (!enabled || !track || !track.paused || pendingAmbiencePlays.has(track)) return;
    pendingAmbiencePlays.add(track);
    try {
      const playRequest = track.play();
      if (playRequest && typeof playRequest.then === 'function') {
        playRequest.then(() => {
          if (!enabled) {
            track.volume = 0;
            track.pause();
          }
        }).catch((error) => {
          console.info('Ambience playback is waiting for user interaction:', error);
        }).finally(() => pendingAmbiencePlays.delete(track));
      } else {
        pendingAmbiencePlays.delete(track);
      }
    } catch (error) {
      pendingAmbiencePlays.delete(track);
      console.info('Ambience playback is waiting for user interaction:', error);
    }
  }

  function fadeAmbienceToMood() {
    if (!ambienceTracks) return;
    if (!enabled) {
      stopAmbience();
      return;
    }

    const incoming = ambienceTracks[ambienceMood] || ambienceTracks.night;
    const outgoing = Object.values(ambienceTracks).find((track) => track !== incoming);
    ensureAmbiencePlaying(incoming);

    if (ambienceFadeFrame) cancelAnimationFrame(ambienceFadeFrame);
    const startLevels = [incoming.volume, outgoing.volume];
    const startedAt = performance.now();
    const animate = (now) => {
      if (!enabled) {
        stopAmbience();
        return;
      }
      const progress = Math.min(1, (now - startedAt) / ambienceFadeMs);
      const eased = progress * progress * (3 - 2 * progress);
      incoming.volume = startLevels[0] + (ambienceVolume - startLevels[0]) * eased;
      outgoing.volume = startLevels[1] * (1 - eased);
      if (progress < 1) {
        ambienceFadeFrame = requestAnimationFrame(animate);
      } else {
        ambienceFadeFrame = 0;
        outgoing.volume = 0;
        outgoing.pause();
      }
    };
    ambienceFadeFrame = requestAnimationFrame(animate);
  }

  function setAmbienceTheme(mood) {
    ambienceMood = mood === 'dawn' ? 'dawn' : 'night';
    fadeAmbienceToMood();
  }

  try {
    enabled = localStorage.getItem(preferenceKey) === 'on';
  } catch (error) {
    console.error('Could not read the sound-effects preference:', error);
  }

  function updateButton(button) {
    const label = enabled ? 'Sound on' : 'Sound off';
    button.setAttribute('aria-pressed', String(enabled));
    button.setAttribute('aria-label', enabled ? 'Turn sound effects off' : 'Turn sound effects on');
    button.title = enabled ? 'Turn sound effects off' : 'Turn sound effects on';
    const text = button.querySelector('[data-sound-label], span');
    if (text) text.textContent = label;
    else button.textContent = enabled ? '♫ Sound on' : '♫ Sound off';
  }

  function createControl() {
    let button = document.querySelector('#soundToggle');
    if (!button) {
      button = document.createElement('button');
      button.type = 'button';
      button.className = 'sound-toggle room-sound-toggle';
      button.append(document.createTextNode('♫ '));
      const label = document.createElement('span');
      label.dataset.soundLabel = '';
      button.append(label);
      const header = document.querySelector('header');
      if (header) header.append(button);
    }
    updateButton(button);
    button.addEventListener('click', () => {
      enabled = !enabled;
      try {
        localStorage.setItem(preferenceKey, enabled ? 'on' : 'off');
      } catch (error) {
        console.error('Could not save the sound-effects preference:', error);
      }
      updateButton(button);
      fadeAmbienceToMood();
      if (enabled && queuedEffect) {
        const cue = queuedEffect;
        queuedEffect = null;
        play(cue);
      }
    });
  }

  function ensureAudio() {
    const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextConstructor) return null;
    if (!audioContext) {
      try {
        audioContext = new AudioContextConstructor();
        masterGain = audioContext.createGain();
        masterGain.gain.value = 0.16;
        masterGain.connect(audioContext.destination);
      } catch (error) {
        console.error('Could not initialize sound effects:', error);
        return null;
      }
    }
    return audioContext;
  }

  function scheduleEffect(name, offset = 0) {
    const notes = effectNotes[name];
    if (!notes || !enabled) return false;
    const context = ensureAudio();
    if (!context) return false;
    const start = () => {
      if (!enabled || context.state !== 'running') return;
      const firstTime = context.currentTime + offset;
      notes.forEach((frequency, index) => {
        const at = firstTime + index * 0.105;
        const oscillator = context.createOscillator();
        const envelope = context.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(frequency, at);
        envelope.gain.setValueAtTime(0.0001, at);
        envelope.gain.exponentialRampToValueAtTime(0.12, at + 0.018);
        envelope.gain.exponentialRampToValueAtTime(0.0001, at + 0.42);
        oscillator.connect(envelope);
        envelope.connect(masterGain);
        oscillator.start(at);
        oscillator.stop(at + 0.45);
      });
    };

    if (context.state === 'running') {
      start();
    } else {
      context.resume().then(start).catch((error) => {
        console.error('Could not resume sound effects:', error);
      });
    }
    return true;
  }

  function play(name, delay = 0) {
    if (!enabled || !Object.hasOwn(effectNotes, name)) return false;
    const now = performance.now();
    if (now - lastEffectAt < 90) return false;
    lastEffectAt = now;

    if (queuedEffect) {
      const cue = queuedEffect;
      queuedEffect = null;
      scheduleEffect(cue);
      return scheduleEffect(name, 0.38 + delay);
    }
    return scheduleEffect(name, delay);
  }

  function queue(name) {
    if (Object.hasOwn(effectNotes, name)) queuedEffect = name;
  }

  createControl();
  window.DearPipSounds = Object.freeze({ play, queue, isEnabled: () => enabled, setAmbienceTheme });
  if (enabled) fadeAmbienceToMood();
  if (ambienceTracks) {
    const retryAmbience = () => {
      if (enabled) fadeAmbienceToMood();
    };
    window.addEventListener('pointerdown', retryAmbience, { once: true });
    window.addEventListener('keydown', retryAmbience, { once: true });
  }
  window.addEventListener('pagehide', () => {
    stopAmbience();
    if (audioContext && audioContext.state !== 'closed') audioContext.close();
  });
})();
