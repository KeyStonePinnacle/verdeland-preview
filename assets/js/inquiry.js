(() => {
  'use strict';
  const form = document.querySelector('#property-inquiry');
  if (!form) return;
  const property = form.elements.property, status = document.querySelector('#inquiry-status');
  const submit = form.querySelector('[type=submit]');
  let challenge, pendingChallenge, sending = false;
  const startedProperties = new Set();
  for (const home of homes) {
    const option = document.createElement('option'); option.value = home.id;
    option.textContent = `${home.title} · ${home.town}`; property.append(option);
  }
  const requested = new URLSearchParams(location.search).get('property');
  if (homes.some(home => home.id === requested)) property.value = requested;
  const fields = ['name','email','phone','message'];
  function propertyContext() { return homes.some(home => home.id === property.value) ? property.value : 'none'; }
  function inquiryStart(event) {
    if (event.isTrusted === false || ![...fields, 'property'].includes(event.target?.name)) return;
    const id = propertyContext();
    if (startedProperties.has(id)) return;
    // Consume the start even without consent; later permission never replays it.
    startedProperties.add(id);
    window.VerdeAnalytics?.track('inquiry_start', {property_id:id});
  }
  form.addEventListener('input', inquiryStart);
  form.addEventListener('change', event => { if (event.target?.name === 'property') inquiryStart(event); });
  function validate(name) {
    const input = form.elements[name], value = input.value.trim();
    let message = '';
    if (name === 'name' && !value) message = 'Enter your name.';
    if (name === 'email' && (!value || input.validity.typeMismatch)) message = 'Enter a valid email address.';
    if (name === 'phone' && value && (!/^[+()\d\s.\-]+$/.test(value) || value.replace(/\D/g,'').length < 7 || value.replace(/\D/g,'').length > 15)) message = 'Enter a valid phone number or leave this blank.';
    if (input.validity.tooLong) message = 'Please shorten this entry.';
    input.setAttribute('aria-invalid', String(!!message));
    document.querySelector('#error-' + name).textContent = message;
    return !message;
  }
  fields.forEach(name => form.elements[name].addEventListener('blur', () => validate(name)));
  async function getChallenge() {
    if (challenge && Date.now() < challenge.expiresAt) return challenge;
    if (!pendingChallenge) pendingChallenge = fetch('/api/inquiry', {headers:{'X-Verde-Inquiry':'1'},cache:'no-store',credentials:'same-origin',signal:AbortSignal.timeout(15000)})
      .then(async response => {
        const body = await response.json();
        if (!response.ok || typeof body.token !== 'string') throw new Error('unavailable');
        challenge = body; return body;
      }).finally(() => { pendingChallenge = null; });
    return pendingChallenge;
  }
  form.addEventListener('focusin', () => { getChallenge().catch(() => {}); }, {once:true});
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (sending) return;
    const invalid = fields.filter(name => !validate(name));
    if (invalid.length) { form.elements[invalid[0]].focus(); return; }
    sending = true; submit.disabled = true; submit.textContent = 'Sending…'; status.textContent = '';
    const submittedProperty = property.value;
    const recordAcceptance = window.VerdeAnalytics?.beginInquirySubmission(propertyContext());
    try {
      const session = await getChallenge();
      const payload = {token:session.token, property:submittedProperty, website:form.elements.website.value};
      fields.forEach(name => { payload[name] = form.elements[name].value.trim(); });
      const response = await fetch('/api/inquiry', {method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','X-Verde-Inquiry':'1'},body:JSON.stringify(payload),signal:AbortSignal.timeout(20000)});
      const result = await response.json();
      if (!response.ok || result.accepted !== true) {
        if (response.status === 429) throw new Error('Please wait a few minutes before trying again. Your entries are still here.');
        if (result.code === 'too_soon') throw new Error('Please wait a few seconds and try again. Your entries are still here.');
        if (result.code === 'expired') { challenge = null; throw new Error('Please try again to refresh the form. Your entries are still here.'); }
        throw new Error('We could not confirm that your inquiry was sent. Your entries are still here. Please try again or email info@verdelandhomebuilders.com.');
      }
      status.textContent = 'Your inquiry was accepted by our email service for delivery to info@verdelandhomebuilders.com. Thank you.';
      recordAcceptance?.(result.receipt);
      form.reset(); challenge = null; startedProperties.clear();
      fields.forEach(name => { form.elements[name].removeAttribute('aria-invalid'); document.querySelector('#error-' + name).textContent = ''; });
      if (homes.some(home => home.id === requested)) property.value = requested;
    } catch (error) {
      status.textContent = error.message === 'unavailable' || error instanceof TypeError || error instanceof SyntaxError || error.name === 'TimeoutError'
        ? 'The inquiry form is unavailable. Your entries are still here. Please email info@verdelandhomebuilders.com or try again later.'
        : error.message;
    } finally {
      sending = false; submit.disabled = false; submit.textContent = 'Send inquiry'; status.focus();
    }
  });
})();
