(() => {
  'use strict';
  const propertyIds = new Set(['home-detail','1316-r-street','833-cleveland-street','837-cleveland-street','33-horace-avenue','176-hillsboro-avenue','1063-mahopac-road','1053-mahopac-road','121-east-fulton-avenue']);
  const id = document.body.dataset.home;
  const propertyId = propertyIds.has(id) && location.pathname === '/' + id + '.html' ? id : 'none';
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
