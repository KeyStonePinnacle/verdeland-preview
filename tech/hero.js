const feature = document.querySelector('#feature-image');
const views = {
 exterior: { src: '../assets/photos/837-cleveland-street/13_Exterior_Corner_Rendering.jpg', alt: 'Exterior of 837 Cleveland Street', label: '01 / EXTERIOR' },
 interior: { src: '../assets/photos/837-cleveland-street/01_Kitchen_Wide_Rendering.jpg', alt: 'Kitchen and island at 837 Cleveland Street', label: '02 / INTERIOR' }
};
document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => {
 const view = views[button.dataset.view];
 feature.src = view.src;
 feature.alt = view.alt;
 document.querySelector('#feature-index').textContent = view.label;
 document.querySelectorAll('[data-view]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
}));
