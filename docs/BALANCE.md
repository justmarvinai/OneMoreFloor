# OneMoreFloor — Balance & Formula Design (EA 0.1)

> Status: **planning**. This document defines the *shapes* of every formula and where each number lives. Every literal below is **provisional** and exists to make the shapes concrete; real values are set during the balance milestone (ROADMAP M9) with the simulator (§10). Brief cited as §n.

## 1. The one rule about numbers (§3.7)

All tunables live in **`src/content/balance/`** — a small set of typed config modules (curves, tables, weights) with schema validation. Game logic imports *functions of the config*, never numbers. `grep -rn "[0-9]" src/domain/` finding a balance literal is a review-blocking bug. The config is documented inline (every entry: what it does, what changing it moves) so it remains tunable "at floor 10, floor 500 and floor 5000" (§3.7) by a human, months from now.

## 2. Design targets (the feel we tune toward)

- **§1:** every session produces visible progress; the player always has a next thing to claim/upgrade/push.
- **§14:** Gold is the resource the player is *always slightly short of* — sinks must permanently outpace faucets at every stage.
- **§3.3/§1:** death is cheap to recover from (Quick-Raid) and each run pushes meaningfully past the last — target: a post-death re-climb to the previous wall takes **minutes**, not the hours the first climb took.
- **§10.1:** gear levels 1–10 feel free-flowing; 11–15 is a proud push, never a paywall-feel.
- **§9.2:** early game caps at Epic; Legendary arrives later; **Mythical is a memorable event** (years-of-confetti rare, not schedule-rare).

## 3. Curve families (the endless-scaling backbone, §3.7)

One shared library of named curve shapes — `linear`, `polynomial(k)`, `exponential(r)`, `piecewise(...)` — each instantiated by config with documented parameters:

| Curve | Drives | Provisional shape | Intent |
|---|---|---|---|
| `enemyPower(floor)` | Enemy HP/ATK/DEF per floor | smooth exponential, ~×1.9 per 10 floors, with a step-up multiplier ~×1.35 on boss floors (§3.2) | Endless, no plateau; bosses are walls, normal floors are stairs |
| `rewardValue(floor)` | Gold/XP/material payout per floor clear | tracks `enemyPower` at a slightly lower exponent | Climbing higher is always the best faucet, but power outruns income → §14 scarcity |
| `xpToLevel(level)` | Level-up requirement | polynomial with soft knees at ascension caps (§7) | Levels stay frequent early, meaningful late |
| `statUpgradeCost(statId, n)` | Gold cost of the *n*-th purchased point (§6) | exponential; per-stat multiplier | Unbounded S&F-style sink (USER_QUESTIONS A2); always *a* next point in reach |
| `gearLevelCost(level, itemBracket, rarity)` | §10.1 track | piecewise: gentle polynomial 1→10, steep exponential 11→15 | Exactly the brief's two-phase feel |
| `gearAscensionCost(stars, itemBracket)` | Materials mix per star (§10.2) | rising counts across ≥2 material types, higher-tier materials from deeper floor bands | Ties gear ascension to *climbing*, not idling |
| `accountUpgradeCost(tier)` | §15 | Battle Speed: three sequential Gold tiers x2→x4→x8 (Q19), brutal exponential between them; Slot 2 cheap, 3–5 steep (§15.2) | "Insanely expensive" lives here, concentrated in x8 |
| `merchantRerollCost(PL)` | Instant "new goods" reroll (Q17) | rises with Power Level | Impatience is a gold sink; the free 6h restock stays the default path |
| `sellValue(item)` | Selling unwanted gear to merchants (Q16) | small config fraction of the item's budget | Minor faucet; keeps backpack pressure honest without denting §14 scarcity |

Boss floors additionally attach buff/debuff kits (COMBAT.md §4) whose magnitudes scale on their own documented sub-curve — bosses get *mechanically* nastier with depth, not just statistically bigger.

## 4. Damage & defense formulas (shapes)

- **Damage per strike:** `dmg = STR · classWeaponCoefficient · variance(0.9–1.1) · critMult(if crit) · Π(effects)`
- **Mitigation:** `taken = dmg · DEF_factor` where `DEF_factor = K / (K + DEF)` with `K` scaling per floor bracket — diminishing returns, never immunity (COMBAT.md §2), and enemy DEF keeps mattering at any depth because `K` grows with the band.
- **Crit:** `critChance = luckFactor(LUCK, floorBand)` — Luck is *relative to the band* (like the reference game's level-relative crit), so crit% is a live stat forever, not a solved checkbox. Cap below 100% (config, default 60%).
- **Speed double-attack:** `chance = speedFactor(SPEED, floorBand)`, cap (default 50%). Same band-relative treatment; enemy Speed uses the same function (§4.2 symmetry).
- **Signature move scaling** (Q6/Q26, design of record in COMBAT.md §5): `power = f(resourcePool)` per class, documented per class in the config.

Band-relative factors are the *endless* answer of §3.7: raw stats inflate forever, effective percentages stay in tuned windows.

## 5. Power Level (§13)

`PL = round( Wgear·GearScore + Wstats·StatScore + Wasc·AscScore + Wtower·TowerScore )`

- `GearScore`: Σ over equipped items of (base budget by item bracket × rarity multiplier × gear-level multiplier × gear-ascension multiplier) — §13's "including gear level and gear ascension".
- `StatScore`: normalized base+purchased stats (§13 "base and upgraded stats").
- `AscScore`: hero ascension tier weight (§13).
- `TowerScore`: from `highestFloorEverCleared` (§13 "tower progress").
- Weights `W…` in config; PL is displayed on the character screen (players love the number going up — §1) and is **the** input to gating (§6 below).

### Where the numbers actually live (as built, M2)

`src/content/balance/` holds `curves.ts` (the shared shapes), `items.ts` (brackets, rarity positions, affix budget costs, gear upgrade costs), `power.ts` (Power Level weights) and `progression.ts` (ascension table, XP curve, stat-purchase costs). **Per-class stat profiles live with their class definition** in `src/content/classes/`, because a class's base stats are part of its identity rather than a global curve — they are still content, still tunable, and still outside `src/domain/`, which is what §3.7's rule protects.

## 6. Brackets & the anti-overshoot rule (§13 — the load-bearing section)

**Bracket** = `bracketOf(PL)`: a config table mapping PL ranges → an **item budget window** `[minBudget, maxBudget]` plus allowed material/potion tiers. Every item-emitting system — floor drops (§3.6), Equipment Merchant (§11), Magic Merchant (§12), gacha (§16) — generates items **only inside the requester's current bracket window**:

1. Generation order: bracket → budget roll within window → rarity roll → the rarity's *within-window* budget position and affix-count tendencies → affix distribution. Affix slots follow the §10.2 table as resolved by Q3: an item rolls 1–2 slots at gear-ascension 0 (higher rarity → more likely 2), then the cadence 2 / 2 / 3 / 4 / 5 across ascensions 1–5.
2. **Rarity never escapes the window.** A Mythical at PL 800 is the best possible ~PL-800-bracket item — dramatically better than its Common neighbor, still a bracket-800 item. Rarity chooses *how good within the bracket*; PL chooses *the bracket*. (Brief's own canonical case: Ascension 0 / Level 12 / Floor 21 can never see a +1000-Strength chest — with bracket windows that item is unconstructible from any source, which is stronger than any per-source cap.)
3. Enforced by a property test sweeping character states × all sources × thousands of seeds, asserting emitted budgets ⊆ window (ARCHITECTURE §7). This test is part of CI forever.
4. `ItemInstance.bracketAtDrop` (SAVE_SCHEMA §3) audits the rule across real saves.

**As built (M2).** 40 brackets; a bracket's reference budget grows ×1.42 per bracket, and its window spans 0.55×–2.4× that reference. Rarity occupies a slice of that window (common at the bottom 12%, mythic at the top 12%), so a mythic is worth roughly four times a common *of the same bracket* — rarity matters without escaping the band. One implementation detail turned out to be load-bearing: affix values are whole numbers, so rounding can push what an item actually *gives* past the window even when the rolled budget was inside it. Generation therefore trims affixes until the realised total fits, and **the property test asserts the realised total, not the roll** — otherwise the guarantee would be green and meaningless. The test sweeps every bracket × every base type × every rarity (~13,000 items per run) plus the brief's canonical Level-12/Floor-21 case, and is CI-permanent from M2 onward.

Merchant stock (§11/§12) and gacha (§16.2) call the same `bracketOf` — one function, one truth.

## 7. Drop system (§3.6)

Per floor clear: guaranteed Gold + XP (curve §3), then weighted rolls from the floor band's **loot table** (content data): equipment (slot-weighted), materials (tiered by band), potions? (no — potions are merchant-only per §12), Tickets/Lucky Tickets at very low weights (§16.1), and relic/artifact items only for characters whose corresponding slot is already unlocked (Q22: gated on hero ascension 4/5 — the same gate applies to merchant stock). Boss floors: multiplied payout + improved rarity weights + a guaranteed "boss chest" roll (§3.2 "extra rewards"). Rarity weights per band implement §9.2's arc (early tables simply carry ~0 Legendary/Mythical weight; deeper bands introduce Legendary; Mythical weight stays vanishingly small everywhere — event-rare, and *never* bracket-breaking per §6 above).

## 8. Gacha odds (§16)

Two banners, single pulls only, every pull pays something, no pity counter — all confirmed by Q20. Provisional shape, tuned in M9: Ticket banner — jackpot (Legendary-at-bracket) low single-digit %; the rest of the table pays Rare/Epic gear and material/gold bundles (the *animation* sells the near-miss, §16.3). Lucky banner — Mythical jackpot ≪1%; floor of the table is Epic/Legendary. Ticket faucets (rare drops §16.1 + hard quests §17 + tutorial's single Lucky Ticket §18) are throttled so pulls are *events* — provisional target: a Ticket every day-or-two of normal play, Lucky Tickets ~weekly from the hard weekly (Q21's guaranteed hard slot).

## 9. Quests & potions economy

Daily objectives sized to one normal session, weeklies to a normal week, neither trivial (§17) — objective magnitudes scale from the character's own trailing activity (floors/day average) so "one day of normal play" stays true at every depth. Rewards: meaningful gold/material/XP boosts (config), hard weekly carries the Ticket odds (§17). Potions (§12): real-time one-hour buffs (Q9), one active per stat with re-drinking replacing the buff (Q18 — five potionable stats; Speed has none per §6); one tier per bracket window, magnitude a % of the stat (flat numbers die with inflation), priced so always-on-everything potioning is a genuine gold decision (§14 pressure).

## 9b. The economy, as built (M5)

- **Potions are percentages, never flat points.** A "+40 Strength" draught is a gift on floor 10 and a rounding error on floor 1000, and the tower is endless (§3.7). Magnitude creeps up with the bracket so a deeper draught earns its higher price, and it is capped so no stack of potions ever rivals gear.
- **Potions do not count toward Power Level.** If they did, a player could potion up, pull loot from a bracket they cannot hold, and let the buff lapse — §13's overshoot in another costume. They raise what the hero *hits with* (`combatStatsOf`), never what the game thinks they are worth (`totalStatsOf`).
- **Merchant stock ages out three ways** (Q17): the six-hour clock, a new best-floor milestone every ten floors, and — added here — a change of bracket. A shelf rolled for a weaker hero is not merely stale, it is visibly unbuyable, and leaving it there would make the shop feel broken rather than patient.
- **Buy and sell are one ratio.** `BUY_PRICE_FRACTION` and `SELL_VALUE_FRACTION` are the two halves of a single knob: a piece sells for roughly a fifth of what it costs, which keeps the backpack a decision rather than a gold faucet (Q16).
- **Upgrades are outside the bracket rule, on purpose.** Gold and materials spent on a piece *should* push it past what drops — that investment is what raises Power Level, which raises the bracket, which raises the next drop. The property test therefore sweeps generated items and merchant shelves, never upgraded ones.

## 9a. First simulator findings (M3)

The harness earned its place on the first run, before any tuning had been attempted. It found:

1. **An XP double-count in the domain, not the sim** — floor rewards banked experience *and* the caller converted it again. Fixed by making a cleared floor apply its own levels, so there is no raw-XP seam for a caller to get wrong.
2. **Every re-climb replayed the identical tower**, which made the core loop a memory test. Deaths now advance the run seed.
3. **The Swashbuckler could not charge Focus at all at level 1.** Both of her fill events depend on Speed, and Speed comes only from gear (Brief §6), so a new Swashbuckler's bar never moved. She now has a small per-round trickle; the identity from Q26 is unchanged.

**What it still reports, for M9 to close:** with the *ClimberNoShop* archetype (no merchants, no gear upgrades, no ascension — none of which exist before M5/M6), every class plateaus at a boss floor, and the spread between them is far too wide (deepest floor 9 for the Swashbuckler against 101 for the Mage). Both are expected of a game missing its economy, and both are exactly what §10's gates are for. Tuning against a half-built game would be tuning against the wrong thing, so the numbers stand until M9.

## 10. The balance simulator (how we tune honestly)

A headless harness over the real `domain/` code (same combat resolution, same generators — never a parallel model): scripted player archetypes (e.g., *ClimberNoShop*, *ShopEveryRestock*, *GachaHoarder*) are simulated across sessions/days; outputs: floor-over-time, death walls, gold balance over time, gear-level distribution, time-to-Legendary, signature-move uptime per class, endless-guard fire rate (must be ~0, COMBAT.md §3). Acceptance gates for M9 (provisional): first death ~floors 15–25 for a no-shop climber; the re-climb-in-minutes target from §2 above; classes within a tuned win-rate band of each other at equal PL (§8 "genuine upsides and downsides" — different *paths*, comparable *power*); gold balance trends slightly-short at every archetype (§14). The simulator ships in `tools/` and stays part of the repo — every future content/balance PR reruns it (CLAUDE.md rule).
