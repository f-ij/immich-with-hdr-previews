import type { Action } from 'svelte/action';

type IphoneSafariEnvironment = {
  userAgent: string;
  standalone: boolean;
  displayModeStandalone: boolean;
};

const IOS_ALTERNATIVE_BROWSER = /CriOS|EdgiOS|FxiOS|OPiOS/;
const VIEWER_SCROLL_CLASS = 'ios-safari-viewer-scroll';
const VIEWER_SCROLL_ROOT_ATTRIBUTE = 'data-ios-safari-viewer-scroll-root';
const VIEWER_SCROLL_RELEASED_EVENT = 'immich:iphone-safari-viewer-scroll-released';
const TIMELINE_SCROLL_CLASS = 'ios-safari-timeline-scroll';
const TIMELINE_SCROLL_RANGE_PROPERTY = '--ios-safari-timeline-scroll-range';
const USER_PAGE_LAYOUT_SELECTOR = '[data-user-page-layout]';

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

const getPageRoot = (element: HTMLElement): HTMLElement | null => {
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

  const viewerRoot = getPageRoot(viewer);
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
    globalThis.dispatchEvent(new Event(VIEWER_SCROLL_RELEASED_EVENT));
  };
};

export type IphoneSafariTimelineScrollOptions = {
  enabled: boolean;
  scrollRange: number;
  onScroll: () => void;
  onActiveChange: (active: boolean, scrollTop: number) => void;
};

type IphoneSafariTimelineScrollController = {
  update: (options: IphoneSafariTimelineScrollOptions) => void;
  destroy: () => void;
};

const noTimelineScrollController = (): IphoneSafariTimelineScrollController => ({
  update: () => {},
  destroy: () => {},
});

const normalizeScrollRange = (scrollRange: number) => (Number.isFinite(scrollRange) ? Math.max(0, scrollRange) : 0);

export const enableIphoneSafariTimelineScroll = (
  timeline: HTMLElement,
  initialOptions: IphoneSafariTimelineScrollOptions,
  environment: IphoneSafariEnvironment = getEnvironment(),
): IphoneSafariTimelineScrollController => {
  if (!isIphoneSafariTab(environment)) {
    return noTimelineScrollController();
  }

  const pageLayout = timeline.closest(USER_PAGE_LAYOUT_SELECTOR) as HTMLElement | null;
  if (!pageLayout || !document.body.contains(pageLayout)) {
    return noTimelineScrollController();
  }

  const documentElement = document.documentElement;
  const { scrollX, scrollY } = globalThis;
  const previousScrollRange = pageLayout.style.getPropertyValue(TIMELINE_SCROLL_RANGE_PROPERTY);
  let options = initialOptions;
  let scrollRange = normalizeScrollRange(options.scrollRange);
  let lastScrollTop = Math.max(0, timeline.scrollTop);

  const handlePageScroll = () => {
    if (documentElement.classList.contains(VIEWER_SCROLL_CLASS)) {
      return;
    }

    lastScrollTop = Math.min(Math.max(globalThis.scrollY, 0), scrollRange);
    options.onScroll();
  };

  const handleViewerReleased = () => {
    globalThis.scrollTo(0, lastScrollTop);
    options.onScroll();
  };

  const setScrollRange = (nextScrollRange: number) => {
    const normalizedScrollRange = normalizeScrollRange(nextScrollRange);
    if (normalizedScrollRange === scrollRange) {
      return;
    }

    scrollRange = normalizedScrollRange;
    pageLayout.style.setProperty(TIMELINE_SCROLL_RANGE_PROPERTY, `${scrollRange}px`);
  };

  documentElement.classList.add(TIMELINE_SCROLL_CLASS);
  pageLayout.style.setProperty(TIMELINE_SCROLL_RANGE_PROPERTY, `${scrollRange}px`);
  globalThis.addEventListener('scroll', handlePageScroll, { passive: true });
  globalThis.addEventListener(VIEWER_SCROLL_RELEASED_EVENT, handleViewerReleased);
  options.onActiveChange(true, lastScrollTop);
  globalThis.scrollTo(0, lastScrollTop);

  return {
    update: (nextOptions) => {
      options = nextOptions;
      setScrollRange(options.scrollRange);
    },
    destroy: () => {
      globalThis.removeEventListener('scroll', handlePageScroll);
      globalThis.removeEventListener(VIEWER_SCROLL_RELEASED_EVENT, handleViewerReleased);
      documentElement.classList.remove(TIMELINE_SCROLL_CLASS);
      if (previousScrollRange) {
        pageLayout.style.setProperty(TIMELINE_SCROLL_RANGE_PROPERTY, previousScrollRange);
      } else {
        pageLayout.style.removeProperty(TIMELINE_SCROLL_RANGE_PROPERTY);
      }
      options.onActiveChange(false, lastScrollTop);
      globalThis.scrollTo(scrollX, scrollY);
    },
  };
};

export const iphoneSafariTimelineScroll: Action<HTMLElement, IphoneSafariTimelineScrollOptions> = (
  timeline,
  options,
) => {
  let controller: IphoneSafariTimelineScrollController | undefined;

  const update = (nextOptions: IphoneSafariTimelineScrollOptions) => {
    if (!nextOptions.enabled) {
      controller?.destroy();
      controller = undefined;
      return;
    }

    if (controller) {
      controller.update(nextOptions);
    } else {
      controller = enableIphoneSafariTimelineScroll(timeline, nextOptions);
    }
  };

  update(options);

  return {
    update,
    destroy: () => controller?.destroy(),
  };
};
