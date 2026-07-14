import type { Action } from 'svelte/action';

const DRAG_THRESHOLD = 5;
const DOUBLE_CLICK_DELAY = 300;

export const singleClick: Action<HTMLElement, (() => void) | undefined> = (node, onClick) => {
  let callback = onClick;
  let start: { pointerId: number; x: number; y: number } | undefined;
  let suppressNextClick = false;
  let pendingClick: ReturnType<typeof setTimeout> | undefined;
  const activePointers = new Set<number>();

  const clearPendingClick = () => {
    if (pendingClick !== undefined) {
      clearTimeout(pendingClick);
      pendingClick = undefined;
    }
  };

  const exceedsDragThreshold = (event: PointerEvent) =>
    !!start &&
    (Math.abs(event.clientX - start.x) > DRAG_THRESHOLD || Math.abs(event.clientY - start.y) > DRAG_THRESHOLD);

  const handlePointerDown = (event: PointerEvent) => {
    activePointers.add(event.pointerId);
    if (activePointers.size > 1 || event.button !== 0) {
      start = undefined;
      suppressNextClick = true;
      clearPendingClick();
      return;
    }

    start = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
    suppressNextClick = false;
  };

  const handlePointerMove = (event: PointerEvent) => {
    if (event.pointerId === start?.pointerId && exceedsDragThreshold(event)) {
      suppressNextClick = true;
    }
  };

  const handlePointerEnd = (event: PointerEvent) => {
    activePointers.delete(event.pointerId);
    if (event.pointerId !== start?.pointerId) {
      return;
    }

    suppressNextClick ||= exceedsDragThreshold(event);
    start = undefined;
  };

  const handlePointerCancel = (event: PointerEvent) => {
    activePointers.delete(event.pointerId);
    start = undefined;
    suppressNextClick = true;
    clearPendingClick();
  };

  const handleClick = (event: MouseEvent) => {
    if (event.button !== 0 || event.defaultPrevented) {
      return;
    }

    if (event.detail > 1) {
      suppressNextClick = false;
      clearPendingClick();
      return;
    }

    if (suppressNextClick) {
      suppressNextClick = false;
      clearPendingClick();
      return;
    }

    clearPendingClick();
    pendingClick = setTimeout(() => {
      pendingClick = undefined;
      callback?.();
    }, DOUBLE_CLICK_DELAY);
  };

  node.addEventListener('pointerdown', handlePointerDown);
  node.addEventListener('pointermove', handlePointerMove);
  node.addEventListener('pointerup', handlePointerEnd);
  node.addEventListener('pointercancel', handlePointerCancel);
  node.addEventListener('click', handleClick);
  node.addEventListener('dblclick', clearPendingClick, { capture: true });

  return {
    update(newOnClick) {
      callback = newOnClick;
    },
    destroy() {
      clearPendingClick();
      node.removeEventListener('pointerdown', handlePointerDown);
      node.removeEventListener('pointermove', handlePointerMove);
      node.removeEventListener('pointerup', handlePointerEnd);
      node.removeEventListener('pointercancel', handlePointerCancel);
      node.removeEventListener('click', handleClick);
      node.removeEventListener('dblclick', clearPendingClick, { capture: true });
    },
  };
};
