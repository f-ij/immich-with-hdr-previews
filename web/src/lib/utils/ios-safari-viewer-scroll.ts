import {
  getIphoneSafariEnvironment,
  IPHONE_SAFARI_VIEWER_SCROLL_CLASS,
  IPHONE_SAFARI_VIEWER_SCROLL_RELEASED_EVENT,
  isIphoneSafariTab,
  type IphoneSafariEnvironment,
} from '$lib/utils/ios-safari-scroll';

const VIEWER_SCROLL_ROOT_ATTRIBUTE = 'data-ios-safari-viewer-scroll-root';

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
  document.documentElement.classList.add(IPHONE_SAFARI_VIEWER_SCROLL_CLASS);
  viewerRoot.setAttribute(VIEWER_SCROLL_ROOT_ATTRIBUTE, '');
  globalThis.scrollTo(0, 0);

  return () => {
    document.documentElement.classList.remove(IPHONE_SAFARI_VIEWER_SCROLL_CLASS);
    viewerRoot.removeAttribute(VIEWER_SCROLL_ROOT_ATTRIBUTE);
    globalThis.scrollTo(scrollX, scrollY);
    globalThis.dispatchEvent(new Event(IPHONE_SAFARI_VIEWER_SCROLL_RELEASED_EVENT));
  };
};
