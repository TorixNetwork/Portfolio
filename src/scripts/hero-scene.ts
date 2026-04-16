import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  IcosahedronGeometry,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  OctahedronGeometry,
  PerspectiveCamera,
  Points,
  PointsMaterial,
  Scene,
  TetrahedronGeometry,
  TorusGeometry,
  WebGLRenderer
} from "three";

export async function initHeroScene() {
  const canvas = document.querySelector<HTMLCanvasElement>("[data-hero-canvas]");
  const hero = document.querySelector<HTMLElement>("[data-hero]");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  if (!canvas || !hero) return;

  if (reducedMotion.matches || shouldUseStaticFallback() || !supportsWebGL()) {
    hero.classList.add("is-webgl-fallback");
    return;
  }

  try {
    const isCompact = window.matchMedia("(max-width: 760px)").matches;
    const renderer = new WebGLRenderer({
      canvas,
      alpha: true,
      antialias: !isCompact,
      powerPreference: "high-performance"
    });
    const scene = new Scene();
    const camera = new PerspectiveCamera(isCompact ? 64 : 68, 1, 0.1, 1000);
    const bounds = {
      x: isCompact ? 48 : 58,
      y: isCompact ? 36 : 42,
      z: isCompact ? 38 : 58
    };
    const primaryCount = isCompact ? 158 : 260;
    const secondaryCount = isCompact ? 68 : 112;
    const deepCount = isCompact ? 42 : 88;
    const primary = createParticleLayer(primaryCount, bounds, isCompact ? 0.2 : 0.23, 0x00d8ff, 0.9, 1);
    const secondary = createParticleLayer(secondaryCount, { x: isCompact ? 42 : 50, y: isCompact ? 32 : 38, z: isCompact ? 34 : 48 }, isCompact ? 0.16 : 0.18, 0xa855f7, 0.7, 0.82);
    const deep = createParticleLayer(deepCount, { x: isCompact ? 56 : 72, y: isCompact ? 42 : 48, z: isCompact ? 50 : 72 }, isCompact ? 0.12 : 0.14, 0x86ffd7, 0.46, 0.54);
    const primaryLineMaterial = new LineBasicMaterial({ color: 0x00d8ff, transparent: true, opacity: isCompact ? 0.16 : 0.2, blending: AdditiveBlending, depthWrite: false });
    const secondaryLineMaterial = new LineBasicMaterial({ color: 0x7c3aed, transparent: true, opacity: isCompact ? 0.11 : 0.14, blending: AdditiveBlending, depthWrite: false });
    const railMaterial = new LineBasicMaterial({ color: 0x86ffd7, transparent: true, opacity: isCompact ? 0.09 : 0.13, blending: AdditiveBlending, depthWrite: false });
    const depthRails = createDepthRails(railMaterial);
    const shapes = [
      { mesh: addShape(new IcosahedronGeometry(isCompact ? 4.2 : 5.2, 0), 0x00c8ff, isCompact ? -19 : -29, isCompact ? 12 : 12, -14, 0.32), rx: 0.004, ry: 0.007 },
      { mesh: addShape(new OctahedronGeometry(isCompact ? 3.3 : 4.1, 0), 0x7c3aed, isCompact ? 19 : 28, isCompact ? -11 : -10, -4, 0.3), rx: 0.006, ry: 0.005 },
      { mesh: addShape(new TorusGeometry(isCompact ? 3.3 : 4.2, 0.82, 8, 18), 0x06ffd4, isCompact ? 14 : 21, isCompact ? 14 : 15, -22, 0.3), rx: 0.005, ry: 0.009 },
      { mesh: addShape(new TetrahedronGeometry(isCompact ? 2.9 : 3.7, 0), 0xa855f7, isCompact ? -17 : -23, isCompact ? -14 : -13, -6, 0.28), rx: 0.007, ry: 0.004 },
      { mesh: addShape(new TorusGeometry(isCompact ? 9.2 : 12.5, 0.18, 8, 64), 0x00c8ff, 0, 0, -38, isCompact ? 0.11 : 0.14), rx: 0.0015, ry: 0.0022 },
      { mesh: addShape(new TorusGeometry(isCompact ? 12.5 : 17, 0.16, 8, 72), 0x7c3aed, 0, 0, -54, isCompact ? 0.08 : 0.11), rx: -0.001, ry: 0.0018 }
    ];
    let primaryLines = buildLines(primary.positions, primaryCount, primaryLineMaterial, isCompact ? 14 : 16, null, isCompact ? 260 : 760);
    let secondaryLines = buildLines(secondary.positions, secondaryCount, secondaryLineMaterial, isCompact ? 18 : 21, null, isCompact ? 130 : 340);
    const pointer = { x: 0, y: 0 };
    let visible = true;
    let running = false;
    let animationFrame = 0;
    let lastTime = performance.now();
    let frame = 0;

    camera.position.z = isCompact ? 37 : 34;
    renderer.setClearColor(0x000000, 0);

    scene.add(primary.points, secondary.points, deep.points, primaryLines, secondaryLines, depthRails);

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const width = Math.max(1, Math.floor(rect.width));
      const height = Math.max(1, Math.floor(rect.height));
      const pixelRatio = Math.min(window.devicePixelRatio || 1, isCompact ? 1.45 : 1.85);

      renderer.setPixelRatio(pixelRatio);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
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

    const onVisibilityChange = () => {
      if (document.hidden) stop();
      else if (visible) start();
    };

    const cleanup = () => {
      stop();
      resizeObserver.disconnect();
      intersection.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      primary.geometry.dispose();
      primary.material.dispose();
      secondary.geometry.dispose();
      secondary.material.dispose();
      deep.geometry.dispose();
      deep.material.dispose();
      primaryLines.geometry.dispose();
      secondaryLines.geometry.dispose();
      depthRails.geometry.dispose();
      primaryLineMaterial.dispose();
      secondaryLineMaterial.dispose();
      railMaterial.dispose();
      shapes.forEach(({ mesh }) => {
        mesh.geometry.dispose();
        Array.isArray(mesh.material) ? mesh.material.forEach((material) => material.dispose()) : mesh.material.dispose();
      });
      renderer.dispose();
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", cleanup, { once: true });

    function createParticleLayer(count: number, layerBounds: { x: number; y: number; z: number }, size: number, color: number, opacity: number, speedScale: number) {
      const positions = new Float32Array(count * 3);
      const velocities = new Float32Array(count * 3);

      for (let i = 0; i < count; i += 1) {
        const index = i * 3;
        positions[index] = randomRange(-layerBounds.x, layerBounds.x);
        positions[index + 1] = randomRange(-layerBounds.y, layerBounds.y);
        positions[index + 2] = randomRange(-layerBounds.z, layerBounds.z);
        velocities[index] = randomRange(-0.014, 0.014) * speedScale;
        velocities[index + 1] = randomRange(-0.012, 0.012) * speedScale;
        velocities[index + 2] = randomRange(-0.008, 0.008) * speedScale;
      }

      const geometry = new BufferGeometry();
      geometry.setAttribute("position", new BufferAttribute(positions, 3));
      const material = new PointsMaterial({
        color,
        size,
        transparent: true,
        opacity,
        sizeAttenuation: true,
        blending: AdditiveBlending,
        depthWrite: false
      });
      const points = new Points(geometry, material);

      return { positions, velocities, geometry, material, points, bounds: layerBounds };
    }

    function addShape(geometry: InstanceType<typeof BufferGeometry>, color: number, x: number, y: number, z: number, opacity: number) {
      const mesh = new Mesh(
        geometry,
        new MeshBasicMaterial({
          color,
          wireframe: true,
          transparent: true,
          opacity,
          blending: AdditiveBlending,
          depthWrite: false
        })
      );
      mesh.position.set(x, y, z);
      scene.add(mesh);
      return mesh;
    }

    function createDepthRails(material: InstanceType<typeof LineBasicMaterial>) {
      const points: number[] = [];
      const nearZ = isCompact ? 18 : 22;
      const farZ = isCompact ? -58 : -74;
      const lanes = isCompact
        ? [
            [-0.9, -0.72],
            [-0.45, -0.78],
            [0.45, -0.78],
            [0.9, -0.72],
            [-0.96, 0.72],
            [-0.44, 0.8],
            [0.44, 0.8],
            [0.96, 0.72]
          ]
        : [
            [-1.02, -0.74],
            [-0.68, -0.83],
            [-0.34, -0.88],
            [0.34, -0.88],
            [0.68, -0.83],
            [1.02, -0.74],
            [-1.06, 0.74],
            [-0.68, 0.84],
            [-0.34, 0.9],
            [0.34, 0.9],
            [0.68, 0.84],
            [1.06, 0.74]
          ];

      lanes.forEach(([x, y]) => {
        points.push(x * 16, y * 11, farZ, x * (isCompact ? 38 : 52), y * (isCompact ? 27 : 34), nearZ);
      });

      const planes = isCompact ? 4 : 5;

      for (let index = 0; index < planes; index += 1) {
        const progress = index / Math.max(1, planes - 1);
        const z = farZ + (nearZ - farZ) * progress;
        const width = (isCompact ? 15 : 20) + progress * (isCompact ? 25 : 36);
        const height = (isCompact ? 10 : 13) + progress * (isCompact ? 18 : 25);
        points.push(-width, -height, z, width, -height, z);
        points.push(width, -height, z, width, height, z);
        points.push(width, height, z, -width, height, z);
        points.push(-width, height, z, -width, -height, z);
      }

      const geometry = new BufferGeometry();
      geometry.setAttribute("position", new BufferAttribute(new Float32Array(points), 3));
      return new LineSegments(geometry, material);
    }

    function buildLines(
      particlePositions: Float32Array,
      count: number,
      material: InstanceType<typeof LineBasicMaterial>,
      maxDistance: number,
      previous: InstanceType<typeof LineSegments> | null,
      maxSegments: number
    ) {
      if (previous) {
        scene.remove(previous);
        previous.geometry.dispose();
      }

      const points: number[] = [];
      const maxDistanceSquared = maxDistance * maxDistance;

      for (let i = 0; i < count && points.length < maxSegments * 6; i += 1) {
        for (let j = i + 1; j < count && points.length < maxSegments * 6; j += 1) {
          const ai = i * 3;
          const bi = j * 3;
          const dx = particlePositions[ai] - particlePositions[bi];
          const dy = particlePositions[ai + 1] - particlePositions[bi + 1];
          const dz = particlePositions[ai + 2] - particlePositions[bi + 2];

          if (dx * dx + dy * dy + dz * dz < maxDistanceSquared) {
            points.push(
              particlePositions[ai],
              particlePositions[ai + 1],
              particlePositions[ai + 2],
              particlePositions[bi],
              particlePositions[bi + 1],
              particlePositions[bi + 2]
            );
          }
        }
      }

      const geometry = new BufferGeometry();
      geometry.setAttribute("position", new BufferAttribute(new Float32Array(points), 3));
      const lines = new LineSegments(geometry, material);
      scene.add(lines);
      return lines;
    }

    function updateLayer(layer: typeof primary, count: number, delta: number) {
      const { positions, velocities, bounds: layerBounds, geometry } = layer;

      for (let i = 0; i < count; i += 1) {
        const index = i * 3;
        positions[index] += velocities[index] * delta;
        positions[index + 1] += velocities[index + 1] * delta;
        positions[index + 2] += velocities[index + 2] * delta;

        if (positions[index] > layerBounds.x) positions[index] = -layerBounds.x;
        if (positions[index] < -layerBounds.x) positions[index] = layerBounds.x;
        if (positions[index + 1] > layerBounds.y) positions[index + 1] = -layerBounds.y;
        if (positions[index + 1] < -layerBounds.y) positions[index + 1] = layerBounds.y;
        if (positions[index + 2] > layerBounds.z) positions[index + 2] = -layerBounds.z;
        if (positions[index + 2] < -layerBounds.z) positions[index + 2] = layerBounds.z;
      }

      geometry.attributes.position.needsUpdate = true;
    }

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
      frame += 1;

      updateLayer(primary, primaryCount, delta);
      updateLayer(secondary, secondaryCount, delta);
      updateLayer(deep, deepCount, delta);

      if (frame % (isCompact ? 7 : 5) === 0) {
        primaryLines = buildLines(primary.positions, primaryCount, primaryLineMaterial, isCompact ? 14 : 16, primaryLines, isCompact ? 260 : 760);
        secondaryLines = buildLines(secondary.positions, secondaryCount, secondaryLineMaterial, isCompact ? 18 : 21, secondaryLines, isCompact ? 130 : 340);
      }

      shapes.forEach((shape) => {
        shape.mesh.rotation.x += shape.rx * delta;
        shape.mesh.rotation.y += shape.ry * delta;
      });

      primary.points.rotation.y += 0.0008 * delta;
      secondary.points.rotation.y -= 0.0005 * delta;
      deep.points.rotation.y += 0.00035 * delta;
      deep.points.rotation.x -= 0.0002 * delta;
      primaryLines.rotation.y = primary.points.rotation.y;
      secondaryLines.rotation.y = secondary.points.rotation.y;
      depthRails.rotation.y += (pointer.x * 0.07 - depthRails.rotation.y) * 0.018;
      depthRails.rotation.x += (-pointer.y * 0.035 - depthRails.rotation.x) * 0.018;

      camera.position.x += (pointer.x * (isCompact ? 4.2 : 5.8) - camera.position.x) * 0.033;
      camera.position.y += (-pointer.y * (isCompact ? 3 : 3.9) - camera.position.y) * 0.033;
      camera.lookAt(scene.position);

      renderer.render(scene, camera);
      hero.classList.add("is-webgl-active");
      animationFrame = window.requestAnimationFrame(tick);
    }

    start();
  } catch {
    hero.classList.add("is-webgl-fallback");
  }
}

function randomRange(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function supportsWebGL() {
  try {
    const probe = document.createElement("canvas");
    return Boolean(
      window.WebGLRenderingContext &&
        (probe.getContext("webgl", { alpha: true }) || probe.getContext("experimental-webgl", { alpha: true }))
    );
  } catch {
    return false;
  }
}

function shouldUseStaticFallback() {
  const navigatorWithSignals = navigator as Navigator & {
    connection?: { saveData?: boolean };
    deviceMemory?: number;
  };

  if (navigatorWithSignals.connection?.saveData) return true;

  const memory = navigatorWithSignals.deviceMemory ?? 4;
  const cores = navigator.hardwareConcurrency || 4;

  return memory <= 1 && cores <= 2;
}
