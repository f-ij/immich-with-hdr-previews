import type { Attachment } from 'svelte/attachments';

const MAX_SWIPE_DURATION = 300;
const MIN_SWIPE_DISTANCE = 60;

type SwipeOptions = {
  onSwipe?: (event: SwipeEvent) => void;
  touchAction?: string;
};

export type SwipeEvent = CustomEvent<{
  direction: 'left' | 'right';
  pointerType: string;
  target: EventTarget | null;
}>;

type SwipeStart = {
  clientX: number;
  clientY: number;
  pointerId: number;
  target: EventTarget | null;
  timestamp: number;
};

// Horizontal single-pointer swipe detection. Unlike svelte-gestures, any multi-pointer gesture (e.g. a pinch)
// is fully reset once all pointers are released, so swiping keeps working after pinch-zooming.
export const swipe =
  ({ onSwipe, touchAction = 'none' }: SwipeOptions = {}): Attachment<HTMLElement> =>
  (node) => {
    const activePointers = new Set<number>();
    let start: SwipeStart | undefined;

    const onPointerDown = (event: PointerEvent) => {
      activePointers.add(event.pointerId);
      start =
        activePointers.size === 1
          ? {
              clientX: event.clientX,
              clientY: event.clientY,
              pointerId: event.pointerId,
              target: event.target,
              timestamp: Date.now(),
            }
          : undefined;
    };

    const reset = () => {
      activePointers.clear();
      start = undefined;
    };

    const onPointerUp = (event: PointerEvent) => {
      if (!activePointers.delete(event.pointerId) || activePointers.size > 0) {
        return;
      }

      const swipeStart = start;
      start = undefined;
      if (
        !swipeStart ||
        swipeStart.pointerId !== event.pointerId ||
        Date.now() - swipeStart.timestamp >= MAX_SWIPE_DURATION
      ) {
        return;
      }

      const deltaX = event.clientX - swipeStart.clientX;
      const deltaY = event.clientY - swipeStart.clientY;
      const absoluteX = Math.abs(deltaX);
      const absoluteY = Math.abs(deltaY);

      if (absoluteX < 2 * absoluteY || absoluteX <= MIN_SWIPE_DISTANCE) {
        return;
      }

      onSwipe?.(
        new CustomEvent('swipe', {
          detail: {
            direction: deltaX > 0 ? 'right' : 'left',
            pointerType: event.pointerType,
            target: swipeStart.target,
          },
        }),
      );
    };

    const controller = new AbortController();
    const { signal } = controller;
    node.addEventListener('pointerdown', onPointerDown, { signal });
    node.addEventListener('pointerup', onPointerUp, { signal });
    for (const eventName of ['lostpointercapture', 'pointercancel', 'pointerleave'] as const) {
      node.addEventListener(eventName, reset, { signal });
    }

    node.style.touchAction = touchAction;

    return () => controller.abort();
  };
