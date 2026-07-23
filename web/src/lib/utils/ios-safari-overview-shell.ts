import type { Action } from 'svelte/action';
import {
  getIphoneSafariEnvironment,
  isIphoneSafariTab,
  type IphoneSafariEnvironment,
} from '$lib/utils/ios-safari-scroll';

const OVERVIEW_SHELL_CLASS = 'ios-safari-overview-shell';
const OVERVIEW_SHELL_ATTRIBUTE = 'data-ios-safari-overview-shell';
const AXIS_LOCK_THRESHOLD = 6;
const MOMENTUM_DECAY = 0.998;
const MOMENTUM_MAX_FRAME_GAP = 100;
const MOMENTUM_MAX_SAMPLE_AGE = 100;
const MOMENTUM_MAX_VELOCITY = 3;
const MOMENTUM_STOP_VELOCITY = 0.02;

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
  let previousTouchTime: number | undefined;
  let gestureAxis: 'pending' | 'horizontal' | 'vertical' = 'pending';
  let scrollFrame: number | undefined;
  let queuedScrollDelta = 0;
  let momentumFrame: number | undefined;
  let velocity = 0;
  let velocityDirection: -1 | 0 | 1 = 0;
  let reversalDistance = 0;
  let reversalVelocity = 0;

  const clearTouch = () => {
    previousTouch = undefined;
    previousTouchTime = undefined;
    gestureAxis = 'pending';
    velocityDirection = 0;
    reversalDistance = 0;
    reversalVelocity = 0;
  };

  const stopMomentum = () => {
    if (momentumFrame !== undefined) {
      cancelAnimationFrame(momentumFrame);
      momentumFrame = undefined;
    }
    velocity = 0;
  };

  const applyQueuedScroll = () => {
    scrollFrame = undefined;
    timeline.scrollTop += queuedScrollDelta;
    queuedScrollDelta = 0;
  };

  const flushQueuedScroll = () => {
    if (scrollFrame !== undefined) {
      cancelAnimationFrame(scrollFrame);
    }
    applyQueuedScroll();
  };

  const cancelQueuedScroll = () => {
    if (scrollFrame !== undefined) {
      cancelAnimationFrame(scrollFrame);
      scrollFrame = undefined;
    }
    queuedScrollDelta = 0;
  };

  const scrollTimeline = (delta: number) => {
    if (delta === 0) {
      return;
    }

    if (scrollFrame === undefined) {
      timeline.scrollTop += delta;
      scrollFrame = requestAnimationFrame(applyQueuedScroll);
    } else {
      queuedScrollDelta += delta;
    }
  };

  const resetGesture = () => {
    cancelQueuedScroll();
    clearTouch();
    stopMomentum();
  };

  const stopGridMotion = () => {
    cancelQueuedScroll();
    stopMomentum();
  };

  const updateVelocity = (delta: number, elapsed: number) => {
    if (elapsed <= 0) {
      return;
    }

    const sampleVelocity = Math.max(-MOMENTUM_MAX_VELOCITY, Math.min(MOMENTUM_MAX_VELOCITY, delta / elapsed));
    const sampleDirection = sampleVelocity < 0 ? -1 : sampleVelocity > 0 ? 1 : 0;

    if (sampleDirection === 0) {
      velocity = 0;
      return;
    }

    if (velocityDirection === 0 || sampleDirection === velocityDirection) {
      velocityDirection = sampleDirection;
      reversalDistance = 0;
      reversalVelocity = 0;
      // A short-lived slow sample can occur while Safari moves its bars during a flick.
      velocity = velocity === 0 ? sampleVelocity : velocity * 0.8 + sampleVelocity * 0.2;
      return;
    }

    // Taper release jitter, but switch once movement in the new direction is deliberate.
    if (reversalDistance === 0) {
      reversalVelocity = velocity;
    }
    reversalDistance += Math.abs(delta);

    if (reversalDistance >= AXIS_LOCK_THRESHOLD) {
      velocityDirection = sampleDirection;
      reversalDistance = 0;
      reversalVelocity = 0;
      velocity = sampleVelocity;
    } else {
      velocity = reversalVelocity * (1 - reversalDistance / AXIS_LOCK_THRESHOLD);
    }
  };

  // The grid cannot use native overflow momentum while the root owns Safari's pan.
  const startMomentum = (startTime: number) => {
    let previousFrameTime = startTime;

    const step = (frameTime: number) => {
      momentumFrame = undefined;
      const elapsed = frameTime - previousFrameTime;
      previousFrameTime = frameTime;

      if (
        landscape?.matches === false ||
        elapsed <= 0 ||
        elapsed > MOMENTUM_MAX_FRAME_GAP ||
        Math.abs(velocity) < MOMENTUM_STOP_VELOCITY
      ) {
        velocity = 0;
        return;
      }

      const previousScrollTop = timeline.scrollTop;
      timeline.scrollTop += velocity * elapsed;
      velocity *= MOMENTUM_DECAY ** elapsed;

      if (timeline.scrollTop === previousScrollTop) {
        velocity = 0;
        return;
      }

      momentumFrame = requestAnimationFrame(step);
    };

    momentumFrame = requestAnimationFrame(step);
  };

  const onTouchStart = (event: Event) => {
    resetGesture();
    if (landscape?.matches === false) {
      return;
    }

    const touch = getSingleTouch(event as TouchEventLike);
    if (!touch) {
      return;
    }

    previousTouch = touch;
    previousTouchTime = event.timeStamp;
  };

  const onTouchMove = (event: Event) => {
    const touch = getSingleTouch(event as TouchEventLike);
    if (!previousTouch || !touch) {
      resetGesture();
      return;
    }

    const deltaX = previousTouch.x - touch.x;
    const deltaY = previousTouch.y - touch.y;
    const elapsed = previousTouchTime === undefined ? 0 : event.timeStamp - previousTouchTime;

    if (gestureAxis === 'pending') {
      if (Math.max(Math.abs(deltaX), Math.abs(deltaY)) < AXIS_LOCK_THRESHOLD) {
        return;
      }

      gestureAxis = Math.abs(deltaY) > Math.abs(deltaX) ? 'vertical' : 'horizontal';
    }

    previousTouch = touch;
    previousTouchTime = event.timeStamp;
    if (gestureAxis === 'vertical') {
      scrollTimeline(deltaY);
      updateVelocity(deltaY, elapsed);
    }
  };

  const onTouchEnd = (event: Event) => {
    const sampleAge = previousTouchTime === undefined ? Infinity : event.timeStamp - previousTouchTime;
    const shouldStartMomentum = gestureAxis === 'vertical' && sampleAge >= 0 && sampleAge <= MOMENTUM_MAX_SAMPLE_AGE;

    flushQueuedScroll();
    clearTouch();
    if (shouldStartMomentum) {
      startMomentum(event.timeStamp);
    } else {
      velocity = 0;
    }
  };

  timeline.addEventListener('touchstart', onTouchStart, { capture: true, passive: true });
  timeline.addEventListener('touchmove', onTouchMove, { passive: true });
  timeline.addEventListener('touchend', onTouchEnd, { passive: true });
  timeline.addEventListener('touchcancel', resetGesture, { passive: true });
  document.addEventListener('touchstart', stopGridMotion, { capture: true, passive: true });

  return () => {
    resetGesture();
    timeline.removeEventListener('touchstart', onTouchStart, true);
    timeline.removeEventListener('touchmove', onTouchMove);
    timeline.removeEventListener('touchend', onTouchEnd);
    timeline.removeEventListener('touchcancel', resetGesture);
    document.removeEventListener('touchstart', stopGridMotion, true);
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
