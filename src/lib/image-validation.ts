import type { ImageInput } from "./ai/types";
export function hasImageSignature(image: ImageInput) {
  const bytes = Buffer.from(image.data, "base64");
  if (bytes.length > 4 * 1024 * 1024) return false;
  if (image.mediaType === "image/png")
    return bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (image.mediaType === "image/jpeg")
    return bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (image.mediaType === "image/gif")
    return ["GIF87a", "GIF89a"].includes(bytes.subarray(0, 6).toString());
  return bytes.subarray(0, 4).toString() === "RIFF" && bytes.subarray(8, 12).toString() === "WEBP";
}
