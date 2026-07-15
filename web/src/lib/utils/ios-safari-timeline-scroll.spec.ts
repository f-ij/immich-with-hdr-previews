import { enableIphoneSafariTimelineScroll, enableIphoneSafariViewerScroll } from '$lib/utils/ios-safari-viewer-scroll';

const iphoneSafari = {
  userAgent:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 Version/26.0 Mobile/15E148 Safari/604.1',
  standalone: false,
  displayModeStandalone: false,
};

const addTimeline = () => {
  const root = document.createElement('div');
  root.dataset.testTimelineRoot = '';
  const pageLayout = document.createElement('main');
  pageLayout.dataset.userPageLayout = '';
  const timeline = document.createElement('section');
  timeline.style.overflowY = 'auto';
  pageLayout.append(timeline);
  root.append(pageLayout);
  document.body.append(root);
  return { root, pageLayout, timeline };
};

afterEach(() => {
  document.documentElement.classList.remove('ios-safari-timeline-scroll', 'ios-safari-viewer-scroll');
  for (const root of document.querySelectorAll('[data-test-timeline-root]')) {
    root.remove();
  }
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe(enableIphoneSafariTimelineScroll.name, () => {
  it('uses native page scrolling without mirroring each event into the timeline', () => {
    const { pageLayout, timeline } = addTimeline();
    timeline.scrollTop = 41;
    vi.stubGlobal('scrollX', 17);
    vi.stubGlobal('scrollY', 29);
    const scrollTo = vi.spyOn(globalThis, 'scrollTo').mockImplementation(() => {});
    const onScroll = vi.fn();
    const onActiveChange = vi.fn();

    const controller = enableIphoneSafariTimelineScroll(
      timeline,
      { enabled: true, scrollRange: 500, onScroll, onActiveChange },
      iphoneSafari,
    );

    expect(document.documentElement).toHaveClass('ios-safari-timeline-scroll');
    expect(pageLayout.style.getPropertyValue('--ios-safari-timeline-scroll-range')).toBe('500px');
    expect(timeline.style.overflowY).toBe('auto');
    expect(onActiveChange).toHaveBeenCalledWith(true, 41);
    expect(scrollTo).toHaveBeenLastCalledWith(0, 41);

    const setProperty = vi.spyOn(pageLayout.style, 'setProperty');
    controller.update({ enabled: true, scrollRange: 500, onScroll, onActiveChange });
    expect(setProperty).not.toHaveBeenCalled();

    vi.stubGlobal('scrollY', 120);
    globalThis.dispatchEvent(new Event('scroll'));
    expect(onScroll).toHaveBeenCalledOnce();
    expect(timeline.scrollTop).toBe(41);

    controller.update({ enabled: true, scrollRange: 750, onScroll, onActiveChange });
    expect(pageLayout.style.getPropertyValue('--ios-safari-timeline-scroll-range')).toBe('750px');

    controller.destroy();

    expect(document.documentElement).not.toHaveClass('ios-safari-timeline-scroll');
    expect(pageLayout.style.getPropertyValue('--ios-safari-timeline-scroll-range')).toBe('');
    expect(onActiveChange).toHaveBeenLastCalledWith(false, 120);
    expect(scrollTo).toHaveBeenLastCalledWith(17, 29);
  });

  it('suspends timeline updates while the asset viewer owns document scrolling', () => {
    const { root, timeline } = addTimeline();
    timeline.scrollTop = 300;
    const viewer = document.createElement('section');
    root.append(viewer);
    vi.stubGlobal('scrollX', 0);
    vi.stubGlobal('scrollY', 100);
    const scrollTo = vi.spyOn(globalThis, 'scrollTo').mockImplementation(() => {});
    const onScroll = vi.fn();
    const onActiveChange = vi.fn();
    const controller = enableIphoneSafariTimelineScroll(
      timeline,
      { enabled: true, scrollRange: 500, onScroll, onActiveChange },
      iphoneSafari,
    );
    const disableViewerScroll = enableIphoneSafariViewerScroll(viewer, iphoneSafari);
    onScroll.mockClear();

    globalThis.dispatchEvent(new Event('scroll'));
    expect(onScroll).not.toHaveBeenCalled();

    disableViewerScroll();
    expect(onScroll).toHaveBeenCalledOnce();
    expect(scrollTo).toHaveBeenLastCalledWith(0, 300);

    controller.destroy();
  });

  it('does nothing outside a normal iPhone Safari tab', () => {
    const { pageLayout, timeline } = addTimeline();
    const scrollTo = vi.spyOn(globalThis, 'scrollTo').mockImplementation(() => {});
    const onScroll = vi.fn();
    const onActiveChange = vi.fn();
    const controller = enableIphoneSafariTimelineScroll(
      timeline,
      { enabled: true, scrollRange: 500, onScroll, onActiveChange },
      { ...iphoneSafari, standalone: true },
    );

    expect(document.documentElement).not.toHaveClass('ios-safari-timeline-scroll');
    expect(pageLayout.style.getPropertyValue('--ios-safari-timeline-scroll-range')).toBe('');
    expect(onScroll).not.toHaveBeenCalled();
    expect(onActiveChange).not.toHaveBeenCalled();
    expect(scrollTo).not.toHaveBeenCalled();
    controller.destroy();
  });
});
