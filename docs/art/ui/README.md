# UI / achievement / decoration art

A staging area for icon art that isn't wired into the game yet — achievement
badges, rank/difficulty emblems, keys, portals, scrolls, trophies, etc.

**Yes, commit these straight into the repo.** Images are small (icons are
KBs, a full sheet is a MB or two), so unlike audio they don't bloat anything,
and GitHub Pages serves them for free.

## How to upload (GitHub website, no tools needed)
1. Open this folder: **https://github.com/nors3ai/Nekromancer/tree/main/docs/art/ui**
2. **Add file → Upload files**.
3. Drag your images in (a whole sheet, or individual icons — either is fine).
4. **Commit changes** (straight to `main`).

## Tips
- **Individual icons** are the most reusable — ideally square PNGs with a
  transparent background (so they sit on any panel). But a single **sheet** is
  fine too; I can slice specific icons out of it when we build the feature.
- Name them however makes sense to you (e.g. `achv-first-kill.png`,
  `key-gold.png`, `portal-blue.png`). When you want some wired in, tell me
  what each is for and I'll hook them up (with a procedural fallback, same as
  the skill icons / gems / logo).
- These live here until used — nothing references them yet, so uploading can't
  break the game.
