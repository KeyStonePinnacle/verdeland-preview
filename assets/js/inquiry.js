(() => {
  'use strict';
  const form = document.querySelector('#property-inquiry');
  if (!form) return;
  const status = document.querySelector('#inquiry-status');
  const submit = form.querySelector('[type=submit]');
  let challenge, pendingChallenge, sending = false, started = false;
  const fields = ['name','email','phone','inquiryType','message'];
  // Exact allowlist is also enforced on the server; never send this choice to analytics.
  const inquiryTypes = ['general','buying_home','upcoming_projects','selling_land','selling_older_home','selling_bungalow','selling_oversized_lot','selling_vacant_property','estate_property','foreclosure_sale','short_sale'];
  // Keep these input rules aligned with lib/inquiry-handler.mjs.
  const fieldLimits = {name:120,email:254,phone:40,inquiryType:40,message:4000};
  const singleLineControl = /[\u0000-\u001f\u007f-\u009f]/;
  const messageControl = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/;
  function validEmail(value) {
    if (value.length > 254 || singleLineControl.test(value)) return false;
    const parts = value.split('@');
    if (parts.length !== 2 || parts[0].length > 64 || !/^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*$/i.test(parts[0])) return false;
    const labels = parts[1].split('.');
    return labels.length >= 2 && labels.every(label => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(label));
  }
  function validPhone(value) {
    if (!/^\+?[\d\s().-]+$/.test(value) || singleLineControl.test(value)) return false;
    let open = false;
    for (const char of value) {
      if (char === '(') { if (open) return false; open = true; }
      if (char === ')') { if (!open) return false; open = false; }
    }
    if (open || /\([^\d]*\)/.test(value)) return false;
    let digits = value.replace(/\D/g,'');
    const international = value.startsWith('+') || value.startsWith('00');
    if (value.startsWith('00')) digits = digits.slice(2);
    if (!/^[1-9]\d{6,14}$/.test(digits) || /^(\d)\1+$/.test(digits)) return false;
    if (international && !digits.startsWith('1')) return true;
    const national = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
    return /^[2-9]\d{2}[2-9]\d{6}$/.test(national) && !/^(\d)\1+$/.test(national);
  }
  function inquiryStart(event) {
    if (event.isTrusted === false || !fields.includes(event.target?.name) || started) return;
    // Consume the start even without consent; later permission never replays it.
    started = true;
    window.VerdeAnalytics?.track('inquiry_start', {property_id:'none'});
  }
  form.addEventListener('input', inquiryStart);
  function validate(name) {
    const input = form.elements[name], raw = input.value, value = raw.trim();
    let message = '';
    if (name === 'name' && !value.replace(/[\p{White_Space}\p{Cf}]/gu,'')) message = 'Enter your name.';
    if (name === 'email' && !validEmail(value)) message = 'Enter a valid email address, such as name@example.com.';
    if (name === 'phone' && !validPhone(value)) message = 'Enter a valid phone number with an area code, or + and a country code.';
    if (name === 'inquiryType' && !inquiryTypes.includes(raw)) message = 'Choose an inquiry type from the list.';
    if (name === 'message' && !/[\p{L}\p{N}]/u.test(value)) message = 'Enter a question or message.';
    if ((name === 'message' ? messageControl : singleLineControl).test(raw)) message = 'Remove unsupported characters from this entry.';
    if (raw.length > fieldLimits[name]) message = `Use ${fieldLimits[name]} characters or fewer.`;
    input.setAttribute('aria-invalid', String(!!message));
    document.querySelector('#error-' + name).textContent = message;
    return !message;
  }
  // Correct existing errors while typing, so blurring to Send cannot move the button mid-click.
  function recheckError(event) {
    const name = event.target?.name;
    if (fields.includes(name) && form.elements[name].getAttribute('aria-invalid') === 'true') validate(name);
  }
  form.addEventListener('input', recheckError);
  form.addEventListener('change', recheckError);
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
    if (invalid.length) { status.textContent = 'Please check the highlighted fields. Your entries are still here.'; form.elements[invalid[0]].focus(); return; }
    sending = true; submit.disabled = true; submit.textContent = 'Sending…'; status.textContent = '';
    const recordAcceptance = window.VerdeAnalytics?.beginInquirySubmission('none');
    try {
      const session = await getChallenge();
      const payload = {token:session.token, property:'', website:form.elements.website.value};
      fields.forEach(name => { payload[name] = form.elements[name].value.trim(); });
      const response = await fetch('/api/inquiry', {method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','X-Verde-Inquiry':'1'},body:JSON.stringify(payload),signal:AbortSignal.timeout(20000)});
      const result = await response.json();
      if (!response.ok || result.accepted !== true) {
        if (result.code === 'invalid' || result.code === 'too_large') throw new Error('Please check your inquiry type, name, email, phone number and question. Your entries are still here.');
        if (response.status === 429) throw new Error('Please wait a few minutes before trying again. Your entries are still here.');
        if (result.code === 'too_soon') throw new Error('Please wait a few seconds and try again. Your entries are still here.');
        if (result.code === 'expired') { challenge = null; throw new Error('Please try again to refresh the form. Your entries are still here.'); }
        throw new Error('We could not confirm that your inquiry was sent. Your entries are still here. Please try again or email info@verdelandhomebuilders.com.');
      }
      status.textContent = 'Your inquiry was accepted by our email service for delivery to info@verdelandhomebuilders.com. Thank you.';
      recordAcceptance?.(result.receipt);
      form.reset(); challenge = null; started = false;
      fields.forEach(name => { form.elements[name].removeAttribute('aria-invalid'); document.querySelector('#error-' + name).textContent = ''; });
    } catch (error) {
      status.textContent = error.message === 'unavailable' || error instanceof TypeError || error instanceof SyntaxError || error.name === 'TimeoutError'
        ? 'The inquiry form is unavailable. Your entries are still here. Please email info@verdelandhomebuilders.com or try again later.'
        : error.message;
    } finally {
      sending = false; submit.disabled = false; submit.textContent = 'Send inquiry'; status.focus();
    }
  });
})();
