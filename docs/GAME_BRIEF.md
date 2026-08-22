# OneMoreFloor — Game Instructions (v2)

## 0. Your Role & Working Agreement

You are my **senior full-stack web developer, senior game designer, technical architect and game UI/UX designer**.

Rules for the entire project:

1. Think and act like an experienced engineer on a **long-term commercial game**, not like someone hacking together a prototype. Every decision should be defensible in six months.
2. **Do not write a single line of game code until I explicitly approve the planning phase.** (See §22.)
3. If a requirement in this document is ambiguous, contradictory or missing, **do not invent an answer silently**. Write it into `USER_QUESTIONS.md` and ask me.
4. Do not add features that are not described in this document. If you believe something is missing, propose it as a question — do not implement it.
5. Prefer boring, maintainable architecture over clever architecture. This project will grow for months.

---

## 1. Project Summary

**OneMoreFloor** is a **single-player Fantasy-RPG Roguelike Tower-Climber** for the browser.

It is a fusion of:
- **Shakes and Fidget** — the core loop, the progression systems, and above all the *look and feel*.
- **Roguelike Tower-Climber** — an endless tower that resets on death.

There is **no multiplayer, no PvP, no social features, ever**. This is a deliberate design decision, not a scope cut.

**The core loop:**
1. Create a hero, pick a class.
2. Climb the tower ("Lootspire") floor by floor.
3. Earn currency, materials, equipment, relics, artifacts, tomes, XP.
4. Spend those on gear, gear upgrades, stat upgrades, merchants, gacha.
5. Die → tower resets to Floor 1 → re-climb faster with your stronger hero (skipping already-cleared floors).
6. Repeat, going deeper each run.

**The emotional target:** the player should always have something to claim, upgrade, or push for. Red dots and badge numbers everywhere. Every session should produce visible progress. The player should close the game thinking "one more floor".

---

## 2. Scope of Early Access 0.1

### 2.1 In scope (must be 100% finished and playable)

Everything described in §3–§21 of this document.

**"Finished" explicitly means:** no skeletons, no placeholders, no "MVP versions", no `// TODO: balance later`, no stub screens. Every listed feature must be fully implemented, balanced, animated and reachable through normal gameplay. A player must be able to play EA 0.1 for many hours without hitting a dead end or an unimplemented button.

### 2.2 Out of scope for 0.1 (do not build, do not architect around)

- **No sound / no music / no audio system at all.**
- No multiplayer, guilds, leaderboards, friends, chat.
- No backend, no server, no database, no user accounts, no login.
- No monetization, no real-money purchases, no ads.
- No mobile-specific UI (see §20).
- No Electron packaging yet (see §21).
- No account upgrades other than the two named in §15.
- No classes other than the five named in §8.

### 2.3 Forward compatibility

Two things must be *architecturally anticipated* even though they are not built in 0.1:
- **Electron wrapping** for a later Steam release — do not use anything that would break in a packaged desktop app.
- **More content later** — classes, enemies, floors, account upgrades, equipment types must be **data-driven** (config/JSON-style definitions), not hardcoded, so content can be added without touching game logic.

---

## 3. The Tower ("Lootspire")

The tower is the core gameplay. Everything else exists to serve it.

### 3.1 Structure

- The tower is **endless**. There is no final floor.
- Floors are climbed sequentially: 1, 2, 3, …
- **Every 10th floor (10, 20, 30, 40, 50, …) is a Boss Floor.**

### 3.2 Boss Floors

- Higher difficulty than the surrounding normal floors.
- Extra rewards.
- Boss floors apply **debuffs to the player** and **buffs to the enemy**.
- Normal floors may also contain enemies that apply debuffs to the player, but these are **noticeably weaker** than boss debuffs.

### 3.3 Death & Reset

- When the hero dies on a floor, **the tower resets to Floor 1**.
- **What is lost:** tower run progress only.
- **What is kept:** hero level, XP, ascension, all currencies, all materials, all equipment, all upgrades, quest progress, account upgrades. Nothing the player owns is ever destroyed by death.

### 3.4 Quick-Raid

- Any floor the player has **cleared at least once** can be skipped instantly via a **Skip button** — the fight starts and the player skips the animation, receiving the result immediately.
- Floors the player has **never cleared** must be fought normally and cannot be skipped.
- The "highest floor ever cleared" is a persistent per-character record and is **not** reset by death.

### 3.5 Battle Speed

- Default fight speed is **x1**.
- The "Battle Speed" account upgrade (§15) raises this up to **x8**.
- Battle speed affects the *animation* speed of a fight, not its outcome.

### 3.6 Rewards

Clearing a floor rewards a mix of: currency, crafting/upgrade materials, equipment (weapons and armor), relics, artifacts, skill/ability tomes, and experience. Boss floors reward more.

Drop quality and quantity scale with **Power Level** (§13) — see that section for the anti-overshoot rule.

### 3.7 Scaling

Enemy stats, enemy variety and rewards must scale smoothly and endlessly with floor number. Use an explicit, tunable, documented curve (a single balance config file), **not** magic numbers scattered through the combat code. The curve must remain meaningful at floor 10, floor 500 and floor 5000.

---

## 4. Combat

### 4.1 Presentation

- Reference: `assets/examples/combat_example.gif`. Match this as closely as possible.
- **Player avatar on the left, enemy avatar on the right.**
- Combat must be **richly animated**: weapons visibly clashing, avatars dodging, moving, reacting to hits, damage numbers, crits, debuff/buff indicators.
- This is the screen the player will look at more than any other. It must feel good at x1 **and** at x8.

### 4.2 Resolution

- Combat is **automatic** — the player does not input actions during a fight.
- Combat resolution is driven by the hero's and enemy's stats (§9).
- **Speed** grants a chance to attack twice before the enemy acts.
- **Luck** determines crit rate.
- Buffs and debuffs from boss/enemy floors modify this.

### 4.3 Enemy Avatars

For any enemy that does not yet have a dedicated avatar, use FantasyUI's **`silhouette-warrior-m`**. I will supply real avatars for every coded enemy later. Structure the enemy data so swapping an avatar is a one-line data change.

---

## 5. Hero Creation

- The player names their hero — **this replaces account creation entirely**. No email, no password, no login.
- The player picks one of the five classes (§8).
- The hero starts with **only their class weapon(s) equipped**. Every other equipment slot starts empty and must be farmed, bought, or gambled for.

---

## 6. Stats

The hero has the following stats:

| Stat | Effect | Gained by |
|---|---|---|
| Strength | Increases damage | Level-up, gear, gold upgrades |
| Defense | Increases defense | Level-up, gear, gold upgrades |
| HP | Increases max health | Level-up, gear, gold upgrades |
| Class Resource | Increases the class resource pool (Rage / Mana / Focus, see §8) | Level-up, gear, gold upgrades |
| Luck | Increases crit rate | Level-up, gear, gold upgrades |
| **Speed** | Chance to attack twice before the enemy attacks | **Gear only** |

**Important:** Speed is the exception. It is **never** granted by level-ups and **can never be upgraded with currency**. It comes exclusively from equipment.

All other stats can additionally be upgraded directly using the game's main currency (§14).

---

## 7. Ascension (Hero)

Ascension raises the hero's level cap and unlocks new equipment slots.

| Ascension | Level Cap | Unlocks Slot |
|---|---|---|
| 0 (default) | 100 | — |
| 1 | 250 | Ring |
| 2 | 500 | Necklace |
| 3 | 750 | Amulet |
| 4 | 1000 | Relic |
| 5 (max) | **Endless** | Artifact |

- Ascension becomes available when the hero reaches the current level cap.
- Ascension level is displayed as **stars** on the character: Ascension 0 = 0 stars, Ascension 5 = 5 stars.

---

## 8. Classes

Five classes for Early Access 0.1: **Warrior, Mage, Hunter, Bard, Swashbuckler.**

Each class must have genuine **upsides and downsides** and its own **special system or mechanic** — the way classes differ in Shakes and Fidget. Classes must not be reskins of each other.

### 8.1 Weapons & Resources

| Class | Weapon Configuration | Class Resource |
|---|---|---|
| Warrior | 2-Handed weapon **OR** 1-Handed + Shield (never dual 1-Handed) | Rage |
| Mage | 2-Handed Staff | Mana |
| Hunter | 2-Handed Bow | Mana |
| Bard | 2-Handed Musical Instrument | Mana |
| Swashbuckler | 2x 1-Handed weapons (sword, dagger, mace, axe, etc.) | Focus |

### 8.2 Equipment restrictions

- **All armor and accessories can be worn by all classes.**
- **Weapons are class-exclusive.** A weapon that drops for one class cannot be equipped by another.

---

## 9. Equipment

### 9.1 Slots

**Available from Level 1, Ascension 0:**
Helmet, Chest, Leggings, Boots, Gauntlets, Cape, Wrists, Mainhand, Offhand

**Unlocked through Ascension (see §7):**
Ring, Necklace, Amulet, Relic, Artifact — 1 slot each.

### 9.2 Rarities

`Common → Uncommon → Rare → Epic → Legendary → Mythical`

- Early game: the player realistically caps out at **Epic**.
- **Legendary** becomes obtainable later.
- **Mythical must be insanely rare.** A Mythical drop should be a memorable event, not a milestone the player expects to hit on a schedule.

---

## 10. Gear Upgrading

Two independent upgrade tracks per gear piece.

### 10.1 Gear Level (0 → 15)

- Every gear piece starts at **Level 0** and caps at **Level 15**.
- Each level slightly increases that piece's stats.
- **Levels 1–10: progressively more expensive but cheap.** The player should upgrade freely here.
- **Levels 11–15: progressively much more expensive** — but **never unbearable**. This is a "worth pushing" wall, not a paywall-feeling grind.

### 10.2 Gear Ascension (0 → 5 stars)

- Gear ascends just like the hero, up to **5 stars**.
- Ascension **does not** raise the level cap of 15.
- Each gear ascension adds **bonus stats** to that piece, and increases its stats by more than a normal level-up does.
- Ascending gear requires **multiple different materials found in the tower.**

**Stat slots per gear ascension:**

| Gear Ascension | Stat Slots |
|---|---|
| 0 | 1 or 2 (2 is the maximum) |
| 1 | 2 (guaranteed) |
| 2 | *(see open question Q3)* |
| 3 | 3 |
| 4 | 4 |
| 5 | 5 |

Possible gear stats: `+ATK`, `+DEF`, `+SPEED`, `+HP`, `+RESOURCE`, `+LUCK`, etc.

---

## 11. Equipment Merchant

Sells weapons and armor. Stock scales with the player's tower progress and character progress (see §13).

---

## 12. Magic Merchant

Sells:
- **Potions** — each potion boosts exactly **one specific stat** for **one hour**.
- **Rings, Necklaces, Amulets, Relics, Artifacts.**

Stock also scales with tower/character progress.

---

## 13. Power Level

A single calculated number representing the character's total strength. It takes into account:
- Currently equipped gear (including gear level and gear ascension)
- Hero ascension level
- Tower progress
- Base and upgraded stats

**Power Level is the central gating mechanism** for:
- Gear drops from the tower
- Equipment Merchant stock
- Magic Merchant stock
- Gacha rewards

**The anti-overshoot rule:** A player at Ascension 0, Level 12, Floor 21 must **never** obtain a `+1000 Strength` chestplate — from any source, including gacha and Mythical drops. Rarity determines *how good a piece is relative to the player's current bracket*; Power Level determines *the bracket itself*. Design and document this explicitly.

---

## 14. Economy & Currencies

- The game's **primary currency is Gold**. It is earned in the tower and is needed for essentially everything: stat upgrades, gear levels, merchants.
- Gold must feel like the resource the player is always slightly short of.
- **Materials** are earned in the tower and are required for gear ascension.
- **Tickets / Lucky Tickets** are the gacha currency (§15... see §16).

> ⚠️ The original brief mentioned both "Silver" (as a floor reward) and "Gold" (as the main currency). See open question **Q1** — do not implement two currencies until this is resolved.

---

## 15. Account Upgrades

**Exactly two account upgrades exist in EA 0.1. Do not add more.**

### 15.1 Battle Speed
- Raises fight animation speed from **x1 up to x8**.
- Must be **insanely expensive** and slow to obtain. This is a long-term goal, not an early quality-of-life purchase.

### 15.2 Account Slot
- Unlocks additional character slots, up to **5 total**.
- The **first extra slot (slot 2) is cheap.**
- Every further slot is **expensive.**

---

## 16. Gacha System

### 16.1 Currency
- **Tickets** — the Legendary-tier gacha currency.
- **Lucky Tickets** — the Mythical-tier gacha currency.
- Both are rare drops. Also awarded by very hard quests (§17) and the tutorial (§18).

### 16.2 Rules
- Tickets are spent to gamble for gear.
- The chance of actually receiving Legendary / Mythical gear must be **extremely low**.
- All gacha rewards are **bracketed by Power Level** (§13). No overshooting.

### 16.3 The Animation — this is a headline feature

The gacha animation is not decoration; it is one of the reasons the player keeps playing.

It must:
- Build **anticipation** before revealing anything.
- **Tease** the player — fake-outs, rising tension, escalating light/colour/particle language per rarity tier.
- Feel like a **real event**, not a UI transition.
- Be good enough that receiving a Ticket triggers the reaction: *"Hell yeah, finally I can pull again!"*

Budget real development time for this. Treat it as a set-piece.

---

## 17. Daily & Weekly Quests

- Both daily and weekly quests exist.
- Rewards: materials, resources of all kinds, experience, gold — and for **very hard quests**, occasionally Tickets or Lucky Tickets.
- **Balance target:** dailies must be completable within one day of normal play; weeklies within one week. But they must **not** be trivially easy. Completing them should feel earned, and the rewards should be genuinely good.

---

## 18. Tutorial / Onboarding

- Shown on first play.
- Teaches the **core game loop** clearly and simply.
- **Skippable**, but the UI should gently discourage skipping.
- **Completion reward:** 1 Lucky Ticket + starting Gold.

---

## 19. Character Slots, Save States & Reset

- A player can own up to **5 character slots** (via the Account Slot upgrade, §15).
- Each slot is an independent **save state** with its own class, hero, gear, level and progress.
- The player can switch between their existing characters.
- A player can **reset** to start a new class. A reset **wipes everything** for that character: progress, gear, items, currencies — everything. There is no partial reset, no keepsakes, no "new game plus".

> ⚠️ Two things must be clarified before implementation — see open questions **Q2** and **Q4**: how many characters can be *active* at once, and whether Account Upgrades / reset apply per-character or account-wide.

---

## 20. UI / UX

### 20.1 The principle

**The game must feel like a GAME, not like a web app.** No default web components, no default browser chrome, no "admin dashboard" energy. Every panel, button, frame, tooltip and transition should look hand-crafted for a fantasy RPG.

### 20.2 FantasyUI

- The UI is built on **FantasyUI**, my own component library:
  - Demo: https://fantasy-uis.vercel.app
  - Source: https://github.com/justmarvinai/FantasyUIs
- **Primarily use and adapt the pre-made example components.**
- You may create your own components **only when a feature genuinely requires it**, and they must be **fully built on FantasyUI's design language** — same visual grammar, same tokens, same feel. No stylistic outliers.

### 20.3 Visual reference

Study the screenshots in `assets/examples/` **closely**. That is the target look: Shakes and Fidget's layout, density, framing and personality — rendered with our own components and assets.

### 20.4 Tooltips

**Every tooltip in the game must be fully custom-styled.** Native browser `title` tooltips are forbidden anywhere in the project.

### 20.5 Feedback & retention design

- Red dots and badge numbers everywhere something is claimable.
- Every decision the player makes should produce a visible sense of progress.
- The UI should always answer the question "what can I do right now?" without the player having to look for it.

### 20.6 Target displays

**Desktop-first.** Primary targets: **2K (2560×1440)** and **1080p (1920×1080)**. Must also work well on laptop displays such as MacBook Air / Pro. Mobile layouts are out of scope for 0.1, but do not paint us into a corner.

---

## 21. Technical Infrastructure

- **You choose the tech stack** and justify it in writing. Optimize for: long-term maintainability, rich animation, and a later Electron/Steam release.
- **Hosting:** Vercel.
- **No backend. No server logic. No database.**
- **All player data is stored in IndexedDB** on the client.
- **No accounts.** Naming the hero *is* the account.
- Because all state is local, you must handle: save schema versioning + migrations, corrupted/partial save recovery, and (later) export/import of saves. Design the save layer for this from day one.
- **Later — not now:** the game will be wrapped in **Electron** for a Windows/Steam release. Keep this in mind architecturally; do not build it yet.
- **No audio of any kind in EA 0.1.**

---

## 22. Development Process & Deliverables

### Phase 1 — Planning (current phase)

Produce a complete planning package before writing any game code:

- `ROADMAP.md` — milestones and ordered work breakdown to a shippable EA 0.1
- `CLAUDE.md` — working instructions, conventions, architecture rules for this repo
- `AGENTS.md` — agent/task structure
- `CHANGELOG.md` — initialized, maintained from the first commit onward
- `USER_QUESTIONS.md` — **every** open question you have, including the ones in §23
- Plus whatever else you judge necessary: architecture doc, data model / save schema, balance & formula design doc, combat spec, UI component inventory mapped against FantasyUI, content pipeline for enemies/items.

### Phase 2 — Questions

Present `USER_QUESTIONS.md`. **I answer everything before development starts.**

### Phase 3 — Approval

**Then ask me whether to start development.** Do not start until I say so.

### Ongoing

- Keep `CHANGELOG.md` current.
- Keep balance values in dedicated config files, not scattered in logic.
- Keep content (enemies, items, floors, classes, quests) data-driven.

---

## 23. Known Contradictions in This Brief — Resolve Before Coding

I already know these are unclear. Put them in `USER_QUESTIONS.md` along with your own questions, and **do not guess**:

- **Q1 — Silver vs Gold.** Floor rewards were described as including "Silver", but Gold is described as the main currency for everything. Is there one currency or two? If two, what is each used for?
- **Q2 — Active characters.** Is only one character playable at a time (switching between save states), or can multiple be played in parallel? What exactly does "switching" look like in the UI?
- **Q3 — Gear Ascension 2.** The stat-slot table skips from Ascension 1 (2 stats) to Ascension 3 (3 stats). What does Ascension 2 grant?
- **Q4 — Scope of a reset.** Does "reset" wipe a single character slot, or the entire account including all slots? Do Account Upgrades (Battle Speed, Account Slots) survive a reset? Are they account-wide or per-character?
- **Q5 — Necklace vs Amulet.** These are separate slots unlocked at different ascensions. How do they differ mechanically/thematically?
- **Q6 — Class Resource.** Rage / Mana / Focus are defined as stats, but their role in the automatic combat system is never specified. What do they actually *do* during a fight?
- **Q7 — Skill/Ability Tomes.** These are listed as a tower reward, but no ability or skill system is described. Is there one in EA 0.1? If yes, it needs a full spec. If no, tomes should be removed from the reward table.
- **Q8 — Quick-Raid rewards.** Does skipping a fight give the same rewards as watching it? Is Quick-Raid instant, or does it still take time per floor? Can the player chain-skip all cleared floors in one action?
- **Q9 — Potion timers.** Do the one-hour potion buffs run on real time (ticking while the game is closed) or only while playing?
- **Q10 — Quest resets.** When exactly do dailies and weeklies reset — local midnight, a fixed UTC time, or relative to first play? Note there is no server, so this must be tamper-tolerant by design.
- **Q11 — Assets.** Confirm `assets/examples/` (screenshots + `combat_example.gif`) will be present in the repo, and confirm what art assets exist versus what must be placeholder.
- **Q12 — Number of enemies/floors of hand-authored content** expected for EA 0.1 before procedural scaling takes over.
