type IphoneSafariEnvironment = {
  userAgent: string;
  standalone: boolean;
  displayModeStandalone: boolean;
};

const IOS_ALTERNATIVE_BROWSER = /CriOS|EdgiOS|FxiOS|OPiOS/;

export const isIphoneSafariTab = ({ userAgent, standalone, displayModeStandalone }: IphoneSafariEnvironment): boolean =>
  /iPhone/.test(userAgent) &&
  /Safari/.test(userAgent) &&
  !IOS_ALTERNATIVE_BROWSER.test(userAgent) &&
  !standalone &&
  !displayModeStandalone;

const getEnvironment = (): IphoneSafariEnvironment => ({
  userAgent: navigator.userAgent,
  standalone: Boolean((navigator as Navigator & { standalone?: boolean }).standalone),
  displayModeStandalone: globalThis.matchMedia?.('(display-mode: standalone)').matches ?? false,
});

export const addIphoneSafariScrollRunway = (environment: IphoneSafariEnvironment = getEnvironment()): (() => void) => {
  if (!isIphoneSafariTab(environment)) {
    return () => {};
  }

  const runway = document.createElement('div');
  runway.dataset.iosSafariScrollRunway = '';
  runway.ariaHidden = 'true';
  runway.style.cssText = 'display:block;width:1px;height:200vh;opacity:0;pointer-events:none;overflow-anchor:none';
  document.body.append(runway);

  return () => runway.remove();
};
