import { execFile as execFileCallback } from 'node:child_process';
import fs from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import { promisify } from 'node:util';
import sharp from 'sharp';
import { HdrSourcePreviewOptions } from 'src/utils/hdr-preview/types';

const execFile = promisify(execFileCallback);

const COLOR_PRIMARIES: Record<string, number> = {
  bt709: 1,
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

const OUTPUT_MATRIX_BY_PRIMARIES: Record<string, number> = {
  bt709: 1,
  bt2020: 9,
  smpte431: 1,
  smpte432: 1,
};

type FfprobeStream = {
  color_primaries?: string;
  color_transfer?: string;
};

export function buildHdrOutputCicp(colorPrimaries: string, colorTransfer: string): string {
  const primaries = COLOR_PRIMARIES[colorPrimaries];
  const transfer = COLOR_TRANSFERS[colorTransfer];
  const matrix = OUTPUT_MATRIX_BY_PRIMARIES[colorPrimaries];

  if (primaries === undefined || transfer === undefined || matrix === undefined) {
    throw new Error(`Unsupported HDR image color metadata: ${colorPrimaries}/${colorTransfer}`);
  }

  return `${primaries}/${transfer}/${matrix}`;
}

export async function writeSharpDecodedHdrAvifPreview({
  sourcePath,
  outputPath,
  size,
  quality,
}: HdrSourcePreviewOptions): Promise<void> {
  const cicp = await probeHdrOutputCicp(sourcePath);
  const directory = await fs.mkdtemp(join(dirname(outputPath), '.immich-hdr-source-'));
  const resizedPath = join(directory, 'resized.png');
  const tempOutputPath = join(directory, basename(outputPath));

  try {
    await sharp(sourcePath, { limitInputPixels: false, unlimited: true })
      .autoOrient()
      .resize({ width: size, withoutEnlargement: true, kernel: sharp.kernel.lanczos3 })
      .toColourspace('rgb16')
      .keepIccProfile()
      .png({ compressionLevel: 0 })
      .toFile(resizedPath);

    await execFile('avifenc', [
      '-q',
      String(quality),
      '-s',
      '6',
      '--depth',
      '10',
      '--yuv',
      '444',
      '--cicp',
      cicp,
      '--range',
      'full',
      resizedPath,
      tempOutputPath,
    ]);
    await fs.rename(tempOutputPath, outputPath);
  } finally {
    await fs.rm(directory, { force: true, recursive: true });
  }
}

async function probeHdrOutputCicp(sourcePath: string): Promise<string> {
  const { stdout } = await execFile('ffprobe', [
    '-v',
    'error',
    '-select_streams',
    'v:0',
    '-show_entries',
    'stream=color_primaries,color_transfer',
    '-of',
    'json',
    sourcePath,
  ]);
  const stream = (JSON.parse(stdout).streams?.[0] ?? {}) as FfprobeStream;
  if (!stream.color_primaries || !stream.color_transfer) {
    throw new Error('HDR image source is missing color metadata');
  }

  return buildHdrOutputCicp(stream.color_primaries, stream.color_transfer);
}
