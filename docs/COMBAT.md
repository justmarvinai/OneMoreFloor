# OneMoreFloor — Combat Specification (EA 0.1)

> Status: **planning**. Depends on open questions Q6 (class resource role), Q14 (presentation), Q26 (class signature moves) — sections carrying that dependency are marked. All numbers here are **provisional handles for the balance config**, not final values (§3.7). Brief cited as §n.

## 1. Fundamentals

- Combat is **fully automatic** (§4.2): once a floor fight starts, no player input affects the outcome. The only in-fight controls are **Skip** (cleared floors only, §3.4) and the account-level Battle Speed (§3.5).
- Combat is **1 hero vs 1 enemy** per floor fight (the reference gif's duel format). Floors with "multiple enemies" are expressed as consecutive duels only if we ever add them — **not in 0.1** (§2.2's spirit: nothing beyond the brief).
- **Resolve-then-perform:** the engine resolves the whole fight instantly as a pure function `(heroState, enemyState, seed) → CombatScript`; the UI then *performs* the script (§6). This one decision makes Skip (§3.4) trivial (perform nothing, apply results), makes Battle Speed pure playback (§3.5: "affects the animation, not the outcome"), keeps outcomes deterministic and testable, and guarantees the death consequence applies even if the tab dies mid-animation (results are committed to the save when resolution completes, before performance begins — see SAVE_SCHEMA §5).

## 2. Combat statistics and their combat meaning (§6)

| Stat | In combat |
|---|---|
| Strength | Scales attack damage |
| Defense | Reduces incoming damage (diminishing-returns curve — see BALANCE.md §4; never reaches immunity) |
| HP | Max health |
| Class Resource | Signature-move pool: size and burst power (⧗Q6/Q26) |
| Luck | Crit chance (crit = damage × critMultiplier; multiplier is a balance value, default 2.0) |
| Speed | Chance to attack **twice** before the enemy's action (§4.2/§6) — the *only* gear-exclusive stat |

Enemies use the same stat vocabulary (content-defined, CONTENT_PIPELINE.md), so the resolution engine is symmetric — buffs, debuffs, crits and double-attacks work identically in both directions.

## 3. Turn model

Round-based; each round:

1. **Hero acts** (hero-first is the baseline; Speed's double-attack chance is checked for the hero here: on success the hero performs 2 strikes before the enemy's action; enemies may carry Speed too).
2. **Enemy acts** (unless dead).
3. **End-of-round effects** tick: buff/debuff durations count down, per-round resource fills apply (⧗Q6), damage-over-time debuffs (if any boss kits use them) tick.

An **action** = one strike (or a signature move if that unit's resource bar filled — the bar check happens at the start of the unit's action). Each strike resolves: hit → crit roll (Luck) → damage roll (small variance band around the Strength-vs-Defense result, BALANCE.md §4) → on-hit resource fills (⧗Q26 fill rules) → HP applied.

**Dodge:** the reference gif shows "Dodged!" callouts. In 0.1, dodge exists **only** as an effect (Swashbuckler signature aftermath ⧗Q26, possible boss kits) — there is **no baseline dodge stat**, because §6's stat list has none and inventing one silently would violate §0.3. If you want baseline dodge, say so in Q26's answer.

**Endless-fight guard:** if neither side can die (extreme Defense stacking), a hard round cap (config, default 100) ends the fight in favor of the unit with the higher remaining-HP %; exact ties resolve as a hero win on normal floors and a hero loss on boss floors — *provisional; the balance sim must show this guard virtually never fires* (BALANCE.md §10).

## 4. Buffs & debuffs (§3.2)

One unified model: `{ effectId, targetStat | special, magnitude, remainingRounds | wholeFight }`, applied by floor rules at fight start (boss floors: **debuffs on the player and buffs on the enemy**, §3.2; some normal-floor enemies apply **noticeably weaker** player debuffs, §3.2) and by signature moves (⧗Q26). Boss kits are content data (e.g., *provisional:* "Curse of Lead: −25% player Speed proc chance", "Stoneskin: +30% enemy Defense") — the engine only knows the generic model; kits live in `content/` (§2.3 data-driven). All active effects are visible as chips with custom tooltips during the fight (§4.1, §20.4).

## 5. Class resource & signature moves (⧗Q6, ⧗Q26 — direction pending sign-off)

Assuming Q6(a) charge-and-burst: each unit carries a resource bar (0 → pool where pool = Class Resource stat); fill events per class (Q26 table); at bar-full the unit's next action is its **signature move** (damage/effects scale with the pool size), after which the bar empties. Enemies can carry signature kits through the same mechanism (bosses will; normal enemies mostly won't — content decision). The bar is a first-class UI element on both unit frames — watching it creep toward full at x1 or blur toward full at x8 is a core tension beat (§4.1).

## 6. The CombatScript (engine → UI contract)

Resolution emits an ordered event list — the *entire* fight as data:

```
FightStart {heroSnapshot, enemySnapshot, floorContext, appliedFloorEffects[]}
RoundStart {n}
Action {actor, kind: strike|doubleStrikeSecond|signature, ...}
  → Hit {target, amount, crit, overkill} | Dodged {target, source}
ResourceFill {unit, from, to}   EffectApplied/Expired {…}
UnitDefeated {unit}   FightEnd {winner, roundsTaken, rewardsRef}
```

Properties: fully serializable (a bug report can attach a script and it replays exactly — ARCHITECTURE §5's determinism paying rent); the performer is a dumb interpreter (no game rules in the UI layer); Skip = apply `FightEnd` immediately (§3.4 "receives the result immediately"); rewards are rolled during resolution (same seed discipline), so skipping never changes loot (⧗Q8 proposal).

## 7. Presentation (§4.1 — the screen that must feel best) (⧗Q14)

Layout per the reference gif: **player portrait-card left, enemy right** (§4.1); each card = portrait (class avatar / enemy avatar, fallback `silhouette-warrior-m` per §4.3), name + level, HP bar with exact numbers, class-resource bar, buff/debuff chip row; scene backdrop between/behind them (dark-ember theme); Skip button + speed indicator below.

**Choreography vocabulary (the "richly animated" budget, §4.1):** attacker card lunges with anticipation-and-overshoot easing; weapon/spell effect (art per class/enemy kit) travels or flashes at the midpoint; defender recoils with tilt + hit-flash + screen-space impact frame on crits; floating damage numbers (crits bigger, styled distinctly); "Dodged!"-style callouts; resource-full flare → signature moves get a distinct set-piece treatment (brief pause, zoom/scale beat, heavier shake) — the mini-gacha-moment of every fight; kill beat: defeated card desaturates and collapses, victory/defeat banner. Damage vignette on heavy incoming hits. (Component mapping: UI_FANTASYUI_MAP.md §3.)

**Speed x1–x8 (§3.5):** the script performer runs on a WAAPI timeline whose playback rate is the Battle Speed multiplier. Design rule: choreography is authored at x1 with beats that *compress legibly* — at x8 a fight must read as a rapid, punchy exchange (numbers still legible: floats get a minimum on-screen life independent of rate), not a smeared fast-forward. Both extremes are acceptance criteria for the combat milestone (ROADMAP M4), tested at 1080p and 2K.

## 8. Death & aftermath (§3.3)

Hero HP → 0: death sequence (dark-ember `DeathScreen` treatment), then the reset contract verbatim from §3.3 — tower run to Floor 1; hero keeps level/XP/ascension/currencies/materials/equipment/upgrades/quest progress/account upgrades; `highestFloorEverCleared` untouched (§3.4). The death screen leads with what was **kept** and the Quick-Raid invitation ("Skip back through 41 cleared floors") — death should feel like a launchpad, not a slap (§1's "re-climb faster" loop).

## 9. Acceptance criteria (combat is "finished" per §2.1 when)

Outcome identical for watched/skipped/x1/x8 given the same seed (property test); every §6 stat visibly does its job in real fights; boss floors apply visible, tooltipped modifiers; script performer leaks nothing across fights (construct/destroy audit); 60 fps choreography at 2K per ARCHITECTURE §4; a first-session player can read *why* they won or lost from the fight alone (playtest criterion).
