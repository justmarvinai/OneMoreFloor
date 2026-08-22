/**
 * The tutorial tour (Brief §18).
 *
 * A sequencer, not a screen: it runs *over* the tower the player has already
 * landed on, spotlighting real UI rather than describing it in the abstract.
 * Teaching the loop by pointing at the loop is the difference between a player
 * who knows where the merchants are and one who read that merchants exist.
 *
 * It is skippable, and the skip button says what skipping costs (§18's "gently
 * discourage"). A nudge that names the forfeited Lucky Ticket does more than a
 * confirmation dialog nagging someone who has already decided.
 */
import { RewardPopup, TutorialMask } from '@/ui/fui/index.ts';
import type { FuiComponent } from '@/ui/fui/index.ts';
import { TUTORIAL_STEPS } from '@/content/tutorial/index.ts';
import { TUTORIAL_REWARD } from '@/content/balance/account.ts';
import { t } from '@/strings/index.ts';

export interface TutorialOptions {
  /** Where the mask mounts — the app root, over whatever screen is showing. */
  mount: HTMLElement;
  /** Called when the player finishes the tour and takes the reward (§18). */
  onComplete: () => void;
  /** Called when they skip. No reward: the reward is for completing. */
  onSkip: () => void;
}

export interface Tutorial {
  destroy(): void;
}

export function startTutorial(options: TutorialOptions): Tutorial {
  const { mount, onComplete, onSkip } = options;
  const parts: FuiComponent[] = [];
  let index = 0;
  let done = false;

  const teardown = (): void => {
    for (const part of parts) part.destroy();
    parts.length = 0;
  };

  const finish = (skipped: boolean): void => {
    if (done) return;
    done = true;
    teardown();
    if (skipped) {
      onSkip();
      return;
    }

    const popup = new RewardPopup({
      title: t('tutorial.reward.title'),
      subtitle: t('tutorial.reward.body'),
      items: [
        { art: 'icon-star', name: t('currency.luckyTickets'), qty: TUTORIAL_REWARD.luckyTickets },
        { art: 'icon-coins', name: t('currency.gold'), qty: TUTORIAL_REWARD.gold },
      ],
      action: t('tutorial.take'),
      backdrop: true,
      stagger: true,
    });
    parts.push(popup);
    popup.on('reward:claim', () => {
      teardown();
      onComplete();
    });
    popup.mount(mount);
  };

  const show = (): void => {
    teardown();
    const step = TUTORIAL_STEPS[index];
    if (!step) {
      finish(false);
      return;
    }

    const last = index === TUTORIAL_STEPS.length - 1;
    const mask = new TutorialMask({
      title: t(step.titleKey),
      body: t(step.bodyKey),
      ...(step.anchor ? { target: step.anchor } : {}),
      shape: step.shape ?? 'rect',
      pad: 10,
      step: index + 1,
      steps: TUTORIAL_STEPS.length,
      nextLabel: last ? t('tutorial.finish') : t('tutorial.next'),
      skipLabel: t('tutorial.skip'),
    });
    parts.push(mask);

    mask.on('tutorial:next', () => {
      index += 1;
      show();
    });
    mask.on('tutorial:skip', () => finish(true));
    mask.on('tutorial:close', () => finish(true));
    mask.mount(mount);
  };

  show();

  return {
    destroy() {
      done = true;
      teardown();
    },
  };
}
