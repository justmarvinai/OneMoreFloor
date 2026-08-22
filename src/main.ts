/**
 * Boot.
 *
 * The sequence is deliberately explicit, because the order matters:
 *
 *  1. Point FantasyUI's art at our own copy — the game must never reach the
 *     network at runtime (ARCHITECTURE §2/§6).
 *  2. Open the save and run any migrations before anything reads game state.
 *  3. Arm the clock with the persisted high-water mark, so rollback damping
 *     survives a restart (SAVE_SCHEMA §7).
 *  4. Build the store, then the router, then enter the first screen.
 *
 * Anything that throws in here lands in the in-game error panel rather than a
 * blank page.
 */
import './ui/fui/styles/index.css';
import './styles/app.css';

import { setAssetBase } from './ui/fui/index.ts';
import { createRouter } from './app/router.ts';
import { createAppStore, saveLoaded, type AppStore } from './app/state.ts';
import { createClock, setClock } from './app/time.ts';
import { openSave } from './save/saveLayer.ts';
import { renderErrorPanel } from './ui/errorPanel.ts';
import { createHubScreen } from './ui/screens/hub.ts';
import { createTitleScreen } from './ui/screens/title.ts';

/** Where the vendored FantasyUI art lives in our own build. */
const ASSET_BASE = '/fui';

const BUILD_VERSION = '0.1.0-dev';

export async function boot(mount: HTMLElement): Promise<void> {
  setAssetBase(ASSET_BASE);

  try {
    const { save, meta } = await openSave();
    setClock(createClock({ lastKnown: meta.record.lastKnownWallClock }));

    const store: AppStore = createAppStore();
    saveLoaded(store, {
      status: meta.status,
      createdAt: meta.record.createdAt,
      lastOpenedAt: meta.record.lastOpenedAt,
    });

    const router = createRouter({
      mount,
      routes: {
        title: () => createTitleScreen({ version: BUILD_VERSION, onEnter: () => router.go('hub') }),
        hub: () => createHubScreen(store),
      },
      onError: (error) => renderErrorPanel({ mount, error, onReload: reload }),
    });

    // Release the database handle when the tab goes away, so a second instance
    // is never fighting this one for the save (SAVE_SCHEMA §8 covers the full
    // multi-instance guard in M1).
    window.addEventListener('pagehide', () => save.close(), { once: true });

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
