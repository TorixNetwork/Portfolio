type Particle = {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  size: number;
  hue: "cyan" | "violet" | "mint";
  drift: number;
  phase: number;
};

type SectionBand = {
  top: number;
  bottom: number;
  intensity: number;
};

const COLORS = {
  cyan: "5, 217, 232",
  violet: "155, 92, 255",
  mint: "134, 255, 215"
};

export function initSiteAtmosphere() {
  const canvas = document.querySelector<HTMLCanvasElement>("[data-site-atmosphere]");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  if (!canvas) return;

  const context = canvas.getContext("2d", { alpha: true });
  if (!context) return;

  const deviceSignals = navigator as Navigator & {
    connection?: { saveData?: boolean };
    deviceMemory?: number;
  };
  const saveData = Boolean(deviceSignals.connection?.saveData);
  const veryLowPower = (deviceSignals.deviceMemory ?? 4) <= 1 && (navigator.hardwareConcurrency || 4) <= 2;

  if (saveData || veryLowPower) {
    canvas.dataset.atmosphere = "fallback";
    return;
  }

  const lowPower = (deviceSignals.deviceMemory ?? 4) <= 2 || (navigator.hardwareConcurrency || 4) <= 4;
  const pointer = { x: 0, y: 0, active: false };
  const state = {
    width: 1,
    height: 1,
    centerX: 0.5,
    centerY: 0.5,
    pixelRatio: 1,
    scrollY: window.scrollY,
    scrollTarget: window.scrollY,
    intensity: 0.72,
    intensityTarget: 0.72,
    time: 0,
    running: false,
    rafId: 0,
    particles: [] as Particle[],
    sections: [] as SectionBand[]
  };

  const mobile = window.matchMedia("(max-width: 760px)").matches;
  const tablet = window.matchMedia("(max-width: 1080px)").matches;
  const particleCount = mobile ? (lowPower ? 46 : 56) : tablet ? (lowPower ? 66 : 78) : lowPower ? 92 : 118;
  const connectionLimit = mobile ? (lowPower ? 42 : 56) : tablet ? (lowPower ? 68 : 86) : lowPower ? 96 : 128;

  const buildParticles = () => {
    state.particles = Array.from({ length: particleCount }, (_, index) => createParticle(index));
  };

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    state.width = Math.max(1, Math.floor(rect.width));
    state.height = Math.max(1, Math.floor(rect.height));
    state.centerX = state.width / 2;
    state.centerY = state.height / 2;
    state.pixelRatio = Math.min(window.devicePixelRatio || 1, mobile ? 1.25 : 1.6);
    canvas.width = Math.floor(state.width * state.pixelRatio);
    canvas.height = Math.floor(state.height * state.pixelRatio);
    context.setTransform(state.pixelRatio, 0, 0, state.pixelRatio, 0, 0);
    measureSections();
  };

  const measureSections = () => {
    const viewportTop = window.scrollY;
    state.sections = Array.from(document.querySelectorAll<HTMLElement>("main > section")).map((section, index) => {
      const rect = section.getBoundingClientRect();
      const id = section.id;
      const intensity =
        id === "hero" ? 1.2 :
        id === "about" || id === "services" ? 1.08 :
        id === "why" || id === "ecosystem" ? 0.92 :
        id === "process" ? 0.68 :
        id === "contact" ? 0.54 :
        Math.max(0.5, 0.82 - index * 0.04);

      return {
        top: rect.top + viewportTop,
        bottom: rect.bottom + viewportTop,
        intensity
      };
    });
  };

  const updateScrollTargets = () => {
    state.scrollTarget = window.scrollY;
    const mid = state.scrollTarget + window.innerHeight * 0.5;
    const activeSection = state.sections.find((section) => mid >= section.top && mid < section.bottom);
    state.intensityTarget = activeSection?.intensity ?? 0.32;
  };

  const onPointerMove = (event: PointerEvent) => {
    if (event.pointerType !== "mouse") return;
    pointer.x = (event.clientX / window.innerWidth - 0.5) * 2;
    pointer.y = (event.clientY / window.innerHeight - 0.5) * 2;
    pointer.active = true;
  };

  const onPointerLeave = () => {
    pointer.active = false;
  };

  const onVisibilityChange = () => {
    if (document.hidden) stop();
    else start();
  };

  const cleanup = () => {
    stop();
    window.removeEventListener("resize", resize);
    window.removeEventListener("scroll", updateScrollTargets);
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerleave", onPointerLeave);
    window.removeEventListener("pagehide", cleanup);
    document.removeEventListener("visibilitychange", onVisibilityChange);
  };

  const drawStaticFallback = () => {
    resize();
    context.clearRect(0, 0, state.width, state.height);
    drawAmbientGlows(0.35);
    drawDepthPlanes(0.22);
    drawGrid(0.18);
    drawWireVolumes(0.26);
    canvas.dataset.atmosphere = "static";
  };

  const tick = (now: number) => {
    if (!state.running) return;

    const delta = state.time ? Math.min((now - state.time) / 16.67, 2.2) : 1;
    state.time = now;
    state.scrollY += (state.scrollTarget - state.scrollY) * 0.055;
    state.intensity += (state.intensityTarget - state.intensity) * 0.04;

    render(delta);
    state.rafId = requestAnimationFrame(tick);
  };

  const start = () => {
    if (state.running || reducedMotion.matches || document.hidden) return;
    state.running = true;
    state.time = performance.now();
    state.rafId = requestAnimationFrame(tick);
    canvas.dataset.atmosphere = "active";
  };

  function stop() {
    state.running = false;
    cancelAnimationFrame(state.rafId);
  }

  function render(delta: number) {
    const intensity = state.intensity;

    context.clearRect(0, 0, state.width, state.height);
    drawAmbientGlows(intensity);
    drawDepthPlanes(intensity);
    drawGrid(intensity);
    drawWireVolumes(intensity);

    const projected = state.particles.map((particle) => {
      particle.x += particle.vx * delta;
      particle.y += particle.vy * delta;
      particle.z += particle.vz * delta;

      if (particle.x > 1.15) particle.x = -1.15;
      if (particle.x < -1.15) particle.x = 1.15;
      if (particle.y > 1.15) particle.y = -1.15;
      if (particle.y < -1.15) particle.y = 1.15;
      if (particle.z > 1) particle.z = 0;
      if (particle.z < 0) particle.z = 1;

      const depth = 0.3 + particle.z * 1.36;
      const timeOffset = state.time * 0.00022 + particle.phase;
      const orbitalX = Math.cos(timeOffset) * 0.018 * (1 - particle.z * 0.25);
      const orbitalY = Math.sin(timeOffset * 0.8) * 0.014 * (1 - particle.z * 0.2);
      const parallaxX = pointer.active ? pointer.x * (16 + particle.z * 42) : 0;
      const parallaxY = pointer.active ? pointer.y * (10 + particle.z * 28) : 0;
      const scrollDrift = ((state.scrollY * particle.drift) % state.height) * (0.018 + particle.z * 0.012);
      const x = state.centerX + (particle.x + orbitalX) * state.width * 0.46 * depth + parallaxX;
      const y = state.centerY + (particle.y + orbitalY) * state.height * 0.42 * depth - scrollDrift + parallaxY;

      return {
        particle,
        x,
        y,
        depth,
        alpha: (0.16 + particle.z * 0.56) * intensity,
        radius: particle.size * (0.58 + particle.z * 1.9)
      };
    });

    let connections = 0;
    const maxDistance = mobile ? 104 : 150;
    const maxDistanceSquared = maxDistance * maxDistance;

    for (let i = 0; i < projected.length && connections < connectionLimit; i += 1) {
      for (let j = i + 1; j < projected.length && connections < connectionLimit; j += 1) {
        const a = projected[i];
        const b = projected[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const distanceSquared = dx * dx + dy * dy;
        const depthGap = Math.abs(a.particle.z - b.particle.z);

        if (distanceSquared < maxDistanceSquared && depthGap < 0.5) {
          const closeness = 1 - distanceSquared / maxDistanceSquared;
          const avgDepth = (a.particle.z + b.particle.z) * 0.5;
          const alpha = Math.min(0.42, closeness * (0.26 + avgDepth * 0.16) * intensity * (1 - depthGap * 0.72));
          const color = a.particle.hue === "violet" || b.particle.hue === "violet" ? COLORS.violet : COLORS.cyan;

          context.lineWidth = (mobile ? 0.55 : 0.68) + avgDepth * (mobile ? 0.55 : 0.82);
          context.strokeStyle = `rgba(${color}, ${alpha})`;
          context.beginPath();
          context.moveTo(a.x, a.y);
          context.lineTo(b.x, b.y);
          context.stroke();
          connections += 1;
        }
      }
    }

    for (const item of projected) {
      const color = COLORS[item.particle.hue];
      context.fillStyle = `rgba(${color}, ${item.alpha})`;
      context.shadowColor = `rgba(${color}, ${item.alpha * 0.6})`;
      context.shadowBlur = 14 * item.depth * intensity;
      context.beginPath();
      context.arc(item.x, item.y, item.radius, 0, Math.PI * 2);
      context.fill();

      if (item.particle.z > 0.74 && intensity > 0.5) {
        context.lineWidth = mobile ? 0.45 : 0.6;
        context.strokeStyle = `rgba(${color}, ${item.alpha * 0.34})`;
        context.beginPath();
        context.arc(item.x, item.y, item.radius * 2.25, 0, Math.PI * 2);
        context.stroke();
      }
    }

    context.shadowBlur = 0;
  }

  function drawAmbientGlows(intensity: number) {
    const heroBias = Math.max(0.2, intensity);
    const gradientA = context.createRadialGradient(state.width * 0.16, state.height * 0.18, 0, state.width * 0.16, state.height * 0.18, state.width * 0.52);
    gradientA.addColorStop(0, `rgba(5, 217, 232, ${0.115 * heroBias})`);
    gradientA.addColorStop(0.5, `rgba(155, 92, 255, ${0.052 * heroBias})`);
    gradientA.addColorStop(1, "rgba(3, 5, 11, 0)");
    context.fillStyle = gradientA;
    context.fillRect(0, 0, state.width, state.height);

    const gradientB = context.createRadialGradient(state.width * 0.86, state.height * 0.72, 0, state.width * 0.86, state.height * 0.72, state.width * 0.5);
    gradientB.addColorStop(0, `rgba(134, 255, 215, ${0.074 * intensity})`);
    gradientB.addColorStop(0.62, `rgba(5, 217, 232, ${0.034 * intensity})`);
    gradientB.addColorStop(1, "rgba(3, 5, 11, 0)");
    context.fillStyle = gradientB;
    context.fillRect(0, 0, state.width, state.height);
  }

  function drawDepthPlanes(intensity: number) {
    const time = state.time * 0.00008;
    const focusX = state.centerX + (pointer.active ? pointer.x * (mobile ? 18 : 42) : 0);
    const focusY = state.height * 0.44 + (pointer.active ? pointer.y * (mobile ? 12 : 24) : 0);
    const laneAlpha = Math.min(0.24, 0.104 * intensity);
    const ringAlpha = Math.min(0.3, 0.128 * intensity);

    context.save();
    context.globalCompositeOperation = "screen";

    for (let lane = -4; lane <= 4; lane += 1) {
      if (lane === 0) continue;

      const edgeX = state.centerX + lane * state.width * (mobile ? 0.18 : 0.16);
      const bottomY = state.height + 70;

      context.strokeStyle = `rgba(5, 217, 232, ${laneAlpha * (1 - Math.abs(lane) * 0.065)})`;
      context.lineWidth = mobile ? 0.55 : 0.75;
      context.beginPath();
      context.moveTo(focusX, focusY);
      context.lineTo(edgeX, bottomY);
      context.stroke();
    }

    for (let index = 0; index < 5; index += 1) {
      const progress = (index / 5 + time) % 1;
      const eased = progress * progress;
      const width = state.width * (0.18 + eased * (mobile ? 0.95 : 0.82));
      const height = state.height * (0.08 + eased * (mobile ? 0.42 : 0.34));
      const alpha = ringAlpha * (1 - progress) * (0.45 + eased);

      context.strokeStyle = `rgba(${index % 2 === 0 ? COLORS.cyan : COLORS.violet}, ${alpha})`;
      context.lineWidth = (mobile ? 0.55 : 0.85) + eased * 0.75;
      context.beginPath();
      context.ellipse(focusX, focusY + state.height * 0.08 * eased, width, height, 0, 0, Math.PI * 2);
      context.stroke();
    }

    context.restore();
  }

  function drawWireVolumes(intensity: number) {
    const cubeVertices = [
      [-1, -1, -1],
      [1, -1, -1],
      [1, 1, -1],
      [-1, 1, -1],
      [-1, -1, 1],
      [1, -1, 1],
      [1, 1, 1],
      [-1, 1, 1]
    ];
    const cubeEdges = [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 0],
      [4, 5],
      [5, 6],
      [6, 7],
      [7, 4],
      [0, 4],
      [1, 5],
      [2, 6],
      [3, 7],
      [0, 6],
      [1, 7]
    ];
    const time = state.time * 0.00024;
    const volumes = mobile
      ? [{ x: 0.84, y: 0.28, size: 54, color: COLORS.cyan, phase: 0.4 }]
      : [
          { x: 0.15, y: 0.34, size: 104, color: COLORS.cyan, phase: 0 },
          { x: 0.84, y: 0.38, size: 116, color: COLORS.violet, phase: 1.4 }
        ];

    context.save();
    context.globalCompositeOperation = "screen";

    volumes.forEach((volume) => {
      const centerX = state.width * volume.x + (pointer.active ? pointer.x * volume.size * 0.18 : 0);
      const centerY = state.height * volume.y + (pointer.active ? pointer.y * volume.size * 0.12 : 0);
      const rotationY = time + volume.phase;
      const rotationX = time * 0.72 + volume.phase * 0.45;
      const projected = cubeVertices.map(([x, y, z]) => projectVolumePoint(x, y, z, centerX, centerY, volume.size, rotationX, rotationY));

      cubeEdges.forEach(([a, b]) => {
        const start = projected[a];
        const end = projected[b];
        const depth = (start.depth + end.depth) * 0.5;
        const alpha = Math.min(0.56, (0.16 + depth * 0.24) * intensity);

        context.lineWidth = (mobile ? 0.75 : 1.05) + depth * 1.18;
        context.strokeStyle = `rgba(${volume.color}, ${alpha})`;
        context.beginPath();
        context.moveTo(start.x, start.y);
        context.lineTo(end.x, end.y);
        context.stroke();
      });

      projected.forEach((point) => {
        const alpha = Math.min(0.5, (0.15 + point.depth * 0.2) * intensity);

        context.fillStyle = `rgba(${volume.color}, ${alpha})`;
        context.beginPath();
        context.arc(point.x, point.y, 1.1 + point.depth * 1.25, 0, Math.PI * 2);
        context.fill();
      });
    });

    context.restore();
  }

  function projectVolumePoint(x: number, y: number, z: number, centerX: number, centerY: number, size: number, rotationX: number, rotationY: number) {
    const cosY = Math.cos(rotationY);
    const sinY = Math.sin(rotationY);
    const cosX = Math.cos(rotationX);
    const sinX = Math.sin(rotationX);
    const rotatedX = x * cosY - z * sinY;
    const rotatedZ = x * sinY + z * cosY;
    const rotatedY = y * cosX - rotatedZ * sinX;
    const finalZ = y * sinX + rotatedZ * cosX;
    const perspective = 1.65 / (2.35 - finalZ * 0.42);

    return {
      x: centerX + rotatedX * size * perspective,
      y: centerY + rotatedY * size * perspective,
      depth: Math.max(0, Math.min(1, (finalZ + 1.6) / 3.2))
    };
  }

  function drawGrid(intensity: number) {
    const spacing = mobile ? 78 : 104;
    const offset = -(state.scrollY * 0.045) % spacing;
    context.strokeStyle = `rgba(132, 244, 255, ${0.065 * intensity})`;
    context.lineWidth = 1;

    for (let x = offset; x < state.width + spacing; x += spacing) {
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, state.height);
      context.stroke();
    }

    for (let y = offset; y < state.height + spacing; y += spacing) {
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(state.width, y);
      context.stroke();
    }
  }

  function createParticle(index: number): Particle {
    const hue = index % 7 === 0 ? "violet" : index % 5 === 0 ? "mint" : "cyan";

    return {
      x: randomRange(-1.1, 1.1),
      y: randomRange(-1.05, 1.05),
      z: randomRange(0, 1),
      vx: randomRange(-0.00066, 0.00066) * (mobile ? 0.68 : lowPower ? 0.85 : 1),
      vy: randomRange(-0.00054, 0.00054) * (mobile ? 0.68 : lowPower ? 0.85 : 1),
      vz: randomRange(-0.0005, 0.0005) * (mobile ? 0.7 : 1),
      size: randomRange(0.95, mobile ? 1.9 : 2.35),
      hue,
      drift: randomRange(0.3, 1.35),
      phase: randomRange(0, Math.PI * 2)
    };
  }

  if (reducedMotion.matches) {
    drawStaticFallback();
    return;
  }

  buildParticles();
  resize();
  updateScrollTargets();
  window.addEventListener("resize", resize, { passive: true });
  window.addEventListener("scroll", updateScrollTargets, { passive: true });
  window.addEventListener("pointermove", onPointerMove, { passive: true });
  window.addEventListener("pointerleave", onPointerLeave, { passive: true });
  document.addEventListener("visibilitychange", onVisibilityChange);
  window.addEventListener("pagehide", cleanup);
  start();
}

function randomRange(min: number, max: number) {
  return min + Math.random() * (max - min);
}
