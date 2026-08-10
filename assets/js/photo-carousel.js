/* Property photo carousel (prototype).
   Continuous right-to-left drift like the homepage reel, but the loop is
   made by recycling DOM nodes (first photo moves to the end once it has
   fully scrolled out) instead of duplicating 34 images. Arrows tween one
   photo per click; clicking a photo opens a full-screen lightbox.
   Owner arrange mode compatibility: while the track has .is-arranging the
   strip un-rotates back to its true order, stops moving, and the CSS wraps
   it into a grid — so saved orders always start from the real first photo. */
(function () {
  var pcar = document.querySelector('.pcar');
  if (!pcar) return;
  var track = pcar.querySelector('.pcar-track');
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var SPEED = 28;               // drift, px per second
  var offset = 0;               // current translateX (positive = scrolled left)
  var target = null;            // tween destination when an arrow was clicked
  var rot = 0;                  // how many photos have been recycled to the end
  var last = null;
  var paused = false;           // true while the lightbox is open

  function stepW(el) {
    return el.offsetWidth + (parseFloat(getComputedStyle(el).marginRight) || 0);
  }

  function recycle() {
    var n = track.children.length;
    var first = track.firstElementChild;
    while (first && offset >= stepW(first)) {
      var w = stepW(first);
      offset -= w;
      if (target !== null) target -= w;
      track.appendChild(first);
      rot = (rot + 1) % n;
      first = track.firstElementChild;
    }
    while (offset < 0 && track.lastElementChild) {
      var end = track.lastElementChild;
      var we = stepW(end);
      offset += we;
      if (target !== null) target += we;
      track.insertBefore(end, track.firstElementChild);
      rot = (rot - 1 + n) % n;
    }
  }

  function frame(ts) {
    if (track.classList.contains('is-arranging')) {
      while (rot > 0) { track.insertBefore(track.lastElementChild, track.firstElementChild); rot--; }
      offset = 0; target = null; last = null;
      track.style.transform = 'none';
      requestAnimationFrame(frame);
      return;
    }
    if (last === null) last = ts;
    var dt = Math.min((ts - last) / 1000, 0.1);
    last = ts;
    if (target !== null) {
      offset += (target - offset) * Math.min(1, dt * 7);
      if (Math.abs(target - offset) < 0.5) { offset = target; target = null; }
    } else if (!paused && !reduced) {
      offset += SPEED * dt;
    }
    recycle();
    track.style.transform = 'translateX(' + (-offset) + 'px)';
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  pcar.querySelector('.pcar-arrow--next').addEventListener('click', function () {
    target = (target === null ? offset : target) + stepW(track.firstElementChild);
  });
  pcar.querySelector('.pcar-arrow--prev').addEventListener('click', function () {
    target = (target === null ? offset : target) - stepW(track.lastElementChild);
  });

  /* ------------------------------------------------------ lightbox ---- */
  var lb = null, lbImg, lbCount, order = [], idx = 0;

  function buildLb() {
    lb = document.createElement('div');
    lb.className = 'lightbox';
    lb.innerHTML =
      '<img alt="">' +
      '<button type="button" class="lb-prev" aria-label="Previous photo">&#8592;</button>' +
      '<button type="button" class="lb-next" aria-label="Next photo">&#8594;</button>' +
      '<button type="button" class="lb-close" aria-label="Close">&#215;</button>' +
      '<span class="lb-count"></span>';
    lbImg = lb.querySelector('img');
    lbCount = lb.querySelector('.lb-count');
    lb.querySelector('.lb-close').addEventListener('click', closeLb);
    lb.querySelector('.lb-prev').addEventListener('click', function () { move(-1); });
    lb.querySelector('.lb-next').addEventListener('click', function () { move(1); });
    lb.addEventListener('click', function (e) { if (e.target === lb) closeLb(); });
    document.addEventListener('keydown', function (e) {
      if (!lb || lb.style.display === 'none') return;
      if (e.key === 'Escape') closeLb();
      if (e.key === 'ArrowLeft') move(-1);
      if (e.key === 'ArrowRight') move(1);
    });
    document.body.appendChild(lb);
  }

  function show() {
    var p = order[idx];
    lbImg.src = p.src;
    lbImg.alt = p.alt;
    lbCount.textContent = (idx + 1) + ' / ' + order.length;
  }

  function move(dir) {
    idx = (idx + dir + order.length) % order.length;
    show();
  }

  function openLb(photo) {
    order = [].slice.call(track.querySelectorAll('.pcar-photo'));
    idx = Math.max(0, order.indexOf(photo));
    if (!lb) buildLb();
    lb.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    paused = true;
    show();
    lb.querySelector('.lb-close').focus();
  }

  function closeLb() {
    lb.style.display = 'none';
    document.body.style.overflow = '';
    paused = false;
  }

  track.addEventListener('click', function (e) {
    if (track.classList.contains('is-arranging')) return;
    var p = e.target.closest && e.target.closest('.pcar-photo');
    if (p) openLb(p);
  });
})();
