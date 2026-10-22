(() => {
  'use strict';
  const config = window.VERDE_PRIVACY_CONFIG || {};
  const key = 'verdeland-privacy-v1', lifetime = 180 * 86400000;
  const hasGpc = () => navigator.globalPrivacyControl === true;
  let choice = readChoice(), gaLoaded = false, clarityLoaded = false;
  let returnFocus, expiryTimer, stopping = false;
  function readChoice() {
    try {
      const saved = JSON.parse(localStorage.getItem(key));
      const valid = saved?.version === 1 && typeof saved.analytics === 'boolean' &&
        typeof saved.replay === 'boolean' && saved.time <= Date.now() &&
        saved.time > Date.now() - lifetime;
      if (!valid) return null;
      // An unavailable service cannot retain consent for a future activation.
      if (config.clarityEnabled !== true && saved.replay) {
        saved.replay = false;
        try { localStorage.setItem(key, JSON.stringify(saved)); } catch { /* This page still keeps replay off. */ }
      }
      return saved;
    } catch { return null; }
  }
  function clearCookies(pattern) {
    const parts = location.hostname.split('.');
    const domains = ['', ...parts.map((_, i) => '.' + parts.slice(i).join('.'))];
    document.cookie.split(';').map(c => c.split('=')[0].trim()).filter(n => pattern.test(n)).forEach(name => {
      domains.forEach(domain => {
        document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax${domain ? '; Domain=' + domain : ''}`;
      });
    });
  }
  function script(src) {
    const el = document.createElement('script'); el.async = true; el.src = src;
    el.dataset.optionalTracking = 'true'; document.head.append(el);
  }
  const propertyIds = new Set(['project-01','project-02','project-03','project-04','project-05','project-06','project-07','project-08','project-09']);
  const pagePaths = new Set(['/', '/index.html', '/project-01.html', '/homes.html', '/why-verdeland.html', '/house-models.html', '/sell-your-property.html', '/contact.html', '/guides/new-construction-nassau-county.html', '/guides/new-home-warranties-new-york.html', ...[...propertyIds].map(id => '/' + id + '.html')]);
  function safeGeneralContext() {
    return config.allowedHosts?.includes(location.hostname) && pagePaths.has(location.pathname) &&
      !location.search && (!location.hash || location.pathname === '/contact.html' && location.hash === '#meeting-location') &&
      !document.querySelector('form,[data-no-tracking]');
  }
  function safeInquiryContext() {
    if (!config.allowedHosts?.includes(location.hostname) || location.pathname !== '/contact.html' ||
        !['', '#property-inquiry-section', '#meeting-location'].includes(location.hash)) return false;
    const query = new URLSearchParams(location.search), entries = [...query];
    if (entries.length && (entries.length !== 1 || entries[0][0] !== 'property' || !propertyIds.has(entries[0][1]))) return false;
    const form = document.querySelector('#property-inquiry');
    return !!form && document.querySelectorAll('form').length === 1 &&
      [...document.querySelectorAll('[data-no-tracking]')].every(el => el.id === 'property-inquiry-section' && el.contains(form));
  }
  function safeContext() { return safeGeneralContext() || safeInquiryContext(); }
  function currentProperty() {
    const id = document.body.dataset.home;
    return propertyIds.has(id) && location.pathname === '/' + id + '.html' ? id : 'none';
  }
  function inquiryProperty() {
    const id = document.querySelector('#property-inquiry')?.elements.property.value;
    return id === '' ? 'none' : propertyIds.has(id) ? id : null;
  }
  function canMeasure() {
    return reconcileCollectors() && gaLoaded && config.gaEnabled === true && !window['ga-disable-' + config.gaId] &&
      activeConsent('analytics') && safeContext() && typeof window.gtag === 'function';
  }
  function activeConsent(category) {
    return !!choice?.[category] && !hasGpc() && choice.time <= Date.now() && choice.time > Date.now() - lifetime;
  }
  function stopCollectors() {
    if (stopping) return;
    stopping = true;
    window.clearTimeout(expiryTimer);
    window['ga-disable-' + config.gaId] = true;
    window.gtag?.('consent', 'update', {analytics_storage:'denied', ad_storage:'denied', ad_user_data:'denied', ad_personalization:'denied'});
    window.clarity?.('consentv2', {ad_Storage:'denied', analytics_Storage:'denied'});
    clearCookies(/^_ga(?:_|$)|^_gid$|^_gat|^_clck$|^_clsk$/);
    // Reload unloads automatic collectors as well as custom event handlers.
    location.reload();
  }
  function reconcileCollectors() {
    if ((gaLoaded && !activeConsent('analytics')) || (clarityLoaded && !activeConsent('replay'))) stopCollectors();
    return !stopping;
  }
  function scheduleExpiry() {
    window.clearTimeout(expiryTimer);
    if (!choice || stopping || (!gaLoaded && !clarityLoaded)) return;
    const remaining = choice.time + lifetime - Date.now();
    if (remaining <= 0) { reconcileCollectors(); return; }
    expiryTimer = window.setTimeout(() => {
      if (reconcileCollectors()) scheduleExpiry();
    }, Math.min(remaining, 2147483647));
  }
  const acceptedReceipts = new Set();
  // A narrow event interface: callers cannot pass URLs, link text or form values.
  // Events occurring before consent are discarded, never saved for later replay.
  window.VerdeAnalytics = Object.freeze({
    track(name, values) {
      if (!canMeasure() || !values || typeof values !== 'object' || Array.isArray(values)) return false;
      let params;
      const expected = currentProperty();
      if (name === 'property_view' && Object.keys(values).length === 1 &&
          Object.hasOwn(values, 'property_id') && expected !== 'none' && values.property_id === expected) {
        params = {property_id:expected};
      } else if (name === 'contact_click' && Object.keys(values).length === 2 &&
          Object.hasOwn(values, 'property_id') && Object.hasOwn(values, 'contact_method') &&
          values.property_id === expected && ['phone','email'].includes(values.contact_method)) {
        params = {property_id:expected, contact_method:values.contact_method};
      } else if (name === 'inquiry_start' && safeInquiryContext() && Object.keys(values).length === 1 &&
          Object.hasOwn(values, 'property_id') && (values.property_id === 'none' || propertyIds.has(values.property_id)) && values.property_id === inquiryProperty()) {
        params = {property_id:values.property_id};
      } else return false;
      window.gtag('event', name, params);
      return true;
    },
    // Capture eligibility at submission time. The receipt is only a local dedupe
    // key and never goes to Google. Consent changes while sending cancel measurement.
    beginInquirySubmission(propertyId) {
      const validProperty = propertyId === 'none' || propertyIds.has(propertyId);
      const consentAtSubmit = validProperty && safeInquiryContext() && canMeasure() ? choice : null;
      return receipt => {
        if (typeof receipt !== 'string' || !/^[a-f0-9]{64}$/.test(receipt) || acceptedReceipts.has(receipt)) return false;
        acceptedReceipts.add(receipt);
        if (!consentAtSubmit || consentAtSubmit !== choice || !safeInquiryContext() || !canMeasure()) return false;
        window.gtag('event', 'generate_lead', {property_id:propertyId});
        return true;
      };
    }
  });
  function apply() {
    if (!reconcileCollectors()) return;
    const analytics = activeConsent('analytics');
    const replay = activeConsent('replay') && config.clarityEnabled === true;
    if (!analytics) clearCookies(/^_ga(?:_|$)|^_gid$|^_gat/);
    if (!replay) clearCookies(/^_clck$|^_clsk$/);
    // Inquiry measurement has its own exact-route exception. Replay never does.
    const safe = safeContext();
    if (!safe) return;
    if (analytics && config.gaEnabled === true && /^G-[A-Z0-9]+$/.test(config.gaId) && !gaLoaded) {
      gaLoaded = true; window['ga-disable-' + config.gaId] = false;
      window.dataLayer = window.dataLayer || [];
      window.gtag = function() { window.dataLayer.push(arguments); };
      window.gtag('consent', 'default', {analytics_storage:'denied', ad_storage:'denied', ad_user_data:'denied', ad_personalization:'denied'});
      window.gtag('consent', 'update', {analytics_storage:'granted', ad_storage:'denied', ad_user_data:'denied', ad_personalization:'denied'});
      window.gtag('js', new Date());
      window.gtag('config', config.gaId, {send_page_view:false, allow_google_signals:false, allow_ad_personalization_signals:false, cookie_expires:15552000, cookie_update:false, page_location:'https://www.verdelandhomebuilders.com' + (location.pathname === '/' ? '/index.html' : location.pathname), page_referrer:''});
      window.gtag('event', 'page_view', {page_location:'https://www.verdelandhomebuilders.com' + (location.pathname === '/' ? '/index.html' : location.pathname), page_referrer:'', page_title:document.title});
      script('https://www.googletagmanager.com/gtag/js?id=' + config.gaId);
    }
    if (analytics && gaLoaded) window.dispatchEvent(new Event('verdeland:analytics-ready'));
    if (safeGeneralContext() && replay && config.clarityEnabled === true && /^[a-z0-9]+$/i.test(config.clarityId) && !clarityLoaded) {
      clarityLoaded = true;
      window.clarity = window.clarity || function() { (window.clarity.q = window.clarity.q || []).push(arguments); };
      window.clarity('consentv2', {ad_Storage:'denied', analytics_Storage:'granted'});
      script('https://www.clarity.ms/tag/' + config.clarityId);
    }
    scheduleExpiry();
  }
  const panel = document.createElement('section');
  panel.className = 'privacy-banner'; panel.setAttribute('aria-labelledby', 'privacy-title');
  panel.innerHTML = `<div><h2 id="privacy-title">Your privacy choices</h2><p>Optional cookies help measure visits and understand how this website is used. They stay off until you choose. You can change your choice at any time.</p><a href="/privacy.html">Privacy details</a><p class="privacy-review" ${config.gaEnabled || config.clarityEnabled ? 'hidden' : ''}>Optional analytics are not active in this review.</p><p data-gpc-notice ${hasGpc() ? '' : 'hidden'}>Your browser’s Global Privacy Control keeps optional tracking off.</p></div><div class="privacy-actions"><button type="button" data-choice="accept">Accept optional</button><button type="button" data-choice="reject">Reject optional</button><button type="button" data-preferences>Choose preferences</button></div>`;
  const dialog = document.createElement('dialog');
  dialog.className = 'privacy-dialog'; dialog.setAttribute('aria-labelledby', 'preferences-title');
  dialog.innerHTML = `<h2 id="preferences-title">Cookie preferences</h2><p>Essential site functions stay on. Advertising cookies stay off.</p><label class="privacy-option"><input type="checkbox" id="privacy-analytics"><span><strong>Visit analytics</strong><br>Google Analytics measures page visits and use of the site.</span></label><label class="privacy-option"><input type="checkbox" id="privacy-replay"><span><strong>Session replay</strong><br>${config.clarityEnabled === true ? 'Microsoft Clarity helps review page interactions. Inquiry pages are excluded.' : 'Microsoft Clarity is not active. Session replay stays off.'}</span></label><p data-gpc-notice ${hasGpc() ? '' : 'hidden'}>Global Privacy Control is on. Optional tracking stays off.</p><div class="privacy-actions"><button type="button" data-save>Save preferences</button><button type="button" data-choice="reject">Reject optional</button><button type="button" data-dismiss>Close</button></div>`;
  document.body.append(panel, dialog);
  const analyticsInput = dialog.querySelector('#privacy-analytics'), replayInput = dialog.querySelector('#privacy-replay');
  function refreshPreferences() {
    analyticsInput.disabled = hasGpc();
    replayInput.disabled = hasGpc() || config.clarityEnabled !== true;
    document.querySelectorAll('[data-gpc-notice]').forEach(el => { el.hidden = !hasGpc(); });
  }
  refreshPreferences();
  function open() {
    refreshPreferences();
    if (!reconcileCollectors()) return;
    returnFocus = document.activeElement;
    analyticsInput.checked = activeConsent('analytics');
    replayInput.checked = activeConsent('replay') && config.clarityEnabled === true;
    dialog.showModal();
  }
  dialog.addEventListener('close', () => returnFocus?.focus());
  function save(analytics, replay) {
    analytics = analytics && !hasGpc();
    replay = replay && !hasGpc() && config.clarityEnabled === true;
    const revoke = (gaLoaded && !analytics) || (clarityLoaded && !replay);
    choice = {version:1, analytics, replay, time:Date.now()};
    try { localStorage.setItem(key, JSON.stringify(choice)); } catch { /* Choices still apply to this page. */ }
    panel.hidden = true;
    if (dialog.open) dialog.close();
    if (revoke) {
      stopCollectors(); return;
    }
    apply();
  }
  [panel, dialog].forEach(el => el.querySelectorAll('[data-choice]').forEach(button => {
    button.addEventListener('click', () => save(button.dataset.choice === 'accept', button.dataset.choice === 'accept'));
  }));
  document.querySelectorAll('[data-preferences]').forEach(el => el.addEventListener('click', open));
  dialog.querySelector('[data-save]').addEventListener('click', () => save(analyticsInput.checked, replayInput.checked));
  dialog.querySelector('[data-dismiss]').addEventListener('click', () => dialog.close());
  window.addEventListener('storage', event => {
    if (event.key === key) {
      choice = readChoice();
      stopCollectors();
    }
  });
  window.addEventListener('pageshow', event => {
    if (event.persisted && JSON.stringify(readChoice()) !== JSON.stringify(choice)) stopCollectors();
    else reconcileCollectors();
  });
  const reconcileVisibility = () => { refreshPreferences(); reconcileCollectors(); };
  window.addEventListener('focus', reconcileVisibility);
  document.addEventListener('visibilitychange', reconcileVisibility);
  panel.hidden = !!choice || hasGpc();
  apply();
})();
