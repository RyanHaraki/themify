import path from "path";
import { promisify } from "util";
import ora from "ora";
import { extractColors } from "extract-colors";
import getPixels from "get-pixels";
import { Color } from "../types";
import { SUPPORTED_EXTENSIONS } from "../utils/constants";

const getPixelsPromise = promisify(getPixels);

// Extract colors from raster images
async function extractFromRaster(imagePath: string): Promise<Color[]> {
  // Get MIME type based on file extension
  const ext = path.extname(imagePath).toLowerCase();
  let mimeType: string;

  switch (ext) {
    case ".jpg":
    case ".jpeg":
      mimeType = "image/jpeg";
      break;
    case ".png":
      mimeType = "image/png";
      break;
    default:
      throw new Error(`Unsupported image format: ${ext}`);
  }

  const pixels = await getPixelsPromise(imagePath, mimeType);

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

  const colors = (await extractColors(
    { data, width, height },
    options
  )) as Color[];

  if (colors.length === 0) {
    throw new Error("Failed to extract colors from the image.");
  }

  return colors;
}

// Main color extraction function
export async function extractColorsFromImage(
  imagePath: string
): Promise<Color[]> {
  const spinner = ora(`Extracting colors from ${imagePath}...`).start();

  try {
    const ext = path.extname(imagePath).toLowerCase();

    // Verify the file extension is supported
    if (!SUPPORTED_EXTENSIONS.includes(ext)) {
      spinner.fail(
        `Unsupported image format: ${ext}. Supported formats are: ${SUPPORTED_EXTENSIONS.join(
          ", "
        )}`
      );
      process.exit(1);
    }

    // For other supported image types (JPG, PNG), use get-pixels and extract-colors
    const colors = await extractFromRaster(imagePath);
    spinner.succeed(
      `Successfully extracted ${colors.length} colors from the image.`
    );

    return colors;
  } catch (error: any) {
    spinner.fail(`Error extracting colors: ${error.message || String(error)}`);
    process.exit(1);
  }
}
