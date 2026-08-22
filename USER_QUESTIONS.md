# USER_QUESTIONS — OneMoreFloor EA 0.1

> **Status: OPEN — awaiting your answers. Development does not start until every question here is answered and you approve the plan (Brief §22, Phase 2/3).**
>
> Format: each question states where it comes from in the brief (`docs/GAME_BRIEF.md`, cited as §n), why it blocks implementation, the options I see with trade-offs, and my recommendation. Recommendations are there to make answering fast — they are not decisions. Write your answer under **Answer:** (or answer in chat and I will fill these in).
>
> Part 1 = the twelve known contradictions from Brief §23.
> Part 2 = questions I found while planning.
> Part 3 = working assumptions I will proceed on *unless you object* — skim these; silence = consent.

---

## Part 1 — Known contradictions from the brief (§23)

### Q1 — Silver vs Gold: one currency or two?

**Source:** §14 names Gold as the primary currency for everything; the original brief also mentioned "Silver" as a floor reward.
**Blocks:** economy design, currency display, every reward table, save schema.
**Options:**
- **(a) One currency — Gold.** Floors drop Gold. Simplest economy, one number to balance, matches "Gold is needed for essentially everything."
- **(b) Two currencies.** Silver = common floor-clear payout used for cheap sinks (gear levels 1–10?); Gold = rarer, used for stat upgrades/merchants. Adds texture but splits the "always slightly short of" pressure across two numbers and doubles balance work.

**Recommendation:** (a) One currency, Gold. The brief's tension target ("the resource the player is always slightly short of", §14) works best with a single scarce currency; a second one dilutes it and §15's "insanely expensive" account upgrades price cleanest in one unit.

**Answer:**

---

### Q2 — Active characters & what "switching" looks like

**Source:** §19; the brief asks how many characters are *active* at once and what switching looks like in the UI.
**Blocks:** save-layer design (one active save vs several), the shell UI, character-select flow.
**Options:**
- **(a) One active character at a time.** A Character Select screen (S&F server-list analog) lists the slots; picking one loads it; an in-game "switch character" action returns to that screen. Other slots are fully frozen while inactive. Timers that run on real time (potions — see Q9) keep ticking per character.
- **(b) Parallel play** (e.g., background characters keep fighting). Contradicts "no idle systems described" and hugely complicates the save layer.

**Recommendation:** (a). One character loaded at a time; switching = save + return to Character Select; select screen shows each slot's class portrait, name, level, ascension stars, and highest floor.

**Answer:**

---

### Q3 — Gear Ascension 2 stat slots

**Source:** §10.2 table skips Ascension 2 (0: 1–2, 1: 2, 2: ?, 3: 3, 4: 4, 5: 5).
**Blocks:** item generation rules, gear-ascension UI.
**Options:**
- **(a) Ascension 2 = 2 slots** (no new slot; the ascension still adds its usual bonus-stat increase per §10.2). The +1-slot cadence then starts at Ascension 3. Monotonic, no table anomaly: 1–2 / 2 / 2 / 3 / 4 / 5.
- **(b) Ascension 2 = 3 slots.** Then Ascension 3 adds no new slot and the table reads 1–2 / 2 / 3 / 3 / 4 / 5.
- **(c) Ascension 2 = something qualitative** (e.g., upgrades the piece's weakest existing stat roll to a guaranteed minimum quality). More special-casing.

**Recommendation:** (a) — smoothest progression and every listed value stays exactly as written in the brief.

**Answer:**

---

### Q4 — Scope of a reset; are Account Upgrades account-wide?

**Source:** §15 ("Account Upgrades"), §19 (reset "wipes everything for that character").
**Blocks:** save schema (account record vs character records), reset flow, Account Upgrade purchase UI, price balancing.
**Options:**
- **(a) Account Upgrades are account-wide; reset wipes one character slot only.** Battle Speed and unlocked slots survive any reset — they live on the account record. Matches the literal name "Account Upgrade". Note the price consequence: they are bought once for all five slots, which supports "insanely expensive."
- **(b) Per-character upgrades; reset destroys them.** Makes "Account Slot" incoherent (a character owning account slots?) and makes resetting brutally punishing.

**Recommendation:** (a). Reset = wipe exactly one character slot back to "empty slot"; account record (Battle Speed tier, slots unlocked, which slot is active) is never touched by a character reset. Only thing I'd add: a typed-confirmation dialog before reset, since it is irreversible.

**Answer:**

---

### Q5 — Necklace vs Amulet: how do they differ?

**Source:** §7 (separate unlocks at Ascension 2 and 3), §12 (both sold by Magic Merchant).
**Blocks:** accessory item generation (affix pools), Magic Merchant stock tables.
**Options:**
- **(a) Different affix pools.** Necklace = offense-leaning accessory (ATK / Luck / Speed-biased rolls); Amulet = defense/sustain-leaning (HP / DEF / Class-Resource-biased). Same item framework, different flavor and pool — cheap to build, real choice.
- **(b) Necklace = flat stats, Amulet = percentage stats.** Stronger mechanical identity but percentage affixes ripple through the whole stat system and balance.
- **(c) Cosmetic difference only** (same pools, different names/art). Cheapest, least interesting.

**Recommendation:** (a).

**Answer:**

---

### Q6 — What does the Class Resource actually do in combat?

**Source:** §6 (Class Resource stat), §8.1 (Rage/Mana/Focus), §4.2 (combat is automatic).
**Blocks:** the combat spec's core loop, class identity (§8 "each class must have its own special system"), the value of the Class Resource stat and every item that rolls it.
**Proposal (design sketch — details in `docs/COMBAT.md` §5):**
- **(a) Charge-and-burst.** The resource bar fills during the fight (class-specific fill rules) and, when full, automatically triggers that class's **signature move**, then empties. The Class Resource *stat* raises the bar's size **and** the signature move's power: a bigger pool charges slower but hits harder — one stat, a real tempo/burst dial per class. Fill rules and signature moves differ per class (see Q26 for the per-class table).
- **(b) Passive scaling.** Resource is just a stat that scales class passives (e.g., Mage spell damage). Simpler, but classes stop having "their own special system or mechanic" (§8) and the stat feels like a second Strength.

**Recommendation:** (a) — it gives all five classes a visible, animatable mechanic inside the automatic combat (the bar filling is also great UI tension), and makes the stat a meaningful choice on gear.

**Answer:**

---

### Q7 — Skill/Ability Tomes: is there an ability system in EA 0.1?

**Source:** §3.6 lists "skill/ability tomes" as tower rewards; no skill system exists anywhere in the brief.
**Blocks:** reward tables, inventory categories — and if tomes stay, a whole new system needs a full spec.
**Options:**
- **(a) Cut tomes from EA 0.1.** Remove them from the §3.6 reward mix; the reward-table data model keeps an extensible `rewardType` so tomes can be added later without schema surgery.
- **(b) Ship a minimal ability system.** Even a minimal one needs: ability definitions per class, acquisition/upgrade rules via tomes, combat integration, UI. That is a large hidden feature and EA 0.1 is already big; it also overlaps the class signature-move design (Q6/Q26).

**Recommendation:** (a) — cut for 0.1, architect the reward and save schemas so tomes slot in later. If you choose (b), I will write a full spec for your approval first; it will move the roadmap noticeably.

**Answer:**

---

### Q8 — Quick-Raid mechanics

**Source:** §3.4, §23 Q8.
**Blocks:** tower screen UX, reward flow, the "re-climb faster" loop feel.
**Sub-questions and proposal:**
1. **Rewards:** skipped fights grant **exactly the same rewards** as watched fights (same resolution, same drop rolls — skipping only skips the animation, per §3.4's own wording). Anything less would punish the feature's whole point.
2. **Time cost:** instant — the fight is resolved in one tick, results shown immediately in a compact loot summary.
3. **Chaining:** a **"Quick-Raid to Floor N"** action that auto-skips from the current floor through every already-cleared floor in one go, with one aggregated loot/XP summary at the end. It stops early if the hero would die (each floor is still genuinely resolved — a debuff-heavy floor could in principle still kill an under-geared hero, which keeps skips honest).
**Options:** confirm proposal / same-rewards-but-no-chaining / reduced rewards on skip (not recommended).

**Recommendation:** the proposal above (same rewards, instant, chainable with aggregate summary).

**Answer:**

---

### Q9 — Potion timers: real time or play time?

**Source:** §12 (one-hour single-stat potions), §23 Q9.
**Blocks:** potion implementation, buff UI, time/anti-tamper layer of the save system.
**Options:**
- **(a) Real time** (ticks while the game is closed). Genre-standard (S&F does this), trivially understandable, encourages "come back and use your hour". Needs clock-tamper damping (see `docs/SAVE_SCHEMA.md` §7): timestamps stored per buff; backwards clock jumps never extend a buff.
- **(b) Play time only** (pauses when the game is closed). Friendlier value, but fiddly to display honestly ("47:12 of play time left"), and it invites leaving the tab open — which we can't distinguish from playing anyway, making (b) half-fake.

**Recommendation:** (a) real time.

**Answer:**

---

### Q10 — Daily/weekly quest reset timing

**Source:** §17, §23 Q10; no server exists, so this must be tamper-tolerant by design.
**Blocks:** quest system, reset scheduling, anti-tamper policy.
**Options:**
- **(a) Local midnight** for dailies; weekly resets **Monday 00:00 local**. Most intuitive ("new day = new quests").
- **(b) Fixed UTC time.** Consistent across travel/DST, but resets mid-evening for many players, which feels arbitrary in a single-player game.
- **(c) Rolling 24h/7d from first completion.** Maximizes fairness, but players lose the ritual of "my dailies reset at midnight" and it's the most gameable.

**Tamper policy regardless of choice (see `docs/SAVE_SCHEMA.md` §7):** quest periods are keyed to a date-string; a completed period never re-grants rewards even if the clock is moved back; moving the clock forward simply skips periods (the cheater only cheats themselves out of playtime — acceptable for a local single-player game).

**Recommendation:** (a).

**Answer:**

---

### Q11 — Assets: what exists, what's coming, what's placeholder

**Source:** §4.3, §20.3, §23 Q11.
**Verified in the repo (this half is answered):** `assets/examples/` is present — `general_game_layout.png`, `character_screen.png`, `equipment_merchant_screen.png`, `magic_merchant_screen.png`, and `combat_example.gif` (1544×1098, 126 frames), plus `assets/class_avatars/` with five 2048×2048 low-poly bust portraits (Warrior, Mage, Hunter, Bard, Swashbuckler). FantasyUI's `silhouette-warrior-m` exists in its `dark-ember` pack — enemy-avatar fallback confirmed workable.
**Still open — please confirm:**
1. Enemy avatars: you'll supply them later (§4.3) — in the same bust-portrait format/aspect as the class avatars?
2. **Item art** — see Q27, this is the biggest asset gap.
3. Backdrops: do you want to supply painted tower/scene backdrops (S&F-style illustrated scenes), or should EA 0.1 compose scenes from FantasyUI's `SceneBackdrop`/theme art only?

**Answer:**

---

### Q12 — Volume of hand-authored content before procedural scaling

**Source:** §3.7, §23 Q12.
**Blocks:** content plan, roadmap sizing.
**Proposal (numbers to react to):**
- **Enemies:** ~30 hand-authored enemy types covering floors 1–100 (roughly 3 per 10-floor band, drawn from ~8 thematic families), each with its own stat profile, debuff kit and (later) avatar. Beyond floor 100, procedural variants: hand-authored bases + scaling + affix modifiers (e.g., "Frenzied", "Armored") composed by the floor generator.
- **Bosses:** 10 hand-authored bosses for floors 10–100; beyond that, boss templates with escalating buff/debuff kits and procedurally composed modifiers.
- **Floor themes:** ~5 visual/thematic bands for floors 1–100 (which also group the enemy families), cycling with variation afterwards.
- **Items:** fully generative from day one (base types × rarity × affixes — see `docs/CONTENT_PIPELINE.md`); no hand-authored uniques in 0.1.

**Recommendation:** the numbers above; tell me if you want more/less hand-authored depth.

**Answer:**

---

## Part 2 — Questions from planning

### Q13 — FantasyUI art licensing for a commercial release

**Source:** FantasyUI's own README: component code is free to use, but "the artwork in `new_assets/` comes from third-party asset packs — check each pack's own licence before shipping commercially." OneMoreFloor is a long-term commercial game headed for Steam (§21).
**Blocks:** nothing in 0.1 development, but it must be on the record before EA ships.
**Question:** you own FantasyUI and know the packs' provenance — are the `stone-vine` / `dark-ember` theme art, `spell-icons`, `line-glyphs` and `deco-frames` packs cleared for commercial use in OneMoreFloor (web now, Steam later)? Any pack to avoid?

**Answer:**

---

### Q14 — Combat presentation: portrait-card choreography, confirmed?

**Source:** §4.1 says "match `combat_example.gif` as closely as possible" and also "avatars dodging, moving, weapons visibly clashing". The gif (and S&F itself) shows **portrait cards** — player card left, enemy card right, HP bars, stat blocks, floating damage numbers, "Dodged!" callouts — not full-body rigged fighters. The supplied class avatars are bust portraits, which fit the card style and cannot be limb-animated.
**Blocks:** the entire combat renderer design.
**Proposal:** portrait-card combat, aggressively choreographed: cards lunge/recoil with easing, tilt and shake on impact, hit-flash and damage vignette, weapon/spell effect sprites flying between the cards (from FantasyUI spell-icon art + custom particles), floating crit/damage numbers, buff/debuff chips, resource bars filling to signature-move bursts (Q6), screen-level impact frames on crits and kills. Full spec in `docs/COMBAT.md` §7.
**Question:** confirm portrait-card combat is the intent — or do you envision full-body animated fighters (which needs rigged/frame art you'd have to supply, and a materially different renderer)?

**Recommendation:** portrait-card as proposed; it matches the reference gif, the avatar assets you already made, and is achievable at the polish bar §4.1 demands.

**Answer:**

---

### Q15 — Weapon-slot semantics per class (Mainhand/Offhand)

**Source:** §8.1 weapon configurations vs §9.1's fixed Mainhand + Offhand slots.
**Blocks:** paperdoll UI, item generation per class, equip validation rules.
**Proposal:**
- **Warrior:** 2-handed weapon occupies Mainhand and *blocks* Offhand, **or** 1-handed weapon in Mainhand + Shield in Offhand (shields are Warrior-only weapon-class items). Both loadouts freely swappable from inventory.
- **Mage / Hunter / Bard:** their 2-handed weapon occupies Mainhand; **Offhand is permanently blocked** (visually "occupied" by the 2H weapon, not an empty slot begging to be filled).
- **Swashbuckler:** two 1-handed weapons — Mainhand and Offhand each hold one; both drop from the same Swashbuckler weapon pool.
**Sub-questions:**
1. Confirm the blocked-Offhand treatment for 2H classes (vs. giving them some other Offhand item type)?
2. **Warrior's starting weapon (§5):** starts with which config — a plain 1H + Shield, or a 2H? (I'd start 1H+Shield: teaches the shield mechanic and makes the first 2H drop exciting.)
3. Swashbuckler starts with both 1H weapons equipped?

**Answer:**

---

### Q16 — Inventory: capacity, and what happens to unwanted gear

**Source:** gap — §3.6 rains equipment on the player but the brief never defines an inventory or a disposal path. The character-screen reference shows a small S&F-style backpack grid.
**Blocks:** inventory UI, loot flow (what happens when full?), gold economy (selling is a gold faucet), materials economy (salvage?).
**Options:**
- **(a) Finite backpack (S&F-style, e.g. ~15–25 slots), sell for Gold.** Unwanted gear is sold to any merchant for a fraction of value. Full backpack on a drop → a "backpack full" resolution dialog (sell/discard/swap). Creates pleasant inventory pressure, feeds the gold economy.
- **(b) Finite backpack, salvage into ascension materials** instead of (or in addition to) gold.
- **(c) Unlimited inventory.** No pressure, list grows unboundedly — against the S&F feel.

**Recommendation:** (a) for 0.1, with the salvage idea (b) parked as a possible later feature — it competes with the tower as the materials source (§10.2 says materials are "found in the tower").

**Answer:**

---

### Q17 — Merchant restock rules

**Source:** §11/§12 say stock *scales* with progress but not when it *changes*. The reference screenshots show S&F's "New goods" reroll button — which S&F prices in premium currency; we have none.
**Blocks:** merchant implementation, gold sink design.
**Options (both merchants):**
- **(a) Timed restock + paid reroll.** Stock refreshes automatically every N hours (real time, e.g. 6h) *and* on each new highest-floor milestone; impatient players can reroll instantly for Gold (price scales with Power Level). Two habits in one: check-back ritual + gold sink.
- **(b) Timed restock only.** Simpler, no gold sink, less agency.
- **(c) Restock on floor progress only.** Ties shopping entirely to climbing; stalls when the player is stuck (exactly when they want to shop).

**Recommendation:** (a).

**Answer:**

---

### Q18 — Potion concurrency rules

**Source:** §12 ("each potion boosts exactly one specific stat for one hour").
**Blocks:** potion/buff implementation and UI.
**Proposal:** one active potion **per stat**, all stats may be potioned simultaneously (the S&F pattern — the reference character screen shows three concurrent potion timers); drinking a potion for an already-potioned stat **replaces** that buff and restarts the hour (no stacking, no time-banking); potion strength scales with the tier the Magic Merchant offers at your Power Level.
**Question:** confirm, or restrict further (e.g., max 3 active like S&F's three slots)?

**Recommendation:** confirm as proposed; a per-stat cap is self-limiting (there are only 5 potionable stats — Speed is gear-only per §6 and gets no potion).

**Answer:**

---

### Q19 — Battle Speed upgrade: steps and price shape

**Source:** §15.1 ("x1 up to x8, insanely expensive, slow to obtain").
**Blocks:** account-upgrade UI and pricing model.
**Options:**
- **(a) Three tiers: x2 → x4 → x8**, bought sequentially with Gold, each step far pricier than the last ("insanely expensive" lives mostly in the x8 step). Gives three long-term goals instead of one unreachable cliff — visible progress, per §1's emotional target.
- **(b) One purchase straight to x8.** One monolithic goal; a very long dry spell with nothing to show for it.
- **(c) Continuous small steps (x1.5, x2, x2.5 …).** Fiddly, dilutes the "event" feeling of each purchase.

**Recommendation:** (a), paid in Gold (the only currency, pending Q1).

**Answer:**

---

### Q20 — Gacha pull anatomy

**Source:** §16. It defines currencies, the low odds, PL-bracketing, and the animation bar — but not what a pull concretely yields.
**Blocks:** gacha implementation and the reveal animation's dramaturgy.
**Proposal:**
1. **Two banners:** the **Ticket** banner (jackpot = Legendary gear) and the **Lucky Ticket** banner (jackpot = Mythical gear). One pull costs one ticket of that kind.
2. **Every pull pays out something:** a non-jackpot pull yields PL-bracketed gear/materials/gold with rarity weighted below the jackpot tier (Ticket banner: mostly Rare/Epic gear or a material/gold bundle; Lucky banner: mostly Epic/Legendary). No empty pulls — the tease must always *almost* pay off.
3. **No pity counter in 0.1.** §16.2 demands "extremely low" odds and a Mythical that is "a memorable event, not a schedule" (§9.2); a pity timer manufactures exactly such a schedule. (FantasyUI has `PityCounter`/`WishList` if you ever want it later.)
4. **Single pulls only** in 0.1 — tickets are so rare that a 10-pull UI would mostly render disabled.
**Question:** confirm 1–4 (any of them can be flipped independently).

**Answer:**

---

### Q21 — Quest board composition

**Source:** §17 defines rewards and difficulty targets but not how many quests or how they're chosen.
**Blocks:** quest system data model and UI.
**Proposal:** **3 dailies + 3 weeklies** active at once, drawn from a hand-authored pool of templates with scaling objectives (e.g., "Clear N floors", "Win a fight without taking a crit", "Ascend a gear piece", "Spend N gold at merchants"). One of the three weeklies is always a **hard** one eligible for Ticket/Lucky-Ticket rewards (§17). No rerolls in 0.1. Objectives auto-scale to Power Level / highest floor so they stay "not trivially easy."
**Question:** confirm counts/no-reroll, or adjust.

**Answer:**

---

### Q22 — Do Relic/Artifact items appear before their slots unlock?

**Source:** §3.6 lists relics and artifacts as tower rewards; §7 locks their slots behind Ascension 4/5; §12 sells them.
**Blocks:** drop tables, merchant stock tables, inventory handling of unusable-but-owned items.
**Options:**
- **(a) Gated:** Relic/Artifact items only drop / appear in stock once the character has unlocked the corresponding slot. No dead loot, no confusion; the unlock moment also unlocks a whole new drop category (a great ascension carrot).
- **(b) Ungated:** they can drop early and sit in the inventory as trophies-in-waiting. Teases the future but clutters the backpack for hundreds of levels and muddies the anti-overshoot story.

**Recommendation:** (a).

**Answer:**

---

### Q23 — Tower flow: advancing, and re-fighting cleared floors

**Source:** §3.1–3.4 define the climb and Quick-Raid but not the moment-to-moment flow or whether cleared floors can be farmed within a run.
**Blocks:** tower screen UX, reward economy (farming = infinite faucet?).
**Proposal:**
1. **Flow:** after a victory the player returns to the tower screen (loot summary shown) and presses to start the next floor — no forced auto-advance; a "one more floor" button is the whole game's heartbeat and should be a deliberate, satisfying press. (An optional "auto-advance" toggle can come later if you want it.)
2. **Farming:** within a run, a floor can be fought **once** — the run is strictly upward (floors already cleared this run are behind you). Re-climbing after death (via Quick-Raid) re-earns rewards floor by floor, which *is* the farming loop and is naturally throttled by having to die/reset first. This keeps "die → re-climb faster" (§1) as the core rhythm rather than camping one floor.
**Question:** confirm both; if you want in-run farming of cleared floors instead, I need a rule for reward decay.

**Answer:**

---

### Q24 — Language: English-only for EA 0.1?

**Source:** gap. The brief is English; S&F's heritage (and possibly your audience) is German.
**Blocks:** whether all UI strings go through an i18n layer from day one (cheap now, expensive to retrofit).
**Proposal:** ship EA 0.1 **English-only**, but route every player-facing string through a simple string-table module from the first commit so localization later is a content task, not a refactor.
**Question:** confirm English-only 0.1 — and should German be architecturally anticipated as the first added language?

**Answer:**

---

### Q25 — Hero naming rules

**Source:** §5 ("naming the hero replaces account creation entirely").
**Blocks:** hero-creation validation, character-select display, save records.
**Proposal:** 3–16 characters; letters, digits, spaces, `' -`; must contain a letter; unique among *your own* slots (case-insensitive); **no rename** in 0.1 (the name is the identity — renaming is a later feature if ever); no profanity filter in 0.1 (single-player, local).
**Question:** confirm, or adjust (especially: should rename exist?).

**Answer:**

---

### Q26 — Class special mechanics: sign-off on the design direction

**Source:** §8 requires each class to have "genuine upsides and downsides and its own special system or mechanic" — but the brief doesn't say what they are. Together with Q6 this is the largest unspecified design surface in the game. I will not code any of this without your sign-off; a full tuning spec will follow in `docs/COMBAT.md` once the direction is approved.
**Proposed direction (assumes Q6 = charge-and-burst):**

| Class | Resource & fill rule | Signature move (on full bar) | Upside | Downside |
|---|---|---|---|---|
| **Warrior** | Rage — fills when hitting **and when being hit** | **Berserk Strike:** massive single hit; with a Shield equipped, instead becomes **Shield Slam:** big hit + brief damage-reduction buff | Tanky; loadout choice (2H burst vs 1H+Shield sustain) | Slow; low Speed gear affinity; no ranged tricks |
| **Mage** | Mana — fills steadily each round (combat rhythm) | **Arcane Blast:** huge burst that **ignores a portion of enemy Defense** | Best vs armored/boss enemies; biggest single hits | Squishy (low HP/DEF base); feast-or-famine between bursts |
| **Hunter** | Mana — fills on hit; bonus fill on crit | **Piercing Volley:** multi-hit flurry; each arrow can crit independently | Scales hardest with Luck; consistent DPS | Below-average defense; weak when crit-starved |
| **Bard** | Mana — fills each round; faster while buffed | **Crescendo:** damage + plays a **song buff** on self (rotating: +ATK / +DEF / +Speed-chance for a few rounds) | Self-buffing swiss-army class; smooths bad RNG | Master of none; signature hits weakest raw |
| **Swashbuckler** | Focus — fills on dodge and on double-attack procs | **Flurry & Feint:** rapid strikes + next enemy attack is dodged automatically | Highest Speed affinity (dual 1H = two Speed-rolling weapons); evasive | Paper-thin HP; volatile — great or terrible fights |

Class base-stat biases and per-class gear-affinity details follow in the balance doc after sign-off.
**Question:** approve this direction (details tunable later), redirect it, or supply your own class designs.

**Answer:**

---

### Q27 — Where does equipment art come from?

**Source:** gap. The game generates hundreds of distinct weapons/armor pieces (§9), and S&F-style shops/paperdolls live on item art. In the repo there is none; FantasyUI provides 235 painted **spell/ability icons**, 40 line glyphs, generic icons (sword, shield, potion, chest…) and tintable rarity frames — but no armor/weapon icon set that could cover 14 slots × 5 classes × tiers.
**Blocks:** item generation design (how many visual variants per slot?), ItemCard/Paperdoll rendering, merchant screens.
**Options:**
- **(a) You supply / commission item icon packs** (like the class avatars) — e.g., N icons per equipment slot per visual tier; I structure item data so art binds by id (one-line swap, same as enemy avatars §4.3). Until they arrive, development uses FantasyUI placeholder icons inside rarity-tinted frames.
- **(b) EA 0.1 ships on a curated FantasyUI-icon mapping** — each slot/class/tier mapped to the closest existing icons (spell-icons are painted squares that read well in slots), wrapped in rarity `TintFrame`s. Zero new art needed; weapons look evocative but not literal (a bow icon exists; a "leggings" icon does not).
- **(c) Hybrid (recommended):** (b) now so 0.1 is fully playable and shippable, with the data model of (a) so your real item art drops in later without touching logic — mirroring exactly what §4.3 prescribes for enemy avatars.

**Recommendation:** (c). If you pick (a)/(c), tell me roughly how many icons per slot I should design the variant system around.

**Answer:**

---

## Part 3 — Working assumptions (silence = consent)

Numbered A1…; each cites the brief section it interprets. I will proceed on these unless you object when answering the questions above.

- **A1 (§21):** Tech stack is my call per the brief; it is chosen and justified in `docs/ARCHITECTURE.md` — headline: **Vite + strict TypeScript + vanilla DOM with FantasyUI vendored per its own README; no framework, no game engine; Vitest + Playwright; IndexedDB via the `idb` micro-wrapper; seeded deterministic RNG.** Skim §2 of that doc; object there if anything bothers you.
- **A2 (§6):** Gold stat upgrades are unbounded with a steeply rising cost curve (S&F-style); exact curve in the balance config, tunable.
- **A3 (§7):** Hero Ascension is a deliberate action (button on the character screen once at cap), not automatic; XP gained at cap before ascending is discarded (the cap is a real wall).
- **A4 (§3.2/§3.3):** Boss floors must be beaten to pass to the next floor like any floor; "extra rewards" and their buff/debuff kits come from the balance/content configs.
- **A5 (§9.2):** Rarity affects an item's stat budget and how many affix slots it tends to roll within its Power-Level bracket — never the bracket itself (anti-overshoot, §13). Formalized in `docs/BALANCE.md` §6.
- **A6 (§13):** The Power Level formula and its bracket table live in one balance config file and are documented in `docs/BALANCE.md`; the merchant/gacha/drop systems all read the same bracket function.
- **A7 (§20.6):** Layout is fluid between 1440×900 and 2560×1440, art-directed at 1920×1080; below ~1280px width we show a friendly "window too small" panel rather than a broken layout (mobile is out of scope, §2.2).
- **A8 (§20.2):** Screens use the `stone-vine` FantasyUI theme for hub/town/merchant/character contexts and `dark-ember` for tower/combat/death contexts — the library's own intended split.
- **A9 (§21):** Browser floor = current evergreen desktop Chrome/Edge/Firefox/Safari (last ~2 versions). No IE/legacy shims. (Electron later pins its own Chromium, so this is Electron-safe.)
- **A10 (§18):** The tutorial is a guided overlay sequence on the real UI (FantasyUI `TutorialMask`/`TutorialTip`) driving the first climb → first loot → first upgrade → first death lesson; skippable via a deliberately small "Skip tutorial" link with a confirmation nudge (§18 "gently discourage").
- **A11 (§3.5/§15.1):** Battle Speed multiplies animation timeline speed only; fight outcomes are pre-resolved and identical at any speed (also what makes Quick-Raid's instant resolution consistent).
- **A12 (§19):** With one character active (pending Q2), the game runs in a single browser tab; a second tab on the same save shows a "game already open" guard (standard local-save integrity practice, detailed in `docs/SAVE_SCHEMA.md` §8).
- **A13 (§22):** The verbatim brief is archived as `docs/GAME_BRIEF.md` and is the requirements source of truth; these planning docs cite it by §.
- **A14 (§16.1):** Ticket/Lucky-Ticket drop rates and the "very hard quest" award cadence are balance-config values; first pass documented in `docs/BALANCE.md` §8, tuned during the balance milestone.
- **A15 (§2.3):** "Data-driven" means: all content (classes, enemies, floors, items, affixes, quests, tutorial steps, merchants) and all balance curves live in typed config/data modules with schema validation — game logic never hardcodes content. Enforced by the content pipeline (`docs/CONTENT_PIPELINE.md`).

---

*When every question above has an answer, I will fold the answers back into the design docs, mark this file resolved (each question gets its decision recorded), and then — per Brief §22 Phase 3 — ask you explicitly whether to start development.*
