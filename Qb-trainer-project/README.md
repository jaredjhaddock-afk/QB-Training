# Pocket Lab — Qb-trainer-project

An original 3D browser prototype for practicing quarterback reads. Built with Three.js and Vite. This is a simplified training simulation, not an NFL/EA product or a Madden-quality graphics release.

## Run

Use Node.js 22.12+ (validated with Node 24).

```sh
cd /workspace/QB-Training/Qb-trainer-project
npm ci --cache /workspace/.npm-cache
npm run dev -- --port 5173
```

Choose a formation, assign each receiver a hot route, then choose coverage and a defensive front. Coverages and fronts are separate football concepts. Coverage options include Cover 0 blitz, Cover 1, Cover 2 man/zone, Cover 3, Cover 3 spy, and Cover 4.

- **Space** or **Snap ball** starts a rep.
- **1–5** or clicking a receiver throws to X, H, Y, Z, R respectively. Passes lead the selected route.
- **WASD** moves the quarterback behind the line of scrimmage. Touch controls support lateral movement and retreat.
- **R** or **Reset play** resets the same play; settings unlock for adjustments.
- Optional route/zone overlays and slow motion support learning.

Reps end in a completion, interception, breakup, sack, or 12-second timeout. Stats last for the browser session. Passing completion percentage excludes sacks and timeouts.

## Validate

```sh
npm test
npm run build
node scripts/smoke.mjs
```

The browser smoke test expects the development server on port 5173 and Chromium at `/usr/bin/chromium` (or set `CHROMIUM_PATH` to an installed Chromium executable).

## Scope and next graphics milestone

All players share one procedural model and running animation, differentiated by uniform and number. The scene includes a perspective QB camera, stadium seating, shadows, field markings, and animated ball flight. The default wide camera is raised behind the QB to keep route development visible. Select Helmet POV for a first-person view.

Coverage uses simplified man tracking and zone pursuit. Blocking uses timed pressure release; collision-based blocking, tackling, authentic coverage checks, receiver catch animations, and ball carrying after a catch are not implemented. The front selections change alignment; they do not simulate complete personnel packages. A rep ends at the catch point.

The user's visual target is Madden-level fidelity with one shared character model. Achieving that remains outstanding: replace the procedural model with a licensed high-detail rigged football player, shared locomotion/throw/catch animation set, PBR uniforms and equipment, and higher-quality stadium assets. No proprietary Madden assets are included. This first build validates the interaction and training loop, not that graphics target.
