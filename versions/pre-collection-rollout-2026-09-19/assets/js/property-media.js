// Optional media shared by every property layout. No media means no empty section.
(() => {
 const mount = document.querySelector('[data-property-media]');
 if (!mount) return;
 const key = document.body.dataset.home || new URLSearchParams(location.search).get('home');
 const home = homes.find(item => item.id === key) || homes[0];
 const make = (tag, className, text) => {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text) el.textContent = text;
  return el;
 };
 function section(id, eyebrow, title, url, linkText) {
  const el = make('section', 'section property-media'); el.id = id;
  const heading = make('div', 'section-heading');
  const text = make('div');
  text.append(make('p', 'eyebrow', eyebrow), make('h2', '', title));
  const link = make('a', 'text-link', linkText + ' ↗');
  link.href = url; link.target = '_blank'; link.rel = 'noopener';
  heading.append(text, link); el.append(heading); mount.append(el);
  const nav = document.querySelector('.estate-jump');
  if (nav) {
   const jump = make('a', '', id === 'walkthrough' ? '3D walkthrough ↓' : 'Video tour ↓');
   jump.href = '#' + id; nav.append(jump);
  }
  return el;
 }
 if (home.walkthrough?.embedUrl) {
  const tour = home.walkthrough;
  const el = section('walkthrough', 'WALK THROUGH THE HOME', 'Look around, at your pace.', tour.url || tour.embedUrl, 'Open tour in new tab');
  const container = make('div', 'tour-embed');
  if (tour.poster) {
   const poster = make('img'); poster.src = tour.poster; poster.alt = home.title + ' walkthrough preview';
   poster.loading = 'lazy'; poster.width = 1800; poster.height = 1200; container.append(poster);
  }
  const start = make('button', 'button', 'Start 3D walkthrough ▷'); start.type = 'button';
  start.addEventListener('click', () => {
   const frame = make('iframe'); frame.src = tour.embedUrl;
   frame.title = home.title + ' interactive 3D walkthrough';
   frame.allow = 'fullscreen; xr-spatial-tracking'; frame.allowFullscreen = true;
   container.replaceChildren(frame); frame.focus();
  }, { once: true });
  container.append(start); el.append(container, make('p', 'media-note', 'Explore here on the page, or open the tour in a separate tab.'));
 }
 if (home.video?.src) {
  const el = section('video-tour', 'ANOTHER PERSPECTIVE', 'The home in motion.', home.video.src, 'Open video in new tab');
  const video = make('video', 'property-video'); video.src = home.video.src;
  video.controls = true; video.playsInline = true; video.preload = 'metadata';
  video.setAttribute('aria-label', home.title + ' video tour');
  if (home.video.poster) video.poster = home.video.poster;
  el.append(video);
 }
 mount.hidden = mount.children.length === 0;
})();
