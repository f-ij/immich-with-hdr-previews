import {
  getIphoneSafariEnvironment,
  IPHONE_SAFARI_VIEWER_SCROLL_CLASS,
  isIphoneSafariTab,
  type IphoneSafariEnvironment,
} from '$lib/utils/ios-safari-scroll';

const VIEWER_SCROLL_ROOT_ATTRIBUTE = 'data-ios-safari-viewer-scroll-root';
const PORTRAIT_SCROLL_RUNWAY_POSITION = 128;

const getViewerRoot = (viewer: HTMLElement): HTMLElement | null => {
  let element: HTMLElement | null = viewer;
  while (element?.parentElement && element.parentElement !== document.body) {
    element = element.parentElement;
  }

  return element?.parentElement === document.body ? element : null;
};

export const enableIphoneSafariViewerScroll = (
  viewer: HTMLElement | undefined,
  environment: IphoneSafariEnvironment = getIphoneSafariEnvironment(),
): (() => void) => {
  if (!viewer || !isIphoneSafariTab(environment)) {
    return () => {};
  }

  const viewerRoot = getViewerRoot(viewer);
  if (!viewerRoot) {
    return () => {};
  }

  const { scrollX, scrollY } = globalThis;
  const scroller = document.scrollingElement ?? document.documentElement;
  const portrait = globalThis.matchMedia?.('(orientation: portrait)');
  const rearmPortraitRunway = () => {
    if (portrait?.matches && Math.abs(scroller.scrollTop - PORTRAIT_SCROLL_RUNWAY_POSITION) > 1) {
      scroller.scrollTop = PORTRAIT_SCROLL_RUNWAY_POSITION;
    }
  };
  const onRootScrollEnd = (event: Event) => {
    if (event.target === document || event.target === scroller) {
      rearmPortraitRunway();
    }
  };
  const onOrientationChange = () => {
    scroller.scrollTop = portrait?.matches ? PORTRAIT_SCROLL_RUNWAY_POSITION : 0;
  };

  document.documentElement.classList.add(IPHONE_SAFARI_VIEWER_SCROLL_CLASS);
  viewerRoot.setAttribute(VIEWER_SCROLL_ROOT_ATTRIBUTE, '');
  document.addEventListener('scrollend', onRootScrollEnd, { passive: true });
  scroller.addEventListener('scrollend', onRootScrollEnd, { passive: true });
  portrait?.addEventListener('change', onOrientationChange);
  scrollTo(0, portrait?.matches ? PORTRAIT_SCROLL_RUNWAY_POSITION : 0);

  return () => {
    document.removeEventListener('scrollend', onRootScrollEnd);
    scroller.removeEventListener('scrollend', onRootScrollEnd);
    portrait?.removeEventListener('change', onOrientationChange);
    document.documentElement.classList.remove(IPHONE_SAFARI_VIEWER_SCROLL_CLASS);
    viewerRoot.removeAttribute(VIEWER_SCROLL_ROOT_ATTRIBUTE);
    scrollTo(scrollX, scrollY);
  };
};
