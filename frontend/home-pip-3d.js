(() => {
  const canvas = document.querySelector('#heroPipCanvas');
  const status = document.querySelector('#pipLoadingStatus');
  const button = document.querySelector('#pipButton');
  const modelUrl = new URL('assets/animated_pip.glb', document.baseURI).href;
  const threeModuleUrl = 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
  const gltfLoaderUrl = 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js';
  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');

  let disposed = false;
  let ready = false;
  let renderer;
  let three;
  let scene;
  let camera;
  let mixer;
  let idleAction;
  let waveAction;
  let jumpAction;
  let currentAction;
  let jumpPromise = null;
  let resolveJump = null;
  let jumpSafetyTimer = 0;
  let frame = 0;
  let previousFrameAt = 0;
  let lastReportedProgress = 0;
  let resizeObserver;
  const geometries = new Set();
  const materials = new Set();
  const textures = new Set();

  function finishJump(completed) {
    if (!jumpPromise) return;
    window.clearTimeout(jumpSafetyTimer);
    jumpSafetyTimer = 0;
    if (completed && currentAction === jumpAction) switchToIdle(jumpAction);
    else if (currentAction === jumpAction) currentAction = null;
    const resolve = resolveJump;
    resolveJump = null;
    jumpPromise = null;
    resolve?.(completed);
  }

  function switchToIdle(fromAction = null) {
    if (!idleAction) {
      if (fromAction) fromAction.fadeOut(0.25);
      currentAction = null;
      return;
    }
    idleAction.reset().play();
    if (fromAction && fromAction !== idleAction) {
      idleAction.crossFadeFrom(fromAction, 0.32, false);
    }
    currentAction = idleAction;
  }

  function onAnimationFinished(event) {
    if (event.action === waveAction && currentAction === waveAction) {
      switchToIdle(waveAction);
    } else if (event.action === jumpAction && currentAction === jumpAction) {
      finishJump(true);
    }
  }

  function animate(now) {
    frame = 0;
    if (disposed || document.hidden || motionPreference.matches) return;
    if (now - previousFrameAt >= 33) {
      const delta = previousFrameAt ? Math.min((now - previousFrameAt) / 1000, 0.05) : 0;
      previousFrameAt = now;
      mixer?.update(delta);
      renderer.render(scene, camera);
    }
    if (currentAction || jumpPromise) frame = window.requestAnimationFrame(animate);
  }

  function startAnimation() {
    if (disposed || !ready || document.hidden || motionPreference.matches || frame) return;
    previousFrameAt = 0;
    frame = window.requestAnimationFrame(animate);
  }

  function stopAnimation() {
    if (!frame) return;
    window.cancelAnimationFrame(frame);
    frame = 0;
  }

  function resize() {
    if (!renderer || !canvas) return;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (!width || !height) return;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    if (!frame || motionPreference.matches || document.hidden) renderer.render(scene, camera);
  }

  function jump() {
    if (!ready || disposed || motionPreference.matches || !jumpAction) return null;
    if (jumpPromise) return jumpPromise;

    jumpPromise = new Promise((resolve) => {
      resolveJump = resolve;
      try {
        jumpAction.reset().stopFading().setEffectiveWeight(1).setEffectiveTimeScale(1);
        jumpAction.setLoop(three.LoopOnce, 1);
        jumpAction.clampWhenFinished = true;
        jumpAction.play();
        if (currentAction && currentAction !== jumpAction) {
          jumpAction.crossFadeFrom(currentAction, 0.2, false);
        }
        currentAction = jumpAction;
        jumpSafetyTimer = window.setTimeout(
          () => finishJump(true),
          (jumpAction.getClip().duration + 0.7) * 1000
        );
        startAnimation();
      } catch (error) {
        console.warn('Pip could not start the jump animation.', error);
        finishJump(false);
      }
    });
    return jumpPromise;
  }

  function onMotionChange() {
    if (motionPreference.matches) {
      stopAnimation();
      finishJump(false);
      mixer?.stopAllAction();
      currentAction = null;
      switchToIdle();
      mixer?.update(0);
      if (ready) renderer.render(scene, camera);
      return;
    }
    if (!currentAction) switchToIdle();
    startAnimation();
  }

  function onVisibilityChange() {
    if (document.hidden) stopAnimation();
    else if (motionPreference.matches) renderer?.render(scene, camera);
    else startAnimation();
  }

  function cleanup() {
    if (disposed) return;
    disposed = true;
    stopAnimation();
    window.clearTimeout(jumpSafetyTimer);
    finishJump(false);
    resizeObserver?.disconnect();
    window.removeEventListener('resize', resize);
    window.removeEventListener('pagehide', cleanup);
    document.removeEventListener('visibilitychange', onVisibilityChange);
    motionPreference.removeEventListener('change', onMotionChange);
    mixer?.removeEventListener('finished', onAnimationFinished);
    mixer?.stopAllAction();
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((material) => material.dispose());
    textures.forEach((texture) => texture.dispose());
    renderer?.dispose();
    renderer?.forceContextLoss();
    if (window.DearPipHero?.jump === jump) delete window.DearPipHero;
  }

  window.DearPipHero = { jump };
  if (!canvas || !button || !status) {
    console.warn('The homepage Pip canvas, loading status, or interaction button is unavailable.');
    return;
  }

  window.addEventListener('pagehide', cleanup, { once: true });
  document.addEventListener('visibilitychange', onVisibilityChange);
  motionPreference.addEventListener('change', onMotionChange);
  window.addEventListener('resize', resize);
  if (typeof ResizeObserver === 'function') {
    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
  }

  async function load() {
    try {
      const THREE = await import(threeModuleUrl);
      if (disposed) return;
      three = THREE;
      const { GLTFLoader } = await import(gltfLoaderUrl);
      if (disposed) return;
      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
        powerPreference: 'low-power',
        depth: true,
        stencil: false,
      });
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
      const fillLight = new THREE.DirectionalLight(0xb8baff, 1.0);
      fillLight.position.set(3.5, 2, -3);
      scene.add(fillLight);

      const gltf = await new GLTFLoader().loadAsync(modelUrl, (event) => {
        if (event.lengthComputable && status && !disposed) {
          const percent = Math.round((event.loaded / event.total) * 100);
          if (percent >= lastReportedProgress + 10 || percent === 100) {
            lastReportedProgress = percent;
            status.textContent = `Pip is arriving… ${percent}%`;
          }
        }
      });
      if (disposed) return;
      const model = gltf.scene;
      model.updateMatrixWorld(true);
      const bounds = new THREE.Box3().setFromObject(model);
      const size = bounds.getSize(new THREE.Vector3());
      const center = bounds.getCenter(new THREE.Vector3());
      if (!Number.isFinite(size.y) || size.y <= 0) {
        throw new Error('The GLB has no measurable character height.');
      }

      const modelRoot = new THREE.Group();
      const scale = 2.55 / size.y;
      modelRoot.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale);
      modelRoot.scale.setScalar(scale);
      modelRoot.add(model);
      scene.add(modelRoot);

      const clips = gltf.animations;
      console.info('Homepage Pip GLB animation clips:', clips.map((clip) => ({
        name: clip.name,
        duration: Number(clip.duration.toFixed(3)),
      })));
      const idleClip = clips.find((clip) => clip.name === 'idle');
      const waveClip = clips.find((clip) => clip.name === 'wave');
      const jumpClip = clips.find((clip) => clip.name === 'jump');
      mixer = new THREE.AnimationMixer(model);
      mixer.addEventListener('finished', onAnimationFinished);
      idleAction = idleClip ? mixer.clipAction(idleClip).setLoop(THREE.LoopRepeat, Infinity) : null;
      waveAction = waveClip ? mixer.clipAction(waveClip) : null;
      jumpAction = jumpClip ? mixer.clipAction(jumpClip) : null;

      model.traverse((object) => {
        if (!object.isMesh) return;
        if (object.geometry) geometries.add(object.geometry);
        const objectMaterials = Array.isArray(object.material) ? object.material : [object.material];
        objectMaterials.forEach((material) => {
          if (!material) return;
          materials.add(material);
          Object.values(material).forEach((value) => {
            if (value?.isTexture) textures.add(value);
          });
        });
      });

      ready = true;
      button.setAttribute('aria-busy', 'false');
      status.hidden = true;
      resize();
      if (motionPreference.matches) {
        switchToIdle();
        mixer.update(0);
        renderer.render(scene, camera);
      } else if (waveAction) {
        idleAction?.reset().play();
        waveAction.reset().setLoop(THREE.LoopOnce, 1);
        waveAction.clampWhenFinished = true;
        waveAction.play();
        if (idleAction) waveAction.crossFadeFrom(idleAction, 0.28, false);
        currentAction = waveAction;
        startAnimation();
      } else {
        switchToIdle();
        if (currentAction) startAnimation();
        else renderer.render(scene, camera);
      }
    } catch (error) {
      if (disposed) return;
      status.textContent = 'Pip couldn’t load just now. You can still explore the nursery.';
      status.classList.add('is-error');
      button.setAttribute('aria-busy', 'false');
      console.error(`Could not load or initialize the homepage Pip model at “${modelUrl}”.`, error);
      cleanup();
    }
  }

  load();
})();
