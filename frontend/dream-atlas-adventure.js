(() => {
  const canvas = document.querySelector('#adventureCanvas');
  const context = canvas?.getContext('2d');
  if (!canvas || !context) {
    console.error('Pip’s Wishbound Adventure could not initialize its canvas.');
    return;
  }

  const BASE_WIDTH = 960;
  const BASE_HEIGHT = 540;
  const WORLD_WIDTH = 6100;
  const STORAGE_KEY = 'dear-pip-wishbound-adventure-v1';
  const ACHIEVEMENT_ID = 'first-wishbound-finish';
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const playerImage = new Image();
  playerImage.src = 'assets/pip.png';

  const elements = {
    stage: document.querySelector('.atlas-adventure__stage'),
    startScreen: document.querySelector('#adventureStartScreen'),
    goalInput: document.querySelector('#adventureGoal'),
    pauseScreen: document.querySelector('#adventurePauseScreen'),
    victoryScreen: document.querySelector('#adventureVictoryScreen'),
    gameoverScreen: document.querySelector('#adventureGameoverScreen'),
    destination: document.querySelector('#adventureDestination'),
    stars: document.querySelector('#adventureStars'),
    lives: document.querySelector('#adventureLives'),
    journey: document.querySelector('#adventureJourney'),
    pause: document.querySelector('#adventurePause'),
    restart: document.querySelector('#adventureRestart'),
    newWish: document.querySelector('#adventureNewWish'),
    resume: document.querySelector('#adventureResume'),
    playAgain: document.querySelector('#adventurePlayAgain'),
    tryAgain: document.querySelector('#adventureTryAgain'),
    victoryTitle: document.querySelector('#adventureVictoryTitle'),
    victoryMessage: document.querySelector('#adventureVictoryMessage'),
    achievement: document.querySelector('#adventureAchievement'),
    status: document.querySelector('#adventureStatus'),
    progress: document.querySelector('#adventureProgress'),
  };

  const platforms = [
    { x: 0, y: 450, width: 300 },
    { x: 360, y: 390, width: 220 },
    { x: 640, y: 345, width: 220 },
    { x: 920, y: 390, width: 220 },
    { x: 1200, y: 340, width: 220 },
    { x: 1480, y: 290, width: 220 },
    { x: 1760, y: 350, width: 220 },
    { x: 2040, y: 410, width: 220 },
    { x: 2320, y: 350, width: 220 },
    { x: 2600, y: 300, width: 220 },
    { x: 2880, y: 360, width: 220 },
    { x: 3160, y: 420, width: 220 },
    { x: 3440, y: 360, width: 220 },
    { x: 3720, y: 310, width: 220 },
    { x: 4000, y: 370, width: 220 },
    { x: 4280, y: 420, width: 220 },
    { x: 4560, y: 365, width: 220 },
    { x: 4840, y: 315, width: 220 },
    { x: 5120, y: 375, width: 220 },
    { x: 5400, y: 430, width: 700 },
  ];

  const wishes = [
    { x: 168, y: 410 },
    { x: 448, y: 350 },
    { x: 726, y: 305 },
    { x: 1288, y: 300 },
    { x: 1568, y: 250 },
    { x: 2408, y: 310 },
    { x: 3808, y: 270 },
    { x: 4928, y: 275 },
  ];

  const moths = [
    { x: 1020, y: 320, range: 76, speed: 1.7, phase: 0.4 },
    { x: 1880, y: 280, range: 78, speed: 1.35, phase: 1.5 },
    { x: 3000, y: 310, range: 74, speed: 1.55, phase: 2.4 },
    { x: 4120, y: 320, range: 72, speed: 1.45, phase: 3.1 },
    { x: 5220, y: 325, range: 70, speed: 1.6, phase: 4.1 },
  ];

  const clouds = Array.from({ length: 28 }, (_, index) => ({
    x: index * 243 + (index % 3) * 52,
    y: 52 + (index * 71) % 220,
    size: 24 + (index * 17) % 27,
  }));

  const keys = new Set();
  const touchControls = new Set();
  const activePointers = new Map();
  const collectedWishes = new Set();
  let mode = 'ready';
  let destination = '';
  let cameraX = 0;
  let viewWidth = BASE_WIDTH;
  let elapsed = 0;
  let lastFrame = 0;
  let jumpBuffer = 0;
  let lives = 5;
  let checkpoint = { x: 48, y: 392 };
  let hurtTime = 0;
  let gameSaved = false;
  let achievementAwarded = false;

  const player = {
    x: 48,
    y: 392,
    width: 44,
    height: 58,
    velocityX: 0,
    velocityY: 0,
    grounded: true,
    facing: 1,
  };

  function loadProgress() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      gameSaved = saved?.version === 1 && saved.completed === true;
      achievementAwarded = gameSaved && saved.achievement === ACHIEVEMENT_ID;
      if (gameSaved) {
        elements.progress.hidden = false;
        elements.progress.textContent = 'A wishbound adventure has already been completed on this device.';
      }
    } catch (error) {
      console.error('Could not read Wishbound Adventure progress:', error);
      setStatus('Saved adventure progress could not be read. You can still play this visit.');
    }
  }

  function saveVictory() {
    const firstFinish = !achievementAwarded;
    achievementAwarded = true;
    gameSaved = true;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        version: 1,
        completed: true,
        achievement: ACHIEVEMENT_ID,
      }));
      elements.progress.hidden = false;
      elements.progress.textContent = 'Adventure completed and saved on this device.';
      elements.achievement.textContent = firstFinish
        ? 'Achievement earned: First Wish Fulfilled ✦'
        : 'First Wish Fulfilled achievement already earned.';
    } catch (error) {
      console.error('Could not save Wishbound Adventure progress:', error);
      elements.progress.hidden = false;
      elements.progress.textContent = 'Adventure completed for this visit; browser storage could not save progress.';
      elements.achievement.textContent = firstFinish
        ? 'First Wish Fulfilled achievement earned for this visit.'
        : 'First Wish Fulfilled achievement already earned on this device.';
    }
  }

  function setStatus(message) {
    elements.status.textContent = message;
  }

  function setOverlay(screen) {
    [elements.startScreen, elements.pauseScreen, elements.victoryScreen, elements.gameoverScreen]
      .forEach((item) => { item.hidden = item !== screen; });
  }

  function updateHud() {
    elements.destination.textContent = destination ? `Destination: ${destination}` : 'Destination: not chosen';
    elements.stars.textContent = `${collectedWishes.size} / ${wishes.length} stars`;
    elements.lives.textContent = `${lives} ${lives === 1 ? 'wish' : 'wishes'}`;
    elements.lives.setAttribute('aria-label', `${lives} ${lives === 1 ? 'wish' : 'wishes'} remaining`);
    elements.pause.disabled = mode !== 'playing' && mode !== 'paused';
    elements.restart.disabled = mode === 'ready';
    elements.pause.textContent = mode === 'paused' ? 'Resume' : 'Pause';
    elements.journey.value = Math.min(5660, Math.round(player.x));
  }

  function resetLevel() {
    collectedWishes.clear();
    lives = 5;
    checkpoint = { x: 48, y: 392 };
    hurtTime = 0;
    cameraX = 0;
    elapsed = 0;
    player.x = checkpoint.x;
    player.y = checkpoint.y;
    player.velocityX = 0;
    player.velocityY = 0;
    player.grounded = true;
    player.facing = 1;
    keys.clear();
    touchControls.clear();
    activePointers.clear();
    jumpBuffer = 0;
  }

  function startAdventure(goal) {
    const requestedDestination = goal.trim().replace(/\s+/g, ' ');
    if (!requestedDestination) {
      elements.goalInput.setCustomValidity('Please enter a wish for Pip to follow.');
      elements.goalInput.reportValidity();
      return;
    }
    if (requestedDestination.length > elements.goalInput.maxLength) {
      elements.goalInput.setCustomValidity(`Please keep your wish to ${elements.goalInput.maxLength} characters or fewer.`);
      elements.goalInput.reportValidity();
      return;
    }
    elements.goalInput.setCustomValidity('');
    destination = requestedDestination;
    resetLevel();
    mode = 'playing';
    setOverlay(null);
    setStatus(`Adventure started. Find your way to ${destination}!`);
    updateHud();
    canvas.focus({ preventScroll: true });
  }

  function openNewWish() {
    resetLevel();
    destination = '';
    elements.goalInput.value = '';
    elements.goalInput.setCustomValidity('');
    elements.achievement.textContent = '';
    mode = 'ready';
    setOverlay(elements.startScreen);
    setStatus('Choose a new wish for Pip to follow.');
    updateHud();
    elements.goalInput.focus({ preventScroll: true });
  }

  function togglePause() {
    if (mode === 'playing') {
      releaseAllAdventureControls();
      mode = 'paused';
      setOverlay(elements.pauseScreen);
      setStatus('Adventure paused.');
    } else if (mode === 'paused') {
      mode = 'playing';
      setOverlay(null);
      setStatus(`Back to the journey to ${destination}.`);
      canvas.focus({ preventScroll: true });
    } else {
      return;
    }
    updateHud();
  }

  function loseWish() {
    lives -= 1;
    if (lives <= 0) {
      mode = 'gameover';
      setOverlay(elements.gameoverScreen);
      setStatus('Pip needs a rest. Start again when you are ready.');
    } else {
      player.x = checkpoint.x;
      player.y = checkpoint.y;
      player.velocityX = 0;
      player.velocityY = 0;
      player.grounded = true;
      hurtTime = 1.4;
      keys.clear();
      touchControls.clear();
      cameraX = Math.max(0, checkpoint.x - viewWidth * 0.32);
      setStatus(`A gentle restart at the last cloud. ${lives} wishes left.`);
    }
    updateHud();
  }

  function completeAdventure() {
    mode = 'victory';
    setOverlay(elements.victoryScreen);
    elements.victoryTitle.textContent = `Pip found ${destination}!`;
    elements.victoryMessage.textContent = `Every little step led to ${destination}. What a lovely wish to follow.`;
    saveVictory();
    setStatus(`Pip reached ${destination}. Wish fulfilled!`);
    updateHud();
  }

  function resizeCanvas() {
    const bounds = canvas.getBoundingClientRect();
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    if (!bounds.width || !bounds.height) return;
    const width = Math.round(bounds.width * pixelRatio);
    const height = Math.round(bounds.height * pixelRatio);
    if (canvas.width === width && canvas.height === height) return;
    canvas.width = width;
    canvas.height = height;
    viewWidth = BASE_HEIGHT * (width / height);
    cameraX = Math.min(cameraX, Math.max(0, WORLD_WIDTH - viewWidth));
    if (mode === 'playing' || mode === 'paused') {
      cameraX = Math.max(0, Math.min(WORLD_WIDTH - viewWidth, player.x - viewWidth * 0.34));
    }
  }

  function roundedRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
  }

  function drawCloud(ctx, x, y, size, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(x, y, size, size * 0.34, 0, 0, Math.PI * 2);
    ctx.ellipse(x - size * 0.42, y - size * 0.12, size * 0.44, size * 0.34, 0, 0, Math.PI * 2);
    ctx.ellipse(x + size * 0.28, y - size * 0.19, size * 0.52, size * 0.43, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawStar(ctx, x, y, outerRadius, innerRadius, points = 5) {
    ctx.beginPath();
    for (let index = 0; index < points * 2; index += 1) {
      const angle = -Math.PI / 2 + (index * Math.PI) / points;
      const radius = index % 2 === 0 ? outerRadius : innerRadius;
      const px = x + Math.cos(angle) * radius;
      const py = y + Math.sin(angle) * radius;
      if (index === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  }

  function drawBackground(ctx, lightMode) {
    const sky = ctx.createLinearGradient(0, 0, 0, BASE_HEIGHT);
    if (lightMode) {
      sky.addColorStop(0, '#cfc8ee');
      sky.addColorStop(0.68, '#e8d9ef');
      sky.addColorStop(1, '#f7e6d7');
    } else {
      sky.addColorStop(0, '#232447');
      sky.addColorStop(0.68, '#493d70');
      sky.addColorStop(1, '#80648e');
    }
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, viewWidth, BASE_HEIGHT);

    ctx.save();
    for (let index = 0; index < 48; index += 1) {
      const worldX = (index * 211 + 40) % WORLD_WIDTH;
      const x = ((worldX - cameraX * 0.2) % (WORLD_WIDTH + viewWidth) + WORLD_WIDTH + viewWidth) % (WORLD_WIDTH + viewWidth) - 30;
      const y = 24 + (index * 67) % 260;
      ctx.globalAlpha = lightMode ? 0.28 : 0.65;
      ctx.fillStyle = index % 4 === 0 ? '#fff0b1' : '#fff9e9';
      drawStar(ctx, x, y, 2.8 + (index % 3), 1.1, 4);
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = lightMode ? 'rgba(255, 247, 223, .76)' : 'rgba(255, 244, 208, .9)';
    ctx.beginPath();
    ctx.arc(Math.min(viewWidth - 70, viewWidth * 0.82), 112, 42, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = lightMode ? 'rgba(206, 199, 231, .42)' : 'rgba(57, 51, 91, .5)';
    ctx.beginPath();
    ctx.arc(Math.min(viewWidth - 58, viewWidth * 0.84), 98, 38, 0, Math.PI * 2);
    ctx.fill();

    clouds.forEach((cloud) => {
      const x = cloud.x - cameraX * 0.38;
      if (x < -cloud.size * 2 || x > viewWidth + cloud.size * 2) return;
      ctx.globalAlpha = lightMode ? 0.42 : 0.2;
      drawCloud(ctx, x, cloud.y, cloud.size, lightMode ? '#fffaf8' : '#d9d0ef');
    });
    ctx.globalAlpha = 1;
    ctx.restore();

    ctx.fillStyle = lightMode ? 'rgba(160, 143, 190, .24)' : 'rgba(19, 22, 49, .23)';
    ctx.beginPath();
    ctx.moveTo(0, 400);
    for (let x = 0; x <= viewWidth + 60; x += 60) {
      const worldX = x + cameraX * 0.12;
      ctx.lineTo(x, 385 + Math.sin(worldX * 0.004) * 18);
    }
    ctx.lineTo(viewWidth, BASE_HEIGHT);
    ctx.lineTo(0, BASE_HEIGHT);
    ctx.closePath();
    ctx.fill();
  }

  function drawPlatform(ctx, platform, lightMode) {
    const y = platform.y;
    const x = platform.x;
    const cloudColor = lightMode ? '#fffaf8' : '#f0e6fa';
    const shadowColor = lightMode ? '#c0afd7' : '#9f8cbb';
    ctx.fillStyle = shadowColor;
    roundedRect(ctx, x, y + 13, platform.width, 22, 12);
    ctx.fill();
    ctx.fillStyle = cloudColor;
    roundedRect(ctx, x, y + 3, platform.width, 25, 13);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 35, y + 7, 16, Math.PI, Math.PI * 2);
    ctx.arc(x + platform.width * 0.44, y + 1, 23, Math.PI, Math.PI * 2);
    ctx.arc(x + platform.width * 0.76, y + 6, 17, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = lightMode ? 'rgba(255,255,255,.62)' : 'rgba(255,255,255,.26)';
    ctx.fillRect(x + 17, y + 5, Math.max(24, platform.width - 35), 3);
  }

  function drawMoth(ctx, moth, lightMode) {
    const x = moth.x + Math.sin(elapsed * moth.speed + moth.phase) * moth.range;
    const flutter = reducedMotion.matches ? 0 : Math.sin(elapsed * 8 + moth.phase) * 4;
    ctx.save();
    ctx.translate(x, moth.y + flutter);
    ctx.fillStyle = lightMode ? '#9b668d' : '#f3c7e2';
    ctx.beginPath();
    ctx.ellipse(-6, 0, 7, 4, -0.45, 0, Math.PI * 2);
    ctx.ellipse(6, 0, 7, 4, 0.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffe7a1';
    ctx.beginPath();
    ctx.arc(0, 0, 2.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawWorld(ctx, lightMode) {
    ctx.save();
    ctx.translate(-cameraX, 0);
    platforms.forEach((platform) => drawPlatform(ctx, platform, lightMode));

    wishes.forEach((wish, index) => {
      if (collectedWishes.has(index)) return;
      const bob = reducedMotion.matches ? 0 : Math.sin(elapsed * 2.8 + index) * 5;
      const pulse = reducedMotion.matches ? 1 : 1 + Math.sin(elapsed * 4 + index) * 0.1;
      ctx.save();
      ctx.shadowColor = '#ffd66f';
      ctx.shadowBlur = 16;
      ctx.fillStyle = '#ffd66f';
      drawStar(ctx, wish.x, wish.y + bob, 13 * pulse, 5 * pulse);
      ctx.restore();
    });

    moths.forEach((moth) => drawMoth(ctx, moth, lightMode));

    const gateX = 5660;
    ctx.fillStyle = lightMode ? 'rgba(128, 93, 153, .34)' : 'rgba(220, 192, 255, .38)';
    roundedRect(ctx, gateX, 270, 14, platforms[platforms.length - 1].y - 270, 7);
    ctx.fill();
    ctx.fillStyle = '#ffdf8b';
    ctx.shadowColor = '#ffdf8b';
    ctx.shadowBlur = 18;
    drawStar(ctx, gateX + 7, 258, 17, 7);
    ctx.shadowBlur = 0;
    ctx.fillStyle = lightMode ? '#534064' : '#fff1ca';
    ctx.font = '700 13px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText(destination || 'YOUR WISH', gateX + 7, 246);
    ctx.restore();

    drawPlayer(ctx, lightMode);
  }

  function drawPlayer(ctx, lightMode) {
    const frame = reducedMotion.matches ? 0 : Math.floor(elapsed * 12) % 2;
    const bob = mode === 'playing' && player.grounded && Math.abs(player.velocityX) > 4 ? (frame ? -2 : 0) : 0;
    const drawX = player.x - cameraX - (player.width - 42) / 2;
    const drawY = player.y + bob;
    ctx.save();
    if (hurtTime > 0 && Math.floor(hurtTime * 12) % 2 === 0) ctx.globalAlpha = 0.45;
    if (player.facing < 0) {
      ctx.translate(drawX + player.width / 2, 0);
      ctx.scale(-1, 1);
      ctx.translate(-(drawX + player.width / 2), 0);
    }
    if (playerImage.complete && playerImage.naturalWidth) {
      ctx.drawImage(playerImage, drawX, drawY, 42, 58);
    } else {
      ctx.fillStyle = lightMode ? '#fff1d8' : '#f7e8d2';
      ctx.beginPath();
      ctx.ellipse(player.x + player.width / 2 - cameraX, player.y + 28, 18, 25, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#362b40';
      ctx.beginPath();
      ctx.arc(player.x + player.width / 2 - cameraX + 6, player.y + 25, 2.3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function draw() {
    const lightMode = document.documentElement.dataset.mood === 'dawn';
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = lightMode ? '#cfc8ee' : '#232447';
    context.fillRect(0, 0, canvas.width, canvas.height);
    const scale = canvas.height / BASE_HEIGHT;
    context.setTransform(
      scale,
      0,
      0,
      scale,
      0,
      0,
    );
    drawBackground(context, lightMode);
    drawWorld(context, lightMode);
  }

  function intersectsPlayer(x, y, width, height) {
    const playerLeft = player.x + 10;
    const playerRight = player.x + player.width - 8;
    const playerTop = player.y + 7;
    const playerBottom = player.y + player.height - 3;
    return playerRight > x && playerLeft < x + width && playerBottom > y && playerTop < y + height;
  }

  function update(deltaTime) {
    elapsed += deltaTime;
    jumpBuffer = Math.max(0, jumpBuffer - deltaTime);
    hurtTime = Math.max(0, hurtTime - deltaTime);
    const movingLeft = keys.has('ArrowLeft') || keys.has('a') || touchControls.has('left');
    const movingRight = keys.has('ArrowRight') || keys.has('d') || touchControls.has('right');
    const horizontal = Number(movingRight) - Number(movingLeft);
    player.velocityX = horizontal * 300;
    if (horizontal) player.facing = horizontal;
    if (jumpBuffer > 0 && player.grounded) {
      player.velocityY = -680;
      player.grounded = false;
      jumpBuffer = 0;
    }

    const previousBottom = player.y + player.height - 3;
    player.x = Math.max(0, Math.min(WORLD_WIDTH - player.width, player.x + player.velocityX * deltaTime));
    elements.journey.value = Math.min(5660, Math.round(player.x));
    player.velocityY = Math.min(900, player.velocityY + 1450 * deltaTime);
    player.y += player.velocityY * deltaTime;
    player.grounded = false;

    if (player.velocityY >= 0) {
      const nextBottom = player.y + player.height - 3;
      platforms.forEach((platform) => {
        const overlaps = player.x + player.width - 8 > platform.x && player.x + 10 < platform.x + platform.width;
        if (overlaps && previousBottom <= platform.y && nextBottom >= platform.y) {
          player.y = platform.y - player.height + 3;
          player.velocityY = 0;
          player.grounded = true;
          if (platform.x + 24 > checkpoint.x) checkpoint = { x: platform.x + 24, y: platform.y - player.height + 3 };
        }
      });
    }

    wishes.forEach((wish, index) => {
      if (!collectedWishes.has(index) && intersectsPlayer(wish.x - 12, wish.y - 12, 24, 24)) {
        collectedWishes.add(index);
        setStatus(`Golden wish collected. ${collectedWishes.size} of ${wishes.length} stars found.`);
        updateHud();
      }
    });

    if (hurtTime === 0 && moths.some((moth) => {
      const x = moth.x + Math.sin(elapsed * moth.speed + moth.phase) * moth.range;
      return intersectsPlayer(x - 11, moth.y - 9, 22, 18);
    })) {
      loseWish();
      return;
    }

    if (player.y > BASE_HEIGHT + 130) {
      loseWish();
      return;
    }

    cameraX = Math.max(0, Math.min(WORLD_WIDTH - viewWidth, player.x - viewWidth * 0.34));
    if (player.x + player.width >= 5660 && player.grounded) completeAdventure();
  }

  function frame(timestamp) {
    if (document.hidden) {
      lastFrame = timestamp;
      requestAnimationFrame(frame);
      return;
    }
    const deltaTime = lastFrame ? Math.min((timestamp - lastFrame) / 1000, 0.04) : 0;
    lastFrame = timestamp;
    if (mode === 'playing') update(deltaTime);
    draw();
    requestAnimationFrame(frame);
  }

  elements.startScreen.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!elements.startScreen.reportValidity()) return;
    startAdventure(elements.goalInput.value);
  });

  elements.pause.addEventListener('click', togglePause);
  elements.resume.addEventListener('click', togglePause);
  elements.restart.addEventListener('click', () => startAdventure(destination));
  elements.playAgain.addEventListener('click', () => startAdventure(destination));
  elements.tryAgain.addEventListener('click', () => startAdventure(destination));
  elements.newWish.addEventListener('click', openNewWish);
  document.querySelectorAll('[data-adventure-new-wish]').forEach((button) => {
    button.addEventListener('click', openNewWish);
  });
  elements.goalInput.addEventListener('input', () => elements.goalInput.setCustomValidity(''));
  elements.goalInput.addEventListener('invalid', () => {
    if (!elements.goalInput.value.trim()) {
      elements.goalInput.setCustomValidity('Please enter a wish for Pip to follow.');
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.target instanceof HTMLElement) {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName)) return;
      if (event.target !== canvas && event.target.closest('button, a')) return;
    }
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', ' ', 'a', 'd'].includes(key)) event.preventDefault();
    if (key === 'Escape' && (mode === 'playing' || mode === 'paused')) {
      togglePause();
      return;
    }
    if (key === ' ' || key === 'ArrowUp') jumpBuffer = 0.16;
    keys.add(key);
  });

  document.addEventListener('keyup', (event) => {
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    keys.delete(key);
  });

  function releaseAllAdventureControls() {
    keys.clear();
    touchControls.clear();
    activePointers.clear();
    jumpBuffer = 0;
  }

  window.addEventListener('blur', releaseAllAdventureControls);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) releaseAllAdventureControls();
  });

  document.querySelectorAll('[data-adventure-control]').forEach((button) => {
    const control = button.dataset.adventureControl;
    button.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      if (mode !== 'playing') return;
      button.setPointerCapture(event.pointerId);
      activePointers.set(event.pointerId, control);
      if (control === 'jump') jumpBuffer = 0.16;
      else touchControls.add(control);
    });
    const release = (event) => {
      if (activePointers.get(event.pointerId) !== control) return;
      activePointers.delete(event.pointerId);
      if (![...activePointers.values()].includes(control)) touchControls.delete(control);
    };
    button.addEventListener('pointerup', release);
    button.addEventListener('pointercancel', release);
    button.addEventListener('pointerleave', (event) => {
      if (!button.hasPointerCapture(event.pointerId)) release(event);
    });
    button.addEventListener('lostpointercapture', release);
    button.addEventListener('contextmenu', (event) => event.preventDefault());
  });

  if (typeof ResizeObserver === 'function') {
    new ResizeObserver(resizeCanvas).observe(elements.stage);
  }
  window.addEventListener('resize', resizeCanvas);

  loadProgress();
  resizeCanvas();
  updateHud();
  setOverlay(elements.startScreen);
  requestAnimationFrame(frame);
})();
