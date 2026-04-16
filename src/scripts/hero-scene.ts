export async function initHeroScene() {
  const canvas = document.querySelector<HTMLCanvasElement>("[data-hero-canvas]");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  if (!canvas || reducedMotion.matches || !supportsWebGL()) return;

  const {
    BufferAttribute,
    BufferGeometry,
    IcosahedronGeometry,
    LineBasicMaterial,
    LineSegments,
    Mesh,
    MeshBasicMaterial,
    PerspectiveCamera,
    Points,
    PointsMaterial,
    Scene,
    TorusGeometry,
    WebGLRenderer
  } = await import("three");

  const isCompact = window.matchMedia("(max-width: 760px)").matches;
  const renderer = new WebGLRenderer({
    canvas,
    alpha: true,
    antialias: false,
    powerPreference: "high-performance"
  });
  const scene = new Scene();
  const camera = new PerspectiveCamera(58, 1, 0.1, 1000);
  const pointCount = isCompact ? 118 : 190;
  const connectionCount = isCompact ? 120 : 240;
  const rangeX = isCompact ? 34 : 56;
  const rangeY = isCompact ? 32 : 40;
  const rangeZ = 34;
  const positions = new Float32Array(pointCount * 3);
  const velocities = new Float32Array(pointCount * 3);
  const pairs: Array<[number, number]> = [];
  const linePositions = new Float32Array(connectionCount * 6);
  const pointer = { x: 0, y: 0 };
  let visible = true;
  let running = false;
  let animationFrame = 0;
  let lastTime = performance.now();

  camera.position.z = isCompact ? 34 : 42;

  renderer.setClearColor(0x000000, 0);

  for (let i = 0; i < pointCount; i += 1) {
    const index = i * 3;
    positions[index] = randomRange(-rangeX, rangeX);
    positions[index + 1] = randomRange(-rangeY, rangeY);
    positions[index + 2] = randomRange(-rangeZ, rangeZ);
    velocities[index] = randomRange(-0.018, 0.018);
    velocities[index + 1] = randomRange(-0.014, 0.014);
    velocities[index + 2] = randomRange(-0.008, 0.008);
  }

  for (let i = 0; i < connectionCount; i += 1) {
    const a = Math.floor(Math.random() * pointCount);
    const b = (a + Math.floor(randomRange(4, pointCount / 2))) % pointCount;
    pairs.push([a, b]);
  }

  const pointGeometry = new BufferGeometry();
  pointGeometry.setAttribute("position", new BufferAttribute(positions, 3));
  const pointMaterial = new PointsMaterial({
    color: 0x86ffd7,
    size: isCompact ? 0.14 : 0.18,
    transparent: true,
    opacity: 0.72,
    sizeAttenuation: true
  });
  const points = new Points(pointGeometry, pointMaterial);
  scene.add(points);

  const lineGeometry = new BufferGeometry();
  lineGeometry.setAttribute("position", new BufferAttribute(linePositions, 3));
  const lineMaterial = new LineBasicMaterial({
    color: 0x05d9e8,
    transparent: true,
    opacity: isCompact ? 0.12 : 0.16
  });
  const lines = new LineSegments(lineGeometry, lineMaterial);
  scene.add(lines);

  const shapeMaterialA = new MeshBasicMaterial({
    color: 0x05d9e8,
    wireframe: true,
    transparent: true,
    opacity: 0.2
  });
  const shapeMaterialB = new MeshBasicMaterial({
    color: 0x9b5cff,
    wireframe: true,
    transparent: true,
    opacity: 0.18
  });
  const anchor = new Mesh(new IcosahedronGeometry(isCompact ? 4 : 5.6, 0), shapeMaterialA);
  anchor.position.set(isCompact ? -15 : -26, isCompact ? 10 : 12, -14);
  scene.add(anchor);

  const ring = new Mesh(new TorusGeometry(isCompact ? 3.4 : 4.8, 0.62, 8, 24), shapeMaterialB);
  ring.position.set(isCompact ? 14 : 25, isCompact ? -11 : -9, -16);
  scene.add(ring);

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(1, Math.floor(rect.width));
    const height = Math.max(1, Math.floor(rect.height));
    const pixelRatio = Math.min(window.devicePixelRatio || 1, isCompact ? 1.35 : 1.75);

    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };

  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();

  const intersection = new IntersectionObserver(
    (entries) => {
      visible = entries.some((entry) => entry.isIntersecting);
      if (visible) start();
      else stop();
    },
    { threshold: 0.05 }
  );
  intersection.observe(canvas);

  const onPointerMove = (event: PointerEvent) => {
    pointer.x = (event.clientX / window.innerWidth - 0.5) * 2;
    pointer.y = (event.clientY / window.innerHeight - 0.5) * 2;
  };

  window.addEventListener("pointermove", onPointerMove, { passive: true });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop();
    else if (visible) start();
  });

  function start() {
    if (running || document.hidden) return;
    running = true;
    lastTime = performance.now();
    animationFrame = window.requestAnimationFrame(tick);
  }

  function stop() {
    running = false;
    window.cancelAnimationFrame(animationFrame);
  }

  function tick(now: number) {
    if (!running) return;

    const delta = Math.min((now - lastTime) / 16.67, 2.4);
    lastTime = now;

    for (let i = 0; i < pointCount; i += 1) {
      const index = i * 3;

      positions[index] += velocities[index] * delta;
      positions[index + 1] += velocities[index + 1] * delta;
      positions[index + 2] += velocities[index + 2] * delta;

      if (positions[index] > rangeX) positions[index] = -rangeX;
      if (positions[index] < -rangeX) positions[index] = rangeX;
      if (positions[index + 1] > rangeY) positions[index + 1] = -rangeY;
      if (positions[index + 1] < -rangeY) positions[index + 1] = rangeY;
      if (positions[index + 2] > rangeZ) positions[index + 2] = -rangeZ;
      if (positions[index + 2] < -rangeZ) positions[index + 2] = rangeZ;
    }

    for (let i = 0; i < pairs.length; i += 1) {
      const [a, b] = pairs[i];
      const target = i * 6;
      const sourceA = a * 3;
      const sourceB = b * 3;

      linePositions[target] = positions[sourceA];
      linePositions[target + 1] = positions[sourceA + 1];
      linePositions[target + 2] = positions[sourceA + 2];
      linePositions[target + 3] = positions[sourceB];
      linePositions[target + 4] = positions[sourceB + 1];
      linePositions[target + 5] = positions[sourceB + 2];
    }

    pointGeometry.attributes.position.needsUpdate = true;
    lineGeometry.attributes.position.needsUpdate = true;

    points.rotation.y += 0.0009 * delta;
    lines.rotation.y = points.rotation.y;
    anchor.rotation.x += 0.0035 * delta;
    anchor.rotation.y += 0.005 * delta;
    ring.rotation.x -= 0.003 * delta;
    ring.rotation.y += 0.004 * delta;

    camera.position.x += (pointer.x * 2.3 - camera.position.x) * 0.035;
    camera.position.y += (-pointer.y * 1.5 - camera.position.y) * 0.035;
    camera.lookAt(scene.position);

    renderer.render(scene, camera);
    animationFrame = window.requestAnimationFrame(tick);
  }

  start();
}

function randomRange(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function supportsWebGL() {
  try {
    const probe = document.createElement("canvas");
    return Boolean(
      window.WebGLRenderingContext &&
        (probe.getContext("webgl", { failIfMajorPerformanceCaveat: true }) ||
          probe.getContext("experimental-webgl", { failIfMajorPerformanceCaveat: true }))
    );
  } catch {
    return false;
  }
}
