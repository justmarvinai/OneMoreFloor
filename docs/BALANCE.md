# OneMoreFloor — Balance & Formula Design (EA 0.1)

> Status: **tuned, EA 0.1 (M9).** This document defines the *shapes* of every formula and where each number lives; the shipped values live in `src/content/balance/` and were set by the simulator (§10), not by hand. Where a literal appears below it illustrates a shape — the config is the source of truth (§3.7). Brief cited as §n.

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

### The drop economy, retuned (fifth polish round)

**The tower pays in currency; gear is an event.** Equipment fell on about a third of all floors, which quietly broke §10: whatever the tower handed over next was likely to beat anything already owned, so levels, stars and materials were money spent on a piece about to be thrown away. A loop with no reason to touch it is not a loop.

Four numbers moved together, and they only work together:

| Constant | Was | Now | Why |
|---|---|---|---|
| `EQUIPMENT_DROP_CHANCE` | 0.34 | **0.06** | An ordinary floor almost never hands over gear. |
| `BOSS_EQUIPMENT_DROP_CHANCE` (+ `BOSS_EQUIPMENT_SECOND_CHANCE` 0.35) | 1 | **0.9** | A boss is where gear arrives, and sometimes brings two. |
| `FLOOR_GOLD.base` | 14 | **24** | What the floor pays instead — gold buys gear from the merchants *by choice*. |
| `MATERIAL_DROP_CHANCE` / `BOSS_MATERIAL_COUNT` | 0.42 / 3–6 | **0.58 / 4–8** | Ascension is the main way a piece improves now, and a path needs fuel. |
| `BUDGET_WINDOW` | 0.55–2.4 | **0.72–1.58** | One drop is at most ~2.2× another of its bracket, instead of 4.4×. |
| `GEAR_LEVEL_STAT_BONUS_PER_LEVEL` | 0.04 | **0.06** | Level 15 is +90%, not +60%. |
| `GEAR_ASCENSION_STAT_BONUS` (5 stars) | +0.60 | **+0.95** | Five stars nearly doubles a piece. |

The arithmetic that matters: a fully built piece is worth about **3.7×** its base (1.9 × 1.95), against a drop spread of **2.2×**. **Investment beats luck**, which is what §10 was written for and what the shipped numbers contradicted.

Two consequences were accepted deliberately:

- **Rarity earns less of its keep through raw budget.** The anti-overshoot suite's "mythic beats common by 3×" became 1.5×; rarity's remaining job is the affix count and where in the window a piece lands. A wider window is the thing that made finding gear the whole game.
- **The v5 save fixture was recaptured.** v1–v4 are historical blobs and never change; v5 is *what this build writes*, and item generation moved. Nobody's saved items changed — an item stores the budget it was rolled with (SAVE_SCHEMA §4).

All §10 gates still pass unchanged: first wall floor 12–28, first-session depth, re-climb time, class parity within 15 points, signature uptime, gold shortage, gear cost shape.

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

## 9c. Quests and account upgrades, as built (M6)

- **A quest target's unit is its scaling story.** Counts stay flat with depth (a floor is one click at any depth); gold targets are priced in *floors' worth of income at the hero's own depth*; the two "go deeper" weeklies are a multiple of their best floor. Anchoring gold to the **bracket** instead was the first attempt and it was wrong: a level-2 hero in freshly-rolled starting gear can already sit three brackets up while still earning floor-4 money, and the weekly asked them for 45,000 gold.
- **Payouts are priced the same way** — as a multiple of what a floor at that depth pays — so a daily is worth chasing at floor 8 and still worth chasing at floor 800 (§17's "genuinely good" rewards).
- **Only hard quests carry ticket odds** (§17), and the roll happens when the board is built rather than when the quest is claimed, so a player can see what a quest pays before deciding to chase it.
- **Slot 2 costs about a first session.** §15.2 calls the first extra slot cheap, and the first pass at 2,000 gold was roughly forty early floors — several evenings, not "cheap". The second hero is how a player meets the other four classes; pricing that out costs the game more than it earns. Everything above slot 2 stays steep, and Battle Speed keeps its cost concentrated in x8 (Q19).

## 9d. The gacha, as built (M7)

- **The odds in the config are the odds on screen.** Weights are relative, and the lobby's `RateTable` divides them itself — so a balance pass that edits a weight cannot leave a stale percentage printed next to it. Ticket banner: Legendary 3.00%, Epic 14.00%, Rare 33.00%, materials 30.00%, gold 20.00%. Lucky banner: Mythical 0.80%, Legendary 27.20%, Epic 72.00%. Both jackpots satisfy §16.2's "extremely low"; the Lucky one is well under a percent.
- **No weight is spent on nothing** (Q20). The worst outcome on the Ticket banner is a real bundle of materials at the hero's own tier; the worst on the Lucky banner is Epic gear. A property test draws every entry on every bracket and asserts each pull paid *something*.
- **Gold payouts are priced in floors' worth of income**, the same unit quests use, so a 26-floor purse still means something on floor 400.
- **The anti-overshoot guard now sweeps both banners** through the gacha's own code path (§16.2's "no overshooting"). Pulls inherit the guarantee by generating through the same `generateItem` every drop and shelf uses; the sweep proves it rather than trusting it.
- **The animation's bluff is a balance number, not a hidden one.** How high the reveal teases is drawn from `BLUFF_LADDER` and then raised to the outcome's own rarity — so the build may over-sell and can never under-sell. About a third of pulls stay honest; the full staging is rare enough to still mean something the twentieth time. The drawn rank is stored on the pull result, which makes the *animation* replayable from a save alongside the prize.

## 9f. The tuning pass (M9) — what moved and why

M9 is the milestone where the simulator stopped being a smoke test and became the
authority. Every §10 gate below is now an assertion in `tools/sim/gates.test.ts`,
run on every commit. The measurements that forced each change are recorded here
because the *reasons* outlive the numbers.

**Gear could lift its own bracket.** Gear is weight 1 in Power Level, Power Level
picks the bracket, and the bracket decides how good the next drop is — a loop
whose gain was above break-even. A no-shop climber's gear converged to bracket
~18 *regardless of depth* and the first death wall sat at floor 80 against §10's
15–25. Fixed by matching `BRACKET_POWER_STEP.factor` to `BRACKET_BUDGET_FACTOR`
and putting the base above nine times `BRACKET_BASE_BUDGET`, which makes gear's
own contribution self-limiting.

**So depth had to become the thing that raises the bracket.** `POWER_TOWER_CURVE`
went from a sub-linear polynomial to an exponential at ×1.82 per ten floors —
a shade below the enemy curve's ×1.9. Matched exactly, the fight would be
identical on every floor and nothing would ever stop a player. A whisker behind
means the tower pulls a few percent ahead every ten floors, the gap compounds
into a wall, and levels, stat points and gear upgrades are what push it back.
That is the loop the whole economy exists to feed (§14).

**Prices double-counted the same exponential.** An item's budget already grows
with its bracket, and `buyPrice`, `sellValue` and `gearLevelCost` each multiplied
it by a *second* per-bracket factor. Six sessions in, a climber's purse held
twelve billion gold, most of it from selling spares. Every item price now goes
through one anchor — `ITEM_GOLD_PER_BUDGET` — so prices and income can be
compared by dividing two numbers. Gear level and star costs became dimensionless
multiples of the item's own worth.

**Experience outran the tower.** XP cost per level was polynomial while XP income
was exponential, so heroes hit the level-100 ascension cap inside three sittings.
`XP_TO_NEXT_LEVEL` is now exponential at the rate the tower pays experience, and
level tracks depth rather than outrunning it.

**Three "band-relative" percentages were not.** `DEFENSE_K`, `CRIT.reference` and
`SPEED.reference` grew at ×1.42 per ten floors while the stats they normalise grow
at ×1.9 — so mitigation, crit and double-attack all drifted upward and would have
pinned at their caps a few hundred floors in, which is the precise failure the
band-relative design exists to prevent. All three now grow at ×1.9.

**Bosses were the entire game.** Measured win rates were ~97% on normal floors and
~22% on boss floors: nine free floors and a brick wall, ten times over. Boss
*excess* over a normal floor now ramps in (`BOSS_RAMP`) — the first gate is a
lesson, floor 60 onwards is the full wall — and normal floors were made to bite
via `ENEMY_BASE.strength`. The curve now reads 91–98% on normal floors, 62% at
floor 10, 69% at floor 20 and 32% at floor 30.

**Class parity was noise, one real bug, and a spread.** Measured properly (18
depths × 8 seeds per class rather than one fight per depth) the spread was much
smaller than the first reading suggested — but the Swashbuckler genuinely could
not reach its signature: both of its resource events depend on Speed, which comes
only from gear (§6), and its per-round trickle was too small to matter. Fill rates
and class stat lines were adjusted; the measured spread is now under six points
with every class between 42% and 48%.

### The gates, as they stand

| Gate | Target | Measured |
|---|---|---|
| First wall, no-shop climber | floors 15–25 (§10) | median **16**, IQR 10–20 |
| First sitting depth | visible progress (§1) | median floor **37** in 80 fights |
| Re-climb after death | minutes, not hours (§2) | **20–90 s** at ×1 speed |
| Class win rate at matched depth | one band (§8) | spread **5.6 points**, all 42–48% |
| Signature uptime | every class can reach it | **5–25%** of rounds |
| Gold | always slightly short (§14) | purse never covers the wanted pile, in any archetype |
| Gear levels | 1–10 free-flowing, 11–15 a push (§10.1) | 1–10 ≈ **5×** the item's worth, 11–15 ≈ **15×** that again |
| Rarity arc | Epic early, Legendary later, Mythical an event (§9.2) | no Legendary in bracket 0; first Legendary ≈ floor **70**; Mythical < **0.1%** everywhere |
| Ticket cadence | a pull is an event (§8) | ≈ **1–3** per sitting |
| Endless guard | ~0 (COMBAT §3) | **0** of ~2,700 fights |

Bands in the gates are deliberately wider than the tuned values. A gate that only
passes at today's digits forbids tuning; a gate should catch a change of *shape*.

## 9e. The roster, as authored (M8)

- **Authored, not tuned.** Enemy profiles, boss multipliers, family weights and `MODIFIER_STRENGTH` are first-pass numbers chosen for *shape* — a Rubble Golem is slow and armoured, a Roost Harrier is fast and fragile — not for a target difficulty curve. M9's simulator gates are where they get their real values, and tuning them before the roster existed would have been tuning against a smaller game.
- **Difficulty is asserted, not assumed.** The tower sweep compares decade to decade over five thousand floors: a single floor may dip when a fast, fragile enemy follows a hulking one, and it should be able to, but floor 500 may never be an easier fight than floor 400.
- **Variety is a floor, not an average.** Every authored floor must offer at least three candidates and every ten-floor stretch must actually show four different enemies in a single run. Both are test assertions, so a future band edit that narrows a stretch below them fails rather than quietly making the climb repetitive.
- **The boss sequence is the difficulty language.** Ten gates, each attacking a different stat from the one before it, is what makes depth feel like a curriculum rather than a multiplier. M9 may move the numbers; it should not collapse the sequence.

## 9a. First simulator findings (M3)

The harness earned its place on the first run, before any tuning had been attempted. It found:

1. **An XP double-count in the domain, not the sim** — floor rewards banked experience *and* the caller converted it again. Fixed by making a cleared floor apply its own levels, so there is no raw-XP seam for a caller to get wrong.
2. **Every re-climb replayed the identical tower**, which made the core loop a memory test. Deaths now advance the run seed.
3. **The Swashbuckler could not charge Focus at all at level 1.** Both of her fill events depend on Speed, and Speed comes only from gear (Brief §6), so a new Swashbuckler's bar never moved. She now has a small per-round trickle; the identity from Q26 is unchanged.

**What it still reports, for M9 to close:** with the *ClimberNoShop* archetype (no merchants, no gear upgrades, no ascension — none of which exist before M5/M6), every class plateaus at a boss floor, and the spread between them is far too wide (deepest floor 9 for the Swashbuckler against 101 for the Mage). Both are expected of a game missing its economy, and both are exactly what §10's gates are for. Tuning against a half-built game would be tuning against the wrong thing, so the numbers stand until M9.

## 10. The balance simulator (how we tune honestly)

A headless harness over the real `domain/` code (same combat resolution, same generators — never a parallel model): scripted player archetypes (e.g., *ClimberNoShop*, *ShopEveryRestock*, *GachaHoarder*) are simulated across sessions/days; outputs: floor-over-time, death walls, gold balance over time, gear-level distribution, time-to-Legendary, signature-move uptime per class, endless-guard fire rate (must be ~0, COMBAT.md §3). Acceptance gates for M9 (provisional): first death ~floors 15–25 for a no-shop climber; the re-climb-in-minutes target from §2 above; classes within a tuned win-rate band of each other at equal PL (§8 "genuine upsides and downsides" — different *paths*, comparable *power*); gold balance trends slightly-short at every archetype (§14). The simulator ships in `tools/` and stays part of the repo — every future content/balance PR reruns it (CLAUDE.md rule).

**As built (M9):** the harness plays *archetypes* — `ClimberNoShop`, `ShopEveryRestock`, `GachaHoarder` — across sessions, each one a sitting at the tower with real time passing between them so shelves age out on Q17's schedule. Every gate above is an assertion in `tools/sim/gates.test.ts`, and `npm run sim` is a CI step of its own. The gates were each verified to *fail* on a deliberately broken config before being trusted: weakening the enemies breaks the wall gate, making sinks cheap breaks §14, and reverting the band references breaks both the signature and the percentage gates. See §9f for what the first honest measurement found.
