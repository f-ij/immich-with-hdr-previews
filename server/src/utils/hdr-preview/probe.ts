import { ColorTransfer } from 'src/enum';
import { VideoInfo } from 'src/types';

export function hasHdrTransferMetadata({ videoStreams }: Pick<VideoInfo, 'videoStreams'>): boolean {
  return videoStreams.some(
    ({ colorTransfer }) => colorTransfer === ColorTransfer.Smpte2084 || colorTransfer === ColorTransfer.AribStdB67,
  );
}
