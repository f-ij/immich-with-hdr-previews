import { zoomImageAction } from '$lib/actions/zoom-image';

const { createZoomImageWheelMock } = vi.hoisted(() => ({
  createZoomImageWheelMock: vi.fn(),
}));

vi.mock('@zoom-image/core', () => ({
  createZoomImageWheel: createZoomImageWheelMock,
}));

vi.mock('$lib/managers/asset-viewer-manager.svelte', () => ({
  assetViewerManager: {
    zoomState: {},
    on: vi.fn(() => vi.fn()),
    onZoomChange: vi.fn(),
    cancelZoomAnimation: vi.fn(),
  },
}));

describe(zoomImageAction.name, () => {
  it('forwards touch handling options to the zoom engine', () => {
    createZoomImageWheelMock.mockReturnValue({
      setState: vi.fn(),
      subscribe: vi.fn(() => vi.fn()),
      cleanup: vi.fn(),
    });
    const node = document.createElement('div');
    const shouldZoomOnSingleTouch = () => false;

    const action = zoomImageAction(node, { touchAction: 'pan-y', shouldZoomOnSingleTouch });

    expect(node.style.touchAction).toBe('pan-y');
    expect(createZoomImageWheelMock).toHaveBeenCalledWith(node, expect.objectContaining({ shouldZoomOnSingleTouch }));

    action.destroy();
  });
});
