const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");

initHeader();
initMobileMenu();
initReveal();
initCursor();
initTiltCards();
initContactForm();
initSiteAtmosphere();
initHeroScene();

function initSiteAtmosphere() {
  void import("./site-atmosphere").then(({ initSiteAtmosphere }) => initSiteAtmosphere());
}

function initHeroScene() {
  void import("./hero-scene").then(({ initHeroScene }) => initHeroScene());
}

function initHeader() {
  const header = document.querySelector<HTMLElement>("[data-site-header]");
  const navLinks = Array.from(document.querySelectorAll<HTMLAnchorElement>(".desktop-nav a"));
  const sections = Array.from(document.querySelectorAll<HTMLElement>("main section[id]"));

  if (!header) return;

  const updateHeader = () => {
    header.classList.toggle("is-scrolled", window.scrollY > 20);
  };

  updateHeader();
  window.addEventListener("scroll", updateHeader, { passive: true });

  if (!sections.length || !navLinks.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

      if (!visible?.target.id) return;

      navLinks.forEach((link) => {
        const isCurrent = link.getAttribute("href") === `#${visible.target.id}`;
        if (isCurrent) link.setAttribute("aria-current", "true");
        else link.removeAttribute("aria-current");
      });
    },
    {
      rootMargin: "-38% 0px -52% 0px",
      threshold: [0.05, 0.2, 0.45]
    }
  );

  sections.forEach((section) => observer.observe(section));
}

function initMobileMenu() {
  const header = document.querySelector<HTMLElement>("[data-site-header]");
  const toggle = document.querySelector<HTMLButtonElement>("[data-menu-toggle]");
  const close = document.querySelector<HTMLButtonElement>("[data-menu-close]");
  const panel = document.querySelector<HTMLElement>("[data-menu-panel]");
  const links = Array.from(document.querySelectorAll<HTMLAnchorElement>("[data-menu-link]"));

  if (!header || !toggle || !panel) return;

  let previouslyFocused: HTMLElement | null = null;

  const getFocusable = () =>
    Array.from(panel.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'));

  const openMenu = () => {
    previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    panel.hidden = false;
    header.classList.add("is-open");
    toggle.setAttribute("aria-expanded", "true");
    toggle.setAttribute("aria-label", "Close navigation menu");
    document.body.style.overflow = "hidden";
    getFocusable()[0]?.focus({ preventScroll: true });
  };

  const closeMenu = () => {
    panel.hidden = true;
    header.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Open navigation menu");
    document.body.style.overflow = "";
    previouslyFocused?.focus({ preventScroll: true });
  };

  toggle.addEventListener("click", () => {
    if (panel.hidden) openMenu();
    else closeMenu();
  });

  close?.addEventListener("click", closeMenu);
  links.forEach((link) => link.addEventListener("click", closeMenu));

  document.addEventListener("keydown", (event) => {
    if (panel.hidden) return;

    if (event.key === "Escape") {
      closeMenu();
      return;
    }

    if (event.key !== "Tab") return;

    const focusable = getFocusable();
    if (!focusable.length) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
}

function initReveal() {
  const elements = Array.from(document.querySelectorAll<HTMLElement>(".reveal"));

  if (!elements.length) return;

  if (reducedMotion.matches || !("IntersectionObserver" in window)) {
    elements.forEach((element) => element.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    { rootMargin: "0px 0px -12% 0px", threshold: 0.12 }
  );

  elements.forEach((element, index) => {
    element.style.transitionDelay = `${Math.min(index % 6, 5) * 45}ms`;
    observer.observe(element);
  });
}

function initCursor() {
  const dot = document.querySelector<HTMLElement>(".cursor-dot");
  const ring = document.querySelector<HTMLElement>(".cursor-ring");

  if (!dot || !ring) return;

  let mouseX = window.innerWidth / 2;
  let mouseY = window.innerHeight / 2;
  let ringX = mouseX;
  let ringY = mouseY;
  let frame = 0;

  const applyCursorMode = () => {
    document.documentElement.classList.toggle("has-custom-cursor", finePointer.matches);
  };

  const animate = () => {
    ringX += (mouseX - ringX) * 0.18;
    ringY += (mouseY - ringY) * 0.18;
    ring.style.left = `${ringX}px`;
    ring.style.top = `${ringY}px`;
    frame = window.requestAnimationFrame(animate);
  };

  const move = (event: PointerEvent) => {
    mouseX = event.clientX;
    mouseY = event.clientY;
    dot.style.left = `${mouseX}px`;
    dot.style.top = `${mouseY}px`;
  };

  const setActive = (active: boolean) => {
    ring.classList.toggle("is-active", active);
  };

  applyCursorMode();
  finePointer.addEventListener("change", applyCursorMode);
  window.addEventListener("pointermove", move, { passive: true });
  document.querySelectorAll("a, button, input, select, textarea, [data-tilt-card]").forEach((element) => {
    element.addEventListener("pointerenter", () => setActive(true));
    element.addEventListener("pointerleave", () => setActive(false));
  });

  frame = window.requestAnimationFrame(animate);

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      window.cancelAnimationFrame(frame);
    } else {
      frame = window.requestAnimationFrame(animate);
    }
  });
}

function initTiltCards() {
  if (!finePointer.matches || reducedMotion.matches) return;

  const cards = Array.from(document.querySelectorAll<HTMLElement>("[data-tilt-card]"));

  cards.forEach((card) => {
    card.addEventListener("pointermove", (event) => {
      const rect = card.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      card.style.transform = `translateY(-4px) rotateX(${-y * 4}deg) rotateY(${x * 5}deg)`;
    });

    card.addEventListener("pointerleave", () => {
      card.style.transform = "";
    });
  });
}

function initContactForm() {
  const form = document.querySelector<HTMLFormElement>("[data-contact-form]");
  const status = document.querySelector<HTMLElement>("[data-form-status]");
  const submit = form?.querySelector<HTMLButtonElement>(".form-submit");

  if (!form || !submit || !status) return;

  const setStatus = (message: string) => {
    status.textContent = message;
  };

  form.addEventListener("submit", async (event) => {
    if (!form.reportValidity()) return;

    event.preventDefault();

    const endpoint = form.dataset.formEndpoint?.trim();
    const email = form.dataset.contactEmail || "torixnetwork@gmail.com";
    const data = new FormData(form);
    const name = String(data.get("name") || "");
    const service = String(data.get("service") || "Project inquiry");
    const from = String(data.get("email") || "");
    const message = String(data.get("message") || "");

    submit.disabled = true;
    submit.querySelector("span")!.textContent = endpoint ? "Sending..." : "Opening Email...";

    if (endpoint) {
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          body: data,
          headers: { Accept: "application/json" }
        });

        if (!response.ok) throw new Error(`Form endpoint returned ${response.status}`);

        form.reset();
        setStatus("Message received by the configured form endpoint. Torix Network will review it shortly.");
      } catch {
        setStatus(`The form endpoint did not accept the message. Please email ${email} or message Torix Network on Telegram.`);
      } finally {
        submit.disabled = false;
        submit.querySelector("span")!.textContent = "Prepare Message";
      }
      return;
    }

    const subject = encodeURIComponent(`Torix Network inquiry: ${service}`);
    const body = encodeURIComponent(
      [
        `Name: ${name}`,
        `Email: ${from}`,
        `Project type: ${service}`,
        "",
        "Message:",
        message
      ].join("\n")
    );

    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
    setStatus(`Your email app should open with the project details. If it does not, send the same message to ${email}.`);
    submit.disabled = false;
    submit.querySelector("span")!.textContent = "Prepare Message";
  });
}
