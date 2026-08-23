# OneMoreFloor — Content Pipeline (EA 0.1)

> Status: **as built, EA 0.1 (M8).** This defines how enemies, items, floors, classes, quests and balance data are authored, validated and extended without touching game logic — the §2.3 requirement made concrete. The workflow is demonstrated in CI rather than described: an enemy that exists only inside a test file is fought to a real verdict. Brief cited as §n.

## 1. Ground rules

1. **Content is typed data in `src/content/`** — TypeScript data modules (checked by the compiler *and* a schema validator), not JSON files: we get literal-type safety, editor autocomplete and comments for free, while staying pure data (an exporter can emit JSON any day; nothing may contain functions — validator-enforced).
2. **Logic is generic over content.** The combat engine knows "a unit with stats and effect kits", never "the Floor-30 golem". Adding content = adding data + assets, zero logic edits (§2.3). A new class, enemy, floor band, material, affix, quest template, or tutorial step must each be provably addable this way — that's the acceptance test of the content milestone (ROADMAP M8).
3. **Stable string ids, namespaced** (`enemy.rotling`, `item.base.chest_scale`, `affix.atk_flat`, `quest.daily.clear_floors`). Ids are save-referenced (SAVE_SCHEMA §3) → **never renamed/reused**; removal goes through the deprecation map (SAVE_SCHEMA §4).
4. **Validation is CI** (`content:validate`, ARCHITECTURE §7): schema conformance, id uniqueness, dangling-reference checks (enemy → avatar asset, drop table → item defs), curve sanity (monotonicity where required), and the §13 bracket property test over generated items.

   *As built (M4):* art bindings are checked against the CSS that declares them, so a mistyped asset id fails the build instead of rendering as an empty frame. The check also rejects a `glyph-*` id in any painted-icon slot: FantasyUI's glyph set is `fill="currentColor"` SVG meant to be used as a CSS mask, and painted as a background image it resolves to black and disappears. Floor bands carry a `backdrop` art id (Q11) validated the same way.

## 2. Content types & draft shapes

### Classes (§8) — `content/classes/`
```ts
{ id, name, resource: { kind: 'rage'|'mana'|'focus', fillRules, signatureMove },   // Q6/Q26 approved design — COMBAT.md §5
  weaponRule: 'two_handed'|'one_hand_shield_or_two_handed'|'dual_one_handed',      // §8.1; Q15: 2H blocks Offhand visually
  startingLoadout: ItemDefId[],   // Q15: Warrior = plain 1H + Shield; Swashbuckler = both 1H; others = class 2H
  baseStats, statGrowthPerLevel, avatar: 'assets/class_avatars/…',
  flavor: { title, description } }
```
Five entries in 0.1 (§8); a sixth class later = one new entry + weapon pool + avatar (§2.3).

### Enemies (§3.2/§4.3) — `content/enemies/`
```ts
{ id, name, family, avatar: FuiAssetId | GameAssetId,   // default 'silhouette-warrior-m' — §4.3's one-line swap IS this field
  statProfile: { curveRef, multipliers },               // profile × floor curve = final stats
  effectKit?: EffectRef[],                              // normal-floor debuffs: weaker class (§3.2)
  bands: [minFloor, maxFloor?], weight }
```
Hand-authored volume per Q12: **~30 enemy types across ~8 thematic families for floors 1–100 (~3 per 10-floor band) and 10 bosses (floors 10–100)**; beyond the authored range the floor generator composes `base enemy × scaling × modifier affixes` (e.g., `modifier.frenzied`: +ATK −DEF), all defined here too.

*As built (M8):* thirty enemies across eight families — vermin, brigand, beast, construct, arcane, undead, infernal, aberration — and ten bosses, one per gate from floor 10 to 100. A family is load-bearing rather than decorative: a band names the families that live in it and the generator draws only from those, so an enemy needs its floor range *and* a band that admits its family before a player can meet it. Nine procedural modifiers (up from five) supply the deep tower's variety; thirty enemies × nine modifiers is what floor 4000 is made of. Boss floors past 100 cycle the authored roster by floor number rather than repeating the deepest one forever.

### Bosses (§3.2) — `content/enemies/bosses/`
Enemy shape + `bossKit`: player-debuff + self-buff sets (COMBAT.md §4) with per-depth magnitude curves, extra-reward table ref, and (later) dedicated avatar ids.

### Floors (§3) — `content/floors/`
No per-floor hand tables (endless, §3.1): floors are **generated** from `floorRules` — band themes (backdrop, enemy family pool, material tier), the every-10th-boss rule (§3.1), reward table refs, and named exceptions list (floor 1 tutorial pacing). The generator is seeded per run (ARCHITECTURE §5) with one hard invariant: **a floor, once generated for a character's run, is stable** (re-fighting after a loss re-faces the same enemy).

### Items (§9/§10) — `content/items/`
- **Base types**: per equip slot × class-restriction (weapons class-exclusive, armor universal — §8.2) × visual tier; e.g., `item.base.warrior_2h_greatsword`. Icon binding per Q27: each base type carries one `icon` field mapped to a curated FantasyUI icon (spell-icons / line-glyphs / generic icons) rendered in a rarity `TintFrame`; target ~3 icon variants per slot family across depth bands (weapons ≥3 per class) so shops and drops don't look repetitive. Real item art later = changing the `icon`/`art` field, exactly like enemy avatars (§4.3).
- **Affix pool** (§10.2's `+ATK/+DEF/+SPEED/+HP/+RESOURCE/+LUCK`): magnitude ranges expressed as *fractions of bracket budget* (BALANCE.md §6), slot-permission rules (Speed rolls gear-only by §6 — trivially true; whether Speed is weapon-biased is a balance choice), rarity → affix-count tendencies at drop (Q3-resolved §10.2 cadence: 1–2 slots at gear-ascension 0, then 2 / 2 / 3 / 4 / 5). Accessory niches per Q5: Necklace affixes bias offense (ATK/Luck/Speed), Amulet affixes bias defense/sustain (HP/DEF/Resource) — two pools, same framework.
- **Materials** (§10.2): tiered by floor band, referenced by `gearAscensionCost`.
- Potions (§12): stat × tier, merchant-only.

### Quests (§17) — `content/quests/`
Template pool: `{ id, cadence: daily|weekly, difficulty: normal|hard, objective: { kind, target: scalingRef }, rewards: RewardTableRef }` — objective kinds are a fixed engine vocabulary (clear-floors, defeat-boss, spend-gold, upgrade-gear, win-without-X…); templates are data. Board per Q21: 3 dailies + 3 weeklies active, one weekly always hard (Ticket/Lucky-Ticket eligible), no rerolls in 0.1.

*As built (M8):* twenty templates, ten per cadence, four of the weeklies hard — so the one hard slot §17 reserves for ticket odds is not the same quest every week (Q21).

*As built (M6):* a template carries a `unit` — `count`, `goldFloors` or `depth` — instead of a scaling factor, because the unit *is* the scaling rule and naming it stops the two from drifting. Nine objective kinds are implemented, each one something the game can observe a player *doing*; a tenth is the one part of quest authoring that touches code. Rewards use the same `FloorReward` shape floors pay in, banked through the same `grantReward`, so a quest payout and a floor payout can never disagree about what they actually give.

### Tutorial (§18) — `content/tutorial/`
Ordered step data: `{ anchor: uiAnchorId, text: stringRef, advanceOn: eventRef, mask }` driving `TutorialMask/TutorialTip` — reorderable/extendable without code.

### Reward tables — `content/rewards/`
Shared weighted-table format used by floors, bosses, quests, gacha (rolls resolve through the bracket function, BALANCE.md §6–7). `rewardType` is an open union — skill/ability tomes are **cut from 0.1 per Q7** (an owner-approved deviation from Brief §3.6) and can slot back in later without schema surgery.

## 3. Asset binding

Game art lives in `assets/` (art) and binds by id from content; FantasyUI art by FUI asset id (`silhouette-warrior-m`). Adding a real enemy avatar later = drop file, change the enemy's `avatar` field — the §4.3 requirement verbatim (owner supplies enemy avatars in the same 2048×2048 bust-portrait format/aspect as the class avatars, per Q11). Item icons follow the same id-binding pattern (Q27, see §2). Backdrops in 0.1 compose from FantasyUI theme art only (Q11); owner-painted backdrops may bind in later the same way. A CI check fails on ids referencing missing files (never a broken image at runtime).

## 4. Authoring workflow (the recurring job, post-0.1)

**Potions are generated, not authored (M5).** One draught per stat a potion may raise, brewed per bracket: magnitude and price come from curves, so the shelf keeps up with an endless tower without anyone maintaining a table. Speed has no draught and cannot have one — `UpgradableStatId` excludes it, so a Speed potion is not expressible (Brief §6).

"Add 10 floors of content" = extend a band or add one, add enemies/materials to pools, rerun `content:validate` + balance simulator (BALANCE.md §10), eyeball the sim deltas, done — no engine work.

### 4a. Adding an enemy (as built, M8)

Four edits, none of them logic:

1. **`src/strings/en.ts`** — one line, `'enemy.lamplighter': 'Lamplighter'`. The key is typed, so a mistyped one fails the compiler rather than rendering blank.
2. **`src/content/enemies/effects.ts`** — only if it needs a debuff that does not exist yet. Magnitudes stay under `NORMAL_DEBUFF_MAX`; the content test enforces the §3.2 gap between a normal floor's teeth and a boss's.
3. **`src/content/enemies/index.ts`** — one object in `ENEMIES`: id, `nameKey`, `family`, `avatar`, a `profile` of multipliers over the floor curve, an optional `playerDebuff`, its `floors` range and a `weight`.
4. **Its family must live somewhere.** An enemy is gated *twice* — by its own floor range and by the bands whose `families` include it. Author both or it never appears; the sweep in `src/content/floors/tower.sweep.test.ts` fails loudly if an enemy is unreachable, which is the mistake this gate is most likely to cause.

Then `npm run content:validate` and `npm run sim`. Nothing under `src/domain/` is touched — a new enemy is picked, scaled, modified, fought, rendered and rewarded entirely by code that never learns its id.

### 4b. Adding a quest template

Three edits: a name in `src/strings/en.ts`, a template object in `src/content/quests/index.ts`, and — only if the objective is genuinely new — a member of `ObjectiveKind` plus the event that advances it. That last one is the single part of quest authoring that touches code, and it is deliberate: an objective is something the game must know how to *observe*.

### 4c. The demonstration, kept honest

ROADMAP M8 asks for a throwaway enemy and quest template added end to end "in review". A review happens once; the claim it checks has to hold forever. So the demonstration lives in CI instead, as `src/content/content.pipeline.test.ts`:

- An enemy defined **only inside that test file** — in no shipped list, no string table, no registry — is turned into a combatant and fought to a real verdict, with its debuff reaching the hero through the same path every shipped enemy's does.
- The same test drives **every shipped quest template** to completion from ordinary play events, and asserts that every `ObjectiveKind` the type allows is both used by the pool and observable in the event stream — so an author cannot ship a quest that can never be finished.

If either ever fails, some rule has grown a hard-coded dependency on the content that ships today, and the failure lands in the commit that introduced it rather than in the next content pass.

**Where M8 did touch the engine, and why.** Filling the roster surfaced two *pacing* rules that no amount of data could express: floors now draw only from their band's families, and a floor never serves the enemy the floor below served. Both live in `src/domain/tower/floors.ts` and were written once, for all content; neither knows an enemy id. Adding the thirty-first enemy after them is still four data edits.

## 5. Localization posture (Q24: English-only in 0.1)

Content carries `stringRef`s into `src/strings/` (single English table in 0.1); no player-facing literal strings inside content or logic — the lint rule that makes later localization a translation task, not a refactor.
