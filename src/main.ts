/**
 * Boot.
 *
 * The sequence is deliberately explicit, because the order matters:
 *
 *  1. Point FantasyUI's art at our own copy — the game must never reach the
 *     network at runtime (ARCHITECTURE §2/§6).
 *  2. Take the session lock, so a second tab never races this one's writes
 *     (SAVE_SCHEMA §8).
 *  3. Open the save and run any migrations before anything reads game state.
 *  4. Arm the clock with the persisted high-water mark, so rollback damping
 *     survives a restart (SAVE_SCHEMA §7).
 *  5. Load the account and slots, then enter the first screen.
 *
 * Anything that throws in here lands in the in-game error panel rather than a
 * blank page.
 */
import './ui/fui/styles/index.css';
import './styles/art.css';
import './styles/slots.css';
import './styles/app.css';

import { setAssetBase } from './ui/fui/index.ts';
import { createRouter, type Router } from './app/router.ts';
import { createSession } from './app/session.ts';
import { createAppStore, saveLoaded, type AppStore } from './app/state.ts';
import { createClock, setClock } from './app/time.ts';
import { acquireSessionLock } from './save/sessionLock.ts';
import { openSave } from './save/saveLayer.ts';
import type { EquipSlotId, SlotId } from './domain/character/types.ts';
import { renderErrorPanel, renderLockGate } from './ui/errorPanel.ts';
import { openResetDialog } from './ui/resetDialog.ts';
import { installTooltipService } from './ui/tooltips.ts';
import { createShell, type Shell } from './ui/shell.ts';
import { createCharacterSelectScreen } from './ui/screens/characterSelect.ts';
import { createCombatScreen } from './ui/screens/combat.ts';
import { createHeroCreationScreen } from './ui/screens/heroCreation.ts';
import { createCharacterScreen } from './ui/screens/character.ts';
import { createMerchantScreen } from './ui/screens/merchant.ts';
import { createGachaScreen } from './ui/screens/gacha.ts';
import { startReveal, type RevealDirector } from './ui/gacha/revealDirector.ts';
import { createQuestScreen } from './ui/screens/quests.ts';
import { createUpgradesScreen } from './ui/screens/upgrades.ts';
import { startTutorial, type Tutorial } from './ui/tutorial.ts';
import { createRaidScreen } from './ui/screens/raid.ts';
import { createTitleScreen } from './ui/screens/title.ts';
import { createTowerScreen } from './ui/screens/tower.ts';
import { openGearDialog, type GearDialog } from './ui/gearDialog.ts';
import type { ShellSection } from './ui/shell.ts';
import type { MerchantId } from './domain/merchants/merchants.ts';
import { canPull, type BannerId } from './domain/gacha/gacha.ts';
import { clock } from './app/time.ts';
import type { Character } from './domain/character/types.ts';
import type { FloorResult, QuickRaidResult } from './domain/tower/run.ts';

/** Where the vendored FantasyUI art lives in our own build. */
const ASSET_BASE = '/fui';

const BUILD_VERSION = '0.1.0-dev';

type ScreenId =
  | 'title'
  | 'select'
  | 'create'
  | 'tower'
  | 'combat'
  | 'raid'
  | 'character'
  | 'equipmentMerchant'
  | 'magicMerchant'
  | 'gacha'
  | 'quests'
  | 'upgrades';

export async function boot(mount: HTMLElement): Promise<void> {
  setAssetBase(ASSET_BASE);
  // Native browser tooltips are banned game-wide (§20.4). Installing the service
  // before the first screen means vendored components never get a chance to show
  // one, whatever they put in the DOM.
  const tooltips = installTooltipService(mount);

  try {
    const lock = await acquireSessionLock();
    if (!lock.held) {
      renderLockGate(mount);
      return;
    }

    const { save, meta } = await openSave();
    if (meta.record) {
      setClock(createClock({ lastKnown: meta.record.lastKnownWallClock }));
    }

    const store: AppStore = createAppStore();
    saveLoaded(store, {
      status: meta.status,
      createdAt: meta.record?.createdAt ?? 0,
      lastOpenedAt: meta.record?.lastOpenedAt ?? 0,
      ...(meta.recoveredFrom ? { recoveredFrom: meta.recoveredFrom.takenAt } : {}),
    });

    const session = createSession(save, store);
    await session.refresh();

    /** Which empty slot the creation screen is filling. */
    let creatingSlot: SlotId = 1;
    /** The fight the combat screen performs, and the hero as they walked into it. */
    let pendingFight: { hero: Character; result: FloorResult } | null = null;
    /** The raid the summary screen reports. */
    let pendingRaid: QuickRaidResult | null = null;

    const requireCharacter = (): Character => {
      const character = store.get().activeCharacter;
      if (!character) throw new Error('[boot] no active character');
      return character;
    };

    /**
     * Fight one floor. Resolution and its save happen before the screen swaps,
     * so the combat screen is handed a decided fight to perform (COMBAT.md §1).
     */
    const startFight = (floor: number): void => {
      const hero = requireCharacter();
      void session.fight(floor).then((result) => {
        pendingFight = { hero, result };
        router.go('combat');
      });
    };

    const startRaid = (throughFloor: number): void => {
      void session.raid(throughFloor).then((result) => {
        pendingRaid = result;
        router.go('raid');
      });
    };

    /** Which shop is open; the tabs switch between them without leaving. */
    /** The summoning set-piece, kept so leaving the screen can tear it down. */
    let rite: RevealDirector | null = null;
    /** The gear dialog, kept so an action can redraw it instead of closing it. */
    let gearDialog: GearDialog | null = null;

    const goTo = (section: ShellSection): void => {
      switch (section) {
        case 'equipmentMerchant':
          // Walking in is what ages the shelf out, so the restock happens on the
          // way rather than the player finding yesterday's goods (Q17).
          void session.visitMerchant('equipment').then(() => router.go('equipmentMerchant'));
          return;
        case 'magicMerchant':
          void session.visitMerchant('magic').then(() => router.go('magicMerchant'));
          return;
        case 'quests':
          // Same reason: the board turns over on arrival, not on a timer nobody
          // is watching (Q10).
          void session.visitQuests().then(() => router.go('quests'));
          return;
        case 'character':
          router.go('character');
          return;
        case 'gacha':
          router.go('gacha');
          return;
        case 'upgrades':
          router.go('upgrades');
          return;
        default:
          router.go('tower');
      }
    };

    /**
     * Perform one rite (Brief §16.3).
     *
     * The pull is resolved and *banked* before a single frame plays, so the
     * animation is a performance of something that already happened — a closed
     * tab mid-rite costs the player nothing.
     */
    const startRite = (banner: BannerId): void => {
      void session.pullBanner(banner).then((outcome) => {
        if (!outcome.ok) {
          // The lobby already says why, and it is now redrawn saying it again.
          refreshScreen();
          return;
        }
        rite?.destroy();
        rite = startReveal({
          mount,
          result: outcome.value,
          canRepeat: canPull(outcome.character, banner) === true,
          onAgain: () => {
            rite = null;
            startRite(banner);
          },
          onClose: () => {
            rite = null;
            refreshScreen();
          },
        });
      });
    };

    /** Re-render the screen the player is on, after something they own changed. */
    const refreshScreen = (): void => {
      const id = router.current();
      if (id) router.go(id);
      gearDialog?.update(requireCharacter());
    };

    /** The first-run tour, started once the hero is standing in the tower (§18). */
    let tutorial: Tutorial | null = null;
    const maybeStartTutorial = (): void => {
      if (tutorial || store.get().account?.tutorialCompleted !== false) return;
      tutorial = startTutorial({
        mount,
        onComplete: () => {
          tutorial = null;
          void session.finishTutorial(true).then(refreshScreen);
        },
        onSkip: () => {
          tutorial = null;
          void session.finishTutorial(false);
        },
      });
    };

    const inspectItem = (uid: string): void => {
      gearDialog?.close();
      gearDialog = openGearDialog({
        character: requireCharacter(),
        uid,
        onClose: () => {
          gearDialog = null;
        },
        actions: {
          equip: (id) => void session.equip(id).then(refreshScreen),
          unequip: (id) => {
            const character = requireCharacter();
            const slot = Object.entries(character.equipment).find(
              ([, item]) => item?.uid === id,
            )?.[0];
            if (slot) void session.unequipSlot(slot as EquipSlotId).then(refreshScreen);
          },
          sell: (id) =>
            void session.sell(id).then(() => {
              gearDialog?.close();
              gearDialog = null;
              refreshScreen();
            }),
          upgrade: (id) => void session.upgradeGear(id).then(refreshScreen),
          ascend: (id) => void session.ascendGearPiece(id).then(refreshScreen),
        },
      });
    };

    const leaveCharacter = (): void => {
      void session.leave().then(() => router.go('select'));
    };

    /**
     * Both counters are the same screen with different stock — one shop, two
     * doors. The rail decides which door, so the screen no longer carries a tab
     * strip to choose between them.
     */
    const merchantShell = (id: MerchantId): Shell => {
      return createShell({
        store,
        active: id === 'equipment' ? 'equipmentMerchant' : 'magicMerchant',
        onSwitch: leaveCharacter,
        onNavigate: goTo,
        main: createMerchantScreen({
          character: requireCharacter(),
          merchantId: id,
          now: clock().now(),
          onBuy: (index) => void session.buyFromMerchant(id, index).then(refreshScreen),
          onDrink: (stat) => void session.drinkPotion(stat).then(refreshScreen),
          onReroll: () => void session.rerollMerchant(id).then(refreshScreen),
          onSelectItem: inspectItem,
        }),
      });
    };

    const router: Router<ScreenId> = createRouter<ScreenId>({
      mount,
      routes: {
        title: () =>
          createTitleScreen({
            version: BUILD_VERSION,
            onEnter: () => router.go('select'),
          }),

        select: () =>
          createCharacterSelectScreen({
            store,
            onPlay: (slotId) => {
              void session.play(slotId).then((entered) => router.go(entered ? 'tower' : 'select'));
            },
            onCreate: (slotId) => {
              creatingSlot = slotId;
              router.go('create');
            },
            onReset: (slotId) => {
              const slot = store.get().slots.find((entry) => entry.slotId === slotId);
              if (!slot?.summary) return;
              openResetDialog({
                heroName: slot.summary.name,
                onConfirm: () => {
                  void session.reset(slotId).then(() => router.go('select'));
                },
              });
            },
          }),

        create: () =>
          createHeroCreationScreen({
            store,
            onCreate: ({ name, classId }) => {
              void session.createHero({ slotId: creatingSlot, name, classId }).then((result) => {
                if (result.ok) router.go('tower');
              });
            },
            onCancel: () => router.go('select'),
          }),

        tower: () =>
          createShell({
            store,
            active: 'tower',
            onSwitch: leaveCharacter,
            onNavigate: goTo,
            main: createTowerScreen({
              character: requireCharacter(),
              onFight: startFight,
              onRaid: startRaid,
            }),
          }),

        character: () =>
          createShell({
            store,
            active: 'character',
            onSwitch: leaveCharacter,
            onNavigate: goTo,
            main: createCharacterScreen({
              character: requireCharacter(),
              now: clock().now(),
              onSelectItem: inspectItem,
              onBuyStat: (stat) => void session.buyStat(stat, 1).then(refreshScreen),
              onAscend: () => void session.ascend().then(refreshScreen),
            }),
          }),

        gacha: () =>
          createShell({
            store,
            active: 'gacha',
            onSwitch: leaveCharacter,
            onNavigate: goTo,
            main: createGachaScreen({
              character: requireCharacter(),
              onPull: startRite,
            }),
          }),

        quests: () =>
          createShell({
            store,
            active: 'quests',
            onSwitch: leaveCharacter,
            onNavigate: goTo,
            main: createQuestScreen({
              character: requireCharacter(),
              now: clock().now(),
              onClaim: (cadence, index) =>
                void session.claimQuest(cadence, index).then(refreshScreen),
            }),
          }),

        upgrades: () =>
          createShell({
            store,
            active: 'upgrades',
            onSwitch: leaveCharacter,
            onNavigate: goTo,
            main: createUpgradesScreen({
              account: store.get().account!,
              character: requireCharacter(),
              onBuy: (id) => void session.buyUpgrade(id).then(refreshScreen),
            }),
          }),

        equipmentMerchant: () => merchantShell('equipment'),
        magicMerchant: () => merchantShell('magic'),

        combat: () => {
          const pending = pendingFight;
          if (!pending) throw new Error('[boot] the combat screen needs a resolved fight');
          return createCombatScreen({
            hero: pending.hero,
            result: pending.result,
            speedTier: store.get().account?.battleSpeedTier ?? 0,
            onNextFloor: startFight,
            onRaid: startRaid,
            onBackToTower: () => router.go('tower'),
          });
        },

        raid: () => {
          const pending = pendingRaid;
          if (!pending) throw new Error('[boot] the raid screen needs a resolved raid');
          return createRaidScreen({ result: pending, onContinue: () => router.go('tower') });
        },
      },
      onError: (error) => renderErrorPanel({ mount, error, onReload: reload }),
      // The tour points at real UI, so it can only start once a screen is up.
      onEnter: (id) => {
        if (id === 'tower') maybeStartTutorial();
      },
    });

    // Release the database handle and the session lock when the tab goes away,
    // so reopening the game — or a second window — starts cleanly.
    window.addEventListener(
      'pagehide',
      () => {
        tooltips.destroy();
        save.close();
        lock.release();
      },
      { once: true },
    );

    router.go('title');
  } catch (error) {
    renderErrorPanel({ mount, error, onReload: reload });
  }
}

function reload(): void {
  window.location.reload();
}

const mount = document.querySelector<HTMLElement>('#app');
if (mount) {
  void boot(mount);
} else {
  console.error('[boot] #app mount point is missing from index.html');
}
