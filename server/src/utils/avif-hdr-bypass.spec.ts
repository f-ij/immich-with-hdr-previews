import { buildFfmpegResizeInputArgs, type AvifTileGrid } from 'src/utils/avif-hdr-bypass';
import { describe, expect, it } from 'vitest';

describe('AVIF HDR bypass', () => {
  describe('buildFfmpegResizeInputArgs', () => {
    it('should resize a regular AVIF stream directly', () => {
      expect(buildFfmpegResizeInputArgs('/photos/image.avif', 1440)).toEqual([
        '-i',
        '/photos/image.avif',
        '-vf',
        'scale=1440:-1:flags=lanczos',
      ]);
    });

    it('should assemble and crop a tiled AVIF before resizing it', () => {
      const tileGrid: AvifTileGrid = {
        width: 3900,
        height: 3400,
        horizontalOffset: 0,
        verticalOffset: 0,
        tiles: [
          { streamIndex: 0, horizontalOffset: 0, verticalOffset: 0 },
          { streamIndex: 1, horizontalOffset: 1984, verticalOffset: 0 },
          { streamIndex: 2, horizontalOffset: 0, verticalOffset: 1728 },
          { streamIndex: 3, horizontalOffset: 1984, verticalOffset: 1728 },
        ],
      };

      expect(buildFfmpegResizeInputArgs('/photos/tiled.avif', 1440, tileGrid)).toEqual([
        '-i',
        '/photos/tiled.avif',
        '-filter_complex',
        '[0:0][0:1][0:2][0:3]xstack=inputs=4:layout=0_0|1984_0|0_1728|1984_1728,crop=3900:3400:0:0,scale=1440:-1:flags=lanczos[out]',
        '-map',
        '[out]',
      ]);
    });
  });
});
