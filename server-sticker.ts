import { removeBackground } from "@imgly/background-removal-node";
import sharp from "sharp";

const MAX_SUBJECT_SIDE = 440;
const OUTLINE_RADIUS = 14;
const OUTPUT_PADDING = 5;
const CORE_ALPHA = 48;
const VISIBLE_ALPHA = 20;

export async function createServerSticker(imageSource: string) {
  const source = await loadImageSource(imageSource);
  const removed = await removeBackground(source, {
    model: "small",
    output: {
      format: "image/png",
      quality: 0.92,
    },
  });
  const removedBuffer = Buffer.from(await removed.arrayBuffer());
  const { data, info } = await sharp(removedBuffer)
    .ensureAlpha()
    .resize({
      width: MAX_SUBJECT_SIDE,
      height: MAX_SUBJECT_SIDE,
      fit: "inside",
      withoutEnlargement: true,
    })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const cleaned = retainPrimarySubject(new Uint8ClampedArray(data), info.width, info.height);

  if (!cleaned) throw new Error("没有检测到可生成贴纸的主体。");

  const sticker = renderOutlinedSticker(cleaned.data, cleaned.width, cleaned.height);
  const png = await sharp(sticker.data, {
    raw: { width: sticker.width, height: sticker.height, channels: 4 },
  }).png().toBuffer();

  return `data:image/png;base64,${png.toString("base64")}`;
}

async function loadImageSource(value: string) {
  if (value.startsWith("data:image/")) {
    const match = value.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
    if (!match) throw new Error("原图数据格式不正确。");

    return new Blob([Buffer.from(match[2], "base64")], { type: match[1] });
  }

  const response = await fetch(value, { cache: "force-cache" });
  if (!response.ok) throw new Error(`原图下载失败：${response.status}`);

  return response.blob();
}

function retainPrimarySubject(data: Uint8ClampedArray, width: number, height: number) {
  const pixelCount = width * height;
  const labels = new Uint32Array(pixelCount);
  const queue = new Uint32Array(pixelCount);
  const components: Array<{ label: number; pixels: number; left: number; top: number; right: number; bottom: number }> = [];
  let nextLabel = 0;

  for (let start = 0; start < pixelCount; start += 1) {
    if (labels[start] || data[start * 4 + 3] <= CORE_ALPHA) continue;

    const label = ++nextLabel;
    let head = 0;
    let tail = 0;
    let pixels = 0;
    let left = width;
    let top = height;
    let right = -1;
    let bottom = -1;
    labels[start] = label;
    queue[tail++] = start;

    while (head < tail) {
      const pixel = queue[head++];
      const y = Math.floor(pixel / width);
      const x = pixel - y * width;
      pixels += 1;
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x);
      bottom = Math.max(bottom, y);

      for (let nextY = Math.max(0, y - 1); nextY <= Math.min(height - 1, y + 1); nextY += 1) {
        for (let nextX = Math.max(0, x - 1); nextX <= Math.min(width - 1, x + 1); nextX += 1) {
          const next = nextY * width + nextX;
          if (labels[next] || data[next * 4 + 3] <= CORE_ALPHA) continue;
          labels[next] = label;
          queue[tail++] = next;
        }
      }
    }

    components.push({ label, pixels, left, top, right, bottom });
  }

  const sorted = components.sort((a, b) => b.pixels - a.pixels);
  const primary = sorted[0];
  if (!primary) return null;

  const keep = new Uint8Array(nextLabel + 1);
  keep[primary.label] = 1;
  const primarySide = Math.max(primary.right - primary.left + 1, primary.bottom - primary.top + 1);
  const minimumCompanion = Math.max(18, Math.round(primary.pixels * 0.015));
  const maximumGap = Math.round(primarySide * 0.42);

  for (const component of sorted.slice(1)) {
    if (component.pixels < minimumCompanion) continue;
    if (boundsGap(component, primary) > maximumGap) continue;
    keep[component.label] = 1;
  }

  let left = width;
  let top = height;
  let right = -1;
  let bottom = -1;

  for (let pixel = 0; pixel < pixelCount; pixel += 1) {
    const alphaIndex = pixel * 4 + 3;
    if (!labels[pixel] || !keep[labels[pixel]]) data[alphaIndex] = 0;
    if (data[alphaIndex] <= VISIBLE_ALPHA) continue;
    const y = Math.floor(pixel / width);
    const x = pixel - y * width;
    left = Math.min(left, x);
    top = Math.min(top, y);
    right = Math.max(right, x);
    bottom = Math.max(bottom, y);
  }

  if (right < left || bottom < top) return null;

  const cropWidth = right - left + 1;
  const cropHeight = bottom - top + 1;
  const cropped = new Uint8ClampedArray(cropWidth * cropHeight * 4);

  for (let y = 0; y < cropHeight; y += 1) {
    const sourceStart = ((top + y) * width + left) * 4;
    const targetStart = y * cropWidth * 4;
    cropped.set(data.subarray(sourceStart, sourceStart + cropWidth * 4), targetStart);
  }

  return { data: cropped, width: cropWidth, height: cropHeight };
}

function renderOutlinedSticker(subject: Uint8ClampedArray, width: number, height: number) {
  const alpha = new Uint8Array(width * height);
  for (let pixel = 0; pixel < alpha.length; pixel += 1) alpha[pixel] = subject[pixel * 4 + 3];
  const horizontal = maxFilterHorizontal(alpha, width, height, OUTLINE_RADIUS);
  const dilated = maxFilterVertical(horizontal, width, height, OUTLINE_RADIUS);
  const inset = OUTLINE_RADIUS + OUTPUT_PADDING;
  const outputWidth = width + inset * 2;
  const outputHeight = height + inset * 2;
  const output = new Uint8ClampedArray(outputWidth * outputHeight * 4);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const sourcePixel = y * width + x;
      const outputPixel = (y + inset) * outputWidth + x + inset;
      const outputIndex = outputPixel * 4;
      const outlineAlpha = dilated[sourcePixel];
      output[outputIndex] = 255;
      output[outputIndex + 1] = 255;
      output[outputIndex + 2] = 255;
      output[outputIndex + 3] = outlineAlpha;

      const subjectIndex = sourcePixel * 4;
      const subjectAlpha = subject[subjectIndex + 3] / 255;
      if (!subjectAlpha) continue;
      const backgroundAlpha = output[outputIndex + 3] / 255;
      const combinedAlpha = subjectAlpha + backgroundAlpha * (1 - subjectAlpha);
      output[outputIndex] = Math.round((subject[subjectIndex] * subjectAlpha + 255 * backgroundAlpha * (1 - subjectAlpha)) / combinedAlpha);
      output[outputIndex + 1] = Math.round((subject[subjectIndex + 1] * subjectAlpha + 255 * backgroundAlpha * (1 - subjectAlpha)) / combinedAlpha);
      output[outputIndex + 2] = Math.round((subject[subjectIndex + 2] * subjectAlpha + 255 * backgroundAlpha * (1 - subjectAlpha)) / combinedAlpha);
      output[outputIndex + 3] = Math.round(combinedAlpha * 255);
    }
  }

  return { data: output, width: outputWidth, height: outputHeight };
}

function maxFilterHorizontal(alpha: Uint8Array, width: number, height: number, radius: number) {
  const result = new Uint8Array(alpha.length);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let maximum = 0;
      for (let nextX = Math.max(0, x - radius); nextX <= Math.min(width - 1, x + radius); nextX += 1) {
        maximum = Math.max(maximum, alpha[y * width + nextX]);
      }
      result[y * width + x] = maximum;
    }
  }
  return result;
}

function maxFilterVertical(alpha: Uint8Array, width: number, height: number, radius: number) {
  const result = new Uint8Array(alpha.length);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let maximum = 0;
      for (let nextY = Math.max(0, y - radius); nextY <= Math.min(height - 1, y + radius); nextY += 1) {
        maximum = Math.max(maximum, alpha[nextY * width + x]);
      }
      result[y * width + x] = maximum;
    }
  }
  return result;
}

function boundsGap(a: { left: number; top: number; right: number; bottom: number }, b: { left: number; top: number; right: number; bottom: number }) {
  const horizontal = Math.max(0, Math.max(a.left - b.right - 1, b.left - a.right - 1));
  const vertical = Math.max(0, Math.max(a.top - b.bottom - 1, b.top - a.bottom - 1));
  return Math.hypot(horizontal, vertical);
}
