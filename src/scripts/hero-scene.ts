import {
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
    const camera = new PerspectiveCamera(60, 1, 0.1, 1000);
    const bounds = {
      x: isCompact ? 44 : 45,
      y: isCompact ? 34 : 35,
      z: isCompact ? 30 : 40
    };
    const primaryCount = isCompact ? 120 : 200;
    const secondaryCount = isCompact ? 48 : 80;
    const primary = createParticleLayer(primaryCount, bounds, isCompact ? 0.16 : 0.18, 0x00c8ff, 0.78);
    const secondary = createParticleLayer(secondaryCount, { x: isCompact ? 39 : 40, y: isCompact ? 29 : 30, z: 30 }, isCompact ? 0.13 : 0.14, 0xa855f7, 0.56);
    const primaryLineMaterial = new LineBasicMaterial({ color: 0x00c8ff, transparent: true, opacity: isCompact ? 0.1 : 0.12 });
    const secondaryLineMaterial = new LineBasicMaterial({ color: 0x7c3aed, transparent: true, opacity: isCompact ? 0.07 : 0.08 });
    const shapes = [
      { mesh: addShape(new IcosahedronGeometry(isCompact ? 3.7 : 4.5, 0), 0x00c8ff, isCompact ? -18 : -26, isCompact ? 11 : 10, -12, 0.23), rx: 0.004, ry: 0.007 },
      { mesh: addShape(new OctahedronGeometry(isCompact ? 3 : 3.5, 0), 0x7c3aed, isCompact ? 18 : 24, isCompact ? -10 : -9, -6, 0.22), rx: 0.006, ry: 0.005 },
      { mesh: addShape(new TorusGeometry(isCompact ? 2.9 : 3.5, 0.75, 6, 16), 0x06ffd4, isCompact ? 14 : 18, isCompact ? 14 : 14, -18, 0.22), rx: 0.005, ry: 0.009 },
      { mesh: addShape(new TetrahedronGeometry(isCompact ? 2.6 : 3.2, 0), 0xa855f7, isCompact ? -16 : -20, isCompact ? -13 : -12, -8, 0.21), rx: 0.007, ry: 0.004 }
    ];
    let primaryLines = buildLines(primary.positions, primaryCount, primaryLineMaterial, isCompact ? 12 : 14, null, isCompact ? 190 : 520);
    let secondaryLines = buildLines(secondary.positions, secondaryCount, secondaryLineMaterial, isCompact ? 16 : 18, null, isCompact ? 90 : 220);
    const pointer = { x: 0, y: 0 };
    let visible = true;
    let running = false;
    let animationFrame = 0;
    let lastTime = performance.now();
    let frame = 0;

    camera.position.z = isCompact ? 34 : 30;
    renderer.setClearColor(0x000000, 0);

    scene.add(primary.points, secondary.points, primaryLines, secondaryLines);

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
      primaryLines.geometry.dispose();
      secondaryLines.geometry.dispose();
      primaryLineMaterial.dispose();
      secondaryLineMaterial.dispose();
      shapes.forEach(({ mesh }) => {
        mesh.geometry.dispose();
        Array.isArray(mesh.material) ? mesh.material.forEach((material) => material.dispose()) : mesh.material.dispose();
      });
      renderer.dispose();
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", cleanup, { once: true });

    function createParticleLayer(count: number, layerBounds: { x: number; y: number; z: number }, size: number, color: number, opacity: number) {
      const positions = new Float32Array(count * 3);
      const velocities = new Float32Array(count * 3);

      for (let i = 0; i < count; i += 1) {
        const index = i * 3;
        positions[index] = randomRange(-layerBounds.x, layerBounds.x);
        positions[index + 1] = randomRange(-layerBounds.y, layerBounds.y);
        positions[index + 2] = randomRange(-layerBounds.z, layerBounds.z);
        velocities[index] = randomRange(-0.014, 0.014);
        velocities[index + 1] = randomRange(-0.012, 0.012);
        velocities[index + 2] = randomRange(-0.005, 0.005);
      }

      const geometry = new BufferGeometry();
      geometry.setAttribute("position", new BufferAttribute(positions, 3));
      const material = new PointsMaterial({ color, size, transparent: true, opacity, sizeAttenuation: true });
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
          opacity
        })
      );
      mesh.position.set(x, y, z);
      scene.add(mesh);
      return mesh;
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

      if (frame % (isCompact ? 8 : 4) === 0) {
        primaryLines = buildLines(primary.positions, primaryCount, primaryLineMaterial, isCompact ? 12 : 14, primaryLines, isCompact ? 190 : 520);
        secondaryLines = buildLines(secondary.positions, secondaryCount, secondaryLineMaterial, isCompact ? 16 : 18, secondaryLines, isCompact ? 90 : 220);
      }

      shapes.forEach((shape) => {
        shape.mesh.rotation.x += shape.rx * delta;
        shape.mesh.rotation.y += shape.ry * delta;
      });

      primary.points.rotation.y += 0.0008 * delta;
      secondary.points.rotation.y -= 0.0005 * delta;
      primaryLines.rotation.y = primary.points.rotation.y;
      secondaryLines.rotation.y = secondary.points.rotation.y;

      camera.position.x += (pointer.x * 3 - camera.position.x) * 0.025;
      camera.position.y += (-pointer.y * 2 - camera.position.y) * 0.025;
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
