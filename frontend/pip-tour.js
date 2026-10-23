/* Dear Pip — shared, theme-aware guided tour. Homepage intentionally excluded. */
(() => {
  const body = document.body;
  if (!body || body.classList.contains('home-page')) return;

  const tours = {
    'dreamworld-page': [
      {
        target: 'header.dreamworld-header',
        title: 'Welcome to the Dreamworld',
        copy: 'This moonlit map connects all of Pip’s cozy corners in the Midnight Nursery.',
        instruction: 'Look up here to switch themes or return home anytime.'
      },
      {
        target: '#dreamworldScene',
        title: 'Choose a dream destination',
        copy: 'Each glowing island leads to a different part of Pip’s world. Select any floating island from the scene to see what awaits you.',
        instruction: 'Tap any floating island or destination badge on the map.',
        requiresInteraction: 'island-selected'
      },
      {
        target: '#dreamworldDetails',
        title: 'Preview and travel',
        copy: 'Read what waits on your chosen island, from sound mixers to storybooks.',
        instruction: 'Click the enter button when you’re ready to travel there.'
      },
      {
        target: '.dreamworld-pip__avatar',
        title: 'Meet Pip',
        copy: 'Tap Pip whenever you need a friendly greeting, a hint, or help exploring.',
        instruction: 'Click Pip’s avatar anytime to start a little conversation.',
        shape: 'pip'
      }
    ],
    'garden-page': [
      {
        target: '.garden-intro',
        title: 'Welcome to the Dream Garden',
        copy: 'A gentle sanctuary in the Midnight Nursery to plant hopes, meet animal guardians, and gather memories.',
        instruction: 'Scroll down through the garden to discover each quiet corner.'
      },
      {
        target: '#gardenScene',
        title: 'Meet the garden friends',
        copy: 'Lumi the firefly, Nova the fox, Mochi the bunny, Ember the dragon, and Pippa the owl rest here.',
        instruction: 'Tap any creature in the garden to read their story and personality.'
      },
      {
        target: '.garden-seeds',
        title: 'Plant a dream seed',
        copy: 'Choose your dream seed, then plant it to grow a unique bloom.',
        instruction: 'Select a seed card and press "Plant Seed" to add it to your journal.'
      },
      {
        target: '.garden-journal',
        title: 'Your garden journal',
        copy: 'Keeps track of every blossom you have grown, friends discovered, and fulfilled hopes.',
        instruction: 'Review your flowers and milestones as your private garden grows.'
      },
      {
        target: '.garden-private-dreams',
        title: 'Keep a private wish',
        copy: 'Entrust a personal hope to an animal guardian. This wish stays securely in your browser session.',
        instruction: 'Choose a creature guardian, type your wish, and save it.'
      },
      {
        target: '#gardenGuestbookTitle',
        title: 'Leave a note for Pip',
        copy: 'Share a kind thought or memory with Pip and fellow dreamers in the public guestbook.',
        instruction: 'Enter an optional name and warm message to share with visitors.'
      },
      {
        target: '.garden-companion__avatar',
        title: 'Garden with Pip',
        copy: 'Pip keeps the moonlight warm while you tend your flowers. Tap Pip for a cheerful companion cheer.',
        instruction: 'Click Pip’s avatar whenever you want a friendly garden nudge.',
        shape: 'pip'
      }
    ],
    'atlas-page': [
      {
        target: '.atlas-intro',
        title: 'Welcome to the Dream Atlas',
        copy: 'Pip’s celestial observatory for charting mythical constellations and playing with the stars.',
        instruction: 'Follow the little lights across the night sky.'
      },
      {
        target: '#atlasChart',
        title: 'Explore the constellation map',
        copy: 'Five mythical star patterns glow across the midnight sky. Each constellation has its own story and puzzle to solve.',
        instruction: 'Tap any constellation on the map to reveal its name, stars, and folklore.'
      },
      {
        target: '#atlasJournalTitle',
        title: 'Your star discovery journal',
        copy: 'Every constellation you discover opens Pip’s field notes and records the memory here.',
        instruction: 'Discover all five constellations to complete your sky catalog.'
      },
      {
        target: '.atlas-game',
        title: 'Connect the stars puzzle',
        copy: 'Connect the glowing points of each constellation in sequence to trace its celestial shape.',
        instruction: 'Select a constellation above, then click the numbered stars in order.'
      },
      {
        target: '#adventureTitle',
        title: 'Pip’s Wishbound Adventure',
        copy: 'A little arcade platformer where Pip gathers fallen stars and dodges wandering night moths and fullfills your wish.',
        instruction: 'Type a dream destination and press "Begin the adventure" to play.'
      },
      {
        target: '.atlas-companion__avatar',
        title: 'Ask Pip for guidance',
        copy: 'Pip charts the heavens right beside you. Tap Pip whenever you need a star-gazing hint.',
        instruction: 'Tap Pip’s avatar for tips on constellations and star puzzles.',
        shape: 'pip'
      }
    ],
    'bedtime-page': [
      {
        target: '#bedtimeCover',
        title: 'Welcome to Bedtime Stories',
        copy: 'A collection of cozy, branching storybooks set throughout the Midnight Nursery.',
        instruction: 'Open the storybook cover to see all available adventures.',
        action: 'open-book'
      },
      {
        target: '#bedtimeOpenBook',
        title: 'Step into the library',
        copy: 'Press "Open the Storybook" to unlock nine illustrated bedtime tales.',
        instruction: 'Click the golden button to browse the story shelves.',
        action: 'open-book'
      },
      {
        target: '#bedtimeLibrary',
        title: 'Choose an adventure',
        copy: 'Browse four Pip adventures and five friend tales, each with distinct scenes and endings.',
        instruction: 'Click any story card to open its pages and begin reading.',
        requires: 'library'
      },
      {
        target: '#bedtimeStory',
        title: 'Read and choose your path',
        copy: 'Read each scene, then pick what Pip does next. Your choices guide Pip toward different story endings.',
        instruction: 'Tap an on-screen choice button to turn the page and continue your adventure.',
        requires: 'reader',
        dock: 'right'
      },
      {
        target: '#bedtimePipStage',
        title: 'Read along with Pip',
        copy: 'Pip sits beside you on the reading rug, listening and reacting to every twist in your tale.',
        instruction: 'Tap Pip’s stage anytime for a cozy reading cheer.',
        shape: 'pip'
      }
    ],
    'lullaby-page': [
      {
        target: '.lullaby-intro',
        title: 'Welcome to the Lullaby Lab',
        copy: 'A calming sound sanctuary where you can blend gentle room sounds, save wishes, and play music.',
        instruction: 'Follow Pip’s tour to explore each cozy sound corner.'
      },
      {
        target: '.lullaby-nightlight',
        getTitle: (mood) => mood === 'dawn' ? 'Catch the butterflies' : 'Find the hidden stars',
        getCopy: (mood) => mood === 'dawn'
          ? 'In the gentle morning light, help Pip search the garden and catch three fluttering butterflies among the blossoms.'
          : 'In the midnight garden, help Pip search with the torch to find five hidden stars tucked among the leaves.',
        getInstruction: (mood) => mood === 'dawn'
          ? 'Start the search, guide Pip with the butterfly net, and tap each butterfly to catch it.'
          : 'Light up the garden, move Pip, aim the torch to reveal stars, and tap each star to collect it.'
      },
      {
        target: '#lullabyMixer',
        title: 'Mix gentle sound layers',
        copy: 'Toggle rain, wind, crickets, fireplace, or lullaby tones, and adjust individual sliders to balance your mix.',
        instruction: 'Check or uncheck sounds and drag their volume sliders to shape your mix.'
      },
      {
        target: '.lullaby-player',
        title: 'Play and set a sleep timer',
        copy: 'Press Play to start the soundscape, adjust the master volume, or pick a sleep timer from 5 to 60 minutes.',
        instruction: 'Use the playback controls when you’re ready to rest.'
      },
      {
        target: '#bubbleTitle',
        title: 'Save a dream bubble',
        copy: 'Write a small task, goal, or comforting thought. It floats as an interactive bubble saved in this browser.',
        instruction: 'Choose a prompt or type your thought, then press "Create bubble".'
      },
      {
        target: '.lullaby-game',
        title: 'Echo Pip’s three notes',
        copy: 'A soothing musical game where Pip plays a soft pattern for you to echo with moon, star, and cloud bells.',
        instruction: 'Press "Listen to the pattern", then replay the three notes in the same sequence.'
      }
    ],
    'workshop-page': [
      {
        target: '.workshop-intro',
        title: 'Welcome to Pip’s Workshop',
        copy: 'Welcome to Little Moments, the shared journal of discoveries and milestones from Pip’s world.'
      },
      {
        target: '.workshop-journal__heading',
        title: 'Explore the shared timeline',
        copy: 'Browse the journal to see memories from adventures across the Dream Garden, Dream Atlas, Bedtime Stories, and Lullaby Lab.'
      },
      {
        target: '#journalStatus',
        title: 'Journal connection status',
        copy: 'This message tells you when the shared journal is loading or when an update or connection issue occurs.'
      },
      {
        target: '#journalEntries',
        title: 'Read a little moment',
        copy: 'Want to see your own achievement in Pip’s journal? Head to the Garden to plant a dream with your name.'
      },
      {
        target: '.workshop-journal__shortcut',
        title: 'Leave a dream for Pip',
        copy: 'Use this shortcut to open the Dream Garden, where you can write a wish and explore the garden activities.'
      }
    ],
  };

  const pageClassOrder = [
    'lullaby-page',
    'garden-page',
    'dreamworld-page',
    'workshop-page',
    'bedtime-page',
    'atlas-page'
  ];
  const page = pageClassOrder.find((cls) => body.classList.contains(cls));
  if (!page) return;

  let steps = [];
  let index = 0;
  let card = null;
  let spotlight = null;
  let launcher = null;
  let activeTarget = null;
  let activeStep = null;
  let resizeObserver = null;
  let interactionCleanup = null;

  const storageKey = `dear-pip-tour-complete-v2:${page}`;
  const safeGet = () => {
    try {
      return localStorage.getItem(storageKey) === 'yes';
    } catch (_) {
      return false;
    }
  };
  const safeSet = () => {
    try {
      localStorage.setItem(storageKey, 'yes');
    } catch (_) {}
  };

  const bedtimeView = (view) => {
    const el = document.querySelector(`[data-bedtime-view="${view}"]`);
    return !!el && !el.hidden && !el.closest('[hidden]');
  };

  function hasSelectedIsland() {
    const selectedBtn = document.querySelector('.dreamworld-location[aria-pressed="true"], .dreamworld-location.is-selected');
    const enterBtn = document.querySelector('#dreamworldEnter');
    return !!selectedBtn || (enterBtn && !enterBtn.disabled);
  }

  function ensureTargetVisible(el) {
    if (!el) return;
    const details = el.closest('details');
    if (details && !details.open) {
      details.open = true;
    }
  }

  function collectSteps() {
    steps = tours[page].filter((step) => {
      if (step.requires === 'library' && !bedtimeView('library')) return false;
      if (step.requires === 'reader' && !bedtimeView('reader')) return false;
      const el = document.querySelector(step.target);
      if (!el) return false;
      if (el.closest('details')) return true;
      return !el.hidden && !el.closest('[hidden]');
    });
  }

  function updateSpotlight() {
    if (!spotlight || !activeTarget) return;
    const rect = activeTarget.getBoundingClientRect();
    const style = window.getComputedStyle(activeTarget);

    let top = Math.round(rect.top - 2);
    let left = Math.round(rect.left - 2);
    let width = Math.round(rect.width + 4);
    let height = Math.round(rect.height + 4);

    const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 360;
    if (width > viewportWidth - 8) {
      width = viewportWidth - 8;
      left = 4;
    } else {
      if (left < 4) left = 4;
      if (left + width > viewportWidth - 4) {
        left = Math.max(4, viewportWidth - width - 4);
      }
    }

    if (activeStep?.shape === 'pip') {
      const size = Math.max(rect.width, rect.height) + 16;
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      spotlight.style.top = `${Math.round(centerY - size / 2)}px`;
      spotlight.style.left = `${Math.round(centerX - size / 2)}px`;
      spotlight.style.width = `${Math.round(size)}px`;
      spotlight.style.height = `${Math.round(size)}px`;
      spotlight.style.borderRadius = '50%';
    } else {
      spotlight.style.top = `${top}px`;
      spotlight.style.left = `${left}px`;
      spotlight.style.width = `${width}px`;
      spotlight.style.height = `${height}px`;
      const radius = style.borderRadius;
      spotlight.style.borderRadius = radius && radius !== '0px' ? radius : '18px';
    }
    spotlight.style.display = 'block';
  }

  function clearTarget() {
    if (interactionCleanup) {
      interactionCleanup();
      interactionCleanup = null;
    }
    if (resizeObserver) {
      resizeObserver.disconnect();
      resizeObserver = null;
    }
    if (activeTarget) {
      activeTarget.classList.remove('pip-tour-active-target');
    }
    activeTarget = null;
    activeStep = null;
    if (spotlight) {
      spotlight.style.display = 'none';
    }
  }

  function closeTour(completed = false) {
    clearTarget();
    if (card) { card.remove(); card = null; }
    if (spotlight) { spotlight.remove(); spotlight = null; }
    document.querySelectorAll('.pip-tour-card, .pip-tour-spotlight, .pip-tour-backdrop').forEach((el) => el.remove());
    if (completed) safeSet();
    if (launcher) {
      launcher.hidden = false;
      try { launcher.focus(); } catch (_) {}
    }
  }

  function openStorybookIfNeeded(step) {
    if (page !== 'bedtime-page' || step.action !== 'open-book' || bedtimeView('library') || bedtimeView('reader')) return false;
    const button = document.querySelector('#bedtimeOpenBook');
    if (button && !button.disabled) {
      button.click();
      return true;
    }
    return false;
  }

  function setupInteractionGate(step) {
    if (!card) return;
    const nextBtn = card.querySelector('[data-tour-next]');
    const instructionEl = card.querySelector('[data-tour-instruction]');
    if (!nextBtn || !instructionEl) return;

    if (step.requiresInteraction === 'island-selected') {
      const isReady = hasSelectedIsland();
      if (isReady) {
        nextBtn.disabled = false;
        nextBtn.textContent = 'See preview →';
        instructionEl.innerHTML = '✦ Island selected! Tap <strong>Next</strong> to inspect its details.';
        instructionEl.classList.add('is-fulfilled');
      } else {
        nextBtn.disabled = true;
        nextBtn.textContent = 'Select an island…';
        instructionEl.innerHTML = `<span>Action:</span> ${step.instruction}`;
        instructionEl.classList.remove('is-fulfilled');

        const onSelection = () => {
          if (!card) return;
          const currentNext = card.querySelector('[data-tour-next]');
          const currentInstruction = card.querySelector('[data-tour-instruction]');
          if (currentNext) {
            currentNext.disabled = false;
            currentNext.textContent = 'See preview →';
            currentNext.focus();
          }
          if (currentInstruction) {
            currentInstruction.innerHTML = '✦ Island selected! Tap <strong>Next</strong> to inspect its details.';
            currentInstruction.classList.add('is-fulfilled');
          }
        };

        window.addEventListener('dreamworld:selection', onSelection, { once: true });
        const islandButtons = document.querySelectorAll('.dreamworld-location');
        islandButtons.forEach((btn) => btn.addEventListener('click', onSelection, { once: true }));

        interactionCleanup = () => {
          window.removeEventListener('dreamworld:selection', onSelection);
          islandButtons.forEach((btn) => btn.removeEventListener('click', onSelection));
        };
      }
    } else {
      nextBtn.disabled = false;
      const mood = document.documentElement.dataset.mood || 'night';
      const instructionText = typeof step.getInstruction === 'function' ? step.getInstruction(mood) : step.instruction;
      instructionEl.innerHTML = instructionText ? `<span>Action:</span> ${instructionText}` : '';
      instructionEl.classList.remove('is-fulfilled');
    }
  }

  function renderStep() {
    clearTarget();
    collectSteps();
    if (index >= steps.length) {
      closeTour(true);
      return;
    }
    const step = steps[index];
    const target = document.querySelector(step.target);
    if (!target) {
      index++;
      renderStep();
      return;
    }
    ensureTargetVisible(target);
    activeTarget = target;
    activeStep = step;
    target.classList.add('pip-tour-active-target');

    if (page !== 'dreamworld-page') {
      const rect = target.getBoundingClientRect();
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 600;
      const inView = rect.top >= 20 && rect.bottom <= viewportHeight - 20;
      if (!inView) {
        target.scrollIntoView({
          behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
          block: 'center',
          inline: 'nearest'
        });
        window.setTimeout(() => {
          if (activeTarget === target) updateSpotlight();
        }, 320);
      }
    }

    if (typeof ResizeObserver !== 'undefined') {
      let lastRect = null;
      resizeObserver = new ResizeObserver(() => {
        if (!activeTarget) return;
        const r = activeTarget.getBoundingClientRect();
        if (!lastRect || Math.abs(r.top - lastRect.top) > 1 || Math.abs(r.left - lastRect.left) > 1 || Math.abs(r.width - lastRect.width) > 1 || Math.abs(r.height - lastRect.height) > 1) {
          lastRect = r;
          updateSpotlight();
        }
      });
      resizeObserver.observe(target);
    }
    updateSpotlight();

    if (card) {
      if (step.dock === 'right' && window.innerWidth >= 820) {
        card.classList.add('is-docked-right');
      } else {
        card.classList.remove('is-docked-right');
      }
      const mood = document.documentElement.dataset.mood || 'night';
      card.querySelector('[data-tour-title]').textContent = typeof step.getTitle === 'function' ? step.getTitle(mood) : step.title;
      card.querySelector('[data-tour-copy]').textContent = typeof step.getCopy === 'function' ? step.getCopy(mood) : step.copy;
      card.querySelector('[data-tour-count]').textContent = `Little stop ${index + 1} of ${steps.length}`;
      card.querySelector('[data-tour-back]').disabled = index === 0;

      const nextBtn = card.querySelector('[data-tour-next]');
      nextBtn.textContent = index === steps.length - 1 ? 'Finish ✦' : (step.action === 'open-book' ? 'Open book →' : 'Next →');

      setupInteractionGate(step);
    }
  }

  function startTour() {
    closeTour(false);
    index = 0;
    collectSteps();
    if (steps.length === 0) return;

    spotlight = document.createElement('div');
    spotlight.className = 'pip-tour-spotlight';
    spotlight.setAttribute('aria-hidden', 'true');

    card = document.createElement('section');
    card.className = 'pip-tour-card';
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-modal', 'true');
    card.setAttribute('aria-labelledby', 'pipTourTitle');
    card.innerHTML = `
      <div class="pip-tour-mascot">
        <img src="assets/pip-guide.png" alt="Pip, your guide">
        <div class="pip-tour-mascot__meta">
          <span class="pip-tour-mascot__badge">✦ PIP’S GUIDED TOUR ✦</span>
          <span class="pip-tour-count" data-tour-count></span>
        </div>
      </div>
      <button class="pip-tour-close" type="button" aria-label="Close tour">×</button>
      <h2 id="pipTourTitle" data-tour-title></h2>
      <p class="pip-tour-copy" data-tour-copy></p>
      <div class="pip-tour-instruction" data-tour-instruction></div>
      <div class="pip-tour-actions">
        <button type="button" data-tour-back>← Back</button>
        <button type="button" data-tour-skip>Skip tour</button>
        <button type="button" data-tour-next>Next →</button>
      </div>
    `;

    document.body.append(spotlight, card);
    if (launcher) launcher.hidden = true;

    card.querySelector('.pip-tour-close').addEventListener('click', () => closeTour(false));
    card.querySelector('[data-tour-skip]').addEventListener('click', () => closeTour(true));
    card.querySelector('[data-tour-back]').addEventListener('click', () => {
      if (index > 0) {
        index--;
        renderStep();
      }
    });
    card.querySelector('[data-tour-next]').addEventListener('click', () => {
      const step = steps[index];
      if (openStorybookIfNeeded(step)) {
        window.setTimeout(() => {
          collectSteps();
          index = 0;
          renderStep();
        }, 350);
        return;
      }
      if (index < steps.length - 1) {
        index++;
        renderStep();
      } else {
        closeTour(true);
      }
    });

    renderStep();
  }
    const onThemeChange = () => {
      if (card && activeStep && (activeStep.getTitle || activeStep.getCopy || activeStep.getInstruction)) {
        const currentMood = document.documentElement.dataset.mood || 'night';
        if (activeStep.getTitle) card.querySelector('[data-tour-title]').textContent = activeStep.getTitle(currentMood);
        if (activeStep.getCopy) card.querySelector('[data-tour-copy]').textContent = activeStep.getCopy(currentMood);
        const instructionEl = card.querySelector('[data-tour-instruction]');
        if (instructionEl && activeStep.getInstruction) {
          instructionEl.innerHTML = `<span>Action:</span> ${activeStep.getInstruction(currentMood)}`;
        }
      }
    };
    new MutationObserver(onThemeChange).observe(document.documentElement, { attributes: true, attributeFilter: ['data-mood'] });


  function handleOutsideClick(event) {
    if (!card) return;
    if (card.contains(event.target) || (launcher && launcher.contains(event.target))) {
      return;
    }
    if (activeTarget && activeTarget.contains(event.target)) {
      return;
    }
    closeTour(false);
  }

  launcher = document.createElement('button');
  launcher.type = 'button';
  launcher.className = 'pip-tour-launcher';
  launcher.innerHTML = '☁ Take a tour with Pip';
  launcher.setAttribute('aria-label', 'Start or replay Pip’s guided tour');
  launcher.addEventListener('click', (e) => {
    e.stopPropagation();
    startTour();
  });
  document.body.append(launcher);

  if (!safeGet()) {
    window.setTimeout(startTour, 700);
  }

  window.addEventListener('pip-tour:start', startTour);
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && card) {
      closeTour(false);
    }
  });

  window.addEventListener('pointerdown', (e) => {
    window.setTimeout(() => handleOutsideClick(e), 10);
  }, true);

  window.addEventListener('resize', () => {
    if (card && activeTarget && steps[index]) {
      if (steps[index].dock === 'right' && window.innerWidth >= 820) {
        card.classList.add('is-docked-right');
      } else {
        card.classList.remove('is-docked-right');
      }
      updateSpotlight();
    }
  });

  let scrollTransitionTimer = null;
  window.addEventListener('scroll', () => {
    if (spotlight && activeTarget) {
      spotlight.style.transition = 'none';
      updateSpotlight();
      if (scrollTransitionTimer) clearTimeout(scrollTransitionTimer);
      scrollTransitionTimer = setTimeout(() => {
        if (spotlight) spotlight.style.transition = '';
      }, 100);
    }
  }, { passive: true });
})();
