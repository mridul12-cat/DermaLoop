import "server-only";
import sharp from "sharp";
import { ProviderError } from "./client";
export async function validateImage(bytes: Uint8Array, mime: string) {
  if (bytes.length > 3500000 || bytes.length < 32)
    throw new ProviderError("IMAGE_SIZE", 413);
  const png =
    bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71;
  const jpg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (!((png && mime === "image/png") || (jpg && mime === "image/jpeg")))
    throw new ProviderError("IMAGE_TYPE", 415);
  try {
    const image = sharp(bytes, { limitInputPixels: 20000000 });
    const meta = await image.metadata();
    const { info } = await image
      .rotate()
      .raw()
      .toBuffer({ resolveWithObject: true });
    if (
      Math.min(info.width, info.height) < 480 ||
      Math.max(info.width, info.height) > 2560 ||
      (meta.pages && meta.pages > 1)
    )
      throw 0;
    return { width: info.width, height: info.height };
  } catch {
    throw new ProviderError("IMAGE_DIMENSIONS_OR_CORRUPT", 422);
  }
}
