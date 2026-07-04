# Skill icon art (optional)

Drop a **square PNG** here named after the skill id, e.g. `boneSpikes.png`,
then add that id to the `SKILL_ICON_FILES` array in `docs/js/skills.js`.
It renders in every skill slot — the radial HUD, the loadout row and the
skill-assignment grid — with the hand-drawn procedural glyph as an automatic
fallback whenever a file is missing or fails to load.

Only ids listed in `SKILL_ICON_FILES` are fetched, so the game stays free of
404s until you opt each icon in.

Skill ids (one PNG each):

boneSpikes · grimScythe · siphonBlood · boneSpear · skeletalMage · deathNova
corpseExplosion · corpseLance · devour · revive · commandSkeletons · commandGolem
armyOfTheDead · landOfTheDead · decrepify · leech · frailty · boneArmor
boneSpirit · bloodRush · simulacrum

Tiles look best square and roughly 128×128 or 256×256. They are clipped to a
circle inside the round skill button, so keep the important art centered.
