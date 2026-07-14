import { swipe } from '$lib/actions/swipe';

const dispatchPointer = (node: HTMLElement, type: string, pointerId: number, clientX: number, clientY: number) => {
  node.dispatchEvent(
    new PointerEvent(type, {
      clientX,
      clientY,
      pointerId,
      pointerType: 'touch',
    }),
  );
};

describe(swipe.name, () => {
  it('recognizes a swipe after a canceled multi-pointer gesture', () => {
    const node = document.createElement('div');
    const onSwipe = vi.fn();
    const action = swipe(node, { onSwipe });

    dispatchPointer(node, 'pointerdown', 1, 100, 100);
    dispatchPointer(node, 'pointerdown', 2, 200, 100);
    dispatchPointer(node, 'pointercancel', 1, 100, 100);
    dispatchPointer(node, 'pointercancel', 2, 200, 100);
    expect(onSwipe).not.toHaveBeenCalled();

    dispatchPointer(node, 'pointerdown', 3, 200, 100);
    dispatchPointer(node, 'pointerup', 3, 100, 100);

    expect(onSwipe).toHaveBeenCalledOnce();
    expect(onSwipe.mock.calls[0][0].detail.direction).toBe('left');
    action?.destroy?.();
  });

  it('applies touch action updates', () => {
    const node = document.createElement('div');
    const action = swipe(node, { touchAction: 'pan-y' });

    expect(node.style.touchAction).toBe('pan-y');
    action?.update?.({ touchAction: 'none' });
    expect(node.style.touchAction).toBe('none');
    action?.destroy?.();
  });
});
