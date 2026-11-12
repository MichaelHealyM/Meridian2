/*
 * Site-wide behaviour, loaded on every page: tooltips, theme toggle, back-to-top button,
 * "details" popup, mobile menu and the footer year. Needs Bootstrap's script loaded first.
 * (The menu's section highlighting is Bootstrap's ScrollSpy, set up with data-bs-spy on <body>.)
 */
(() => {
  const { Tooltip, Offcanvas } = bootstrap;
  const THEME_KEY = 'meridian-theme'; // same key as the small script in <head>
  const SHOW_BACK_TO_TOP_AFTER_PX = 600;

  // Footer year
  document
    .querySelectorAll('[data-year]')
    .forEach((el) => (el.textContent = new Date().getFullYear()));

  // Hover/focus tooltips (the compliance badges in the hero)
  document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach((el) => new Tooltip(el));

  // Light / dark theme toggle, remembered in the browser
  document.querySelector('[data-theme-toggle]')?.addEventListener('click', () => {
    const root = document.documentElement;
    const next = root.dataset.bsTheme === 'dark' ? 'light' : 'dark';
    root.dataset.bsTheme = next;
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      // Storage can be blocked in private browsing; the choice still applies for this visit
    }
  });

  // Back-to-top button: shown after scrolling. It is a plain href="#" link, so the scrolling
  // itself (smooth, unless the visitor prefers reduced motion) is Bootstrap's.
  const toTop = document.querySelector('[data-back-to-top]');
  if (toTop)
    addEventListener(
      'scroll',
      () => toTop.classList.toggle('d-none', scrollY < SHOW_BACK_TO_TOP_AFTER_PX),
      { passive: true },
    );

  // One popup serves every "Details" / "Case study" button. Its title is the heading of the card or
  // slide the button sits in; its text is the card's own text, unless the button has data-detail-body.
  const modal = document.getElementById('detail-modal');
  modal?.addEventListener('show.bs.modal', (event) => {
    const trigger = event.relatedTarget;
    const box = trigger.closest('article, .project-slide');
    const tidy = (text) => text.trim().replace(/\s+/g, ' ');
    modal.querySelector('#detail-modal-title').textContent = tidy(box.querySelector('h3').textContent);
    modal.querySelector('#detail-modal-body').textContent =
      trigger.dataset.detailBody ?? tidy(box.querySelector('.card-text').textContent);
  });

  // No auto-rotating carousel for people who ask for reduced motion (the arrows still work)
  if (matchMedia('(prefers-reduced-motion: reduce)').matches)
    document.querySelectorAll('[data-bs-ride]').forEach((el) => el.removeAttribute('data-bs-ride'));

  // Mobile menu: close it first, then go to the link. Jumping while the open menu still locks page
  // scrolling leaves the smooth scroll stranded part-way. (data-bs-dismiss would not help:
  // Bootstrap cancels the click on links that carry it.) On desktop the menu is a plain bar.
  const mobileMenu = document.getElementById('mobile-menu');
  mobileMenu?.querySelectorAll('.nav-link').forEach((link) =>
    link.addEventListener('click', (event) => {
      const menu = Offcanvas.getInstance(mobileMenu);
      if (!menu || !mobileMenu.classList.contains('show')) return;
      event.preventDefault();
      mobileMenu.addEventListener('hidden.bs.offcanvas', () => location.assign(link.href), {
        once: true,
      });
      menu.hide();
    }),
  );
})();
