import { ColorTransfer } from 'src/enum';
import { VideoStreamInfo } from 'src/types';
import { hasHdrTransferMetadata } from 'src/utils/hdr-preview/probe';

const stream = (colorTransfer: ColorTransfer) => ({ colorTransfer }) as VideoStreamInfo;

describe(hasHdrTransferMetadata.name, () => {
  it.each([ColorTransfer.Smpte2084, ColorTransfer.AribStdB67])('detects HDR transfer %s', (colorTransfer) => {
    expect(hasHdrTransferMetadata({ videoStreams: [stream(colorTransfer)] })).toBe(true);
  });

  it('does not treat an SDR transfer as HDR', () => {
    expect(hasHdrTransferMetadata({ videoStreams: [stream(ColorTransfer.Iec6196621)] })).toBe(false);
  });
});
