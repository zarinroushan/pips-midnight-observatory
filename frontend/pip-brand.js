(() => {
  const canvas = document.querySelector('[data-pip-brand-canvas]');
  if (!canvas) return;

  const mascot = canvas.closest('.brand-mascot');
  mascot?.addEventListener('click', () => {
    if (!instance || !activeName || motionPreference.matches) return;

    instance.play(activeName);
  });
  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  let instance = null;
  let activeName = null;

  const showFallback = (reason) => {
    mascot?.classList.add('is-unavailable');
    console.warn('Dear Pip header mascot could not load its Rive animation.', reason || 'No animation was available.');
  };

  if (!window.rive) {
    showFallback('The Rive runtime did not load.');
    return;
  }

  const playSelection = () => {
    if (!instance || motionPreference.matches || !activeName) return;
    instance.play(activeName);
  };

  mascot?.addEventListener('click', () => {
    if (!instance || !activeName || motionPreference.matches) return;

    instance.stop();
    instance.play(activeName);
  });

  try {
    instance = new rive.Rive({
      src: 'assets/pip-body.riv',
      canvas,
      autoplay: false,
      layout: new rive.Layout({ fit: rive.Fit.Contain, alignment: rive.Alignment.Center }),
      onLoad: () => {
        instance.resizeDrawingSurfaceToCanvas();
        const animations = instance.animationNames || [];
        const stateMachines = instance.stateMachineNames || [];
        activeName = animations.includes('Pip In Action 2') ? 'Pip In Action 2' : animations[0] || stateMachines[0] || null;
        if (!activeName) {
          showFallback('The Rive file contains no playable animation or state machine.');
          return;
        }
        if (activeName !== 'Pip In Action 2') {
          console.info('Dear Pip header mascot selected an animation reported by the asset:', activeName);
        }
        playSelection();
      },
      onLoadError: showFallback,
    });
  } catch (error) {
    showFallback(error);
    return;
  }

  window.addEventListener('resize', () => instance?.resizeDrawingSurfaceToCanvas());
  motionPreference.addEventListener?.('change', () => {
    if (motionPreference.matches) instance?.pause();
    else playSelection();
  });
})();
