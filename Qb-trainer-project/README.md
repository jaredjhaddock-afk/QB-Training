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
- **WASD** moves relative to the direction you are looking, behind the line of scrimmage.
- **Mouse** looks around independently: click the field to capture the mouse, and press **Esc** to release it. If mouse capture is unavailable, drag the field instead. Arrow keys can also look around.
- **QB POV** is the default first-person camera; look left/right or up/down to scan the defense before and during a rep.
- **R** or **Reset play** resets the same play; settings unlock for adjustments.
- Optional route/zone overlays and slow motion support learning.

### Mobile play

Hold your phone sideways. On touch devices, the game fills the landscape viewport;
the page header and setup sidebar are replaced by an in-game **Playbook** panel.
Choose formations, routes, and coverage between reps, then tap **Back to field**.
Tap **Snap ball**, then tap the fixed **X / H / Y / Z / R** button for the receiver
you want to pass to. These buttons stay in place even when receivers move offscreen.
Drag the **left-thumb joystick** to move. Drag the **right side of the field** to
look around independently. Movement follows your viewing direction. These gestures
use separate touch pointers, so you can move and look simultaneously; a receiver
button accepts a third touch to pass. Releasing or cancelling a gesture stops that
input. Tap **Reset play** to run it again and recenter the view.

Portrait orientation displays a rotate prompt and pauses the rep. Switching apps
also pauses play. **Full screen** requests browser fullscreen and landscape lock
where supported; otherwise the game still fills the available landscape viewport.
Some browsers, including versions of iOS Safari, retain browser chrome or require
manual device rotation. No paid assets are used.

### Team receiver designations

Edit the name beside any route in the playbook to use your team's terminology,
such as X, Z, Y, F, H, B, or RB. Use a unique designation of 1–3 letters or numbers
per receiver. Names update the field markers, touch passing buttons, route labels,
and rep results. The receiver's route and keyboard number stay the same. Names
persist on this browser/device; **Reset names** restores X, H, Y, Z, R. Editing is
locked after the snap until the play is reset. If device storage is unavailable,
names still work for the current session.

Reps end in a completion, interception, breakup, sack, or 12-second timeout. Stats last for the browser session. Passing completion percentage excludes sacks and timeouts.

## Validate

```sh
npm test
npm run build
node scripts/smoke.mjs
node scripts/mobile-smoke.mjs
node scripts/first-person-smoke.mjs
node scripts/graphics-smoke.mjs
node scripts/coverage-smoke.mjs
```

The browser smoke test expects the development server on port 5173 and Chromium at `/usr/bin/chromium` (or set `CHROMIUM_PATH` to an installed Chromium executable).

## Scope and next graphics milestone

The default camera is **QB POV**, an eye-level first-person view with visible hands and independent looking/movement. QB Follow and Wide QB remain optional training views.

All players share one original articulated football model and pose system, differentiated by uniform and number. The geometry is shared across players and combined into skinned meshes to reduce draw calls. Models include helmets, face cages, shoulder pads, uniforms, gloves, and cleats, with running, throwing, and reaching-to-catch poses. The field uses generated turf detail and a crowd rendered through instancing. A locally bundled CC0 HDR environment provides the sky and reflections; a plain daylight fallback keeps the game playable if the HDR fails to load. [Asset credits and license provenance](public/assets/CREDITS.md) document the free asset. No character model from a third party is included.

Movement now uses bounded acceleration and braking. Receivers slow into sharp route breaks and passes predict their actual accelerated route movement. Players turn gradually; stride phase follows distance traveled, with slower backpedal poses, lower lineman stances, and planted-leg pelvis adjustment. Uniform weave, refined helmet/leg proportions, contact shadows, and sharper desktop sun shadows improve readability.

Coverage decisions use delayed observed receiver positions and velocities, rather than looking ahead along their routes. Deep defenders protect the deepest threat in their half/third/quarter. Underneath defenders hold their lane, midpoint multiple threats, and hand off crossing routes. Cover 1 maintains inside/top leverage; Cover 2 Man trails with deep help. Spies mirror QB movement; edge rushers maintain an outside approach. Defenders wait 240–310 ms after release before breaking toward a reachable landing point. These are explicit coaching approximations, not a reproduction of Madden's proprietary AI. Blocking uses timed pressure release; collision-based blocking, tackling, authentic coverage checks, full pattern-match rules, receiver/defender body collisions, motion-captured catch sequences, and ball carrying after a catch are not implemented. The front selections change alignment; they do not simulate complete personnel packages. A rep ends at the catch point.

The user's visual target is Madden-level fidelity with one shared character model. Achieving that remains outstanding: replace the procedural model with a licensed high-detail rigged football player, shared locomotion/throw/catch animation set, PBR uniforms and equipment, and higher-quality stadium assets. No proprietary Madden assets are included. This first build validates the interaction and training loop, not that graphics target.
