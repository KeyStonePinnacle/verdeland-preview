(() => {
  'use strict';
  const config = window.VERDE_PRIVACY_CONFIG || {};
  const propertyIds = new Set(['project-01','project-02','project-03','project-04','project-05','project-06','project-07','project-08','project-09']);
  const id = document.body.dataset.home;
  const paths = config.propertyPaths;
  const path = paths === undefined ? '/' + id + '.html' :
    paths && typeof paths === 'object' && !Array.isArray(paths) && Object.hasOwn(paths, id) ? paths[id] : null;
  const propertyId = propertyIds.has(id) && typeof path === 'string' &&
    /^\/[a-z0-9]+(?:-[a-z0-9]+)*\.html$/.test(path) && location.pathname === path ? id : 'none';
  let viewed = false;
  const lastClicks = new Map();
  function propertyView() {
    if (!viewed && propertyId !== 'none' &&
        window.VerdeAnalytics?.track('property_view', {property_id:propertyId})) viewed = true;
  }
  window.addEventListener('verdeland:analytics-ready', propertyView);
  propertyView();
  document.addEventListener('click', event => {
    if (event.isTrusted === false || event.defaultPrevented) return;
    const href = event.target.closest?.('a[href]')?.getAttribute('href');
    const method = href === 'tel:+15168076127' ? 'phone' :
      href === 'mailto:info@verdelandhomebuilders.com' ? 'email' : null;
    if (!method) return;
    const now = Date.now(), previous = lastClicks.get(method);
    if (previous !== undefined && now - previous < 1000) return;
    if (window.VerdeAnalytics?.track('contact_click', {contact_method:method, property_id:propertyId})) {
      lastClicks.set(method, now);
    }
  });
})();
