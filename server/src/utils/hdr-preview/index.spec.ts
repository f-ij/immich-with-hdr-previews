import { getHdrPreviewSourceMimeType } from 'src/utils/hdr-preview';
import { describe, expect, it } from 'vitest';

describe('HDR preview source routing', () => {
  it.each(['image/avif', 'image/jxl', 'image/heic', 'image/heif', 'image/hif'])('supports %s', (mimeType) => {
    expect(getHdrPreviewSourceMimeType(mimeType)).toBe(mimeType);
  });

  it.each(['image/jpeg', 'image/png', false])('does not route %s through the HDR preview pipeline', (mimeType) => {
    expect(getHdrPreviewSourceMimeType(mimeType)).toBeUndefined();
  });
});
