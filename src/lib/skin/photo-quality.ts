import type { CaptureConditions } from "../models";
export function measure(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): Pick<CaptureConditions, "brightness" | "sharpness"> {
  let total = 0,
    edge = 0,
    count = 0;
  const gray = (i: number) =>
    0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
  for (let y = 1; y < height - 1; y++)
    for (let x = 1; x < width - 1; x++) {
      const i = (y * width + x) * 4,
        v = gray(i);
      total += v;
      edge += Math.abs(
        4 * v -
          gray(i - 4) -
          gray(i + 4) -
          gray(i - width * 4) -
          gray(i + width * 4),
      );
      count++;
    }
  return { brightness: total / count, sharpness: edge / count };
}
export async function prepare(file: File) {
  if (file.size > 15000000 || !["image/jpeg", "image/png"].includes(file.type))
    throw new Error("Choose a JPEG or PNG under 15 MB.");
  const img = await createImageBitmap(file, { imageOrientation: "from-image" });
  const ratio = Math.min(1, 2560 / Math.max(img.width, img.height));
  const width = Math.round(img.width * ratio),
    height = Math.round(img.height * ratio);
  if (Math.min(width, height) < 480) {
    img.close();
    throw new Error(
      "The short side must stay at least 480 pixels after resizing. Choose a larger, less narrow photo.",
    );
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, width, height);
  img.close();
  const small = document.createElement("canvas");
  small.width = 160;
  small.height = Math.round((height / width) * 160);
  const sc = small.getContext("2d")!;
  sc.drawImage(canvas, 0, 0, small.width, small.height);
  const measurements = measure(
    sc.getImageData(0, 0, small.width, small.height).data,
    small.width,
    small.height,
  );
  const blob = await new Promise<Blob>((r, j) =>
    canvas.toBlob(
      (b) => (b ? r(b) : j(new Error("Image conversion failed"))),
      "image/jpeg",
      0.92,
    ),
  );
  if (blob.size > 3500000)
    throw new Error(
      "Prepared image exceeds 3.5 MB. Please choose a smaller photo.",
    );
  return {
    blob,
    capture: { ...measurements, width, height, frontView: false },
    preview: URL.createObjectURL(blob),
  };
}
