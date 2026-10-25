/*
 * Saanidhya - site behaviour. Loaded with `defer`, BEFORE Alpine.
 * CSP-friendly: no inline handlers, no eval. Alpine components are registered by
 * name here and referenced from templates as x-data="mobileMenu".
 */

window.sdTrack = window.sdTrack || function () {};

// --- Alpine components ------------------------------------------------------
document.addEventListener("alpine:init", () => {
  Alpine.data("mobileMenu", () => ({
    open: false,
    toggle() {
      this.open = !this.open;
      document.documentElement.classList.toggle("overflow-hidden", this.open);
    },
    close() {
      if (!this.open) return;
      this.open = false;
      document.documentElement.classList.remove("overflow-hidden");
    },
  }));
});

// --- htmx: send Django's CSRF token with every non-GET request ----------------
document.addEventListener("htmx:configRequest", (event) => {
  const match = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]+)/);
  if (match) event.detail.headers["X-CSRFToken"] = decodeURIComponent(match[1]);
});

// --- Google Analytics 4: loaded only after the first interaction (or 4 s after load)
// so it never competes with the page's own content for bandwidth.
(function () {
  const measurementId = document.body && document.body.dataset.ga;
  let started = false;

  function start() {
    if (started || !measurementId) return;
    started = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag("js", new Date());
    window.gtag("config", measurementId);
    const script = document.createElement("script");
    script.async = true;
    script.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(measurementId);
    document.head.appendChild(script);
  }

  // Safe to call from anywhere: does nothing when analytics is not configured.
  // It starts analytics first, so "config" is always queued before the event.
  window.sdTrack = function (name, params) {
    if (!measurementId) return;
    start();
    window.gtag("event", name, params || {});
  };

  if (!measurementId) return;
  ["pointerdown", "keydown", "scroll", "touchstart"].forEach((name) =>
    window.addEventListener(name, start, { once: true, passive: true })
  );
  window.addEventListener("load", () => setTimeout(start, 4000));
})();

// --- YouTube facade: a thumbnail loads first; the player is created only on click -----
document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-yt-embed]");
  if (!button) return;
  const frame = document.createElement("iframe");
  frame.src = button.dataset.ytEmbed;
  frame.title = button.dataset.ytTitle || "Video player";
  frame.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
  frame.allowFullscreen = true;
  frame.referrerPolicy = "strict-origin-when-cross-origin";
  frame.className = "absolute inset-0 h-full w-full border-0";
  button.replaceWith(frame);
  frame.focus();
});

// --- Hero video: desktop only. Phones, Data Saver and reduced-motion users keep the still image.
(function () {
  const video = document.querySelector("[data-hero-video]");
  if (!video) return;
  const connection = navigator.connection || {};
  const wide = window.matchMedia("(min-width: 768px)").matches;
  const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!wide || calm || connection.saveData) return;
  const start = () => {
    video.preload = "auto";
    const playing = video.play();
    if (playing && playing.then) {
      playing.then(() => video.classList.remove("opacity-0")).catch(() => {});
    }
  };
  if ("requestIdleCallback" in window) window.requestIdleCallback(start, { timeout: 2500 });
  else setTimeout(start, 1200);
})();

// --- Photo lightbox: native <dialog>, swipe / arrow keys / buttons, works for photos added by "Load more" ---
(function () {
  const dialog = document.getElementById("lightbox");
  if (!dialog || typeof dialog.showModal !== "function") return; // old browser: links simply open the photo
  const image = dialog.querySelector("[data-lb-image]");
  const caption = dialog.querySelector("[data-lb-caption]");
  const counter = dialog.querySelector("[data-lb-counter]");
  const projectLink = dialog.querySelector("[data-lb-project]");
  const stage = dialog.querySelector("[data-lb-stage]");
  const root = document.documentElement;
  let items = [];
  let index = 0;
  let opener = null;

  function show(next) {
    index = (next + items.length) % items.length;
    const link = items[index];
    image.src = link.dataset.full || link.href;
    image.alt = link.dataset.alt || "";
    caption.textContent = link.dataset.caption || "";
    counter.textContent = items.length > 1 ? index + 1 + " / " + items.length : "";
    if (link.dataset.projectUrl) {
      projectLink.href = link.dataset.projectUrl;
      projectLink.textContent = "View this event: " + (link.dataset.projectTitle || "");
      projectLink.hidden = false;
    } else {
      projectLink.hidden = true;
    }
    [index + 1, index - 1].forEach((n) => {
      const neighbour = items[(n + items.length) % items.length];
      if (neighbour && neighbour !== link) new Image().src = neighbour.dataset.full || neighbour.href;
    });
  }
  const step = (delta) => { if (items.length > 1) show(index + delta); };

  document.addEventListener("click", (event) => {
    const link = event.target.closest("[data-lightbox]");
    if (!link) return;
    if (event.ctrlKey || event.metaKey || event.shiftKey) return; // let "open in new tab" work
    event.preventDefault();
    items = Array.from(document.querySelectorAll("[data-lightbox]"));
    opener = link;
    dialog.showModal();
    root.classList.add("overflow-hidden");
    show(items.indexOf(link));
  });

  dialog.addEventListener("close", () => {
    image.removeAttribute("src");
    root.classList.remove("overflow-hidden");
    if (opener && opener.isConnected) opener.focus();
  });
  dialog.querySelector("[data-lb-close]").addEventListener("click", () => dialog.close());
  dialog.querySelector("[data-lb-prev]").addEventListener("click", () => step(-1));
  dialog.querySelector("[data-lb-next]").addEventListener("click", () => step(1));
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog || event.target === stage) dialog.close(); // click on the dark area
  });
  dialog.addEventListener("keydown", (event) => {
    if (event.key === "ArrowRight") step(1);
    else if (event.key === "ArrowLeft") step(-1);
  });

  // Swipe: a mostly-horizontal drag of 50 px or more changes the photo.
  let startX = 0;
  let startY = 0;
  stage.addEventListener("pointerdown", (event) => { startX = event.clientX; startY = event.clientY; });
  stage.addEventListener("pointerup", (event) => {
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    if (Math.abs(dx) >= 50 && Math.abs(dx) > Math.abs(dy) * 1.5) step(dx < 0 ? 1 : -1);
  });
})();

// ============================== Enquiry form helpers ==============================
// Remember where a visitor came from (UTM tags in the landing URL) for the whole browsing session,
// and put them into the form's hidden fields. sessionStorage only: no cookies, nothing leaves the browser.
(function () {
  const KEYS = ["utm_source", "utm_medium", "utm_campaign"];
  const STORE = "sd_utm";
  try {
    const params = new URLSearchParams(window.location.search);
    const found = {};
    KEYS.forEach((key) => { if (params.get(key)) found[key] = params.get(key).slice(0, 100); });
    if (Object.keys(found).length) sessionStorage.setItem(STORE, JSON.stringify(found));
  } catch (error) { /* storage blocked: the form simply has no campaign data */ }

  function fill(root) {
    try {
      const saved = JSON.parse(sessionStorage.getItem(STORE) || "{}");
      root.querySelectorAll("input[data-utm]").forEach((input) => {
        if (saved[input.dataset.utm] && !input.value) input.value = saved[input.dataset.utm];
      });
    } catch (error) { /* ignore */ }
  }
  document.addEventListener("DOMContentLoaded", () => fill(document));
  document.addEventListener("htmx:afterSettle", () => fill(document));
})();

// After the form is replaced by a result (success or errors), move keyboard / screen-reader focus to it.
document.addEventListener("htmx:afterSettle", () => {
  const status = document.querySelector("#enquiry-card [data-form-status]");
  if (status) status.focus({ preventScroll: true });
});

// Count a finished enquiry once as a "generate_lead" conversion (also on the /contact/thanks/ page).
(function () {
  const WINDOW_MS = 30 * 60 * 1000; // a refresh of the thank-you page must not count twice
  function trackLead() {
    const marker = document.querySelector("[data-lead-success]");
    if (!marker || marker.dataset.tracked) return;
    marker.dataset.tracked = "1";
    try {
      const last = Number(sessionStorage.getItem("sd_lead_tracked") || 0);
      if (Date.now() - last < WINDOW_MS) return;
      sessionStorage.setItem("sd_lead_tracked", String(Date.now()));
    } catch (error) { /* storage blocked: count it */ }
    window.sdTrack("generate_lead", { event_type: marker.dataset.eventType || "" });
  }
  document.addEventListener("DOMContentLoaded", trackLead);
  document.addEventListener("htmx:afterSettle", trackLead);
})();

// Count taps on call and WhatsApp buttons anywhere on the site.
document.addEventListener("click", (event) => {
  const link = event.target.closest("a[href]");
  if (!link) return;
  const href = link.getAttribute("href") || "";
  if (href.startsWith("tel:")) window.sdTrack("click_to_call");
  else if (/^https:\/\/wa\.me\//.test(href)) window.sdTrack("click_whatsapp");
});
