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
      title: 'A garden wish found its way',
      outcome: "One anonymous Garden Friend wish was marked fulfilled. Its private words aren't shared.",
      image: 'assets/pip-garden.png',
      alt: 'Pip welcoming a Garden Friend in the Dream Garden',
    },
    home_stars: {
      title: 'Five stars gathered',
      outcome: 'The server recorded all five garden stars as collected.',
      image: 'assets/pip-garden.png',
      alt: 'Pip celebrating a discovery in the Dream Garden',
    },
    atlas_puzzle: {
      title: 'A constellation connected',
      outcome: 'Dream Atlas progress recorded a completed constellation puzzle.',
      image: 'assets/pip.png',
      alt: 'Pip ready for another discovery',
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
  const previewEntries = [{
    title: 'Development preview: A little garden visit',
    category: 'Development sample',
    message: 'Pip says: “This sample helps us check the diary design. It does not describe a real visitor adventure.”',
    happenedAt: '2026-01-01T12:00:00Z',
    outcome: 'No real activity is represented. This sample exists only for local layout and interaction testing.',
    image: 'assets/pip-garden.png',
    alt: 'Pip in the Dream Garden, shown as a development preview illustration',
  }];

  let opener = null;
  let savedScrollY = 0;
  let requestController = null;

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
      return {
        title: story.title,
        category: entry.category,
        message: entry.message,
        happenedAt: entry.happenedAt,
        outcome: 'The shared journal records that this story reached its happy ending.',
        image: story.image,
        alt: `${story.title} storybook cover`,
      };
    }
    const presentation = eventDetails[entry.eventType];
    if (!presentation) return null;
    return { ...presentation, category: entry.category, message: entry.message, happenedAt: entry.happenedAt };
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
    image.src = entry.image;
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
    copy.append(make('span', 'workshop-entry__narration', entry.message));
    button.append(image, copy, make('span', 'workshop-entry__arrow', 'Open this moment ›'));
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

  async function loadJournal() {
    if (requestController) requestController.abort();
    if (previewEnabled) {
      setHidden(previewNotice, false);
      setHidden(status, true);
      setHidden(empty, true);
      setHidden(fallback, true);
      setHidden(localUnavailable, true);
      setHidden(retry, true);
      list.replaceChildren(...previewEntries.map(renderEntry));
      return;
    }
    requestController = new AbortController();
    retry.disabled = true;
    setHidden(status, false);
    status.textContent = "Opening Pip's journal…";
    setHidden(empty, true);
    setHidden(fallback, true);
    setHidden(localUnavailable, true);
    list.replaceChildren();
    let response;
    try {
      response = await fetch(`${apiBase}/api/public-journal`, {
        method: 'GET', credentials: 'omit', signal: requestController.signal,
        headers: { Accept: 'application/json' },
      });
    } catch (error) {
      if (error.name === 'AbortError') return;
      showRequestState(localHost ? 'local' : 'error');
      retry.disabled = false;
      return;
    }
    if (!response.ok) {
      showRequestState('error');
      retry.disabled = false;
      return;
    }
    try {
      const result = await response.json();
      if (!result || !Array.isArray(result.entries)) throw new Error('Invalid journal response');
      const entries = result.entries.map(validEntry).filter(Boolean);
      list.replaceChildren(...entries.map(renderEntry));
      setHidden(status, true);
      // The existing empty state is shown only for a successful, verified empty timeline.
      setHidden(empty, entries.length !== 0);
      setHidden(fallback, true);
      setHidden(localUnavailable, true);
    } catch (error) {
      showRequestState('error');
    } finally {
      retry.disabled = false;
    }
  }

  retry?.addEventListener('click', loadJournal);
  detailClose?.addEventListener('click', () => detail.close());
  detail?.addEventListener('close', () => {
    if (opener?.isConnected) opener.focus({ preventScroll: true });
    window.scrollTo?.({ top: savedScrollY, behavior: 'instant' });
    opener = null;
  });
  detail?.addEventListener('click', (event) => {
    if (event.target === detail) detail.close();
  });
  loadJournal();
})();
