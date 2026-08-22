# OneMoreFloor — Content Pipeline (EA 0.1)

> Status: **planning**. This defines how enemies, items, floors, classes, quests and balance data are authored, validated, and extended without touching game logic — the §2.3 forward-compatibility requirement made concrete. Brief cited as §n.

## 1. Ground rules

1. **Content is typed data in `src/content/`** — TypeScript data modules (checked by the compiler *and* a schema validator), not JSON files: we get literal-type safety, editor autocomplete and comments for free, while staying pure data (an exporter can emit JSON any day; nothing may contain functions — validator-enforced).
2. **Logic is generic over content.** The combat engine knows "a unit with stats and effect kits", never "the Floor-30 golem". Adding content = adding data + assets, zero logic edits (§2.3). A new class, enemy, floor band, material, affix, quest template, or tutorial step must each be provably addable this way — that's the acceptance test of the content milestone (ROADMAP M8).
3. **Stable string ids, namespaced** (`enemy.rotling`, `item.base.chest_scale`, `affix.atk_flat`, `quest.daily.clear_floors`). Ids are save-referenced (SAVE_SCHEMA §3) → **never renamed/reused**; removal goes through the deprecation map (SAVE_SCHEMA §4).
4. **Validation is CI** (`content:validate`, ARCHITECTURE §7): schema conformance, id uniqueness, dangling-reference checks (enemy → avatar asset, drop table → item defs), curve sanity (monotonicity where required), and the §13 bracket property test over generated items.

## 2. Content types & draft shapes

### Classes (§8) — `content/classes/`
```ts
{ id, name, resource: { kind: 'rage'|'mana'|'focus', fillRules, signatureMove },   // ⧗Q6/Q26
  weaponRule: 'two_handed'|'one_hand_shield_or_two_handed'|'dual_one_handed',      // §8.1 (⧗Q15)
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
Hand-authored volume per Q12's answer; beyond the authored range the floor generator composes `base enemy × scaling × modifier affixes` (e.g., `modifier.frenzied`: +ATK −DEF), all defined here too.

### Bosses (§3.2) — `content/enemies/bosses/`
Enemy shape + `bossKit`: player-debuff + self-buff sets (COMBAT.md §4) with per-depth magnitude curves, extra-reward table ref, and (later) dedicated avatar ids.

### Floors (§3) — `content/floors/`
No per-floor hand tables (endless, §3.1): floors are **generated** from `floorRules` — band themes (backdrop, enemy family pool, material tier), the every-10th-boss rule (§3.1), reward table refs, and named exceptions list (floor 1 tutorial pacing). The generator is seeded per run (ARCHITECTURE §5) with one hard invariant: **a floor, once generated for a character's run, is stable** (re-fighting after a loss re-faces the same enemy).

### Items (§9/§10) — `content/items/`
- **Base types**: per equip slot × class-restriction (weapons class-exclusive, armor universal — §8.2) × visual tier (icon binding ⧗Q27); e.g., `item.base.warrior_2h_greatsword`.
- **Affix pool** (§10.2's `+ATK/+DEF/+SPEED/+HP/+RESOURCE/+LUCK`): magnitude ranges expressed as *fractions of bracket budget* (BALANCE.md §6), slot-permission rules (Speed rolls gear-only by §6 — trivially true; whether Speed is weapon-biased is a balance choice), rarity → affix-count tendencies (§10.2 table, ⧗Q3).
- **Materials** (§10.2): tiered by floor band, referenced by `gearAscensionCost`.
- Potions (§12): stat × tier, merchant-only.

### Quests (§17) — `content/quests/`
Template pool: `{ id, cadence: daily|weekly, difficulty: normal|hard, objective: { kind, target: scalingRef }, rewards: RewardTableRef }` — objective kinds are a fixed engine vocabulary (clear-floors, defeat-boss, spend-gold, upgrade-gear, win-without-X…); templates are data (⧗Q21 counts).

### Tutorial (§18) — `content/tutorial/`
Ordered step data: `{ anchor: uiAnchorId, text: stringRef, advanceOn: eventRef, mask }` driving `TutorialMask/TutorialTip` — reorderable/extendable without code.

### Reward tables — `content/rewards/`
Shared weighted-table format used by floors, bosses, quests, gacha (rolls resolve through the bracket function, BALANCE.md §6–7). `rewardType` is an open union (tomes slot in later if Q7 says cut-now).

## 3. Asset binding

Game art lives in `assets/` (art) and binds by id from content; FantasyUI art by FUI asset id (`silhouette-warrior-m`). Adding a real enemy avatar later = drop file, change the enemy's `avatar` field — the §4.3 requirement verbatim. Item icons per Q27's answer follow the same id-binding pattern. A CI check fails on ids referencing missing files (never a broken image at runtime).

## 4. Authoring workflow (the recurring job, post-0.1)

"Add 10 floors of content" = extend a band or add one, add enemies/materials to pools, rerun `content:validate` + balance simulator (BALANCE.md §10), eyeball the sim deltas, done — no engine work. This workflow is the definition of done for the content milestone: we will demonstrate it by adding a throwaway enemy + quest template end-to-end in review.

## 5. Localization posture (⧗Q24)

Content carries `stringRef`s into `src/strings/` (single English table in 0.1); no player-facing literal strings inside content or logic — the lint rule that makes later localization a translation task, not a refactor.
