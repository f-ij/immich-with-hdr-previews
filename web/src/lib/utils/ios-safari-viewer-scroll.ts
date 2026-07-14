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
const TIMELINE_SCROLL_ROOT_ATTRIBUTE = 'data-ios-safari-timeline-scroll-root';
const TIMELINE_SCROLL_RANGE_PROPERTY = '--ios-safari-timeline-scroll-range';
const USER_PAGE_SCROLL_CONTAINER_SELECTOR = '[data-user-page-scroll-container]';

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
};

type IphoneSafariTimelineScrollController = {
  update: (scrollRange: number) => void;
  destroy: () => void;
};

const noTimelineScrollController = (): IphoneSafariTimelineScrollController => ({
  update: () => {},
  destroy: () => {},
});

const normalizeScrollRange = (scrollRange: number) => (Number.isFinite(scrollRange) ? Math.max(0, scrollRange) : 0);

export const enableIphoneSafariTimelineScroll = (
  timeline: HTMLElement,
  initialScrollRange: number,
  environment: IphoneSafariEnvironment = getEnvironment(),
): IphoneSafariTimelineScrollController => {
  if (!isIphoneSafariTab(environment)) {
    return noTimelineScrollController();
  }

  const pageRoot = getPageRoot(timeline);
  if (!pageRoot) {
    return noTimelineScrollController();
  }

  const pageScrollContainer = timeline.closest(USER_PAGE_SCROLL_CONTAINER_SELECTOR) as HTMLElement | null;
  const documentElement = document.documentElement;
  const { scrollX, scrollY } = globalThis;
  const timelineOverflowY = timeline.style.overflowY;
  const pageOverflowY = pageScrollContainer?.style.overflowY;
  let scrollRange = -1;

  const syncTimelineFromPage = () => {
    if (documentElement.classList.contains(VIEWER_SCROLL_CLASS)) {
      return;
    }

    const top = Math.min(Math.max(globalThis.scrollY, 0), scrollRange);
    if (Math.abs(timeline.scrollTop - top) > 0.5) {
      timeline.scrollTop = top;
    }
  };

  const syncPageFromTimeline = () => {
    if (documentElement.classList.contains(VIEWER_SCROLL_CLASS)) {
      return;
    }

    const top = Math.min(Math.max(timeline.scrollTop, 0), scrollRange);
    if (Math.abs(globalThis.scrollY - top) > 0.5) {
      globalThis.scrollTo(0, top);
    }
  };

  documentElement.classList.add(TIMELINE_SCROLL_CLASS);
  pageRoot.setAttribute(TIMELINE_SCROLL_ROOT_ATTRIBUTE, '');
  timeline.style.overflowY = 'hidden';
  if (pageScrollContainer) {
    pageScrollContainer.style.overflowY = 'hidden';
  }

  globalThis.addEventListener('scroll', syncTimelineFromPage, { passive: true });
  globalThis.addEventListener(VIEWER_SCROLL_RELEASED_EVENT, syncPageFromTimeline);
  timeline.addEventListener('scroll', syncPageFromTimeline, { passive: true });

  const update = (nextScrollRange: number) => {
    const normalizedRange = normalizeScrollRange(nextScrollRange);
    if (normalizedRange === scrollRange) {
      return;
    }

    scrollRange = normalizedRange;
    document.body.style.setProperty(TIMELINE_SCROLL_RANGE_PROPERTY, `${scrollRange}px`);
    syncPageFromTimeline();
  };

  update(initialScrollRange);

  return {
    update,
    destroy: () => {
      globalThis.removeEventListener('scroll', syncTimelineFromPage);
      globalThis.removeEventListener(VIEWER_SCROLL_RELEASED_EVENT, syncPageFromTimeline);
      timeline.removeEventListener('scroll', syncPageFromTimeline);
      documentElement.classList.remove(TIMELINE_SCROLL_CLASS);
      pageRoot.removeAttribute(TIMELINE_SCROLL_ROOT_ATTRIBUTE);
      document.body.style.removeProperty(TIMELINE_SCROLL_RANGE_PROPERTY);
      timeline.style.overflowY = timelineOverflowY;
      if (pageScrollContainer) {
        pageScrollContainer.style.overflowY = pageOverflowY ?? '';
      }
      globalThis.scrollTo(scrollX, scrollY);
    },
  };
};

export const iphoneSafariTimelineScroll: Action<HTMLElement, IphoneSafariTimelineScrollOptions> = (
  timeline,
  options,
) => {
  let controller: IphoneSafariTimelineScrollController | undefined;

  const update = ({ enabled, scrollRange }: IphoneSafariTimelineScrollOptions) => {
    if (!enabled) {
      controller?.destroy();
      controller = undefined;
      return;
    }

    controller ??= enableIphoneSafariTimelineScroll(timeline, scrollRange);
    controller.update(scrollRange);
  };

  update(options);

  return {
    update,
    destroy: () => controller?.destroy(),
  };
};
