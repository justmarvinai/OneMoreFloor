# USER_QUESTIONS — OneMoreFloor EA 0.1 (decision ledger)

> **Status: Q1–Q27 resolved (owner, 2026-08-22); Q28 open — filed during M4 and waiting on you.** Development is approved and underway — see `ROADMAP.md`.
>
> This file is now the **decision ledger**: every answered question is recorded below with its decision and the doc section where the decision is specified. The full original question texts (context, options, trade-offs) are preserved in git history (first commit of this file). Per `CLAUDE.md`, any **new** ambiguity found during development is filed under *Open questions* below and taken to the owner — never guessed.

## Open questions

### Q28 — Enemy art in the interim (found in M4, 2026-08-22)

**Context.** Q11 settled that *you* supply enemy avatars later, in the class-portrait bust format. It did not say what an enemy looks like until then, and M4 is the milestone where that stops being theoretical: the combat screen puts the enemy portrait at 240 px beside the hero's, and a bestiary of identical grey silhouettes reads as an unfinished build (§2.1) in exactly the screen the brief calls the one that must feel best (§4.1).

**What is in the build now (my judgement call, reversible in one field per enemy).** Ten of the thirteen enemies now wear FantasyUI art that genuinely *is* them — `hero-stone-golem` for the Rubble Golem, `hero-demon-lord` for the Cinder Tyrant, `hero-brute` for the Gutter King, and so on. The three with nothing fitting in the library (Spire Rat, Cave Lurker, Ember Hound) keep `silhouette-warrior-m`: a wrong portrait reads as a bug, while the documented fallback reads as art still to come (§4.3).

**The question.** Which do you want until your own enemy art arrives?

- **A — Keep it as built** *(my recommendation)*: fitting library art where it exists, silhouette where it does not. Best-looking interim, no new work, and every avatar is one field to swap.
- **B — Silhouette everywhere**: uniform and unmistakably provisional, at the cost of a combat screen that looks unfinished during M4–M7 reviews.
- **C — Library art everywhere**: no silhouettes at all, accepting that a Spire Rat would be represented by a human figure.

Answering this also tells me whether the missing three are worth a note in the M8 content plan, or whether your art lands before then.

*Nothing is blocked on this — the game plays either way, and switching is a one-line change per enemy.*

---

## Resolved decisions (owner, 2026-08-22)

### Part 1 — the brief's known contradictions (Brief §23)

| # | Question | Decision | Specified in |
|---|---|---|---|
| **Q1** | Silver vs Gold | **One currency: Gold.** No Silver anywhere. | BALANCE.md §2–3; SAVE_SCHEMA.md §3 |
| **Q2** | Active characters | **One active character at a time.** Switching = save + return to Character Select; inactive slots fully frozen (real-time buff timers keep ticking per character). | SAVE_SCHEMA.md §3/§8; UI_FANTASYUI_MAP.md §8 |
| **Q3** | Gear Ascension 2 stat slots | **2 slots** (no new slot at asc 2; usual bonus-stat increase still applies). Slot cadence: asc 0 → 1–2 · 1 → 2 · 2 → 2 · 3 → 3 · 4 → 4 · 5 → 5. | CONTENT_PIPELINE.md §2 (items); BALANCE.md §6 |
| **Q4** | Reset scope / upgrade scope | **Account Upgrades are account-wide and survive resets. Reset wipes exactly one character slot** back to empty; account record untouched. Typed/slide confirmation before reset. | SAVE_SCHEMA.md §3/§9; UI_FANTASYUI_MAP.md §4 |
| **Q5** | Necklace vs Amulet | **Different affix pools:** Necklace = offense-leaning (ATK/Luck/Speed-biased); Amulet = defense/sustain-leaning (HP/DEF/Resource-biased). | CONTENT_PIPELINE.md §2 (items) |
| **Q6** | Class Resource in combat | **Charge-and-burst:** resource bar fills per class-specific rules; full bar auto-triggers the class signature move, then empties. The stat raises pool size *and* signature power (bigger pool = slower charge, harder hit). | COMBAT.md §5 |
| **Q7** | Skill/Ability Tomes | **Cut from EA 0.1.** Removed from the §3.6 reward mix; `rewardType` union stays open so tomes can be added later without schema surgery. *(Deliberate, owner-approved deviation from Brief §3.6.)* | CONTENT_PIPELINE.md §2 (rewards) |
| **Q8** | Quick-Raid mechanics | **Proposal confirmed:** skipped fights = identical resolution and rewards, instant; **"Quick-Raid to Floor N"** chains all cleared floors with one aggregate summary, stopping early if the hero would die. | COMBAT.md §6; UI_FANTASYUI_MAP.md §2 |
| **Q9** | Potion timers | **Real time** (tick while game closed), with clock-tamper damping. | SAVE_SCHEMA.md §7; BALANCE.md §9 |
| **Q10** | Quest resets | **Local midnight** (dailies) / **Monday 00:00 local** (weeklies); date-string period keys; completed periods never re-grant on clock rollback. | SAVE_SCHEMA.md §7; UI_FANTASYUI_MAP.md §7 |
| **Q11** | Assets | Examples + class avatars verified in repo. **Enemy avatars: owner supplies later, same bust-portrait format/aspect as class avatars. Item art: placeholder icons for 0.1 (see Q27). Backdrops: FantasyUI art only for 0.1;** owner backdrops possibly later. | CONTENT_PIPELINE.md §3; UI_FANTASYUI_MAP.md §5 |
| **Q12** | Hand-authored volume | **Proposal confirmed:** ~30 enemy types across ~8 families (floors 1–100, ~3 per 10-floor band), 10 bosses (floors 10–100), ~5 floor-theme bands; procedural variants beyond 100; items fully generative from day one. | CONTENT_PIPELINE.md §2 (enemies/floors); ROADMAP.md M8 |

### Part 2 — questions found during planning

| # | Question | Decision | Specified in |
|---|---|---|---|
| **Q13** | FantasyUI art licensing | **All packs cleared for commercial use** (web + Steam); no pack to avoid. On the record per owner. | ARCHITECTURE.md §2 |
| **Q14** | Combat presentation | **Portrait-card choreography confirmed** (per `combat_example.gif` + bust avatars); no full-body rigged fighters. | COMBAT.md §7 |
| **Q15** | Weapon-slot semantics | **Confirmed:** 2H weapons occupy Mainhand and visually block Offhand (Mage/Hunter/Bard always; Warrior when using 2H); Warrior alternative = 1H + Shield (shields Warrior-only); Swashbuckler = 1H in each hand. **Starting loadouts: Warrior = plain 1H + Shield; Swashbuckler = both 1H weapons;** others = their class 2H. | CONTENT_PIPELINE.md §2 (classes); ROADMAP.md M2 |
| **Q16** | Inventory & disposal | **Finite backpack (S&F-style, ~15–25 slots — final size is a balance value), sell unwanted gear to any merchant for a config fraction of value;** backpack-full drop → resolution dialog (sell/discard/swap). Salvage-to-materials parked as a possible later feature. | UI_FANTASYUI_MAP.md §4–5; BALANCE.md §7 |
| **Q17** | Merchant restock | **Timed restock (~6h real time, config) + restock on new highest-floor milestone + instant Gold reroll** (price scales with Power Level). | UI_FANTASYUI_MAP.md §5; BALANCE.md §3 |
| **Q18** | Potion concurrency | **One active potion per stat, all five potionable stats may run concurrently** (Speed has no potion — gear-only); re-drinking replaces & restarts the hour; no stacking/banking. | BALANCE.md §9; UI_FANTASYUI_MAP.md §5 |
| **Q19** | Battle Speed shape | **Three sequential Gold tiers: x2 → x4 → x8,** each step far pricier; "insanely expensive" concentrated in x8. | BALANCE.md §3; SAVE_SCHEMA.md §3; UI_FANTASYUI_MAP.md §8 |
| **Q20** | Gacha pull anatomy | **Confirmed all four:** two banners (Ticket→Legendary-jackpot, Lucky→Mythical-jackpot); every pull pays something bracketed; **no pity counter in 0.1; single pulls only.** | BALANCE.md §8; reveal set-piece spec in UI_FANTASYUI_MAP.md §6 |
| **Q21** | Quest board | **Confirmed: 3 dailies + 3 weeklies** from a scaling template pool; one weekly always **hard** (Ticket/Lucky-Ticket eligible); no rerolls in 0.1. | CONTENT_PIPELINE.md §2 (quests); BALANCE.md §8–9 |
| **Q22** | Relic/Artifact availability | **Gated:** relic/artifact items drop/appear in stock only once the character has unlocked the corresponding slot (Ascension 4/5). | BALANCE.md §7 |
| **Q23** | Tower flow & farming | **Confirmed:** after victory → tower screen + manual "one more floor" press (no forced auto-advance); runs are strictly upward — no in-run re-fighting; farming = die → Quick-Raid re-climb. | COMBAT.md §8; UI_FANTASYUI_MAP.md §2 |
| **Q24** | Localization | **English-only EA 0.1;** every player-facing string still goes through `src/strings/` from the first commit so translation later is content work, not a refactor. | CONTENT_PIPELINE.md §5; CLAUDE.md conventions |
| **Q25** | Hero naming | **Confirmed:** 3–16 chars; letters/digits/spaces/`' -`; must contain a letter; unique among own slots (case-insensitive); **no rename**; no profanity filter (local single-player). | SAVE_SCHEMA.md §3; UI_FANTASYUI_MAP.md §8 |
| **Q26** | Class special mechanics | **Direction approved as proposed** — per-class resource fill rules + signature moves table (now the design of record in COMBAT.md §5; tuning values follow in M9). Includes: no baseline dodge stat — dodge exists only as an effect. | COMBAT.md §5 (table), §3 |
| **Q27** | Item art source | **Hybrid (c), details my call:** 0.1 ships on curated FantasyUI icons (spell-icons / line-glyphs / generic icons) inside rarity `TintFrame`s, ~3 icon variants per slot family across depth bands (weapons ≥3 per class); every base type binds art by one `icon` id field so real art later is a data change, mirroring §4.3's avatar rule. | CONTENT_PIPELINE.md §2–3; UI_FANTASYUI_MAP.md §9 |

### Part 3 — working assumptions A1–A15

**All confirmed** (the silence-equals-consent window closed with the Q1–Q27 answers; several were explicitly ratified by them: A7/A8 via Q11/Q14, A12 via Q2). The assumption texts remain in git history; the ones with ongoing design weight are restated in the docs they govern (A1 → ARCHITECTURE.md §2, A5/A6 → BALANCE.md §5–6, A7 → UI_FANTASYUI_MAP.md §11, A10 → UI_FANTASYUI_MAP.md §8, A11 → COMBAT.md §1, A12 → SAVE_SCHEMA.md §8).

---

*Phase 2 is complete. Phase 3 (the owner's explicit "start development") is pending — until it is given, no game code is written (Brief §22; CLAUDE.md phase gate).*
