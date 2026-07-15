import { enableIphoneSafariOverviewShell } from '$lib/utils/ios-safari-overview-shell';

const iphoneSafari = {
  userAgent:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 Version/26.0 Mobile/15E148 Safari/604.1',
  standalone: false,
  displayModeStandalone: false,
};

const addTimeline = () => {
  const root = document.createElement('div');
  root.dataset.testOverviewRoot = '';
  const timeline = document.createElement('section');
  timeline.style.overflowY = 'auto';
  timeline.scrollTop = 37;
  root.append(timeline);
  document.body.append(root);
  return { root, timeline };
};

afterEach(() => {
  document.documentElement.classList.remove('ios-safari-overview-shell');
  for (const root of document.querySelectorAll('[data-test-overview-root]')) {
    root.remove();
  }
});

describe(enableIphoneSafariOverviewShell.name, () => {
  it('adds a document shell without changing the Immich scroller', () => {
    const { root, timeline } = addTimeline();

    const disable = enableIphoneSafariOverviewShell(timeline, iphoneSafari);

    expect(document.documentElement).toHaveClass('ios-safari-overview-shell');
    expect(root).toHaveAttribute('data-ios-safari-overview-shell');
    expect(timeline.style.overflowY).toBe('auto');
    expect(timeline.scrollTop).toBe(37);

    disable();

    expect(document.documentElement).not.toHaveClass('ios-safari-overview-shell');
    expect(root).not.toHaveAttribute('data-ios-safari-overview-shell');
    expect(timeline.style.overflowY).toBe('auto');
    expect(timeline.scrollTop).toBe(37);
  });

  it('does nothing outside a normal iPhone Safari tab', () => {
    const { root, timeline } = addTimeline();

    const disable = enableIphoneSafariOverviewShell(timeline, { ...iphoneSafari, standalone: true });

    expect(document.documentElement).not.toHaveClass('ios-safari-overview-shell');
    expect(root).not.toHaveAttribute('data-ios-safari-overview-shell');
    disable();
  });
});
