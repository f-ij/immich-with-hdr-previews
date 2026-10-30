import { ColorTransfer } from 'src/enum.js';
import { VideoInfo } from 'src/types.js';

export function hasHdrTransferMetadata({ videoStreams }: Pick<VideoInfo, 'videoStreams'>): boolean {
  return videoStreams.some(
    ({ colorTransfer }) => colorTransfer === ColorTransfer.Smpte2084 || colorTransfer === ColorTransfer.AribStdB67,
  );
}
