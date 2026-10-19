const bubbleStorageKey = 'dear-pip-lullaby-bubbles-v1';
const playButton = document.querySelector('#lullabyPlay');
const muteButton = document.querySelector('#lullabyMute');
const volume = document.querySelector('#lullabyVolume');
const audioStatus = document.querySelector('#lullabyStatus');
const noteFrequencies = [261.63, 329.63, 392];
let audioContext = null;
let masterGain = null;
let isMuted = false;
let isPlaying = false;
let melodyTimer = 0;
let melodyStep = 0;

function setAudioStatus(message) {
  audioStatus.textContent = message;
}

function playNote(frequency, duration = 1.1) {
  if (!audioContext || !masterGain || audioContext.state !== 'running') return;
  const now = audioContext.currentTime;
  const noteGain = audioContext.createGain();
  const tone = audioContext.createOscillator();
  tone.type = 'sine';
  tone.frequency.value = frequency;
  noteGain.gain.setValueAtTime(0.0001, now);
  noteGain.gain.exponentialRampToValueAtTime(0.16, now + 0.035);
  noteGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  tone.connect(noteGain);
  noteGain.connect(masterGain);
  tone.start(now);
  tone.stop(now + duration + 0.03);
}

function scheduleMelody() {
  if (!isPlaying) return;
  const notes = [0, 2, 1, 2, 0, 1];
  playNote(noteFrequencies[notes[melodyStep % notes.length]], 1.35);
  melodyStep += 1;
  melodyTimer = window.setTimeout(scheduleMelody, 1800);
}

function updateAudioControls() {
  playButton.textContent = isPlaying ? 'Pause the music box' : 'Start the music box';
  muteButton.textContent = isMuted ? 'Unmute' : 'Mute';
  muteButton.setAttribute('aria-pressed', String(isMuted));
  muteButton.disabled = !audioContext;
  volume.disabled = !audioContext;
}

async function startAudio() {
  const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextConstructor) {
    setAudioStatus('This browser does not support Web Audio. The other Lullaby Lab activities still work.');
    return false;
  }
  try {
    if (!audioContext) {
      audioContext = new AudioContextConstructor();
      masterGain = audioContext.createGain();
      masterGain.gain.value = Number(volume.value);
      masterGain.connect(audioContext.destination);
    }
    await audioContext.resume();
    return true;
  } catch (error) {
    setAudioStatus('The music box could not start. Check your browser audio settings and try again.');
    console.error('Could not start the Lullaby Lab audio:', error);
    return false;
  }
}

playButton.addEventListener('click', async () => {
  if (isPlaying) {
    isPlaying = false;
    window.clearTimeout(melodyTimer);
    setAudioStatus('The music box is paused.');
    updateAudioControls();
    return;
  }
  if (!await startAudio()) return;
  isPlaying = true;
  scheduleMelody();
  setAudioStatus('A gentle music-box pattern is playing. Use pause or volume whenever you like.');
  updateAudioControls();
});

muteButton.addEventListener('click', () => {
  isMuted = !isMuted;
  if (masterGain && audioContext) masterGain.gain.setTargetAtTime(isMuted ? 0 : Number(volume.value), audioContext.currentTime, 0.04);
  updateAudioControls();
  setAudioStatus(isMuted ? 'The music box is muted.' : isPlaying ? 'The music box is playing.' : 'Sound is ready when you are.');
});

volume.addEventListener('input', () => {
  if (masterGain && audioContext && !isMuted) {
    masterGain.gain.setTargetAtTime(Number(volume.value), audioContext.currentTime, 0.04);
  }
});

window.addEventListener('pagehide', () => {
  isPlaying = false;
  window.clearTimeout(melodyTimer);
  if (audioContext && audioContext.state !== 'closed') audioContext.close();
});

const nightlight = document.querySelector('#lullabyNightlight');
const revealButton = document.querySelector('#lullabyReveal');
nightlight.addEventListener('pointermove', (event) => {
  if (event.pointerType === 'touch') return;
  const bounds = nightlight.getBoundingClientRect();
  nightlight.style.setProperty('--light-x', `${event.clientX - bounds.left}px`);
  nightlight.style.setProperty('--light-y', `${event.clientY - bounds.top}px`);
});
revealButton.addEventListener('click', () => {
  const active = revealButton.getAttribute('aria-pressed') !== 'true';
  if (active && !isPlaying) window.DearPipSounds?.play('nightlight-reveal');
  revealButton.setAttribute('aria-pressed', String(active));
  nightlight.classList.toggle('is-lit', active);
  revealButton.textContent = active ? 'Turn off the nightlight' : 'Turn on the nightlight';
});

const bubbleForm = document.querySelector('#dreamBubbleForm');
const bubbleInput = document.querySelector('#dreamBubbleInput');
const bubbleList = document.querySelector('#dreamBubbleList');
const bubbleStatus = document.querySelector('#dreamBubbleStatus');
let bubbles = [];
const deletedBubbles = new Set();
let bubbleProgressReady = false;
let bubbleProgressVersion = 0;

function renderBubbles() {
  bubbleList.replaceChildren();
  bubbles.forEach((text, index) => {
    const item = document.createElement('li');
    const note = document.createElement('p');
    note.textContent = text;
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.textContent = 'Let this bubble go';
    remove.setAttribute('aria-label', `Remove saved dream bubble ${index + 1}`);
    remove.addEventListener('click', () => {
      const [removed] = bubbles.splice(index, 1);
      if (removed) deletedBubbles.add(removed);
      saveBubbles();
    });
    item.append(note, remove);
    bubbleList.append(item);
  });
}

function saveBubbles() {
  bubbleProgressVersion += 1;
  try {
    localStorage.setItem(bubbleStorageKey, JSON.stringify({ version: 1, bubbles, deletedBubbles: [...deletedBubbles] }));
    bubbleStatus.textContent = 'Your dream bubbles are saved on this device.';
  } catch (error) {
    bubbleStatus.textContent = 'This browser could not save the bubbles. They will stay here until you leave.';
    console.error('Could not save Lullaby Lab dream bubbles:', error);
  }
  renderBubbles();
  if (bubbleProgressReady && window.DearPipProgress) {
    window.DearPipProgress.save('lullaby', { version: 1, bubbles: [...bubbles], deletedBubbles: [...deletedBubbles] }).then(() => {
      bubbleStatus.textContent = 'Your dream bubbles are saved to this visitor profile.';
    }).catch((error) => {
      bubbleStatus.textContent = 'Your notes remain on this device; online sync is unavailable.';
      console.error('Could not sync Lullaby Lab dream bubbles:', error);
    });
  }
}

try {
  const saved = JSON.parse(localStorage.getItem(bubbleStorageKey) || 'null');
  if (saved?.version === 1 && Array.isArray(saved.bubbles)) {
    bubbles = saved.bubbles.filter((text) => typeof text === 'string' && text.trim() && text.length <= 240).slice(-20);
    if (Array.isArray(saved.deletedBubbles)) saved.deletedBubbles.filter((text) => typeof text === 'string' && text.trim() && text.length <= 240).forEach((text) => deletedBubbles.add(text.trim()));
    bubbles = bubbles.filter((text) => !deletedBubbles.has(text));
  }
} catch (error) {
  bubbleStatus.textContent = 'A saved bubble could not be read; the original note is left untouched.';
  console.error('Could not read Lullaby Lab dream bubbles:', error);
}
renderBubbles();

if (window.DearPipProgress) {
  const versionAtLoad = bubbleProgressVersion;
  window.DearPipProgress.load('lullaby', { version: 1, bubbles: [...bubbles], deletedBubbles: [...deletedBubbles] }).then(({ data, persistent }) => {
    bubbleProgressReady = true;
    if (bubbleProgressVersion === versionAtLoad && Array.isArray(data?.bubbles)) {
      bubbles = data.bubbles;
      deletedBubbles.clear();
      (data.deletedBubbles || []).forEach((text) => deletedBubbles.add(text));
      try {
        localStorage.setItem(bubbleStorageKey, JSON.stringify({ version: 1, bubbles, deletedBubbles: [...deletedBubbles] }));
      } catch (_error) {
        // The PostgreSQL copy remains available when browser storage is blocked.
      }
      renderBubbles();
    } else if (bubbleProgressVersion !== versionAtLoad) {
      const currentDeleted = [...deletedBubbles];
      deletedBubbles.clear();
      [...(data?.deletedBubbles || []), ...currentDeleted].forEach((text) => deletedBubbles.add(text));
      const removed = new Set(deletedBubbles);
      bubbles = [...new Set([...(data?.bubbles || []), ...bubbles])].filter((text) => !removed.has(text)).slice(-20);
      saveBubbles();
    }
    if (persistent && !bubbles.length) bubbleStatus.textContent = 'Your dream bubbles will sync to this visitor profile when saved.';
  });
}

bubbleForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const text = bubbleInput.value.trim();
  if (!text) {
    bubbleInput.focus();
    return;
  }
  bubbles.push(text.slice(0, 240));
  deletedBubbles.delete(text.slice(0, 240));
  bubbles = bubbles.slice(-20);
  bubbleInput.value = '';
  saveBubbles();
});

const gameButtons = [...document.querySelectorAll('.lullaby-note')];
const gameStatus = document.querySelector('#lullabyGameStatus');
const gameStart = document.querySelector('#lullabyGameStart');
let notePattern = [];
let noteIndex = 0;
let gameListening = false;

gameStart.addEventListener('click', async () => {
  if (!await startAudio()) {
    gameStatus.textContent = 'Audio is unavailable, so the listening game cannot start in this browser.';
    return;
  }
  notePattern = Array.from({ length: 3 }, () => Math.floor(Math.random() * noteFrequencies.length));
  noteIndex = 0;
  gameListening = true;
  gameStatus.textContent = 'Listen to the three notes, then repeat them.';
  gameButtons.forEach((button) => { button.disabled = true; });
  for (const note of notePattern) {
    if (!gameListening) break;
    playNote(noteFrequencies[note], 0.75);
    await new Promise((resolve) => window.setTimeout(resolve, 1000));
  }
  gameListening = false;
  gameButtons.forEach((button) => { button.disabled = false; });
  gameStatus.textContent = 'Your turn: repeat the three notes in the same order.';
});

gameButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const note = Number(button.dataset.note);
    playNote(noteFrequencies[note]);
    if (!notePattern.length || gameListening) return;
    if (note !== notePattern[noteIndex]) {
      noteIndex = 0;
      gameStatus.textContent = 'Not quite. Listen to the pattern again and give it another try.';
      return;
    }
    noteIndex += 1;
    if (noteIndex === notePattern.length) {
      notePattern = [];
      gameStatus.textContent = 'A perfect little echo. Pip is proud of your listening.';
      if (!isPlaying) window.DearPipSounds?.play('game-win', 1.2);
    } else {
      gameStatus.textContent = `${noteIndex} of 3 notes echoed. Keep going.`;
    }
  });
});
