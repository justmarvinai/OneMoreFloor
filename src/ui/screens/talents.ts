/**
 * The talents screen (Q38; UI_FANTASYUI_MAP §8).
 *
 * A level-up used to be a number going up somewhere in the rail. This is where
 * it becomes a question, so the screen is built around the two facts a player
 * needs before they answer it: **how many points are in hand**, and **what one
 * more rank would actually do**.
 *
 * Every refusal is on the card rather than a hover away (§20.5). A locked row
 * says how many more points open it; an unaffordable rank says how many are
 * missing; a finished talent says it is finished. A greyed button that will not
 * explain itself is the commonest way a progression screen stops teaching.
 */
import { Button, OrnateHeader, Panel, StatChip, commas, h } from '@/ui/fui/index.ts';
import type { FuiComponent } from '@/ui/fui/index.ts';
import { CLASSES } from '@/content/classes/index.ts';
import { talentGlyph } from '@/content/talents/index.ts';
import type { Character } from '@/domain/character/types.ts';
import {
  pointsAvailable,
  pointsEarned,
  pointsSpent,
  respecCost,
  talentTree,
  tierUnlock,
  treeCost,
  TALENT_MAX_RANK,
  type TalentDef,
  type TalentStatus,
} from '@/domain/talents/talents.ts';
import { openRespecDialog } from '@/ui/respecDialog.ts';
import { setTip } from '@/ui/tooltips.ts';
import { t, type StringKey } from '@/strings/index.ts';

export interface TalentsScreenOptions {
  character: Character;
  /** Spend one point on this talent. */
  onLearn: (id: string) => void;
  /** Unlearn the whole tree for gold. */
  onRespec: () => void;
}

export interface TalentsScreen {
  el: HTMLElement;
  destroy(): void;
}

/**
 * What one talent's ranks are worth, in words a player can check.
 *
 * Stat talents read as a share of the stat rather than a flat figure, because
 * that is what they are: the tree scales what the hero has already built rather
 * than handing them a number that would be enormous at level five and invisible
 * at level five hundred.
 */
/** A fraction as the whole number a card prints. */
function percent(value: number): number {
  return Math.round(value * 100);
}

function describe(def: TalentDef, value: number): string {
  if (value <= 0) return t('talent.none');
  switch (def.effect.kind) {
    case 'stat':
      return t('talent.value.stat', {
        percent: percent(value),
        stat: t(`stat.${def.effect.stat}` as StringKey),
      });
    case 'regeneration':
      return t('talent.value.regeneration', { percent: percent(value) });
    case 'damageReduction':
      return t('talent.value.reduction', { percent: percent(value) });
    default:
      return t('talent.value.percent', { percent: percent(value) });
  }
}

export function createTalentsScreen(options: TalentsScreenOptions): TalentsScreen {
  const { character, onLearn, onRespec } = options;
  const parts: FuiComponent[] = [];
  const track = <T extends FuiComponent>(component: T): T => {
    parts.push(component);
    return component;
  };

  const definition = CLASSES[character.identity.classId];
  const tree = talentTree(character);
  const available = pointsAvailable(character);
  const spent = pointsSpent(character);
  const full = treeCost(character.identity.classId);
  const respec = respecCost(character);
  const gold = character.currencies.gold;

  /** The purse strip: points in hand, points committed, and the way back out. */
  function buildLedger(): HTMLElement {
    const strip = h('div', { class: 'omf-talents__ledger' });

    strip.appendChild(
      track(
        new StatChip({
          label: t('talent.available'),
          value: available,
          glyph: 'glyph-holy-totem',
          tone: available > 0 ? 'gold' : 'neutral',
        }),
      ).el,
    );
    strip.appendChild(
      track(
        new StatChip({
          label: t('talent.spent'),
          value: `${commas(spent)} / ${commas(full)}`,
          glyph: 'glyph-spell-book',
          tone: 'neutral',
        }),
      ).el,
    );
    strip.appendChild(
      h('span', {
        class: 'omf-talents__earned',
        text: t('talent.earned', { count: commas(pointsEarned(character)) }),
      }),
    );

    // Unlearning is a real purchase, so it is priced on the button and refused
    // in words rather than by a button that simply does not respond.
    const affordable = respec > 0 && gold >= respec;
    const undo = track(
      new Button({
        label: respec > 0 ? t('talent.respec', { cost: commas(respec) }) : t('talent.respecNone'),
        size: 'sm',
        variant: affordable ? 'primary' : 'ghost',
        disabled: !affordable,
      }),
    );
    undo.el.dataset.testid = 'talent-respec';
    undo.on('click', () => {
      openRespecDialog({ cost: respec, points: spent, onConfirm: onRespec });
    });
    setTip(undo.el, {
      title: t('talent.respecTitle'),
      ...(respec > 0 ? { subtitle: t('talent.respecCost', { cost: commas(respec) }) } : {}),
      flavor:
        respec === 0
          ? t('talent.respecNoneBody')
          : affordable
            ? t('talent.respecBody', { cost: commas(respec), points: commas(spent) })
            : t('talent.respecShort', { missing: commas(respec - gold) }),
    });

    strip.appendChild(h('div', { class: 'omf-talents__undo' }, undo.el));
    return strip;
  }

  /** One talent, as a card that answers "what does the next rank give me?". */
  function buildCard(node: TalentStatus): HTMLElement {
    const maxed = node.cost === null;
    const card = h('div', {
      class: 'omf-talent',
      dataset: {
        testid: `talent-${node.def.id}`,
        maxed: String(maxed),
        locked: String(node.tierLocked),
      },
    });

    card.appendChild(
      h('span', {
        class: 'omf-talent__mark',
        style: { maskImage: `var(--fui-img-${talentGlyph(node.def.effect)})` },
      }),
    );

    const body = h('div', { class: 'omf-talent__body' });
    body.appendChild(h('span', { class: 'omf-talent__name fui-title', text: t(node.def.nameKey) }));
    body.appendChild(
      h('span', {
        class: 'omf-talent__rank',
        text: t('talent.rank', { rank: node.rank, max: TALENT_MAX_RANK }),
      }),
    );
    body.appendChild(h('p', { class: 'omf-talent__desc', text: t(node.def.descriptionKey) }));
    body.appendChild(
      h('p', {
        class: 'omf-talent__now',
        text: t('talent.now', { value: describe(node.def, node.effect) }),
      }),
    );

    // The pips are the tree read at a glance: five for every talent, filled to
    // the rank held, so a specialised build and a spread one look different from
    // across the screen.
    const pips = h('div', { class: 'omf-talent__pips' });
    for (let index = 0; index < TALENT_MAX_RANK; index += 1) {
      pips.appendChild(
        h('span', { class: 'omf-talent__pip', dataset: { on: String(index < node.rank) } }),
      );
    }
    body.appendChild(pips);

    if (maxed) {
      body.appendChild(h('p', { class: 'omf-talent__maxed', text: t('talent.maxed') }));
    } else {
      const cost = node.cost ?? 0;
      const learn = track(
        new Button({
          label: t('talent.learn', { cost }),
          size: 'sm',
          variant: node.learnable ? 'primary' : 'ghost',
          block: true,
          disabled: !node.learnable,
        }),
      );
      learn.on('click', () => onLearn(node.def.id));
      setTip(learn.el, {
        title: t(node.def.nameKey),
        subtitle: t('talent.cost', { cost }),
        stats: [
          { label: t('talent.now', { value: '' }).trim(), value: describe(node.def, node.effect) },
          {
            label: t('talent.next', { value: '' }).trim(),
            value: describe(node.def, node.effect + node.step),
            tone: 'good',
          },
        ],
        flavor: t(node.def.descriptionKey),
      });
      body.appendChild(learn.el);

      // Why not, on the card. Locked first: a row that has not opened yet is a
      // different answer from one the hero cannot afford.
      if (node.tierLocked) {
        body.appendChild(
          h('p', {
            class: 'omf-talent__refusal',
            text: t('talent.tierShort', { missing: node.tierShortfall }),
          }),
        );
      } else if (available < cost) {
        body.appendChild(
          h('p', {
            class: 'omf-talent__refusal',
            text: t('talent.pointsShort', { missing: cost - available }),
          }),
        );
      }
    }

    card.appendChild(body);
    return card;
  }

  /** One row of the tree, headed by what it costs to reach. */
  function buildTier(tier: number, nodes: TalentStatus[]): HTMLElement {
    const open = spent >= tierUnlock(tier);
    const row = h('div', {
      class: 'omf-talents__tier',
      dataset: { tier: String(tier), open: String(open) },
    });

    row.appendChild(
      h(
        'div',
        { class: 'omf-talents__tierHead' },
        h('span', {
          class: 'omf-talents__tierName fui-title',
          text: t('talent.tier', { tier: tier + 1 }),
        }),
        h('span', {
          class: 'omf-talents__tierGate',
          text: open
            ? t('talent.tierOpen', { cost: nodes[0]?.cost ?? 0 })
            : t('talent.tierClosed', { points: tierUnlock(tier) }),
        }),
      ),
    );

    const cards = h('div', { class: 'omf-talents__cards' });
    for (const node of nodes) cards.appendChild(buildCard(node));
    row.appendChild(cards);
    return row;
  }

  const tiers = new Map<number, TalentStatus[]>();
  for (const node of tree) {
    const row = tiers.get(node.def.tier) ?? [];
    row.push(node);
    tiers.set(node.def.tier, row);
  }

  const body = h('div', { class: 'omf-talents', dataset: { testid: 'talents' } }, buildLedger());
  for (const [tier, nodes] of [...tiers.entries()].sort((a, b) => a[0] - b[0])) {
    body.appendChild(buildTier(tier, nodes));
  }

  const panel = track(
    new Panel({
      title: t('talent.title', { class: t(definition.nameKey) }),
      height: '100%',
      scroll: true,
    }),
  );
  panel.setContent(body);

  const el = h(
    'div',
    { class: 'omf-screen omf-talentsScreen' },
    track(new OrnateHeader({ title: t('nav.section.talents'), subtitle: t('talent.subtitle') })).el,
    panel.el,
  );

  return {
    el,
    destroy() {
      for (const part of parts) part.destroy();
      el.remove();
    },
  };
}
