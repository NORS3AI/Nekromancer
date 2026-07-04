# Sounds

Drop audio files into these folders. Everything is optional — if a folder is
empty, the game uses its built-in procedural audio for that category.

```
sounds/
  music/       ← background music playlist (see below)
  ambience/    ← per-zone ambience beds (reserved — procedural for now)
  weather/     ← rain / wind loops (reserved — procedural for now)
  fx/          ← sound effects (reserved — procedural for now)
```

## Adding music (easy path)

1. Put your tracks in **`sounds/music/`**.
2. Name them **`1.mp3`, `2.mp3`, … `8.mp3`** — that's it. They play in order, on
   loop, forever.

That's all you need. The playlist is controlled in one place —
`MUSIC_PLAYLIST` at the top of `docs/js/audio.js` — if you want different
filenames, a different order, more/fewer tracks, or other formats
(`.ogg` / `.m4a`), edit that one list.

- Volume: **Settings ▸ Master Volume × Music Volume**. Muting either one
  silences the music (it's routed through the same mixer as everything else).
- If no music files are found, the game falls back to its built-in generative
  score, so it never breaks.
- Music starts after the first tap/click (browsers require a user gesture
  before audio can play).
