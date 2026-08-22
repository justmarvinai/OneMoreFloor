/**
 * The fight, and what comes after it (Brief §4.1–§4.2, COMBAT.md §7–§8).
 *
 * The screen owns three moments in sequence: the performance, the verdict, and
 * the way back into the tower. Nothing here decides anything — the fight was
 * resolved and saved before this screen existed, so a player who closes the tab
 * mid-animation loses the animation and nothing else (COMBAT.md §1).
 */
import {
  Button,
  DeathScreen,
  LevelUpModal,
  LootWindow,
  Panel,
  ResultScreen,
  StatChip,
  h,
  type ResultReward,
} from '@/ui/fui/index.ts';
import type { FuiComponent } from '@/ui/fui/index.ts';
import type { BattleSpeedTier, Character } from '@/domain/character/types.ts';
import type { FloorResult } from '@/domain/tower/run.ts';
import { BATTLE_SPEED_BY_TIER } from '@/content/balance/account.ts';
import { CLASSES } from '@/content/classes/index.ts';
import { CombatStage } from '@/ui/combat/combatStage.ts';
import { lootCards, rewardChips } from '@/ui/loot.ts';
import { setTip } from '@/ui/tooltips.ts';
import { t } from '@/strings/index.ts';

export interface CombatScreenOptions {
  /** The hero as they entered the fight — the result carries them as they left it. */
  hero: Character;
  result: FloorResult;
  speedTier: BattleSpeedTier;
  /** Climb straight into the next floor — the loop the game is named after. */
  onNextFloor: (floor: number) => void;
  /** Quick-Raid back up after a death (Brief §3.4, Q8). */
  onRaid: (throughFloor: number) => void;
  onBackToTower: () => void;
}

export interface CombatScreen {
  el: HTMLElement;
  destroy(): void;
}

export function createCombatScreen(options: CombatScreenOptions): CombatScreen {
  const { hero, result, speedTier, onNextFloor, onRaid, onBackToTower } = options;
  const parts: FuiComponent[] = [];
  const track = <T extends FuiComponent>(component: T): T => {
    parts.push(component);
    return component;
  };

  const rate = BATTLE_SPEED_BY_TIER[speedTier];
  const enemyName = t(result.generated.enemy.nameKey);
  const aftermath = h('div', { class: 'omf-combat__aftermath' });

  const stage = new CombatStage({
    script: result.script,
    heroName: hero.identity.name,
    heroLevel: hero.progression.level,
    enemyName,
    rate,
    onFinished: () => showAftermath(),
  });

  const skip = track(
    new Button({ label: t('combat.skip'), variant: 'ghost', icon: 'icon-scroll' }),
  );
  skip.on('click', () => stage.skip());

  const speed = track(
    new StatChip({
      label: t('combat.speed'),
      value: t('combat.speedTier', { rate }),
      glyph: 'glyph-hourglass',
      tone: speedTier > 0 ? 'gold' : 'neutral',
      size: 'sm',
    }),
  );
  // §20.5: the number always says what would change it, rather than going quiet.
  setTip(
    speed.el,
    speedTier === 3
      ? t('combat.speedCurrent', { rate })
      : t('combat.speedLocked', { rate: BATTLE_SPEED_BY_TIER[nextTier(speedTier)] }),
  );

  // The log is a drawer, not a column (COMBAT.md §7 calls it collapsible): the
  // arena gets the whole screen, and the "why did I lose" read is one click away.
  const log = track(
    new Panel({
      title: t('combat.log.title'),
      variant: 'default',
      width: '100%',
      height: '100%',
      scroll: false,
      bodyPad: '6px',
      content: [stage.logEl],
    }),
  );

  const drawer = h('aside', { class: 'omf-fight__log', dataset: { open: 'false' } }, log.el);
  const logToggle = track(
    new Button({ label: t('combat.log.show'), variant: 'ghost', icon: 'icon-scroll' }),
  );
  logToggle.on('click', () => {
    const open = drawer.dataset.open !== 'true';
    drawer.dataset.open = String(open);
    logToggle.setLabel(open ? t('combat.log.hide') : t('combat.log.show'));
  });

  const el = h(
    'div',
    { class: 'omf-fight', dataset: { fuiTheme: 'dark-ember', testid: 'combat-screen' } },
    h(
      'div',
      { class: 'omf-fight__main' },
      stage.el,
      h('div', { class: 'omf-fight__controls' }, speed.el, logToggle.el, skip.el),
    ),
    drawer,
    aftermath,
  );

  let shown = false;
  function showAftermath(): void {
    if (shown) return;
    shown = true;
    skip.setDisabled(true);
    el.classList.add('is-over');
    // A level-up gets the beat to itself, *before* the verdict. Laying it over
    // the result would put a celebration on top of the buttons the player is
    // already reaching for — and swallow the click they aimed at them.
    if (result.levelsGained > 0) celebrate(showVerdict);
    else showVerdict();
  }

  function showVerdict(): void {
    aftermath.appendChild(result.cleared ? victory() : defeat());
  }

  function victory(): HTMLElement {
    const reward = result.reward;
    const rewards: ResultReward[] = reward ? rewardChips(reward) : [];
    const items = reward?.items ?? [];
    const newBest = result.floor === result.character.tower.highestFloorEverCleared;

    const screen = track(
      new ResultScreen({
        outcome: 'victory',
        title: result.isBoss
          ? t('result.victoryBoss', { floor: result.floor })
          : t('result.victory', { floor: result.floor }),
        subtitle: t('result.subtitle', { name: enemyName, rounds: result.script.outcome.rounds }),
        stats: [
          { label: t('result.rounds'), value: result.script.outcome.rounds },
          { label: t('result.healthLeft'), value: result.script.outcome.heroHpRemaining },
          ...(newBest ? [{ label: t('result.newBest'), value: result.floor, best: true }] : []),
        ],
        rewards,
        xp: reward?.xp ?? 0,
        gold: reward?.gold ?? 0,
        actions: [
          { id: 'next', label: t('result.next'), primary: true },
          { id: 'back', label: t('result.back') },
        ],
      }),
    );
    screen.on<{ id: string }>('result:action', ({ id }) => {
      if (id === 'next') onNextFloor(result.character.tower.currentRunFloor);
      else onBackToTower();
    });

    if (items.length === 0) return screen.el;

    const loot = track(
      new LootWindow({
        title: t('loot.title'),
        source: enemyName,
        items: lootCards(items),
        takeAllLabel: t('loot.take'),
        width: 380,
      }),
    );
    return h('div', { class: 'omf-result' }, screen.el, loot.el);
  }

  function defeat(): HTMLElement {
    const best = result.character.tower.highestFloorEverCleared;
    const screen = track(
      new DeathScreen({
        title: t('death.title'),
        subtitle: t('death.subtitle', { floor: result.floor }),
        killedBy: enemyName,
        height: '100%',
        stats: [
          { label: t('death.reached'), value: result.floor },
          { label: t('death.best'), value: best },
        ],
        content: [
          h('p', { class: 'omf-death__kept fui-title', text: t('death.kept') }),
          h('p', { class: 'omf-death__detail', text: t('death.keptDetail') }),
        ],
        quitLabel: best > 0 ? t('death.raid', { floor: best }) : t('death.raidNone'),
      }),
    );
    screen.on('death:quit', () => {
      if (best > 0) onRaid(best);
      else onBackToTower();
    });
    return screen.el;
  }

  function celebrate(then: () => void): void {
    const definition = CLASSES[result.character.identity.classId];
    // Tracked as well as self-destroying, so leaving the screen mid-celebration
    // tears it down like everything else (destroy is idempotent).
    const modal = track(
      new LevelUpModal({
        level: result.character.progression.level,
        title: t('result.levelUp', { level: result.character.progression.level }),
        subtitle: t(definition.nameKey),
        confirmLabel: t('combat.continue'),
      }),
    );
    modal.on('levelup:confirm', () => {
      // Destroyed rather than merely closed: a modal fading out still swallows
      // clicks aimed at whatever is behind it.
      modal.destroy();
      then();
    });
    modal.open(aftermath);
  }

  stage.play();

  return {
    el,
    destroy() {
      stage.destroy();
      for (const part of parts) part.destroy();
      el.remove();
    },
  };
}

/** The next Battle Speed tier up, saturating at the top (Brief §15.1). */
function nextTier(tier: BattleSpeedTier): BattleSpeedTier {
  return tier === 3 ? 3 : ((tier + 1) as BattleSpeedTier);
}
