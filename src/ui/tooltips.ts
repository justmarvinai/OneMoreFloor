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
 * Delegation matters: a single set of listeners on the root serves every target,
 * so a fight that builds and discards hundreds of effect chips leaks nothing.
 */
import { Tooltip } from '@/ui/fui/index.ts';

/** Where an adopted native title is parked. */
const TIP_ATTR = 'data-omf-tip';

/**
 * Give an element the game's tooltip. Our own code never sets a native `title`
 * (the lint rule forbids it); this puts the text straight into the channel the
 * service already serves.
 */
export function setTip(element: HTMLElement, text: string): void {
  element.setAttribute(TIP_ATTR, text);
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
  if (text.length > 0) element.setAttribute(TIP_ATTR, text);
}

function adoptTree(root: Element): void {
  adopt(root);
  for (const element of root.querySelectorAll('[title]')) adopt(element);
}

export function installTooltipService(root: HTMLElement): TooltipService {
  const tooltip = new Tooltip({ width: 240 });
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
    }
  });

  const targetOf = (event: Event): HTMLElement | null => {
    const from = event.target;
    return from instanceof Element ? from.closest<HTMLElement>(`[${TIP_ATTR}]`) : null;
  };

  const over = (event: MouseEvent): void => {
    const target = targetOf(event);
    if (!target) return;
    tooltip.render({ title: target.getAttribute(TIP_ATTR) ?? '' });
    tooltip.showAt(event.clientX, event.clientY);
  };

  const move = (event: MouseEvent): void => {
    if (targetOf(event)) tooltip.showAt(event.clientX, event.clientY);
    else tooltip.hide();
  };

  const out = (event: MouseEvent): void => {
    const to = event.relatedTarget;
    if (to instanceof Element && to.closest(`[${TIP_ATTR}]`)) return;
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
