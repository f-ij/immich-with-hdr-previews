import { enableIphoneSafariViewerScroll } from '$lib/utils/ios-safari-viewer-scroll';

const iphoneSafari = {
  userAgent:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 Version/26.0 Mobile/15E148 Safari/604.1',
  standalone: false,
  displayModeStandalone: false,
};

const addViewer = () => {
  const root = document.createElement('div');
  root.dataset.testViewerRoot = '';
  const viewer = document.createElement('section');
  root.append(viewer);
  document.body.append(root);
  return { root, viewer };
};

afterEach(() => {
  document.documentElement.classList.remove('ios-safari-viewer-scroll');
  for (const root of document.querySelectorAll('[data-test-viewer-root]')) {
    root.remove();
  }
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe(enableIphoneSafariViewerScroll.name, () => {
  it('enables viewer scrolling and restores the previous position', () => {
    const { root, viewer } = addViewer();
    vi.stubGlobal('scrollX', 17);
    vi.stubGlobal('scrollY', 29);
    const scrollTo = vi.spyOn(globalThis, 'scrollTo').mockImplementation(() => {});

    const cleanup = enableIphoneSafariViewerScroll(viewer, iphoneSafari);

    expect(document.documentElement).toHaveClass('ios-safari-viewer-scroll');
    expect(root).toHaveAttribute('data-ios-safari-viewer-scroll-root');
    expect(scrollTo).toHaveBeenCalledWith(0, 0);

    cleanup();

    expect(document.documentElement).not.toHaveClass('ios-safari-viewer-scroll');
    expect(root).not.toHaveAttribute('data-ios-safari-viewer-scroll-root');
    expect(scrollTo).toHaveBeenLastCalledWith(17, 29);
  });

  it('centers and rearms the portrait scroll runway', () => {
    const { viewer } = addViewer();
    const scroller = document.scrollingElement ?? document.documentElement;
    const portrait = {
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => portrait),
    );
    const scrollTo = vi.spyOn(globalThis, 'scrollTo').mockImplementation((_, top) => {
      scroller.scrollTop = Number(top);
    });

    const cleanup = enableIphoneSafariViewerScroll(viewer, iphoneSafari);

    expect(scrollTo).toHaveBeenCalledWith(0, 128);
    expect(scroller.scrollTop).toBe(128);

    scroller.scrollTop = 256;
    scroller.dispatchEvent(new Event('scrollend'));
    expect(scroller.scrollTop).toBe(128);

    scroller.scrollTop = 0;
    document.dispatchEvent(new Event('scrollend'));
    expect(scroller.scrollTop).toBe(128);

    cleanup();
  });

  it('leaves the known-good landscape scroll behavior unchanged', () => {
    const { viewer } = addViewer();
    const scroller = document.scrollingElement ?? document.documentElement;
    vi.stubGlobal('matchMedia', () => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    const scrollTo = vi.spyOn(globalThis, 'scrollTo').mockImplementation(() => {});

    const cleanup = enableIphoneSafariViewerScroll(viewer, iphoneSafari);

    expect(scrollTo).toHaveBeenCalledWith(0, 0);
    scroller.scrollTop = 100;
    scroller.dispatchEvent(new Event('scrollend'));
    expect(scroller.scrollTop).toBe(100);

    cleanup();
  });

  it('does nothing for other browsers', () => {
    const { root, viewer } = addViewer();
    const scrollTo = vi.spyOn(globalThis, 'scrollTo').mockImplementation(() => {});
    const cleanup = enableIphoneSafariViewerScroll(viewer, { ...iphoneSafari, standalone: true });

    expect(document.documentElement).not.toHaveClass('ios-safari-viewer-scroll');
    expect(root).not.toHaveAttribute('data-ios-safari-viewer-scroll-root');
    expect(scrollTo).not.toHaveBeenCalled();
    cleanup();
  });
});
