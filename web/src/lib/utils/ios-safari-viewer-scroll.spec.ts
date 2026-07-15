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
