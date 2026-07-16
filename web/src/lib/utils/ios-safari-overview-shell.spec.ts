import { enableIphoneSafariOverviewShell } from '$lib/utils/ios-safari-overview-shell';

const iphoneSafari = {
  userAgent:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 Version/26.0 Mobile/15E148 Safari/604.1',
  standalone: false,
  displayModeStandalone: false,
};

const addTimeline = () => {
  const root = document.createElement('div');
  root.dataset.testOverviewRoot = '';
  const timeline = document.createElement('section');
  timeline.style.overflowY = 'auto';
  timeline.scrollTop = 37;
  root.append(timeline);
  document.body.append(root);
  return { root, timeline };
};

const setDocumentScrollRange = (scrollHeight: number, clientHeight: number) => {
  const scroller = document.scrollingElement ?? document.documentElement;
  Object.defineProperties(scroller, {
    scrollHeight: { configurable: true, value: scrollHeight },
    clientHeight: { configurable: true, value: clientHeight },
  });
  scroller.scrollTop = 0;
  return scroller;
};

const dispatchTouch = (
  element: HTMLElement,
  type: string,
  touches: Array<{ clientX: number; clientY: number }>,
  timeStamp?: number,
) => {
  const event = new Event(type, { bubbles: true });
  Object.defineProperty(event, 'touches', { value: touches });
  if (timeStamp !== undefined) {
    Object.defineProperty(event, 'timeStamp', { value: timeStamp });
  }
  element.dispatchEvent(event);
};

afterEach(() => {
  document.documentElement.classList.remove('ios-safari-overview-shell');
  const scroller = document.scrollingElement ?? document.documentElement;
  Reflect.deleteProperty(scroller, 'scrollHeight');
  Reflect.deleteProperty(scroller, 'clientHeight');
  scroller.scrollTop = 0;
  for (const root of document.querySelectorAll('[data-test-overview-root]')) {
    root.remove();
  }
  vi.unstubAllGlobals();
});

describe(enableIphoneSafariOverviewShell.name, () => {
  it('adds a document shell without changing the Immich scroller', () => {
    const { root, timeline } = addTimeline();

    const disable = enableIphoneSafariOverviewShell(timeline, iphoneSafari);

    expect(document.documentElement).toHaveClass('ios-safari-overview-shell');
    expect(root).toHaveAttribute('data-ios-safari-overview-shell');
    expect(timeline.style.overflowY).toBe('auto');
    expect(timeline.scrollTop).toBe(37);

    disable();

    expect(document.documentElement).not.toHaveClass('ios-safari-overview-shell');
    expect(root).not.toHaveAttribute('data-ios-safari-overview-shell');
    expect(timeline.style.overflowY).toBe('auto');
    expect(timeline.scrollTop).toBe(37);
  });

  it('does nothing outside a normal iPhone Safari tab', () => {
    const { root, timeline } = addTimeline();

    const disable = enableIphoneSafariOverviewShell(timeline, { ...iphoneSafari, standalone: true });

    expect(document.documentElement).not.toHaveClass('ios-safari-overview-shell');
    expect(root).not.toHaveAttribute('data-ios-safari-overview-shell');
    disable();
  });

  it('rearms the root scroll runway at the top after native scrolling ends', () => {
    vi.stubGlobal('matchMedia', () => ({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    const scroller = setDocumentScrollRange(228, 100);
    const { timeline } = addTimeline();

    const disable = enableIphoneSafariOverviewShell(timeline, iphoneSafari);
    expect(scroller.scrollTop).toBe(0);

    scroller.scrollTop = 100;
    timeline.dispatchEvent(new Event('scrollend', { bubbles: true }));
    expect(scroller.scrollTop).toBe(100);

    scroller.dispatchEvent(new Event('scrollend'));
    expect(scroller.scrollTop).toBe(0);

    scroller.scrollTop = 100;
    document.dispatchEvent(new Event('scrollend'));
    expect(scroller.scrollTop).toBe(0);

    disable();
    expect(scroller.scrollTop).toBe(0);
  });

  it('drives timeline scrolling from a vertical single-touch gesture', () => {
    vi.stubGlobal('matchMedia', () => ({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    const { timeline } = addTimeline();
    const disable = enableIphoneSafariOverviewShell(timeline, iphoneSafari);

    dispatchTouch(timeline, 'touchstart', [{ clientX: 100, clientY: 200 }]);
    dispatchTouch(timeline, 'touchmove', [{ clientX: 100, clientY: 150 }]);
    expect(timeline.scrollTop).toBe(87);

    disable();
    dispatchTouch(timeline, 'touchstart', [{ clientX: 100, clientY: 200 }]);
    dispatchTouch(timeline, 'touchmove', [{ clientX: 100, clientY: 150 }]);
    expect(timeline.scrollTop).toBe(87);
  });

  it('continues a recent vertical gesture with bounded momentum', () => {
    vi.stubGlobal('matchMedia', () => ({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    let animationFrame: FrameRequestCallback | undefined;
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn((callback: FrameRequestCallback) => {
        animationFrame = callback;
        return 1;
      }),
    );
    vi.stubGlobal(
      'cancelAnimationFrame',
      vi.fn(() => {
        animationFrame = undefined;
      }),
    );
    const { timeline } = addTimeline();
    const disable = enableIphoneSafariOverviewShell(timeline, iphoneSafari);

    dispatchTouch(timeline, 'touchstart', [{ clientX: 100, clientY: 200 }], 10);
    dispatchTouch(timeline, 'touchmove', [{ clientX: 100, clientY: 150 }], 30);
    dispatchTouch(timeline, 'touchend', [], 35);
    expect(timeline.scrollTop).toBe(87);
    expect(animationFrame).toBeDefined();

    animationFrame?.(51);
    expect(timeline.scrollTop).toBeGreaterThan(87);

    dispatchTouch(timeline, 'touchstart', [{ clientX: 100, clientY: 150 }], 52);
    expect(animationFrame).toBeUndefined();
    disable();
  });

  it('does not drive timeline scrolling from taps, horizontal gestures, or pinches', () => {
    vi.stubGlobal('matchMedia', () => ({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    const { timeline } = addTimeline();
    const disable = enableIphoneSafariOverviewShell(timeline, iphoneSafari);

    dispatchTouch(timeline, 'touchstart', [{ clientX: 100, clientY: 200 }]);
    dispatchTouch(timeline, 'touchmove', [{ clientX: 98, clientY: 197 }]);
    dispatchTouch(timeline, 'touchmove', [{ clientX: 50, clientY: 195 }]);
    expect(timeline.scrollTop).toBe(37);

    dispatchTouch(timeline, 'touchstart', [
      { clientX: 100, clientY: 200 },
      { clientX: 200, clientY: 200 },
    ]);
    dispatchTouch(timeline, 'touchmove', [
      { clientX: 100, clientY: 150 },
      { clientX: 200, clientY: 250 },
    ]);
    expect(timeline.scrollTop).toBe(37);
    disable();
  });

  it('does not drive timeline scrolling in portrait', () => {
    vi.stubGlobal('matchMedia', () => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    const { timeline } = addTimeline();
    const disable = enableIphoneSafariOverviewShell(timeline, iphoneSafari);

    dispatchTouch(timeline, 'touchstart', [{ clientX: 100, clientY: 200 }]);
    dispatchTouch(timeline, 'touchmove', [{ clientX: 100, clientY: 150 }]);
    expect(timeline.scrollTop).toBe(37);
    disable();
  });
});
