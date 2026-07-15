import type { Action } from 'svelte/action';
import {
  getIphoneSafariEnvironment,
  isIphoneSafariTab,
  type IphoneSafariEnvironment,
} from '$lib/utils/ios-safari-scroll';

const OVERVIEW_SHELL_CLASS = 'ios-safari-overview-shell';
const OVERVIEW_SHELL_ATTRIBUTE = 'data-ios-safari-overview-shell';

const getPageRoot = (element: HTMLElement): HTMLElement | null => {
  while (element.parentElement && element.parentElement !== document.body) {
    element = element.parentElement;
  }

  return element.parentElement === document.body ? element : null;
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

  return () => {
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
