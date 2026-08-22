# OneMoreFloor — Screen Inventory × FantasyUI Map (EA 0.1)

> Status: **planning**. Every component named below was verified against the FantasyUIs repo (223 components; local clone). Themes: `SV` = `stone-vine` (hub contexts), `DE` = `dark-ember` (tower/combat/death) — per USER_QUESTIONS A8. Layout targets per §20.6; visual target per `assets/examples/` (§20.3): persistent left sidebar + large main panel, S&F density and framing. FantasyUI's rarity type (`common…mythic`) matches §9.2's six tiers 1:1, and its stat-bar kinds already include `health/mana/rage/xp`.

## 1. Global shell (every screen) — SV

| UI element (reference: `general_game_layout.png`) | FantasyUI |
|---|---|
| App frame / screen switching | `SceneBackdrop`, `SceneTransition`, our router |
| Left sidebar: hero portrait + level bar | `Portrait`, `StatBar (xp)` |
| Currency row (Gold, materials, Tickets) | `CurrencyBar` |
| Nav sections with icon entries, lock states, notification dots | `SideNav`, `MenuButton` (emits lock reason — §20.5 "answers what can I do"), `Badge` |
| Event/countdown strip (quest resets, restock timers) | `Banner`, `CountdownTimer` |
| Global feedback: toasts, reward claims, level-ups | `ToastStack`, `RewardPopup`, `LevelUpModal`, `AchievementPopup` (quest completion) |
| Every hover explanation in the game | `Tooltip` — **the only tooltip in the project; native `title` is banned repo-wide (§20.4, lint-enforced)** |
| Modals/confirms (reset wipe, spend confirms) | `Modal`, `ConfirmSlider` (typed/slide confirm for the §19 reset) |

**Red-dot doctrine (§20.5):** one `feedback/badges` service computes claimable/affordable/new states from the store; every nav entry and tab renders its `Badge` from that single source. A red dot is *always* backed by an action the player can take right now — never decorative.

## 2. Tower screen ("Lootspire") — DE

| Element | FantasyUI |
|---|---|
| Vertical floor path: cleared / current / upcoming, boss floors every 10th flagged (§3.1) | `StageTrail` (full-screen scrolling path w/ milestone markers) — the closest existing metaphor to a tower; oriented/beskinned upward within its design language |
| Current-floor enemy preview (name, avatar, stat hints, floor modifiers w/ tooltips) | `ItemCard`-style panel from `Panel` + `Portrait` + `StatChip` + `BuffBar` |
| "One more floor" fight button | `Button` (hero-sized), `CostButton` unneeded (fights are free) |
| Quick-Raid: per-floor skip + "raid to Floor N" (⧗Q8) | `SplitButton` (fight / skip-to), aggregate results in `LootWindow` |
| Highest-ever marker, run info | `Ribbon`, `StatChip` |
| Death aftermath | `DeathScreen` (kept-vs-lost summary + Quick-Raid call-to-action, COMBAT.md §8) |

## 3. Combat screen — DE (full spec: COMBAT.md §7)

| Element | FantasyUI |
|---|---|
| Hero/enemy cards: portrait, name+level, HP, resource, effect chips | `UnitFrame` + `Portrait` + `StatBar (health / mana / rage)` + `BuffBar` |
| Boss HP treatment on boss floors | `BossHealthBar` |
| Floating damage/crit/dodge numbers | `FloatingText` |
| Crit/kill punch, heavy-hit feedback | `ImpactFrame`, `DamageVignette` |
| Fight log (collapsible, for the "why did I lose" read) | `BattleLog` |
| Skip control + speed indicator (§3.4/§3.5) | `Button`, `StatChip` |
| Victory/defeat + loot reveal | `ResultScreen`, `LootWindow` |
| Choreography (lunges, clashes, signature set-pieces) | our `custom/CombatStage` (see §10) orchestrating the above via WAAPI |

## 4. Character screen — SV (reference: `character_screen.png`)

| Element | FantasyUI |
|---|---|
| Paperdoll: 9 base slots + ascension slots (locked slots visible with unlock tooltips, §7/§9.1) | `Paperdoll`, `Slot` (+`Badge` for upgradeable-piece dots) |
| Portrait, name, class, ascension stars (§7) | `Portrait`, `OrnateHeader`, `StarRating` |
| Level + XP bar, Power Level display (§13) | `StatBar (xp)`, `PowerRating` |
| Stat rows with derived values + gold-upgrade buttons (§6; reference shows +buttons) | `StatsPanel` / `StatBlock` rows + `CostButton` (self-disables when short — exactly §20.5) |
| Active potion buffs with timers (§12) | `BuffBar` + `CountdownTimer` |
| Inventory grid (capacity ⧗Q16) | `InventoryGrid` (real drag-and-drop onto Paperdoll) |
| Item inspect/compare on hover (slot vs candidate) | `Tooltip` + `CompareStats` + `ItemCard` |
| Gear detail: level 0–15 track, ascension stars, affixes (§10) | `UpgradePanel` (levels) + `RankUpPanel` (gear ascension w/ material `Slot`s) + `StarRating` |
| Hero ascension moment (§7) | `RankUpPanel` + celebratory `SceneTransition` |
| Reset character (§19) | `Modal` + `ConfirmSlider` |

## 5. Merchants — SV (references: both merchant screens; three-column: sidebar / character panel / shop)

| Element | FantasyUI |
|---|---|
| Shop stock grid w/ prices, rarity frames, sold-out states (§11/§12) | `ShopPanel` + `ItemCard` in `TintFrame` (rarity tint) + `CostButton` |
| Restock timer + paid reroll (⧗Q17) | `CountdownTimer` + `CostButton` |
| Potion stock w/ stat + duration tooltips (§12) | same grid; `Icon` potion art |
| Sell/dispose flow (⧗Q16) | `InventoryGrid` + confirm `Modal` |
| Merchant NPC presence (reference shows illustrated scenes) | `SceneBackdrop` + supplied art (⧗Q11.3) |

## 6. Gacha — DE for the reveal, SV for the banner lobby (§16)

| Element | FantasyUI |
|---|---|
| Banner lobby: two banners, ticket balances, odds disclosure (`RateTable` prints honest totals) | `BannerCarousel`, `CurrencyBar`, `RateTable` |
| Pull button (refuses when ticketless, says why) | `CostButton` |
| **The reveal set-piece (§16.3 headline feature)** | our `custom/GachaRevealDirector` composing `SummonScreen`, `SummonResult`, `RuneCircle`, `Pedestal`, `SceneTransition`, `ImpactFrame`, `FloatingText` — multi-stage anticipation: build → tease/fake-out beats → rarity-escalating light/particle language → reveal on pedestal. Dedicated roadmap milestone (M7); treated as a set-piece, not a transition (§16.3). |

## 7. Quests — SV (§17)

`QuestBoard` (active dailies/weeklies, claim states, full-board labeling), `QuestTracker` (shell-level pinned objectives), `ProgressRing`/`StatBar` per objective, `RewardPopup` on claim, `CountdownTimer` to reset (⧗Q10/Q21).

## 8. Meta screens

| Screen | FantasyUI |
|---|---|
| Title / first load | `TitleGate`, `LoadingScreen` |
| Character select (5 slots, occupied/empty/locked w/ unlock prices §15.2/⧗Q2) | `CharacterSelect` + `Portrait` + `StarRating` + `CostButton` |
| Hero creation (name + class pick + class preview, §5) | `CharacterCreator` + `TextInput` + class `ChampionCard`-style preview panels (⧗Q25 rules) |
| Account upgrades (Battle Speed tiers, slots — §15) | `UpgradePanel` + `CostButton` + `TierBadge` |
| Tutorial (§18) | `TutorialMask` + `TutorialTip` sequence; completion via `RewardPopup` (Lucky Ticket moment) |
| Settings (minimal: no audio §2.2) | `SettingsScreen` (pruned) |
| Fatal-error / save-recovery panel (SAVE_SCHEMA §6) | `EmptyState` + `Panel`, in-language (never a browser alert) |

## 9. Item rendering standard (game-wide)

Every item everywhere = `TintFrame` (rarity tint per FantasyUI's six-tier rarity) + item icon (⧗Q27 source) + `Badge` (gear level) + `StarRating` (gear ascension) + `Tooltip` (full stat block, affix list, compare). One `custom/ItemView` wrapper standardizes this so an item looks identical in inventory, paperdoll, shop, loot, and gacha contexts.

## 10. Custom components (§20.2 — "only when a feature genuinely requires it")

Planned custom inventory — each built strictly from FantasyUI tokens/semantic slots, no stylistic outliers:

1. `CombatStage` — combat choreography director (composition + WAAPI timelines; no new visual language, only arrangement/motion of FantasyUI parts).
2. `GachaRevealDirector` — the §16.3 set-piece sequencer (same nature: direction, not new chrome).
3. `TowerTrail` — *only if* `StageTrail`'s options can't be configured into a convincing upward tower; first attempt is configuration/skin, not a new component.
4. `ItemView` — the §9 standardization wrapper.

Anything beyond this list needs a written justification in this file before it's built (§20.2 discipline).

## 11. Resolution & scaling strategy (§20.6)

Fluid layout 1440×900 → 2560×1440, art-directed at 1920×1080; FantasyUI's global `--fui-ui-scale` custom property is the density dial (slightly higher at 2K so the game keeps its chunky handcrafted feel on big glass); sidebar fixed-width, main panel fluid with max-width clamp; below ~1280px width: styled "enlarge your window" gate (mobile out of scope, §2.2/§20.6 — but no architectural corner painted: layouts are flex/grid, no absolute-positioned pixel maps outside the combat stage's internal choreography space).
