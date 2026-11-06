/*
 * Site-wide behaviour, loaded on every page: tooltips, theme toggle, back-to-top button,
 * "details" popup, mobile menu and the footer year. Needs Bootstrap's script loaded first.
 */
(() => {
  const { Tooltip, Offcanvas, ScrollSpy } = bootstrap;
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

  // Back-to-top button
  const toTop = document.querySelector('[data-back-to-top]');
  if (toTop) {
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    addEventListener(
      'scroll',
      () => toTop.classList.toggle('d-none', scrollY < SHOW_BACK_TO_TOP_AFTER_PX),
      { passive: true },
    );
    toTop.addEventListener('click', () =>
      scrollTo({ top: 0, behavior: reducedMotion.matches ? 'auto' : 'smooth' }),
    );
  }

  // One popup serves every "Details" / "Case study" button: it shows that button's
  // data-detail-title and data-detail-body text.
  const modal = document.getElementById('detail-modal');
  modal?.addEventListener('show.bs.modal', (event) => {
    const trigger = event.relatedTarget;
    modal.querySelector('#detail-modal-title').textContent = trigger.dataset.detailTitle ?? '';
    modal.querySelector('#detail-modal-body').textContent = trigger.dataset.detailBody ?? '';
  });

  // No auto-rotating carousel for people who ask for reduced motion (the arrows still work)
  if (matchMedia('(prefers-reduced-motion: reduce)').matches)
    document.querySelectorAll('[data-bs-ride]').forEach((el) => el.removeAttribute('data-bs-ride'));

  // Mobile menu closes after a link is tapped; the menu highlights the section in view
  const mobileMenu = document.getElementById('mobile-menu');
  mobileMenu
    ?.querySelectorAll('.nav-link')
    .forEach((link) =>
      link.addEventListener('click', () => Offcanvas.getInstance(mobileMenu)?.hide()),
    );
  new ScrollSpy(document.body, { target: '#main-navigation', rootMargin: '0px 0px -60%' });
})();
