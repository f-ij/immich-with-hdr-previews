import { writeSharpDecodedHdrAvifPreview } from 'src/utils/hdr-preview/sharp-decoded';
import { HdrSourcePreviewOptions } from 'src/utils/hdr-preview/types';

export function writeHdrJxlAvifPreview(options: HdrSourcePreviewOptions): Promise<void> {
  return writeSharpDecodedHdrAvifPreview(options);
}
