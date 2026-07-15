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

const dispatchTouch = (element: HTMLElement, type: string, touches: Array<{ clientX: number; clientY: number }>) => {
  const event = new Event(type, { bubbles: true });
  Object.defineProperty(event, 'touches', { value: touches });
  element.dispatchEvent(event);
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

afterEach(() => {
  document.documentElement.classList.remove('ios-safari-overview-shell');
  const scroller = document.scrollingElement ?? document.documentElement;
  Reflect.deleteProperty(scroller, 'scrollHeight');
  Reflect.deleteProperty(scroller, 'clientHeight');
  scroller.scrollTop = 0;
  for (const root of document.querySelectorAll('[data-test-overview-root]')) {
    root.remove();
  }
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

  it('mirrors vertical timeline touch movement into the bounded document range', () => {
    const { timeline } = addTimeline();
    const scroller = setDocumentScrollRange(228, 100);
    const disable = enableIphoneSafariOverviewShell(timeline, iphoneSafari);

    dispatchTouch(timeline, 'touchstart', [{ clientX: 100, clientY: 200 }]);
    dispatchTouch(timeline, 'touchmove', [{ clientX: 100, clientY: 150 }]);
    expect(scroller.scrollTop).toBe(50);
    expect(timeline.scrollTop).toBe(37);

    dispatchTouch(timeline, 'touchmove', [{ clientX: 100, clientY: 0 }]);
    expect(scroller.scrollTop).toBe(128);

    dispatchTouch(timeline, 'touchmove', [{ clientX: 100, clientY: 200 }]);
    expect(scroller.scrollTop).toBe(0);
    disable();

    dispatchTouch(timeline, 'touchstart', [{ clientX: 100, clientY: 200 }]);
    dispatchTouch(timeline, 'touchmove', [{ clientX: 100, clientY: 150 }]);
    expect(scroller.scrollTop).toBe(0);
  });

  it('does not mirror taps, horizontal gestures, or pinches', () => {
    const { timeline } = addTimeline();
    const scroller = setDocumentScrollRange(228, 100);
    const disable = enableIphoneSafariOverviewShell(timeline, iphoneSafari);

    dispatchTouch(timeline, 'touchstart', [{ clientX: 100, clientY: 200 }]);
    dispatchTouch(timeline, 'touchmove', [{ clientX: 98, clientY: 197 }]);
    dispatchTouch(timeline, 'touchmove', [{ clientX: 50, clientY: 195 }]);
    expect(scroller.scrollTop).toBe(0);

    dispatchTouch(timeline, 'touchstart', [
      { clientX: 100, clientY: 200 },
      { clientX: 200, clientY: 200 },
    ]);
    dispatchTouch(timeline, 'touchmove', [
      { clientX: 100, clientY: 150 },
      { clientX: 200, clientY: 250 },
    ]);
    expect(scroller.scrollTop).toBe(0);
    disable();
  });
});
