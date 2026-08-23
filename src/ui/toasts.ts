/**
 * The notification corner.
 *
 * One `ToastStack` for the whole game, installed at boot beside the tooltip
 * service, because a message about something that just happened has to outlive
 * the screen it happened on: dropping a piece on a socket it cannot go in
 * rebuilds the character sheet, and a refusal rendered *into* that sheet would be
 * destroyed in the same beat it was created.
 *
 * Refusals are the reason this exists (§20.5). A drag that lands somewhere it is
 * not allowed has no button to grey out and no tooltip to hang the explanation
 * on — without a toast it would simply do nothing, which is the one thing a
 * refusal is not allowed to do.
 */
import { ToastStack } from '@/ui/fui/index.ts';

let stack: ToastStack | null = null;

export interface ToastService {
  destroy(): void;
}

export function installToastService(root: HTMLElement): ToastService {
  stack = new ToastStack({ position: 'top-center', max: 3 });
  root.ownerDocument.body.appendChild(stack.el);
  return {
    destroy() {
      stack?.destroy();
      stack = null;
    },
  };
}

/** Something went well — a piece equipped, a sale made. */
export function notify(title: string, text?: string): void {
  stack?.push({ title, ...(text === undefined ? {} : { text }), tone: 'success' });
}

/** Something was refused, and this is why. */
export function refuse(title: string, text?: string): void {
  stack?.push({ title, ...(text === undefined ? {} : { text }), tone: 'warn' });
}
