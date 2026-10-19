const celestialObjects = {
  lantern: {
    name: 'The Lantern Fox',
    description: 'A fox-shaped constellation that appears whenever a wandering dream needs a way home.',
    discovery: 'Its tail points toward the pillow where a lost dream is waiting.',
  },
  sail: {
    name: 'The Moon-Sail',
    description: 'Three bright stars make a tiny boat that drifts across the quietest part of the sky.',
    discovery: 'On clear nights, it carries wishes from one sleepy window to another.',
  },
  whale: {
    name: 'The Cloud Whale',
    description: 'A gentle giant swims through the high clouds, gathering silver mist in its wake.',
    discovery: 'Its song is so low that only sleeping flowers can hear it.',
  },
  garden: {
    name: 'The Dreaming Garden',
    description: 'This star cluster marks a hidden garden where imaginary creatures leave their dreams to bloom.',
    discovery: 'A new flower appears there each time someone remembers a kind dream.',
  },
  bell: {
    name: 'The Pillow Bell',
    description: 'A little bell of stars rings softly above the nursery rooftops at bedtime.',
    discovery: 'It never makes a sound, but every cloud nearby begins to yawn.',
  },
};

const objectButtons = [...document.querySelectorAll('.atlas-object')];
const objectName = document.querySelector('#atlasObjectName');
const description = document.querySelector('#atlasDescription');
const discovery = document.querySelector('#atlasDiscovery');
const discoverButton = document.querySelector('#atlasDiscover');
const discoveryStatus = document.querySelector('#atlasStatus');
const journalList = document.querySelector('#atlasJournalList');
const countLabel = document.querySelector('#atlasCount');
const journalCount = document.querySelector('#atlasJournalCount');
const discovered = new Set();
const atlasStorageKey = 'dear-pip-dream-atlas-v1';
let puzzleComplete = false;
let atlasProgressChangeVersion = 0;
let selectedObject = null;

function atlasProgressSnapshot() {
  return { version: 1, discovered: [...discovered], puzzleComplete };
}

function saveAtlasProgress() {
  const progress = atlasProgressSnapshot();
  atlasProgressChangeVersion += 1;
  try {
    localStorage.setItem(atlasStorageKey, JSON.stringify(progress));
  } catch (error) {
    discoveryStatus.textContent = 'Progress is noted for this visit; browser storage is unavailable.';
    console.error('Could not save this device’s Dream Atlas notes:', error);
  }
  window.DearPipProgress?.save('atlas', progress).catch((error) => {
    console.error('Could not sync Dream Atlas activity progress:', error);
  });
}
function renderDiscoveryJournal() {
  journalList.replaceChildren();
  [...discovered].forEach((id) => {
    const note = document.createElement('li');
    note.textContent = celestialObjects[id].name;
    journalList.append(note);
  });
  if (!discovered.size) {
    const emptyNote = document.createElement('li');
    emptyNote.className = 'atlas-journal__empty';
    emptyNote.textContent = 'Your discoveries will gather here.';
    journalList.append(emptyNote);
  }
  countLabel.textContent = String(discovered.size);
  journalCount.textContent = String(discovered.size);
}

try {
  const saved = JSON.parse(localStorage.getItem(atlasStorageKey) || 'null');
  if (saved?.version === 1 && Array.isArray(saved.discovered)) {
    saved.discovered.forEach((id) => {
      if (Object.hasOwn(celestialObjects, id)) discovered.add(id);
    });
    puzzleComplete = saved.puzzleComplete === true;
  }
} catch (error) {
  console.error('Could not read this device’s Dream Atlas notes:', error);
}
renderDiscoveryJournal();

objectButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const object = celestialObjects[button.dataset.object];
    if (!object) return;
    selectedObject = button.dataset.object;

    objectButtons.forEach((item) => {
      const isSelected = item === button;
      item.setAttribute('aria-pressed', String(isSelected));
      item.classList.toggle('is-selected', isSelected);
    });

    objectName.textContent = object.name;
    description.textContent = object.description;
    discovery.textContent = object.discovery;
    discoverButton.disabled = discovered.has(selectedObject);
    discoverButton.textContent = discovered.has(selectedObject) ? 'Already discovered' : 'Discover this light';
    discoveryStatus.textContent = discovered.has(selectedObject)
      ? 'This little light is already in your field notes.'
      : '';
  });
});

discoverButton.addEventListener('click', () => {
  if (!selectedObject) return;
  const object = celestialObjects[selectedObject];
  if (!object || discovered.has(selectedObject)) return;

  window.DearPipSounds?.play('constellation-discover');
  discovered.add(selectedObject);
  renderDiscoveryJournal();
  saveAtlasProgress();
  discoverButton.textContent = 'Already discovered';
  discoverButton.disabled = true;
  discoveryStatus.textContent = `${object.name} added to your field notes.`;
});

const gameStars = [...document.querySelectorAll('.atlas-game__star')];
const game = document.querySelector('.atlas-game');
const gameMessage = document.querySelector('#atlasGameMessage');
let nextStar = 1;

gameStars.forEach((button) => {
  button.addEventListener('click', () => {
    const step = Number(button.dataset.step);
    if (game.classList.contains('is-complete')) return;

    if (step !== nextStar) {
      nextStar = 1;
      gameStars.forEach((star) => star.classList.remove('is-connected'));
      game.classList.remove('has-progress');
      gameMessage.textContent = 'Oops, the stars got a little tangled. Begin again with star 1.';
      if (step === 1) {
        button.classList.add('is-connected');
        game.classList.add('has-progress');
        nextStar = 2;
      }
      return;
    }

    button.classList.add('is-connected');
    game.classList.add('has-progress');
    nextStar += 1;
    if (nextStar > gameStars.length) {
      game.classList.add('is-complete');
      puzzleComplete = true;
      saveAtlasProgress();
      gameMessage.textContent = 'You found it! The Sleepy Fox is shining in the sky.';
      window.DearPipSounds?.play('constellation-discover');
    } else {
      gameMessage.textContent = `Star ${step} connected. Now find star ${nextStar}.`;
    }
  });
});

document.querySelector('#atlasGameReset').addEventListener('click', () => {
  nextStar = 1;
  game.classList.remove('has-progress', 'is-complete');
  gameStars.forEach((star) => star.classList.remove('is-connected'));
  gameMessage.textContent = 'Constellation reset. Tap 1, then 2, 3, and 4 to connect the stars.';
  gameStars[0].focus({ preventScroll: true });
});

if (window.DearPipProgress) {
  const versionAtLoad = atlasProgressChangeVersion;
  window.DearPipProgress.load('atlas', atlasProgressSnapshot()).then(({ data }) => {
    const remote = data || atlasProgressSnapshot();
    if (atlasProgressChangeVersion !== versionAtLoad) {
      remote.discovered = [...new Set([...remote.discovered, ...discovered])];
      remote.puzzleComplete ||= puzzleComplete;
    }
    discovered.clear();
    remote.discovered.forEach((id) => { if (Object.hasOwn(celestialObjects, id)) discovered.add(id); });
    puzzleComplete = remote.puzzleComplete === true;
    try {
      localStorage.setItem(atlasStorageKey, JSON.stringify(atlasProgressSnapshot()));
    } catch (_error) {
      // PostgreSQL remains the primary copy when browser storage is unavailable.
    }
    renderDiscoveryJournal();
    objectButtons.forEach((button) => {
      if (discovered.has(button.dataset.object)) button.classList.add('is-discovered');
    });
    if (puzzleComplete) {
      game.classList.add('has-progress', 'is-complete');
      gameStars.forEach((star) => star.classList.add('is-connected'));
      gameMessage.textContent = 'You found it! The Sleepy Fox is shining in the sky.';
    }
    if (atlasProgressChangeVersion !== versionAtLoad) saveAtlasProgress();
  });
}

const pipCanvas = document.querySelector('#atlasPipCanvas');
const pipButton = document.querySelector('#atlasPipButton');
const pipEyes = document.querySelectorAll('.atlas-companion .pip-eye');
const pipToast = document.querySelector('#atlasToast');
const pipAnimationName = 'Pip In Action 2';
let pipRive;
let pipAnimationPending = false;
let pipToastTimer;

pipButton.addEventListener('click', () => {
  if (!pipRive) {
    pipAnimationPending = true;
  } else if (pipRive.animationNames.includes(pipAnimationName)) {
    pipRive.play(pipAnimationName);
  }

  pipToast.textContent = 'Pip says: every star has a story! ✦';
  pipToast.classList.add('is-visible');
  window.clearTimeout(pipToastTimer);
  pipToastTimer = window.setTimeout(() => pipToast.classList.remove('is-visible'), 2400);
});

pipButton.addEventListener('pointermove', (event) => {
  if (event.pointerType === 'touch') return;
  pipEyes.forEach((eye) => {
    const pupil = eye.querySelector('.pip-pupil');
    if (!pupil) return;

    const rect = eye.getBoundingClientRect();
    const dx = event.clientX - (rect.left + rect.width / 2);
    const dy = event.clientY - (rect.top + rect.height / 2);
    const angle = Math.atan2(dy, dx);
    const distance = Math.min(4, Math.hypot(dx, dy) / 12);
    pupil.style.transform = `translate(${Math.cos(angle) * distance}px, ${Math.sin(angle) * distance}px)`;
  });
});

pipButton.addEventListener('pointerleave', () => {
  pipEyes.forEach((eye) => {
    const pupil = eye.querySelector('.pip-pupil');
    if (pupil) pupil.style.transform = 'translate(0, 0)';
  });
});

if (pipCanvas && window.rive) {
  pipRive = new rive.Rive({
    src: 'assets/pip-body.riv',
    canvas: pipCanvas,
    autoplay: false,
    animations: [pipAnimationName],
    layout: new rive.Layout({
      fit: rive.Fit.Contain,
      alignment: rive.Alignment.Center,
    }),
    onLoad: () => {
      pipRive.resizeDrawingSurfaceToCanvas();
      if (!pipRive.animationNames.includes(pipAnimationName)) {
        console.error(`Rive animation "${pipAnimationName}" was not found. Available animations:`, pipRive.animationNames);
      } else if (pipAnimationPending) {
        pipAnimationPending = false;
        pipRive.play(pipAnimationName);
      }
    },
    onLoadError: (error) => {
      console.error('Rive failed to load:', error);
    },
  });

  window.addEventListener('resize', () => pipRive.resizeDrawingSurfaceToCanvas());
} else if (pipCanvas) {
  console.error('Rive runtime did not load; Pip’s animation is unavailable.');
}
