# Ground tiles (per biome / theme)

Drop **seamless, tileable** ground textures here and the game tiles the floor with
them automatically. Each is optional — if a file is missing the game falls back
to the built-in procedural ground, so it always runs art-free.

## Upload these exact filenames (GitHub website → Add file → Upload files)

Open **https://github.com/nors3ai/Nekromancer/tree/main/docs/art/tiles** and upload:

| File | Used when the map's biome/theme is… |
|---|---|
| `snow.png`    | Snow |
| `marsh.png`   | Marsh / Swamp |
| `desert.png`  | Desert / Badlands |
| `dungeon.png` | Any dungeon (crypt) |
| `cave.png`    | The hidden Cave map |

Notes:
- Make them **seamless** (edges wrap) so the repeat has no visible grid — the
  textures you sent are already tileable.
- Any square size works (they're drawn `repeat`); ~512–1024px is ideal.
- Wired via `World.tileKeyFor` / `World.loadTiles` / `World.makePattern`.

## Trees / props by biome (already enforced in generation)
- **Caves & Dungeons** — no trees (indoor room/corridor maps).
- **Deserts** — cactus & scrub, never trees.
- **Marsh/Swamp** — marsh trees.
- **Snow** — dead trees.
