const story = {
  opening: {
    label: 'CHAPTER ONE · A TINY TWINKLE',
    title: 'The little light in the grass',
    text: 'One velvet-blue evening, Pip found a tiny star nestled in the nursery grass. It gave a shy little shimmer. “I slipped from the sky,” it whispered. Pip cupped it gently. “We’ll find just the right place for you.”',
    choices: [
      { label: 'Follow the silver path uphill', next: 'hill' },
      { label: 'Listen for someone missing a light', next: 'cloud' },
    ],
  },
  hill: {
    label: 'CHAPTER TWO · ABOVE THE CLOUDS',
    title: 'A choice beneath the moon',
    text: 'Pip and the star climbed until the clouds looked like soft quilts below. The sky opened wide overhead, while the Dream Garden glimmered on a nearby island. The star hummed, waiting for Pip to choose.',
    choices: [
      { label: 'Help the star find its place in the sky', next: 'skyEnding' },
      { label: 'Plant the star in the Dream Garden', next: 'gardenEnding' },
    ],
  },
  cloud: {
    label: 'CHAPTER TWO · A QUIET WISH',
    title: 'The cloud who could not sleep',
    text: 'A small cloud drifted close. “I miss the stars that used to keep me company,” it sighed. The little star glowed warmly in Pip’s hands. “Perhaps it can help you feel less alone,” said Pip.',
    choices: [
      { label: 'Let the star stay as a gentle night-light', next: 'nightlightEnding' },
      { label: 'Ask the cloud to carry the star home', next: 'skyEnding' },
    ],
  },
  skyEnding: {
    label: 'THE END · HOME IN THE HEAVENS',
    title: 'A star finds its way home',
    text: 'Pip lifted the little star to the open sky. It floated upward, brighter with every breath, until it slipped into its old place among the constellations. A silver beam swept across the clouds. Far below, Pip waved goodnight.',
    ending: true,
  },
  gardenEnding: {
    label: 'THE END · A GARDEN OF LIGHT',
    title: 'A new flower for the night',
    text: 'Pip tucked the star into a patch of moon-soft earth. By morning, a tiny golden flower had opened there, its petals glowing like a very small sunrise. The Dream Garden had a new wonder, and the star had found a home of its own.',
    ending: true,
  },
  nightlightEnding: {
    label: 'THE END · A FRIENDLY GLOW',
    title: 'The cloud’s little night-light',
    text: 'The star settled beside the cloud, shining softly—not too bright, just enough. Together they watched the moon sail by. The cloud curled around its new friend and drifted into the gentlest sleep. Pip smiled and tiptoed home.',
    ending: true,
  },
};

const scene = document.querySelector('#bedtimeScene');
const sceneLabel = document.querySelector('#bedtimeSceneLabel');
const sceneTitle = document.querySelector('#bedtimeSceneTitle');
const storyCopy = document.querySelector('#bedtimeStoryCopy');
const choices = document.querySelector('#bedtimeChoices');
const endingActions = document.querySelector('#bedtimeEndingActions');
const restartButton = document.querySelector('#bedtimeRestart');
const storyStorageKey = 'dear-pip-bedtime-story-v1';
const storyVisited = new Set();
let storyProgressReady = false;
let storyProgressChangeVersion = 0;

function saveStoryProgress(sceneId) {
  const progress = { version: 1, scene: sceneId, visited: [...storyVisited] };
  try {
    localStorage.setItem(storyStorageKey, JSON.stringify(progress));
  } catch (error) {
    console.error('Could not save this device’s bedtime story progress:', error);
  }
  if (storyProgressReady) {
    window.DearPipProgress?.save('bedtime', progress).catch((error) => {
      console.error('Could not sync bedtime story progress:', error);
    });
  }
}

function showScene(sceneId, animate = true) {
  const current = story[sceneId];
  if (!current) return;

  storyVisited.add(sceneId);
  if (animate) storyProgressChangeVersion += 1;

  if (animate) window.DearPipSounds?.play('story-page');
  scene.classList.remove('is-arriving');
  if (animate) {
    void scene.offsetWidth;
    scene.classList.add('is-arriving');
  }

  sceneLabel.textContent = current.label;
  sceneTitle.textContent = current.title;
  sceneTitle.dataset.sceneId = sceneId;
  storyCopy.textContent = current.text;
  choices.replaceChildren();
  endingActions.hidden = false;
  saveStoryProgress(sceneId);

  current.choices?.forEach((choice) => {
    const button = document.createElement('button');
    button.className = 'bedtime-choice';
    button.type = 'button';
    button.textContent = choice.label;
    button.addEventListener('click', () => showScene(choice.next));
    choices.append(button);
  });

  if (!current.ending && animate) {
    choices.querySelector('button')?.focus({ preventScroll: true });
  }
}

restartButton.addEventListener('click', () => showScene('opening'));
let savedScene = 'opening';
let savedVisited = [];
try {
  const saved = JSON.parse(localStorage.getItem(storyStorageKey) || 'null');
  if (saved?.version === 1 && Object.hasOwn(story, saved.scene)) {
    savedScene = saved.scene;
    savedVisited = Array.isArray(saved.visited) ? saved.visited.filter((item) => Object.hasOwn(story, item)) : [saved.scene];
  }
} catch (error) {
  console.error('Could not read this device’s bedtime story progress:', error);
}
savedVisited.forEach((sceneId) => storyVisited.add(sceneId));
storyVisited.add(savedScene);
showScene(savedScene, false);

if (window.DearPipProgress) {
  const versionAtLoad = storyProgressChangeVersion;
  window.DearPipProgress.load('bedtime', {
    version: 1, scene: savedScene, visited: [...storyVisited],
  }).then(({ data }) => {
    if (!data || !Object.hasOwn(story, data.scene)) {
      storyProgressReady = true;
      return;
    }
    data.visited.forEach((sceneId) => storyVisited.add(sceneId));
    storyProgressReady = true;
    if (storyProgressChangeVersion === versionAtLoad) {
      showScene(data.scene, false);
    } else {
      const currentScene = sceneTitle.dataset.sceneId || savedScene;
      saveStoryProgress(currentScene);
    }
  });
}

async function loadStoryContext() {
  const projectNotes = document.querySelector('#bedtimeProjectNotes');
  const achievementNotes = document.querySelector('#bedtimeAchievementNotes');
  if (!projectNotes || !achievementNotes || !window.DearPipProgress) return;
  try {
    const context = await window.DearPipProgress.loadStoryContext();
    projectNotes.replaceChildren();
    if (!context.projects.length) {
      projectNotes.append(document.createTextNode('No verified projects have been saved in the Dream Atlas yet.'));
    }
    context.projects.forEach((project) => {
      const item = document.createElement('article');
      item.className = 'bedtime-project-note';
      const heading = document.createElement('h3');
      heading.textContent = project.name;
      const description = document.createElement('p');
      description.textContent = project.description || 'No project description has been saved.';
      const skills = document.createElement('p');
      skills.textContent = project.skills.length
        ? `Associated saved skills: ${project.skills.join(', ')}.`
        : 'No skills are associated with this project yet.';
      const status = document.createElement('p');
      status.textContent = `Saved project status: ${String(project.status || 'unspecified').replaceAll('_', ' ')}.`;
      const link = document.createElement('a');
      link.href = `dream-atlas.html?project=${encodeURIComponent(project.id)}`;
      link.textContent = 'View this real project in the Dream Atlas';
      item.append(heading, description, skills, status, link);
      projectNotes.append(item);
    });
    achievementNotes.replaceChildren();
    if (!context.achievements.length) {
      const item = document.createElement('li');
      item.textContent = 'No visitor achievements have been saved yet.';
      achievementNotes.append(item);
    } else {
      context.achievements.forEach((achievement) => {
        const item = document.createElement('li');
        item.textContent = achievement.label;
        achievementNotes.append(item);
      });
    }
  } catch (error) {
    projectNotes.textContent = 'Verified project notes are unavailable right now.';
    achievementNotes.replaceChildren();
    console.error('Could not load verified bedtime story context:', error);
  }
}

loadStoryContext();

const pipCanvas = document.querySelector('#pipCanvas');
const pipButton = document.querySelector('#pipButton');
const pipEyes = document.querySelectorAll('.pip-eye');
const pipToast = document.querySelector('#bedtimeToast');
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

  pipToast.textContent = 'Pip is right here with you. ✦';
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

    pupil.style.transform =
      `translate(${Math.cos(angle) * distance}px, ${Math.sin(angle) * distance}px)`;
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
        console.error(
          `Rive animation "${pipAnimationName}" was not found. Available animations:`,
          pipRive.animationNames
        );
      } else if (pipAnimationPending) {
        pipAnimationPending = false;
        pipRive.play(pipAnimationName);
      }
    },
    onLoadError: (error) => {
      console.error('Rive failed to load:', error);
    },
  });

  window.addEventListener('resize', () => {
    pipRive.resizeDrawingSurfaceToCanvas();
  });
} else if (pipCanvas) {
  console.error('Rive runtime did not load; Pip’s animation is unavailable.');
}
