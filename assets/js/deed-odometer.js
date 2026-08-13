/* Deed scrambler (D-039, revised per owner): one line that slot-machine
   scrambles and resolves into each address from the Nassau County Clerk deed
   record (grantor: VerdeLand Homes Inc.). Addresses + first deed year only —
   never buyer names. Register framing: recorded SALES, never "homes built".
   Pauses on hover/focus, stops off-screen or when the tab is hidden, and
   renders fully static under prefers-reduced-motion. */
(function () {
  var ENTRIES = [["1319 Herald Ave", 2001], ["1309 Herald Ave", 2001], ["1046 Mahopac Rd", 2001], ["555 Emerson St", 2002], ["1315 Herald Ave", 2002], ["1321 Herald Ave", 2002], ["245 Pamlico Ave", 2002], ["806 Nassau Rd", 2003], ["64 Debevoise Ave", 2003], ["10 Wheeler Ave", 2003], ["8 Wheeler Ave", 2003], ["1570 Rosser Ave", 2003], ["569 Kirkman Ave", 2003], ["999 Cleveland St", 2003], ["215 Manhattan Ave", 2004], ["1016 Van Buren St", 2004], ["150 Kingston Ave", 2004], ["263 Randall Ave", 2004], ["346 Doris Ave", 2004], ["1050 Mahopac Rd", 2004], ["325 Louis Ave", 2004], ["16 Wilson Pl", 2004], ["269 Randall Ave", 2004], ["2906 Grand Ave", 2004], ["59 Biltmore Ave", 2004], ["216 Cornell St", 2004], ["65 Biltmore Ave", 2004], ["18 Brooks Ave", 2005], ["212 Cornell St", 2005], ["458 Clinton Ave", 2005], ["58 Madison Ave", 2005], ["1006 Harrison St", 2005], ["454 Clinton Ave", 2005], ["51 Cumberland Ave", 2005], ["56 Madison Ave", 2006], ["1069 Arthur St", 2006], ["8 Andrews Ave", 2006], ["62 Burnett St", 2006], ["1030 Elizabeth St", 2006], ["394 Pinebrook Ave", 2006], ["66 Burnett St", 2006], ["135 Brooks Ave", 2006], ["77 West Clinton Ave", 2006], ["95 Newport Rd", 2006], ["78 Glenmore Ave", 2006], ["45 Cumberland Ave", 2006], ["90 Kingston Ave", 2006], ["1032 Cleveland St", 2007], ["1059 Harrison St", 2007], ["74 Glenmore Ave", 2007], ["1063 Harrison St", 2007], ["39 Mirin Ave", 2007], ["186 Hillsboro Ave", 2007], ["3 Denton Pl", 2007], ["38 Burnett St", 2007], ["169 Mayfair Ave", 2007], ["328 Louis Ave", 2007], ["556 Paff Ave", 2007], ["100 Ambrose Ave", 2008], ["3109 Royal Ave", 2008], ["1028 Cleveland St", 2008], ["93 Nassau Ln", 2009], ["91 Nassau Ln", 2009], ["724 Jennings Ave", 2010], ["668 Maude St", 2010], ["663 Evelyn Ave", 2014], ["64 Booth St", 2015], ["Virginia St", 2016]];
  var root = document.getElementById('deed-odo');
  if (!root) return;

  var addrEl = root.querySelector('[data-odo-address]');
  var yearEl = root.querySelector('[data-odo-year]');
  var total = ENTRIES.length;

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (reduced.matches) {
    addrEl.textContent = ENTRIES[0][0];
    yearEl.textContent = ENTRIES[0][1];
    root.classList.add('odo--static');
    return;
  }

  var LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  var DIGITS = '0123456789';

  function scrambleChar(target) {
    if (target === ' ') return ' ';
    // Underscores mixed with random glyphs gives the decode look.
    if (Math.random() < 0.45) return '_';
    var set = /\d/.test(target) ? DIGITS : LETTERS;
    return set[Math.floor(Math.random() * set.length)];
  }

  // Scramble el toward text, locking characters in left to right.
  function decode(el, text, duration) {
    var start = null;
    function frame(ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / duration, 1);
      var locked = Math.floor(text.length * p);
      var out = '';
      for (var i = 0; i < text.length; i++) {
        out += (i < locked || p === 1) ? text[i] : scrambleChar(text[i]);
      }
      el.textContent = out;
      if (p < 1) el._raf = requestAnimationFrame(frame);
    }
    cancelAnimationFrame(el._raf);
    el._raf = requestAnimationFrame(frame);
  }

  var idx = -1, timer = null, visible = false, hovered = false;

  function step() {
    idx = (idx + 1) % total;
    decode(addrEl, ENTRIES[idx][0], 900);
    decode(yearEl, String(ENTRIES[idx][1]), 900);
  }

  function maybeRun() {
    var should = visible && !hovered && !document.hidden;
    if (should && !timer) { step(); timer = setInterval(step, 3200); }
    if (!should && timer) { clearInterval(timer); timer = null; }
  }

  new IntersectionObserver(function (entries) {
    visible = entries[0].isIntersecting;
    maybeRun();
  }, { threshold: 0.2 }).observe(root);

  root.addEventListener('mouseenter', function () { hovered = true; maybeRun(); });
  root.addEventListener('mouseleave', function () { hovered = false; maybeRun(); });
  root.addEventListener('focusin', function () { hovered = true; maybeRun(); });
  root.addEventListener('focusout', function () { hovered = false; maybeRun(); });
  document.addEventListener('visibilitychange', maybeRun);
})();
