export type IphoneSafariEnvironment = {
  userAgent: string;
  standalone: boolean;
  displayModeStandalone: boolean;
};

export const IPHONE_SAFARI_VIEWER_SCROLL_CLASS = 'ios-safari-viewer-scroll';

const IOS_ALTERNATIVE_BROWSER = /CriOS|EdgiOS|FxiOS|OPiOS/;

export const getIphoneSafariEnvironment = (): IphoneSafariEnvironment => ({
  userAgent: navigator.userAgent,
  standalone: Boolean((navigator as Navigator & { standalone?: boolean }).standalone),
  displayModeStandalone: globalThis.matchMedia?.('(display-mode: standalone)').matches ?? false,
});

export const isIphoneSafariTab = (
  { userAgent, standalone, displayModeStandalone }: IphoneSafariEnvironment = getIphoneSafariEnvironment(),
): boolean =>
  /iPhone/.test(userAgent) &&
  /Safari/.test(userAgent) &&
  !IOS_ALTERNATIVE_BROWSER.test(userAgent) &&
  !standalone &&
  !displayModeStandalone;
