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

  const pointer = { x: 0, y: 0, active: false };
  const state = {
    width: 1,
    height: 1,
    centerX: 0.5,
    centerY: 0.5,
    pixelRatio: 1,
    scrollY: window.scrollY,
    scrollTarget: window.scrollY,
    intensity: 0.55,
    intensityTarget: 0.55,
    time: 0,
    running: false,
    rafId: 0,
    particles: [] as Particle[],
    sections: [] as SectionBand[]
  };

  const mobile = window.matchMedia("(max-width: 760px)").matches;
  const tablet = window.matchMedia("(max-width: 1080px)").matches;
  const particleCount = mobile ? 42 : tablet ? 60 : 82;
  const connectionLimit = mobile ? 34 : tablet ? 50 : 72;

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
        id === "hero" ? 1 :
        id === "about" || id === "services" ? 0.7 :
        id === "why" || id === "ecosystem" ? 0.5 :
        id === "process" ? 0.36 :
        id === "contact" ? 0.28 :
        Math.max(0.24, 0.58 - index * 0.06);

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
    drawGrid(0.16);
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
    drawGrid(intensity);

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

      const depth = 0.45 + particle.z * 0.9;
      const parallaxX = pointer.active ? pointer.x * (10 + particle.z * 18) : 0;
      const parallaxY = pointer.active ? pointer.y * (7 + particle.z * 12) : 0;
      const scrollDrift = ((state.scrollY * particle.drift) % state.height) * 0.018;
      const x = state.centerX + particle.x * state.width * 0.55 * depth + parallaxX;
      const y = state.centerY + particle.y * state.height * 0.48 * depth - scrollDrift + parallaxY;

      return {
        particle,
        x,
        y,
        depth,
        alpha: (0.15 + particle.z * 0.42) * intensity,
        radius: particle.size * (0.8 + particle.z * 1.35)
      };
    });

    let connections = 0;
    const maxDistance = mobile ? 82 : 120;
    const maxDistanceSquared = maxDistance * maxDistance;

    context.lineWidth = mobile ? 0.6 : 0.75;

    for (let i = 0; i < projected.length && connections < connectionLimit; i += 1) {
      for (let j = i + 1; j < projected.length && connections < connectionLimit; j += 1) {
        const a = projected[i];
        const b = projected[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const distanceSquared = dx * dx + dy * dy;
        const depthGap = Math.abs(a.particle.z - b.particle.z);

        if (distanceSquared < maxDistanceSquared && depthGap < 0.42) {
          const closeness = 1 - distanceSquared / maxDistanceSquared;
          const alpha = Math.min(0.22, closeness * 0.16 * intensity * (1 - depthGap));
          const color = a.particle.hue === "violet" || b.particle.hue === "violet" ? COLORS.violet : COLORS.cyan;

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
      context.shadowBlur = 10 * item.depth * intensity;
      context.beginPath();
      context.arc(item.x, item.y, item.radius, 0, Math.PI * 2);
      context.fill();
    }

    context.shadowBlur = 0;
  }

  function drawAmbientGlows(intensity: number) {
    const heroBias = Math.max(0.2, intensity);
    const gradientA = context.createRadialGradient(state.width * 0.16, state.height * 0.18, 0, state.width * 0.16, state.height * 0.18, state.width * 0.52);
    gradientA.addColorStop(0, `rgba(5, 217, 232, ${0.08 * heroBias})`);
    gradientA.addColorStop(0.5, `rgba(155, 92, 255, ${0.035 * heroBias})`);
    gradientA.addColorStop(1, "rgba(3, 5, 11, 0)");
    context.fillStyle = gradientA;
    context.fillRect(0, 0, state.width, state.height);

    const gradientB = context.createRadialGradient(state.width * 0.86, state.height * 0.72, 0, state.width * 0.86, state.height * 0.72, state.width * 0.5);
    gradientB.addColorStop(0, `rgba(134, 255, 215, ${0.055 * intensity})`);
    gradientB.addColorStop(0.62, `rgba(5, 217, 232, ${0.025 * intensity})`);
    gradientB.addColorStop(1, "rgba(3, 5, 11, 0)");
    context.fillStyle = gradientB;
    context.fillRect(0, 0, state.width, state.height);
  }

  function drawGrid(intensity: number) {
    const spacing = mobile ? 86 : 112;
    const offset = -(state.scrollY * 0.035) % spacing;
    context.strokeStyle = `rgba(132, 244, 255, ${0.035 * intensity})`;
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
      vx: randomRange(-0.00055, 0.00055) * (mobile ? 0.65 : 1),
      vy: randomRange(-0.00044, 0.00044) * (mobile ? 0.65 : 1),
      vz: randomRange(-0.00032, 0.00032),
      size: randomRange(0.8, mobile ? 1.5 : 1.9),
      hue,
      drift: randomRange(0.25, 1.1)
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
