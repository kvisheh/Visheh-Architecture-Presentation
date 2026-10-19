const dialog = document.querySelector('#render-dialog');
let selectedView = '1-south';
const renders = new Map(Object.entries(window.RENDER_IMAGES || {}));
let renderIndex = 0;
function showRender() {
  const images = renders.get(selectedView) || [];
  const image = document.querySelector('#render-image');
  image.hidden = images.length === 0;
  document.querySelector('#render-placeholder').hidden = images.length > 0;
  document.querySelector('#gallery-controls').hidden = images.length < 2;
  const controls = document.querySelector('#gallery-controls');
  controls.replaceChildren();
  images.forEach((src, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = `Type ${index + 1}`;
    button.setAttribute('aria-pressed', String(index === renderIndex));
    button.addEventListener('click', () => { renderIndex = index; showRender(); controls.children[index].focus(); });
    controls.append(button);
  });
  if (images.length) {
    image.src = images[renderIndex];
    image.alt = `${document.querySelector('#render-heading').textContent}, render ${renderIndex + 1} of ${images.length}`;
  } else image.removeAttribute('src');
}
for (const button of document.querySelectorAll('[data-room]')) {
  button.addEventListener('click', () => {
    const { room, direction } = button.dataset;
    selectedView = `${room}-${direction}`;
    const name = {'1': 'Master bedroom', '2': 'Bedroom', '3': 'Bedroom', '4': 'Dining room', '5': 'Foyer and kitchen', '6': 'Foyer', '7': 'Kitchen', '8': 'Kitchen and dining', '9': 'Living area', '10': 'Living room', '11': 'Living and TV area', '12': 'Seating area', '13': 'Washroom', '14': 'Bathroom', '15': 'Master bathroom'}[room] || 'Interior view';
    document.querySelector('#view-label').textContent = `FACING ${direction.toUpperCase()}`;
    document.querySelector('#render-heading').textContent = `${name} · Facing ${direction}`;
    document.querySelector('#render-placeholder h2').textContent = name;
    document.querySelector('#render-placeholder p').textContent = `The ${direction}-facing render will appear here once added.`;
    renderIndex = 0;
    showRender();
    document.querySelectorAll('.view-arrow').forEach(arrow => arrow.setAttribute('aria-pressed', String(arrow.dataset.room === room && arrow.dataset.direction === direction)));
    dialog.showModal();
  });
}
document.querySelector('#back-to-plan').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', (event) => {
  if (event.target !== dialog) return;
  const bounds = dialog.getBoundingClientRect();
  if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
});
