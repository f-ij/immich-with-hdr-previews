# Fork Notes

This is an experimental personal Immich fork. It keeps upstream tracking, HDR preview work, and asset-viewer changes on separate branches so each feature can be updated or reviewed independently.

## Branch Structure

- `main` is a fast-forward mirror of `immich-app/immich:main`.
- `fork-main` is the aggregate branch and the GitHub default branch.
- `feat/avif-hdr-previews` contains only AVIF HDR to AVIF HDR preview and thumbnail support.
- `feat/heic-jxl-hdr-previews` is stacked on the AVIF branch and adds HEIF/HEIC and JPEG XL inputs.
- `feat/ios-safari-bars-collapse` allows iPhone Safari's address and tab bars to collapse in the asset viewer.
- `feat/asset-viewer-controls-toggle` toggles viewer controls on an intentional single click or tap.
- `fix/web-swipe-after-pinch` restores horizontal asset swiping after a canceled pinch gesture.

The current aggregate starts at upstream release `v3.0.2`. Feature branches also use that commit as their release baseline, except that the HEIC/JXL branch is intentionally stacked on the AVIF branch.

## HDR Preview Behavior

The admin image setting named "Generate HDR AVIF previews" enables these paths:

| Original | Preview and thumbnail |
| --- | --- |
| HDR AVIF | 10-bit HDR AVIF |
| HDR JPEG XL | 10-bit HDR AVIF |
| HDR HEIF/HEIC | 10-bit HDR AVIF |

Other images continue through Immich's normal preview and thumbnail pipeline. Existing matching assets are queued for normal thumbnail regeneration when the setting changes from disabled to enabled. A browser cache clear may be needed after enabling the setting because an old preview can remain cached under the same asset URL.

Generated files are single-layer HDR AVIF images, not gain-map images.

## Known Limitations

- The HDR preview path currently targets the web app.
- The Immich mobile app can show a blurred, non-zoomable placeholder instead of these HDR AVIF previews.
- Testing a YUV420 AVIF variant did not fix the mobile-app behavior. That failed experiment is documented on `app-hdr-previews` and is not merged here.
- Safari can exhibit HDR compositing flicker while scrolling or moving the pointer. No Safari-specific color workaround is included.

## Pipeline Boundaries

The source dispatch is isolated in `server/src/utils/hdr-preview/index.ts`.

- `server/src/utils/avif-hdr-bypass.ts` contains the tile-aware AVIF path.
- `server/src/utils/hdr-preview/jxl.ts` is the JPEG XL entry point.
- `server/src/utils/hdr-preview/heif.ts` is the HEIF/HEIC entry point.
- `server/src/utils/hdr-preview/sharp-decoded.ts` contains the shared high-bit-depth decode, resize, and AVIF encode path used by JPEG XL and HEIF/HEIC.

The AVIF path uses FFmpeg to assemble tiled sources and resize to 10-bit Y4M. All handlers finish with `avifenc` and explicit HDR color signaling. The server image installs `libavif-bin` for `avifenc` and `avifdec`.

## Safety Boundaries

- No database migrations, tables, or columns are added.
- The backfill query is read-only and only queues normal Immich thumbnail jobs.
- Preview files are written to a temporary path and renamed into place after successful encoding.
- Failed custom conversions fall back to Immich's existing Sharp path.
- The custom converter is limited to `_preview.avif` and `_thumbnail.avif` outputs.
- Full-size images and originals are not changed by the custom HDR path.

Stock Immich can be restored without database repair. Generated AVIF previews are ordinary Immich preview and thumbnail records and can be replaced by running thumbnail regeneration on a stock build.

## Updating From Upstream

1. Fast-forward `main` from `immich-app/immich:main`.
2. Fetch upstream release tags and select the new release baseline.
3. Rebase or reconstruct each feature branch on that release, preserving its narrow diff.
4. Create the next `fork-main` from the release tag and merge the tested feature branches.
5. Tag the aggregate as `vX.Y.Z-hdr.N` after verification.

The scheduled workflow only fast-forwards `main`; it does not automatically merge upstream changes into `fork-main` or rewrite feature branches.
