/* Owner arrange mode (prototype tool, not site UI).
   Drag or arrow-nudge gallery photos and home cards into a new order.
   Order persists in localStorage per page+list; "Copy order" exports a
   compact JSON the owner pastes to Claude to make permanent in the HTML. */
(function () {
  var cfgs = window.ARRANGE_LISTS || [];
  if (!cfgs.length) return;
  var activeCount = 0, bar = null;

  function storeKey(cfg) { return 'vl-order:' + location.pathname + ':' + cfg.id; }

  function items(cfg) {
    return [].slice.call(cfg.container.querySelectorAll(':scope > ' + cfg.item));
  }

  function keyOf(el, cfg) {
    if (cfg.keyAttr === 'img') {
      var im = el.tagName === 'IMG' ? el : el.querySelector('img');
      return im ? im.getAttribute('src').split('/').pop() : '?';
    }
    var t = el.querySelector('.card-title');
    return t ? t.textContent.trim() : el.textContent.trim().slice(0, 40);
  }

  function save(cfg) {
    localStorage.setItem(storeKey(cfg), JSON.stringify(items(cfg).map(function (el) { return keyOf(el, cfg); })));
  }

  function applySaved(cfg) {
    var raw = localStorage.getItem(storeKey(cfg));
    if (!raw) return;
    try {
      var order = JSON.parse(raw);
      var map = {};
      items(cfg).forEach(function (el) { map[keyOf(el, cfg)] = el; });
      order.forEach(function (k) { if (map[k]) cfg.container.appendChild(map[k]); });
    } catch (e) {}
  }

  function serializeAll() {
    var out = { page: location.pathname.split('/').pop(), lists: {} };
    cfgs.forEach(function (cfg) {
      out.lists[cfg.id] = items(cfg).map(function (el) { return keyOf(el, cfg); });
    });
    return JSON.stringify(out);
  }

  function makeBar() {
    if (bar) return bar;
    bar = document.createElement('div');
    bar.className = 'arrange-bar';
    bar.innerHTML = '<span>Arranging &mdash; drag items or use the arrows</span>' +
      '<button type="button" data-act="copy">Copy order</button>' +
      '<button type="button" data-act="reset">Reset</button>' +
      '<button type="button" data-act="done">Done</button>';
    bar.addEventListener('click', function (e) {
      var act = e.target.getAttribute && e.target.getAttribute('data-act');
      if (act === 'done') { cfgs.forEach(function (c) { if (c.on) toggle(c); }); }
      if (act === 'reset') {
        cfgs.forEach(function (c) { localStorage.removeItem(storeKey(c)); });
        location.reload();
      }
      if (act === 'copy') {
        var s = serializeAll();
        function done() { e.target.textContent = 'Copied — paste it to Claude'; setTimeout(function(){ e.target.textContent = 'Copy order'; }, 2500); }
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(s).then(done, function () { window.prompt('Copy this order:', s); });
        } else { window.prompt('Copy this order:', s); }
      }
    });
    document.body.appendChild(bar);
    return bar;
  }

  function addHandles(el, cfg) {
    if (el.querySelector(':scope > .arrange-handle')) return;
    var h = document.createElement('div');
    h.className = 'arrange-handle';
    h.innerHTML = '<button type="button" data-mv="-1" aria-label="Move earlier">&#9650;</button>' +
                  '<button type="button" data-mv="1" aria-label="Move later">&#9660;</button>';
    h.addEventListener('click', function (e) {
      var mv = e.target.getAttribute && e.target.getAttribute('data-mv');
      if (!mv) return;
      e.preventDefault(); e.stopPropagation();
      if (mv === '-1' && el.previousElementSibling) el.parentNode.insertBefore(el, el.previousElementSibling);
      if (mv === '1' && el.nextElementSibling) el.parentNode.insertBefore(el.nextElementSibling, el);
      save(cfg);
    });
    el.appendChild(h);
  }

  /* Pointer-based drag: press anywhere on an item and move it — a ghost
     follows the cursor while the real item reorders live underneath.
     (HTML5 drag-and-drop fought the browser's native image drag, which is
     why dragging photos felt dead; arrows stay as a precision fallback.) */
  var dragEl = null, ghost = null;
  function wireDrag(el, cfg) {
    if (el.dataset.dragWired) return;
    el.dataset.dragWired = '1';
    el.addEventListener('pointerdown', function (e) {
      if (!cfg.on || dragEl) return;
      if (e.target.closest && e.target.closest('.arrange-handle')) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      e.preventDefault();
      var sx = e.clientX, sy = e.clientY, started = false;
      var r = el.getBoundingClientRect();
      dragEl = el;
      try { el.setPointerCapture(e.pointerId); } catch (err) {}
      function begin() {
        started = true;
        ghost = el.cloneNode(true);
        ghost.classList.add('drag-ghost');
        ghost.style.left = r.left + 'px'; ghost.style.top = r.top + 'px';
        ghost.style.width = r.width + 'px'; ghost.style.height = r.height + 'px';
        document.body.appendChild(ghost);
        el.classList.add('is-dragging');
      }
      function onMove(ev) {
        if (!started && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 6) return;
        if (!started) begin();
        ghost.style.transform = 'translate(' + (ev.clientX - sx) + 'px,' + (ev.clientY - sy) + 'px)';
        // climb to the container's direct child (elementFromPoint may hit
        // an inner img/anchor whose own selector match isn't the item)
        var t = document.elementFromPoint(ev.clientX, ev.clientY);
        while (t && t.parentNode !== el.parentNode) t = t.parentNode;
        if (t && t !== el && t.nodeType === 1) {
          if (el.compareDocumentPosition(t) & Node.DOCUMENT_POSITION_FOLLOWING)
            el.parentNode.insertBefore(el, t.nextSibling);
          else
            el.parentNode.insertBefore(el, t);
        }
      }
      function onUp() {
        el.removeEventListener('pointermove', onMove);
        el.removeEventListener('pointerup', onUp);
        el.removeEventListener('pointercancel', onUp);
        if (ghost) { ghost.remove(); ghost = null; }
        el.classList.remove('is-dragging');
        dragEl = null;
        if (started) save(cfg);
      }
      el.addEventListener('pointermove', onMove);
      el.addEventListener('pointerup', onUp);
      el.addEventListener('pointercancel', onUp);
    });
  }

  function toggle(cfg) {
    cfg.on = !cfg.on;
    cfg.container.classList.toggle('is-arranging', cfg.on);
    cfg.btn.textContent = cfg.on ? 'Done arranging' : cfg.label;
    activeCount += cfg.on ? 1 : -1;
    if (cfg.on) {
      items(cfg).forEach(function (el) {
        // Galleries hold bare <img>; wrap so handles have a positioned parent
        if (el.tagName === 'IMG') {
          var w = document.createElement('div');
          w.className = 'g-item';
          el.parentNode.insertBefore(w, el); w.appendChild(el); el = w;
        }
        var im = el.tagName === 'IMG' ? el : el.querySelector('img');
        if (im) im.draggable = false;
        addHandles(el, cfg); wireDrag(el, cfg);
      });
      // after wrapping, item selector must also match wrappers
      if (cfg.item.indexOf('.g-item') === -1) cfg.item = cfg.item + ', .g-item';
      makeBar().style.display = 'flex';
      if (!cfg.clickGuard) {
        cfg.clickGuard = function (e) {
          if (cfg.on && e.target.closest && e.target.closest('a')) e.preventDefault();
        };
        cfg.container.addEventListener('click', cfg.clickGuard, true);
      }
    } else if (activeCount === 0 && bar) {
      bar.style.display = 'none';
    }
  }

  cfgs.forEach(function (cfg) {
    cfg.container = document.querySelector(cfg.list);
    if (!cfg.container) return;
    applySaved(cfg);
    var host = document.querySelector(cfg.buttonHost) || cfg.container.parentNode;
    cfg.btn = document.createElement('button');
    cfg.btn.type = 'button';
    cfg.btn.className = 'arrange-toggle';
    cfg.btn.textContent = cfg.label;
    cfg.btn.addEventListener('click', function () { toggle(cfg); });
    host.appendChild(cfg.btn);
  });
})();
