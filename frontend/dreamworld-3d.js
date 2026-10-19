const threeModuleUrl = 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
const canvas = document.querySelector('#dreamworldCanvas');
const scenePanel = document.querySelector('#dreamworldScene');
const sceneStatus = document.querySelector('#dreamworldSceneStatus');
const worldLabel = document.querySelector('#dreamworldWorldLabel');
const destinationButtons = [...document.querySelectorAll('.dreamworld-location')];
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const gltfLoaderUrl = 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js';
const pipModelUrl = new URL('assets/animated_pip.glb', document.baseURI).href;
let requestedDayMix = document.documentElement.dataset.mood === 'dawn' ? 1 : 0;
let updateMoodTransition = null;
const themeObserver = new MutationObserver(() => {
  requestedDayMix = document.documentElement.dataset.mood === 'dawn' ? 1 : 0;
  updateMoodTransition?.();
});
themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-mood'] });

const destinations = [
  { key: 'workshop', x: -8.3, y: -1.1, z: 1.2, color: 0xffc66e, surface: 0x777392 },
  { key: 'garden', x: -4.25, y: 1.75, z: -1.8, color: 0xf28fbd, surface: 0x577b70 },
  { key: 'atlas', x: 0, y: 4.1, z: -2.5, color: 0x8dc8ff, surface: 0x6c638e },
  { key: 'stories', x: 4.25, y: 1.3, z: 0.2, color: 0xffcf8a, surface: 0x80646f },
  { key: 'lullaby', x: 8.3, y: -0.9, z: -1.5, color: 0xc39cff, surface: 0x655e85 },
];

function showFallback(error) {
  themeObserver.disconnect();
  document.body.classList.remove('dreamworld-3d-ready');
  canvas.hidden = false;
  canvas.setAttribute('aria-hidden', 'true');
  sceneStatus.textContent = 'The 3D Dreamworld could not start. Please refresh the page to try again.';
  sceneStatus.hidden = false;
  console.error('The Three.js Dreamworld could not start.', error);
}

async function waitForPageScripts() {
  if (document.readyState !== 'loading') return;
  await new Promise((resolve) => {
    document.addEventListener('DOMContentLoaded', resolve, { once: true });
  });
}

function createRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function createStarField(THREE, scene, count, spread, seed, size, opacity) {
  const random = createRandom(seed);
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const palette = [0xffe8b0, 0xc9b9ff, 0xa9d3ff, 0xffc4dd];

  for (let index = 0; index < count; index += 1) {
    const offset = index * 3;
    positions[offset] = (random() - 0.5) * spread;
    positions[offset + 1] = random() * spread * 0.68 + 0.5;
    positions[offset + 2] = -13 - random() * 19;
    const color = new THREE.Color(palette[Math.floor(random() * palette.length)]);
    colors[offset] = color.r;
    colors[offset + 1] = color.g;
    colors[offset + 2] = color.b;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  const material = new THREE.PointsMaterial({
    size,
    sizeAttenuation: true,
    vertexColors: true,
    transparent: true,
    opacity,
    depthWrite: false,
  });
  const stars = new THREE.Points(geometry, material);
  scene.add(stars);
  return stars;
}

function makeMaterial(THREE, color, options = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.76,
    metalness: 0.02,
    ...options,
  });
}

function createMoon(THREE, scene, materials, geometries) {
  const moonShape = new THREE.Shape();
  const outerRadius = 1.42;
  const innerCenter = 0.84;
  const innerRadius = 1.34;
  const outerAngle = Math.PI / 3;
  const innerAngle = Math.acos((outerRadius * Math.cos(outerAngle) - innerCenter) / innerRadius);
  moonShape.absarc(0, 0, outerRadius, -outerAngle, outerAngle, false);
  moonShape.absarc(innerCenter, 0, innerRadius, innerAngle, Math.PI * 2 - innerAngle, true);

  const geometry = new THREE.ExtrudeGeometry(moonShape, {
    depth: 0.14,
    bevelEnabled: true,
    bevelSegments: 3,
    steps: 1,
    bevelSize: 0.07,
    bevelThickness: 0.06,
    curveSegments: 32,
  });
  geometries.push(geometry);

  const material = makeMaterial(THREE, 0xfff0bd, {
    color: 0xffedbd,
    emissive: 0xffbe65,
    emissiveIntensity: 0.62,
    roughness: 0.38,
    metalness: 0.06,
    transparent: true,
    depthWrite: false,
  });
  materials.push(material);
  const moon = new THREE.Mesh(geometry, material);
  moon.position.set(-6.8, 6.7, -12);
  moon.scale.setScalar(1.05);
  scene.add(moon);

  const haloMaterial = new THREE.MeshBasicMaterial({
    color: 0xffd995,
    transparent: true,
    opacity: 0.1,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  materials.push(haloMaterial);
  const haloGeometry = new THREE.CircleGeometry(2.18, 48);
  geometries.push(haloGeometry);
  const halo = new THREE.Mesh(haloGeometry, haloMaterial);
  halo.position.set(-7.5, 8.5, -12.3);
  scene.add(halo);
  return { moon, halo };
}

function makeHorizonShape(THREE, points, material, z, geometries, parent) {
  const shape = new THREE.Shape();
  shape.moveTo(points[0][0], points[0][1]);
  points.slice(1).forEach(([x, y]) => shape.lineTo(x, y));
  shape.closePath();
  const geometry = new THREE.ShapeGeometry(shape);
  geometries.push(geometry);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.z = z;
  parent.add(mesh);
  return mesh;
}

function addDreamHorizon(THREE, scene, materials, geometries, dayMix) {
  const skyMaterial = new THREE.ShaderMaterial({
    uniforms: { dayMix: { value: dayMix } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: `
      varying vec2 vUv;
      uniform float dayMix;
      void main(){
        vec3 nightBottom=vec3(0.13,0.12,0.28), nightHorizon=vec3(0.38,0.25,0.46), nightTop=vec3(0.045,0.075,0.17);
        vec3 dayBottom=vec3(1.0,0.82,0.70), dayHorizon=vec3(0.90,0.77,0.86), dayTop=vec3(0.45,0.68,0.88);
        vec3 bottom=mix(nightBottom,dayBottom,dayMix), horizon=mix(nightHorizon,dayHorizon,dayMix), top=mix(nightTop,dayTop,dayMix);
        vec3 color=mix(bottom,horizon,smoothstep(0.02,0.64,vUv.y));
        color=mix(color,top,smoothstep(0.48,1.0,vUv.y));
        float haze=exp(-pow((vUv.y-0.36)*8.0,2.0))*0.12;
        color=mix(color,vec3(1.0,0.78,0.72),haze*dayMix);
        gl_FragColor=vec4(color,1.0);
      }`,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });
  materials.push(skyMaterial);
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(100, 58), skyMaterial);
  geometries.push(sky.geometry);
  sky.position.set(0, 7.5, -30);
  sky.renderOrder = -100;
  scene.add(sky);

  const landscape = new THREE.Group();
  scene.add(landscape);
  const palette = [
    { night: 0x403657, day: 0x8795b0, opacity: 0.84 },
    { night: 0x59466f, day: 0xb4a2bd, opacity: 0.88 },
    { night: 0x75608c, day: 0xd0b8c4, opacity: 0.92 },
  ];
  const sceneryMaterials = palette.map(({ night, day, opacity }) => {
    const material = new THREE.MeshBasicMaterial({ color: night, transparent: true, opacity, depthWrite: false });
    materials.push(material);
    material.userData.themeDayColor = new THREE.Color(day);
    material.userData.themeNightColor = new THREE.Color(night);
    return material;
  });
  makeHorizonShape(THREE, [[-22,-8],[-22,-2.5],[-18,-0.4],[-14,-2.8],[-10,0.6],[-6,-2.2],[-2,0.1],[2,-2.4],[7,0.8],[12,-2.5],[17,0.2],[22,-2.6],[22,-8]], sceneryMaterials[0], -16, geometries, landscape);
  makeHorizonShape(THREE, [[-22,-8],[-22,-3.8],[-17,-2.1],[-12,-3.4],[-7,-1.7],[-2,-3.6],[4,-1.9],[9,-3.7],[15,-1.8],[22,-3.5],[22,-8]], sceneryMaterials[1], -14.8, geometries, landscape);
  makeHorizonShape(THREE, [[-22,-8],[-22,-5],[-16,-4.4],[-12,-4.9],[-6,-4.1],[0,-4.8],[7,-4.0],[13,-4.9],[18,-4.3],[22,-5],[22,-8]], sceneryMaterials[2], -13.5, geometries, landscape);

  const lakeMaterial = new THREE.MeshBasicMaterial({ color: 0x8b78a9, transparent: true, opacity: 0.5, depthWrite: false });
  materials.push(lakeMaterial);
  lakeMaterial.userData.themeDayColor = new THREE.Color(0xb2c7dd);
  lakeMaterial.userData.themeNightColor = new THREE.Color(0x716289);
  const lake = new THREE.Mesh(new THREE.PlaneGeometry(30, 4), lakeMaterial);
  geometries.push(lake.geometry);
  lake.position.set(0, -5.45, -12.9);
  landscape.add(lake);
  const glintMaterial = new THREE.MeshBasicMaterial({ color: 0xffdba1, transparent: true, opacity: 0.25, depthWrite: false });
  materials.push(glintMaterial);
  glintMaterial.userData.themeDayColor = new THREE.Color(0xfff2d2);
  glintMaterial.userData.themeNightColor = new THREE.Color(0xf8c779);
  const glints = new THREE.Group();
  landscape.add(glints);
  for (let index = 0; index < 10; index += 1) {
    const width = 0.35 + (index % 3) * 0.27;
    const geometry = new THREE.PlaneGeometry(width, 0.025 + (index % 2) * 0.015);
    geometries.push(geometry);
    const line = new THREE.Mesh(geometry, glintMaterial);
    line.position.set(-5.5 + index * 1.2, -5.1 + (index % 4) * 0.25, -12.75);
    glints.add(line);
  }

  const shootingStars = [];
  for (let index = 0; index < 3; index += 1) {
    const material = new THREE.LineBasicMaterial({ color: 0xffe8bd, transparent: true, opacity: 0, depthWrite: false });
    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-0.65, 0.22, 0),
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0.36, -0.12, 0),
    ]);
    materials.push(material); geometries.push(geometry);
    const streak = new THREE.Line(geometry, material);
    streak.position.set(-10 + index * 9, 5.5 + (index % 2) * 2, -10);
    landscape.add(streak);
    shootingStars.push({ material, phase: index * 8.3 });
  }

  const village = new THREE.Group();
  landscape.add(village);
  const wall = new THREE.MeshStandardMaterial({ color: 0xd9b59a, roughness: 0.95 });
  const roof = new THREE.MeshStandardMaterial({ color: 0x75526d, roughness: 0.9 });
  const windows = new THREE.MeshBasicMaterial({ color: 0xffd47a });
  materials.push(wall, roof, windows);
  wall.userData.themeDayColor = new THREE.Color(0xf6e2c7); wall.userData.themeNightColor = new THREE.Color(0x9c7d91);
  roof.userData.themeDayColor = new THREE.Color(0xa87579); roof.userData.themeNightColor = new THREE.Color(0x554564);
  windows.userData.themeDayColor = new THREE.Color(0xffe7b5); windows.userData.themeNightColor = new THREE.Color(0xffc75e);
  for (let index = 0; index < 9; index += 1) {
    const x = -10 + index * 2.5;
    const height = 0.38 + (index % 3) * 0.16;
    const house = new THREE.Group();
    house.position.set(x, -3.35 + (index % 2) * 0.11, -12 + (index % 3) * 0.08);
    const bodyGeometry = new THREE.BoxGeometry(0.65 + (index % 2) * 0.16, height, 0.58);
    const roofGeometry = new THREE.ConeGeometry(0.55, 0.38, 4);
    const windowGeometry = new THREE.PlaneGeometry(0.11, 0.16);
    geometries.push(bodyGeometry, roofGeometry, windowGeometry);
    const body = new THREE.Mesh(bodyGeometry, wall); body.position.y = height / 2; house.add(body);
    const cap = new THREE.Mesh(roofGeometry, roof); cap.position.y = height + 0.13; cap.rotation.y = Math.PI / 4; house.add(cap);
    const window = new THREE.Mesh(windowGeometry, windows); window.position.set(0.08, height * 0.48, 0.3); house.add(window);
    village.add(house);
  }

  const edgeDecor = new THREE.Group();
  scene.add(edgeDecor);
  const foliage = new THREE.MeshStandardMaterial({ color: 0x597b68, roughness: 0.9 });
  const blossoms = new THREE.MeshStandardMaterial({ color: 0xf2b5ca, emissive: 0x6a2949, emissiveIntensity: 0.14, roughness: 0.7 });
  const lanterns = new THREE.MeshBasicMaterial({ color: 0xffd483, transparent: true, opacity: 0.92 });
  materials.push(foliage, blossoms, lanterns);
  foliage.userData.themeDayColor = new THREE.Color(0x688d60); foliage.userData.themeNightColor = new THREE.Color(0x405367);
  blossoms.userData.themeDayColor = new THREE.Color(0xf1b3bb); blossoms.userData.themeNightColor = new THREE.Color(0xd29abd);
  for (const side of [-1, 1]) {
    for (let index = 0; index < 4; index += 1) {
      const sprig = new THREE.Group();
      sprig.position.set(side * (12.2 + (index % 2) * 1.2), -3.8 + index * 1.9, -6.7 - (index % 2) * 0.6);
      sprig.rotation.z = side * (0.24 + index * 0.035);
      const stemGeometry = new THREE.CylinderGeometry(0.035, 0.05, 1.15, 5);
      const leafGeometry = new THREE.SphereGeometry(0.28, 8, 6);
      const bloomGeometry = new THREE.SphereGeometry(0.095, 8, 6);
      geometries.push(stemGeometry, leafGeometry, bloomGeometry);
      const stem = new THREE.Mesh(stemGeometry, foliage); sprig.add(stem);
      for (const branch of [-1, 1]) {
        const leaf = new THREE.Mesh(leafGeometry, foliage);
        leaf.position.set(branch * 0.23, branch * 0.15, 0); leaf.scale.set(1.15, 0.48, 0.55); sprig.add(leaf);
        const bloom = new THREE.Mesh(bloomGeometry, blossoms);
        bloom.position.set(branch * 0.32, 0.52 + branch * 0.12, 0.02); sprig.add(bloom);
      }
      edgeDecor.add(sprig);
      if (index === 1 || index === 3) {
        const cordGeometry = new THREE.CylinderGeometry(0.012, 0.012, 0.48, 5);
        const lanternGeometry = new THREE.SphereGeometry(0.12, 10, 8);
        geometries.push(cordGeometry, lanternGeometry);
        const cord = new THREE.Mesh(cordGeometry, foliage); cord.position.set(0, 0.65, -0.12); sprig.add(cord);
        const lamp = new THREE.Mesh(lanternGeometry, lanterns); lamp.position.set(0, 0.36, -0.12); sprig.add(lamp);
      }
    }
  }

  const sunGroup = new THREE.Group();
  sunGroup.position.set(8.5, 7.4, -13.5);
  const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffe4a5, transparent: true, opacity: 0.95, depthWrite: false });
  const sunGlowMaterial = new THREE.MeshBasicMaterial({ color: 0xffdba1, transparent: true, opacity: 0.17, depthWrite: false });
  materials.push(sunMaterial, sunGlowMaterial);
  const sunGeometry = new THREE.CircleGeometry(1.15, 48);
  const sunGlowGeometry = new THREE.CircleGeometry(2.05, 48);
  geometries.push(sunGeometry, sunGlowGeometry);
  const sun = new THREE.Mesh(sunGeometry, sunMaterial); sun.position.z = 0.1; sunGroup.add(sun);
  const sunGlow = new THREE.Mesh(sunGlowGeometry, sunGlowMaterial); sunGroup.add(sunGlow);
  scene.add(sunGroup);
  return { skyMaterial, landscape, sceneryMaterials: [...sceneryMaterials, lakeMaterial, glintMaterial, wall, roof, windows, foliage, blossoms], edgeDecor, lanterns, sunGroup, sunMaterial, sunGlowMaterial, shootingStars };
}

function addCloud(THREE, parent, materials, geometries, x, y, z, scale) {
  const cloud = new THREE.Group();
  cloud.position.set(x, y, z);
  cloud.scale.setScalar(scale);
  const cloudMaterial = makeMaterial(THREE, 0x9e9ac8, {
    transparent: true,
    opacity: 0.13,
    depthWrite: false,
    roughness: 1,
  });
  materials.push(cloudMaterial);
  const puffGeometry = new THREE.SphereGeometry(1, 12, 8);
  geometries.push(puffGeometry);
  [
    [-0.75, 0, 0, 1.1, 0.42, 0.56],
    [-0.12, 0.18, -0.05, 0.85, 0.56, 0.64],
    [0.56, 0.02, 0.02, 1.18, 0.38, 0.6],
    [1.05, -0.06, 0, 0.73, 0.3, 0.48],
  ].forEach(([px, py, pz, sx, sy, sz]) => {
    const puff = new THREE.Mesh(puffGeometry, cloudMaterial);
    puff.position.set(px, py, pz);
    puff.scale.set(sx, sy, sz);
    cloud.add(puff);
  });
  parent.add(cloud);
  return cloud;
}

function addPlant(THREE, island, geometries, materials, x, z, tint) {
  const stemMaterial = materials.plantStem;
  const leafMaterial = makeMaterial(THREE, tint, { roughness: 0.9 });
  materials.extra.push(leafMaterial);
  const stem = new THREE.Mesh(geometries.stem, stemMaterial);
  stem.position.set(x, 0.27, z);
  stem.scale.set(1, 0.72 + Math.abs(x + z) * 0.04, 1);
  island.add(stem);
  const crown = new THREE.Mesh(geometries.leaf, leafMaterial);
  crown.position.set(x, 0.59 + Math.abs(x + z) * 0.025, z);
  crown.scale.set(0.25, 0.3, 0.25);
  island.add(crown);
}

function addLantern(THREE, island, geometries, materials, x, z, color) {
  const lightMaterial = makeMaterial(THREE, color, {
    emissive: color,
    emissiveIntensity: 1.35,
    roughness: 0.3,
  });
  materials.extra.push(lightMaterial);
  const lantern = new THREE.Mesh(geometries.lantern, lightMaterial);
  lantern.position.set(x, 0.55, z);
  island.add(lantern);
  const glow = new THREE.PointLight(color, 0.46, 2.1, 2);
  glow.position.set(x, 0.72, z);
  island.add(glow);
}

function addLandmark(THREE, island, key, geometries, materials, color) {
  const trim = materials.gold;
  const glow = materials.extra;
  if (key === 'workshop') {
    const walls = new THREE.Mesh(geometries.house, materials.pink);
    walls.position.set(-0.6, 0.49, -0.28);
    island.add(walls);
    const roof = new THREE.Mesh(geometries.roof, materials.roof);
    roof.position.set(-0.6, 1.0, -0.28);
    roof.rotation.y = Math.PI / 4;
    island.add(roof);
    const chimney = new THREE.Mesh(geometries.chimney, materials.plum);
    chimney.position.set(-0.22, 1.07, -0.27);
    island.add(chimney);
    const gear = new THREE.Mesh(geometries.gear, materials.gold);
    gear.position.set(-0.54, 0.55, 0.13);
    gear.rotation.y = 0.22;
    island.add(gear);
    addLantern(THREE, island, geometries, materials, -1.0, 0.31, color);
  } else if (key === 'garden') {
    for (const [x, z, size, tint] of [
      [-0.66, -0.3, 0.78, 0x70966f],
      [0.63, -0.15, 0.62, 0x789b78],
      [0.05, -0.72, 0.5, 0x9a8ca8],
    ]) {
      const trunk = new THREE.Mesh(geometries.trunk, materials.wood);
      trunk.position.set(x, 0.53 * size, z);
      trunk.scale.setScalar(size);
      island.add(trunk);
      const foliageMaterial = makeMaterial(THREE, tint, { roughness: 0.92 });
      glow.push(foliageMaterial);
      const foliage = new THREE.Mesh(geometries.foliage, foliageMaterial);
      foliage.position.set(x, 0.92 * size, z);
      foliage.scale.setScalar(size);
      island.add(foliage);
    }
    addLantern(THREE, island, geometries, materials, -0.97, 0.06, 0xffa8d1);
    addLantern(THREE, island, geometries, materials, 1.0, -0.2, 0xffde91);
  } else if (key === 'atlas') {
    const observatory = new THREE.Mesh(geometries.observatoryBase, materials.stone);
    observatory.position.set(-0.42, 0.45, -0.4);
    island.add(observatory);
    const dome = new THREE.Mesh(geometries.dome, materials.lavender);
    dome.position.set(-0.42, 0.69, -0.4);
    island.add(dome);
    const telescope = new THREE.Mesh(geometries.telescope, materials.gold);
    telescope.position.set(0.61, 0.63, -0.08);
    telescope.rotation.z = -0.82;
    telescope.rotation.x = Math.PI / 2;
    island.add(telescope);
    const star = new THREE.Mesh(geometries.crystal, materials.extra[0]);
    star.position.set(-0.39, 1.45, -0.4);
    star.scale.setScalar(0.19);
    island.add(star);
    addLantern(THREE, island, geometries, materials, 0.92, 0.25, color);
  } else if (key === 'stories') {
    const cottage = new THREE.Mesh(geometries.house, materials.storyWall);
    cottage.position.set(-0.52, 0.48, -0.3);
    cottage.scale.set(1.12, 0.9, 1);
    island.add(cottage);
    const roof = new THREE.Mesh(geometries.roof, materials.purpleRoof);
    roof.position.set(-0.52, 0.91, -0.3);
    roof.rotation.y = Math.PI / 4;
    island.add(roof);
    const chimney = new THREE.Mesh(geometries.chimney, materials.wood);
    chimney.position.set(-0.2, 1.02, -0.32);
    island.add(chimney);
    const crescent = new THREE.Mesh(geometries.moonlet, materials.gold);
    crescent.position.set(0.73, 0.83, -0.22);
    crescent.rotation.z = -0.55;
    island.add(crescent);
    addLantern(THREE, island, geometries, materials, 0.85, 0.24, 0xffd483);
  } else {
    const box = new THREE.Mesh(geometries.musicBox, materials.pink);
    box.position.set(-0.43, 0.4, -0.38);
    island.add(box);
    const lid = new THREE.Mesh(geometries.boxLid, materials.lavender);
    lid.position.set(-0.43, 0.84, -0.38);
    lid.rotation.x = -0.13;
    island.add(lid);
    const musicNote = new THREE.Mesh(geometries.note, materials.gold);
    musicNote.position.set(0.6, 1.15, -0.32);
    musicNote.scale.setScalar(0.4);
    island.add(musicNote);
    addLantern(THREE, island, geometries, materials, 0.93, 0.08, color);
  }
}

function makeIsland(THREE, scene, definition, geometries, shared, materials) {
  const root = new THREE.Group();
  root.position.set(definition.x, definition.y, definition.z);
  root.rotation.y = definition.turn;
  root.userData.destination = definition.key;
  root.userData.floatPhase = definition.phase;
  root.userData.homeY = definition.y;
  scene.add(root);

  const rockMaterial = makeMaterial(THREE, definition.surface, { roughness: 0.97 });
  const soilMaterial = makeMaterial(THREE, definition.surface, {
    color: definition.surface,
    emissive: definition.surface,
    emissiveIntensity: 0.045,
    roughness: 0.93,
  });
  const edgeMaterial = makeMaterial(THREE, 0xc6a9bf, {
    color: definition.surface,
    emissive: 0x241a38,
    emissiveIntensity: 0.12,
    roughness: 0.7,
    metalness: 0.1,
  });
  materials.push(rockMaterial, soilMaterial, edgeMaterial);

  const rock = new THREE.Mesh(geometries.rock, rockMaterial);
  root.add(rock);
  const top = new THREE.Mesh(geometries.top, soilMaterial);
  top.position.y = 0.01;
  root.add(top);

  const rim = new THREE.Mesh(geometries.rim, edgeMaterial);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.08;
  root.add(rim);

  const cliffChips = createRandom(definition.seed);
  for (let index = 0; index < 7; index += 1) {
    const angle = (index / 7) * Math.PI * 2;
    const shard = new THREE.Mesh(geometries.rockShard, index % 2 ? rockMaterial : edgeMaterial);
    shard.position.set(Math.cos(angle) * 0.86, -0.56 - cliffChips() * 0.32, Math.sin(angle) * 0.86);
    shard.rotation.set(cliffChips() * 0.8, angle, cliffChips() * 0.65);
    shard.scale.set(0.48 + cliffChips() * 0.25, 0.62 + cliffChips() * 0.4, 0.48 + cliffChips() * 0.25);
    root.add(shard);
  }

  const patch = new THREE.Mesh(geometries.grassPatch, shared.grass);
  patch.rotation.x = -Math.PI / 2;
  patch.position.set(-0.42, 0.138, -0.16);
  patch.scale.set(0.54, 0.45, 1);
  root.add(patch);

  for (let index = 0; index < 5; index += 1) {
    const angle = index * 2.4 + definition.phase;
    const radius = 0.72 + (index % 2) * 0.2;
    addPlant(THREE, root, geometries, shared, Math.cos(angle) * radius, Math.sin(angle) * radius, index % 2 ? 0x91a886 : 0x748f86);
  }

  addLandmark(THREE, root, definition.key, geometries, shared, definition.color);

  const portal = new THREE.Group();
  portal.position.set(0.26, 0.86, 0.55);
  root.add(portal);

  const portalMaterial = makeMaterial(THREE, definition.color, {
    color: definition.color,
    emissive: definition.color,
    emissiveIntensity: 1.35,
    roughness: 0.28,
    metalness: 0.14,
  });
  const portalCoreMaterial = new THREE.MeshBasicMaterial({
    color: definition.color,
    transparent: true,
    opacity: 0.18,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const portalTrimMaterial = makeMaterial(THREE, 0xffe2ae, {
    color: 0xffe2ae,
    emissive: definition.color,
    emissiveIntensity: 0.55,
    metalness: 0.48,
    roughness: 0.35,
  });
  materials.push(portalMaterial, portalCoreMaterial, portalTrimMaterial);

  const core = new THREE.Mesh(geometries.portalCore, portalCoreMaterial);
  core.position.z = -0.035;
  portal.add(core);
  const ring = new THREE.Mesh(geometries.portalRing, portalMaterial);
  portal.add(ring);
  const portalBase = new THREE.Mesh(geometries.portalBase, portalTrimMaterial);
  portalBase.position.set(0, -0.6, 0);
  portal.add(portalBase);
  for (const side of [-1, 1]) {
    const column = new THREE.Mesh(geometries.portalColumn, portalTrimMaterial);
    column.position.set(side * 0.61, -0.28, 0);
    portal.add(column);
    const jewel = new THREE.Mesh(geometries.portalJewel, portalMaterial);
    jewel.position.set(side * 0.61, 0.1, 0.015);
    portal.add(jewel);
  }

  const portalLight = new THREE.PointLight(definition.color, 1.05, 4.5, 2);
  portalLight.position.set(0, 0.2, 0.4);
  root.add(portalLight);

  const hitArea = new THREE.Mesh(
    geometries.hitArea,
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
  );
  hitArea.position.set(0, 0.52, 0.1);
  hitArea.userData.destination = definition.key;
  root.add(hitArea);
  materials.push(hitArea.material);

  const fireflies = new THREE.Group();
  root.add(fireflies);
  const fireflyMaterial = new THREE.MeshBasicMaterial({
    color: definition.color,
    transparent: true,
    opacity: 0.95,
    toneMapped: false,
  });
  materials.push(fireflyMaterial);
  for (let index = 0; index < 3; index += 1) {
    const firefly = new THREE.Mesh(geometries.firefly, fireflyMaterial);
    const angle = (index / 3) * Math.PI * 2 + definition.phase;
    firefly.position.set(Math.cos(angle) * 1.45, 0.6 + index * 0.17, Math.sin(angle) * 0.75);
    fireflies.add(firefly);
  }

  return {
    definition,
    root,
    portal,
    ring,
    core,
    portalMaterial,
    portalCoreMaterial,
    portalLight,
    hitArea,
  };
}

function addPath(THREE, scene, islands, materials, geometries) {
  const paths = [];
  const threadMaterial = makeMaterial(THREE, 0xffe1a1, {
    color: 0xffe1a1,
    emissive: 0xd69b52,
    emissiveIntensity: 0.65,
    transparent: true,
    opacity: 0.68,
    depthWrite: false,
    roughness: 0.3,
    toneMapped: false,
  });
  const dayColor = new THREE.Color(0xb77648);
  const nightColor = new THREE.Color(0xffe1a1);
  const dotGeometry = new THREE.SphereGeometry(0.055, 8, 6);
  materials.push(threadMaterial);
  geometries.push(dotGeometry);

  for (let index = 0; index < islands.length - 1; index += 1) {
    const first = islands[index].root.position;
    const second = islands[index + 1].root.position;
    const direction = new THREE.Vector3(second.x - first.x, 0, second.z - first.z).normalize();
    const bend = new THREE.Vector3(-direction.z, 0, direction.x).multiplyScalar(index % 2 ? -1.15 : 1.15);
    const middle = new THREE.Vector3((first.x + second.x) / 2, (first.y + second.y) / 2, (first.z + second.z) / 2);
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(first.x, first.y + 0.3, first.z + 0.55),
      new THREE.Vector3(first.x + (second.x - first.x) * 0.25, first.y + 0.55, first.z + 0.65).addScaledVector(bend, 0.55),
      new THREE.Vector3(middle.x, middle.y + 0.62, middle.z + 0.8).add(bend),
      new THREE.Vector3(first.x + (second.x - first.x) * 0.74, second.y + 0.55, second.z + 0.55).addScaledVector(bend, -0.42),
      new THREE.Vector3(second.x, second.y + 0.3, second.z + 0.55),
    ]);
    for (let dot = 1; dot < 15; dot += 1) {
      const marker = new THREE.Mesh(dotGeometry, threadMaterial);
      marker.position.copy(curve.getPointAt(dot / 15));
      marker.scale.setScalar(dot % 4 === 0 ? 1.15 : 0.78);
      marker.userData.path = true;
      marker.userData.themeDayColor = dayColor;
      marker.userData.themeNightColor = nightColor;
      scene.add(marker);
      paths.push(marker);
    }
  }
  return paths;
}

async function startGreetingPip(THREE) {
  const canvas = document.querySelector('#dreamworldPipCanvas');
  const avatar = canvas?.closest('.dreamworld-pip__avatar');
  if (!canvas || !avatar) return;

  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  let renderer;
  let mixer;
  let idleAction;
  let waveAction;
  let model;
  let frame = 0;
  let previousTime = 0;
  let lastRenderedAt = 0;
  let disposed = false;
  const resizeObserver = typeof ResizeObserver === 'function' ? new ResizeObserver(resize) : null;

  function resize() {
    if (!renderer || disposed) return;
    const width = avatar.clientWidth;
    const height = avatar.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    renderer.render(scene, camera);
  }

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 30);
  camera.position.set(0, 1.34, 5.5);
  camera.lookAt(0, 1.26, 0);
  scene.add(new THREE.HemisphereLight(0xffe7d5, 0x37304f, 2.15));
  const keyLight = new THREE.DirectionalLight(0xffd8a5, 2.2);
  keyLight.position.set(-2.5, 4, 3.8);
  scene.add(keyLight);
  const fillLight = new THREE.DirectionalLight(0xc5b6ff, 1.25);
  fillLight.position.set(3, 2, -2.5);
  scene.add(fillLight);

  function draw(now) {
    if (disposed || document.hidden) {
      frame = 0;
      return;
    }
    if (now - lastRenderedAt < 33) {
      frame = window.requestAnimationFrame(draw);
      return;
    }
    const delta = previousTime ? Math.min((now - previousTime) / 1000, 0.05) : 0;
    previousTime = now;
    lastRenderedAt = now;
    mixer?.update(delta);
    if (!motionPreference.matches && model) {
      model.position.y = Math.sin(now * 0.0012) * 0.035;
      model.rotation.y = Math.sin(now * 0.00055) * 0.035;
    }
    renderer.render(scene, camera);
    frame = window.requestAnimationFrame(draw);
  }

  function start() {
    if (!disposed && !motionPreference.matches && !document.hidden && !frame) {
      previousTime = 0;
      lastRenderedAt = 0;
      frame = window.requestAnimationFrame(draw);
    }
  }

  function stop() {
    if (!frame) return;
    window.cancelAnimationFrame(frame);
    frame = 0;
  }

  function onHello() {
    const clip = greetingClips.find((item) => item.name === 'wave');
    if (!mixer || !clip || motionPreference.matches) return;
    const wave = mixer.clipAction(clip);
    waveAction?.stop();
    waveAction = wave;
    idleAction?.fadeOut(0.16);
    waveAction.reset().setLoop(THREE.LoopOnce, 1);
    waveAction.clampWhenFinished = true;
    waveAction.fadeIn(0.16).play();
    start();
  }

  function onFinished(event) {
    if (event.action !== waveAction) return;
    waveAction.stop();
    waveAction = null;
    idleAction?.reset().fadeIn(0.22).play();
  }

  function onVisibility() {
    if (document.hidden) stop();
    else if (!motionPreference.matches) start();
    else renderer.render(scene, camera);
  }

  function onMotionChange() {
    if (motionPreference.matches) {
      stop();
      if (model) {
        model.position.y = 0;
        model.rotation.y = 0;
      }
      if (waveAction) {
        waveAction.stop();
        waveAction = null;
        idleAction?.reset().play();
      }
      renderer.render(scene, camera);
    } else start();
  }

  function cleanup() {
    if (disposed) return;
    disposed = true;
    stop();
    resizeObserver?.disconnect();
    window.removeEventListener('resize', resize);
    window.removeEventListener('pagehide', cleanup);
    window.removeEventListener('dreamworld:pip-hello', onHello);
    document.removeEventListener('visibilitychange', onVisibility);
    motionPreference.removeEventListener('change', onMotionChange);
    mixer?.stopAllAction();
    mixer?.removeEventListener('finished', onFinished);
    model?.traverse((object) => {
      if (!object.isMesh) return;
      object.geometry?.dispose();
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach((material) => {
        Object.values(material || {}).forEach((value) => value?.isTexture && value.dispose());
        material?.dispose();
      });
    });
    renderer?.dispose();
    renderer?.forceContextLoss();
    document.body.classList.remove('dreamworld-pip-3d-ready');
  }

  let greetingClips = [];
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'low-power',
      depth: true,
      stencil: false,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;

    const { GLTFLoader } = await import(gltfLoaderUrl);
    const gltf = await new GLTFLoader().loadAsync(pipModelUrl);
    if (disposed) return;
    model = gltf.scene;
    const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
    model.traverse((object) => {
      if (!object.isMesh) return;
      const meshMaterials = Array.isArray(object.material) ? object.material : [object.material];
      meshMaterials.forEach((material) => {
        if (!material?.map) return;
        material.map.anisotropy = maxAnisotropy;
        material.map.minFilter = THREE.LinearMipmapLinearFilter;
        material.map.magFilter = THREE.LinearFilter;
        material.map.needsUpdate = true;
      });
    });
    model.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(model);
    const size = bounds.getSize(new THREE.Vector3());
    if (!Number.isFinite(size.y) || size.y <= 0) throw new Error('Pip’s GLB has no measurable height.');
    const center = bounds.getCenter(new THREE.Vector3());
    const scale = 2.5 / size.y;
    const modelRoot = new THREE.Group();
    modelRoot.scale.setScalar(scale);
    modelRoot.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale);
    modelRoot.add(model);
    scene.add(modelRoot);
    model = modelRoot;
    greetingClips = gltf.animations;
    console.info('Greeting Pip GLB clips:', greetingClips.map(({ name, duration }) => ({ name, duration: Number(duration.toFixed(3)) })));

    mixer = new THREE.AnimationMixer(model);
    mixer.addEventListener('finished', onFinished);
    const idle = greetingClips.find((clip) => clip.name === 'idle');
    if (idle) {
      idleAction = mixer.clipAction(idle);
      idleAction.setLoop(THREE.LoopRepeat, Infinity).play();
    }
    resizeObserver?.observe(avatar);
    window.addEventListener('resize', resize);
    window.addEventListener('pagehide', cleanup, { once: true });
    window.addEventListener('dreamworld:pip-hello', onHello);
    document.addEventListener('visibilitychange', onVisibility);
    motionPreference.addEventListener('change', onMotionChange);
    resize();
    document.body.classList.add('dreamworld-pip-3d-ready');
    if (!motionPreference.matches && !document.hidden) start();
  } catch (error) {
    cleanup();
    console.error(`Could not load the animated greeting Pip model at “${pipModelUrl}”.`, error);
  }
}

async function startDreamworld() {
  await waitForPageScripts();

  let THREE;
  try {
    THREE = await import(threeModuleUrl);
  } catch (error) {
    showFallback(error);
    return;
  }

  const materials = [];
  const geometries = [];
  const eventController = new AbortController();
  let renderer;
  let cleanupWorld = () => {};
  let resizeObserver;
  let animationFrame = 0;
  let disposed = false;
  let selectedKey = null;
  let hoveredKey = null;
  let islands = [];
  let pathMeshes = [];
  let onResize;
  let onVisibility;
  let onReducedMotionChange;

  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: false,
      antialias: true,
      powerPreference: 'low-power',
      stencil: false,
      depth: true,
    });

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(scenePanel.clientWidth, scenePanel.clientHeight, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
    renderer.setClearColor(0x13152d, 1);

    const scene = new THREE.Scene();
    const nightSky = new THREE.Color(0x171733);
    const daySky = new THREE.Color(0x9abddd);
    scene.background = nightSky.clone().lerp(daySky, requestedDayMix);
    scene.fog = new THREE.FogExp2(scene.background.clone(), 0.012);
    const camera = new THREE.PerspectiveCamera(39, 1, 0.1, 100);
    camera.position.set(0, 10, 24);
    const cameraTarget = new THREE.Vector3(0, 1.65, 0);
    camera.lookAt(cameraTarget);

    const hemisphere = new THREE.HemisphereLight(0xc1c8ff, 0x261b3b, 1.8);
    scene.add(hemisphere);
    const moonLight = new THREE.DirectionalLight(0xffd59c, 2.3);
    moonLight.position.set(-7, 10, 5);
    scene.add(moonLight);
    const skyFill = new THREE.DirectionalLight(0x9da9ff, 1.25);
    skyFill.position.set(6, 4, -8);
    scene.add(skyFill);
    const frontFill = new THREE.DirectionalLight(0xffc9d9, 0.62);
    frontFill.position.set(0, 4, 11);
    scene.add(frontFill);
    const daylight = new THREE.DirectionalLight(0xffe2b8, 0);
    daylight.position.set(7, 11, 3);
    scene.add(daylight);

    const atmosphere = new THREE.Group();
    scene.add(atmosphere);
    const stars = createStarField(THREE, atmosphere, 300, 36, 79041, 0.105, 0.92);
    const glimmers = createStarField(THREE, atmosphere, 64, 25, 123878, 0.17, 0.66);
    const moonParts = createMoon(THREE, atmosphere, materials, geometries);
    const moon = moonParts.moon;
    const clouds = [
      addCloud(THREE, atmosphere, materials, geometries, -10, 1.8, -7.5, 1.6),
      addCloud(THREE, atmosphere, materials, geometries, -2, -1, -8.4, 1.15),
      addCloud(THREE, atmosphere, materials, geometries, 8.6, 2.3, -7.4, 1.45),
      addCloud(THREE, atmosphere, materials, geometries, 3.5, -1.5, -5.5, 0.85),
    ];
    clouds.forEach((cloud) => { cloud.userData.material = cloud.children[0]?.material; });
    const dayScenery = addDreamHorizon(THREE, scene, materials, geometries, requestedDayMix);

    const rockGeometry = new THREE.ConeGeometry(1.42, 1.84, 11, 4);
    rockGeometry.scale(1, -1, 1);
    rockGeometry.translate(0, -0.8, 0);
    rockGeometry.computeVertexNormals();
    geometries.push(rockGeometry);
    const topGeometry = new THREE.CylinderGeometry(1.47, 1.34, 0.23, 18, 2);
    geometries.push(topGeometry);
    const rimGeometry = new THREE.TorusGeometry(1.3, 0.065, 7, 32);
    geometries.push(rimGeometry);
    const rockShardGeometry = new THREE.DodecahedronGeometry(0.55, 0);
    geometries.push(rockShardGeometry);
    const grassPatchGeometry = new THREE.CircleGeometry(1, 24);
    geometries.push(grassPatchGeometry);
    const portalRingGeometry = new THREE.TorusGeometry(0.52, 0.065, 10, 40);
    geometries.push(portalRingGeometry);
    const portalCoreGeometry = new THREE.CircleGeometry(0.46, 36);
    geometries.push(portalCoreGeometry);
    const portalBaseGeometry = new THREE.CylinderGeometry(0.78, 0.89, 0.13, 14);
    geometries.push(portalBaseGeometry);
    const portalColumnGeometry = new THREE.CylinderGeometry(0.055, 0.075, 0.63, 8);
    geometries.push(portalColumnGeometry);
    const portalJewelGeometry = new THREE.OctahedronGeometry(0.105, 0);
    geometries.push(portalJewelGeometry);
    const hitAreaGeometry = new THREE.CylinderGeometry(1.62, 1.62, 1.12, 12);
    geometries.push(hitAreaGeometry);
    const stemGeometry = new THREE.CylinderGeometry(0.025, 0.04, 0.7, 5);
    geometries.push(stemGeometry);
    const leafGeometry = new THREE.SphereGeometry(1, 8, 6);
    geometries.push(leafGeometry);
    const lanternGeometry = new THREE.SphereGeometry(0.105, 10, 8);
    geometries.push(lanternGeometry);
    const fireflyGeometry = new THREE.SphereGeometry(0.045, 6, 5);
    geometries.push(fireflyGeometry);
    const houseGeometry = new THREE.BoxGeometry(0.85, 0.72, 0.72);
    const roofGeometry = new THREE.ConeGeometry(0.72, 0.55, 4);
    const chimneyGeometry = new THREE.BoxGeometry(0.14, 0.42, 0.16);
    const gearGeometry = new THREE.TorusGeometry(0.17, 0.04, 6, 16);
    const trunkGeometry = new THREE.CylinderGeometry(0.08, 0.12, 0.78, 7);
    const foliageGeometry = new THREE.SphereGeometry(0.43, 10, 8);
    const observatoryBaseGeometry = new THREE.CylinderGeometry(0.63, 0.72, 0.42, 14);
    const domeGeometry = new THREE.SphereGeometry(0.58, 16, 9, 0, Math.PI * 2, 0, Math.PI / 2);
    const telescopeGeometry = new THREE.CylinderGeometry(0.07, 0.12, 0.8, 8);
    const crystalGeometry = new THREE.OctahedronGeometry(0.27, 1);
    const moonletGeometry = new THREE.TorusGeometry(0.19, 0.065, 6, 12, Math.PI * 1.7);
    const musicBoxGeometry = new THREE.BoxGeometry(0.95, 0.64, 0.72);
    const boxLidGeometry = new THREE.BoxGeometry(1.02, 0.14, 0.78);
    const noteGeometry = new THREE.TorusGeometry(0.16, 0.045, 6, 16);
    [
      houseGeometry,
      roofGeometry,
      chimneyGeometry,
      gearGeometry,
      trunkGeometry,
      foliageGeometry,
      observatoryBaseGeometry,
      domeGeometry,
      telescopeGeometry,
      crystalGeometry,
      moonletGeometry,
      musicBoxGeometry,
      boxLidGeometry,
      noteGeometry,
    ].forEach((geometry) => geometries.push(geometry));

    const shared = {
      rock: rockGeometry,
      top: topGeometry,
      rim: rimGeometry,
      rockShard: rockShardGeometry,
      grassPatch: grassPatchGeometry,
      portalRing: portalRingGeometry,
      portalCore: portalCoreGeometry,
      portalBase: portalBaseGeometry,
      portalColumn: portalColumnGeometry,
      portalJewel: portalJewelGeometry,
      hitArea: hitAreaGeometry,
      stem: stemGeometry,
      leaf: leafGeometry,
      lantern: lanternGeometry,
      firefly: fireflyGeometry,
      house: houseGeometry,
      roof: roofGeometry,
      chimney: chimneyGeometry,
      gear: gearGeometry,
      trunk: trunkGeometry,
      foliage: foliageGeometry,
      observatoryBase: observatoryBaseGeometry,
      dome: domeGeometry,
      telescope: telescopeGeometry,
      crystal: crystalGeometry,
      moonlet: moonletGeometry,
      musicBox: musicBoxGeometry,
      boxLid: boxLidGeometry,
      note: noteGeometry,
    };

    const sharedMaterials = {
      extra: [],
      gold: makeMaterial(THREE, 0xf7d694, {
        color: 0xf7d694,
        emissive: 0xc18339,
        emissiveIntensity: 0.3,
        metalness: 0.3,
      }),
      pink: makeMaterial(THREE, 0xdca5b0, { roughness: 0.82 }),
      roof: makeMaterial(THREE, 0xa35f79, { roughness: 0.88 }),
      purpleRoof: makeMaterial(THREE, 0x776087, { roughness: 0.86 }),
      plum: makeMaterial(THREE, 0x584468, { roughness: 0.86 }),
      wood: makeMaterial(THREE, 0x8f6b69, { roughness: 0.92 }),
      stone: makeMaterial(THREE, 0x817a9c, { roughness: 0.8 }),
      lavender: makeMaterial(THREE, 0x9d8fba, { roughness: 0.7 }),
      storyWall: makeMaterial(THREE, 0xe1b99b, { roughness: 0.86 }),
      plantStem: makeMaterial(THREE, 0x607d70, { roughness: 0.9 }),
      grass: makeMaterial(THREE, 0x788872, {
        color: 0x82937b,
        roughness: 1,
        transparent: true,
        opacity: 0.48,
        side: THREE.DoubleSide,
      }),
    };
    materials.push(...Object.values(sharedMaterials).filter((value) => value.isMaterial), ...sharedMaterials.extra);

    const positionDefinitions = destinations.map((destination, index) => ({
      ...destination,
      turn: [-0.08, 0.18, -0.14, 0.11, -0.2][index],
      phase: index * 1.27,
      seed: 1307 + index * 681,
    }));
    islands = positionDefinitions.map((definition) => makeIsland(
      THREE,
      scene,
      definition,
      shared,
      sharedMaterials,
      materials
    ));
    materials.push(...sharedMaterials.extra);
    pathMeshes = addPath(THREE, scene, islands, materials, geometries);
    const islandPalette = materials
      .filter((material) => material.isMeshStandardMaterial && !material.userData.themeDayColor && material.emissiveIntensity < 0.5)
      .map((material) => ({ material, night: material.color.clone(), day: material.color.clone().lerp(new THREE.Color(0xffefd1), 0.14) }));

    const dust = createStarField(THREE, scene, 90, 18, 7783, 0.055, 0.58);
    dust.material.opacity = 0.58 * (1 - requestedDayMix);
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const clock = new THREE.Clock();
    let animationStartedAt = performance.now();
    let supportsMotion = !reducedMotion.matches;
    let dayMix = requestedDayMix;
    let transitionStartMix = dayMix;
    let transitionStartedAt = performance.now();
    let transitionTargetMix = dayMix;

    const daylightHemisphere = new THREE.Color(0xffedcf);
    const nightGround = new THREE.Color(0x261b3b);
    const dayGround = new THREE.Color(0x78917b);
    const daylightTint = new THREE.Color(0xffe2b8);
    const nightCloud = new THREE.Color(0x9e9ac8);
    const dayCloud = new THREE.Color(0xffd1c2);
    const dayGrass = new THREE.Color(0xa4bb80);
    const nightGrass = new THREE.Color(0x82937b);
    const nightPlant = new THREE.Color(0x607d70);
    const dayPlant = new THREE.Color(0x587d55);
    const nightLeaf = new THREE.Color(0x91a886);
    const dayLeaf = new THREE.Color(0x8fba75);

    function applySceneryTheme(mix) {
      dayScenery.skyMaterial.uniforms.dayMix.value = mix;
      scene.background.copy(nightSky).lerp(daySky, mix);
      scene.fog.color.copy(scene.background);
      scene.fog.density = THREE.MathUtils.lerp(0.021, 0.012, mix);
      hemisphere.color.set(0xc1c8ff).lerp(daylightHemisphere, mix);
      hemisphere.groundColor.copy(nightGround).lerp(dayGround, mix);
      moonLight.intensity = THREE.MathUtils.lerp(2.3, 0.62, mix);
      moonLight.color.set(0xffd59c).lerp(daylightTint, mix);
      daylight.intensity = 1.15 * mix;
      skyFill.intensity = THREE.MathUtils.lerp(1.25, 1.55, mix);
      frontFill.intensity = THREE.MathUtils.lerp(0.62, 0.85, mix);
      moonParts.moon.material.opacity = 1 - mix;
      moonParts.moon.material.transparent = true;
      moonParts.halo.material.opacity = 0.1 * (1 - mix);
      stars.material.opacity = 0.92 * (1 - mix);
      glimmers.material.opacity = 0.66 * (1 - mix) + 0.16 * mix;
      dust.material.opacity = 0.58 * (1 - mix) + 0.1 * mix;
      dayScenery.sunGroup.visible = mix > 0.005;
      dayScenery.sunMaterial.opacity = 0.95 * mix;
      dayScenery.sunGlowMaterial.opacity = 0.2 * mix;
      dayScenery.lanterns.opacity = THREE.MathUtils.lerp(0.92, 0.5, mix);
      dayScenery.shootingStars.forEach(({ material }) => {
        if (mix >= 0.4 || !supportsMotion) material.opacity = 0;
      });
      dayScenery.sceneryMaterials.forEach((material) => {
        if (material.userData.themeDayColor && material.userData.themeNightColor) {
          material.color.copy(material.userData.themeNightColor).lerp(material.userData.themeDayColor, mix);
        }
      });
      pathMeshes.forEach((marker) => {
        marker.material.color.copy(marker.userData.themeNightColor).lerp(marker.userData.themeDayColor, mix);
        marker.material.opacity = THREE.MathUtils.lerp(0.72, 0.55, mix);
      });
      islandPalette.forEach(({ material, night, day }) => material.color.copy(night).lerp(day, mix));
      clouds.forEach((cloud) => {
        const material = cloud.userData.material;
        if (!material) return;
        material.color.copy(nightCloud).lerp(dayCloud, mix);
        material.opacity = 0.13 + mix * 0.13;
      });
      sharedMaterials.grass.color.copy(nightGrass).lerp(dayGrass, mix);
      sharedMaterials.plantStem.color.copy(nightPlant).lerp(dayPlant, mix);
      sharedMaterials.extra.forEach((material) => {
        material.color.copy(nightLeaf).lerp(dayLeaf, mix);
      });
    }

    function onMoodChange() {
      transitionStartMix = dayMix;
      transitionTargetMix = requestedDayMix;
      transitionStartedAt = performance.now();
      if (reducedMotion.matches) {
        dayMix = transitionTargetMix;
        applySceneryTheme(dayMix);
        renderer.render(scene, camera);
      }
    }
    updateMoodTransition = onMoodChange;
    applySceneryTheme(dayMix);

    function updateHighlight() {
      const activeKey = hoveredKey || selectedKey;
      for (const island of islands) {
        const highlighted = island.definition.key === activeKey;
        island.portalMaterial.emissiveIntensity = highlighted ? 2.8 : 1.35;
        island.portalCoreMaterial.opacity = highlighted ? 0.36 : 0.18;
        island.portalLight.intensity = highlighted ? 2.1 : 1.05;
        island.portal.scale.setScalar(highlighted ? 1.09 : 1);
      }
    }

    function setHovered(key) {
      if (hoveredKey === key) return;
      hoveredKey = key;
      window.dispatchEvent(new CustomEvent('dreamworld:hover', { detail: key }));
      updateHighlight();
    }

    function projectDestinationButtons() {
      const width = scenePanel.clientWidth;
      const height = scenePanel.clientHeight;
      const labels = islands.map((island) => {
        const point = new THREE.Vector3(0, 1.85, 0.5);
        island.root.localToWorld(point);
        point.project(camera);
        const button = destinationButtons.find((item) => item.dataset.location === island.definition.key);
        if (!button) return null;
        const bounds = button.getBoundingClientRect();
        return {
          button,
          x: (point.x * 0.5 + 0.5) * width,
          y: (-point.y * 0.5 + 0.5) * height,
          width: bounds.width,
          height: bounds.height,
        };
      });
      const placed = [];
      const edgeGap = 10;
      const labelGap = 12;
      const offsets = [];
      for (const dy of [0, -42, 42, -76, 76, -108, 108]) {
        for (const dx of [0, -36, 36, -72, 72, -108, 108]) {
          offsets.push({ dx, dy, cost: Math.abs(dx) * 1.15 + Math.abs(dy) });
        }
      }
      offsets.sort((a, b) => a.cost - b.cost);

      labels.filter(Boolean).sort((a, b) => a.x - b.x).forEach((label) => {
        const halfWidth = label.width / 2;
        const halfHeight = label.height / 2;
        const minX = edgeGap + halfWidth;
        const maxX = width - edgeGap - halfWidth;
        const minY = edgeGap + halfHeight;
        const maxY = height - edgeGap - halfHeight;
        const candidates = offsets.map(({ dx, dy, cost }) => ({
          x: THREE.MathUtils.clamp(label.x + dx, minX, maxX),
          y: THREE.MathUtils.clamp(label.y + dy, minY, maxY),
          cost,
        }));
        const position = candidates.find((candidate) => placed.every((other) => (
          Math.abs(candidate.x - other.x) >= halfWidth + other.width / 2 + labelGap
          || Math.abs(candidate.y - other.y) >= halfHeight + other.height / 2 + labelGap
        ))) || candidates[candidates.length - 1];

        label.button.style.left = `${(position.x / width) * 100}%`;
        label.button.style.top = `${(position.y / height) * 100}%`;
        placed.push({ ...position, width: label.width, height: label.height });
      });
    }

    function resize() {
      const width = scenePanel.clientWidth;
      const height = scenePanel.clientHeight;
      if (!width || !height) return;
      const aspect = width / height;
      camera.aspect = aspect;
      const halfVerticalFov = THREE.MathUtils.degToRad(camera.fov / 2);
      const fitWidth = 21;
      const fitHeight = 11;
      const horizontalDistance = fitWidth / (2 * Math.tan(halfVerticalFov) * Math.max(aspect, 0.55));
      const verticalDistance = fitHeight / (2 * Math.tan(halfVerticalFov));
      const distance = Math.max(21, horizontalDistance, verticalDistance);
      camera.position.set(0, cameraTarget.y + distance * 0.32, distance);
      camera.lookAt(cameraTarget);
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
      projectDestinationButtons();
    }

    function findDestination(event) {
      const bounds = canvas.getBoundingClientRect();
      pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
      pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const intersections = raycaster.intersectObjects(islands.map((island) => island.hitArea), false);
      return intersections[0]?.object.userData.destination || null;
    }

    function onPointerMove(event) {
      if (event.pointerType === 'touch') return;
      setHovered(findDestination(event));
    }

    function onPointerLeave() {
      setHovered(null);
    }

    function onCanvasClick(event) {
      const key = findDestination(event);
      if (key) window.dispatchEvent(new CustomEvent('dreamworld:select', { detail: key }));
    }

    function animate(now) {
      if (disposed) return;
      animationFrame = 0;
      const elapsed = (now - animationStartedAt) / 1000;
      const transitionProgress = THREE.MathUtils.clamp((now - transitionStartedAt) / 260, 0, 1);
      const easedProgress = transitionProgress * transitionProgress * (3 - 2 * transitionProgress);
      dayMix = THREE.MathUtils.lerp(transitionStartMix, transitionTargetMix, easedProgress);
      applySceneryTheme(dayMix);
      if (supportsMotion) {
        islands.forEach((island, index) => {
          island.root.position.y = island.root.userData.homeY
            + Math.sin(elapsed * 0.55 + island.root.userData.floatPhase) * 0.13;
          island.root.rotation.z = Math.sin(elapsed * 0.19 + index) * 0.012;
          island.portal.rotation.z = Math.sin(elapsed * 0.3 + index) * 0.018;
          island.portal.children[0].rotation.z = elapsed * 0.08 + index * 0.4;
        });
        clouds.forEach((cloud, index) => {
          cloud.position.x += Math.sin(elapsed * 0.09 + index * 1.6) * 0.0015;
          cloud.position.y += Math.cos(elapsed * 0.07 + index * 1.1) * 0.0008;
        });
        stars.rotation.y = Math.sin(elapsed * 0.025) * 0.018;
        glimmers.rotation.y = Math.sin(elapsed * 0.045) * 0.03;
        dust.rotation.y = Math.sin(elapsed * 0.08) * 0.035;
        moon.rotation.z = Math.sin(elapsed * 0.12) * 0.012;
        dayScenery.shootingStars.forEach(({ material, phase }) => {
          const activeTime = (elapsed + phase) % 22;
          const flash = activeTime < 0.9 ? Math.sin((activeTime / 0.9) * Math.PI) : 0;
          material.opacity = dayMix < 0.4 ? flash * 0.8 : 0;
        });
        if (dayMix < 0.25 && elapsed - shootingTick > 11) shootingTick = elapsed;
        projectDestinationButtons();
      }
      renderer.render(scene, camera);
      if (supportsMotion && !document.hidden) animationFrame = window.requestAnimationFrame(animate);
    }

    function startAnimation() {
      if (disposed || document.hidden || animationFrame) return;
      animationStartedAt = performance.now() - clock.elapsedTime * 1000;
      animationFrame = window.requestAnimationFrame(animate);
    }

    function stopAnimation() {
      if (!animationFrame) return;
      window.cancelAnimationFrame(animationFrame);
      animationFrame = 0;
    }

    function cleanup(forceContextLoss = true) {
      if (disposed) return;
      disposed = true;
      stopAnimation();
      resizeObserver?.disconnect();
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onPageHide);
      window.removeEventListener('dreamworld:selection', onSelection);
      window.removeEventListener('dreamworld:hover', onWorldHover);
      reducedMotion.removeEventListener('change', onReducedMotionChange);
      updateMoodTransition = null;
      themeObserver.disconnect();
      canvas.removeEventListener('pointermove', onPointerMove, { signal: eventController.signal });
      canvas.removeEventListener('pointerleave', onPointerLeave, { signal: eventController.signal });
      canvas.removeEventListener('click', onCanvasClick, { signal: eventController.signal });
      eventController.abort();
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => material.dispose());
      renderer.dispose();
      if (forceContextLoss) renderer.forceContextLoss();
    }
    cleanupWorld = cleanup;

    function onPageHide() {
      cleanup();
    }

    function onResize() {
      resize();
      if (!supportsMotion) renderer.render(scene, camera);
    }

    function onVisibility() {
      if (document.hidden) stopAnimation();
      else if (supportsMotion) startAnimation();
      else renderer.render(scene, camera);
    }

    function onSelection(event) {
      selectedKey = event.detail;
      updateHighlight();
    }

    function onWorldHover(event) {
      if (hoveredKey === event.detail) return;
      hoveredKey = event.detail;
      updateHighlight();
    }

    function onReducedMotionChange(event) {
      supportsMotion = !event.matches;
      if (event.matches) {
        stopAnimation();
        islands.forEach((island) => {
          island.root.position.y = island.root.userData.homeY;
          island.root.rotation.z = 0;
          island.portal.rotation.z = 0;
        });
        dayMix = requestedDayMix;
        transitionStartMix = dayMix;
        transitionTargetMix = dayMix;
        applySceneryTheme(dayMix);
        renderer.render(scene, camera);
      } else {
        startAnimation();
      }
    }

    canvas.addEventListener('pointermove', onPointerMove, { signal: eventController.signal });
    canvas.addEventListener('pointerleave', onPointerLeave, { signal: eventController.signal });
    canvas.addEventListener('click', onCanvasClick, { signal: eventController.signal });
    canvas.addEventListener('webglcontextlost', onWebGLContextLost, {
      once: true,
      signal: eventController.signal,
    });
    window.addEventListener('dreamworld:selection', onSelection);
    window.addEventListener('dreamworld:hover', onWorldHover);
    window.addEventListener('resize', onResize);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onPageHide, { once: true });
    reducedMotion.addEventListener('change', onReducedMotionChange);

    if (typeof ResizeObserver === 'function') {
      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(scenePanel);
    }

    resize();
    canvas.hidden = false;
    canvas.setAttribute('aria-hidden', 'false');
    renderer.render(scene, camera);
    document.body.classList.add('dreamworld-3d-ready');
    sceneStatus.hidden = true;
    projectDestinationButtons();
    updateHighlight();
    startGreetingPip(THREE);
    if (supportsMotion && !document.hidden) startAnimation();

    function onWebGLContextLost(event) {
      event.preventDefault();
      cleanup(false);
      showFallback(new Error('The WebGL rendering context was lost.'));
    }
  } catch (error) {
    cleanupWorld();
    if (renderer && !disposed) {
      renderer.dispose();
      renderer.forceContextLoss();
    }
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((material) => material.dispose());
    showFallback(error);
  }
}

waitForPageScripts()
  .then(startDreamworld)
  .catch(showFallback);
