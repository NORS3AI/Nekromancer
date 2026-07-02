# NEKROMANCER — A Sanctuary of the Dead

A **Diablo 3 style dungeon-crawling ARPG** for the browser, played in the Diablo 4
mobile / console style: twin-stick touch controls, a radial equipment wheel, and the
authentic D3 Necromancer skill kit. Pure HTML5 canvas + vanilla JS — no frameworks,
no build step, no assets.

## ▶ [Play Game](https://nors3ai.github.io/Nekromancer/)

Best on a phone in landscape; fully playable on desktop.

## The adventure

Your **Nekromancer is persistent** — level, gear, gems, gold and progress are saved
in your browser. From the survivor's camp, take the **waypoint map** into five lands
of Sanctuary — open wilds and true wall-and-corridor crypts, regenerated every visit:

1. The Weeping Hollow · 2. Crypt of the Forsworn · 3. The Desolate Sands ·
4. The Blood Marsh · 5. Ruins of Rathma

Each land holds sleeping monster packs, elites, treasure chests, shrines, breakable
urns — and a **bounty**: hunt down its unique boss (telegraphed charges and ground
slams included), then take the portal home with a Horadric cache. Clear a land to
unlock the next; clear them all to unlock **Torment** difficulties.

## The real Diablo 3 Necromancer kit

All **21 actives with their true unlock levels** — Bone Spikes, Grim Scythe, Siphon
Blood, Bone Spear, Skeletal Mage, Death Nova, Bone Armor, Bone Spirit, Blood Rush,
Decrepify, Frailty, Leech, Corpse Explosion, Corpse Lance, Devour, Command Skeletons,
Command Golem, Army of the Dead, Revive, Land of the Dead, Simulacrum — in a 6-slot
elective loadout, plus **12 passives** across 4 unlockable slots. Primaries generate
Essence; spenders burn it; every kill leaves a corpse to detonate, devour or raise.

## Loot, the console way

- **Radial equipment wheel** (PS5 D3 style): 9 gear slots in a ring — tap a slot to
  filter your bag to it, compare with ▲▼ arrows, equip, salvage or socket.
- **4 rarities** with level-scaled affixes and sockets; **gems** in 5 types × 5 tiers.
- **Blacksmith**: salvage gear into Reusable Parts / Arcane Dust / Veiled Crystals /
  Forgotten Souls, and forge new pieces.
- **Jeweler**: combine 3 matching gems into a finer one; socket them into your gear.
- **Mystic**: enchant — reroll an affix on any equipped item.

## Controls

| | Mobile | Desktop |
|---|---|---|
| Move | Left-thumb joystick | WASD / arrows |
| Aim & fire primary | Right-thumb joystick | Mouse (hold) / Space |
| Skills | Tap = quick-cast · press-drag = aimed cast | `1`–`5` |
| Potion | Flask button | `Q` |
| Inventory wheel | Tap portrait | `I` |
| Skills & passives | Menu ▸ Skills | `K` |
| Menu / pause | ☰ button | `Esc` |

## Endgame — Season of the Grace of Inarius

At level 70 the season begins: enter **Nephalem Rifts** — randomized shards where slaughter fills the rift bar until the **Rift Guardian** rises. Guardians always drop pieces of the six-piece **Grace of Inarius** set (Bone Armor damage ×10, damage reduction per enemy hit, and the swirling **bone tornado**), plus build-defining legendaries like the *Bloodtide Blade* and *Krysbin's Sentence*. Matching gear to skills — Bone Armor uptime feeding Death Nova — is the heart of the endgame, as it should be.

## Settings & extras

Five audio channels (master, SFX, generative music, ambience, weather) with sliders and mutes; gameplay options in the Diablo Immortal style (damage numbers, camera shake, health bars, fixed joystick, reduced effects, large minimap, FPS); 20 named manual save slots; rain and windstorms over the lands; patch notes behind the version tag; and a certain developer credit on the title screen that curious necromancers may wish to tap…

*Sterling Grant, 2026 | A fan-built game made with love for the Necromancer's of Rathma*

## Tech

Everything — sprites, five procedural lands (including room-and-corridor dungeons
with real wall collision and a fog-of-war minimap), UI, and all sound effects — is
generated at runtime with the canvas API and WebAudio. The game lives in
[`docs/`](docs/) and is served by GitHub Pages.
