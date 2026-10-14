// Low, centered third-person framing, based on the supplied camera references.
// Keep a wide horizontal lens on phones without pulling the camera far away.
export function cameraPose(mode, quarterback, aspect, look = { yaw: 0, pitch: -.06 }) {
  const [x, z] = quarterback;
  if (mode === 'QB POV' || mode === 'Helmet POV') {
    const position = [x, 1.85, z + .10];
    const forward = [-Math.sin(look.yaw) * Math.cos(look.pitch), Math.sin(look.pitch), Math.cos(look.yaw) * Math.cos(look.pitch)];
    return { position, target: position.map((value, i) => value + forward[i] * 20), fov: 82, showQuarterback: false };
  }
  if (mode === 'Wide QB') {
    return { position: [x, 6.2, z - Math.max(12, 30 / aspect)], target: [x, 1.6, z + 20], fov: 76, showQuarterback: true };
  }
  const fov = Math.max(68, Math.min(100, 2 * Math.atan(Math.tan(61 * Math.PI / 180) / aspect) * 180 / Math.PI));
  // Narrow desktop windows can use extra distance; landscape phones retain the
  // close seven-yard camera and a horizontal view covering the starting wideouts.
  const distance = Math.max(7, 23 / (Math.tan(fov * Math.PI / 360) * aspect) - 5);
  return { position: [x, 3.2, z - distance], target: [x, 1.6, z + 20], fov, showQuarterback: true };
}
