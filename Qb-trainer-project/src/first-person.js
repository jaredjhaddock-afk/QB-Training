export const DEFAULT_LOOK = { yaw: 0, pitch: -.06 };

export function changeLook(look, dx, dy, sensitivity = .0025) {
  const yaw = look.yaw + dx * sensitivity;
  return {
    yaw: Math.atan2(Math.sin(yaw), Math.cos(yaw)),
    pitch: Math.max(-1.12, Math.min(1.12, look.pitch - dy * sensitivity)),
  };
}

export function movementDirection(yaw, strafe, forward) {
  const length = Math.max(1, Math.hypot(strafe, forward));
  return [
    (-Math.sin(yaw) * forward - Math.cos(yaw) * strafe) / length,
    (Math.cos(yaw) * forward - Math.sin(yaw) * strafe) / length,
  ];
}

export function setupFirstPerson({ viewport, canvas, enabled, paused }) {
  let look = { ...DEFAULT_LOOK };
  const stick = { strafe: 0, forward: 0 };
  let moveId = null, lookId = null, lastX = 0, lastY = 0;
  const coarse = matchMedia('(pointer: coarse)');
  const lookSurface = document.createElement('div');
  lookSurface.id = 'look-surface';
  lookSurface.setAttribute('aria-label', 'Drag here to look around');
  lookSurface.innerHTML = '<span>DRAG TO LOOK</span>';
  viewport.append(lookSurface);
  const reticle = document.createElement('div');
  reticle.className = 'look-reticle';
  reticle.setAttribute('aria-hidden', 'true');
  viewport.append(reticle);
  const hint = document.createElement('div');
  hint.className = 'mouse-look-hint';
  hint.textContent = 'Click field for mouse look · drag to look if unavailable';
  viewport.append(hint);

  const movement = document.querySelector('.mobile-keys');
  movement.innerHTML = '<div id="move-stick" role="group" tabindex="0" aria-label="Movement joystick: drag to move the quarterback"><span class="stick-thumb"></span></div><span class="stick-caption">MOVE</span>';
  const pad = movement.querySelector('#move-stick');
  const thumb = pad.querySelector('.stick-thumb');
  function updateStick(event) {
    const box = pad.getBoundingClientRect();
    let x = (event.clientX - box.x - box.width / 2) / 34;
    let y = (event.clientY - box.y - box.height / 2) / 34;
    const length = Math.max(1, Math.hypot(x, y));
    x /= length;y /= length;
    stick.strafe = x;
    stick.forward = -y;
    thumb.style.transform = `translate(${x * 28}px,${y * 28}px)`;
  }
  function releaseStick() {
    moveId = null;stick.strafe = stick.forward = 0;
    thumb.style.transform = '';
  }
  pad.addEventListener('pointerdown', event => {
    if (paused() || moveId !== null) return;
    event.preventDefault();moveId = event.pointerId;
    pad.setPointerCapture(moveId);updateStick(event);
  });
  pad.addEventListener('pointermove', event => { if (event.pointerId === moveId) updateStick(event); });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    pad.addEventListener(type, event => { if (event.pointerId === moveId) releaseStick(); });
  }

  function startLook(event) {
    if (!enabled() || paused() || lookId !== null || (event.pointerType === 'mouse' && event.button !== 0)) return;
    event.preventDefault();
    lookId = event.pointerId;lastX = event.clientX;lastY = event.clientY;
    event.currentTarget.setPointerCapture(lookId);
    if (event.pointerType === 'mouse' && !coarse.matches && canvas.requestPointerLock) {
      try {
        const promise = canvas.requestPointerLock();
        promise?.catch(() => { hint.textContent = 'Drag the field to look · WASD to move'; });
      } catch { hint.textContent = 'Drag the field to look · WASD to move'; }
    }
  }
  function dragLook(event) {
    if (event.pointerId !== lookId || document.pointerLockElement === canvas || paused() || !enabled()) return;
    look = changeLook(look, event.clientX - lastX, event.clientY - lastY, event.pointerType === 'touch' ? .0045 : .0025);
    lastX = event.clientX;lastY = event.clientY;
  }
  for (const surface of [canvas, lookSurface]) {
    surface.addEventListener('pointerdown', startLook);
    surface.addEventListener('pointermove', dragLook);
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      surface.addEventListener(type, event => { if (event.pointerId === lookId) lookId = null; });
    }
  }
  document.addEventListener('mousemove', event => {
    if (document.pointerLockElement === canvas && enabled() && !paused()) look = changeLook(look, event.movementX, event.movementY);
  });
  document.addEventListener('pointerlockchange', () => {
    hint.textContent = document.pointerLockElement === canvas ? 'Mouse look active · ESC releases the cursor' : 'Click field for mouse look · drag to look if unavailable';
  });
  document.addEventListener('pointerlockerror', () => { hint.textContent = 'Drag the field to look · WASD to move'; });
  function clear() { releaseStick();lookId = null; }
  window.addEventListener('blur', clear);
  document.addEventListener('visibilitychange', clear);
  return {
    get look() { return { ...look }; },
    get stick() { return { ...stick }; },
    clear,
    reset() { clear();look = { ...DEFAULT_LOOK }; },
    update(dt, keys) {
      document.body.classList.toggle('first-person', enabled());
      if (!enabled() || paused()) return;
      // Keyboard looking is available without mouse capture, too.
      look = changeLook(look,
        ((keys.has('arrowright') ? 1 : 0) - (keys.has('arrowleft') ? 1 : 0)) * dt,
        ((keys.has('arrowdown') ? 1 : 0) - (keys.has('arrowup') ? 1 : 0)) * dt, 1.4);
    },
  };
}
