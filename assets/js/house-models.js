// The viewer and model bytes load only when there is a published model.
const models = (window.VERDELAND_MODELS || []).filter(m => m.id && m.title && m.src);
const host = document.querySelector('#viewer-host');
const error = document.querySelector('#model-error');
if (models.length) {
  const selector = document.querySelector('#model-selector');
  const reset = document.querySelector('#model-reset');
  let viewer;
  const showError = message => { error.textContent = message; error.hidden = false; };
  try {
    await import('../vendor/model-viewer-4.3.1.min.js');
    await customElements.whenDefined('model-viewer');
    viewer = document.createElement('model-viewer');
    viewer.setAttribute('camera-controls', '');
    viewer.setAttribute('touch-action', 'pan-y');
    viewer.setAttribute('shadow-intensity', '0.8');
    viewer.setAttribute('camera-orbit', '35deg 70deg auto');
    viewer.setAttribute('interaction-prompt', 'none');
    viewer.setAttribute('loading', 'eager');
    viewer.addEventListener('error', () => {
      document.querySelector('#model-status').textContent = 'MODEL UNAVAILABLE';
      showError('This model couldn’t load. Try another model or reload the page.');
    });
    viewer.addEventListener('load', () => {
      error.hidden = true;
      document.querySelector('#model-status').textContent = 'INTERACTIVE 3D VIEW';
      reset.hidden = false;
    });
    host.append(viewer);
    const choose = model => {
      error.hidden = true;
      reset.hidden = true;
      document.querySelector('#model-status').textContent = 'LOADING MODEL';
      document.querySelector('#model-caption').textContent = model.description || model.title;
      viewer.alt = model.title + ' — interactive house model. Drag to rotate; scroll or pinch to zoom.';
      if (model.poster) viewer.setAttribute('poster', model.poster); else viewer.removeAttribute('poster');
      viewer.setAttribute('camera-orbit', '35deg 70deg auto');
      viewer.setAttribute('camera-target', 'auto auto auto');
      viewer.src = model.src;
      selector.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.id === model.id)));
    };
    models.forEach(model => {
      const button = document.createElement('button');
      button.textContent = model.title;
      button.dataset.id = model.id;
      button.addEventListener('click', () => choose(model));
      selector.append(button);
    });
    document.querySelector('#model-empty').hidden = true;
    // Preserve a heading for the named section after replacing its empty state.
    host.setAttribute('aria-label', 'Interactive house model');
    document.querySelector('#model-studio').removeAttribute('aria-labelledby');
    document.querySelector('#model-studio').setAttribute('aria-label', 'Interactive house models');
    host.hidden = false;
    selector.hidden = false;
    reset.addEventListener('click', () => {
      viewer.setAttribute('camera-orbit', '35deg 70deg auto');
      viewer.setAttribute('camera-target', 'auto auto auto');
      viewer.setAttribute('field-of-view', 'auto');
    });
    choose(models[0]);
  } catch {
    showError('Interactive viewing is unavailable in this browser. Please try an up-to-date browser.');
  }
}
