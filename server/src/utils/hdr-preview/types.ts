export const HDR_PREVIEW_SOURCE_MIME_TYPES = [
  'image/avif',
  'image/jxl',
  'image/heic',
  'image/heif',
  'image/hif',
] as const;

export type HdrPreviewSourceMimeType = (typeof HDR_PREVIEW_SOURCE_MIME_TYPES)[number];

export type HdrImageAvifPreviewOptions = {
  sourcePath: string;
  sourceMimeType: string;
  outputPath: string;
  size: number;
  quality: number;
};

export type HdrSourcePreviewOptions = Omit<HdrImageAvifPreviewOptions, 'sourceMimeType'>;
