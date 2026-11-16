import type { Attachment } from 'svelte/attachments';

const DRAG_THRESHOLD = 5;
const DOUBLE_CLICK_DELAY = 300;

// Calls `onClick` for a deliberate single click/tap only: not when the pointer was dragged,
// not for multi-touch gestures (pinch), and not when the click turns out to be part of a double-click.
export const singleClick =
  (onClick?: () => void): Attachment<HTMLElement> =>
  (node) => {
    let start: { pointerId: number; x: number; y: number } | undefined;
    let suppressNextClick = false;
    let pendingClick: ReturnType<typeof setTimeout> | undefined;
    const activePointers = new Set<number>();

    const clearPendingClick = () => {
      if (pendingClick === undefined) {
        return;
      }

      clearTimeout(pendingClick);
      pendingClick = undefined;
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

      if (event.detail > 1 || suppressNextClick) {
        suppressNextClick = false;
        clearPendingClick();
        return;
      }

      clearPendingClick();
      pendingClick = setTimeout(() => {
        pendingClick = undefined;
        onClick?.();
      }, DOUBLE_CLICK_DELAY);
    };

    const controller = new AbortController();
    const { signal } = controller;
    node.addEventListener('pointerdown', handlePointerDown, { signal });
    node.addEventListener('pointermove', handlePointerMove, { signal });
    node.addEventListener('pointerup', handlePointerEnd, { signal });
    node.addEventListener('pointercancel', handlePointerCancel, { signal });
    node.addEventListener('click', handleClick, { signal });
    node.addEventListener('dblclick', clearPendingClick, { capture: true, signal });

    return () => {
      clearPendingClick();
      controller.abort();
    };
  };
