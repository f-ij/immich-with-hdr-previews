type IphoneSafariEnvironment = {
  userAgent: string;
  standalone: boolean;
  displayModeStandalone: boolean;
};

const IOS_ALTERNATIVE_BROWSER = /CriOS|EdgiOS|FxiOS|OPiOS/;
const VIEWER_SCROLL_CLASS = 'ios-safari-viewer-scroll';
const VIEWER_SCROLL_ROOT_ATTRIBUTE = 'data-ios-safari-viewer-scroll-root';

const getEnvironment = (): IphoneSafariEnvironment => ({
  userAgent: navigator.userAgent,
  standalone: Boolean((navigator as Navigator & { standalone?: boolean }).standalone),
  displayModeStandalone: globalThis.matchMedia?.('(display-mode: standalone)').matches ?? false,
});

export const isIphoneSafariTab = (
  { userAgent, standalone, displayModeStandalone }: IphoneSafariEnvironment = getEnvironment(),
): boolean =>
  /iPhone/.test(userAgent) &&
  /Safari/.test(userAgent) &&
  !IOS_ALTERNATIVE_BROWSER.test(userAgent) &&
  !standalone &&
  !displayModeStandalone;

const getViewerRoot = (viewer: HTMLElement): HTMLElement | null => {
  let element: HTMLElement | null = viewer;
  while (element?.parentElement && element.parentElement !== document.body) {
    element = element.parentElement;
  }

  return element?.parentElement === document.body ? element : null;
};

export const enableIphoneSafariViewerScroll = (
  viewer: HTMLElement | undefined,
  environment: IphoneSafariEnvironment = getEnvironment(),
): (() => void) => {
  if (!viewer || !isIphoneSafariTab(environment)) {
    return () => {};
  }

  const viewerRoot = getViewerRoot(viewer);
  if (!viewerRoot) {
    return () => {};
  }

  const { scrollX, scrollY } = globalThis;
  document.documentElement.classList.add(VIEWER_SCROLL_CLASS);
  viewerRoot.setAttribute(VIEWER_SCROLL_ROOT_ATTRIBUTE, '');
  globalThis.scrollTo(0, 0);

  return () => {
    document.documentElement.classList.remove(VIEWER_SCROLL_CLASS);
    viewerRoot.removeAttribute(VIEWER_SCROLL_ROOT_ATTRIBUTE);
    globalThis.scrollTo(scrollX, scrollY);
  };
};
