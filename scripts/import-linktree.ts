import { importLinktree } from "../lib/linktree-import";
const [exportFile, assetRoot, dataDir, ...flags] = process.argv.slice(2);
if (!exportFile || !assetRoot || !dataDir) {
  console.error(
    "Uso: npx tsx scripts/import-linktree.ts EXPORT.json ASSET_ROOT DATA_DIR [--dry-run]",
  );
  process.exitCode = 1;
} else
  importLinktree({
    exportFile,
    assetRoot,
    dataDir,
    dryRun: flags.includes("--dry-run"),
  })
    .then((result) =>
      console.log(
        JSON.stringify({
          dryRun: result.dryRun,
          mediaCount: result.manifest.length,
          verifiedMedia: result.manifest.map((item) => ({
            filename: item.filename,
            sha256: item.sha256,
            size: item.size,
          })),
          textCount: Object.keys(result.config.texts).length,
        }),
      ),
    )
    .catch((error) => {
      console.error(
        error instanceof Error ? error.message : "Falha na importação.",
      );
      process.exitCode = 1;
    });
