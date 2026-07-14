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
  const pageScrollContainer = document.createElement('main');
  pageScrollContainer.dataset.userPageScrollContainer = '';
  pageScrollContainer.style.overflowY = 'auto';
  const timeline = document.createElement('section');
  timeline.style.overflowY = 'auto';
  pageScrollContainer.append(timeline);
  root.append(pageScrollContainer);
  document.body.append(root);
  return { root, pageScrollContainer, timeline };
};

afterEach(() => {
  document.documentElement.classList.remove('ios-safari-timeline-scroll', 'ios-safari-viewer-scroll');
  document.body.style.removeProperty('--ios-safari-timeline-scroll-range');
  for (const root of document.querySelectorAll('[data-test-timeline-root]')) {
    root.remove();
  }
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe(enableIphoneSafariTimelineScroll.name, () => {
  it('mirrors native page scrolling into the virtual timeline and restores the page', () => {
    const { root, pageScrollContainer, timeline } = addTimeline();
    timeline.scrollTop = 41;
    vi.stubGlobal('scrollX', 17);
    vi.stubGlobal('scrollY', 29);
    const scrollTo = vi.spyOn(globalThis, 'scrollTo').mockImplementation(() => {});

    const controller = enableIphoneSafariTimelineScroll(timeline, 500, iphoneSafari);

    expect(document.documentElement).toHaveClass('ios-safari-timeline-scroll');
    expect(document.body.style.getPropertyValue('--ios-safari-timeline-scroll-range')).toBe('500px');
    expect(root).toHaveAttribute('data-ios-safari-timeline-scroll-root');
    expect(timeline.style.overflowY).toBe('hidden');
    expect(pageScrollContainer.style.overflowY).toBe('hidden');
    expect(scrollTo).toHaveBeenLastCalledWith(0, 41);

    vi.stubGlobal('scrollY', 120);
    globalThis.dispatchEvent(new Event('scroll'));
    expect(timeline.scrollTop).toBe(120);

    vi.stubGlobal('scrollY', 120);
    timeline.scrollTop = 240;
    timeline.dispatchEvent(new Event('scroll'));
    expect(scrollTo).toHaveBeenLastCalledWith(0, 240);

    controller.update(750);
    expect(document.body.style.getPropertyValue('--ios-safari-timeline-scroll-range')).toBe('750px');

    controller.destroy();

    expect(document.documentElement).not.toHaveClass('ios-safari-timeline-scroll');
    expect(document.body.style.getPropertyValue('--ios-safari-timeline-scroll-range')).toBe('');
    expect(root).not.toHaveAttribute('data-ios-safari-timeline-scroll-root');
    expect(timeline.style.overflowY).toBe('auto');
    expect(pageScrollContainer.style.overflowY).toBe('auto');
    expect(scrollTo).toHaveBeenLastCalledWith(17, 29);
  });

  it('suspends synchronization while the asset viewer owns document scrolling', () => {
    const { root, timeline } = addTimeline();
    const viewer = document.createElement('section');
    root.append(viewer);
    vi.stubGlobal('scrollX', 0);
    vi.stubGlobal('scrollY', 100);
    const scrollTo = vi.spyOn(globalThis, 'scrollTo').mockImplementation(() => {});
    const controller = enableIphoneSafariTimelineScroll(timeline, 500, iphoneSafari);
    const disableViewerScroll = enableIphoneSafariViewerScroll(viewer, iphoneSafari);
    scrollTo.mockClear();

    timeline.scrollTop = 300;
    timeline.dispatchEvent(new Event('scroll'));
    expect(scrollTo).not.toHaveBeenCalled();

    disableViewerScroll();
    expect(scrollTo).toHaveBeenLastCalledWith(0, 300);

    controller.destroy();
  });

  it('does nothing outside a normal iPhone Safari tab', () => {
    const { root, pageScrollContainer, timeline } = addTimeline();
    const scrollTo = vi.spyOn(globalThis, 'scrollTo').mockImplementation(() => {});
    const controller = enableIphoneSafariTimelineScroll(timeline, 500, { ...iphoneSafari, standalone: true });

    expect(document.documentElement).not.toHaveClass('ios-safari-timeline-scroll');
    expect(root).not.toHaveAttribute('data-ios-safari-timeline-scroll-root');
    expect(timeline.style.overflowY).toBe('auto');
    expect(pageScrollContainer.style.overflowY).toBe('auto');
    expect(scrollTo).not.toHaveBeenCalled();
    controller.destroy();
  });
});
