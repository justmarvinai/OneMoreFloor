# Changelog

All notable changes to OneMoreFloor are documented here, maintained from the first commit onward (Brief §22).
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versioning will follow the game's release naming (next planned release: **Early Access 0.1**).

## [Unreleased]

### Added — M5: somewhere for the gold to go

- **The character screen** (Brief §6/§7/§9/§10): the paperdoll with armour down one side and the ascension trinkets down the other, the weapon row beneath, and the backpack alongside. Every stat row says *what the number does* — "31% of damage turned away", "9% double attacks" — computed from the same config the fight reads, so a player can tell whether the next point is worth buying without running an experiment. A locked slot names the ascension that opens it rather than going quiet (§20.5).
- **Both upgrade tracks are playable** (§10). Gold buys gear levels 0–15; materials found deeper in the tower buy stars, and a star that opens an affix slot fills it, so ascending always shows its work. They are separate panels on purpose: merging them into one button would hide which resource is actually short.
- **Gold stat upgrades and hero ascension** (§6, §7) run through the same screen, with the level cap and the slot each tier unlocks stated up front.
- **Both merchants** (§11/§12): bracketed stock, prices, rarity frames, sold-out states, and — the part that matters — the free restock countdown sitting *beside* the paid reroll rather than instead of it (Q17). A shop that hides the free path is selling impatience dishonestly.
- **Potions** (§12, Q9/Q18): one draught per stat a potion may raise, brewed per bracket, running for an hour of real time that burns down while the game is closed. One active per stat, and re-drinking restarts the hour — enforced by the shape of the data rather than by a rule someone has to remember. Speed has no draught and cannot have one: the type that keys the rack excludes it (§6).
- **The backpack is finite** (Q16). A full pack refuses a drop rather than swallowing it, selling pays the configured fraction, and a swap that has nowhere to put what comes off is refused with a reason — losing a piece silently would be the worst bug in the game.
- **Red-dot truth** (§20.5): one service decides every notification dot, from one rule — a dot means something the player can do *right now*. Not something new, not something unread. Dots that lie are dots players stop reading.
- **Merchant stock is derived, not stored.** A shop's save state is a seed, a timestamp, the bracket it was rolled for and what has been bought; the shelf regenerates from that. The save stays small, a shop is reproducible in a bug report the way a fight already is, and stock cannot drift out of agreement with the rules that made it.
- **The anti-overshoot guard now sweeps both shelves** through the shop's own code path (Brief §13). Merchants inherit the guarantee by generating through the same door as drops, and this proves it rather than trusting it.
- **Verification:** 415 unit tests and 19 Playwright smoke tests, the last of which closes the milestone's loop in a browser — climb, buy a piece, wear it, watch Power Level rise.

### Changed — M5

- **Save schema v3:** characters gained their running potions and each merchant's shelf. A migrated save starts with an empty potion rack and two shelves stamped at the epoch, so the first visit stocks them at the hero's real bracket instead of one guessed at migration time.
- **Potions never move Power Level.** They raise what the hero *fights with*, never what the game thinks they are worth — a drinkable bracket jump would let a player potion up, pull loot they cannot hold and let the buff lapse, which is the overshoot §13 exists to prevent.
- **A merchant restocks when the hero changes bracket**, on top of Q17's six-hour clock and best-floor milestone. Goods rolled for a weaker hero are not merely stale; they are visibly unbuyable, and leaving them there makes the shop look broken rather than patient.
- **⧗Q29 filed:** buying a draught drinks it. The brief never describes a potion inventory, Q16 sized the backpack for gear, and stockpiling cheap draughts to drink at a deeper bracket would be the overshoot problem in another costume. The owner has the question; nothing is blocked on it.

### Added — M4: the game becomes visible

- **The loop is playable.** Climb, fight, loot, level, die, Quick-Raid back up — end to end, with real drops, in a browser. Entering a hero now lands on the tower rather than a placeholder, and the placeholder screen is gone rather than replaced.
- **The Lootspire** (Brief §3.1, §3.4): a scrolling floor path showing the climb *ahead* of you, because the tower only goes up (Q23) — which means every node on it does something. The floor you are standing on is the fight; a floor you conquered in an earlier run Quick-Raids straight to that depth; new ground is not clickable because climbing is the only way there. Beside it, the next floor's enemy: portrait, stats, and the modifiers it will impose, each with its own tooltip.
- **The fight** (Brief §4.1, COMBAT.md §7): two portrait cards over the band's arena, in the arrangement the reference screens use. Cards lunge and recoil, crits stamp an impact frame, heavy blows wash the screen red, a full resource bar pulses and its signature move stops the fight for a beat. Under each card is a stat block, because a player who loses should be able to see why from the cards alone. The fight log is a drawer, so the arena keeps the whole screen.
- **Battle Speed is playback, never outcome** (§3.5). The multiplier scales the animation timeline and the waits between beats, and changing it takes effect on the next beat. Damage numbers have a minimum life independent of the rate, so a fight at x8 reads as a fast exchange rather than a smear — "legible at x8" is now an assertion, not an opinion. Until the account upgrade lands in M6 the indicator shows x1 and says what would raise it (§20.5).
- **Skip ends a fight exactly where watching it would** (§3.4): every remaining beat is applied with its animation suppressed, so the final frame is identical. The result was already saved before the first frame played (COMBAT.md §1), which is what makes that safe.
- **The aftermath** (COMBAT.md §8): a victory screen with what the floor gave, loot cards framed by rarity, and "One More Floor" that walks straight into the next fight without a detour. A level-up gets its own beat first. A death leads with what you *kept* — level, gear, gold, materials, every floor record — and offers the Quick-Raid back up, because death is meant to be a launchpad, not a slap.
- **Native tooltips are now impossible in the running game** (§20.4). Six vendored FantasyUI components set a `title` attribute; a lint rule cannot see them and editing them would be the silent fork the project forbids. A runtime service adopts every `title` the app produces into a FantasyUI `Tooltip` instead, and a smoke test asserts the document never contains one — so the ban is a property of the shipped game, not just of our source.
- **Bands have a look.** Each floor band carries backdrop art (Q11: FantasyUI's own, for now), painted behind both the trail and the arena, so a stretch of the tower reads as a place rather than a number range. Swapping in the owner's scene art later is one field per band.
- **Enemies have faces.** Ten of the thirteen enemies and bosses now wear FantasyUI art that genuinely is them — a stone golem, a demon lord, a brute. The three with nothing fitting in the library keep the documented silhouette, because a wrong portrait reads as a bug while the fallback reads as art still to come (§4.3). **⧗Q28** asks the owner which way to close the gap; nothing is blocked on the answer.

### Fixed — M4

- **`content:validate` now checks art bindings**, so a mistyped asset id fails the build instead of rendering as an empty frame. It also rejects a line glyph in any painted-icon slot: FantasyUI's `glyph-*` set is `fill="currentColor"` SVG meant to be used as a CSS mask, and painted as a background image it resolves to black and vanishes — which is exactly how the first pass at effect chips came out invisible.
- **`npm run smoke` builds before it serves.** Playwright previews `dist/`, so running it alone quietly tested the previous build.


### Added — M3: the combat engine, the tower and Quick-Raid

- **Combat resolves to data, then gets performed** (COMBAT.md §1). A fight is a pure function of `(hero, enemy, seed)` returning the whole thing as an ordered event script. Three brief requirements fall out of that one decision rather than needing their own machinery: skipping a fight can't change its outcome (§3.4), Battle Speed is a playback rate over a decided result (§3.5), and any fight can be replayed exactly from its seed.
- **Every stat now does its job in a real fight** (§4.2/§6): Strength scales damage, Defense mitigates on a curve that never reaches immunity, Luck buys crits, and Speed grants a second strike *before the enemy acts*. Crit and double-attack chances are band-relative, so raw stats inflate forever while the percentages stay in tuned windows at floor 10 and floor 5000 alike (§3.7).
- **All five classes fight differently** (Q6/Q26): each charges its resource from its own events and spends a full bar on its signature — the Warrior's Berserk Strike or Shield Slam depending on what's in his offhand, the Mage's defense-piercing Arcane Blast, the Hunter's volley of independently-critting arrows, the Bard's rotating songs, the Swashbuckler's flurry ending in a feint that eats the next attack.
- **The tower** (§3.1/§3.7): an endless, seeded floor generator with every tenth floor a boss, five floor bands, a starting bestiary of eight enemies and five bosses, and procedural modifiers that trade one stat for another past the authored floors. Boss floors debuff the player and buff the boss (§3.2), and content validation enforces that normal-floor debuffs stay milder than boss ones.
- **Rewards through the bracket** (§3.6): gold, experience, materials, equipment and the rare ticket, all routed through the same generator M2 built — so the anti-overshoot guarantee covers floor drops for free. Relics and artifacts only drop once their slot is unlocked (Q22).
- **Death and Quick-Raid** (§3.3/§3.4, Q8): a death resets the run and nothing else — a test asserts that currencies, materials, inventory, equipment and progression all survive it. Quick-Raid chains through cleared floors with identical rewards to watching, and stops the moment the hero would die rather than pretending otherwise.
- **The balance simulator** (BALANCE.md §10) runs archetypes over the real engine — never a parallel model.

### Fixed — found by the simulator on its first run

- **Experience was counted twice**: a cleared floor banked XP and the caller converted it again. Clearing a floor now applies its own levels, so there is no raw-XP seam left for a caller to get wrong.
- **Every re-climb replayed the identical tower**, which turned the core loop into a memory test. A death now advances the run seed — deterministically, so saves still replay — and the next climb is a genuinely new tower. Floors remain stable *within* a run, which is what that guarantee was always for.
- **The Swashbuckler could not charge Focus at all at level 1.** Both of her fill events depend on Speed, and Speed comes only from gear (§6), so a new Swashbuckler's bar never moved. She now has a small per-round trickle; her identity from Q26 is unchanged.

### Fixed — verification tooling

- **`content:validate` had been passing without running anything.** It scoped Vitest with `--dir src/content`, which makes the config's `include` globs resolve relative to that directory, so they matched nothing — and `--passWithNoTests` turned the empty run green. The three content suites it was meant to guard (51 tests) had never run under it since M0; they now do, and an empty run fails loudly instead of reporting success.

### Added — M2: items, stats, Power Level and the anti-overshoot rule

- **The anti-overshoot rule is now a mechanism, not an intention** (Brief §13). Every item in the game — drops, both merchants, the gacha — is generated through one function, and a permanent CI property test sweeps roughly 13,000 items per run across every bracket, base type and rarity to prove none exceeds its bracket. It asserts what an item *actually gives*, not the budget it rolled: integer rounding could push a realised item past its window, and a test on the roll alone would have stayed green while the guarantee leaked. The brief's own example is a named case in the suite — at Ascension 0, Level 12, Floor 21 a +1000 Strength chestplate is not merely improbable, it is unconstructible.
- **Power Level** (Brief §13) over equipped gear, base and purchased stats, ascension tier and highest floor cleared, and the bracket function every item source must call.
- **Item generation**: 52 base types across every slot and class, seven affix pools (including the offensive/defensive split that distinguishes Necklace from Amulet, Q5), six rarities positioned inside each bracket's window, and Q27 icon binding so real item art later is a data change.
- **Both gear upgrade tracks** (Brief §10): levels 0–15 with a deliberately two-phase gold curve — the first ten cost under 15% of the climb to 15 — and ascension 0–5 stars costing tiered materials that only deeper floors yield, which is what ties gear investment to climbing.
- **Equip rules** (Brief §8.1/§8.2, Q15): weapons class-exclusive, armour universal, two-handers occupying rather than emptying the offhand, shields for the Warrior alone, and accessory slots gated by ascension. Every refusal carries a reason rather than going quietly grey.
- **Progression**: the XP curve and level-ups against §7's caps, hero ascension 0→5 unlocking one slot per tier, and unbounded gold stat purchases where buying ten at once costs exactly what ten single purchases cost.
- **Starting equipment** (Brief §5, carried over from M1): every class begins holding exactly its class weapon — the Warrior with blade and shield, the Swashbuckler with both hands full — and every other slot empty.

### Changed

- **Save schema v2:** characters gained equipment, inventory, currencies and materials. The migration arms v1 heroes, who predate the item system, with their class loadout rolled deterministically from their own run seed — so a save from M1 opens with a hero who can actually fight, not an empty-handed one.
- Health was priced too cheaply against a level-1 hero's stats: one common starting shield granted +154 health against a base of 120. Re-tuned so early gear supports the hero rather than dwarfing them.

### Added — M1: save layer & character lifecycle

- **The five classes exist as content** (Brief §8), each carrying the identity approved in Q26: its resource and how the resource fills, its signature move, its weapon rule (Q15), its stat profile, its portrait and an honest description of what it gives up. A sixth class would be one new file plus art — no logic changes (Brief §2.3). Class portraits are optimised from the supplied masters by `npm run art:optimize` (20 MB of PNG to 288 KB of WebP) and registered in FantasyUI's own asset-variable namespace, so its components render them without a single vendored file being touched.
- **Hero creation** (Brief §5): pick a class, name the hero, begin. Name rules are enforced as the player types (Q25: 3–16 characters, letters/digits/spaces/apostrophes/hyphens, at least one letter, unique among your own heroes, no rename).
- **Character select** (Q2): five slots, one open and four locked behind the Account Slot upgrade (§15.2). Each card says what it is — a hero with their level, class and best floor; an empty slot; a locked slot naming what unlocks it; or a *damaged* slot, which is deliberately its own state so an unreadable character can never look like free space to build over.
- **Reset** (Brief §19) erases one slot only, after the player types the hero's name to confirm. Account upgrades survive untouched (Q4), and the record is backed up before removal.
- **The save layer is complete** (SAVE_SCHEMA §1–§9): account and character records, generational backups written before every overwrite, a recovery ladder that walks them newest-first, quarantine that never deletes damaged player data, one-user-action-one-transaction across stores, a Web Locks session guard so a second tab cannot race the save, and a migration fixture harness built on genuinely captured blobs.
- **Verification:** 168 unit tests and 11 Playwright smoke tests, the latter covering create → play → switch → reset in a real browser, plus the standing checks that the game makes no external request and that every asset resolves from the build.

### Fixed

- A record's very first write left it with no backup at all, so a character corrupted moments after creation was unrecoverable. The first write now seeds its own backup. Found by a test whose premise turned out to be wrong about the code.

### Added — M0: foundation & walking skeleton

- **Toolchain and CI.** Vite + strict TypeScript, Vitest, Playwright, Prettier, and an ESLint flat config whose rules enforce the brief mechanically: native `title` tooltips are rejected in every shape they could reach the DOM (§20.4), `Math.random()`/`Date.now()`/`new Date()` are banned outside the two modules that own them, and `domain/`/`content/` cannot import `ui/` or `save/` (ARCHITECTURE §3). GitHub Actions runs typecheck → lint → format → unit tests → content validation → build → smoke; `vercel.json` configures the static deployment.
- **FantasyUI vendored** (19 components, both themes, all five art packs) via `tools/vendor-fui.mjs`, which closes each component's dependency graph, preserves the required `core/` + `components/` layout, and regenerates the barrel and stylesheet. Adding a component is a one-line edit to `fui.components.json` plus `npm run vendor:fui`.
- **Core app services.** `app/rng.ts` — named seeded streams that replay identically and fork by label rather than by consumption order, so replays survive code changes (ARCHITECTURE §5). `app/time.ts` — the clock service with rollback damping and local day/week period keys (Q9/Q10, SAVE_SCHEMA §7). `app/store.ts` — the typed state tree with slice subscriptions. `app/router.ts` — screen lifecycle, constructing on enter and destroying on exit.
- **Save layer.** IndexedDB via `idb`, with the schema version constant, the migration registry (which refuses saves from newer builds rather than downgrading them), CRC-32 record integrity, and generation counters. A corrupted record is detected and left on disk untouched for the recovery ladder arriving in M1 — player data is never silently overwritten (SAVE_SCHEMA §4–6).
- **Walking skeleton.** Boot sequence (art base → save → clock hydration → store → router), the FantasyUI title gate, the hub shell with hero rail and navigation, the in-game error panel that replaces any blank-page failure, the minimum-window gate (§20.6), and the `strings/` table every player-facing string already goes through (Q24).
- **Verification:** 64 unit tests and 7 Playwright smoke tests, including proof that the game makes no external request at runtime and that the vendored artwork loads from the build — the offline guarantee that keeps a later Electron wrap viable (ARCHITECTURE §6).

### Changed
- **Phase 2 complete (2026-08-22):** the owner answered all open questions (Q1–Q27) and confirmed assumptions A1–A15; every decision is folded into the planning docs and `USER_QUESTIONS.md` is converted into the project's decision ledger. Highlights now fixed in the docs: Gold as the only currency (Q1); one active character (Q2); account-wide Account Upgrades surviving per-slot resets (Q4); charge-and-burst class resources with the approved five-class signature table now in `docs/COMBAT.md` §5 (Q6/Q26); tomes cut from EA 0.1 (Q7, owner-approved deviation from Brief §3.6); same-rewards instant chainable Quick-Raid (Q8); real-time potions and local-midnight/Monday quest resets (Q9/Q10); confirmed hand-authored content volume (Q12); portrait-card combat (Q14); weapon-slot semantics and starting loadouts (Q15); finite sell-to-merchant inventory (Q16); timed merchant restock with Gold reroll (Q17); per-stat potion concurrency (Q18); x2/x4/x8 Battle Speed tiers (Q19); no-pity single-pull gacha on two banners (Q20); 3+3 quest board (Q21); ascension-gated relic/artifact availability (Q22); strictly-upward tower flow (Q23); English-only 0.1 (Q24); fixed hero-naming rules without rename (Q25); FantasyUI-icon item art with id-bound upgrade path (Q27); FantasyUI art licensing cleared commercially (Q13). Phase 3 (explicit approval to start development) remains open.

### Added
- **Phase 1 planning package** (no game code — per Brief §22 the planning phase precedes all development):
  - `docs/GAME_BRIEF.md` — the owner's v2 brief, archived verbatim as the requirements source of truth.
  - `USER_QUESTIONS.md` — the twelve known contradictions from Brief §23 (Q1–Q12) plus fifteen questions found during planning (Q13–Q27), each with options and a recommendation, and fifteen working assumptions (A1–A15).
  - `ROADMAP.md` — phase gates and milestones M0–M10 with exit criteria, sized and dependency-ordered to a shippable EA 0.1.
  - `docs/ARCHITECTURE.md` — tech stack decision with written justification (Vite + strict TypeScript + vanilla DOM with vendored FantasyUI; DOM/WAAPI combat rendering; seeded deterministic RNG; `idb`-wrapped IndexedDB), module layout, cross-cutting policies, Electron forward-compatibility checklist.
  - `docs/SAVE_SCHEMA.md` — IndexedDB save design: schema versioning + migration registry, checksummed generational backups and corruption recovery, clock-tamper damping, session lock, export/import posture.
  - `docs/BALANCE.md` — formula shapes and curve families, Power Level formula, the bracket system implementing Brief §13's anti-overshoot rule, drop/gacha/economy design, balance-simulator plan.
  - `docs/COMBAT.md` — combat specification: resolve-then-perform engine, CombatScript contract, turn model, buff/debuff model, presentation/choreography spec for x1–x8.
  - `docs/UI_FANTASYUI_MAP.md` — full screen inventory mapped to verified FantasyUI components, custom-component allowlist, item-rendering standard, resolution strategy.
  - `docs/CONTENT_PIPELINE.md` — data-driven content architecture for classes, enemies, floors, items, quests and tutorial, with validation and authoring workflows.
  - `CLAUDE.md` / `AGENTS.md` — working instructions, hard rules from the brief, conventions, and task structure for this repo.
