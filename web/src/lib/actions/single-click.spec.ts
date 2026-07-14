import { fireEvent } from '@testing-library/svelte';
import { singleClick } from './single-click';

describe('singleClick', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('handles a single click after the double-click window', async () => {
    const node = document.createElement('div');
    const onClick = vi.fn();
    singleClick(node, onClick);

    await fireEvent.click(node, { detail: 1 });
    expect(onClick).not.toHaveBeenCalled();

    await vi.runAllTimersAsync();
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('ignores a click after dragging', async () => {
    const node = document.createElement('div');
    const onClick = vi.fn();
    singleClick(node, onClick);

    await fireEvent.pointerDown(node, { pointerId: 1, button: 0, clientX: 10, clientY: 10 });
    await fireEvent.pointerMove(node, { pointerId: 1, clientX: 30, clientY: 10 });
    await fireEvent.pointerUp(node, { pointerId: 1, button: 0, clientX: 30, clientY: 10 });
    await fireEvent.click(node, { detail: 1 });
    await vi.runAllTimersAsync();

    expect(onClick).not.toHaveBeenCalled();
  });

  it('ignores clicks that form a double-click', async () => {
    const node = document.createElement('div');
    const onClick = vi.fn();
    singleClick(node, onClick);

    await fireEvent.click(node, { detail: 1 });
    await fireEvent.click(node, { detail: 2 });
    await fireEvent.dblClick(node, { detail: 2 });
    await vi.runAllTimersAsync();

    expect(onClick).not.toHaveBeenCalled();
  });

  it('clears a pending click when destroyed', async () => {
    const node = document.createElement('div');
    const onClick = vi.fn();
    const action = singleClick(node, onClick);

    await fireEvent.click(node, { detail: 1 });
    action?.destroy?.();
    await vi.runAllTimersAsync();

    expect(onClick).not.toHaveBeenCalled();
  });
});
