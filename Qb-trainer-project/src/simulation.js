// Positions/distances are in field yards, time in seconds. No renderer dependency.
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
export function athlete(position) { return { p: [...position], v: [0, 0], waypoint: 1 }; }

// Bounded acceleration and braking prevent instant cuts and speed changes.
export function steer(body, target, dt, speed = 5.8, acceleration = 13) {
  const dx = target[0] - body.p[0], dz = target[1] - body.p[1];
  const gap = Math.hypot(dx, dz);
  const desiredSpeed = Math.min(speed, Math.sqrt(2 * acceleration * gap));
  const desired = gap > .025 ? [dx / gap * desiredSpeed, dz / gap * desiredSpeed] : [0, 0];
  const change = [desired[0] - body.v[0], desired[1] - body.v[1]];
  const amount = Math.min(1, acceleration * dt / (Math.hypot(...change) || 1));
  body.v = body.v.map((v, i) => v + change[i] * amount);
  body.p = body.p.map((p, i) => p + body.v[i] * dt);
  body.p[0] = clamp(body.p[0], -25, 25);
  if (Math.abs(body.p[0]) === 25) body.v[0] = 0;
  return body.p;
}
export function runRoute(body, path, dt) {
  const goal = path[body.waypoint];
  const gap = distance(body.p, goal);
  const next = path[body.waypoint + 1];
  let speed = 5.8;
  if (next) {
    const incoming = [goal[0] - path[body.waypoint - 1][0], goal[1] - path[body.waypoint - 1][1]];
    const outgoing = [next[0] - goal[0], next[1] - goal[1]];
    const cosine = (incoming[0] * outgoing[0] + incoming[1] * outgoing[1]) / (Math.hypot(...incoming) * Math.hypot(...outgoing) || 1);
    // Brake into hard breaks, then accelerate out. Route endpoints remain fixed.
    if (gap < 2.2) speed = 2.2 + 3.6 * Math.max(0, cosine);
    if (gap < .30) body.waypoint++;
  }
  return steer(body, path[body.waypoint], dt, speed);
}
export function predictReceiver(body, path, seconds) {
  const future = { p: [...body.p], v: [...body.v], waypoint: body.waypoint };
  for (let t = 0; t < seconds; t += .02) runRoute(future, path, Math.min(.02, seconds - t));
  return future.p;
}

// Decision inputs contain observed positions/velocities, never receiver routes.
export function coverageDecision(assignment, position, observed, qb, coverage, elapsed, flight, index = 0) {
  const a = assignment;
  let target = [a.x, a.z], speed = 5.5, state = 'landmark', threat = null;
  if (a.role === 'rush') {
    const release = coverage === 'Cover 0 Blitz' ? 1.7 : 3.2 + index % 3 * .35;
    const edge = Math.abs(a.x) >= 4;
    target = elapsed < release ? [a.x * .85, -.7] : edge && position[1] > qb[1] + 1.5 ? [qb[0] + Math.sign(a.x) * 2.5, qb[1]] : qb;
    speed = elapsed < release ? 1.2 : 4.6;state = elapsed < release ? 'engaged' : edge ? 'contain-rush' : 'rush';
  } else if (a.role === 'spy') {
    target = [clamp(qb[0] * .85, -20, 20), Math.max(1.5, qb[1] + 6)];
    state = 'spy';speed = 4.6;
  } else if (a.role === 'man') {
    const r = observed[a.target];threat = a.target;
    const underneath = coverage === 'Cover 2 Man';
    const leverage = r.p[0] > 0 ? -.65 : .65;
    target = [r.p[0] + r.v[0] * .12 + leverage, r.p[1] + r.v[1] * .12 + (underneath ? -.65 : .75)];
    state = underneath ? 'trail' : 'man';
  } else {
    const deep = a.role === 'deep';
    const candidates = observed.map((r, i) => ({ ...r, i })).filter(r => r.p[0] >= a.minX - .7 && r.p[0] <= a.maxX + .7 && (deep ? r.p[1] > 7 : r.p[1] > -3 && r.p[1] < 17));
    // Deep defenders prioritize the deepest threat; underneath defenders midpoint
    // threats in their lane instead of following a crosser across the field.
    if (candidates.length) {
      if (deep) {
        const r = candidates.reduce((best, r) => r.p[1] > best.p[1] ? r : best);
        threat = r.i;
        target = [clamp(r.p[0] + r.v[0] * .2, a.minX + .5, a.maxX - .5), Math.max(a.z, r.p[1] + 3.2)];
        state = 'cap-deep';
      } else {
        target = [clamp(candidates.reduce((n, r) => n + r.p[0], 0) / candidates.length, a.minX + .5, a.maxX - .5), clamp(candidates.reduce((n, r) => n + r.p[1], 0) / candidates.length + .6, 3, 13)];
        state = candidates.length > 1 ? 'midpoint' : 'match-zone';threat = candidates[0].i;
      }
    }
  }
  // Break only after a visible release and a human reaction interval. Man
  // defenders must be near their assignment; zones must be near the landing lane.
  if (flight && flight.t >= .24 + index % 3 * .035 && a.role !== 'rush') {
    const close = distance(position, flight.end) < 12;
    const canSee = a.role !== 'man' || distance(position, observed[a.target].p) < 3;
    if (close && canSee) { target = [...flight.end];state = 'break-on-ball';speed = 5.9; }
  }
  return { target, speed, state, threat };
}

// A spot settles at its endpoint and presents its chest to the quarterback.
export function receiverFacing(route, body, path, quarterback) {
  if(route!=='Spot'||distance(body.p,path.at(-1))>.35||Math.hypot(...body.v)>1)return null;
  return Math.atan2(quarterback[0]-body.p[0],quarterback[1]-body.p[1]);
}
