(() => {
  const $ = (selector) => document.querySelector(selector);
  const list = $('#journalEntries');
  const status = $('#journalStatus');
  const empty = $('#journalEmpty');
  const fallback = $('#journalFallback');
  const localUnavailable = $('#journalLocalUnavailable');
  const retry = $('#journalRetry');
  const detail = $('#journalDetail');
  const detailClose = $('#journalDetailClose');
  const detailImage = $('#journalDetailImage');
  const detailCategory = $('#journalDetailCategory');
  const detailTitle = $('#journalDetailTitle');
  const detailTime = $('#journalDetailTime');
  const detailDescription = $('#journalDetailDescription');
  const detailOutcome = $('#journalDetailOutcome');
  const previewNotice = $('#journalPreviewNotice');
  const apiMeta = $('meta[name="dear-pip-api-base"]');
  const localHost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
  const previewEnabled = localHost
    && new URLSearchParams(window.location.search).get('journalPreview') === '1';
  const apiBase = (localHost
    ? `http://${window.location.hostname}:5000`
    : (apiMeta?.content.trim() || window.location.origin)).replace(/\/+$/, '');

  const eventDetails = {
    garden_wish: {
      category: 'DREAM GARDEN',
      title: "Pip helped fulfill Anonymous Visitor's wish",
      outcome: "One anonymous Garden Friend wish was marked fulfilled. Its private words aren't shared.",
      image: 'assets/workshop/pip-garden-popup.png',
      cardImage: 'assets/workshop/pip-garden-cover.png',
      alt: 'Pip welcoming a Garden Friend in the Dream Garden',
    },
    home_stars: {
      category: 'DREAM GARDEN',
      title: 'Five stars gathered',
      outcome: 'The server recorded all five garden stars as collected.',
      image: 'assets/pip-garden.png',
      cardImage: 'assets/pip-garden.png',
      alt: 'Pip celebrating a discovery in the Dream Garden',
    },
    atlas_puzzle: {
      category: 'DREAM ATLAS',
      title: 'Pip helped Anonymous Visitor connect a constellation',
      outcome: 'Dream Atlas progress recorded a completed constellation puzzle.',
      image: 'assets/workshop/pip-atlaspuzzle-popup.png',
      cardImage: 'assets/workshop/pip-atlaspuzzle-cover.png',
      alt: 'Pip ready for another discovery',
    },
    atlas_game_completed: {
      category: 'DREAM ATLAS',
      title: 'Pip helped Anonymous Visitor achieve their dream in the game',
      outcome: 'Pip’s Wishbound Adventure reached its happy ending across the starlit clouds.',
      image: 'assets/workshop/pip-atlasgame-popup.png',
      cardImage: 'assets/workshop/pip-atlasgame-cover.png',
      alt: 'Pip celebrating the completed Wishbound Adventure',
    },
    lullaby_hidden_star: {
      category: 'LULLABY LAB',
      title: 'Pip helped Anonymous Visitor find the Hidden Stars',
      outcome: 'A gentle secret star discovery was completed in the Lullaby Lab.',
      image: 'assets/lullaby-lab/images/pip-torch.png',
      cardImage: 'assets/workshop/pip-lullaby-star-cover.png',
      alt: 'Pip holding a torch in the night garden',
    },
    lullaby_hidden_butterfly: {
      category: 'LULLABY LAB',
      title: 'Pip helped Anonymous Visitor find the Hidden Butterflies',
      outcome: 'A fluttering secret butterfly discovery was completed in the Lullaby Lab.',
      image: 'assets/lullaby-lab/images/pip-butterfly-net.png.png',
      cardImage: 'assets/workshop/pip-lullaby-butterfly-cover.png',
      alt: 'Pip holding a butterfly net in the day garden',
    },
  };
  const stories = {
    'missing-star': { title: 'Pip and the Missing Star', image: 'assets/bedtime-stories/cover_pip_missing_star.png' },
    'lumi-wish': { title: "Lumi's Shimmering Wish", image: 'assets/bedtime-stories/cover_lumi_shimmering_wish.png' },
    'music-box': { title: 'The Sleeping Music Box', image: 'assets/bedtime-stories/cover_sleeping_music_box.png' },
    'lantern-path': { title: 'The Lantern Path', image: 'assets/bedtime-stories/cover_lantern_path.png' },
    'little-lights': { title: 'Garden of Little Lights', image: 'assets/bedtime-stories/cover_garden_little_lights.png' },
    'ember-glow': { title: "Ember's Brave Little Glow", image: 'assets/bedtime-stories/cover_ember_brave_glow.png' },
    'nova-day': { title: "Nova's Slow and Steady Day", image: 'assets/bedtime-stories/cover_nova_slow_steady_day.png' },
    'mochi-place': { title: "Mochi's Peaceful Place", image: 'assets/bedtime-stories/cover_mochi_peaceful_place.png' },
    'pippa-song': { title: "Pippa's Song of Stars", image: 'assets/bedtime-stories/cover_pippa_song_stars.png' },
  };
  const storyCardImages = {
    'missing-star': 'assets/workshop/pip-reading.png',
    'lumi-wish': 'assets/workshop/pip-and-lumi.png',
    'music-box': 'assets/workshop/pip-reading.png',
    'lantern-path': 'assets/workshop/pip-reading.png',
    'little-lights': 'assets/workshop/pip-reading.png',
    'ember-glow': 'assets/workshop/pip-and-ember.png',
    'nova-day': 'assets/workshop/pip-and-nova.png',
    'mochi-place': 'assets/workshop/pip-and-mochi.png',
    'pippa-song': 'assets/workshop/pip-and-pippa.png',
  };
  const previewEntries = [{
    title: 'Development preview: A little garden visit',
    category: 'Development sample',
    message: 'Pip says: “This sample helps us check the diary design. It does not describe a real visitor adventure.”',
    happenedAt: '2026-01-01T12:00:00Z',
    outcome: 'No real activity is represented. This sample exists only for local layout and interaction testing.',
    image: 'assets/pip-garden.png',
    cardImage: 'assets/pip-garden.png',
    alt: 'Pip in the Dream Garden, shown as a development preview illustration',
  }];

  let opener = null;
  let savedScrollY = 0;
  let requestController = null;
  let knownEntryKeys = new Set();
  let hasLoadedInitial = false;
  let pollTimer = null;
  let isPolling = false;
  const POLL_INTERVAL_MS = 12000;
  let newEntryNotice = null;

  function setHidden(element, hidden) {
    if (element) element.hidden = hidden;
  }

  function make(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function validEntry(entry) {
    if (!entry || typeof entry !== 'object'
      || typeof entry.category !== 'string'
      || typeof entry.message !== 'string'
      || typeof entry.happenedAt !== 'string'
      || Number.isNaN(Date.parse(entry.happenedAt))) return null;
    if (entry.eventType === 'story_complete' && stories[entry.storyId]) {
      const story = stories[entry.storyId];
      const cardImage = storyCardImages[entry.storyId] || story.image;
      const visitorName = entry.guestbookName || 'Anonymous Visitor';
      return {
          title: `Pip read ${story.title} to ${visitorName}`,
          category: 'BEDTIME STORIES',
          message: entry.message,
          happenedAt: entry.happenedAt,
          outcome: 'The shared journal records that this story reached its happy ending.',
          image: story.image,
          cardImage,
          alt: `${story.title} storybook cover`,
      };
    }
    const presentation = eventDetails[entry.eventType];
    if (!presentation) return null;
    let category = presentation.category || entry.category;
    if (entry.eventType === 'atlas_puzzle') {
      category = 'DREAM ATLAS';
    } else if (entry.eventType === 'atlas_game_completed') {
      category = 'DREAM ATLAS';
    } else if (entry.eventType === 'lullaby_hidden_star') {
      category = 'LULLABY LAB';
    } else if (entry.eventType === 'lullaby_hidden_butterfly') {
      category = 'LULLABY LAB';
    } else if (entry.eventType === 'garden_wish') {
      category = 'DREAM GARDEN';
    }
    const visitorName = entry.guestbookName || 'Anonymous Visitor';
    let title = presentation.title;
    if (entry.eventType === 'atlas_puzzle') {
      title = `Pip helped ${visitorName} connect a constellation`;
    } else if (entry.eventType === 'atlas_game_completed') {
      title = `Pip helped ${visitorName} achieve their dream in the game`;
    } else if (entry.eventType === 'lullaby_hidden_star') {
      title = `Pip helped ${visitorName} find the Hidden Stars`;
    } else if (entry.eventType === 'lullaby_hidden_butterfly') {
      title = `Pip helped ${visitorName} find the Hidden Butterflies`;
    } else if (entry.eventType === 'garden_wish') {
      title = `Pip helped fulfill ${visitorName}'s wish`;
    }
    return {
      ...presentation,
      title: typeof entry.title === 'string' && entry.title && entry.eventType !== 'story_complete' ? title : (typeof entry.title === 'string' ? entry.title : title),
      category,
      message: entry.message,
      happenedAt: entry.happenedAt,
      cardImage: presentation.cardImage || presentation.image,
    };
  }

  function formattedDate(value) {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'long', timeStyle: 'short',
    }).format(new Date(value));
  }

  function openEntry(entry, button) {
    opener = button;
    savedScrollY = window.scrollY || 0;
    detailCategory.textContent = entry.category;
    detailTitle.textContent = entry.title;
    detailTime.dateTime = entry.happenedAt;
    detailTime.textContent = formattedDate(entry.happenedAt);
    detailDescription.textContent = entry.message;
    detailOutcome.textContent = entry.outcome;
    detailImage.src = entry.image;
    detailImage.alt = entry.alt;
    detailImage.hidden = false;
    detailImage.onerror = () => { detailImage.hidden = true; };
    if (typeof detail.showModal === 'function') detail.showModal();
    else detail.setAttribute('open', '');
    detailClose.focus();
  }

  function renderEntry(entry) {
    const item = make('li', 'workshop-entry');
    const button = make('button', 'workshop-entry__open');
    button.type = 'button';
    button.setAttribute('aria-haspopup', 'dialog');
    const image = make('img', 'workshop-entry__image');
    image.src = entry.cardImage || entry.image;
    image.alt = '';
    image.loading = 'lazy';
    image.onerror = () => { image.hidden = true; };
    const copy = make('span', 'workshop-entry__copy');
    const meta = make('span', 'workshop-entry__meta');
    meta.append(make('span', 'workshop-entry__category', entry.category));
    const time = make('time', 'workshop-entry__date', formattedDate(entry.happenedAt));
    time.dateTime = entry.happenedAt;
    meta.append(time);
    copy.append(meta, make('strong', 'workshop-entry__title', entry.title));
    button.append(image, copy);
    button.addEventListener('click', () => openEntry(entry, button));
    item.append(button);
    return item;
  }

  function showRequestState(kind) {
    setHidden(status, true);
    setHidden(empty, true);
    setHidden(fallback, kind !== 'error');
    setHidden(localUnavailable, kind !== 'local');
    setHidden(retry, kind !== 'error' && kind !== 'local');
  }

  function entryKey(entry, raw) {
    if (raw && raw.id !== undefined && raw.id !== null) return String(raw.id);
    if (raw && raw.dedupeKey) return `dk:${raw.dedupeKey}`;
    if (raw && raw.eventKey) return `ek:${raw.eventKey}`;
    if (entry) {
      const base = `${entry.eventType || ''}|${entry.storyId || ''}|${entry.title}|${entry.happenedAt}|${entry.category}`;
      return `e:${base}`;
    }
    return null;
  }

  function ensureNewEntryNotice() {
    if (newEntryNotice && newEntryNotice.isConnected) return newEntryNotice;
    const journalSection = document.querySelector('.workshop-journal');
    if (!journalSection) return null;
    const notice = make('p', 'workshop-journal__new');
    notice.className = 'workshop-journal__new';
    notice.setAttribute('role', 'status');
    notice.setAttribute('aria-live', 'polite');
    notice.textContent = '✨ A new little moment has arrived!';
    notice.hidden = true;
    // Add styles if needed via class (we can rely on existing patterns or add inline minimal)
    journalSection.insertBefore(notice, journalSection.querySelector('.workshop-timeline'));
    newEntryNotice = notice;
    return notice;
  }

  function showNewEntryNotice() {
    const notice = ensureNewEntryNotice();
    if (!notice) return;
    notice.hidden = false;
    if (typeof window !== 'undefined' && typeof window.clearTimeout === 'function' && notice._hideTimer) {
      window.clearTimeout(notice._hideTimer);
    }
    if (typeof window !== 'undefined' && typeof window.setTimeout === 'function') {
      notice._hideTimer = window.setTimeout(() => {
        if (notice.isConnected) notice.hidden = true;
      }, 4000);
    } else if (typeof setTimeout === 'function') {
      notice._hideTimer = setTimeout(() => {
        if (notice.isConnected) notice.hidden = true;
      }, 4000);
    }
  }

  async function loadJournal({ silent = false, isInitial = false } = {}) {
    if (isPolling && silent) return;
    if (requestController) {
      try { requestController.abort(); } catch (_) {}
    }
    if (previewEnabled) {
      setHidden(previewNotice, false);
      setHidden(status, true);
      setHidden(empty, true);
      setHidden(fallback, true);
      setHidden(localUnavailable, true);
      setHidden(retry, true);
      if (!hasLoadedInitial) {
        list.replaceChildren(...previewEntries.map(renderEntry));
        hasLoadedInitial = true;
      }
      return;
    }
    requestController = new AbortController();
    retry.disabled = true;
    if (!silent) {
      setHidden(status, false);
      status.textContent = "Opening Pip's journal…";
    }
    setHidden(empty, true);
    setHidden(fallback, true);
    setHidden(localUnavailable, true);
    if (!silent) {
      list.replaceChildren();
    }
    let response;
    try {
      response = await fetch(`${apiBase}/api/public-journal`, {
        method: 'GET', credentials: 'omit', signal: requestController.signal,
        headers: { Accept: 'application/json' },
      });
    } catch (error) {
      if (error.name === 'AbortError') return;
      if (!silent) {
        showRequestState(localHost ? 'local' : 'error');
        if (retry) retry.disabled = false;
      }
      return;
    }
    if (!response.ok) {
      if (!silent) {
        showRequestState('error');
        if (retry) retry.disabled = false;
      }
      return;
    }
    try {
      const result = await response.json();
      if (!result || !Array.isArray(result.entries)) throw new Error('Invalid journal response');
      const rawEntries = result.entries;
      const entries = rawEntries.map((raw, idx) => {
        const valid = validEntry(raw);
        if (!valid) return null;
        valid._key = entryKey(valid, raw) || `k:${idx}:${valid.happenedAt}:${valid.title}`;
        return valid;
      }).filter(Boolean);
      if (silent) {
        // Check for new entries
        const newOnes = entries.filter(e => !knownEntryKeys.has(e._key));
        if (newOnes.length > 0 && hasLoadedInitial) {
          showNewEntryNotice();
        }
        // Merge: add new entries at front if they come first? API returns newest first (ORDER BY id DESC)
        const existingKeys = new Set();
        if (list.children) {
          for (let i = 0; i < list.children.length; i++) {
            const li = list.children[i];
            const k = (li && li.dataset && li.dataset.key) ? li.dataset.key : null;
            if (k) existingKeys.add(k);
          }
        }
        const toAdd = entries.filter(e => !existingKeys.has(e._key));
        if (toAdd.length > 0) {
          // Prepend in API order (newest first)
          const frag = document.createDocumentFragment();
          for (let i = toAdd.length - 1; i >= 0; i--) {
            const node = renderEntry(toAdd[i]);
            if (!node.dataset) node.dataset = {};
            node.dataset.key = toAdd[i]._key;
            frag.appendChild(node);
          }
          // Insert at beginning
          if (list.firstChild) {
            list.insertBefore(frag, list.firstChild);
          } else {
            list.replaceChildren(...entries.map(e => { const n = renderEntry(e); if (!n.dataset) n.dataset = {}; n.dataset.key = e._key; return n; }));
          }
        }
        // Update known keys
        for (const e of entries) knownEntryKeys.add(e._key);
        if (!hasLoadedInitial) {
          setHidden(status, true);
          setHidden(empty, entries.length !== 0);
          hasLoadedInitial = true;
        }
        return;
      }
      // Initial/non-silent load
      const fragment = document.createDocumentFragment();
      for (const e of entries) {
        const node = renderEntry(e);
        if (!node.dataset) node.dataset = {};
        node.dataset.key = e._key;
        fragment.appendChild(node);
        knownEntryKeys.add(e._key);
      }
      list.replaceChildren(fragment);
      setHidden(status, true);
      setHidden(empty, entries.length !== 0);
      setHidden(fallback, true);
      setHidden(localUnavailable, true);
      if (!hasLoadedInitial) {
        hasLoadedInitial = true;
      }
    } catch (error) {
      if (!silent) {
        showRequestState('error');
      }
    } finally {
      retry.disabled = false;
    }
  }

  function startPolling() {
    if (pollTimer) {
      if (typeof window.clearInterval === 'function') window.clearInterval(pollTimer);
      pollTimer = null;
    }
    if (previewEnabled) return;
    const tick = () => {
      if (typeof document !== 'undefined' && document.hidden) return;
      if (isPolling) return;
      isPolling = true;
      loadJournal({ silent: true }).finally(() => {
        isPolling = false;
      });
    };
    if (typeof window.setInterval === 'function') {
      pollTimer = window.setInterval(tick, POLL_INTERVAL_MS);
    }
    if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) return;
        if (isPolling) return;
        tick();
      });
    }
  }

  function stopPolling() {
    if (pollTimer) {
      if (typeof window.clearInterval === 'function') window.clearInterval(pollTimer);
      pollTimer = null;
    }
  }

  if (retry) retry.addEventListener('click', () => loadJournal({ silent: false }));
  if (detailClose) detailClose.addEventListener('click', () => detail.close());
  if (detail) {
    detail.addEventListener('cancel', (event) => {
      event.preventDefault();
      detail.close();
    });
    detail.addEventListener('close', () => {
      if (opener?.isConnected) opener.focus({ preventScroll: true });
      if (typeof window.scrollTo === 'function') window.scrollTo({ top: savedScrollY, behavior: 'instant' });
      opener = null;
    });
    detail.addEventListener('click', (event) => {
      if (event.target === detail) detail.close();
    });
  }
  if (typeof window !== 'undefined') {
    if (typeof window.addEventListener === 'function') {
      window.addEventListener('beforeunload', stopPolling);
      window.addEventListener('pagehide', stopPolling);
    }
  }
  loadJournal({ silent: false }).then(() => startPolling());

})();
