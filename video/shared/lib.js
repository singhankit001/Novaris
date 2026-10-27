/* Shared helpers. Everything is a pure function of timeline position (seek-safe). */
window.NV = {
  // Type text into el one char at a time (snapped), deterministic under seek.
  type(tl, el, text, at, dur) {
    const o = { n: 0 };
    el.textContent = "";
    tl.to(o, { n: text.length, duration: dur, ease: "none", snap: { n: 1 }, onUpdate: () => { el.textContent = text.slice(0, o.n); } }, at);
  },
  // Move the cursor to (x,y) and optionally click.
  cursor(tl, to, at, dur) {
    tl.to("#cursor", { x: to[0], y: to[1], duration: dur || 0.7, ease: "power3.inOut" }, at);
  },
  click(tl, x, y, at) {
    tl.set(".ripple", { x, y }, at)
      .fromTo(".ripple", { scale: 0.4, opacity: 0.9 }, { scale: 1.5, opacity: 0, duration: 0.5, ease: "power2.out", immediateRender: false }, at)
      .to("#cursor", { scale: 0.88, duration: 0.08, ease: "power2.out" }, at)
      .to("#cursor", { scale: 1, duration: 0.18, ease: "power2.out" }, at + 0.08);
  },
  // Fade the dynamic layer out so the last frame equals the (empty) first frame.
  loop(tl, total, sel, fade) {
    fade = fade || 0.45;
    tl.to(sel, { opacity: 0, duration: fade, ease: "power2.inOut" }, total - fade);
  },
};

// Lucide-style icon sprite (stroke icons), injected once. Usage: <svg><use href="#i-folder"/></svg>
(function () {
  const p = {
    folder: '<path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.7-.9l-.8-1.2A2 2 0 0 0 7.9 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/>',
    file: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/>',
    code: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="m10 13-2 2 2 2"/><path d="m14 13 2 2-2 2"/>',
    search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    shield: '<path d="M20 13c0 5-3.5 7.5-7.7 8.9a1 1 0 0 1-.6 0C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.2-2.7a1.2 1.2 0 0 1 1.6 0C14.5 3.8 17 5 19 5a1 1 0 0 1 1 1Z"/>',
    alert: '<path d="m21.7 18-8-14a2 2 0 0 0-3.5 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    branch: '<path d="M6 3v12"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/>',
    user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    chev: '<path d="m9 18 6-6-6-6"/>',
    commit: '<circle cx="12" cy="12" r="3"/><path d="M3 12h6"/><path d="M15 12h6"/>',
    send: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
    star: '<path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1Z"/>',
  };
  const sprite = '<svg xmlns="http://www.w3.org/2000/svg" style="position:absolute;width:0;height:0" aria-hidden="true">' +
    Object.entries(p).map(([k, v]) => `<symbol id="i-${k}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${v}</symbol>`).join("") + "</svg>";
  document.addEventListener("DOMContentLoaded", () => document.body.insertAdjacentHTML("afterbegin", sprite));
})();
