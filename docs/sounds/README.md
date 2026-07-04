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

### Option B — big files, hosted elsewhere (recommended for full tracks)
Audio files are usually **too big for the repo / GitHub Pages** (Pages rejects
large pushes and caps total site size). Host them off-repo instead. Two ways:

**B1 — one base URL (all files same host, simplest):** set `MUSIC_BASE_URL` and
keep the bare `1.mp3 … 16.mp3` names — they get appended to the base.
Best host = a **GitHub Release** (free, large files OK, doesn't bloat the repo):
1. GitHub → **Releases → Draft a new release**, tag it e.g. `music-v1`.
2. **Attach** your 16 files (`1.mp3 … 16.mp3`) as assets, publish.
3. In `docs/js/audio.js`:
   ```js
   const MUSIC_BASE_URL = 'https://github.com/nors3ai/Nekromancer/releases/download/music-v1/';
   ```

**B2 — full URLs per track (mix any hosts):** put complete URLs in
`MUSIC_PLAYLIST` (leave `MUSIC_BASE_URL = ''`). Each entry that starts with
`http` is used exactly as given:
```js
const MUSIC_PLAYLIST = [
  'https://.../track1.mp3',
  'https://.../track2.mp3',
  // …
];
```

**About Google Drive:** it only serves files via a *direct-download* link
(`https://drive.google.com/uc?export=download&id=FILE_ID`), and for larger files
Google returns a "can't scan for viruses" web page instead of the audio, which
breaks playback. It also throttles and doesn't stream well. It *can* work for a
few small tracks but is unreliable — a **GitHub Release is the safer choice**.

Either way:
- Volume = **Settings ▸ Master Volume × Music Volume**; muting either silences it.
- No files found → the built-in generative score plays, so it never breaks.
- Music starts after the first tap/click (browser autoplay rule).
