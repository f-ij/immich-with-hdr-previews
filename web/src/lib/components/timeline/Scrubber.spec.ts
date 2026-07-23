import { render } from '@testing-library/svelte';
import Scrubber from '$lib/components/timeline/Scrubber.svelte';
import type { TimelineManager } from '$lib/managers/timeline-manager/timeline-manager.svelte';

const dispatchTouch = (element: HTMLElement, type: string, clientY: number) => {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'touches', {
    value: [{ clientX: 10, clientY }],
  });
  element.dispatchEvent(event);
  return event;
};

describe('Scrubber', () => {
  afterEach(() => {
    Reflect.deleteProperty(document, 'elementsFromPoint');
  });

  it('prevents a scrub drag from panning the page', () => {
    const timelineManager = {
      scrolling: false,
      scrubberTimelineHeight: 1000,
      scrubberMonths: [{ height: 1000, assetCount: 1, year: 2026, month: 1, title: 'January 2026' }],
    } as unknown as TimelineManager;
    const onScrub = vi.fn();
    const { container } = render(Scrubber, { timelineManager, height: 400, onScrub });
    const scrubber = container.querySelector<HTMLElement>('[data-id="scrubber"]')!;
    Object.defineProperty(document, 'elementsFromPoint', {
      configurable: true,
      value: vi.fn(() => [scrubber]),
    });

    const touchStart = dispatchTouch(scrubber, 'touchstart', 100);
    const touchMove = dispatchTouch(scrubber, 'touchmove', 120);

    expect(touchStart.defaultPrevented).toBe(true);
    expect(touchMove.defaultPrevented).toBe(true);
    expect(onScrub).toHaveBeenCalled();
  });
});
