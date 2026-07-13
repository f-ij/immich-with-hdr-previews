import { buildHdrOutputCicp } from 'src/utils/hdr-preview/sharp-decoded';
import { describe, expect, it } from 'vitest';

describe('Sharp-decoded HDR AVIF previews', () => {
  it('maps Rec.2020 PQ RGB sources to Rec.2020 non-constant luminance output', () => {
    expect(buildHdrOutputCicp('bt2020', 'smpte2084')).toBe('9/16/9');
  });

  it('maps Display P3 PQ RGB sources to a BT.709-compatible output matrix', () => {
    expect(buildHdrOutputCicp('smpte432', 'smpte2084')).toBe('12/16/1');
  });

  it('rejects unknown color signaling instead of silently mislabeling pixels', () => {
    expect(() => buildHdrOutputCicp('unknown', 'smpte2084')).toThrow('Unsupported HDR image color metadata');
  });
});
