# Pocket Lab — Qb-trainer-project

An original 3D browser prototype for practicing quarterback reads. Built with Three.js and Vite. This is a simplified training simulation, not an NFL/EA product or a Madden-quality graphics release.

## Run

Use Node.js 22.12+ (validated with Node 24).

```sh
cd /workspace/QB-Training/Qb-trainer-project
npm ci --cache /workspace/.npm-cache
npm run dev -- --port 5173
```

Deuce is the spread doubles formation. Deuce RT and Deuce LT attach Y beside the right or left tackle respectively, with the same-side wideout off the line to keep Y eligible.

Choose a formation, assign each receiver a hot route, then choose coverage and a defensive front. Coverages and fronts are separate football concepts. Coverage options include Cover 0 blitz, Cover 1, Cover 2 man/zone, Cover 3, Cover 3 spy, and Cover 4.

- **Space** or **Snap ball** starts a rep.
- **1–5** or clicking a receiver throws to X, F, Y, Z, H respectively. Passes lead the selected route.
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
Tap **Snap ball**, then tap the fixed **X / F / Y / Z / H** button for the receiver
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
persist on this browser/device; **Reset names** restores X, F, Y, Z, H. Editing is
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

All 22 players share the supplied `football_player_realistic.glb` geometry and textures, with independently cloned skeletons. The offense maps original navy to red and original red to gray, preserving white details and skin. The defense uses contrasting gray/navy. The model's baked jersey number is shared by every player; editable receiver designations identify targets. Procedural players remain a fallback if the GLB cannot load.

The supplied Idle, Run, and Catch clips drive animation. Run cadence scales to actual movement using the supplied 7 m/s stride reference; gameplay speeds are still defined in yards. Horizontal hip translation is removed from animation clips so the catch cannot displace a receiver from the simulated route. Catch retains its vertical leap and continues through the landing after a completion, with the game's football following the hands. The model's embedded football is always hidden. Linemen use procedural three-point and blocking poses with two-bone IK, while throwing uses a simple additive pose and backward movement reverses the running cycle. Dedicated contact, throw, and backpedal clips are still needed.

Movement uses bounded acceleration, braking, and gradual turning. Receivers slow into sharp route breaks and passes lead their accelerated movement. The field uses generated turf detail and an instanced crowd. A bundled CC0 HDR provides daylight and reflections, with fallback lighting if unavailable. [Asset provenance](public/assets/CREDITS.md) records the supplied model and environment.

Coverage decisions use delayed observed receiver positions and velocities, rather than looking ahead along their routes. Deep defenders protect the deepest threat in their half/third/quarter. Underneath defenders briefly split conflicting threats, commit to one, and hand off routes leaving their lane. Choices persist between reads and switching requires a plant/recovery step. Cover 1 maintains inside/top leverage; Cover 2 Man trails with deep help. Spies mirror QB movement; edge rushers maintain an outside approach. Defenders wait 240–340 ms after release before breaking toward a reachable landing point. These are explicit coaching approximations, not a reproduction of Madden's proprietary AI. The pocket uses moving blocker targets and timed pressure release; collision-based blocking, tackling, authentic coverage checks, full pattern-match rules, receiver/defender body collisions, and playable running after a catch are not implemented. Fronts now preserve actual personnel counts: 4–3, 3–4, 4–4, nickel (4–2–5), and dime (4–1–6). Nickel Wide uses the nickel personnel with wider ends. These are representative alignments, not a complete defensive playbook. A rep ends at the catch point.

The user's visual target is Madden-level fidelity with one shared character model. The supplied rigged model improves player detail, but achieving that target remains outstanding: dedicated football blocking/throwing/backpedal animations, animation blending and contact work, higher-quality stadium assets, and hardware performance tuning are still needed. No proprietary Madden assets are included. This first build validates the interaction and training loop, not that graphics target.


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

## Quest 3 VR (initial playable version)

Open the game's **forwarded HTTPS address directly in Quest Browser**, outside an
embedded preview. Keep the Codespace and Vite server running, and make port 5173
public if testers are not signed into your GitHub account. Choose your play, then
select **Enter VR** below the playbook settings. On the phone-style layout this
button is inside **Playbook**. Grant immersive access when prompted. Unsupported
browsers display “VR unavailable” and retain normal gameplay.

- Head tracking supplies the first-person view, with no camera bob.
- Left thumbstick moves relative to your head direction; right thumbstick turns
  in 30-degree steps. Release the stick between snap turns.
- **Point toward the intended receiver and press the right trigger to pass.**
  A highlighted marker identifies the target. A 10-degree aiming cone allows
  near misses; receivers outside that cone are not selected automatically. There
  is no physical throwing gesture. The pass still leads the receiver's route.
- **A** snaps, **B** resets, and **X** toggles route lines.
- A floating toolbar sits below the center of the VR view: **Snap**, **Reset**,
  **Routes**, **Playbook**, **Exit VR**, plus receiver passing buttons during a rep.
  Point and trigger to select. The toolbar remains visible in front of players.
- **Playbook** cycles formations, coverages, fronts, and each receiver's route
  between reps. Edit receiver designations on the webpage before entering VR.
- Exit using **Exit VR** or the headset's system/browser controls. The webpage
  restores its camera and shadows. Tracking/visibility loss pauses gameplay.

Use a stationary boundary and the thumbstick for pocket movement. Floor tracking
uses your real height; the tracked rig converts metres to the field's yard units.
VR disables real-time shadows and uses 80% framebuffer scale and fixed foveation
where supported. Actual Quest 3 frame rate, comfort, controller feel, and headset
browser compatibility still require hardware testing; no performance target has
been certified here.

`node scripts/vr-smoke.mjs` exercises stereo session entry, controller movement,
point-and-trigger passing, the floating toolbar, session exit and desktop recovery
using the MIT-licensed IWER Quest emulator (a development dependency only).
Emulation is not a substitute for testing on the headset.

**Trips LT** has three receivers to the quarterback's left and one to the right.
**Trips RT** mirrors it, with the running back remaining in the backfield. The
existing **Gun Trips Right** option remains available.

Field markers show only the editable receiver designation on a small translucent panel. Route guides are continuous, solid ribbons approximately eight inches wide, with rounded joins; the route toggle works on desktop, phone, and in VR.

Player asset validation: `node scripts/player-asset-smoke.mjs` loads the actual GLB, checks yard scale, independent skeletons, removed horizontal catch motion, and hidden embedded football, and renders all three supplied clips.

## Reading defensive choices and the moving pocket

Each snap gives defenders stable, bounded read preferences and reaction timings, so comparable conflicts can resolve differently across reps without frame-to-frame random movement. Clear vertical danger still wins over those preferences. Adjacent zones hand off crossing routes using observed velocity and shared lane boundaries rather than overlapping ownership. Hook defenders retain at least seven yards of target depth and flat defenders 3.5 yards before the throw, instead of chasing checkdowns out of their areas. Ball breaks stay in or immediately beside the assigned lane. Zone defenders sample observed receiver movement every 160–240 ms in addition to the existing observation delay. They briefly split comparable threats, then commit for at least 0.6 seconds unless their receiver leaves the zone. Small score changes do not flip the assignment. Changing receivers slows the defender for a recovery step. Flat defenders favor quick outlets; hook defenders carry intermediate threats; deep defenders protect vertical routes. Man defenders keep their assigned receivers and deep help remains intact. No decision reads route names or future waypoints. These are tunable training approximations, not a complete pattern-match scheme.

When a recent conflict involves the pass target, the rep review names the defender, the receivers he was reading, and the receiver he chose. This describes the observed choice, not a guarantee that the throw was open: other defenders and the passing lane still matter. Try a short route and an intermediate route entering the same zone, watch the underneath defender's first committed steps, and repeat with different timing.

Offensive linemen and defensive down linemen begin in three-point stances, then rise over the first 0.45 seconds. The offensive line forms a pocket with deeper tackle sets, lateral adjustments to nearby rushers, shuffling feet, and hand activity. Rushers engage those moving blockers before releasing toward the QB. **No defender can sack the QB before 4.0 seconds of play-clock time**, including blitzers; pressure becomes eligible after that, but sacks still require actual proximity. Slow motion stretches that interval in real time. This is controlled training protection, not collision-based blocking or a guarantee of a sack at four seconds.

## GitHub Pages hosting

The repository workflow **Deploy game to GitHub Pages** builds this folder and
publishes `dist` on pushes to `main`, or manually from the Actions tab.
In repository **Settings → Pages → Build and deployment**, select **GitHub Actions**
as the source. Then use **Actions → Deploy game to GitHub Pages → Run workflow**
on `main`. The expected site URL is
`https://jaredjhaddock-afk.github.io/QB-Training/`.
The first run can fail until Pages is enabled; run it again after enabling Pages.
The workflow builds with `--base=/QB-Training/`; models, lighting, and credits use
Vite's base URL so both this hosted path and local development work.
GitHub Pages serves the built game independently of Codespaces.
