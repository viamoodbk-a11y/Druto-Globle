import qrPosterTemplate from "@/assets/qr-poster-template.jpg";

interface GeneratePosterOptions {
  qrCodeSvg: SVGSVGElement;
  restaurantName: string;
}

/**
 * New poster template has two white areas:
 * 1. Top large white rectangle — for the QR code
 * 2. Bottom smaller white pill/rectangle — for the shop name
 *
 * We detect both by scanning for white regions and use them accordingly.
 */

// Output canvas dimensions (A5 at 300 DPI)
const CANVAS_WIDTH = 1748;
const CANVAS_HEIGHT = 2480;

const ANALYSIS_SCALE = 0.25;
const WHITE_RGB_THRESHOLD = 235;
const WHITE_ALPHA_THRESHOLD = 200;

type Rect = { x: number; y: number; width: number; height: number };

const isWhitePixel = (r: number, g: number, b: number, a: number) =>
  a >= WHITE_ALPHA_THRESHOLD &&
  r >= WHITE_RGB_THRESHOLD &&
  g >= WHITE_RGB_THRESHOLD &&
  b >= WHITE_RGB_THRESHOLD;

/**
 * Detect all large white regions in the template.
 * Returns them sorted top-to-bottom by Y position.
 */
const detectWhiteRegions = (templateImg: HTMLImageElement): Rect[] => {
  const w = Math.max(1, Math.round(CANVAS_WIDTH * ANALYSIS_SCALE));
  const h = Math.max(1, Math.round(CANVAS_HEIGHT * ANALYSIS_SCALE));

  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  if (!ctx) return [];

  ctx.drawImage(templateImg, 0, 0, w, h);

  const scanMinX = Math.round(w * 0.05);
  const scanMaxX = Math.round(w * 0.95);
  const scanMinY = Math.round(h * 0.15);
  const scanMaxY = Math.round(h * 0.95);

  const img = ctx.getImageData(scanMinX, scanMinY, scanMaxX - scanMinX, scanMaxY - scanMinY);
  const sw = img.width;
  const sh = img.height;
  const data = img.data;

  const visited = new Uint8Array(sw * sh);
  const idx = (x: number, y: number) => y * sw + x;

  const regions: { area: number; minX: number; minY: number; maxX: number; maxY: number }[] = [];

  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) {
      const i = idx(x, y);
      if (visited[i]) continue;
      visited[i] = 1;

      const p = i * 4;
      if (!isWhitePixel(data[p], data[p + 1], data[p + 2], data[p + 3])) continue;

      let area = 0;
      let minX = x, minY = y, maxX = x, maxY = y;

      const stack: number[] = [i];
      while (stack.length) {
        const cur = stack.pop()!;
        area++;
        const cx = cur % sw;
        const cy = Math.floor(cur / sw);

        if (cx < minX) minX = cx;
        if (cy < minY) minY = cy;
        if (cx > maxX) maxX = cx;
        if (cy > maxY) maxY = cy;

        const neighbors = [
          [cx - 1, cy], [cx + 1, cy], [cx, cy - 1], [cx, cy + 1],
        ];

        for (const [nx, ny] of neighbors) {
          if (nx < 0 || nx >= sw || ny < 0 || ny >= sh) continue;
          const ni = idx(nx, ny);
          if (visited[ni]) continue;
          visited[ni] = 1;

          const np = ni * 4;
          if (!isWhitePixel(data[np], data[np + 1], data[np + 2], data[np + 3])) continue;
          stack.push(ni);
        }
      }

      // Ignore tiny specks
      if (area < sw * sh * 0.005) continue;
      regions.push({ area, minX, minY, maxX, maxY });
    }
  }

  // Convert to canvas coords and sort by Y (top first)
  return regions
    .map((r) => ({
      x: Math.round((scanMinX + r.minX) / ANALYSIS_SCALE),
      y: Math.round((scanMinY + r.minY) / ANALYSIS_SCALE),
      width: Math.round((r.maxX - r.minX + 1) / ANALYSIS_SCALE),
      height: Math.round((r.maxY - r.minY + 1) / ANALYSIS_SCALE),
    }))
    .sort((a, b) => a.y - b.y);
};

// Fallbacks
const FALLBACK_QR_CONTAINER: Rect = { x: 260, y: 720, width: 1228, height: 900 };
const FALLBACK_NAME_CONTAINER: Rect = { x: 380, y: 1750, width: 988, height: 160 };

/**
 * Generates a branded QR poster with the QR code in the top white area
 * and the restaurant name in the bottom white area.
 */
export const generateQRPoster = async ({
  qrCodeSvg,
  restaurantName,
}: GeneratePosterOptions): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      reject(new Error("Could not get canvas context"));
      return;
    }

    const templateImg = new Image();
    templateImg.crossOrigin = "anonymous";

    templateImg.onload = () => {
      canvas.width = CANVAS_WIDTH;
      canvas.height = CANVAS_HEIGHT;

      // Detect white regions
      const regions = detectWhiteRegions(templateImg);
      const qrContainer = regions.length >= 1 ? regions[0] : FALLBACK_QR_CONTAINER;
      const nameContainer = regions.length >= 2 ? regions[1] : FALLBACK_NAME_CONTAINER;

      // Draw template
      ctx.drawImage(templateImg, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // --- QR Code ---
      const inset = Math.round(Math.min(qrContainer.width, qrContainer.height) * 0.04);
      const inner = {
        x: qrContainer.x + inset,
        y: qrContainer.y + inset,
        width: qrContainer.width - inset * 2,
        height: qrContainer.height - inset * 2,
      };

      const qrSize = Math.round(Math.min(inner.width, inner.height) * 0.92);
      const qrX = Math.round(inner.x + (inner.width - qrSize) / 2);
      const qrY = Math.round(inner.y + (inner.height - qrSize) / 2);

      const svgData = new XMLSerializer().serializeToString(qrCodeSvg);
      const qrImg = new Image();

      qrImg.onload = () => {
        ctx.imageSmoothingEnabled = false;

        // White background behind QR
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(qrX, qrY, qrSize, qrSize);

        // Draw QR
        ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

        // --- Restaurant Name in bottom white area ---
        ctx.imageSmoothingEnabled = true;

        // Draw white background for name area (ensures clean text)
        const nameInset = Math.round(Math.min(nameContainer.width, nameContainer.height) * 0.05);
        const nameInner = {
          x: nameContainer.x + nameInset,
          y: nameContainer.y + nameInset,
          width: nameContainer.width - nameInset * 2,
          height: nameContainer.height - nameInset * 2,
        };

        // Calculate font size to fit the name container
        const maxFontSize = Math.round(nameInner.height * 0.55);
        const minFontSize = Math.round(nameInner.height * 0.25);
        let fontSize = maxFontSize;

        ctx.font = `bold ${fontSize}px "Segoe UI", "SF Pro Display", "Helvetica Neue", Arial, sans-serif`;

        // Shrink font until text fits
        while (fontSize > minFontSize && ctx.measureText(restaurantName).width > nameInner.width * 0.9) {
          fontSize -= 2;
          ctx.font = `bold ${fontSize}px "Segoe UI", "SF Pro Display", "Helvetica Neue", Arial, sans-serif`;
        }

        // Draw the name centered in the bottom white area
        ctx.fillStyle = "#7a1a1a"; // Dark red to match poster theme
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(
          restaurantName,
          Math.round(nameContainer.x + nameContainer.width / 2),
          Math.round(nameContainer.y + nameContainer.height / 2),
          nameInner.width
        );

        // Export as PNG
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error("Failed to generate poster image"));
          },
          "image/png",
          1.0
        );
      };

      qrImg.onerror = () => reject(new Error("Failed to load QR code image"));
      qrImg.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
    };

    templateImg.onerror = () => reject(new Error("Failed to load poster template"));
    templateImg.src = qrPosterTemplate;
  });
};

/**
 * Downloads a blob as a file
 */
export const downloadBlob = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};
