const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'workshop.js'), 'utf8');
const page = fs.readFileSync(path.join(__dirname, '..', 'workshop.html'), 'utf8');
const styles = fs.readFileSync(path.join(__dirname, '..', 'style.css'), 'utf8');

class Element {
  constructor(tagName = 'div') {
    this.tagName = tagName;
    this.children = [];
    this.attributes = new Map();
    this.dataset = {};
    this.hidden = false;
    this.disabled = false;
    this.textContent = '';
    this.className = '';
    this.listeners = new Map();
    this.isConnected = true;
    this.focused = false;
  }
  get firstChild() {
    return this.children[0] || null;
  }

  append(...children) {
    for (const child of children) {
      if (child.tagName === '#document-fragment') {
        this.children.push(...child.children);
      } else {
        this.children.push(child);
      }
    }
  }

  appendChild(child) {
    this.append(child);
    return child;
  }

  replaceChildren(...children) {
    this.children = [];
    this.append(...children);
  }

  insertBefore(newNode, referenceNode) {
    const index = this.children.indexOf(referenceNode);
    const nodes = newNode.tagName === '#document-fragment'
      ? [...newNode.children]
      : [newNode];

    if (index === -1) {
      this.children.push(...nodes);
    } else {
      this.children.splice(index, 0, ...nodes);
    }

    return newNode;
  }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  addEventListener(name, handler) { this.listeners.set(name, handler); }
  focus() { this.focused = true; }
  showModal() { this.open = true; }
  close() { this.open = false; this.listeners.get('close')?.(); }
  pressEscape() { if (this.tagName === 'dialog' && this.open) this.close(); }
  click(event = {}) { this.listeners.get('click')?.({ target: this, ...event }); }
  findByClass(className) {
    if (this.className === className) return this;
    for (const child of this.children) {
      const found = child.findByClass?.(className);
      if (found) return found;
    }
    return null;
  }
}

async function runWorkshop(fetchImpl, hostname = 'example.test', search = '') {
  const elements = {
    '#journalEntries': new Element('ol'),
    '#journalStatus': new Element('p'),
    '#journalEmpty': new Element('div'),
    '#journalFallback': new Element('p'),
    '#journalLocalUnavailable': new Element('p'),
    '#journalPreviewNotice': Object.assign(new Element('p'), { hidden: true }),
    '#journalRetry': new Element('button'),
    '#journalDetail': new Element('dialog'),
    '#journalDetailClose': new Element('button'),
    '#journalDetailImage': new Element('img'),
    '#journalDetailCategory': new Element('p'),
    '#journalDetailTitle': new Element('h2'),
    '#journalDetailTime': new Element('time'),
    '#journalDetailDescription': new Element('p'),
    '#journalDetailOutcome': new Element('p'),
    'meta[name="dear-pip-api-base"]': { content: 'https://api.example.test/' },
  };
  const scrollCalls = [];
  const context = {
    document: {
      hidden: false,
      querySelector(selector) {
        return elements[selector] || null;
      },
      createElement(tagName) {
        return new Element(tagName);
      },
      createDocumentFragment() {
        return new Element('#document-fragment');
      },
      addEventListener() {},
    },
    window: {
      location: { hostname, origin: `http://${hostname}:5500`, search },
      scrollY: 280,
      scrollTo(options) { scrollCalls.push(options); },
    },
    fetch: fetchImpl,
    AbortController,
    Intl,
    Date,
    Number,
    Array,
    String,
    Error,
    URLSearchParams,
  };
  vm.runInNewContext(source, context);
  await new Promise((resolve) => setTimeout(resolve, 0));
  return { elements, context, scrollCalls };
}

const storyEntry = {
  eventType: 'story_complete',
  storyId: 'missing-star',
  category: 'Stories',
  icon: '✧',
  message: 'We reached the happy ending of Pip and the Missing Star together!',
  happenedAt: '2026-06-01T12:00:00Z',
};

test('a journal record opens its verified story details and uses text content', async () => {
  let requestUrl = '';
  const result = await runWorkshop(async (url, options) => {
    requestUrl = url;
    assert.equal(options.method, 'GET');
    assert.equal(options.credentials, 'omit');
    return { ok: true, async json() { return { entries: [{ ...storyEntry, message: '<img src=x onerror=alert(1)>' }] }; } };
  });

  assert.equal(requestUrl, 'https://api.example.test/api/public-journal');
  const { '#journalEntries': list, '#journalStatus': status, '#journalEmpty': empty } = result.elements;
  assert.equal(list.children.length, 1);
  const button = list.children[0].children[0];
  assert.equal(button.tagName, 'button');
  button.click();

  assert.equal(result.elements['#journalDetail'].open, true);
  assert.equal(result.elements['#journalDetailTitle'].textContent, 'Pip read Pip and the Missing Star to Anonymous Visitor');
  assert.equal(result.elements['#journalDetailCategory'].textContent, 'BEDTIME STORIES');
  assert.equal(result.elements['#journalDetailDescription'].textContent, '<img src=x onerror=alert(1)>');
  assert.equal(result.elements['#journalDetailDescription'].children.length, 0);
  assert.match(result.elements['#journalDetailOutcome'].textContent, /happy ending/);
  assert.equal(result.elements['#journalDetailImage'].src, 'assets/bedtime-stories/cover_pip_missing_star.png');
  assert.equal(status.hidden, true);
  assert.equal(empty.hidden, true);
});

test('closing detail restores focus and timeline position', async () => {
  const result = await runWorkshop(async () => ({ ok: true, async json() { return { entries: [storyEntry] }; } }));
  const opener = result.elements['#journalEntries'].children[0].children[0];
  opener.click();
  result.elements['#journalDetailClose'].click();

  assert.equal(result.elements['#journalDetail'].open, false);
  assert.equal(opener.focused, true);
  assert.equal(result.scrollCalls.length, 1);
  assert.equal(result.scrollCalls[0].top, 280);
  assert.equal(result.scrollCalls[0].behavior, 'instant');
});

test('Escape closes the native detail dialog and restores the entry focus', async () => {
  const result = await runWorkshop(async () => ({ ok: true, async json() { return { entries: [storyEntry] }; } }));
  const opener = result.elements['#journalEntries'].children[0].children[0];
  opener.click();
  result.elements['#journalDetail'].pressEscape();

  assert.equal(result.elements['#journalDetail'].open, false);
  assert.equal(opener.focused, true);
});

test('local preview distinguishes an unavailable backend and retry can reach the empty state', async () => {
  const urls = [];
  let attempts = 0;
  const result = await runWorkshop(async (url) => {
    urls.push(url);
    attempts += 1;
    if (attempts === 1) throw new Error('offline');
    return { ok: true, async json() { return { entries: [] }; } };
  }, '127.0.0.1');

  assert.deepEqual(urls, ['http://127.0.0.1:5000/api/public-journal']);
  assert.equal(result.elements['#journalLocalUnavailable'].hidden, false);
  assert.equal(result.elements['#journalFallback'].hidden, true);
  result.elements['#journalRetry'].click();
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.equal(urls.length, 2);
  assert.equal(result.elements['#journalRetry'].disabled, false);
  assert.equal(result.elements['#journalLocalUnavailable'].hidden, true);
  assert.equal(result.elements['#journalEmpty'].hidden, false);
});

test('API failures show the error state, separate from a successful empty journal', async () => {
  const result = await runWorkshop(async () => ({ ok: false, status: 503 }));
  assert.equal(result.elements['#journalFallback'].hidden, false);
  assert.equal(result.elements['#journalLocalUnavailable'].hidden, true);
  assert.equal(result.elements['#journalEmpty'].hidden, true);
  assert.equal(result.elements['#journalRetry'].hidden, false);
});

test('unknown or malformed event records are not presented as verified moments', async () => {
  const result = await runWorkshop(async () => ({
    ok: true,
    async json() {
      return { entries: [
        { ...storyEntry, eventType: 'client_claimed_reward' },
        { ...storyEntry, storyId: 'unknown-story' },
        { ...storyEntry, happenedAt: 'not a date' },
      ] };
    },
  }));
  assert.equal(result.elements['#journalEntries'].children.length, 0);
  assert.equal(result.elements['#journalEmpty'].hidden, false);
});

test('explicit local development preview bypasses the API and supports accessible detail interaction', async () => {
  let fetchCalls = 0;
  const result = await runWorkshop(async () => {
    fetchCalls += 1;
    throw new Error('The development preview must not call the API');
  }, 'localhost', '?journalPreview=1');

  const { elements } = result;
  assert.equal(fetchCalls, 0);
  assert.equal(elements['#journalPreviewNotice'].hidden, false);
  assert.equal(elements['#journalEntries'].children.length, 1);
  const opener = elements['#journalEntries'].children[0].children[0];
  assert.match(opener.findByClass('workshop-entry__category').textContent, /Development sample/);
  opener.click();

  assert.equal(elements['#journalDetail'].open, true);
  assert.match(elements['#journalDetailTitle'].textContent, /Development preview/);
  assert.match(elements['#journalDetailDescription'].textContent, /does not describe a real visitor adventure/);
  assert.equal(elements['#journalDetailImage'].src, 'assets/pip-garden.png');
  elements['#journalDetail'].pressEscape();
  assert.equal(elements['#journalDetail'].open, false);
  assert.equal(opener.focused, true);
});

test('development preview query is ignored outside local hosts', async () => {
  let fetchCalls = 0;
  const result = await runWorkshop(async () => {
    fetchCalls += 1;
    return { ok: true, async json() { return { entries: [] }; } };
  }, 'example.test', '?journalPreview=1');

  assert.equal(fetchCalls, 1);
  assert.equal(result.elements['#journalPreviewNotice'].hidden, true);
  assert.equal(result.elements['#journalEntries'].children.length, 0);
  assert.equal(result.elements['#journalEmpty'].hidden, false);
});

test('Workshop removes the panoramic banner but retains its asset and places the footer after the journal', () => {
  const journalAt = page.indexOf('class="workshop-journal"');
  const footerAt = page.indexOf('class="workshop-footer"');
  assert.ok(journalAt >= 0 && journalAt < footerAt);
  assert.doesNotMatch(page, /workshop-landscape/);
  const imagePath = path.join(__dirname, '..', 'assets', 'workshop-footer.png');
  assert.equal(fs.existsSync(imagePath), true);
  const imageHeader = fs.readFileSync(imagePath).subarray(0, 24);
  assert.deepEqual([...imageHeader.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.equal(imageHeader.readUInt32BE(16), 2172);
  assert.equal(imageHeader.readUInt32BE(20), 566);
  assert.match(page, /class="atlas-day-atmosphere" aria-hidden="true"/);
  assert.match(styles, /\.workshop-page\s*\{[^}]*#13152b[^}]*background-attachment:\s*fixed/s);
  assert.match(styles, /\.workshop-page::before\s*\{[^}]*radial-gradient[^}]*pointer-events:\s*none/s);
  assert.match(styles, /html\[data-mood="dawn"\] body\.workshop-page\s*\{[^}]*#e8f5fc[^}]*background-attachment:\s*fixed/s);
  assert.match(styles, /html\[data-mood="dawn"\] \.workshop-journal\s*\{[^}]*background:\s*transparent[^}]*box-shadow:\s*none/s);
  assert.match(styles, /\.workshop-journal\s*\{[^}]*background:\s*var\(--page-surface\)/s);
  assert.doesNotMatch(styles, /\.workshop-landscape(?:__image)?\s*\{/);
  assert.match(styles, /@media\s*\(max-width:\s*700px\)/);
  assert.match(styles, /@media\s*\(max-width:\s*390px\)/);
});
