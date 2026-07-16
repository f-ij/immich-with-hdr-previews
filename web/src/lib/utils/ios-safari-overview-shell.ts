import type { Action } from 'svelte/action';
import {
  getIphoneSafariEnvironment,
  isIphoneSafariTab,
  type IphoneSafariEnvironment,
} from '$lib/utils/ios-safari-scroll';

const OVERVIEW_SHELL_CLASS = 'ios-safari-overview-shell';
const OVERVIEW_SHELL_ATTRIBUTE = 'data-ios-safari-overview-shell';
const AXIS_LOCK_THRESHOLD = 6;

type TouchPosition = {
  x: number;
  y: number;
};

type TouchEventLike = Event & {
  touches: ArrayLike<{ clientX: number; clientY: number }>;
};

const getSingleTouch = ({ touches }: TouchEventLike): TouchPosition | undefined =>
  touches.length === 1 ? { x: touches[0].clientX, y: touches[0].clientY } : undefined;

const getPageRoot = (element: HTMLElement): HTMLElement | null => {
  while (element.parentElement && element.parentElement !== document.body) {
    element = element.parentElement;
  }

  return element.parentElement === document.body ? element : null;
};

const enableDocumentScrollRunway = (): (() => void) => {
  const scroller = document.scrollingElement ?? document.documentElement;
  const landscape = globalThis.matchMedia?.('(orientation: landscape)');
  const initialScrollTop = scroller.scrollTop;

  // Reaching the top lets Safari reveal its bars without a dead drag on the next gesture.
  const rearmRunway = () => {
    if (landscape?.matches === false) {
      return;
    }

    if (scroller.scrollTop > 1) {
      scroller.scrollTop = 0;
    }
  };

  const onRootScrollEnd = (event: Event) => {
    if (event.target === document || event.target === scroller) {
      rearmRunway();
    }
  };

  document.addEventListener('scrollend', onRootScrollEnd, { passive: true });
  scroller.addEventListener('scrollend', onRootScrollEnd, { passive: true });
  landscape?.addEventListener('change', rearmRunway);
  rearmRunway();

  return () => {
    document.removeEventListener('scrollend', onRootScrollEnd);
    scroller.removeEventListener('scrollend', onRootScrollEnd);
    landscape?.removeEventListener('change', rearmRunway);
    scroller.scrollTop = initialScrollTop;
  };
};

const enableTimelineTouchDriver = (timeline: HTMLElement): (() => void) => {
  const landscape = globalThis.matchMedia?.('(orientation: landscape)');
  let previousTouch: TouchPosition | undefined;
  let gestureAxis: 'pending' | 'horizontal' | 'vertical' = 'pending';

  const resetGesture = () => {
    previousTouch = undefined;
    gestureAxis = 'pending';
  };

  const onTouchStart = (event: Event) => {
    if (landscape?.matches === false) {
      resetGesture();
      return;
    }

    const touch = getSingleTouch(event as TouchEventLike);
    if (!touch) {
      resetGesture();
      return;
    }

    previousTouch = touch;
  };

  const onTouchMove = (event: Event) => {
    const touch = getSingleTouch(event as TouchEventLike);
    if (!previousTouch || !touch) {
      resetGesture();
      return;
    }

    const deltaX = previousTouch.x - touch.x;
    const deltaY = previousTouch.y - touch.y;

    if (gestureAxis === 'pending') {
      if (Math.max(Math.abs(deltaX), Math.abs(deltaY)) < AXIS_LOCK_THRESHOLD) {
        return;
      }

      gestureAxis = Math.abs(deltaY) > Math.abs(deltaX) ? 'vertical' : 'horizontal';
    }

    previousTouch = touch;
    if (gestureAxis === 'vertical') {
      timeline.scrollTop += deltaY;
    }
  };

  timeline.addEventListener('touchstart', onTouchStart, { passive: true });
  timeline.addEventListener('touchmove', onTouchMove, { passive: true });
  timeline.addEventListener('touchend', resetGesture, { passive: true });
  timeline.addEventListener('touchcancel', resetGesture, { passive: true });

  return () => {
    timeline.removeEventListener('touchstart', onTouchStart);
    timeline.removeEventListener('touchmove', onTouchMove);
    timeline.removeEventListener('touchend', resetGesture);
    timeline.removeEventListener('touchcancel', resetGesture);
  };
};

export const enableIphoneSafariOverviewShell = (
  timeline: HTMLElement,
  environment: IphoneSafariEnvironment = getIphoneSafariEnvironment(),
): (() => void) => {
  if (!isIphoneSafariTab(environment)) {
    return () => {};
  }

  const pageRoot = getPageRoot(timeline);
  if (!pageRoot) {
    return () => {};
  }

  document.documentElement.classList.add(OVERVIEW_SHELL_CLASS);
  pageRoot.setAttribute(OVERVIEW_SHELL_ATTRIBUTE, '');
  const disableScrollRunway = enableDocumentScrollRunway();
  const disableTouchDriver = enableTimelineTouchDriver(timeline);

  return () => {
    disableTouchDriver();
    disableScrollRunway();
    document.documentElement.classList.remove(OVERVIEW_SHELL_CLASS);
    pageRoot.removeAttribute(OVERVIEW_SHELL_ATTRIBUTE);
  };
};

export const iphoneSafariOverviewShell: Action<HTMLElement, boolean> = (timeline, enabled) => {
  let active = false;
  let disable: (() => void) | undefined;

  const update = (nextEnabled: boolean) => {
    if (nextEnabled === active) {
      return;
    }

    disable?.();
    disable = nextEnabled ? enableIphoneSafariOverviewShell(timeline) : undefined;
    active = nextEnabled;
  };

  update(enabled);

  return {
    update,
    destroy: () => disable?.(),
  };
};
