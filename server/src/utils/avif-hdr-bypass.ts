import { writeHdrImageAvifPreview } from 'src/utils/hdr-image-avif-preview';

export type HdrAvifBypassOptions = {
  sourcePath: string;
  outputPath: string;
  size: number;
  quality: number;
};

export function writeHdrAvifThumbnail(options: HdrAvifBypassOptions): Promise<void> {
  return writeHdrImageAvifPreview({ ...options, sourceMimeType: 'image/avif' });
}
