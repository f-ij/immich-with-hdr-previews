import { writeSharpDecodedHdrAvifPreview } from 'src/utils/hdr-preview/sharp-decoded.js';
import { HdrSourcePreviewOptions } from 'src/utils/hdr-preview/types.js';

export function writeHdrHeifAvifPreview(options: HdrSourcePreviewOptions): Promise<void> {
  return writeSharpDecodedHdrAvifPreview(options);
}
