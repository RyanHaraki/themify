import fs from "fs";
import path from "path";
import { promisify } from "util";
import ora from "ora";
import { extractColors } from "extract-colors";
import getPixels from "get-pixels";
import { Color } from "../types";

const getPixelsPromise = promisify(getPixels);

// Helper to get MIME type from file extension
const getMimeType = (ext: string): string => {
  switch (ext.toLowerCase()) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".gif":
      return "image/gif";
    case ".webp":
      return "image/webp";
    case ".ico":
      return "image/x-icon";
    default:
      return "image/png"; // default fallback
  }
};

// Extract colors from SVG
async function extractFromSvg(imagePath: string): Promise<Color[]> {
  // Simple SVG color extraction by parsing the file content
  const svgContent = fs.readFileSync(imagePath, "utf8");
  const colorRegex = /#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{3}|rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)/g;
  const matches = svgContent.match(colorRegex) || [];

  // Deduplicate colors
  const uniqueColors = [...new Set(matches)];

  if (uniqueColors.length === 0) {
    throw new Error("Failed to extract colors from the SVG file.");
  }

  // Convert simple hex colors to Color objects
  return uniqueColors.map((hex) => {
    // Simple conversion from hex to rgb
    const hexColor = hex.startsWith("#") ? hex.substring(1) : hex;
    const r = parseInt(hexColor.substring(0, 2), 16);
    const g = parseInt(hexColor.substring(2, 4), 16);
    const b = parseInt(hexColor.substring(4, 6), 16);
    
    // Calculate HSL values
    const max = Math.max(r, g, b) / 255;
    const min = Math.min(r, g, b) / 255;
    const l = (max + min) / 2;
    
    let h = 0;
    let s = 0;
    
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      
      if (max === r / 255) {
        h = (g / 255 - b / 255) / d + (g < b ? 6 : 0);
      } else if (max === g / 255) {
        h = (b / 255 - r / 255) / d + 2;
      } else {
        h = (r / 255 - g / 255) / d + 4;
      }
      
      h /= 6;
    }
    
    return {
      hex,
      red: r,
      green: g,
      blue: b,
      hue: h,
      intensity: (r + g + b) / (3 * 255),
      lightness: l,
      saturation: s,
      area: 1 / uniqueColors.length, // Distribute area evenly
    };
  });
}

// Extract colors from raster images
async function extractFromRaster(imagePath: string, ext: string): Promise<Color[]> {
  const pixels = await getPixelsPromise(imagePath, getMimeType(ext));

  // Convert pixels to the format expected by extract-colors
  const data = Array.from(pixels.data);
  const width = pixels.shape[0];
  const height = pixels.shape[1];

  // Extract colors using extract-colors
  const options = {
    pixels: 10000, // number of pixels to sample
    distance: 0.2, // color distance (0 to 1)
    saturationImportance: 0.5, // saturation importance (0 to 1)
    splitPower: 10, // color splitting power
  };

  const colors = (await extractColors({ data, width, height }, options)) as Color[];

  if (colors.length === 0) {
    throw new Error("Failed to extract colors from the image.");
  }

  return colors;
}

// Main color extraction function
export async function extractColorsFromImage(imagePath: string): Promise<Color[]> {
  const spinner = ora(`Extracting colors from ${imagePath}...`).start();

  try {
    const ext = path.extname(imagePath).toLowerCase();

    // For SVG files, use a different approach by parsing the file directly
    if (ext === ".svg") {
      spinner.info("SVG detected. Using alternative color extraction method.");
      const colors = await extractFromSvg(imagePath);
      spinner.succeed(`Successfully extracted ${colors.length} colors from the SVG.`);
      return colors;
    }

    // For other image types, use get-pixels and extract-colors
    const colors = await extractFromRaster(imagePath, ext);
    spinner.succeed(`Successfully extracted ${colors.length} colors from the image.`);
    return colors;
  } catch (error: any) {
    spinner.fail(`Error extracting colors: ${error.message || String(error)}`);
    process.exit(1);
  }
}
