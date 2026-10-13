import sharp from "sharp";
export async function imageDimensions(
  bytes: Buffer,
): Promise<{ width: number; height: number }> {
  try {
    const image = sharp(bytes, { limitInputPixels: 40000000 });
    const metadata = await image.metadata();
    if (
      !metadata.width ||
      !metadata.height ||
      metadata.width * metadata.height > 40000000
    )
      throw new Error("Dimensions");
    await image.stats();
    return [5, 6, 7, 8].includes(metadata.orientation ?? 0)
      ? { width: metadata.height, height: metadata.width }
      : { width: metadata.width, height: metadata.height };
  } catch {
    throw new Error(
      "Arquivo de imagem inválido ou acima de 40 megapixels. O original não foi alterado.",
    );
  }
}
