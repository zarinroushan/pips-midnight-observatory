(() => {
  const canvas = document.querySelector('#bedtimePipCanvas');
  const stage = document.querySelector('#bedtimePipStage');
  const caption = document.querySelector('#bedtimeCompanionCaption');
  const hitarea = document.querySelector('#pipButton');
  const greeting = document.querySelector('#bedtimePipGreeting');
  const greetingText = document.querySelector('#bedtimePipGreetingText');
  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  const modelUrl = 'https://huggingface.co/zarinr/dear-pip-assets/resolve/main/animated_pip.glb';
  const threeModuleUrl = 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
  const gltfLoaderUrl = 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js';

  if (!canvas || !stage || !caption || !hitarea || !greeting || !greetingText) return;

  let three;
  let renderer;
  let scene;
  let camera;
  let modelRoot;
  let mixer;
  let idleAction;
  let walkAction;
  let waveAction;
  let jumpAction;
  let activeAction;
  let frame = 0;
  let previousFrameAt = 0;
  let resizeObserver;
  let loading = false;
  let ready = false;
  let failed = false;
  let previousRoute = '';
  let currentRoute = null;
  let selectedStory = '';
  let stateTimer = 0;
  let greetedStory = '';
  const geometries = new Set();
  const materials = new Set();
  const textures = new Set();

  const inReader = () => document.documentElement.dataset.bedtimeView === 'reader';
  const visible = () => inReader() && !document.hidden && canvas.clientWidth > 0 && canvas.clientHeight > 0;

  function setState(state, message) {
    stage.dataset.companionState = state;
    const modelVisible = ['arriving', 'idle', 'walking', 'celebrating'].includes(state);
    canvas.style.opacity = modelVisible ? '1' : '0';
    hitarea.disabled = !ready || state === 'error';
    if (message) caption.textContent = message;
  }

  function renderOnce() {
    if (!renderer || !ready || !visible()) return;
    renderer.render(scene, camera);
  }

  function stopLoop() {
    if (!frame) return;
    window.cancelAnimationFrame(frame);
    frame = 0;
  }

  function tick(now) {
    frame = 0;
    if (!visible() || motionPreference.matches) return;
    if (now - previousFrameAt >= 33) {
      const delta = previousFrameAt ? Math.min((now - previousFrameAt) / 1000, 0.05) : 0;
      previousFrameAt = now;
      mixer?.update(delta);
      renderer?.render(scene, camera);
    }
    if (activeAction) frame = window.requestAnimationFrame(tick);
  }

  function startLoop() {
    if (frame || motionPreference.matches || !visible() || !ready || !activeAction) return;
    previousFrameAt = 0;
    frame = window.requestAnimationFrame(tick);
  }

  function resize() {
    if (!renderer || !camera || !visible()) return;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.35));
    renderer.setSize(width, height, false);
    if (!frame || motionPreference.matches) renderOnce();
  }

  function idle(message = 'Pip is here! Are you ready for your story?') {
    window.clearTimeout(stateTimer);
    if (idleAction && activeAction !== idleAction) {
      idleAction.reset().setLoop(three.LoopRepeat, Infinity).play();
      if (activeAction) idleAction.crossFadeFrom(activeAction, 0.28, false);
      activeAction = idleAction;
    } else if (!idleAction) {
      mixer?.stopAllAction();
      activeAction = null;
    }
    setState('idle', message);
    if (motionPreference.matches) {
      mixer?.update(0);
      renderOnce();
      stopLoop();
    } else if (activeAction) startLoop();
    else { renderOnce(); stopLoop(); }
  }

  function playOnce(action, state, message, fallbackDuration = 1100) {
    if (motionPreference.matches) {
      idle(message);
      return;
    }
    window.clearTimeout(stateTimer);
    setState(state, message);
    if (action) {
      action.reset().stopFading().setLoop(three.LoopOnce, 1);
      action.clampWhenFinished = true;
      action.play();
      if (activeAction && activeAction !== action) action.crossFadeFrom(activeAction, 0.2, false);
      activeAction = action;
      const duration = Math.max(250, action.getClip().duration * 1000 + 100);
      stateTimer = window.setTimeout(() => idle(), duration);
      startLoop();
      return;
    }
    if (modelRoot) {
      const start = performance.now();
      const baseY = modelRoot.position.y;
      const animateFallback = (now) => {
        if (!visible() || motionPreference.matches || stage.dataset.companionState !== state) {
          modelRoot.position.y = baseY;
          renderOnce();
          return;
        }
        const progress = Math.min((now - start) / fallbackDuration, 1);
        const amount = state === 'celebrating' ? Math.sin(progress * Math.PI) * 0.14 : Math.sin(progress * Math.PI * 2) * 0.025;
        modelRoot.position.y = baseY + amount;
        renderer.render(scene, camera);
        if (progress < 1) window.requestAnimationFrame(animateFallback);
        else {
          modelRoot.position.y = baseY;
          idle();
        }
      };
      window.requestAnimationFrame(animateFallback);
    } else {
      stateTimer = window.setTimeout(() => idle(), fallbackDuration);
    }
  }

  function onAnimationFinished(event) {
    if (event.action === waveAction || event.action === walkAction || event.action === jumpAction) idle();
  }

  function greetPip() {
    if (!ready || hitarea.disabled || !currentRoute?.title) return;
    if (greetedStory === currentRoute.story) {
      playOnce(waveAction, 'arriving', 'Pip is here! Are you ready for your story?');
      return;
    }
    greetedStory = currentRoute.story;
    greetingText.textContent = `Hi! I'm Pip, and I've come to tell you the story of ${currentRoute.title}.`;
    greeting.hidden = false;
    playOnce(waveAction, 'arriving', 'Pip is here! Are you ready for your story?');
  }

  function announceArrival() {
    if (!ready || !currentRoute?.story || !currentRoute?.title) return;
    window.dispatchEvent(new CustomEvent('bedtime:pip-ready'));
    idle('Pip is here! Tap Pip or press Enter to say hello.');
  }
  function recordResources(root) {
    root.traverse((object) => {
      if (!object.isMesh) return;
      if (object.geometry) geometries.add(object.geometry);
      const list = Array.isArray(object.material) ? object.material : [object.material];
      list.forEach((material) => {
        if (!material) return;
        materials.add(material);
        Object.values(material).forEach((value) => { if (value?.isTexture) textures.add(value); });
      });
    });
  }

  function dispose() {
    stopLoop();
    window.clearTimeout(stateTimer);
    resizeObserver?.disconnect();
    window.removeEventListener('resize', resize);
    window.removeEventListener('pagehide', dispose);
    document.removeEventListener('visibilitychange', onVisibility);
    motionPreference.removeEventListener('change', onMotionPreference);
    window.removeEventListener('bedtime:routechange', onRouteChange);
    hitarea.removeEventListener('click', greetPip);
    mixer?.removeEventListener('finished', onAnimationFinished);
    mixer?.stopAllAction();
    textures.forEach((item) => item.dispose());
    materials.forEach((item) => item.dispose());
    geometries.forEach((item) => item.dispose());
    renderer?.dispose();
    renderer?.forceContextLoss();
  }

  function onVisibility() {
    if (document.hidden || !inReader()) stopLoop();
    else if (motionPreference.matches) renderOnce();
    else startLoop();
  }

  function onMotionPreference() {
    if (motionPreference.matches) {
      stopLoop();
      mixer?.stopAllAction();
      activeAction = null;
      renderOnce();
      return;
    }
    if (ready && inReader()) idle();
  }

  function celebrate() {
    playOnce(jumpAction || waveAction, 'celebrating', 'You did it! Pip is so happy you came along for this adventure.', 1300);
  }

  function onRouteChange(event) {
    const route = event.detail || {};
    if (route.view === 'reader' && route.story && selectedStory && route.story !== selectedStory) {
      greetedStory = '';
      greeting.hidden = true;
      greetingText.textContent = '';
    }
    if (route.view === 'reader' && route.story) selectedStory = route.story;
    currentRoute = route;
    const routeKey = route.view === 'reader' ? `${route.story}/${route.scene}` : route.view;
    const arrivedAtEnding = route.view === 'reader' && route.ending && routeKey !== previousRoute;
    previousRoute = routeKey;
    if (route.view !== 'reader') {
      stopLoop();
      return;
    }
    if (!ready) {
      setState(failed ? 'error' : 'loading', failed
        ? "Pip's animated model could not load, but you can still enjoy the story."
        : 'Pip is getting ready to tell you a story\u2026');
      if (failed) window.dispatchEvent(new CustomEvent('bedtime:pip-fallback'));
      if (!loading && !failed) loadModel();
      return;
    }
    resize();
    if (route.waiting) { announceArrival(); return; }
    if (arrivedAtEnding) celebrate();
    else if (route.animate) playOnce(walkAction, 'walking', "Come along — let's see what happens next!");
    else idle();
  }

  async function loadModel() {
    loading = true;
    setState('loading', 'Pip is getting ready to tell you a story\u2026');
    try {
      const THREE = await import(threeModuleUrl);
      three = THREE;
      const { GLTFLoader } = await import(gltfLoaderUrl);
      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power', depth: true, stencil: false });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.35));
      renderer.setClearColor(0x000000, 0);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.08;
      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(28, 1, 0.1, 60);
      camera.position.set(0, 1.35, 7.1);
      camera.lookAt(0, 1.3, 0);
      scene.add(new THREE.HemisphereLight(0xd9d5ff, 0x382844, 1.55));
      const keyLight = new THREE.DirectionalLight(0xffdfbd, 2.1);
      keyLight.position.set(-3, 5, 4);
      scene.add(keyLight);
      const fillLight = new THREE.DirectionalLight(0xb8baff, 1);
      fillLight.position.set(3.5, 2, -3);
      scene.add(fillLight);

      let lastProgress = 0;
      const gltf = await new GLTFLoader().loadAsync(modelUrl, (event) => {
        if (!event.lengthComputable || !inReader()) return;
        const percent = Math.round((event.loaded / event.total) * 100);
        if (percent >= lastProgress + 10 || percent === 100) {
          lastProgress = percent;
          setState('loading', `Pip is arriving\u2026 ${percent}%`);
        }
      });
      const model = gltf.scene;
      model.updateMatrixWorld(true);
      const bounds = new THREE.Box3().setFromObject(model);
      const size = bounds.getSize(new THREE.Vector3());
      const center = bounds.getCenter(new THREE.Vector3());
      if (!Number.isFinite(size.y) || size.y <= 0) throw new Error('The Pip model has no measurable height.');
      modelRoot = new THREE.Group();
      const scale = 2.55 / size.y;
      modelRoot.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale);
      modelRoot.scale.setScalar(scale);
      modelRoot.add(model);
      scene.add(modelRoot);
      recordResources(model);

      const clips = gltf.animations;
      console.info('Bedtime Pip GLB animation clips:', clips.map((clip) => ({ name: clip.name, duration: Number(clip.duration.toFixed(3)) })));
      const findClip = (...names) => clips.find((clip) => names.includes(clip.name.toLowerCase()));
      mixer = new THREE.AnimationMixer(model);
      mixer.addEventListener('finished', onAnimationFinished);
      idleAction = findClip('idle') ? mixer.clipAction(findClip('idle')).setLoop(THREE.LoopRepeat, Infinity) : null;
      walkAction = findClip('walk', 'walk-casual') ? mixer.clipAction(findClip('walk', 'walk-casual')) : null;
      waveAction = findClip('wave') ? mixer.clipAction(findClip('wave')) : null;
      jumpAction = findClip('jump') ? mixer.clipAction(findClip('jump')) : null;
      ready = true;
      loading = false;
      hitarea.disabled = false;
      resize();
      if (!inReader()) { idle(); return; }
      if (currentRoute?.waiting) announceArrival();
      else if (currentRoute?.ending) celebrate();
      else idle();
    } catch (error) {
      loading = false;
      failed = true;
      setState('error', "Pip's animated model could not load, but you can still enjoy the story.");
      greeting.hidden = true;
      window.dispatchEvent(new CustomEvent('bedtime:pip-fallback'));
      console.error(`Could not load or initialize the Bedtime Pip model at "${modelUrl}".`, error);
      renderer?.dispose();
      renderer = null;
    }
  }

  function startInitialReader() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('view') === 'reader') {
      const sceneId = params.get('scene') || '';
      previousRoute = `reader/${params.get('story') || ''}/${sceneId}`;
      currentRoute = { view: "reader", story: params.get("story"), scene: sceneId, title: document.querySelector('#bedtimeStoryTitle')?.textContent || '', ending: document.querySelector("#bedtimeEndingMessage")?.hidden === false, animate: false, waiting: true };
      selectedStory = currentRoute.story;
      loadModel();
    }
  }

  window.addEventListener('bedtime:routechange', onRouteChange);
  hitarea.addEventListener('click', greetPip);
  window.addEventListener('pagehide', dispose, { once: true });
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('resize', resize);
  motionPreference.addEventListener('change', onMotionPreference);
  if (typeof ResizeObserver === 'function') {
    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(stage);
  }
  startInitialReader();
})();
