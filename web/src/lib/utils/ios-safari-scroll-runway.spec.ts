import { addIphoneSafariScrollRunway, isIphoneSafariTab } from '$lib/utils/ios-safari-scroll-runway';

const iphoneSafari = {
  userAgent:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 Version/26.0 Mobile/15E148 Safari/604.1',
  standalone: false,
  displayModeStandalone: false,
};

afterEach(() => {
  for (const runway of document.querySelectorAll('[data-ios-safari-scroll-runway]')) {
    runway.remove();
  }
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
  ])('does not enable the runway outside a normal iPhone Safari tab', (environment) => {
    expect(isIphoneSafariTab(environment)).toBe(false);
  });
});

describe(addIphoneSafariScrollRunway.name, () => {
  it('adds and removes invisible root-page height', () => {
    const cleanup = addIphoneSafariScrollRunway(iphoneSafari);
    const runway = document.querySelector<HTMLElement>('[data-ios-safari-scroll-runway]');

    expect(runway).not.toBeNull();
    expect(runway?.parentElement).toBe(document.body);
    expect(runway?.style.height).toBe('200vh');
    expect(runway?.style.pointerEvents).toBe('none');

    cleanup();

    expect(document.querySelector('[data-ios-safari-scroll-runway]')).toBeNull();
  });

  it('does nothing for other browsers', () => {
    const cleanup = addIphoneSafariScrollRunway({ ...iphoneSafari, standalone: true });

    expect(document.querySelector('[data-ios-safari-scroll-runway]')).toBeNull();
    cleanup();
  });
});
