// Keep the same live controls and event handlers when switching layouts.
const compact = matchMedia('(max-width: 700px), (max-width: 1100px) and (max-height: 520px), (max-width: 1100px) and (pointer: coarse)');
const menu = document.querySelector('.world-menu');
const summary = menu.querySelector('summary');
const nav = menu.querySelector('nav');
const desktopSummary = summary.textContent;
const controls = [...document.querySelectorAll('.tools > button, .camera-button, .home-button')].map(button => {
  const placeholder = document.createComment(`Home for ${button.id}`);
  button.before(placeholder);
  button.classList.add('menu-control');
  if (!button.hasAttribute('aria-label')) button.setAttribute('aria-label', button.textContent.trim());
  return {button, placeholder};
});
const detailButton = document.createElement('button');
detailButton.type = 'button';
detailButton.className = 'mobile-detail-toggle';
detailButton.setAttribute('aria-pressed', 'false');
const detailName = document.querySelector('.field-notes, .course-card') ? 'map & progress' : 'map';
detailButton.textContent = `Show ${detailName}`;
nav.append(detailButton);
detailButton.onclick = () => {
  const shown = document.body.classList.toggle('mobile-details-open');
  detailButton.setAttribute('aria-pressed', String(shown));
  detailButton.textContent = `${shown ? 'Hide' : 'Show'} ${detailName}`;
  menu.open = false;
};
nav.addEventListener('click', event => {
  if (event.target.closest('button, a')) menu.open = false;
});
document.addEventListener('pointerdown', event => {
  if (menu.open && !menu.contains(event.target)) menu.open = false;
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && menu.open) { menu.open = false; summary.focus(); }
});
function updateLayout() {
  document.body.classList.toggle('compact-hud', compact.matches);
  summary.textContent = compact.matches ? 'Menu ☰' : desktopSummary;
  nav.setAttribute('aria-label', compact.matches ? 'Worlds and game controls' : 'Choose a world');
  for (const {button, placeholder} of controls) {
    if (compact.matches) nav.insertBefore(button, detailButton);
    else placeholder.after(button);
  }
  menu.open = false;
}
compact.addEventListener('change', updateLayout);
updateLayout();
const touchHelp = document.createElement('p');
touchHelp.className = 'touch-help';
touchHelp.textContent = 'Use the joystick to move. Swipe the world to look around, pinch to zoom, and tap ↑ to jump. ' + (document.querySelector('#reset-camera') ? 'Walk onto marshmallows for an extra bounce.' : 'A button appears when a special action is nearby.');
document.querySelector('#help-dialog dl').after(touchHelp);
if (document.querySelector('#reset-camera')) document.body.classList.add('candy-world');
