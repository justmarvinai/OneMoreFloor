# OneMoreFloor — Save Layer & Data Model (EA 0.1)

> Status: **planning — all feeding questions resolved** (decisions cited as `Qn`, see the `USER_QUESTIONS.md` ledger). Schema sketches below are *design*, not source. Brief cited as §n. The save layer is required by §21 to handle versioning + migrations and corruption recovery **from day one**; this is that design.

## 1. Principles

1. **The save is the product.** A player with 400 hours must survive every game update and every crash. Anything that risks a save is treated like a security bug.
2. **One writer, whole-record writes.** Saves are written as complete snapshots inside a single IndexedDB transaction — never incremental field patches scattered across code.
3. **Schema is versioned from commit one.** Every save blob carries `schemaVersion`; loading always runs the migration chain to current before the game sees the data.
4. **Distrust the clock, verify the data.** No server exists (§21): the design goal for timers/resets is *tamper-tolerant*, not tamper-proof (§23 Q10) — honest players are never hurt, cheaters only cheat themselves locally.

## 2. IndexedDB layout

Database `onemorefloor` (IDB's own `version` mechanism is used only to create stores; **data shape versioning is ours**, via `schemaVersion` fields — far more controllable than IDB upgrade events).

| Store | Key | Contents |
|---|---|---|
| `meta` | `"meta"` | `{ schemaVersion, createdAt, lastOpenedAt, lastKnownWallClock, sessionLock }` |
| `account` | `"account"` | The account-wide record (below) |
| `characters` | `slotId (1–5)` | One character record per occupied slot |
| `saveBackups` | `` `${store}:${key}:${gen}` `` | Rolling last-good generations for recovery (§6) |

Whole-store dumps stay small (a character record is a few hundred KB at worst — items are compact data, not blobs), so whole-record writes are cheap.

## 3. Record shapes (draft v1)

Illustrative TypeScript; final field lists follow the question answers.

```ts
interface AccountRecord {
  schemaVersion: number;
  accountUpgrades: {                    // Q4: account-wide, survive character resets
    battleSpeedTier: 0 | 1 | 2 | 3;     // x1 x2 x4 x8 — Q19: three sequential tiers
    characterSlotsUnlocked: 1 | 2 | 3 | 4 | 5;   // §15.2
  };
  activeSlotId: SlotId | null;          // Q2: exactly one active character at a time
  tutorialCompleted: boolean;           // §18 reward is per first completion
}

interface CharacterRecord {
  schemaVersion: number;
  slotId: SlotId;
  identity: { name: string; classId: ClassId; createdAt: number };  // §5; Q25 name rules, no rename
  progression: {
    level: number; xp: number;
    ascension: 0 | 1 | 2 | 3 | 4 | 5;   // §7
  };
  stats: Record<UpgradableStatId, { base: number; goldUpgrades: number }>; // §6; Speed excluded by type
  currencies: { gold: number; tickets: number; luckyTickets: number };     // §14/§16; Q1: Gold is the only currency
  materials: Record<MaterialId, number>;                                   // §10.2
  equipment: Partial<Record<EquipSlotId, ItemInstance>>;                   // §9.1
  inventory: ItemInstance[];            // Q16: finite backpack (size is a balance value)
  tower: {
    currentRunFloor: number;            // resets to 1 on death (§3.3)
    highestFloorEverCleared: number;    // persistent record (§3.4)
    runSeed: string;                    // deterministic run (ARCHITECTURE §5)
  };
  quests: QuestPeriodState;             // §17; Q10 date-keyed periods; Q21 3+3 board
  buffs: ActivePotionBuff[];            // { statId, magnitude, expiresAtWallClock } — Q9 real time; Q18 one per stat
  merchants: MerchantState;             // stock rolls + restock/reroll anchors (Q17)
  pity?: never;                         // Q20: no pity counter in 0.1
  badges: BadgeMemory;                  // which red-dots were seen (§20.5)
}

interface ItemInstance {
  uid: string;                          // instance identity
  defId: ItemDefId;                     // → content catalog (CONTENT_PIPELINE.md)
  rarity: Rarity;                       // §9.2 (six tiers)
  level: 0..15;                         // §10.1
  ascension: 0..5;                      // §10.2
  affixes: Affix[];                     // rolled stat slots (§10.2 table; Q3: asc 2 stays at 2 slots)
  bracketAtDrop: number;                // Power-Level bracket stamped at creation (§13 audit trail)
}
```

**Design notes:** `ItemInstance` stores *rolls*, never derived stats — derived values are always recomputed by current formulas, so balance patches apply retroactively without migration. `bracketAtDrop` lets us verify the §13 anti-overshoot invariant across a real save. Save data contains **no display strings** — names/art resolve through content ids at render time (also what makes localization Q24 retrofit-free and enemy-avatar swaps one-line per §4.3).

## 4. Versioning & migrations

- `CURRENT_SCHEMA_VERSION` is a single constant; **any** change to persisted shapes bumps it and ships a migration in the same commit (checklist in `CLAUDE.md`).
- Migrations are an ordered registry `n → n+1` of pure functions `(old) => new`, run in sequence inside one transaction; the pre-migration record is copied to `saveBackups` first. Each migration ships with a fixture-based Vitest case (real captured old-version blobs, not hand-minified ones).
- Loading a save **newer** than the build (possible after a rollback / an old Electron build later): refuse to open that character with a clear in-game message rather than destructively "migrating down". Never write to a newer-versioned record.
- Content-id migrations: if a content id is ever renamed/removed, the same registry maps old ids (items referencing a removed def degrade gracefully to a defined fallback def, never crash).

## 5. When we write

Autosave on every meaningful transition (fight resolved, loot claimed, purchase, equip/unequip, upgrade, ascension, quest claim, gacha pull, character switch/reset), debounced ~1 s so burst actions coalesce; forced flush on `visibilitychange→hidden` and `pagehide`. There is no manual "Save" button — the game is simply always saved; among other things, death (§3.3) must never be dodgeable by killing the tab before the write lands.

## 6. Corruption & partial-write recovery

Layered, per §21's explicit requirement:

1. **Atomicity:** a snapshot write is one IDB transaction: write record → update `meta.lastGoodGeneration`. IDB transactions are atomic, so a mid-write crash leaves the previous committed state.
2. **Checksums:** every record embeds `integrity: { crc32, writtenAt, gen }` computed over its canonical JSON. Load verifies; mismatch ⇒ recovery.
3. **Rolling backups:** the last **3 generations** per record are kept in `saveBackups` (written *before* each overwrite), plus one "daily" generation. Recovery walks generations newest→oldest to the first record that parses + passes checksum, restores it, and tells the player honestly what happened and how much was lost (a styled panel, not a stack trace).
4. **Quarantine, never delete:** corrupted blobs are moved to a quarantine key (they may be manually recoverable); the game never silently discards player data.
5. **Torn multi-record states:** account and character records are versioned by `gen` so a crash between "gold spent" (character) and "battle speed bought" (account) can be detected; cross-record purchases are therefore written **in one transaction spanning both stores** — the rule is: one user action = one transaction.

## 7. Time & tamper damping (implements the Q9/Q10 decisions: real-time potions; local-midnight dailies, Monday-00:00 weeklies)

All wall-clock reads flow through `time.ts` (ARCHITECTURE §5): on boot and periodically, `lastKnownWallClock` is persisted; if the clock reads **earlier** than last-known (rollback), the service reports a clamped "no earlier than last-known" now — so potion buffs (§12) can't be frozen forever and completed quest periods (keyed by date-string, §17) never re-grant. Forward jumps are honored (skipping ahead only expires your own buffs and skips quest days — self-cheating we accept per §1's single-player philosophy). No network time checks — the game must run fully offline (ARCHITECTURE §6).

## 8. Multi-tab / multi-instance guard

One writer at a time: on boot the game takes a `sessionLock` via the Web Locks API (fallback: heartbeat timestamp in `meta`); a second tab sees the lock and shows a styled "OneMoreFloor is already open in another window" gate instead of racing the save. (Also Electron-relevant later: second app instance.)

## 9. Reset & slot lifecycle (Q4)

Per Q4: **character reset** deletes exactly that `characters[slotId]` record (through the same backup path — an accidental reset is recoverable from `saveBackups` within the retention window, though the UI treats reset as final per §19); the account record is untouched. **Account slots** unlock via `accountUpgrades.characterSlotsUnlocked`; an empty unlocked slot simply has no character record.

## 10. Export / import (later per §21 — designed now)

The export format is the natural consequence of §2–3: a single JSON envelope `{ formatVersion, schemaVersion, exportedAt, account, characters[], integrity }`. Import = verify checksum → run the standard migration chain → write through the standard save path. Because export reuses the persisted shapes and the migration registry, building the actual UI later is small; nothing else in 0.1 needs to change. (Also the future save-transfer story for Steam.)

## 11. Test plan for this layer

Migration fixtures per version bump; property tests: save→load round-trip identity, checksum tamper detection, recovery ladder (kill each generation in turn), clock-rollback scenarios for buffs/quests, the one-action-one-transaction audit, and a fuzzed "crash between any two awaits" harness around the write path (fault-injection on the IDB wrapper).
