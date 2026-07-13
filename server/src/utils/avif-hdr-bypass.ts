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

type AvifColorMetadata = {
  colorPrimaries: string;
  colorTransfer: string;
  colorSpace: string;
  colorRange: 'pc' | 'tv';
  cicp: string;
  range: 'full' | 'limited';
  tileGrid?: AvifTileGrid;
};

type FfprobeStream = {
  color_primaries?: string;
  color_transfer?: string;
  color_space?: string;
  color_range?: string;
};

type FfprobeTile = {
  stream_index?: number;
  tile_horizontal_offset?: number;
  tile_vertical_offset?: number;
};

type FfprobeStreamGroupComponent = {
  width?: number;
  height?: number;
  horizontal_offset?: number;
  vertical_offset?: number;
  subcomponents?: FfprobeTile[];
};

type FfprobeStreamGroup = {
  type?: string;
  components?: FfprobeStreamGroupComponent[];
};

type FfprobeOutput = {
  streams?: FfprobeStream[];
  stream_groups?: FfprobeStreamGroup[];
};

export type AvifTileGrid = {
  width: number;
  height: number;
  horizontalOffset: number;
  verticalOffset: number;
  tiles: Array<{
    streamIndex: number;
    horizontalOffset: number;
    verticalOffset: number;
  }>;
};

export type HdrAvifBypassOptions = {
  sourcePath: string;
  outputPath: string;
  size: number;
  quality: number;
};

export async function writeHdrAvifThumbnail({
  sourcePath,
  outputPath,
  size,
  quality,
}: HdrAvifBypassOptions): Promise<void> {
  const metadata = await probeAvifColorMetadata(sourcePath);
  const contentLightLevel = await probeAvifContentLightLevel(sourcePath).catch(() => {});
  const directory = await fs.mkdtemp(join(dirname(outputPath), '.immich-avif-hdr-'));
  const y4mPath = join(directory, 'resized.y4m');
  const tempOutputPath = join(directory, basename(outputPath));

  try {
    await execFile('ffmpeg', [
      '-nostdin',
      '-y',
      '-hide_banner',
      '-loglevel',
      'error',
      ...buildFfmpegResizeInputArgs(sourcePath, size, metadata.tileGrid),
      '-pix_fmt',
      'yuv420p10le',
      '-color_primaries',
      metadata.colorPrimaries,
      '-color_trc',
      metadata.colorTransfer,
      '-colorspace',
      metadata.colorSpace,
      '-color_range',
      metadata.colorRange,
      '-strict',
      '-1',
      y4mPath,
    ]);

    const avifencArgs = [
      '-q',
      String(quality),
      '-s',
      '6',
      '--cicp',
      metadata.cicp,
      '--range',
      metadata.range,
      y4mPath,
      tempOutputPath,
    ];

    if (contentLightLevel) {
      avifencArgs.splice(-2, 0, '--clli', contentLightLevel);
    }

    await execFile('avifenc', avifencArgs);
    await fs.rename(tempOutputPath, outputPath);
  } finally {
    await fs.rm(directory, { force: true, recursive: true });
  }
}

export function buildFfmpegResizeInputArgs(sourcePath: string, size: number, tileGrid?: AvifTileGrid): string[] {
  if (!tileGrid) {
    return ['-i', sourcePath, '-vf', `scale=${size}:-1:flags=lanczos`];
  }

  const inputs = tileGrid.tiles.map(({ streamIndex }) => `[0:${streamIndex}]`).join('');
  const layout = tileGrid.tiles
    .map(({ horizontalOffset, verticalOffset }) => `${horizontalOffset}_${verticalOffset}`)
    .join('|');
  const filter = [
    `${inputs}xstack=inputs=${tileGrid.tiles.length}:layout=${layout}`,
    `crop=${tileGrid.width}:${tileGrid.height}:${tileGrid.horizontalOffset}:${tileGrid.verticalOffset}`,
    `scale=${size}:-1:flags=lanczos[out]`,
  ].join(',');

  return ['-i', sourcePath, '-filter_complex', filter, '-map', '[out]'];
}

async function probeAvifColorMetadata(sourcePath: string): Promise<AvifColorMetadata> {
  const { stdout } = await execFile('ffprobe', [
    '-v',
    'error',
    '-show_stream_groups',
    '-show_entries',
    [
      'stream=color_primaries,color_transfer,color_space,color_range',
      'stream_group=index,type',
      'stream_group_component=width,height,horizontal_offset,vertical_offset',
      'subcomponent=stream_index,tile_horizontal_offset,tile_vertical_offset',
    ].join(':'),
    '-of',
    'json',
    sourcePath,
  ]);

  const probe = JSON.parse(stdout) as FfprobeOutput;
  const stream = probe.streams?.[0] ?? {};
  const colorPrimaries = stream.color_primaries;
  const colorTransfer = stream.color_transfer;
  const colorSpace = stream.color_space;
  const colorRange = stream.color_range === 'tv' ? 'tv' : 'pc';

  if (!colorPrimaries || !colorTransfer || !colorSpace) {
    throw new Error('Source AVIF is missing color metadata');
  }

  const primaries = COLOR_PRIMARIES[colorPrimaries];
  const transfer = COLOR_TRANSFERS[colorTransfer];
  const matrix = COLOR_MATRICES[colorSpace];

  if (primaries === undefined || transfer === undefined || matrix === undefined) {
    throw new Error(`Unsupported source AVIF color metadata: ${colorPrimaries}/${colorTransfer}/${colorSpace}`);
  }

  return {
    colorPrimaries,
    colorTransfer,
    colorSpace,
    colorRange,
    cicp: `${primaries}/${transfer}/${matrix}`,
    range: colorRange === 'pc' ? 'full' : 'limited',
    tileGrid: parseTileGrid(probe.stream_groups),
  };
}

function parseTileGrid(streamGroups: FfprobeStreamGroup[] | undefined): AvifTileGrid | undefined {
  const component = streamGroups
    ?.find(({ type }) => type?.toLowerCase() === 'tile grid')
    ?.components?.find(({ subcomponents }) => subcomponents && subcomponents.length > 1);

  if (!component) {
    return;
  }

  const { width, height, horizontal_offset: horizontalOffset = 0, vertical_offset: verticalOffset = 0 } = component;
  const tiles = component.subcomponents;
  if (
    !isNonNegativeInteger(width, false) ||
    !isNonNegativeInteger(height, false) ||
    !isNonNegativeInteger(horizontalOffset) ||
    !isNonNegativeInteger(verticalOffset) ||
    !tiles
  ) {
    throw new Error('Source AVIF has invalid tile grid dimensions');
  }

  const parsedTiles = tiles.map(({ stream_index: streamIndex, tile_horizontal_offset, tile_vertical_offset }) => {
    if (
      !isNonNegativeInteger(streamIndex) ||
      !isNonNegativeInteger(tile_horizontal_offset) ||
      !isNonNegativeInteger(tile_vertical_offset)
    ) {
      throw new Error('Source AVIF has invalid tile grid layout');
    }

    return {
      streamIndex,
      horizontalOffset: tile_horizontal_offset,
      verticalOffset: tile_vertical_offset,
    };
  });

  return { width, height, horizontalOffset, verticalOffset, tiles: parsedTiles };
}

function isNonNegativeInteger(value: number | undefined, allowZero: boolean = true): value is number {
  return value !== undefined && Number.isInteger(value) && value >= (allowZero ? 0 : 1);
}

async function probeAvifContentLightLevel(sourcePath: string): Promise<string | undefined> {
  const { stdout } = await execFile('avifdec', ['--info', sourcePath]);
  const match = stdout.match(/CLLI\s+:\s+(\d+),\s*(\d+)/);
  return match ? `${match[1]},${match[2]}` : undefined;
}
