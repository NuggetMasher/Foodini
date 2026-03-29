/**
 * Compresses a base64 image string by resizing it and lowering its quality.
 * @param base64Str The original base64 image string.
 * @param maxWidth The maximum width for the resized image.
 * @param quality The JPEG quality (0.0 to 1.0).
 * @returns A promise that resolves to the compressed base64 image string.
 */
export function compressImage(base64Str: string, maxWidth: number = 800, quality: number = 0.7): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let width = img.width;
      let height = img.height;

      // Calculate new dimensions while maintaining aspect ratio
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Failed to get canvas context"));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      // Export as JPEG with specified quality
      const compressedBase64 = canvas.toDataURL("image/jpeg", quality);
      resolve(compressedBase64);
    };
    img.onerror = (err) => {
      reject(err);
    };
  });
}
