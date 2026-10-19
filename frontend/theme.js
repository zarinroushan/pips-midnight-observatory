(() => {
  const storageKey = 'dear-pip-mood-v1';
  const root = document.documentElement;
  const themeColor = (mood) => (mood === 'dawn' ? '#e9edf5' : '#17152c');
  let currentMood = 'night';

  try {
    const savedMood = localStorage.getItem(storageKey);
    if (savedMood === 'dawn' || savedMood === 'night') currentMood = savedMood;
  } catch (error) {
    console.error('Could not read the saved nursery mood:', error);
  }

  function applyMood(mood, persist = false) {
    currentMood = mood === 'dawn' ? 'dawn' : 'night';
    root.dataset.mood = currentMood;
    if (document.body) document.body.dataset.mood = currentMood;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', themeColor(currentMood));

    const isDawn = currentMood === 'dawn';
    document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
      button.setAttribute('aria-pressed', String(isDawn));
      button.setAttribute('aria-label', `Switch to ${isDawn ? 'dark' : 'light'} theme`);
      const icon = button.querySelector('[data-theme-icon]');
      if (icon) icon.textContent = isDawn ? '☀' : '☾';
      const label = button.querySelector('[data-theme-label]');
      if (label) label.textContent = isDawn ? 'Light mode' : 'Dark mode';
    });

    if (persist) {
      try {
        localStorage.setItem(storageKey, currentMood);
      } catch (error) {
        console.error('Could not save the nursery mood:', error);
      }
    }

    window.DearPipSounds?.setAmbienceTheme(currentMood);
  }

  function initializeToggles() {
    if (document.body) document.body.dataset.mood = currentMood;
    document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
      button.addEventListener('click', () => {
        applyMood(currentMood === 'dawn' ? 'night' : 'dawn', true);
        window.DearPipSounds?.play('theme-toggle');
      });
    });
    applyMood(currentMood);
  }

  root.dataset.mood = currentMood;
  window.DearPipTheme = { apply: applyMood };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeToggles, { once: true });
  } else {
    initializeToggles();
  }
})();
