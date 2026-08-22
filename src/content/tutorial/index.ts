/**
 * The tutorial (Brief §18, CONTENT_PIPELINE §2).
 *
 * Ordered step data, not code: each step names the UI it points at, what it
 * says, and nothing else. Reordering the tour, rewording it or adding a step is
 * a data edit — which is the whole point of §2.3, and the reason the sequence
 * can be tuned after the first playtest without touching the sequencer.
 *
 * The tour runs on the tower screen, where a new hero lands, so every anchor
 * below is something already on that screen. A step with no anchor is a
 * full-screen beat: the opening, and the one about dying.
 */
import type { StringKey } from '@/strings/index.ts';

export interface TutorialStep {
  id: string;
  titleKey: StringKey;
  bodyKey: StringKey;
  /** CSS selector for the element to spotlight. Omit for a full-screen beat. */
  anchor?: string;
  /** `circle` suits a nav icon; `rect` suits a panel. */
  shape?: 'rect' | 'circle';
}

export const TUTORIAL_STEPS: readonly TutorialStep[] = [
  {
    id: 'tutorial.welcome',
    titleKey: 'tutorial.welcome.title',
    bodyKey: 'tutorial.welcome.body',
  },
  {
    id: 'tutorial.tower',
    titleKey: 'tutorial.tower.title',
    bodyKey: 'tutorial.tower.body',
    anchor: '[data-testid="floor-preview"]',
    shape: 'rect',
  },
  {
    id: 'tutorial.death',
    titleKey: 'tutorial.death.title',
    bodyKey: 'tutorial.death.body',
  },
  {
    id: 'tutorial.character',
    titleKey: 'tutorial.character.title',
    bodyKey: 'tutorial.character.body',
    anchor: '[data-nav-id="character"]',
    shape: 'rect',
  },
  {
    id: 'tutorial.merchant',
    titleKey: 'tutorial.merchant.title',
    bodyKey: 'tutorial.merchant.body',
    anchor: '[data-nav-id="merchants"]',
    shape: 'rect',
  },
  {
    id: 'tutorial.quests',
    titleKey: 'tutorial.quests.title',
    bodyKey: 'tutorial.quests.body',
    anchor: '[data-nav-id="quests"]',
    shape: 'rect',
  },
];
