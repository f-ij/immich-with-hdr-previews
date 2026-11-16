import { swipe } from '#lib/actions/swipe.ts';

const dispatchPointer = (node: HTMLElement, type: string, pointerId: number, clientX: number) => {
  node.dispatchEvent(
    new PointerEvent(type, {
      clientX,
      clientY: 100,
      pointerId,
      pointerType: 'touch',
    }),
  );
};

describe('swipe', () => {
  it('recognizes a swipe after a canceled multi-pointer gesture', () => {
    const node = document.createElement('div');
    const onSwipe = vi.fn();
    const cleanup = swipe({ onSwipe })(node);

    dispatchPointer(node, 'pointerdown', 1, 100);
    dispatchPointer(node, 'pointerdown', 2, 200);
    dispatchPointer(node, 'pointercancel', 1, 100);
    dispatchPointer(node, 'pointercancel', 2, 200);
    expect(onSwipe).not.toHaveBeenCalled();

    dispatchPointer(node, 'pointerdown', 3, 200);
    dispatchPointer(node, 'pointerup', 3, 100);

    expect(onSwipe).toHaveBeenCalledOnce();
    expect(onSwipe.mock.calls[0][0].detail.direction).toBe('left');
    cleanup?.();
  });

  it('applies the touch action', () => {
    const panY = document.createElement('div');
    swipe({ touchAction: 'pan-y' })(panY);
    expect(panY.style.touchAction).toBe('pan-y');

    const fallback = document.createElement('div');
    swipe()(fallback);
    expect(fallback.style.touchAction).toBe('none');
  });

  it('stops listening after cleanup', () => {
    const node = document.createElement('div');
    const onSwipe = vi.fn();
    const cleanup = swipe({ onSwipe })(node);
    cleanup?.();

    dispatchPointer(node, 'pointerdown', 1, 200);
    dispatchPointer(node, 'pointerup', 1, 100);

    expect(onSwipe).not.toHaveBeenCalled();
  });
});
