/**
 * Dragging a piece of gear from one place to another.
 *
 * The browser's own drag payload is a string, and FantasyUI's `Slot` puts the
 * source *index* in it — which is enough to reorder one grid and not enough for
 * anything else. A drop on a paperdoll socket needs to know which item was
 * picked up and where from; a drop on a merchant needs the same. So the payload
 * lives here, in one module, for the length of a drag.
 *
 * This is a plain module variable rather than state in the store because it is
 * not state: nothing is saved, nothing re-renders, and it is gone the moment the
 * mouse comes up. Putting it through the store would make a transient pointer
 * gesture part of the game's persisted shape (ARCHITECTURE §3).
 */
import type { EquipSlotId } from '@/domain/character/types.ts';

export interface ItemDrag {
  /** The item being dragged. */
  uid: string;
  /** Where it came from — a backpack cell, or the socket it is worn in. */
  from: 'backpack' | 'worn';
  /** The socket it was worn in, when it came off the paperdoll. */
  slot?: EquipSlotId;
}

let dragging: ItemDrag | null = null;

/** Class put on `<body>` while a drag is running, so targets can light up. */
const DRAG_CLASS = 'omf-dragging';

export function beginItemDrag(payload: ItemDrag): void {
  dragging = payload;
  document.body.classList.add(DRAG_CLASS);
}

export function currentItemDrag(): ItemDrag | null {
  return dragging;
}

export function endItemDrag(): void {
  dragging = null;
  document.body.classList.remove(DRAG_CLASS);
}

/**
 * Make an element a source: pick it up, and always put it down again.
 *
 * `dragend` fires whatever the drag did — dropped, cancelled, escaped — which is
 * what keeps a stale payload from outliving the gesture.
 */
export function makeItemDraggable(el: HTMLElement, payload: () => ItemDrag): () => void {
  const start = (event: DragEvent): void => {
    const drag = payload();
    beginItemDrag(drag);
    // Something has to be in the transfer or Firefox refuses to start the drag.
    event.dataTransfer?.setData('text/plain', drag.uid);
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
    el.classList.add('is-dragging');
  };
  const end = (): void => {
    el.classList.remove('is-dragging');
    endItemDrag();
  };

  el.draggable = true;
  el.addEventListener('dragstart', start);
  el.addEventListener('dragend', end);

  return () => {
    el.draggable = false;
    el.removeEventListener('dragstart', start);
    el.removeEventListener('dragend', end);
  };
}

export interface DropTargetOptions {
  /** Whether this target will take the drag currently in hand. */
  accepts?: (drag: ItemDrag) => boolean;
  /** What to do with it. */
  onDrop: (drag: ItemDrag) => void;
}

/**
 * Make an element a target.
 *
 * A target that refuses only on drop teaches nothing; `accepts` is checked on
 * every `dragover` so the element can say *before* the mouse comes up whether it
 * will take this. Refusals still land — a target that accepts nothing is not the
 * same as a target that says why (§20.5), so `onDrop` is called either way and
 * the screen decides what to tell the player.
 */
export function makeDropTarget(el: HTMLElement, options: DropTargetOptions): () => void {
  const over = (event: DragEvent): void => {
    const drag = currentItemDrag();
    if (!drag) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    el.classList.add(options.accepts?.(drag) === false ? 'is-drop-refused' : 'is-drop-target');
  };
  const leave = (): void => {
    el.classList.remove('is-drop-target', 'is-drop-refused');
  };
  const drop = (event: DragEvent): void => {
    const drag = currentItemDrag();
    leave();
    if (!drag) return;
    event.preventDefault();
    event.stopPropagation();
    options.onDrop(drag);
  };

  el.addEventListener('dragover', over);
  el.addEventListener('dragleave', leave);
  el.addEventListener('drop', drop);

  return () => {
    el.removeEventListener('dragover', over);
    el.removeEventListener('dragleave', leave);
    el.removeEventListener('drop', drop);
  };
}
