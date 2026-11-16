import { singleClick } from '#lib/actions/single-click.ts';

const click = (node: HTMLElement, detail: number) =>
  node.dispatchEvent(new MouseEvent('click', { bubbles: true, button: 0, detail }));
const pointer = (node: HTMLElement, type: string, clientX: number) =>
  node.dispatchEvent(new PointerEvent(type, { bubbles: true, pointerId: 1, button: 0, clientX, clientY: 10 }));

describe('singleClick', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('handles a single click after the double-click window', async () => {
    const node = document.createElement('div');
    const onClick = vi.fn();
    singleClick(onClick)(node);

    click(node, 1);
    expect(onClick).not.toHaveBeenCalled();

    await vi.runAllTimersAsync();
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('ignores a click after dragging', async () => {
    const node = document.createElement('div');
    const onClick = vi.fn();
    singleClick(onClick)(node);

    pointer(node, 'pointerdown', 10);
    pointer(node, 'pointermove', 30);
    pointer(node, 'pointerup', 30);
    click(node, 1);
    await vi.runAllTimersAsync();

    expect(onClick).not.toHaveBeenCalled();
  });

  it('ignores clicks that form a double-click', async () => {
    const node = document.createElement('div');
    const onClick = vi.fn();
    singleClick(onClick)(node);

    click(node, 1);
    click(node, 2);
    node.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, detail: 2 }));
    await vi.runAllTimersAsync();

    expect(onClick).not.toHaveBeenCalled();
  });

  it('clears a pending click on cleanup', async () => {
    const node = document.createElement('div');
    const onClick = vi.fn();
    const cleanup = singleClick(onClick)(node);

    click(node, 1);
    cleanup?.();
    await vi.runAllTimersAsync();

    expect(onClick).not.toHaveBeenCalled();
  });
});
