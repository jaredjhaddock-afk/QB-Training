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
- **View: 1st / 3rd** (or **C**) switches between eye-level QB POV and an elevated camera behind the quarterback. Switch before or during a rep without resetting it.
- **Routes: on / off** (or **V**) shows or hides route lines, including during play. The button stays synchronized with the playbook checkbox.
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
node scripts/view-toggle-smoke.mjs
node scripts/front-smoke.mjs
node scripts/route-smoke.mjs
```

The browser smoke test expects the development server on port 5173 and Chromium at `/usr/bin/chromium` (or set `CHROMIUM_PATH` to an installed Chromium executable).

## Scope and next graphics milestone

The default camera is **QB POV**, an eye-level first-person view with visible hands and independent looking/movement. QB Follow and Wide QB remain optional training views.

All players share one original articulated football model and pose system, differentiated by uniform and number. The geometry is shared across players and combined into skinned meshes to reduce draw calls. Models include helmets, face cages, shoulder pads, uniforms, gloves, and cleats, with running, throwing, and reaching-to-catch poses. The field uses generated turf detail and a crowd rendered through instancing. A locally bundled CC0 HDR environment provides the sky and reflections; a plain daylight fallback keeps the game playable if the HDR fails to load. [Asset credits and license provenance](public/assets/CREDITS.md) document the free asset. No character model from a third party is included.

Movement now uses bounded acceleration and braking. Receivers slow into sharp route breaks and passes predict their actual accelerated route movement. Players turn gradually; stride phase follows distance traveled, with slower backpedal poses, lower lineman stances, and planted-leg pelvis adjustment. Uniform weave, refined helmet/leg proportions, contact shadows, and sharper desktop sun shadows improve readability.

Coverage decisions use delayed observed receiver positions and velocities, rather than looking ahead along their routes. Deep defenders protect the deepest threat in their half/third/quarter. Underneath defenders hold their lane, midpoint multiple threats, and hand off crossing routes. Cover 1 maintains inside/top leverage; Cover 2 Man trails with deep help. Spies mirror QB movement; edge rushers maintain an outside approach. Defenders wait 240–310 ms after release before breaking toward a reachable landing point. These are explicit coaching approximations, not a reproduction of Madden's proprietary AI. Blocking uses timed pressure release; collision-based blocking, tackling, authentic coverage checks, full pattern-match rules, receiver/defender body collisions, motion-captured catch sequences, and ball carrying after a catch are not implemented. Fronts now preserve actual personnel counts: 4–3, 3–4, 4–4, nickel (4–2–5), and dime (4–1–6). Nickel Wide uses the nickel personnel with wider ends. These are representative alignments, not a complete defensive playbook. A rep ends at the catch point.

The user's visual target is Madden-level fidelity with one shared character model. Achieving that remains outstanding: replace the procedural model with a licensed high-detail rigged football player, shared locomotion/throw/catch animation set, PBR uniforms and equipment, and higher-quality stadium assets. No proprietary Madden assets are included. This first build validates the interaction and training loop, not that graphics target.


### Defensive alignment defaults

Pre-snap alignment is separate from the coverage landmark. Defensive linemen start
0.75 yard across the line of scrimmage; stacked/apex linebackers start at 4.5 yards,
and deep safeties start at 11.5 yards. Corners align over the outside receivers at
5.5 yards (3.5 in Cover 2 Zone), with slot backs at 4.5 yards in zone and
6 yards in man. Man adjustments keep
the back's defender in the defensive box, even when the running back starts deep.
These depths are configurable coaching conventions in `src/defense.js`, not
universal rules for every team's scheme.

The 3–4 has three down linemen and four linebackers; one outside linebacker aligns
at 1.25 yards and joins the four-man base rush. Coverage changes never silently
change personnel. A 4–4 Cover 4 rotates a linebacker into a deep quarter after the
snap; heavy personnel against spread formations can create linebacker/receiver
matchups. Coverage-zone overlays show drop landmarks, not starting positions.


### Updated hot routes

- **Post:** seven-yard vertical stem before the inward post break.
- **Slant (3 yd)** and **Slant (1 yd):** three- or one-yard stems followed by the
  same 60-degree inward turn, measured from straight upfield. Wideout paths extend
  across the middle rather than stopping on their original side of the field.
- **Out (5 yd)** and **Out (10 yd):** five- or ten-yard stems, then a square out.
- **Spot:** five yards of total diagonal travel at 55 degrees inward, then settle
  and turn toward the quarterback. It holds that spot for the pass.

Stem distances are measured from the receiver's starting alignment. Route lines,
receiver movement, and pass-leading prediction use the same path definitions.
