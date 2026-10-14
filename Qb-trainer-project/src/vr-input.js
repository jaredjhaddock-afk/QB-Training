export function deadzone(value, threshold = .18) {
  if (!Number.isFinite(value) || Math.abs(value) <= threshold) return 0;
  return Math.sign(value) * Math.min(1, (Math.abs(value) - threshold) / (1 - threshold));
}
export function readVRControls(sources, previous = new Map()) {
  const controls = { strafe: 0, forward: 0, turn: 0, snap: false, reset: false, routes: false };
  const next = new Map();
  for (const source of sources) {
    if (source.targetRayMode !== 'tracked-pointer' || source.gamepad?.mapping !== 'xr-standard') continue;
    const { axes, buttons } = source.gamepad;
    const old = previous.get(source) || {};
    const a = !!buttons[4]?.pressed, b = !!buttons[5]?.pressed;
    const x = deadzone(axes[2]), y = deadzone(axes[3]);
    const turnHeld = Math.abs(x) > .65;
    next.set(source, { a, b, turnHeld: Math.abs(x) < .25 ? false : old.turnHeld || turnHeld });
    if (source.handedness === 'left') {
      controls.strafe = x;controls.forward = -y;controls.routes = a && !old.a;
    } else if (source.handedness === 'right') {
      controls.snap = a && !old.a;controls.reset = b && !old.b;
      if (turnHeld && !old.turnHeld) controls.turn = Math.sign(x);
    }
  }
  return { controls, previous: next };
}

// Choose the receiver closest to the pointing direction within a 10-degree
// cone. Looking elsewhere or pointing behind a receiver cannot trigger a pass.
export function aimedReceiver(origin, direction, receivers, maxAngle = Math.PI / 18) {
  let best = Math.cos(maxAngle), selected = null;
  const length = Math.hypot(...direction);
  if (!length) return null;
  receivers.forEach((position, index) => {
    const delta = [position[0] - origin[0], 1.7 - origin[1], position[1] - origin[2]];
    const distance = Math.hypot(...delta);
    if (distance < .01) return;
    const alignment = delta.reduce((sum, value, i) => sum + value * direction[i], 0) / (distance * length);
    if (alignment > best) { best = alignment; selected = index; }
  });
  return selected;
}
