import { AssetTypeEnum, updateAsset } from '@immich/sdk';
import { fireEvent, waitFor } from '@testing-library/svelte';
import { getAnimateMock } from '$lib/__mocks__/animate.mock';
import { getResizeObserverMock } from '$lib/__mocks__/resize-observer.mock';
import { authManager } from '$lib/managers/auth-manager.svelte';
import { SlideshowState, slideshowStore } from '$lib/stores/slideshow.store';
import { renderWithTooltips } from '$tests/helpers';
import { assetFactory } from '@test-data/factories/asset-factory';
import { preferencesFactory } from '@test-data/factories/preferences-factory';
import { userAdminFactory } from '@test-data/factories/user-factory';
import AssetViewer from './AssetViewer.svelte';

vi.mock('$lib/managers/feature-flags-manager.svelte', () => ({
  featureFlagsManager: {
    init: vi.fn(),
    loadFeatureFlags: vi.fn(),
    value: { smartSearch: true, trash: true },
  } as never,
}));

vi.mock('$lib/stores/ocr.svelte', () => ({
  ocrManager: {
    clear: vi.fn(),
    getAssetOcr: vi.fn(),
    hasOcrData: false,
    showOverlay: false,
  },
}));

vi.mock('@immich/sdk', async () => {
  const sdk = await vi.importActual<typeof import('@immich/sdk')>('@immich/sdk');
  return {
    ...sdk,
    updateAsset: vi.fn(),
  };
});

describe('AssetViewer', () => {
  const partDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'part');
  const remoteDescriptor = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'remote');

  beforeAll(() => {
    Element.prototype.animate = getAnimateMock();
    const partList = document.createElement('div').classList;
    Object.defineProperty(HTMLElement.prototype, 'part', {
      configurable: true,
      get: () => partList,
    });
    vi.spyOn(CSSStyleSheet.prototype, 'insertRule').mockImplementation(() => 0);
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
    const remotePlayback = Object.assign(new EventTarget(), {
      watchAvailability: vi.fn().mockResolvedValue(0),
      cancelWatchAvailability: vi.fn().mockResolvedValue(undefined),
    });
    Object.defineProperty(HTMLMediaElement.prototype, 'remote', {
      configurable: true,
      get: () => remotePlayback,
    });
    vi.stubGlobal('ResizeObserver', getResizeObserverMock());
  });

  afterEach(() => {
    vi.useRealTimers();
    slideshowStore.slideshowState.set(SlideshowState.None);
    authManager.reset();
    vi.clearAllMocks();
  });

  afterAll(() => {
    if (partDescriptor) {
      Object.defineProperty(HTMLElement.prototype, 'part', partDescriptor);
    } else {
      Reflect.deleteProperty(HTMLElement.prototype, 'part');
    }
    if (remoteDescriptor) {
      Object.defineProperty(HTMLMediaElement.prototype, 'remote', remoteDescriptor);
    } else {
      Reflect.deleteProperty(HTMLMediaElement.prototype, 'remote');
    }
    vi.restoreAllMocks();
  });

  it('toggles the top bar when the photo is clicked', async () => {
    vi.useFakeTimers();
    const asset = assetFactory.build({ type: AssetTypeEnum.Image });
    const { getByTestId } = renderWithTooltips(AssetViewer, {
      cursor: { current: asset },
      showNavigation: false,
    });
    const navbar = getByTestId('asset-viewer-navbar');
    const photoViewer = getByTestId('photo-viewer');

    expect(navbar).not.toHaveClass('-translate-y-full');

    await fireEvent.click(photoViewer);
    await vi.runAllTimersAsync();

    expect(navbar).toHaveClass('-translate-y-full', 'opacity-0', 'pointer-events-none');

    await fireEvent.click(photoViewer);
    await vi.runAllTimersAsync();

    expect(navbar).not.toHaveClass('-translate-y-full');
  });

  it('toggles the top bar when the video surface is clicked', async () => {
    vi.useFakeTimers();
    const asset = assetFactory.build({ type: AssetTypeEnum.Video });
    const { getByTestId } = renderWithTooltips(AssetViewer, {
      cursor: { current: asset },
      showNavigation: false,
    });
    const navbar = getByTestId('asset-viewer-navbar');
    const videoViewer = getByTestId('video-viewer');

    expect(navbar).not.toHaveClass('-translate-y-full');

    await fireEvent.click(videoViewer);
    await vi.runAllTimersAsync();

    expect(navbar).toHaveClass('-translate-y-full', 'opacity-0', 'pointer-events-none');

    await fireEvent.click(videoViewer);
    await vi.runAllTimersAsync();

    expect(navbar).not.toHaveClass('-translate-y-full');
  });

  it.skip('updates the top bar favorite action after pressing favorite', async () => {
    const ownerId = 'owner-id';
    const user = userAdminFactory.build({ id: ownerId });
    const asset = assetFactory.build({ ownerId, isFavorite: false, isTrashed: false });

    authManager.setUser(user);
    authManager.setPreferences(preferencesFactory.build({ cast: { gCastEnabled: false } }));

    vi.mocked(updateAsset).mockResolvedValue({ ...asset, isFavorite: true });

    const { getByLabelText, queryByLabelText } = renderWithTooltips(AssetViewer, {
      cursor: { current: asset },
      showNavigation: false,
    });

    expect(getByLabelText('to_favorite')).toBeInTheDocument();
    expect(queryByLabelText('unfavorite')).toBeNull();

    await fireEvent.click(getByLabelText('to_favorite'));

    await waitFor(() =>
      expect(updateAsset).toHaveBeenCalledWith({ id: asset.id, updateAssetDto: { isFavorite: true } }),
    );
    await waitFor(() => expect(getByLabelText('unfavorite')).toBeInTheDocument());
  });
});
