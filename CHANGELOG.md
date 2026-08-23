# Changelog

All notable changes to OneMoreFloor are documented here, maintained from the first commit onward (Brief §22).
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versioning follows the game's release naming.

## [Unreleased]

### Added

- **Milestone rewards every 25 floors.** A floor whose number divides by 25 pays
  a chest on top of its ordinary reward — gold and XP many times a normal
  floor's, a fistful of materials, and a lucky ticket every fourth one. It is
  claimed once ever, per character, and the trail draws the marks ahead so the
  next one is always a visible reason to keep going. Milestones deliberately pay
  no gear: the tower's job after this round's retune is to fund the pieces you
  choose, not to hand you another one.
- **Run history, on a Records screen.** The last twenty runs, newest first: the
  floor each one ended on, what killed it, the gold it earned and the fights it
  took. A roguelike whose runs leave no trace is a game with no memory of the
  player, and the record floor in the rail was the only thing the old build
  remembered.
- **The ghost of your best climb.** The trail marks the highest floor ever
  cleared, and — when that record is within reach — climbs all the way to it, so
  the mark is a place on the path you can walk to rather than a number in a chip.
- **Auto-climb, deliberately slow.** Three states in the tower's footer: off,
  *watching* (the game plays the floors for you, one every 20 seconds, with the
  fights on screen), and *background* (the climb continues while you shop, gear
  up or pull, unlocked at level 500). The brake sits *between* floors and never
  inside a fight, so auto-climb can never be the fastest way to play — Battle
  Speed still owns how quickly a fight resolves. Both modes stop dead on a death.
- **A second way out of a death.** The fall used to offer one button, the
  Quick-Raid, which decided for the player that the next thing they wanted was
  to be back at the top. "Climb again" puts them in the Spire at Floor 1
  instead, where the run's gold and materials are spendable now, the trail shows
  how far the last climb reached, and any cleared floor on it is a raid target of
  its own.
- **Backpack size is an account upgrade.** 20 sockets up to 50, in steps of
  five, bought with gold from the playing character's purse like the other two
  and kept by the account through a reset. §15 said "exactly two account
  upgrades, do not add more"; the owner asked for a third and the decision is
  recorded as Q30 in `USER_QUESTIONS.md` rather than folded in silently. What
  that brief line was protecting still holds: the upgrade kind is a closed union,
  so a fourth cannot appear without an edit in one file and a line in the ledger.

### Changed

- Save schema **v6**. One bump carries the whole polish round's new state:
  accounts gained a backpack size and a bestiary; characters gained saved
  loadouts, a rite wish list, curses, and — inside `tower` — milestones claimed,
  run history, the auto-climb mode and the run's running totals. Every default is
  the honest one for a save that predates the feature: nothing is guessed, and a
  returning player's next milestone is waiting rather than already spent.
- The backpack's size is passed to the code that enforces it rather than read
  from a constant, so every call site says *which* bag it means.

### Changed — the drop economy

- **The tower pays in currency; gear is an event.** Equipment fell on about a
  third of every floor, which quietly broke the whole point of gear levels and
  ascension: whatever the tower handed over next was likely to beat anything
  already owned, so money spent improving a piece was money spent on something
  about to be thrown away. An ordinary floor now almost never drops gear (6%), a
  boss almost always does (90%) and can hand over two, and what every floor pays
  instead is gold and materials — which buy gear from the merchants *by choice*,
  and improve the piece already worn.
- **One drop is no longer worth four of another.** The budget window a piece may
  occupy inside its bracket narrowed from 0.55–2.4 to 0.72–1.58, so two drops of
  the same depth are within about 2.2× of each other. Meanwhile a piece taken to
  level 15 and five stars is worth about 3.7× its base — level bonuses rose from
  +60% to +90%, stars from +60% to +95%. **Investment beats luck**, which is the
  shape the design was written for.
- Rarity earns less of its keep through raw budget as a result, and more through
  affix count. That is deliberate: a four-fold budget spread is what made finding
  gear the entire game.

### Fixed

- **The floor preview folded in on itself on a short screen.** Every section of
  the tower's side panel is a flex child that may shrink so the panel can own its
  own height — and a flex child shrinks past its own content rather than pushing
  the box, without clipping what spills out. On a 1280x720 laptop that drew the
  reward chips straight through the stat comparison. The sections now stop
  shrinking at their content and the panel scrolls, centred *safely* so the top
  of it can still be scrolled back to.
- **Buffs and debuffs were drawn twice in every fight.** The engine states the
  opening board on its `fightStart` event *and* emits an `effectApplied` for each
  floor effect; the choreographer drew both, so every floor debuff appeared as
  two identical chips on the card. The events win — one code path for every
  effect, whenever it lands — and the opening keeps its slower beat.
- **Materials and balances say what they are.** Hovering a material in the Ascend
  dialog produced the word "Iron Sigil" and nothing else, which tells a player
  neither what it is nor where the next one comes from. Gold, both ticket kinds
  and every material now carry a real card — what it is, what it is for, where it
  comes from — served from one place (`src/ui/wallet.ts`) to the rail, the
  merchants' counters, the Ascend dialog, the summoning lobby and the fight
  aftermath, which is where most materials are met for the first time.

### Changed — the tower, and telling good gear from bad

- **The floor preview answers the question the screen exists to ask.** It listed
  the enemy's five stats and stopped, which is half an answer — a number means
  nothing without the number it is measured against. Standing on a floor, the
  player is asking *can I take this?*, so both sides of the fight are now next to
  each other: the matchup at the top, then a stat-by-stat comparison with a
  tug-of-war bar per stat, normalised against its own pair so health reads as
  clearly as speed. Only the side that is actually ahead is coloured; colouring
  both makes the row a decoration, colouring one makes it a verdict.
- **What a floor pays, before the fight.** A boss is several floors' pay in one
  go and nothing said so until the aftermath. The figures come from the reward
  curves with the dice left out, so the preview can never drift from what the
  floor actually hands over.
- **Floor effects are named.** "This floor imposes" was a row of unlabelled
  squares, which is a puzzle — and the whole point of stating it before the fight
  is that the player can act on it. Each effect now sits beside its own name,
  with the full card on hover.
- **The trail says where you are and what is dangerous.** It keeps its identity —
  stone wall, winding path, numbered discs — and gains the two things it could
  not say for itself: your hero's own face on the disc they are standing on, and
  a gold ring on boss floors, so a boss is visible from the bottom of the screen
  rather than only once you are under it. Band captions now state a range
  ("Floors 1–14") instead of the band's first floor, which read as a floor
  number and was simply confusing.
- **A gear tooltip leads with the verdict.** The comparison used to be printed
  *last*, under the piece's own stats, as bare deltas — and only when the socket
  was already occupied, so the commonest case (an empty socket) showed nothing
  at all. Now the first line under the item's name says Upgrade, Worse,
  Sidegrade or "Nothing worn there", and by how much power; every stat that moves
  is written as `24 → 31` rather than as a delta with no context.
- **Upgrades are marked without hovering.** A twenty-slot bag meant twenty hovers
  to find the one piece worth wearing, and a player who has to do that stops
  doing it. A bag slot that beats what is worn now carries a chevron, and a
  merchant's shelf row says "Upgrade" on its own line. All three surfaces read
  one function (`compareGear`) over one measure (`itemPower`), so they cannot
  disagree with each other in front of the player.

### Fixed

- The smoke suite's fight helper matched the Quick-Raid split button's caret
  ("More fight floor 1 options") as well as the button that starts the fight, so
  any test that reached the tower with cleared floors below it failed on a strict
  locator. Anchored.

### Changed — the rail

- **The sidebar says what it knows.** It is the only thing on screen at all
  times and it carried a portrait, a coloured bar with nothing written on it,
  one gold figure, the destinations, and half a rail of empty space above the
  Account entry. It now carries the numbers a player checks between every
  action — and only those:
  - **Level and XP as numbers**, above the bar. A bar that says neither what it
    measures nor how far along it is is decoration.
  - **PWR** and **BAG** chips under it. Power Level silently decides the quality
    of every item the tower, the merchants and the rites will offer (§13); the
    backpack is finite and a full one changes what happens to a drop (Q16).
    Both were a screen away.
  - **The wallet, whole.** Gold was the only balance visible anywhere outside
    the summoning lobby, so a player holding two Lucky Tickets had no way to know
    it. Tickets appear once held — a nought beside a currency a new player has
    never heard of explains nothing and costs a line.
  - **The climb** — the floor this run has reached, and the deepest floor ever
    cleared. This is a tower climber, and neither number was on screen unless the
    tower itself happened to be open.
  - **Draughts still running**, with what is left of each. They expire in real
    time whether the player is looking at them or not (§12), and the rail
    refreshes them on its own rather than only when a screen is rebuilt.
- **The rail is one frame, not five stacked things.** `SideNav` was the only
  block in it with a plate; the hero floated above it on bare background. Every
  block wears the same plate now, and the destinations share out whatever height
  is left instead of stacking at the top of an empty column — capped against the
  viewport, so a 2K rail spends its extra half-screen on taller rows rather than
  on a hole. A window too short to hold all of it scrolls rather than dropping
  anything, and the smoke suite asserts nothing ever grows over the button below.

### Added — third polish round

- **Items can be dragged.** Pull a piece out of the backpack and drop it on the
  socket it belongs in to wear it, or drag it back into the bag to take it off;
  drop it on a merchant's window to sell it. Clicking still opens the gear
  dialog — the drag is a shortcut for the action people reach for most, not a
  replacement for the screen that also upgrades and sells. A socket that will not
  take what is over it says so before the mouse comes up and *why* after it
  (§20.5): a drop that silently does nothing is the worst possible answer. A sale
  asks first and puts the price on the confirm button, because a drag is a cheap
  gesture to make by accident and a sale cannot be undone.
- **Credits, on the Account screen.** FantasyUI and Open Game Icons, with their
  licences and the artists named. The slot icons are CC BY 3.0, which asks for
  attribution in front of the audience — and a file in a source tree is not an
  audience. Fed from `src/content/credits/`, so a new asset is one entry rather
  than an edit to a screen.

### Changed — third polish round

- **The title screen is a front door rather than a placeholder.** It was a title,
  a line and a button floating in the left third of a black frame, beside key art
  the gate had pasted on as a hard-edged orange slab with a seam down the middle
  of the screen. The art is now masked back into the dark on every edge and lit
  from behind, the backdrop is warmed rather than left as a black field, and the
  five classes stand under the tagline with their names and their hooks — a front
  door should answer "what is this game" before the button is pressed, and five
  painted faces answer it faster than a sentence does.
- **The character-select screen has art on every slot.** Four fifths of a fresh
  roster used to be blank grey rectangles. A hero's card now carries their own
  portrait, an empty slot the pale outline of the one it is waiting for, a locked
  slot a sealed rune and a damaged slot a fractured stone. The roster and its
  detail column are sized to their content and centred as a pair, so they stay
  one object from a laptop to a 2K screen instead of drifting apart with a metre
  of black between them.
- **A locked slot no longer covers its own name.** `CharacterSelect` pins a
  card's name and its unlock hint to the same bottom edge, so "Unlocked with an
  Account Slot upgrade" wrapped to two lines and grew straight up through
  "Locked slot". Both now have a band of their own. Filed upstream
  (UI_FANTASYUI_MAP §10, wish 15) rather than forked.
- **Reset survives a click, and only offers itself when there is a hero to
  erase.** The button was appended to a detail column that `CharacterSelect`
  rebuilds on every selection, so the first card click took it away; and it was
  hidden with `el.hidden`, which any author `display` outranks, so it was never
  hidden at all. It is re-attached after each selection, the whole row goes when
  the slot holds nobody, and `[hidden]` now actually hides throughout the game —
  which also settles `DeathScreen`'s expired countdown ring.
- **A destructive button looks destructive.** `.omf-danger` set a tint that a
  grey stone plate could not show and a `color` that the ghost variant's own rule
  outranked, so "Reset this slot" was indistinguishable from "Continue". The
  label is red now. The confirmation dialog is still what protects the hero — this
  is so the player does not reach it by accident.

### Changed — second polish round

- **The two merchants are two destinations.** Equipment and Alchemist each have
  their own entry on the rail, their own restock clock and their own red dot,
  instead of one "Merchants" entry with a tab strip inside it. They sell
  different things and a player walks to one or the other already knowing which,
  so the tab was a click the rail could have saved — and a dot shared between two
  counters could not say which one had something on it, which sent the player to
  the wrong door half the time. The free restock countdown moved inside the
  shop's frame while it was there; with the tabs gone it was the only thing left
  floating outside a window, and a countdown with no frame around it reads as
  debug output.
- **Empty gear sockets show what they take.** Fourteen identical holes said
  nothing about which was the cape and which the relic, and hovering each in turn
  to find out is not reading a character sheet. Each empty socket now carries a
  faint mask of its own slot — tinted with the panel's ink and held at a whisper,
  so a socket with something *in* it is still obviously the interesting one.
  Icons are from [Open Game Icons](https://open-game-icons.net) (CC BY 3.0),
  vendored by `npm run vendor:slot-icons` and credited in `docs/CREDITS.md`.
- **Buffs and debuffs say what they do.** A chip read "Rusted — Whole fight",
  which names an affliction without telling the player anything they can act on.
  The card now carries the stat it moves and by how much, how long it lasts, and
  a sentence — "Defense is 10% lower while this holds." It is derived from the
  effect's own data rather than authored per effect, so a new debuff describes
  itself the moment it is added.
- **Tooltips grow with the screen.** Everything else is laid out in fixed pixels
  against §20.6's 1080p target, which is fine for a panel; it is not fine for the
  one surface a player reads while the cursor is somewhere else. On a 2560-wide
  screen the card was the same physical size as at 1920 with the eye further from
  it. They are a third larger there now, and slightly larger everywhere.
- **The summoning lobby fills its frame**, both rites the same height, the way
  the quest board's two columns do. Sized to their own content, the rite with
  five odds rows stood a head taller than the one with three and neither reached
  the bottom of the screen.

### Fixed — second polish round

- **The backpack hung out of its own frame.** Five 64px sockets and their gaps
  need 344px of content box; the column gave them 268 and the fifth column sat on
  the ornament. Both grids are now sized to what they hold, and a smoke test
  measures every visible grid against its panel rather than trusting the sum.
- **An item's type was unreadable.** The line that tells a chest piece from a
  cape was set in the faintest ink in the palette at 11px — under 3:1 against the
  stone behind it.

### Fixed — first polish round

- **Items said nothing but their own name.** `itemTooltip` has always built a full
  stat block; the backpack passed only its *title* to the tooltip, so hovering a
  piece of gear told you what it was called and no more. Every item surface in
  the game now shows the whole card — rarity, slot, every stat, gear level and
  ascension, what a merchant would pay — and, where there is a piece already in
  that slot, **what changes if you wear this one instead**, signed and coloured.
  That is the backpack, the paperdoll's sockets, both merchant shelves and the
  sell grid.
- **Gear sockets had never explained themselves.** They were addressed by a
  `[data-slot-id]` selector that `Paperdoll` does not write, so the selector
  matched nothing and the tooltips it was meant to attach — including "this slot
  unlocks at ascension 3" — silently did not exist. Sockets are now paired with
  their cells by walking the columns in order; the id is stamped on while we are
  there, and a test fails if any socket goes quiet.
- **Every screen was 32 pixels taller than the window.** The shared tooltip is
  created at boot and parked on `<body>`, and `Tooltip` only leaves the page flow
  once it has been positioned — so until the player's first hover it sat at the
  end of the document, scrolling the tower's own title off the top of the screen.
- **The character sheet was four floating blocks, two of them unframed.** It is
  one framed window now, as the reference screen has it: sockets down both sides
  of the portrait, weapons beneath, the hero's own strip under that, then the
  stat rows. The hero's card no longer has a panel of its own to be squeezed in —
  which is what put its XP bar through the bottom ornament and pushed the Ascend
  button out of sight — and the socket columns are six and six rather than seven
  and five, which is a row of height saved and one less lopsided doll.
- **The merchant's shelf wore no frame** while every window around it did. It
  wears the same stone now, and the sell panel with it.
- **The tower's band marker was a photograph taped over the wall.** `StageTrail`
  gives each chapter a full-width band carrying its own crop of the chapter art;
  since the wall behind the path is *already* that art, the marker laid a second
  copy across it with hard edges and the climb's own path running behind it. It
  is a plaque now — a scrim that fades out in every direction, the name floating
  on an unbroken wall. The wall itself stopped repeating a 520px tile, too: the
  band art is a painted scene rather than a texture, and it was showing its joins
  every few floors.

### Added — first polish round

- **The tower can be dragged.** Take hold of the climb and pull it up or down.
  Past a four-pixel threshold the scroller captures the pointer and swallows the
  click that follows, so a drag that happens to end over a floor never starts a
  fight nobody asked for; below it, nothing has happened and the press is still
  an ordinary click.
- **The portrait in the rail opens the character sheet** — a real button, so it
  answers the keyboard, and inert once you are already looking at the sheet.

## [0.1.0] — Early Access 0.1 — 2026-08-23

The game the brief describes, finished (§2.1): a hero of one of five classes
climbs an endless tower, dies, raids back, and spends what they earned on gear,
stats, draughts, upgrades and the summoning rites — with quests and a tutorial
around it, all of it in the browser, all of it offline, none of it a placeholder.

**What EA 0.1 is.** Ten milestones' worth of work, listed in full below, from the
save layer up. It runs at 1080p and 2K in current Chrome, Edge, Firefox and
Safari; it needs no account, no server and no network after the first load; and
the whole of it — every screen, every refusal, every number — is covered by 500+
unit tests, 30 Playwright smoke tests and a balance simulator that CI runs on
every commit.

**What it is not, on purpose** (§2.2): silent — there is no audio of any kind;
online — no backend, no accounts, no multiplayer, ever; monetised — no payments,
no ads, and the gacha spends only tickets the player earned; mobile — the build
gates below 1280 px and says why; or packaged — the Electron wrap comes later,
and the build is already location-independent so that it will be packaging rather
than a port.

### Hardening — M10

- **A feature-by-feature audit of §3–§21 against the running build**, written down
  in `docs/EA_0.1_AUDIT.md` with a *proof* column that names a test rather than
  making a claim. It found three unfinished edges and all three are fixed: a
  `/favicon.ico` 404 on every page load (the Lootspire now has an icon, drawn in
  the game's own palette), five silent refusals on the merchant shelf, and a
  silent Claim button on every unfinished quest. **Every greyed control in the
  game must now say why it is greyed** — a permanent smoke test, so the next
  silent refusal fails CI rather than shipping.
- **A save-layer bug found by torturing it, not by reading it.** A new
  fault-injection harness fails IndexedDB operations one at a time across the
  whole write path. It found that a failure mid-write let the browser commit
  whatever had already succeeded: a crash at the wrong moment could leave an
  account pointing at a character that was never created. The write now aborts
  its transaction explicitly, and the harness stays in CI.
- **Every screen the player left was still in memory.** Six of the eight routes
  handed the shell a screen's *element* rather than the screen, so nothing ever
  called its `destroy()` — about 41 listeners and 91 DOM nodes retained per screen
  visit, growing for as long as the session lasted. Fights never leaked; only
  walking the game did, and that asymmetry is what named the bug. The shell now
  owns its screen and tears it down: fifty-four screen visits now end with the
  browser holding exactly what it held after the first. A smoke test walks the
  game five times over and fails if that stops being true — verified by reverting
  the fix and watching it fail.
- **Frame pacing measured rather than guessed**, and the honest result is that the
  animation was never the problem — 74 KB of gzipped code, ~2.5 MB fetched to be
  playing, and a main thread that is **95% idle through a fight** with no long
  task at any point. Skip — every remaining beat applied in one burst, the
  hardest thing the presentation can be asked to do — costs 20 ms, which is what
  makes x8 safe by construction. Four plausible culprits were measured and
  cleared, including one change that is correct but fixed nothing measurable, and
  is recorded that way.
- **The deployed build no longer ships a source map.** `sourcemap: true` emitted a
  1 MB map *and* pointed the bundle at it, publishing the full TypeScript source
  of a commercial game to anyone who opened DevTools. There is no error tracker
  to consume one (§21), so production builds no longer emit it;
  `docs/DEPLOY.md` §5 says how to read a player's stack trace without one.
- **The Electron-forward promise is now a test, not an intention** (ARCHITECTURE
  §6): every URL the build emits must be relative, and the only remote-looking
  string in the whole bundle must be the SVG namespace. A build that would break
  a `file://` load fails CI.
- **Cross-browser CI.** The smoke suite runs on Chromium, Firefox and WebKit — the
  A9 browser floor — instead of Chromium alone, and the balance simulator is a CI
  step rather than a thing to remember.
- **`docs/DEPLOY.md`**, the checklist for putting it live: what to verify before,
  what to click after, and what to do when it goes wrong (roll back first — and
  the one change, a schema bump, that a rollback cannot undo).
- **Q28 and Q29 answered** by the owner and folded in: enemies keep FantasyUI art
  where the library genuinely has them and the documented silhouette where it does
  not; buying a draught drinks it, and no potion inventory is coming. The
  decision ledger has no open questions left.

### Changed — M9: the tuning pass

This milestone changed almost no code and almost every number. The simulator
stopped being a smoke test and became the authority, and the first honest
measurement found five structural faults that no amount of playtesting would
have separated from each other.

- **Gear could lift its own bracket.** Gear counts toward Power Level, Power Level
  picks the bracket, and the bracket decides how good the next drop is — a loop
  whose gain was above break-even. A climber's gear converged to the same power
  *whatever depth they were at*, and the first death wall sat at floor 80 against
  the 15–25 the balance doc asks for. **Depth now decides the bracket**: the tower
  contribution to Power Level is exponential at a shade under the enemy curve, so
  the tower pulls a few percent ahead every ten floors and levels, stat points and
  upgrades are what push the wall back.
- **Every item price double-counted the same exponential.** An item's budget
  already grows with its bracket, and buying, selling and upgrading each multiplied
  it by a *second* per-bracket factor. Six sessions in, a climber's purse held
  twelve billion gold, most of it from selling spares. All item prices now go
  through one anchor, so prices and income can be compared by dividing two numbers.
- **Experience outran the tower.** Level cost was polynomial against exponential
  income, so heroes hit the level-100 ascension cap inside three sittings. Level
  now tracks depth instead of outrunning it.
- **Three "band-relative" percentages were not.** Defence mitigation, crit chance
  and double-attack chance were normalised against references growing at a *slower*
  rate than the stats they normalise, so all three would have pinned at their caps
  a few hundred floors in — the precise failure the band-relative design exists to
  prevent.
- **Bosses were the entire game.** Normal floors were won ~97% of the time and boss
  floors ~22%: nine free floors and a brick wall, ten times over. A boss's excess
  over a normal floor now ramps in with depth — the first gate is a lesson, floor
  60 onwards is the full wall — and normal floors were made to bite.
- **The Swashbuckler could not reach its own signature.** Both of its resource
  events depend on Speed, which comes only from gear, and the per-round trickle was
  too small to bridge the gap. Fill rates and class stat lines were retuned; every
  class now spends a signature in 5–25% of rounds and the win-rate spread at
  matched depth is under six points.
- **The character dot now lights when a better piece is in the backpack.** Found in
  the manual playtest: a hero nine floors in was wearing one item with six better
  ones in the bag and nothing on screen said so.

### Added — M9

- **Thirteen balance gates** (`tools/sim/gates.test.ts`), each one a sentence from
  the brief turned into an assertion: where the first wall sits, that a re-climb
  takes minutes, that no class is a trap pick or trivialises the tower, that no
  purse ever covers the shopping list, that gear levels 1–10 stay free-flowing and
  11–15 are a push, that the rarity arc holds and Mythical stays under a tenth of a
  percent, that a ticket stays an event, and that the endless guard never fires.
  Every gate was verified to *fail* on a deliberately broken config before being
  trusted.
- **The simulator plays archetypes** — a climber who never shops, a player who
  shops on every restock, a gacha hoarder — across sessions, with real time passing
  between sittings so shelves age out on their real schedule, and records what the
  gates need: gold in and out, gear levels, first Legendary, ticket cadence,
  signature uptime, round-cap fires and re-climb seconds.
- **`npm run sim` is a CI step of its own**, so a tuning change that breaks the
  first-session curve fails in the commit that broke it.

### Added — M8: a tower with somewhere to be

- **Thirty enemies across eight families** (Brief §3.1, Q12) — vermin, brigands, beasts, constructs, arcane leftovers, undead, infernal and the aberrations deeper up, covering floors 1–100 with three or more candidates on every floor. Twenty-eight of them now wear artwork that genuinely *is* them rather than the placeholder silhouette.
- **A family is now a place, not a caption.** A band names the families that live in it and the generator draws only from those, so the Undercroft is vermin and thieves, the Flooded Works is machinery and old spellwork, and Ember Reach is what the tower turns into when it burns. Six bands, five of them authored stretches and one deliberately endless.
- **Ten bosses, one per gate from floor 10 to 100**, with the kits chosen as a *sequence* rather than individually: no two consecutive gates attack the same stat, so a player who has just learned to survive the Warden's armour cannot beat the Gutter King the same way. Read down the list and each asks a different question — armour, burst, tempo, a race, a starved resource, a grind, crits, raw damage, speed-and-shred, and finally all of it.
- **Boss floors past 100 cycle the roster** instead of repeating the deepest boss forever. The pick is derived from the floor number, so it stays stable without being stored.
- **Nine procedural modifiers** (up from five), each trading one stat for another rather than inflating both. Thirty enemies times nine modifiers is what the deep tower is actually made of.
- **A wider effect vocabulary** — every stat now has a debuff on both sides of §3.2's line, which is what lets a band feel like somewhere instead of a rotation of the same four chips.
- **Twenty quest templates**, ten per cadence, four of the weeklies hard — so the one hard slot §17 reserves for ticket odds is not the same quest every week (Q21).
- **The tower sweep** (ROADMAP M8's exit criterion, now permanent CI): all five thousand floors generated and checked for dangling art or strings, non-finite stats, difficulty that stops rising, floors with too few candidates, enemies no player can reach, and a silhouette fallback that still resolves.
- **The content pipeline, demonstrated in CI rather than in a review.** An enemy that exists only inside a test file is fought to a real verdict; every shipped quest template is driven to completion from ordinary play events; every objective the type allows is proved both used and observable. If content ever stops being data, the failure lands in the commit that caused it.

### Changed — M8

- **A floor no longer serves the enemy the floor below served.** Independent per-floor draws produce runs, and the first pacing pass over the new roster turned up four identical floors in a row at 26–29 — the loudest way an endless tower can read as unfinished. The rule rebuilds the chain from the start of each stretch (a boss floor resets it), so it stays pure, stateless and replayable.
- **The Spire Rat is deliberately no longer the most likely floor-1 enemy.** It is the one enemy still wearing the §4.3 silhouette, and floor 1 is the worst place in the game to show placeholder art (Q28).
- **Bands, boss ranges and enemy floor ranges were retuned together** so that every authored enemy is reachable and no stretch drops below three candidates — both now assertions rather than intentions.

### Added — M7: the gacha

- **Two banners, and both of them tell the truth** (Brief §16, Q20). The Rite of Embers chases Legendary steel; the Rite of the Fallen Star chases Mythical. Single pulls only, no pity counter, and every pull pays something — the worst night on the common rite is a real bundle of materials at your own tier, and the worst on the rare one is Epic gear.
- **The odds on screen are the odds that ran.** Weights live in config and the rate table divides them itself, so a balance pass cannot leave a stale percentage printed beside a changed number. Both jackpots are what §16.2 asks for: Legendary at 3%, Mythical at 0.80%.
- **The summoning rite** (§16.3), which the brief calls a headline feature and asks for real development time on. The game is covered, the chamber goes dark, a summoning circle wakes — and the light climbs and **dies back**, more than once when the rite is bluffing, before the prize lands on a lit plinth. The whole chamber's brightness runs off one number, so the circle, the glow spilling past it and the caption can never disagree about how far along the summoning is.
- **The fake-out cannot lie about the prize.** How high the build teases is drawn from config and then raised to the outcome's own rarity, so it may over-sell and can never under-sell: a bundle of ore can arrive behind a build that looked Legendary, but a Legendary is never staged like ore. The drawn rank is stored on the pull, which makes the *animation* replayable from a save alongside what it staged — a bug report saying "it staged a Mythical and gave me ore" reproduces exactly.
- **A pull goes through the same door as every other item source**, which is why §16.2's "all gacha rewards are bracketed by Power Level, no overshooting" needed no gacha-specific guard: the permanent property test simply grew a third sweep, over both banners at every bracket.
- **The reward is banked before a single frame plays.** Closing the tab mid-rite costs nothing — the animation performs something that already happened, which is the same discipline that makes Skip free in combat.
- **A full backpack refuses the rite** rather than conjuring something you cannot carry (Q16), and says so on the button instead of failing on the press. The rail's summoning dot lights only when a rite can actually be performed, never when a ticket is merely held.
- **Verification:** 486 unit tests and 26 Playwright smoke tests. 40,000 pulls per banner are drawn in CI and checked against the printed table; the choreographer's pacing — "a Mythical builds longer than a bundle of ore", "the tease always dies back at least once", "the circle is hotter after every fall-back" — is asserted as properties of a list rather than hoped for in pixels.

### Changed — M7

- **Save schema v5:** characters gained their gacha pull count. It is a *seed input*, not a statistic — each pull draws from a stream named by it, so a save plus a pull number reproduces exactly what came out — and it is emphatically not a pity counter (Q20). Existing saves migrate to zero.
- **The lobby is composed from parts rather than from FantasyUI's `BannerCarousel`/`SummonScreen`.** Both are built for a unit-collection gacha with ten-pulls and pity, and Q20 gives us neither; rendering a ×10 button we cannot honour would be a shipped placeholder (§2.1), and a pity meter reading nothing would be a lie. Filed as upstream wishes 9 and 10 rather than forked locally.
- **Banner art is validated like all other content**: key art must be painted and currency marks must be masks, because a painted image under a CSS mask collapses to a silhouette — the mirror of the `glyph-*` mistake M4 found in the effect chips.

### Added — M6: reasons to come back

- **Daily and weekly quests** (Brief §17, Q21): three of each, one weekly always hard — the slot that pays in tickets. Every card says what it asks for, how far along it is, and exactly what it pays *before* you decide to chase it, with the countdown to reset above each column, because "is it worth starting this now?" is the question a quest board exists to answer.
- **Quest targets follow the player down the tower.** A template is a recipe, not a quest: it is instantiated each period against the hero's own depth, which is what keeps §17's "one day of normal play" true on floor 8 and on floor 800 without anyone maintaining two hundred hand-written quests.
- **Periods are date strings, not timers** (Q10). `2026-08-22` and `2026-W34` are what a board is keyed by, so "has this day already happened?" is a string comparison rather than arithmetic on a clock the player can move. A board only ever moves forward: a key that is not *later* than the stored one leaves everything alone, so winding the system clock back re-opens nothing and re-grants nothing.
- **Progress comes from what the player did**, never from a state change nobody caused: clearing floors, felling bosses, earning and spending, upgrading, buying, selling, drinking. Nine objective kinds, each one something the game can observe.
- **The tutorial** (§18) runs *over* the tower rather than instead of it, spotlighting the real floor preview and the real navigation rather than describing them. It is skippable, and the opening beat says what skipping costs — a sentence where the decision is made beats a nag afterwards. Finishing pays a Lucky Ticket and starting gold; skipping does not, because §18 calls it a *completion* reward.
- **Account upgrades** (§15): Battle Speed x2 → x4 → x8 with the cost concentrated at the top (Q19 — x8 is the long-term goal §15.1 asks for, not an early convenience), and character slots 2–5 with the first cheap and the rest steep. Exactly two upgrades, and the code shape says so: the upgrade kind is a two-member union rather than a registry.
- **Every dot in the game now comes from one service** (§20.5), including quests and upgrades. A dot means a reward is sitting there or something is affordable *right now* — never "the board changed".
- **One reward path for the whole game.** Floors, quests and later the gacha all bank their payout through the same function, so a quest reward and a floor reward can never drift apart in what they actually give — the mistake that produced M3's XP double-count.

### Changed — M6

- **Save schema v4:** characters gained their quest boards. A migrated save arrives with both boards empty rather than pre-rolled: a board is built against the hero's depth *and* the current period, so rolling one at migration time would only bake in a key that may already be stale.
- **Quest targets scale by unit, not by a growth factor.** Counts stay flat with depth, gold targets are priced in floors' worth of income at the hero's own depth, and "go deeper" weeklies are a multiple of their best floor. Pricing gold by *bracket* was the first attempt and it was wrong: a level-2 hero in freshly-rolled starting gear can sit three brackets up while still earning floor-4 money, and the weekly asked them for 45,000 gold.
- **The second character slot now costs about a first session** rather than forty early floors. §15.2 calls the first extra slot cheap, and the second hero is how a player meets the other four classes — pricing that out costs the game more than it earns.
- **The router gained an `onEnter` hook**, so the tutorial can start over a live screen without anyone monkey-patching navigation to do it.

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
- **Buying a draught drinks it** (filed as Q29, confirmed by the owner 2026-08-23). The brief never describes a potion inventory, Q16 sized the backpack for gear, and stockpiling cheap draughts to drink at a deeper bracket would be the overshoot problem in another costume.

### Added — M4: the game becomes visible

- **The loop is playable.** Climb, fight, loot, level, die, Quick-Raid back up — end to end, with real drops, in a browser. Entering a hero now lands on the tower rather than a placeholder, and the placeholder screen is gone rather than replaced.
- **The Lootspire** (Brief §3.1, §3.4): a scrolling floor path showing the climb *ahead* of you, because the tower only goes up (Q23) — which means every node on it does something. The floor you are standing on is the fight; a floor you conquered in an earlier run Quick-Raids straight to that depth; new ground is not clickable because climbing is the only way there. Beside it, the next floor's enemy: portrait, stats, and the modifiers it will impose, each with its own tooltip.
- **The fight** (Brief §4.1, COMBAT.md §7): two portrait cards over the band's arena, in the arrangement the reference screens use. Cards lunge and recoil, crits stamp an impact frame, heavy blows wash the screen red, a full resource bar pulses and its signature move stops the fight for a beat. Under each card is a stat block, because a player who loses should be able to see why from the cards alone. The fight log is a drawer, so the arena keeps the whole screen.
- **Battle Speed is playback, never outcome** (§3.5). The multiplier scales the animation timeline and the waits between beats, and changing it takes effect on the next beat. Damage numbers have a minimum life independent of the rate, so a fight at x8 reads as a fast exchange rather than a smear — "legible at x8" is now an assertion, not an opinion. Until the account upgrade lands in M6 the indicator shows x1 and says what would raise it (§20.5).
- **Skip ends a fight exactly where watching it would** (§3.4): every remaining beat is applied with its animation suppressed, so the final frame is identical. The result was already saved before the first frame played (COMBAT.md §1), which is what makes that safe.
- **The aftermath** (COMBAT.md §8): a victory screen with what the floor gave, loot cards framed by rarity, and "One More Floor" that walks straight into the next fight without a detour. A level-up gets its own beat first. A death leads with what you *kept* — level, gear, gold, materials, every floor record — and offers the Quick-Raid back up, because death is meant to be a launchpad, not a slap.
- **Native tooltips are now impossible in the running game** (§20.4). Six vendored FantasyUI components set a `title` attribute; a lint rule cannot see them and editing them would be the silent fork the project forbids. A runtime service adopts every `title` the app produces into a FantasyUI `Tooltip` instead, and a smoke test asserts the document never contains one — so the ban is a property of the shipped game, not just of our source.
- **Bands have a look.** Each floor band carries backdrop art (Q11: FantasyUI's own, for now), painted behind both the trail and the arena, so a stretch of the tower reads as a place rather than a number range. Swapping in the owner's scene art later is one field per band.
- **Enemies have faces.** Ten of the thirteen enemies and bosses now wear FantasyUI art that genuinely is them — a stone golem, a demon lord, a brute. The three with nothing fitting in the library keep the documented silhouette, because a wrong portrait reads as a bug while the fallback reads as art still to come (§4.3). Q28 asked the owner which way to close the gap; the answer, on 2026-08-23, was to keep doing exactly this, and M8 grew the ratio to thirty-nine of forty.

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
