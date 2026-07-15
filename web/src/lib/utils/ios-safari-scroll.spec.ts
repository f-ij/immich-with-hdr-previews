import { isIphoneSafariTab } from '$lib/utils/ios-safari-scroll';

const iphoneSafari = {
  userAgent:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 Version/26.0 Mobile/15E148 Safari/604.1',
  standalone: false,
  displayModeStandalone: false,
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe(isIphoneSafariTab.name, () => {
  it('detects Safari running in a normal iPhone tab', () => {
    expect(isIphoneSafariTab(iphoneSafari)).toBe(true);
  });

  it.each([
    { ...iphoneSafari, userAgent: iphoneSafari.userAgent.replace('Safari', 'CriOS') },
    { ...iphoneSafari, standalone: true },
    { ...iphoneSafari, displayModeStandalone: true },
    {
      ...iphoneSafari,
      userAgent:
        'Mozilla/5.0 (iPad; CPU OS 26_0 like Mac OS X) AppleWebKit/605.1.15 Version/26.0 Mobile/15E148 Safari/604.1',
    },
  ])('does not detect other browsing modes as an iPhone Safari tab', (environment) => {
    expect(isIphoneSafariTab(environment)).toBe(false);
  });
});
