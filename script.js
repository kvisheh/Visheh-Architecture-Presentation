// Basic client-side gate; this does not restrict access to static assets.
const accessForm = document.querySelector('#access-form');
const codeInput = document.querySelector('#access-code');
const enterResidence = document.querySelector('#enter-residence');
let revealCode = false;
let checkingCode = false;
function updateCode() {
  codeInput.value = codeInput.value.replace(/[^0-9]/g, '').slice(0, 7);
  document.querySelectorAll('.code-dot').forEach((dot, index) => {
    const filled = index < codeInput.value.length;
    dot.classList.toggle('filled', filled);
    dot.textContent = filled ? (revealCode ? codeInput.value[index] : '●') : '';
  });
  enterResidence.disabled = checkingCode || codeInput.value.length !== 7;
  codeInput.removeAttribute('aria-invalid');
  document.querySelector('#access-error').textContent = '';
}
codeInput.addEventListener('input', updateCode);
for (const key of document.querySelectorAll('[data-digit]')) {
  key.addEventListener('click', () => {
    if (checkingCode || codeInput.value.length >= 7) return;
    codeInput.value += key.dataset.digit;
    updateCode();
  });
}
document.querySelector('#delete-code').addEventListener('click', () => {
  if (checkingCode) return;
  codeInput.value = codeInput.value.slice(0, -1); updateCode();
});
document.querySelector('#clear-code').addEventListener('click', () => {
  if (checkingCode) return;
  codeInput.value = ''; updateCode();
});
document.querySelector('#toggle-code').addEventListener('click', (event) => {
  revealCode = !revealCode;
  event.currentTarget.setAttribute('aria-pressed', String(revealCode));
  event.currentTarget.textContent = revealCode ? 'Hide passcode' : 'Show passcode';
  updateCode();
});
document.querySelector('#access-gate').addEventListener('keydown', (event) => {
  if (event.target === codeInput || event.ctrlKey || event.metaKey || event.altKey || checkingCode) return;
  if (/^[0-9]$/.test(event.key)) {
    event.preventDefault(); codeInput.value += event.key; updateCode();
  } else if (event.key === 'Backspace' || event.key === 'Delete') {
    event.preventDefault(); codeInput.value = codeInput.value.slice(0, -1); updateCode();
  } else if (event.key === 'Enter' && !enterResidence.disabled && event.target.tagName !== 'BUTTON') {
    event.preventDefault(); accessForm.requestSubmit();
  }
});

accessForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const input = document.querySelector('#access-code');
  const error = document.querySelector('#access-error');
  const submit = enterResidence;
  if (checkingCode || input.value.length !== 7) return;
  checkingCode = true;
  error.textContent = '';
  submit.disabled = true;
  try {
    const bytes = new TextEncoder().encode(input.value.trim());
    const hash = await crypto.subtle.digest('SHA-256', bytes);
    const digest = Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('');
    if (digest === '283f4babc7381fc303ef42fad8154c30eca7040f26bdb5913bec98cbee1ee2ff') {
      document.querySelector('#access-gate').hidden = true;
      document.querySelector('#client-presentation').hidden = false;
      input.value = '';
      revealCode = false;
      updateCode();
      document.querySelector('#plan-heading').focus({ preventScroll: true });
      window.scrollTo(0, 0);
    } else {
      error.textContent = 'Incorrect passcode. Please try again.';
      input.setAttribute('aria-invalid', 'true');
      input.select();
      input.focus();
    }
  } catch {
    error.textContent = 'Please open this presentation using its HTTPS website address.';
  } finally {
    checkingCode = false;
    submit.disabled = input.value.length !== 7;
  }
});

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
