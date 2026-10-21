const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const frontendDirectory = path.resolve(__dirname, '..');
const script = fs.readFileSync(path.join(frontendDirectory, 'bedtime-stories.js'), 'utf8');
const progressScript = fs.readFileSync(path.join(frontendDirectory, 'visitor-progress.js'), 'utf8');
const html = fs.readFileSync(path.join(frontendDirectory, 'bedtime-stories.html'), 'utf8');
const css = fs.readFileSync(path.join(frontendDirectory, 'style.css'), 'utf8');
const pipModule = fs.readFileSync(path.join(frontendDirectory, 'bedtime-pip-3d.js'), 'utf8');
const soundsScript = fs.readFileSync(path.join(frontendDirectory, 'sounds.js'), 'utf8');
const dataEnd = script.indexOf('\nif (!validateStoryCollection(story, adventures))');
assert.notEqual(dataEnd, -1);

const dataContext = { URLSearchParams, Map, Set, Object };
vm.runInNewContext(
  `${script.slice(0, dataEnd)}\nglobalThis.storyData = { story, adventures, bedtimeAssets, validateStoryCollection, parseBedtimeRoute, bedtimeRouteSearch };`,
  dataContext,
);
const { story, adventures, bedtimeAssets, validateStoryCollection, parseBedtimeRoute, bedtimeRouteSearch } = dataContext.storyData;
const parseRoute = (search) => JSON.parse(JSON.stringify(parseBedtimeRoute(search)));

test('all nine adventures are distinct, complete stories with reachable endings', () => {
  assert.deepEqual(Object.keys(adventures).sort(), [
    'ember-glow',
    'lantern-path',
    'little-lights',
    'lumi-wish',
    'missing-star',
    'mochi-place',
    'music-box',
    'nova-day',
    'pippa-song',
  ]);
  assert.equal(validateStoryCollection(story, adventures), true);

  for (const adventure of Object.values(adventures)) {
    assert.ok(adventure.scenes.length >= 5);
    assert.ok(adventure.scenes.some((sceneId) => story[sceneId].choices?.length > 1));
    const reachable = new Set([adventure.start]);
    const pending = [adventure.start];
    while (pending.length) {
      const sceneId = pending.pop();
      const current = story[sceneId];
      assert.ok(current.text.length > 100, `${sceneId} should contain a complete scene`);
      assert.equal(typeof current.title, 'string');
      const destinations = current.choices?.map((choice) => choice.next) || (
        current.next ? [current.next] : []
      );
      destinations.forEach((destination) => {
        assert.ok(adventure.scenes.includes(destination), `${sceneId} points outside its story`);
        if (!reachable.has(destination)) {
          reachable.add(destination);
          pending.push(destination);
        }
      });
    }
    assert.equal(reachable.size, adventure.scenes.length, `${adventure.title} has unreachable scenes`);
    assert.ok([...reachable].some((sceneId) => story[sceneId].ending), `${adventure.title} needs an ending`);
  }
});

test('shared visitor progress synchronizes every current and legacy bedtime scene', async () => {
  const visitorId = '1fa85f64-5717-4562-b3fc-2c963f66afa6';
  const requests = [];
  const localStorage = {
    getItem: () => visitorId,
    setItem: () => {},
  };
  const context = {
    AbortController,
    document: { querySelector: () => null },
    localStorage,
    fetch: async (url, options) => {
      requests.push({ url, options });
      return { ok: true, status: 200, json: async () => ({ revision: requests.length }) };
    },
    window: {
      location: { hostname: '127.0.0.1', origin: 'http://127.0.0.1:5500' },
      localStorage,
      setTimeout: () => 0,
      clearTimeout: () => {},
    },
  };
  vm.runInNewContext(progressScript, context);

  const sceneIds = [...Object.values(adventures).flatMap((adventure) => adventure.scenes)];
  const legacySceneIds = ['opening', 'hill', 'cloud', 'skyEnding', 'gardenEnding', 'nightlightEnding'];
  for (const scene of [...sceneIds, ...legacySceneIds]) {
    await context.window.DearPipProgress.save('bedtime', {
      version: 1,
      adventure: 'missing-star',
      scene,
      visited: [scene],
    });
    const payload = JSON.parse(requests.at(-1).options.body);
    assert.equal(payload.data.scene, scene);
    assert.deepEqual(payload.data.visited, [scene]);
  }
  assert.equal(requests.length, sceneIds.length + legacySceneIds.length);
});

test('story URL parsing restores intro, library, valid readers, and safe fallbacks', () => {
  assert.deepEqual(parseRoute(''), {
    route: { view: 'intro' },
    valid: true,
  });
  assert.deepEqual(parseRoute('?view=library'), {
    route: { view: 'library' },
    valid: true,
  });
  assert.deepEqual(parseRoute('?view=reader&story=missing-star&scene=star-cloud'), {
    route: { view: 'reader', story: 'missing-star', scene: 'star-cloud' },
    valid: true,
  });
  assert.deepEqual(parseRoute('?view=reader&story=lantern-path'), {
    route: { view: 'reader', story: 'lantern-path', scene: 'lantern-start' },
    valid: false,
  });
  assert.deepEqual(parseRoute('?view=reader&story=unknown&scene=missing'), {
    route: { view: 'library' },
    valid: false,
  });
  assert.deepEqual(parseRoute('?view=reader&story=music-box&scene=not-a-scene'), {
    route: { view: 'library' },
    valid: false,
  });
  assert.deepEqual(parseRoute('?view=unrecognized'), {
    route: { view: 'library' },
    valid: false,
  });
  assert.equal(
    bedtimeRouteSearch({ view: 'reader', story: 'little-lights', scene: 'lights-rhythm' }),
    '?view=reader&story=little-lights&scene=lights-rhythm',
  );
});

test('page markup has exactly three states and starts safely with only the intro visible', () => {
  const stateSections = [...html.matchAll(/<section\b[^>]*data-bedtime-view="([^"]+)"[^>]*>/g)];
  assert.deepEqual(stateSections.map((match) => match[1]), ['intro', 'library', 'reader']);
  assert.equal(stateSections[0][0].includes(' hidden'), false);
  assert.ok(stateSections[1][0].includes(' hidden'));
  assert.ok(stateSections[2][0].includes(' hidden'));

  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(new Set(ids).size, ids.length, 'HTML element IDs must be unique');
  assert.doesNotMatch(html, /bedtime-book|bedtime-real-notes|bedtimeProjectNotes|bedtimeAchievementNotes/);
  assert.match(html, /new URLSearchParams\(location\.search\)\.get\('view'\)/);
  assert.match(css, /html\[data-bedtime-view="library"\] #bedtimeLibrary/);
  assert.match(css, /html\[data-bedtime-view="reader"\] #bedtimeReaderState/);
});

test('Pip has one GLB viewer, one caption, and no static reader image', () => {
  const companion = html.match(/<aside class="bedtime-companion"[\s\S]*?<\/aside>/)?.[0] || '';
  assert.equal((companion.match(/<canvas\b/g) || []).length, 1);
  assert.equal((companion.match(/id="bedtimeCompanionCaption"/g) || []).length, 1);
  assert.doesNotMatch(companion, /bedtimePipStatus|bedtime-pip-fallback|<img\b/);
  assert.equal((companion.match(/class="bedtime-pip-loader"/g) || []).length, 1);
  assert.match(companion, /id="pipButton"[^>]*disabled/);
  assert.match(html, /id="bedtimePipCanvas"/);
  assert.match(companion, /id="bedtimeCompanionCaption"[^>]*role="status"/);
  assert.match(companion, /id="bedtimePipGreeting"[^>]*aria-live="polite"/);
  assert.match(html, /class="bedtime-waiting-panel"/);
  assert.match(html, /id="bedtimeWaitingCopy"/);
  assert.match(html, /id="bedtimeArrivalCopy"[^>]*role="status"/);
  assert.match(html, /id="bedtimeBeginStory"[^>]*>Begin Story/);
  assert.match(html, /class="bedtime-reading-panel"[^>]*hidden/);
  assert.doesNotMatch(companion, /bedtimePipBegin/);
  assert.doesNotMatch(html, /bedtimePause|bedtimeResume/);
  assert.match(html, /bedtime-pip-3d\.js/);
  assert.doesNotMatch(html, /bedtimePipStatus|rive-app|pipCanvas/);
  assert.doesNotMatch(script, /rive\.Rive|pipCanvas|pipAnimationName/);
  assert.ok(fs.existsSync(path.join(frontendDirectory, 'assets', 'animated_pip.glb')));
  assert.match(pipModule, /assets\/animated_pip\.glb/);
  assert.match(pipModule, /Hi! I'm Pip, and I've come to tell you the story of \$\{currentRoute\.title\}/);
  assert.match(pipModule, /bedtime:pip-ready/);
  assert.match(pipModule, /bedtime:pip-fallback/);
  assert.doesNotMatch(pipModule, /bedtime:pause|bedtime:resume|bedtime:begin/);
  assert.match(pipModule, /Come along — let's see what happens next!/);
  assert.match(script, /window\.addEventListener\('bedtime:pip-ready', onPipReady\)/);
  assert.match(script, /window\.addEventListener\('bedtime:pip-fallback', onPipFallback\)/);
  assert.match(pipModule, /hitarea\.addEventListener\('click', greetPip\)/);
  const arrivalHandler = pipModule.match(/function announceArrival\(\) \{[\s\S]*?\n  \}/)?.[0] || '';
  const greetingHandler = pipModule.match(/function greetPip\(\) \{[\s\S]*?\n  \}/)?.[0] || '';
  assert.doesNotMatch(arrivalHandler, /greeting\.hidden = false|playOnce\(/);
  assert.match(greetingHandler, /greeting\.hidden = false/);
  assert.match(greetingHandler, /playOnce\(waveAction/);
  for (const clip of ['idle', 'walk', 'wave', 'jump']) assert.ok(pipModule.includes(`'${clip}'`));
  assert.match(css, /\.bedtime-pip-canvas/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
});

test('story shelves have accessible horizontal controls and reading sounds', () => {
  assert.match(script, /bedtime-story-shelf__track/);
  assert.match(script, /bedtime-shelf-arrow/);
  assert.match(script, /Completed Stories/);
  assert.match(script, /bedtime-completed-badge/);
  assert.match(css, /\.bedtime-story-shelf__track\s*\{[^}]*overflow-x:\s*auto/s);
  assert.match(css, /\.bedtime-story-shelf__track[^}]*scroll-snap-type:\s*x\s*mandatory/s);
  assert.match(soundsScript, /bookOpen:\s*\[/);
  assert.match(soundsScript, /pageTurn:\s*\[\]/);
  assert.match(soundsScript, /name === 'pageTurn'/);
});

test('refined library copy, covers, themes, and completed shelf states are present', () => {
  assert.match(html, /Choose Your Midnight Adventure/);
  assert.match(html, /Settle in, choose a path, and see where the light takes you\./);
  assert.match(script, /Follow Pip through moonlit paths and discover little wonders along the way\./);
  assert.match(script, /Every little friend has a story, a dream, and a light of their own\./);
  assert.match(script, /Your finished adventures, waiting to be opened again\./);
  assert.match(script, /Your next finished adventure will find a home here\./);
  assert.match(script, /Complete a story with Pip, and it will appear on this shelf\./);
  assert.match(script, /if \(storyIds\.length\)[\s\S]*?makeCard\(storyId, id, completed\)[\s\S]*?else \{/);
  assert.match(css, /--bedtime-content-max:\s*1320px/);
  assert.match(css, /--bedtime-card-width:\s*clamp\(245px/);
  assert.match(css, /\.bedtime-story-card \.bedtime-story-card__cover\s*\{\s*object-fit:\s*contain/);
  assert.match(css, /html\[data-mood="dawn"\] \.bedtime-page\s*\{/);
  assert.match(css, /\.bedtime-page\s*\{[\s\S]*?linear-gradient\(180deg, #10162f/);
});

test('the nine story cards are divided into four adventures and five friend stories', () => {
  assert.equal(Object.values(adventures).filter((item) => item.group === 'main').length, 4);
  assert.equal(Object.values(adventures).filter((item) => item.group === 'friends').length, 5);
});

test('all real story covers are mapped and missing scene art uses designed placeholders', () => {
  const expectedCovers = {
    'missing-star': 'cover_pip_missing_star.png',
    'ember-glow': 'cover_ember_brave_glow.png',
    'little-lights': 'cover_garden_little_lights.png',
    'nova-day': 'cover_nova_slow_steady_day.png',
    'mochi-place': 'cover_mochi_peaceful_place.png',
    'pippa-song': 'cover_pippa_song_stars.png',
    'lumi-wish': 'cover_lumi_shimmering_wish.png',
    'lantern-path': 'cover_lantern_path.png',
    'music-box': 'cover_sleeping_music_box.png',
  };
  assert.equal(bedtimeAssets.openingCover, 'assets/bedtime-stories/opening-cover.png');
  assert.ok(fs.existsSync(path.join(frontendDirectory, bedtimeAssets.openingCover)));
  for (const [storyId, filename] of Object.entries(expectedCovers)) {
    const imagePath = `assets/bedtime-stories/${filename}`;
    assert.equal(bedtimeAssets.stories[storyId].coverImage, imagePath);
    assert.ok(fs.existsSync(path.join(frontendDirectory, imagePath)), `${storyId} cover must exist`);
    for (const [sceneId, image] of Object.entries(bedtimeAssets.stories[storyId].sceneImages)) {
      assert.ok(adventures[storyId].scenes.includes(sceneId));
      const expectedSceneImage = storyId === 'missing-star'
        ? `assets/bedtime-stories/scenes/scene_missing-star_${sceneId}.png`
        : null;
      assert.equal(image.src, expectedSceneImage);
      if (expectedSceneImage) {
        assert.ok(fs.existsSync(path.join(frontendDirectory, expectedSceneImage)), `${sceneId} image must exist`);
      }
      assert.ok(image.alt.length > 10);
    }
  }
  assert.match(css, /aspect-ratio:\s*2\s*\/\s*3/);
  assert.match(css, /object-fit:\s*contain/);
  assert.match(css, /\.bedtime-scene-art--scene-lantern-start/);
  assert.match(script, /bedtime-scene-art--scene-\$\{route\.scene\}/);
});
test('reader styles allow normal page scrolling and responsive Pip layout', () => {
  assert.doesNotMatch(css, /\.bedtime-page\s*\{[^}]*height:\s*100svh/s);
  assert.doesNotMatch(css, /\.bedtime-reader\s*\{[^}]*overflow:\s*hidden/s);
  assert.doesNotMatch(css, /\.bedtime-reader\s*\{[^}]*max-height/s);
  assert.match(css, /@media \(max-width: 760px\)[\s\S]*?\.bedtime-layout\s*\{\s*grid-template-columns:\s*minmax\(0,\s*1fr\)/);
  assert.match(css, /\.bedtime-reader\s*\{[^}]*min-width:\s*0/s);
});
