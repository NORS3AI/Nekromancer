# Nekromancer — assets

Drop custom media here to gradually replace the game's procedural art and sound.
Everything is served relative to `docs/`, so a file at
`docs/assets/icons/bone-spear.png` is referenced from code as
`assets/icons/bone-spear.png`.

| Folder | What goes here | Suggested formats |
|---|---|---|
| `icons/`    | Skill / item / UI glyphs | PNG or SVG (square, e.g. 64×64 or 128×128) |
| `images/`   | Sprites, portraits, backgrounds, tiles | PNG / WEBP / JPG |
| `models/`   | 3D models, if you ever go 3D | GLB / GLTF |
| `music/`    | Looping background music tracks | OGG / MP3 |
| `ambience/` | Per-zone ambient beds (wilds / crypt / camp) | OGG / MP3 |
| `fx/`       | One-shot sound effects (hits, casts, pickups) | OGG / WAV |
| `weather/`  | Weather loops (rain, wind) | OGG / MP3 |

## Notes

- The game currently generates **all** art and sound procedurally (no binary
  assets), so nothing here is required — these folders are scaffolding for when
  you want to add real media.
- Keep filenames lowercase-with-dashes so they work the same on every host.
- GitHub Pages serves these straight from `main`/`docs`. In the single-file
  artifact/zip build, external asset files are **not** inlined and a strict CSP
  may block them — assets are intended for the hosted GitHub Pages build.
- Prefer small, compressed files; the whole point of the procedural approach was
  a tiny, instant-loading game.
