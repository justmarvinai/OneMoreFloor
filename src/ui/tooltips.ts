/**
 * The tooltip service (Brief §20.4).
 *
 * The brief bans native browser tooltips *anywhere* in the game, and a lint rule
 * enforces that in our own source. Vendored FantasyUI components are a second
 * front: a handful of them (`BuffBar`, `BossHealthBar`, `ResultScreen`,
 * `PowerRating`, `StageTrail`) still set a `title` attribute, and editing them
 * here would be the silent fork the project forbids — fixes go upstream.
 *
 * So the ban is enforced at runtime instead. One observer watches the whole app
 * for `title` attributes, moves each one into a data attribute, and serves it
 * through FantasyUI's own `Tooltip`. The vendored components keep their honest
 * intent — *there is an explanation here* — and the player gets the game's
 * tooltip rather than the browser's.
 *
 * Two kinds of tip go through the one service:
 *
 *  - **A hint** is a sentence explaining a control ("25 gold short"). It renders
 *    as body text, because a sentence set in the display face as a title reads
 *    like a headline for something that has no name.
 *  - **A card** is the full `TooltipOptions` payload a thing with a name gets —
 *    an item's stat block, its rarity tint, what it is worth. Cards live in a
 *    `WeakMap` keyed by the element, so they cost nothing to attach and are
 *    collected with the node.
 *
 * Both write plain text into the data attribute as well. That keeps the tip
 * readable to assistive technology and to the §20.5 test that asserts no control
 * is ever greyed out without saying why.
 *
 * Delegation matters: a single set of listeners on the root serves every target,
 * so a fight that builds and discards hundreds of effect chips leaks nothing.
 */
import { Tooltip, h, type TooltipOptions } from '@/ui/fui/index.ts';

/** Where an adopted native title — or a hint's plain text — is parked. */
const TIP_ATTR = 'data-omf-tip';

/** Full tooltip payloads, keyed by the element they belong to. */
const cards = new WeakMap<HTMLElement, TooltipOptions>();

/**
 * Give an element the game's tooltip. Our own code never sets a native `title`
 * (the lint rule forbids it); this puts the text straight into the channel the
 * service already serves.
 */
export function setTip(element: HTMLElement, tip: string | TooltipOptions): void {
  if (typeof tip === 'string') {
    cards.delete(element);
    element.setAttribute(TIP_ATTR, tip);
    return;
  }
  cards.set(element, tip);
  element.setAttribute(TIP_ATTR, digest(tip));
}

/** The card's text, flattened — for screen readers and for the §20.5 audit. */
function digest(tip: TooltipOptions): string {
  const parts: string[] = [];
  if (tip.title) parts.push(tip.title);
  if (tip.subtitle) parts.push(tip.subtitle);
  if (tip.slotLabel) parts.push(tip.slotLabel);
  for (const stat of tip.stats ?? []) {
    parts.push(String(stat.value).length > 0 ? `${stat.label} ${stat.value}` : stat.label);
  }
  for (const line of tip.requires ?? []) parts.push(line);
  if (tip.hint) parts.push(tip.hint);
  return parts.join(' · ');
}

export interface TooltipService {
  /** Adopt any titles present right now — for content built before the observer. */
  sweep(): void;
  destroy(): void;
}

function adopt(element: Element): void {
  const text = element.getAttribute('title');
  if (text === null) return;
  element.removeAttribute('title');
  // An empty title carries nothing; dropping it is the whole fix.
  if (text.length > 0 && !element.hasAttribute(TIP_ATTR)) element.setAttribute(TIP_ATTR, text);
}

function adoptTree(root: Element): void {
  adopt(root);
  for (const element of root.querySelectorAll('[title]')) adopt(element);
}

export function installTooltipService(root: HTMLElement): TooltipService {
  const tooltip = new Tooltip({ width: 268 });
  root.ownerDocument.body.appendChild(tooltip.el);

  const observer = new MutationObserver((records) => {
    for (const record of records) {
      if (record.type === 'attributes' && record.target instanceof Element) {
        adopt(record.target);
        continue;
      }
      for (const node of record.addedNodes) {
        if (node instanceof Element) adoptTree(node);
      }
      // A screen that swaps out from under the cursor never fires `mouseout`,
      // so the tooltip for whatever was there would hang over the new screen.
      if (record.removedNodes.length > 0) tooltip.hide();
    }
  });

  const targetOf = (event: Event): HTMLElement | null => {
    const from = event.target;
    return from instanceof Element ? from.closest<HTMLElement>(`[${TIP_ATTR}]`) : null;
  };

  /**
   * `Tooltip.render` only draws the keys it is handed, so nothing carries over
   * between two payloads — except the rarity tint, which lives on the root as a
   * data attribute. Clear it first, or a common hint keeps the last legendary's
   * gold edge.
   */
  const show = (target: HTMLElement): void => {
    delete tooltip.el.dataset.rarity;
    const card = cards.get(target);
    if (card) {
      tooltip.render(card);
      return;
    }
    const text = target.getAttribute(TIP_ATTR) ?? '';
    tooltip.render({ content: h('p', { class: 'omf-tip__hint', text }) });
  };

  let shown: HTMLElement | null = null;

  const over = (event: MouseEvent): void => {
    const target = targetOf(event);
    if (!target) return;
    if (target !== shown) {
      shown = target;
      show(target);
    }
    tooltip.showAt(event.clientX, event.clientY);
  };

  const move = (event: MouseEvent): void => {
    const target = targetOf(event);
    if (!target) {
      shown = null;
      tooltip.hide();
      return;
    }
    if (target !== shown) {
      shown = target;
      show(target);
    }
    tooltip.showAt(event.clientX, event.clientY);
  };

  const out = (event: MouseEvent): void => {
    const to = event.relatedTarget;
    if (to instanceof Element && to.closest(`[${TIP_ATTR}]`)) return;
    shown = null;
    tooltip.hide();
  };

  root.addEventListener('mouseover', over);
  root.addEventListener('mousemove', move);
  root.addEventListener('mouseout', out);
  observer.observe(root, { subtree: true, childList: true, attributeFilter: ['title'] });
  adoptTree(root);

  return {
    sweep: () => adoptTree(root),
    destroy() {
      observer.disconnect();
      root.removeEventListener('mouseover', over);
      root.removeEventListener('mousemove', move);
      root.removeEventListener('mouseout', out);
      tooltip.destroy();
    },
  };
}
