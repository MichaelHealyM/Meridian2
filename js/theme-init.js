/*
 * Runs before first paint so a saved dark theme never flashes light. New visitors get light.
 * Loaded as a normal blocking script in <head> on purpose (do not add defer).
 */
(() => {
  try {
    if (localStorage.getItem('meridian-theme') === 'dark')
      document.documentElement.dataset.bsTheme = 'dark';
  } catch {
    // Storage can be blocked in private browsing; the light default is fine
  }
})();
