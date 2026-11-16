import { zoomImageAction } from '#lib/actions/zoom-image.ts';

const { createZoomImageWheelMock } = vi.hoisted(() => ({
  createZoomImageWheelMock: vi.fn(),
}));

vi.mock('@zoom-image/core', () => ({
  createZoomImageWheel: createZoomImageWheelMock,
}));

vi.mock('#lib/managers/asset-viewer-manager.svelte.ts', () => ({
  assetViewerManager: {
    zoomState: {},
    on: vi.fn(() => vi.fn()),
    onZoomChange: vi.fn(),
    cancelZoomAnimation: vi.fn(),
  },
}));

describe('zoomImageAction', () => {
  beforeEach(() => {
    createZoomImageWheelMock.mockReturnValue({
      setState: vi.fn(),
      subscribe: vi.fn(() => vi.fn()),
      cleanup: vi.fn(),
    });
  });

  it('forwards touch handling options to the zoom engine', () => {
    const node = document.createElement('div');
    const shouldZoomOnSingleTouch = () => false;

    const cleanup = zoomImageAction({ touchAction: 'pan-y', shouldZoomOnSingleTouch })(node);

    expect(node.style.touchAction).toBe('pan-y');
    expect(createZoomImageWheelMock).toHaveBeenCalledWith(node, expect.objectContaining({ shouldZoomOnSingleTouch }));

    cleanup?.();
  });

  it('blocks browser touch handling by default', () => {
    const node = document.createElement('div');

    const cleanup = zoomImageAction()(node);

    expect(node.style.touchAction).toBe('none');

    cleanup?.();
  });
});
