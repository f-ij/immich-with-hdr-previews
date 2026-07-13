import { writeHdrAvifThumbnail } from 'src/utils/avif-hdr-bypass';
import { writeHdrHeifAvifPreview } from 'src/utils/hdr-preview/heif';
import { writeHdrJxlAvifPreview } from 'src/utils/hdr-preview/jxl';
import {
  HDR_PREVIEW_SOURCE_MIME_TYPES,
  HdrImageAvifPreviewOptions,
  HdrPreviewSourceMimeType,
  HdrSourcePreviewOptions,
} from 'src/utils/hdr-preview/types';
export { hasHdrTransferMetadata } from 'src/utils/hdr-preview/probe';

type HdrPreviewHandler = (options: HdrSourcePreviewOptions) => Promise<void>;

const HDR_PREVIEW_HANDLERS: Record<HdrPreviewSourceMimeType, HdrPreviewHandler> = {
  'image/avif': writeHdrAvifThumbnail,
  'image/jxl': writeHdrJxlAvifPreview,
  'image/heic': writeHdrHeifAvifPreview,
  'image/heif': writeHdrHeifAvifPreview,
  'image/hif': writeHdrHeifAvifPreview,
};

export function getHdrPreviewSourceMimeType(mimeType: string | false): HdrPreviewSourceMimeType | undefined {
  return HDR_PREVIEW_SOURCE_MIME_TYPES.find((supportedMimeType) => supportedMimeType === mimeType);
}

export function writeHdrImageAvifPreview({ sourceMimeType, ...options }: HdrImageAvifPreviewOptions): Promise<void> {
  const supportedMimeType = getHdrPreviewSourceMimeType(sourceMimeType);
  if (!supportedMimeType) {
    throw new Error(`Unsupported HDR preview source MIME type: ${sourceMimeType}`);
  }

  return HDR_PREVIEW_HANDLERS[supportedMimeType](options);
}
