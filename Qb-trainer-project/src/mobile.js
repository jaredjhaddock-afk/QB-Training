import './mobile.css';

// Browser fullscreen and orientation lock are enhancements: the landscape layout
// also works in Safari and other browsers that do not expose those APIs.
export function setupMobile({ viewport, labels, onThrow, clearMovement }) {
  const layout = document.querySelector('.layout');
  const sidebar = document.querySelector('.sidebar');
  const media = matchMedia('(pointer: coarse) and (max-width: 1400px)');
  const toolbar = document.createElement('div');
  toolbar.className = 'mobile-toolbar';
  toolbar.innerHTML = `<span class="mobile-brand">POCKET LAB</span>
    <button id="playbook-open" aria-haspopup="dialog">Playbook</button>
    <button id="fullscreen-toggle">Full screen</button>`;
  viewport.append(toolbar);

  const targets = document.createElement('div');
  targets.className = 'touch-targets';
  targets.setAttribute('aria-label', 'Pass to a receiver');
  targets.innerHTML = `<span class="touch-targets-caption">TAP TO PASS</span>`;
  const buttons = labels.map((label, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'touch-receiver';
    button.dataset.receiver = label;
    button.setAttribute('aria-label', `Pass to receiver ${label}`);
    button.textContent = label;
    button.disabled = true;
    button.addEventListener('click', () => onThrow(index));
    targets.append(button);
    return button;
  });
  viewport.append(targets);

  const dialog = document.createElement('dialog');
  dialog.className = 'playbook-dialog';
  dialog.setAttribute('aria-labelledby', 'playbook-title');
  dialog.innerHTML = `<div class="playbook-heading"><div><span class="eyebrow">PREPARE YOUR NEXT REP</span><h2 id="playbook-title">Playbook</h2></div><button id="playbook-close">Back to field</button></div><div id="playbook-content"></div>`;
  document.body.append(dialog);

  const rotate = document.createElement('div');
  rotate.className = 'rotate-prompt';
  rotate.setAttribute('role', 'status');
  rotate.innerHTML = `<div class="rotate-device" aria-hidden="true">↻</div><p class="eyebrow">POCKET LAB</p><h2>Turn your phone sideways.</h2><p>Play in landscape for a full-width view of the field.</p><small>Your rep pauses while you rotate.</small>`;
  document.body.append(rotate);
  const notice = document.createElement('div');
  notice.className = 'mobile-notice';
  notice.setAttribute('role', 'status');
  document.body.append(notice);
  let noticeTimer;
  const announce = (text) => {
    clearTimeout(noticeTimer);
    notice.textContent = text;
    noticeTimer = setTimeout(() => { notice.textContent = ''; }, 4500);
  };

  const open = toolbar.querySelector('#playbook-open');
  const fullscreen = toolbar.querySelector('#fullscreen-toggle');
  const close = dialog.querySelector('#playbook-close');
  open.addEventListener('click', () => {
    clearMovement();
    dialog.showModal();
  });
  close.addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', clearMovement);
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) {
      const rect = dialog.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
    }
  });
  fullscreen.addEventListener('click', async () => {
    clearMovement();
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
        try { await screen.orientation?.lock?.('landscape'); } catch { /* Rotation remains manual. */ }
      } else {
        announce('Full screen is unavailable in this browser. Rotate your phone to use the wide field view.');
      }
    } catch {
      announce('Full screen could not start. You can still play in landscape.');
    }
  });
  document.addEventListener('fullscreenchange', () => {
    fullscreen.textContent = document.fullscreenElement ? 'Exit full screen' : 'Full screen';
  });

  function syncLayout() {
    const active = media.matches;
    document.body.classList.toggle('mobile-game', active);
    clearMovement();
    if (active) {
      const content = dialog.querySelector('#playbook-content');
      if (sidebar.parentElement !== content) content.append(sidebar);
    } else {
      if (dialog.open) dialog.close();
      if (sidebar.parentElement !== layout) layout.prepend(sidebar);
    }
    // Native dialogs occupy the top layer, so close one before showing the
    // portrait prompt; otherwise a paused playbook could cover the prompt.
    if (active && innerHeight > innerWidth && dialog.open) dialog.close();
  }
  media.addEventListener('change', syncLayout);
  window.addEventListener('resize', syncLayout);
  document.addEventListener('visibilitychange', clearMovement);
  syncLayout();

  return {
    isPaused: () => document.hidden || dialog.open || (media.matches && innerHeight > innerWidth),
    refreshLabels() {
      buttons.forEach((button, index) => {
        button.textContent = labels[index];
        button.dataset.receiver = labels[index];
        button.setAttribute('aria-label', `Pass to receiver ${labels[index]}`);
      });
    },
    sync(phase) {
      buttons.forEach(button => { button.disabled = phase !== 'live'; });
      open.disabled = phase === 'live' || phase === 'flight';
      document.body.dataset.playPhase = phase;
    },
  };
}
