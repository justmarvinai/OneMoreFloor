# OneMoreFloor — Screen Inventory × FantasyUI Map (EA 0.1)

> Status: **as built, EA 0.1 (M1–M7).** Every component named below is vendored and on screen; the custom-component allowlist in §10 is closed at four. Themes: `SV` = `stone-vine` (hub contexts), `DE` = `dark-ember` (tower/combat/death) — per USER_QUESTIONS A8. Layout targets per §20.6; visual target per `assets/examples/` (§20.3): persistent left sidebar + large main panel, S&F density and framing. FantasyUI's rarity type (`common…mythic`) matches §9.2's six tiers 1:1, and its stat-bar kinds already include `health/mana/rage/xp`.

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

**As built (fourth polish round) — what the rail carries.** The rail is the only thing on screen at all times, which makes it the right home for the handful of numbers a player checks between every action and the wrong home for anything they would look up once. It carried a portrait, an unlabelled bar, one gold figure, the nav, and a hand's width of nothing above the footer entry. Now, top to bottom: the hero (portrait, name, class, ascension stars once there are any); **level and XP as numbers** above the bar rather than a coloured fill with nothing on it; **PWR** and **BAG** chips, because Power Level silently sets the bracket every drop, shelf and rite draws from (§13) and a full backpack changes what happens to a drop (Q16) — both were a screen away; the wallet, showing Tickets and Lucky Tickets once held, since gold used to be the only balance visible outside the summoning lobby; a **climb** plate with the run a death resets and the record it never touches (§3.4); and any **draughts still running**, because they expire in wall-clock time whether the player is looking or not (§12). Every block wears `SideNav`'s own plate treatment, which is what turns five stacked things into one frame, and the nav's rows share out whatever height is left — capped against the viewport, so a 2K rail spends its extra half-screen on the rows rather than on a hole. A window too short for all of it scrolls the rail; nothing is dropped to fit, and nothing grows through the button below it (smoke asserts the pointer lands on Switch Hero at 1280×720, 1080p and 2K).

**Red-dot doctrine (§20.5):** one `feedback/badges` service computes claimable/affordable/new states from the store; every nav entry and tab renders its `Badge` from that single source. A red dot is *always* backed by an action the player can take right now — never decorative.

## 2. Tower screen ("Lootspire") — DE

| Element | FantasyUI |
|---|---|
| Vertical floor path: cleared / current / upcoming, boss floors every 10th flagged (§3.1) | `StageTrail` (full-screen scrolling path w/ milestone markers) — the closest existing metaphor to a tower; oriented/beskinned upward within its design language |
| Current-floor enemy preview (name, avatar, stat hints, floor modifiers w/ tooltips) | `ItemCard`-style panel from `Panel` + `Portrait` + `StatChip` + `BuffBar` |
| "One more floor" fight button | `Button` (hero-sized), `CostButton` unneeded (fights are free) |
| Quick-Raid: per-floor skip + "raid to Floor N" chain (Q8 confirmed) | `SplitButton` (fight / skip-to), aggregate results in `LootWindow` |
| Highest-ever marker, run info | `Ribbon`, `StatChip` |
| Death aftermath | `DeathScreen` (kept-vs-lost summary + Quick-Raid call-to-action, COMBAT.md §8) |

**As built (M4):** the trail draws the climb **ahead of the hero only** — Q23 makes the tower strictly upward, so the floors behind are history rather than destinations, and every node on screen is actionable: the current floor fights, floors already conquered in an earlier run Quick-Raid to that exact depth, and new ground is not clickable because climbing is the only way to reach it. Bands paint their own stretch of wall from a `backdrop` art id (Q11), which is also what the combat scene uses, so a band reads as one place across both screens. `StageTrail`'s star meter is suppressed (§10, wish 6) and its `energy` and `chest` features go unused: the tower has neither.

**As built (fifth polish round) — the floor preview answers the question.** The panel showed the enemy's five stats as chips and stopped, which is half an answer: a number means nothing without the number it is measured against. It now leads with the matchup (both portraits, both names), fills its middle with a stat-by-stat comparison — a tug-of-war bar per stat, normalised against its own pair so health reads as clearly as speed — then says what clearing the floor pays (`floorRewardEstimate`: the reward curves with the dice left out, so the preview cannot drift from what the floor hands over), then what it imposes, each effect **named** beside its chip rather than left as a bare icon. The trail keeps its identity — stone wall, winding path, numbered discs — and gains the two things it could not say for itself: the hero's own face on the disc they are standing on, and a gold ring on boss floors so a boss is visible from the bottom of the screen rather than only once you are under it. Band captions state a range ("Floors 1–14") instead of the band's first floor, which read as a floor number.

**As built (fifth polish round) — the climb keeps a record of itself.** Three marks join the trail, all found by walking the rendered nodes because `StageTrail` has no per-node hook: milestone floors (every 25th) carry a chest mark that dims once claimed, the highest floor ever cleared carries the **ghost of your best climb**, and the trail now climbs *to* that record when it is within reach (`GHOST_REACH`) rather than stopping at the fixed look-ahead — a record you cannot see on the path is a number in a chip, not a place. Under the fight button sits the auto-climb picker: three segments, off / watching / background, with the level-gated one shown **disabled and explaining itself** rather than hidden (§20.5). The panel footer is laid out as a column here, because `Panel`'s own footer is a right-aligned row and put the two controls shoulder to shoulder.

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

**As built (M4):** the fight is full-bleed, with both portrait cards pinned high and wide apart over the band's arena — the arrangement in `combat_example.gif` (§20.3) — and a stat block under each card, because a player who loses has to be able to see *why* from the cards alone (COMBAT.md §9). `UnitFrame` is turned upright and its target-side mirroring undone by layout alone; no vendored rule is restyled. The fight log is a drawer rather than a column, which is what "collapsible" in COMBAT.md §7 buys: the arena keeps the whole screen and the log is one click away. A level-up plays as its own beat *before* the result rather than over it — a celebration layered on the result screen swallows the click the player already aimed at "One More Floor".

## 4. Character screen — SV (reference: `character_screen.png`)

| Element | FantasyUI |
|---|---|
| Paperdoll: 9 base slots + ascension slots (locked slots visible with unlock tooltips, §7/§9.1) | `Paperdoll`, `Slot` (+`Badge` for upgradeable-piece dots) |
| Portrait, name, class, ascension stars (§7) | `Portrait`, `OrnateHeader`, `StarRating` |
| Level + XP bar, Power Level display (§13) | `StatBar (xp)`, `PowerRating` |
| Stat rows with derived values + gold-upgrade buttons (§6; reference shows +buttons) | `StatsPanel` / `StatBlock` rows + `CostButton` (self-disables when short — exactly §20.5) |
| Active potion buffs with timers (§12) | `BuffBar` + `CountdownTimer` |
| Inventory grid (Q16: finite S&F-style backpack; full-drop resolution dialog) | `InventoryGrid` (real drag-and-drop onto Paperdoll) |
| Item inspect/compare on hover (slot vs candidate) | `Tooltip` + `CompareStats` + `ItemCard` |
| Gear detail: level 0–15 track, ascension stars, affixes (§10) | `UpgradePanel` (levels) + `RankUpPanel` (gear ascension w/ material `Slot`s) + `StarRating` |
| Hero ascension moment (§7) | `RankUpPanel` + celebratory `SceneTransition` |
| Reset character (§19) | `Modal` + `ConfirmSlider` |

**As built (M5, relaid out in the first polish round):** the layout follows `character_screen.png`, and follows it in the way that matters most — the hero is **one framed window**, not four floating blocks. Inside it: armour down one side of the portrait, cape and ascension trinkets down the other, the weapon row beneath, then the hero's own strip (Power Level, ascension stars, level and XP, Ascend), then the stat rows. The backpack is the second window, down the right. The first pass had the paperdoll and the stat block unframed while everything around them was framed, and the hero's card in a separate arched panel that was squeezed until its XP bar sat on the frame's bottom ornament and its Ascend button was pushed out of view entirely — a block inside a scrolling flex column cannot be allowed to shrink below its content. Every stat row states *what the number does* ("31% of damage turned away"), computed from the same config the fight reads, so the screen cannot quietly disagree with combat. Speed appears in the list with the others and says plainly that gear is its only source, rather than being omitted and leaving the player to wonder (§6). Gear detail is a dialog rather than an inline panel: two `UpgradePanel`s behind `Tabs`, one per upgrade track, because gold and materials are different resources and one merged button would hide which is short.

## 5. Merchants — SV (references: both merchant screens; three-column: sidebar / character panel / shop)

| Element | FantasyUI |
|---|---|
| Shop stock grid w/ prices, rarity frames, sold-out states (§11/§12) | `ShopPanel` + `ItemCard` in `TintFrame` (rarity tint) + `CostButton` |
| Restock timer + paid reroll (Q17: ~6h auto-restock, milestone restock, PL-scaled Gold reroll) | `CountdownTimer` + `CostButton` |
| Potion stock w/ stat + duration tooltips (§12) | same grid; `Icon` potion art |
| Sell/dispose flow (Q16: sell for a fraction of value at any merchant) | `InventoryGrid` + confirm `Modal` |
| Merchant NPC presence (reference shows illustrated scenes) | `SceneBackdrop` + FantasyUI theme art only in 0.1 (Q11); owner backdrops may replace later by asset id |

**As built (M5, split in the second polish round):** both merchants are one screen
with different stock, because they *are* the same shop with different stock —
separate implementations would mean fixing every bug twice. They are two
**destinations** though, not one screen with a tab strip: Equipment and Alchemist
each have their own rail entry, their own restock clock and their own red dot. A
dot shared between two counters cannot say which one has something on it, and
sends the player to the wrong door half the time.

The free restock countdown sits beside the paid reroll, inside the shop's frame
under its header — never the paid option alone: a shop that hides the free path
is selling impatience dishonestly (Q17). Selling goes through the same gear
dialog the character screen uses, so a sale is always two deliberate clicks
rather than one misclick in a grid. Buying a draught drinks it (Q29, confirmed).


## 6. Gacha — DE for the reveal, SV for the banner lobby (§16)

| Element | FantasyUI |
|---|---|
| Banner lobby: two banners, ticket balances, odds disclosure (`RateTable` prints honest totals) | `BannerCarousel`, `CurrencyBar`, `RateTable` |
| Pull button (refuses when ticketless, says why) | `CostButton` |
| **The reveal set-piece (§16.3 headline feature)** | our `custom/GachaRevealDirector` composing `SummonScreen`, `SummonResult`, `RuneCircle`, `Pedestal`, `SceneTransition`, `ImpactFrame`, `FloatingText` — multi-stage anticipation: build → tease/fake-out beats → rarity-escalating light/particle language → reveal on pedestal. Dedicated roadmap milestone (M7); treated as a set-piece, not a transition (§16.3). |

**As built (M7):** the lobby is composed from `Panel` + `SceneBackdrop` + `StatChip` + `CostButton` + `RateTable` rather than from `BannerCarousel`/`SummonScreen`. Both of those are built for a unit-collection gacha with ten-pulls and a pity counter, and Q20 gives us neither — a ×10 button we cannot honour would be a shipped placeholder (§2.1), and a pity meter would be a lie. See upstream wishes 9–10. The disclosure is stated once under both tables instead of twice, and each card's key art carries the one number the player came to check: how many tickets they hold.

The rite is `src/ui/gacha/` — a **pure choreographer** (`riteChoreography.ts`) and a **dumb performer** (`revealDirector.ts`), the split that made combat's pacing testable in M4. The choreographer turns a resolved pull into ordered beats: wake → tease → *die back* → tease higher → die back → surge → break → reveal → settle, with the number of fall-backs and the height of the build driven by the pull's stored bluff rank. The whole chamber's light — the summoning circle, the glow spilling past it, the caption's size — is driven by one `--omf-rite-charge` custom property, so the extremes cannot end up disagreeing. The reveal re-tints everything to the *prize's* rarity rather than the banner's, and only Legendary and Mythical earn the second burst.

`SummonResult` was left on the shelf for the same reason as the others: it is a grid of face-down `ChampionCard`s with a "Reveal All" button, which is a ten-pull's component. One pull deserves a plinth, not a grid.

## 7. Quests — SV (§17)

`QuestBoard` (active dailies/weeklies, claim states, full-board labeling), `QuestTracker` (shell-level pinned objectives), `ProgressRing`/`StatBar` per objective, `RewardPopup` on claim, `CountdownTimer` to reset (Q10: local midnight / Monday 00:00; Q21: 3 dailies + 3 weeklies, one hard weekly, no rerolls).

**As built (M6):** two columns, each with its own reset countdown — "is it worth starting this now?" is the question a board exists to answer, so it is answered above the fold. Every card shows what it asks for, how far along it is, and exactly what it pays *before* the player commits. Composed from `Panel` + `StatBar` + `Badge` + `Button` + `CountdownTimer` rather than from `QuestBoard` itself: see §10's upstream wish 8.

## 8. Meta screens

| Screen | FantasyUI |
|---|---|
| Title / first load | `TitleGate`, `LoadingScreen` |
| Character select (5 slots, occupied/empty/locked w/ unlock prices §15.2; Q2: the one place characters are switched) | `CharacterSelect` + `Portrait` + `StarRating` + `CostButton` |
| Hero creation (name + class pick + class preview, §5) | `CharacterCreator` + `TextInput` + class `ChampionCard`-style preview panels (Q25: 3–16 chars, unique per account, no rename) |
| Account upgrades (Battle Speed tiers, slots — §15) | `UpgradePanel` + `CostButton` + `TierBadge` |
| Tutorial (§18) | `TutorialMask` + `TutorialTip` sequence; completion via `RewardPopup` (Lucky Ticket moment) |

**As built (third polish round) — the two screens a player judges the game by:**

- **Title.** The gate is handed real art rather than a wireframe silhouette, and the art is *framed* rather than pasted: the class bust is a painted square, so the stylesheet masks all four of its edges back into the dark and lights it from behind (wish 17). Under the tagline sit the five classes with their names and their hooks — a front door has to answer "what is this" before the button is pressed, and five faces answer it faster than a sentence does.
- **Character select.** Every slot state carries painted art: a hero's own portrait, a ghosted silhouette for an empty slot (the outline waiting to be filled), a sealed rune for a locked one and a fractured stone for a damaged one. The roster and its detail column are sized to their content and centred as a pair, so they stay one object from a laptop to 2K instead of drifting apart. Reset lives *in* the detail column under the hero it would erase — and is re-attached after every selection, because `CharacterSelect` rebuilds that column on each click. Two component bugs are worked around here and filed upstream: the name/hint collision (wish 15) and the role glyph painted as an image (wish 16).
- **Credits** are a `Panel` on the Account screen, fed from `src/content/credits/`. CC BY asks for attribution in front of the audience; a file in the source tree is not an audience. Sources are printed as text, never as links — an off-origin URL in the bundle would fail the §21 build assertion.

**As built (M6):** the upgrades screen is two cards and no registry — §15 says "exactly two account upgrades exist, do not add more", so the code shape says it too. `CostButton` carries the shortfall line, which is what turns "insanely expensive" (§15.1) into a goal rather than a wall. The tutorial runs *over* the tower rather than instead of it, spotlighting the real rail and the real floor preview through `TutorialMask`; the rail carries `data-nav-id` hooks so an anchor cannot drift when a nav entry is added. Skipping forfeits the reward, and the opening beat says so — §18's "gently discourage" is a sentence where the decision is made, not a nag afterwards.
| Records: run history and the bestiary (fifth polish round) | `OrnateHeader` + `Panel` + `StatChip` rows |
| Settings (minimal: no audio §2.2) | `SettingsScreen` (pruned) |
| Fatal-error / save-recovery panel (SAVE_SCHEMA §6) | `EmptyState` + `Panel`, in-language (never a browser alert) |

**As built (fifth polish round):** the upgrades screen is *three* cards — backpack size joined Battle Speed and slots when the owner asked for it, recorded as Q30 rather than folded in silently, and the card grid became `auto-fit` so a fourth would not need a layout change to be legible. A new **Records** destination in the rail holds what the game remembers about the player: the last twenty runs, newest first, each line saying the floor it ended on, what killed it, the gold it earned and the fights it took. It carries no badge — a record of what already happened is never a thing the player has to come and do.

## 9. Item rendering standard (game-wide)

Every item everywhere = `TintFrame` (rarity tint per FantasyUI's six-tier rarity) + item icon (Q27: curated FantasyUI icons in 0.1, id-bound for real art later — CONTENT_PIPELINE.md §2–3) + `Badge` (gear level) + `StarRating` (gear ascension) + `Tooltip` (full stat block, affix list, compare). One `custom/ItemView` wrapper standardizes this so an item looks identical in inventory, paperdoll, shop, loot, and gacha contexts.

**Dragging (third polish round).** A piece can be dragged out of the backpack onto the socket it belongs in, or onto a merchant's window to sell it. The browser's drag payload is a string and `Slot` puts only an index in it, so the real payload — uid and origin — lives in `src/ui/dragItem.ts` for the length of the gesture; the module also owns the drop-target classes, so every screen highlights and refuses the same way. Two rules follow from §20.5: a socket that will not take what is over it says so *before* the mouse comes up (`is-drop-refused`) and *why* after it (a toast), because a drop that silently does nothing is the worst possible answer; and a sale asks first, since a drag is a cheap gesture to make by accident and a sale cannot be undone. Toasts go through one `ToastStack` installed at boot (`src/ui/toasts.ts`) rather than per screen: the screen a refusal happened on is usually rebuilt by the action that caused it, and the message has to outlive that.

**Gear comparison (fifth polish round).** `compareGear(candidate, worn)` in `src/ui/itemView.ts` is the single answer to "is this better?", and `itemPower(item)` in `domain/power` is the single measure behind it — one piece's contribution to Power Level, in the units the rail prints, so "+18 power" on a tooltip means the hero's Power Level rises by 18. Three surfaces read it and therefore cannot disagree: the tooltip **leads** with the verdict (Upgrade / Worse / Sidegrade / Nothing worn there, and by how much) and writes each moving stat as `24 → 31` rather than as a bare delta; a backpack slot carries a chevron when the piece beats what is worn (gated on `canEquip` — a piece this hero cannot wear is not an upgrade for them); a merchant's shelf row says "Upgrade" on its own detail line and takes a wash. Before this the comparison existed but was printed *last*, under the piece's own stats, and only when the socket was occupied — so the commonest case, an empty socket, showed nothing at all.

## 10. Custom components (§20.2 — "only when a feature genuinely requires it")

Planned custom inventory — each built strictly from FantasyUI tokens/semantic slots, no stylistic outliers:

1. `CombatStage` — combat choreography director (composition + WAAPI timelines; no new visual language, only arrangement/motion of FantasyUI parts).
2. `GachaRevealDirector` — the §16.3 set-piece sequencer (same nature: direction, not new chrome). **Built in M7** as `src/ui/gacha/revealDirector.ts` + `riteChoreography.ts`.
3. `TowerTrail` — *only if* `StageTrail`'s options can't be configured into a convincing upward tower; first attempt is configuration/skin, not a new component.
4. `ItemView` — the §9 standardization wrapper. **Built in M5** as `src/ui/itemView.ts`: the single mapping from our item data to FantasyUI's slot, card and tooltip shapes, so a sword reads identically in the backpack, on the paperdoll, in a shop row and in a loot window.

Anything beyond this list needs a written justification in this file before it's built (§20.2 discipline).

**Upstream wishes (raise against FantasyUIs rather than working around locally):**
1. `CharacterSelect` takes a single static `confirmLabel`, so a slot picker cannot say "Play" over a hero and "Create" over an empty slot. We ship one honest label ("Continue") until the component can vary it per selection.
2. `Panel` exposes `setTitle` but no `setSubtitle`, so a subtitle that tracks state has to be rendered as body content.
3. `ButtonVariant` has no destructive/danger option; reset actions are tinted locally via `.omf-danger` using theme tokens.
4. **Native `title` attributes** are set by `Portrait`, `BuffBar`, `BossHealthBar`, `ResultScreen`, `PowerRating` and `StageTrail`'s locked difficulty tabs. Brief §20.4 bans browser tooltips outright, so `src/ui/tooltips.ts` adopts every `title` the app produces into a FantasyUI `Tooltip` at runtime (see §12). A `tooltip?: false` escape or a `Tooltip`-based default upstream would remove the need.
5. `BuffBar` counts durations in **seconds** (`duration()` renders `3` as `3.0s`). Round-based combat has no seconds, so our chips state their duration in the tooltip and pass no `remaining`. An explicit unit or formatter option would let the sweep and the countdown work for turn-based games.
6. `StageTrail` always renders its **star meter**, so a campaign without star ratings shows `★ 0 / 0`. Ours is hidden with one local rule; a `stars: false` option would be cleaner.
7. `Portrait` has no `setLevel`, so a level-up cannot update the badge in place. Our rail refreshes it on the next screen build.
8. `QuestBoard` models **contracts** — bounties a player accepts, abandons and turns in — and carries no progress value. Daily/weekly quests are always active and always counting, so ours are composed from `Panel`/`StatBar`/`Badge` instead. A `progress`/`target` pair on `Bounty`, plus a mode where entries are permanently taken, would let the component cover both.
9. `BannerCarousel` hardcodes a ten-pull button beside the single-pull one, with no way to hide it and no disabled/refusal state. A game with single pulls only (Q20) cannot use it without shipping a button that does nothing (§2.1). A `multi?: false` option, and a per-banner `refusal` string, would make it usable.
10. `SummonScreen` bakes in the same ten-pull button plus a pity counter (`pity`/`pityCap`) that is not optional in spirit — a gacha without pity has to render a meter reading nothing. Making the pity block omissible and the pull buttons configurable would open it to non-pity games.
11. `Paperdoll` puts **no id on its socket cells**, so a screen that wants to say something about a particular slot — "this one is locked until ascension 3", or the stat block of the piece in it — has no way to address one. It does set `data-equip` on each socket, which is enough to address one — that is what ours reads, stamping its own `data-slot-id` alongside so the generated slot-icon stylesheet and the smoke tests address sockets by a hook we control rather than a vendored attribute we do not. The attribute is undocumented, so it is a wish that it be named as part of the component's contract. *This is not theoretical in either direction: the M5 pass addressed sockets with a `[data-slot-id]` selector that matched nothing and locked sockets were silent until the first polish round caught it, and the fix that replaced it walked the columns positionally until `data-equip` was found in the third.*
12. `Tooltip` switches from `position: relative` to `position: fixed` through a `[style*='left']` attribute selector, so an instance created up front and parked on `<body>` sits **in the page flow** until its first `showAt()`. Thirty-two empty pixels at the end of the document made every screen taller than the viewport. A class (`is-positioned`) set by `showAt()`, or a `positioned: true` option, would be robust; ours is overridden locally for the service's own instance.
13. `Paperdoll` has no place to put a per-slot picture, so the "what does this
    socket take?" ghost icons are attached from our stylesheet against the
    `data-slot-id` we stamp on (see 11). A `placeholder` per `EquipSlotDef`
    exists on the type but is only honoured for a handful of defaults; honouring
    it for every slot would make this a component feature rather than an
    override.
14. `Tooltip` sizes itself in fixed pixels, so on a 2560-wide screen the one
    surface a player has to read *while the cursor is elsewhere* stayed the same
    physical size while the eye got further away. Ours is scaled by breakpoint
    from our own stylesheet. A `scale` option, or type set in `em` against a
    root the host controls, would make that the component's job.
15. `CharacterSelect` pins a card's **name and its unlock hint to the same bottom edge** (`bottom: 12px` and `bottom: 0`), so a hint long enough to wrap grows straight up through the name. Every locked slot in our roster wraps — "Unlocked with an Account Slot upgrade" is two lines at any card width we would use. Ours reserves a band for the hint and lifts the name above it with `:has()`. Stacking the two in a footer element, or reserving room for the hint the component already knows it is rendering, would fix it for everyone.
16. `CharacterSelect` paints a card's role mark with `background-image: var(--fui-img-<icon>)`. The pack's line glyphs are `fill="currentColor"` **masks**, so as an image every one of them renders as a black smudge in the corner of a dark card. Ours moves the URL into `mask-image` after construction. A `maskIcon?: boolean` — or resolving glyph ids as masks the way the rest of the library does — would remove the post-pass.
17. `TitleGate` draws `figure` as a hard-edged rectangle with `contain`, which is right for a cut-out silhouette on transparency and wrong for key art that carries a painted background of its own: the art lands as a slab with a visible seam down the middle of the screen. Ours masks all four edges from our stylesheet. A `figureFade?: boolean` (or simply masking the figure's edges by default, which costs a silhouette nothing) would make good key art usable straight out of the box.
18. `StageTrail` draws each chapter divider as a full-width band carrying its own chapter art. That is right for a campaign map where every chapter is a different place; it is wrong for a trail whose chapters share one backdrop, where the divider lays a second crop of the same scene over the first with hard edges and the path running behind it. A `chapterStyle: 'plaque' | 'band'` option — or simply honouring `art: undefined` by fading the scrim in both directions — would cover both.

## 12. The tooltip service (Brief §20.4)

The brief's ban on native tooltips is enforced twice, because our own source is only half the surface:

- **In our code**, by lint: three `no-restricted-syntax` selectors cover every shape a `title` could reach the DOM through.
- **In the running game**, by `src/ui/tooltips.ts`: one `MutationObserver` on the app root moves any `title` attribute — including the ones vendored components set — into `data-omf-tip`, and a single delegated listener set serves them through one shared FantasyUI `Tooltip`. Delegation matters: a fight that builds and discards hundreds of effect chips must not accumulate listeners.

Two kinds of tip go through the one service, and the difference is what the thing being hovered *is*:

- **A hint** is a sentence about a control — "25 gold short", "Reach level 100 to ascend". `setTip(el, string)` stores it in the attribute and it renders as body copy. A sentence set in the display face as a title reads like a headline for something with no name.
- **A card** is the full `TooltipOptions` payload for a thing that *has* a name: an item's rarity-tinted stat block, what it is worth, and what changes if it goes on in place of the piece already in that slot. `setTip(el, options)` keeps it in a `WeakMap` keyed by the element — free to attach, collected with the node — and writes a flattened text digest into the attribute so assistive technology and the §20.5 audit still read it.

Every item surface in the game goes through `itemTooltip()` for the card: the backpack, the paperdoll's sockets, both merchant shelves and the sell grid. Before the first polish round only the item's *name* was passed through, so a backpack full of gear said nothing but what it was called.

A Playwright test asserts `document.querySelectorAll('[title]')` is empty across the whole flow, so §20.4 is a property of the shipped game rather than of our source alone.

## 11. Resolution & scaling strategy (§20.6)

Fluid layout 1440×900 → 2560×1440, art-directed at 1920×1080; FantasyUI's global `--fui-ui-scale` custom property is the density dial (slightly higher at 2K so the game keeps its chunky handcrafted feel on big glass); sidebar fixed-width, main panel fluid with max-width clamp; below ~1280px width: styled "enlarge your window" gate (mobile out of scope, §2.2/§20.6 — but no architectural corner painted: layouts are flex/grid, no absolute-positioned pixel maps outside the combat stage's internal choreography space).
