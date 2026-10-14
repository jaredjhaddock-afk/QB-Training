# Asset credits and provenance

## Kiara 1 Dawn HDR environment

- Creator/provider: HDRI Haven / Poly Haven.
- Asset page: https://polyhaven.com/a/kiara_1_dawn
- License: **CC0 1.0 Universal** — https://creativecommons.org/publicdomain/zero/1.0/
- Provider license: https://polyhaven.com/license
- Download source: https://raw.githubusercontent.com/pmndrs/drei-assets/master/hdri/kiara_1_dawn_1k.hdr
- Mirror attribution: https://github.com/pmndrs/drei-assets#attribution
- Provider's published license source: https://github.com/Poly-Haven/polyhaven.com/blob/master/public/locales/en/license.json
- A copy of the provider's license statement is included at `/licenses/poly-haven-asset-license.json`.
- File: `environment/kiara_1_dawn_1k.hdr`, 1,475,077 bytes.
- SHA-256: `ee70fb8c8fb3e34566802191d83b299e179ecc392b97639e6c750f66e161c8e2`.
- Downloaded October 14, 2026. No changes to the downloaded HDR file.

## Original game assets

Fallback procedural football-player geometry, equipment, uniforms, pose animations, turf textures,
stadium geometry, crowd arrangement, and field markings are authored in this
project. No paid assets, team trademarks, or Madden game assets are included.

The procedural players are retained as a loading/failure fallback. The default players use the supplied asset documented below.

## Fonts and renderer

DM Sans and Barlow Condensed are bundled through Fontsource under their SIL Open
Font Licenses. Three.js is distributed under the MIT License. Their packages
include the corresponding license files.

## User-supplied football player

- File: `players/football_player_realistic.glb`, 4,160,272 bytes.
- Supplied by the project owner on October 14, 2026 for use in this game; described as a Higgsfield-generated character with Run, Catch, and Idle animations.
- SHA-256: `69afe7f3d12d0e661a17a596b93046fb3cd66636ef159bfbed57e39d210563f1`.
- Original GLB is bundled unchanged. Runtime materials remap navy to red and red to gray for offense; white and skin colors are retained. Defense uses gray/navy.
- Runtime clones share geometry/textures; animation clips remove horizontal hip translation; embedded football geometry is hidden in favor of the game's ball.
- No asset purchase was made. No standalone license or animation-source attribution accompanied the upload; this entry records user-supplied provenance and does not designate the model as CC0 or claim independently verified third-party licensing.
