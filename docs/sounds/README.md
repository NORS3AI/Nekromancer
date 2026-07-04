# Sounds

Drop audio files into these folders. Everything is optional — if a folder is
empty, the game uses its built-in procedural audio for that category.

```
sounds/
  music/       ← background music (see below)
  ambience/    ← per-zone ambience beds (reserved — procedural for now)
  weather/     ← rain / wind loops (reserved — procedural for now)
  fx/          ← sound effects (reserved — procedural for now)
```

## Adding music

The playlist lives in one place: `MUSIC_PLAYLIST` (and `MUSIC_BASE_URL`) at the
top of `docs/js/audio.js`. It expects **16 tracks named `1.mp3` … `16.mp3`**,
played **shuffled**, on loop. Pick ONE of these two ways to host them:

### Option A — small files, in the repo (simplest)
If your tracks are small (a few MB each; keep the whole folder well under
~100 MB), just drop `1.mp3 … 16.mp3` into **`sounds/music/`** and commit. Done.
Tip to shrink them: re-export at **~96–128 kbps, mono** — plenty for background
music and a fraction of the size.

### Option B — big files, on a GitHub Release (recommended for full tracks)
Audio files are usually **too big for the repo / GitHub Pages** (Pages rejects
large pushes and caps total site size). Host them on a **Release** instead — it
allows large files and does **not** bloat the repo or the site:

1. On GitHub → **Releases → Draft a new release**, tag it e.g. `music-v1`.
2. **Attach** your 16 files (named `1.mp3 … 16.mp3`) as release assets, publish.
3. In `docs/js/audio.js`, set:
   ```js
   const MUSIC_BASE_URL = 'https://github.com/nors3ai/Nekromancer/releases/download/music-v1/';
   ```
   (that's the release's download base — the filenames get appended to it).

Either way:
- Volume = **Settings ▸ Master Volume × Music Volume**; muting either silences it.
- No files found → the built-in generative score plays, so it never breaks.
- Music starts after the first tap/click (browser autoplay rule).
