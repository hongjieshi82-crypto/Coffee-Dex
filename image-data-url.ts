import "server-only";

export const MAX_SOURCE_IMAGE_BYTES = 4 * 1024 * 1024;
export const MAX_SOURCE_IMAGE_DATA_URL_LENGTH = 32 + Math.ceil(MAX_SOURCE_IMAGE_BYTES / 3) * 4;

const maxSourceImageSide = 8192;
const maxSourceImagePixels = 24_000_000;
const base64Pattern = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const supportedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export interface DecodedSourceImage {
  buffer: Buffer;
  contentType: "image/jpeg" | "image/png" | "image/webp";
  dataUrl: string;
  width: number;
  height: number;
}

export function decodeSourceImageDataUrl(value: unknown): DecodedSourceImage | null {
  if (typeof value !== "string" || value.length > MAX_SOURCE_IMAGE_DATA_URL_LENGTH) return null;

  const match = value.match(/^data:(image\/[a-z0-9.+-]+);base64,([A-Za-z0-9+/=]+)$/i);
  if (!match) return null;

  const contentType = match[1].toLowerCase();
  const encoded = match[2];

  if (!supportedMimeTypes.has(contentType) || encoded.length % 4 !== 0 || !base64Pattern.test(encoded)) {
    return null;
  }

  const buffer = Buffer.from(encoded, "base64");
  if (!buffer.length || buffer.length > MAX_SOURCE_IMAGE_BYTES || buffer.toString("base64") !== encoded) return null;

  const dimensions = readImageDimensions(buffer, contentType);
  if (!dimensions) return null;

  const { width, height } = dimensions;
  if (
    width < 1 ||
    height < 1 ||
    width > maxSourceImageSide ||
    height > maxSourceImageSide ||
    width * height > maxSourceImagePixels
  ) {
    return null;
  }

  return {
    buffer,
    contentType: contentType as DecodedSourceImage["contentType"],
    dataUrl: value,
    width,
    height,
  };
}

function readImageDimensions(buffer: Buffer, contentType: string) {
  if (contentType === "image/png") return readPngDimensions(buffer);
  if (contentType === "image/jpeg") return readJpegDimensions(buffer);
  if (contentType === "image/webp") return readWebpDimensions(buffer);

  return null;
}

function readPngDimensions(buffer: Buffer) {
  if (
    buffer.length < 24 ||
    !buffer.subarray(0, pngSignature.length).equals(pngSignature) ||
    buffer.toString("ascii", 12, 16) !== "IHDR"
  ) {
    return null;
  }

  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function readJpegDimensions(buffer: Buffer) {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8 || buffer[2] !== 0xff) return null;

  const startOfFrameMarkers = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);
  let offset = 2;

  while (offset + 4 <= buffer.length) {
    while (offset < buffer.length && buffer[offset] !== 0xff) offset += 1;
    while (offset < buffer.length && buffer[offset] === 0xff) offset += 1;
    if (offset >= buffer.length) return null;

    const marker = buffer[offset];
    offset += 1;

    if (marker === 0xd8 || marker === 0x01) continue;
    if (marker === 0xd9 || marker === 0xda || offset + 2 > buffer.length) return null;

    const segmentLength = buffer.readUInt16BE(offset);
    if (segmentLength < 2 || offset + segmentLength > buffer.length) return null;

    if (startOfFrameMarkers.has(marker)) {
      if (segmentLength < 7) return null;

      return {
        width: buffer.readUInt16BE(offset + 5),
        height: buffer.readUInt16BE(offset + 3),
      };
    }

    offset += segmentLength;
  }

  return null;
}

function readWebpDimensions(buffer: Buffer) {
  if (
    buffer.length < 25 ||
    buffer.toString("ascii", 0, 4) !== "RIFF" ||
    buffer.toString("ascii", 8, 12) !== "WEBP" ||
    buffer.readUInt32LE(4) + 8 > buffer.length
  ) {
    return null;
  }

  const format = buffer.toString("ascii", 12, 16);

  if (format === "VP8X" && buffer.length >= 30) {
    return {
      width: 1 + buffer.readUIntLE(24, 3),
      height: 1 + buffer.readUIntLE(27, 3),
    };
  }

  if (
    format === "VP8 " &&
    buffer.length >= 30 &&
    buffer[23] === 0x9d &&
    buffer[24] === 0x01 &&
    buffer[25] === 0x2a
  ) {
    return {
      width: buffer.readUInt16LE(26) & 0x3fff,
      height: buffer.readUInt16LE(28) & 0x3fff,
    };
  }

  if (format === "VP8L" && buffer[20] === 0x2f) {
    const bits = buffer.readUInt32LE(21);

    return {
      width: (bits & 0x3fff) + 1,
      height: ((bits >>> 14) & 0x3fff) + 1,
    };
  }

  return null;
}
