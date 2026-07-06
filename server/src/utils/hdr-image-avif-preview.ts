import { execFile as execFileCb } from 'node:child_process';
import fs from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import { promisify } from 'node:util';

const execFile = promisify(execFileCb);

const COLOR_PRIMARIES: Record<string, number> = {
  bt709: 1,
  smpte170m: 6,
  smpte240m: 7,
  bt2020: 9,
  smpte431: 11,
  smpte432: 12,
};

const COLOR_TRANSFERS: Record<string, number> = {
  bt709: 1,
  smpte170m: 6,
  smpte240m: 7,
  linear: 8,
  'iec61966-2-1': 13,
  'bt2020-10': 14,
  'bt2020-12': 15,
  smpte2084: 16,
  'arib-std-b67': 18,
};

const COLOR_MATRICES: Record<string, number> = {
  gbr: 0,
  bt709: 1,
  smpte170m: 6,
  smpte240m: 7,
  bt2020nc: 9,
  bt2020c: 10,
};

type HdrColorMetadata = {
  colorPrimaries: string;
  colorTransfer: string;
  colorSpace: string;
  colorRange: 'pc' | 'tv';
  cicp: string;
  range: 'full' | 'limited';
};

type FfprobeStream = {
  color_primaries?: string;
  color_transfer?: string;
  color_space?: string;
  color_range?: string;
};

type HdrImageSource = {
  contentLightLevel?: string;
  metadata: HdrColorMetadata;
  path: string;
};

export type HdrImageAvifPreviewOptions = {
  sourcePath: string;
  sourceMimeType?: string;
  outputPath: string;
  size: number;
  quality: number;
};

export async function writeHdrImageAvifPreview({
  sourcePath,
  sourceMimeType,
  outputPath,
  size,
  quality,
}: HdrImageAvifPreviewOptions): Promise<void> {
  const source = await probeHdrImageSource(sourcePath, sourceMimeType);
  const directory = await fs.mkdtemp(join(dirname(outputPath), '.immich-hdr-avif-'));
  const y4mPath = join(directory, 'resized.y4m');
  const tempOutputPath = join(directory, basename(outputPath));

  try {
    await writeResizedY4m(source, y4mPath, size);
    await encodeAvif(source, y4mPath, tempOutputPath, quality);
    await fs.rename(tempOutputPath, outputPath);
  } finally {
    await fs.rm(directory, { force: true, recursive: true });
  }
}

async function probeHdrImageSource(sourcePath: string, sourceMimeType?: string): Promise<HdrImageSource> {
  return {
    contentLightLevel: await probeContentLightLevel(sourcePath, sourceMimeType).catch(() => undefined),
    metadata: await probeColorMetadata(sourcePath),
    path: sourcePath,
  };
}

async function writeResizedY4m(source: HdrImageSource, y4mPath: string, size: number): Promise<void> {
  await execFile('ffmpeg', [
    '-y',
    '-hide_banner',
    '-loglevel',
    'error',
    '-i',
    source.path,
    '-vf',
    `scale=${size}:-1:flags=lanczos`,
    '-pix_fmt',
    'yuv444p10le',
    '-color_primaries',
    source.metadata.colorPrimaries,
    '-color_trc',
    source.metadata.colorTransfer,
    '-colorspace',
    source.metadata.colorSpace,
    '-color_range',
    source.metadata.colorRange,
    '-strict',
    '-1',
    y4mPath,
  ]);
}

async function encodeAvif(source: HdrImageSource, y4mPath: string, outputPath: string, quality: number): Promise<void> {
  const avifencArgs = [
    '-q',
    String(quality),
    '-s',
    '6',
    '--cicp',
    source.metadata.cicp,
    '--range',
    source.metadata.range,
    y4mPath,
    outputPath,
  ];

  if (source.contentLightLevel) {
    avifencArgs.splice(-2, 0, '--clli', source.contentLightLevel);
  }

  await execFile('avifenc', avifencArgs);
}

async function probeColorMetadata(sourcePath: string): Promise<HdrColorMetadata> {
  const { stdout } = await execFile('ffprobe', [
    '-v',
    'error',
    '-select_streams',
    'v:0',
    '-show_entries',
    'stream=color_primaries,color_transfer,color_space,color_range',
    '-of',
    'json',
    sourcePath,
  ]);

  const stream = (JSON.parse(stdout).streams?.[0] ?? {}) as FfprobeStream;
  const colorPrimaries = stream.color_primaries;
  const colorTransfer = stream.color_transfer;
  const colorSpace = stream.color_space;
  const colorRange = stream.color_range === 'tv' ? 'tv' : 'pc';

  if (!colorPrimaries || !colorTransfer || !colorSpace) {
    throw new Error('HDR image source is missing color metadata');
  }

  const primaries = COLOR_PRIMARIES[colorPrimaries];
  const transfer = COLOR_TRANSFERS[colorTransfer];
  const matrix = COLOR_MATRICES[colorSpace];

  if (primaries === undefined || transfer === undefined || matrix === undefined) {
    throw new Error(`Unsupported HDR image color metadata: ${colorPrimaries}/${colorTransfer}/${colorSpace}`);
  }

  return {
    colorPrimaries,
    colorTransfer,
    colorSpace,
    colorRange,
    cicp: `${primaries}/${transfer}/${matrix}`,
    range: colorRange === 'pc' ? 'full' : 'limited',
  };
}

async function probeContentLightLevel(sourcePath: string, sourceMimeType?: string): Promise<string | undefined> {
  if (sourceMimeType !== 'image/avif') {
    return undefined;
  }

  const { stdout } = await execFile('avifdec', ['--info', sourcePath]);
  const match = stdout.match(/CLLI\s+:\s+(\d+),\s*(\d+)/);
  return match ? `${match[1]},${match[2]}` : undefined;
}
