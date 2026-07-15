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

const getSingleTouch = (touches: TouchList): Touch | undefined => (touches[0] && !touches[1] ? touches[0] : undefined);

const getPageRoot = (element: HTMLElement): HTMLElement | null => {
  while (element.parentElement && element.parentElement !== document.body) {
    element = element.parentElement;
  }

  return element.parentElement === document.body ? element : null;
};

const mirrorTimelineTouchToDocument = (timeline: HTMLElement): (() => void) => {
  let previousTouch: TouchPosition | undefined;
  let gestureAxis: 'pending' | 'horizontal' | 'vertical' = 'pending';
  let documentScroller: Element | undefined;
  let maximumScrollTop = 0;

  const resetGesture = () => {
    previousTouch = undefined;
    gestureAxis = 'pending';
    documentScroller = undefined;
    maximumScrollTop = 0;
  };

  const onTouchStart = ({ touches }: TouchEvent) => {
    const touch = getSingleTouch(touches);
    if (!touch) {
      resetGesture();
      return;
    }

    const { clientX: x, clientY: y } = touch;
    previousTouch = { x, y };
    documentScroller = document.scrollingElement ?? document.documentElement;
    maximumScrollTop = Math.max(0, documentScroller.scrollHeight - documentScroller.clientHeight);
  };

  const onTouchMove = ({ touches }: TouchEvent) => {
    const touch = getSingleTouch(touches);
    if (!previousTouch || !documentScroller || !touch) {
      resetGesture();
      return;
    }

    const { clientX: x, clientY: y } = touch;
    const deltaX = previousTouch.x - x;
    const deltaY = previousTouch.y - y;

    if (gestureAxis === 'pending') {
      if (Math.max(Math.abs(deltaX), Math.abs(deltaY)) < AXIS_LOCK_THRESHOLD) {
        return;
      }

      gestureAxis = Math.abs(deltaY) > Math.abs(deltaX) ? 'vertical' : 'horizontal';
    }

    previousTouch = { x, y };
    if (gestureAxis !== 'vertical') {
      return;
    }

    const nextScrollTop = Math.min(maximumScrollTop, Math.max(0, documentScroller.scrollTop + deltaY));
    if (nextScrollTop !== documentScroller.scrollTop) {
      documentScroller.scrollTop = nextScrollTop;
    }
  };

  // One touch cannot natively scroll both nested scrollers, so mirror only its delta into the short Safari shell range.
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
  const stopMirroring = mirrorTimelineTouchToDocument(timeline);

  return () => {
    stopMirroring();
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
