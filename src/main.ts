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
import './styles/app.css';

import { setAssetBase } from './ui/fui/index.ts';
import { createRouter, type Router } from './app/router.ts';
import { createSession } from './app/session.ts';
import { createAppStore, saveLoaded, type AppStore } from './app/state.ts';
import { createClock, setClock } from './app/time.ts';
import { acquireSessionLock } from './save/sessionLock.ts';
import { openSave } from './save/saveLayer.ts';
import type { SlotId } from './domain/character/types.ts';
import { renderErrorPanel, renderLockGate } from './ui/errorPanel.ts';
import { openResetDialog } from './ui/resetDialog.ts';
import { createCharacterSelectScreen } from './ui/screens/characterSelect.ts';
import { createHeroCreationScreen } from './ui/screens/heroCreation.ts';
import { createHubScreen } from './ui/screens/hub.ts';
import { createTitleScreen } from './ui/screens/title.ts';

/** Where the vendored FantasyUI art lives in our own build. */
const ASSET_BASE = '/fui';

const BUILD_VERSION = '0.1.0-dev';

type ScreenId = 'title' | 'select' | 'create' | 'hub';

export async function boot(mount: HTMLElement): Promise<void> {
  setAssetBase(ASSET_BASE);

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
              void session.play(slotId).then((entered) => router.go(entered ? 'hub' : 'select'));
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
                if (result.ok) router.go('hub');
              });
            },
            onCancel: () => router.go('select'),
          }),

        hub: () =>
          createHubScreen({
            store,
            onSwitch: () => {
              void session.leave().then(() => router.go('select'));
            },
          }),
      },
      onError: (error) => renderErrorPanel({ mount, error, onReload: reload }),
    });

    // Release the database handle and the session lock when the tab goes away,
    // so reopening the game — or a second window — starts cleanly.
    window.addEventListener(
      'pagehide',
      () => {
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
