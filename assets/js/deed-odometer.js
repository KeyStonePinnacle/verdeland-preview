/* Deed odometer (D-039): rolls through the unique street addresses found in
   the Nassau County Clerk deed record (grantor: VerdeLand Homes Inc.).
   Addresses only — never buyer names. Register framing: these are recorded
   SALES, never "homes built". Pauses on hover/focus, stops off-screen, and
   renders fully static under prefers-reduced-motion. */
(function () {
  var ENTRIES = [["1319 Herald Ave", 2001], ["1309 Herald Ave", 2001], ["1046 Mahopac Rd", 2001], ["555 Emerson St", 2002], ["1315 Herald Ave", 2002], ["1321 Herald Ave", 2002], ["245 Pamlico Ave", 2002], ["806 Nassau Rd", 2003], ["64 Debevoise Ave", 2003], ["10 Wheeler Ave", 2003], ["8 Wheeler Ave", 2003], ["1570 Rosser Ave", 2003], ["569 Kirkman Ave", 2003], ["999 Cleveland St", 2003], ["215 Manhattan Ave", 2004], ["1016 Van Buren St", 2004], ["150 Kingston Ave", 2004], ["263 Randall Ave", 2004], ["346 Doris Ave", 2004], ["1050 Mahopac Rd", 2004], ["325 Louis Ave", 2004], ["16 Wilson Pl", 2004], ["269 Randall Ave", 2004], ["2906 Grand Ave", 2004], ["59 Biltmore Ave", 2004], ["216 Cornell St", 2004], ["65 Biltmore Ave", 2004], ["18 Brooks Ave", 2005], ["212 Cornell St", 2005], ["458 Clinton Ave", 2005], ["58 Madison Ave", 2005], ["1006 Harrison St", 2005], ["454 Clinton Ave", 2005], ["51 Cumberland Ave", 2005], ["56 Madison Ave", 2006], ["1069 Arthur St", 2006], ["8 Andrews Ave", 2006], ["62 Burnett St", 2006], ["1030 Elizabeth St", 2006], ["394 Pinebrook Ave", 2006], ["66 Burnett St", 2006], ["135 Brooks Ave", 2006], ["77 West Clinton Ave", 2006], ["95 Newport Rd", 2006], ["78 Glenmore Ave", 2006], ["45 Cumberland Ave", 2006], ["90 Kingston Ave", 2006], ["1032 Cleveland St", 2007], ["1059 Harrison St", 2007], ["74 Glenmore Ave", 2007], ["1063 Harrison St", 2007], ["39 Mirin Ave", 2007], ["186 Hillsboro Ave", 2007], ["3 Denton Pl", 2007], ["38 Burnett St", 2007], ["169 Mayfair Ave", 2007], ["328 Louis Ave", 2007], ["556 Paff Ave", 2007], ["100 Ambrose Ave", 2008], ["3109 Royal Ave", 2008], ["1028 Cleveland St", 2008], ["93 Nassau Ln", 2009], ["91 Nassau Ln", 2009], ["724 Jennings Ave", 2010], ["668 Maude St", 2010], ["663 Evelyn Ave", 2014], ["64 Booth St", 2015], ["Virginia St", 2016]];
  var root = document.getElementById('deed-odo');
  if (!root) return;

  var digitsHost = root.querySelector('[data-odo-digits]');
  var addrHost = root.querySelector('[data-odo-address]');
  var total = ENTRIES.length;
  var pad = String(total).length;

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (reduced.matches) {
    digitsHost.textContent = String(total);
    addrHost.textContent = ENTRIES[0][0] + ' \u00b7 ' + ENTRIES[0][1];
    root.classList.add('odo--static');
    return;
  }

  // Build odometer digit columns: each is a strip of 0-9, shifted per digit.
  var cols = [];
  for (var i = 0; i < pad; i++) {
    var col = document.createElement('span');
    col.className = 'odo-col';
    var strip = document.createElement('span');
    strip.className = 'odo-strip';
    for (var d = 0; d <= 9; d++) {
      var cell = document.createElement('span');
      cell.textContent = d;
      strip.appendChild(cell);
    }
    col.appendChild(strip);
    digitsHost.appendChild(col);
    cols.push(strip);
  }

  var idx = -1, timer = null, visible = false, hovered = false;

  function setCounter(n) {
    var s = String(n).padStart(pad, '0');
    for (var i = 0; i < pad; i++) {
      cols[i].style.transform = 'translateY(-' + (+s[i]) + 'em)';
    }
  }

  function step() {
    idx = (idx + 1) % total;
    setCounter(idx + 1);
    // Split-flap swap: outgoing rolls up, incoming rolls in from below.
    var old = addrHost.querySelector('.odo-line');
    var line = document.createElement('span');
    line.className = 'odo-line odo-line--in';
    line.innerHTML = '';
    var a = document.createElement('span'); a.textContent = ENTRIES[idx][0];
    var y = document.createElement('span'); y.className = 'odo-year'; y.textContent = ENTRIES[idx][1];
    line.appendChild(a); line.appendChild(y);
    addrHost.appendChild(line);
    if (old) {
      old.classList.add('odo-line--out');
      old.addEventListener('transitionend', function () { old.remove(); }, { once: true });
      // Safety net if transitionend never fires (tab hidden, etc.)
      setTimeout(function () { if (old.parentNode) old.remove(); }, 1200);
    }
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { line.classList.remove('odo-line--in'); });
    });
  }

  function maybeRun() {
    var should = visible && !hovered && !document.hidden;
    if (should && !timer) { step(); timer = setInterval(step, 2600); }
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
