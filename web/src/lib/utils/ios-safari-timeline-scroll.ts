import type { Action } from 'svelte/action';
import {
  getIphoneSafariEnvironment,
  IPHONE_SAFARI_VIEWER_SCROLL_CLASS as VIEWER_SCROLL_CLASS,
  IPHONE_SAFARI_VIEWER_SCROLL_RELEASED_EVENT as VIEWER_SCROLL_RELEASED_EVENT,
  isIphoneSafariTab,
  type IphoneSafariEnvironment,
} from '$lib/utils/ios-safari-scroll';

const TIMELINE_SCROLL_CLASS = 'ios-safari-timeline-scroll';
const TIMELINE_SCROLL_RANGE_PROPERTY = '--ios-safari-timeline-scroll-range';
const USER_PAGE_LAYOUT_SELECTOR = '[data-user-page-layout]';

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
  environment: IphoneSafariEnvironment = getIphoneSafariEnvironment(),
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
