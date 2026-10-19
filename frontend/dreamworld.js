const locations = {
  workshop: {
    name: "Pip's Workshop",
    description: 'A little workshop full of moon gears, curious inventions, and half-finished ideas.',
    opening: 'One real project is on the shelf, with more verified project notes to come.',
    href: 'workshop.html',
  },
  garden: {
    name: 'The Dream Garden',
    description: 'An enchanted patch where imaginary creatures leave tiny dreams to discover.',
    opening: 'Plant a little dream, meet a garden friend, and leave Pip a note.',
    href: 'dream-garden.html',
  },
  atlas: {
    name: 'The Dream Atlas',
    description: 'A moonlit observatory where dream routes are charted between faraway stars.',
    opening: 'Collect fictional constellations and explore the technologies used in this project.',
    href: 'dream-atlas.html',
  },
  stories: {
    name: 'Bedtime Stories',
    description: 'A cozy cottage of storybooks, sleepy mysteries, and paths that change with every choice.',
    opening: 'A branching bedtime story is ready whenever you are.',
    href: 'bedtime-stories.html',
  },
  lullaby: {
    name: 'The Lullaby Lab',
    description: 'A music-box workshop where gentle notes are tucked into little lullabies.',
    opening: 'Make original procedural tones, find a hidden star, and play a listening game.',
    href: 'lullaby-lab.html',
  },
};

const locationButtons = [...document.querySelectorAll('.dreamworld-location')];
const locationName = document.querySelector('#dreamworldLocationName');
const locationDescription = document.querySelector('#dreamworldLocationDescription');
const locationOpening = document.querySelector('#dreamworldOpening');
const locationEnter = document.querySelector('#dreamworldEnter');
const mapArrivalKey = 'dear-pip-dreamworld-arrival-v1';
let selectedLocation = null;
let hoveredLocation = null;
let mapArrivalCuePending = false;

try {
  mapArrivalCuePending = sessionStorage.getItem(mapArrivalKey) === 'welcome';
  if (mapArrivalCuePending) {
    sessionStorage.removeItem(mapArrivalKey);
    document.body.classList.add('is-arriving-from-home');
  }
} catch (error) {
  console.error('Could not read the one-time Dreamworld arrival cue:', error);
}

function playMapArrivalIfNeeded() {
  if (!mapArrivalCuePending) return false;
  mapArrivalCuePending = false;
  window.DearPipSounds?.play('map-arrival');
  return true;
}

function openLocation(locationKey) {
  const location = locations[locationKey];
  if (!location) return;
  window.DearPipSounds?.play('portal-open');
  window.location.assign(location.href);
}

function updateWorldLabel() {
  const label = document.querySelector('#dreamworldWorldLabel');
  if (!label) return;
  const activeLocation = locations[hoveredLocation || selectedLocation];
  label.textContent = activeLocation
    ? activeLocation.name
    : 'Follow the little lights through the Midnight Nursery';
}

function selectLocation(locationKey, playSound = true) {
  const location = locations[locationKey];
  if (!location) return;
  selectedLocation = locationKey;
  if (playSound && !playMapArrivalIfNeeded()) {
    window.DearPipSounds?.play('portal-select');
  }
  locationButtons.forEach((button) => {
    const isSelected = button.dataset.location === locationKey;
    button.setAttribute('aria-pressed', String(isSelected));
    button.classList.toggle('is-selected', isSelected);
  });
  locationName.textContent = location.name;
  locationDescription.textContent = location.description;
  locationOpening.textContent = location.opening;
  locationEnter.disabled = false;
  locationEnter.textContent = `Enter ${location.name} →`;
  updateWorldLabel();
  window.dispatchEvent(new CustomEvent('dreamworld:selection', { detail: locationKey }));
}

function setHoveredLocation(locationKey) {
  hoveredLocation = locations[locationKey] ? locationKey : null;
  updateWorldLabel();
  window.dispatchEvent(new CustomEvent('dreamworld:hover', { detail: hoveredLocation }));
}

locationButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const locationKey = button.dataset.location;
    if (selectedLocation === locationKey) {
      openLocation(locationKey);
      return;
    }
    selectLocation(locationKey);
  });

  button.addEventListener('dblclick', () => openLocation(button.dataset.location));
  button.addEventListener('pointerenter', () => setHoveredLocation(button.dataset.location));
  button.addEventListener('pointerleave', () => setHoveredLocation(null));
  button.addEventListener('focus', () => setHoveredLocation(button.dataset.location));
  button.addEventListener('blur', () => setHoveredLocation(null));
});

window.addEventListener('dreamworld:select', (event) => {
  selectLocation(event.detail);
});

locationEnter.addEventListener('click', () => {
  if (selectedLocation) openLocation(selectedLocation);
});

const dialogue = document.querySelector('.dreamworld-dialogue');
const dialogueMessage = document.querySelector('#dreamworldDialogueMessage');
const dialogueChoices = document.querySelector('#dreamworldDialogueChoices');
const dialogueNext = document.querySelector('#dreamworldDialogueNext');
const dialogueReplay = document.querySelector('#dreamworldDialogueReplay');
const dialogueClose = document.querySelector('#dreamworldDialogueClose');
let dialogueTimer;
let previousSecretIndex = -1;
const secretMessages = [
  'A moonbeam told me that every star you find is a tiny reminder that you brought your own light.',
  'Somewhere, a cloud is keeping a soft place for a dream you have not dreamed yet.',
  'The smallest brave thing still counts as brave. I checked with the stars.',
  'If tonight feels long, remember: even the moon rests between its phases.',
  'You make the world gentler just by noticing its little wonders.',
];

const dialogueReplies = {
  tour: {
    message: 'I make a little map for every kind of dream. Those five glowing places are all yours to explore!',
    action: null,
  },
  workshop: {
    message: 'Tiny inventions, mostly! The Workshop is where the real projects and the tools behind them live.',
    action: { label: 'Visit Pip’s Workshop', href: 'workshop.html' },
  },
  dream: {
    message: 'Then let’s give it a place to grow. The Dream Garden has flowers, little friends, and a guestbook for your wish.',
    action: { label: 'Visit the Dream Garden', href: 'dream-garden.html' },
  },
  secret: {
    message: '',
    action: null,
    secret: true,
  },
};

function showDialogueChoice(choiceId) {
  const sourceReply = dialogueReplies[choiceId];
  if (!sourceReply) return;
  const reply = { ...sourceReply };
  if (reply.secret) {
    let nextIndex = Math.floor(Math.random() * secretMessages.length);
    if (secretMessages.length > 1 && nextIndex === previousSecretIndex) {
      nextIndex = (nextIndex + 1 + Math.floor(Math.random() * (secretMessages.length - 1))) % secretMessages.length;
    }
    previousSecretIndex = nextIndex;
    reply.message = secretMessages[nextIndex];
  }
  window.DearPipSounds?.play(choiceId === 'secret' ? 'secret' : 'pip-hello');
  dialogue.classList.add('is-typing');
  dialogueMessage.textContent = 'Pip is finding the right words…';
  dialogueChoices.hidden = true;
  dialogueNext.hidden = true;
  dialogueNext.replaceChildren();
  dialogueReplay.hidden = true;
  window.clearTimeout(dialogueTimer);
  dialogueTimer = window.setTimeout(() => {
    dialogue.classList.remove('is-typing');
    dialogueMessage.textContent = reply.message;
    if (reply.secret) {
      const star = document.createElement('span');
      star.className = 'dreamworld-dialogue__secret';
      star.setAttribute('aria-hidden', 'true');
      star.textContent = '✦';
      dialogueNext.append(star);
    }
    if (reply.action) {
      const next = document.createElement('a');
      next.className = 'dreamworld-dialogue__action';
      next.href = reply.action.href;
      next.textContent = reply.action.label;
      next.addEventListener('click', () => window.DearPipSounds?.play('portal-open'));
      dialogueNext.append(next);
    }
    if (choiceId === 'tour') {
      locationButtons.forEach((button) => button.classList.add('is-guided'));
      window.setTimeout(() => {
        locationButtons.forEach((button) => button.classList.remove('is-guided'));
      }, 3200);
    }
    dialogueNext.hidden = !reply.action && !reply.secret;
    dialogueReplay.hidden = false;
    if (choiceId === 'tour') {
      dialogueNext.hidden = false;
      dialogueNext.textContent = 'I lit up every island on the map for you. Choose one to take a closer look!';
    }
  }, 420);
}

dialogueChoices.addEventListener('click', (event) => {
  const button = event.target.closest('[data-dialogue-choice]');
  if (button) showDialogueChoice(button.dataset.dialogueChoice);
});

dialogueReplay.addEventListener('click', () => {
  window.clearTimeout(dialogueTimer);
  dialogue.classList.remove('is-typing');
  dialogueMessage.textContent = 'Oh! You made it! 🌙 I’m Pip, your little dream engineer. I build tiny inventions for the dreams that need a little help. Want to see what we’ve been dreaming up?';
  dialogueChoices.hidden = false;
  dialogueNext.hidden = true;
  dialogueNext.replaceChildren();
  dialogueReplay.hidden = true;
});

dialogueClose.addEventListener('click', () => {
  window.clearTimeout(dialogueTimer);
  dialogue.classList.remove('is-typing');
  dialogue.hidden = true;
  pipButton.setAttribute('aria-expanded', 'false');
  pipButton.focus({ preventScroll: true });
});

const pipButton = document.querySelector('#pipButton');

pipButton.addEventListener('click', () => {
  playMapArrivalIfNeeded();
  window.DearPipSounds?.play('pip-hello');
  window.dispatchEvent(new Event('dreamworld:pip-hello'));
  const closing = !dialogue.hidden;
  if (closing) {
    window.clearTimeout(dialogueTimer);
    dialogue.classList.remove('is-typing');
  }
  dialogue.hidden = closing;
  pipButton.setAttribute('aria-expanded', String(!dialogue.hidden));
});
