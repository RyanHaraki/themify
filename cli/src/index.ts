#!/usr/bin/env node

import { Command } from "commander";
import chalk from "chalk";
import figlet from "figlet";
import inquirer from "inquirer";
import fs from "fs";
import path from "path";
import { promisify } from "util";
import { exec } from "child_process";
import ora from "ora";
import { extractColors } from "extract-colors";
import getPixels from "get-pixels";

const execPromise = promisify(exec);
const getPixelsPromise = promisify(getPixels);

// Define supported image extensions
const SUPPORTED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".svg"];

// Define possible globals.css locations
const POSSIBLE_CSS_PATHS = [
  "./globals.css",
  "./src/app/globals.css",
  "./app/globals.css",
  "./styles/globals.css",
];

// Display banner
console.log(
  chalk.cyan(figlet.textSync("Themify", { horizontalLayout: "full" }))
);
console.log(
  chalk.cyan("A tool to theme your Next.js website using colors from images\n")
);

const program = new Command();

program
  .version("1.0.0")
  .description(
    "A CLI tool to theme Next.js websites using colors extracted from images"
  )
  .parse(process.argv);

async function findImagesInPublicFolder(): Promise<string[]> {
  const spinner = ora("Looking for images in the public folder...").start();

  try {
    // Check if public folder exists
    if (!fs.existsSync("./public")) {
      spinner.fail(
        "Public folder not found. Make sure you are in a Next.js project root."
      );
      process.exit(1);
    }

    // Get all files in public folder recursively
    const getAllFiles = (
      dirPath: string,
      arrayOfFiles: string[] = []
    ): string[] => {
      const files = fs.readdirSync(dirPath);

      files.forEach((file) => {
        const fullPath = path.join(dirPath, file);
        if (fs.statSync(fullPath).isDirectory()) {
          arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
        } else {
          const ext = path.extname(file).toLowerCase();
          if (SUPPORTED_EXTENSIONS.includes(ext)) {
            arrayOfFiles.push(fullPath);
          }
        }
      });

      return arrayOfFiles;
    };

    const images = getAllFiles("./public");

    if (images.length === 0) {
      spinner.fail("No images found in the public folder.");
      process.exit(1);
    }

    spinner.succeed(`Found ${images.length} images in the public folder.`);
    return images;
  } catch (error: any) {
    spinner.fail(`Error finding images: ${error.message || String(error)}`);
    process.exit(1);
  }
}

async function findGlobalsCssPath(): Promise<string> {
  const spinner = ora("Looking for globals.css file...").start();

  // Check each possible path
  for (const cssPath of POSSIBLE_CSS_PATHS) {
    if (fs.existsSync(cssPath)) {
      spinner.succeed(`Found globals.css at ${cssPath}`);
      return cssPath;
    }
  }

  spinner.warn("Could not automatically find globals.css");

  // Ask user for the path
  const { customPath } = await inquirer.prompt([
    {
      type: "input",
      name: "customPath",
      message: "Please enter the path to your globals.css file:",
      default: "./src/app/globals.css",
      validate: (input) => {
        if (!input.endsWith(".css")) {
          return "Please enter a valid CSS file path";
        }
        return true;
      },
    },
  ]);

  // Verify the custom path exists
  if (!fs.existsSync(customPath)) {
    spinner.fail(`The file ${customPath} does not exist.`);
    process.exit(1);
  }

  spinner.succeed(`Using globals.css at ${customPath}`);
  return customPath;
}

// Define the interface for the colors returned by extract-colors
interface Color {
  hex: string;
  red: number;
  green: number;
  blue: number;
  hue: number;
  intensity: number;
  lightness: number;
  saturation: number;
  area: number;
}

async function extractColorsFromImage(imagePath: string): Promise<Color[]> {
  const spinner = ora(`Extracting colors from ${imagePath}...`).start();

  try {
    const ext = path.extname(imagePath).toLowerCase();

    // For SVG files, use a different approach by parsing the file directly
    if (ext === ".svg") {
      spinner.info("SVG detected. Using alternative color extraction method.");

      // Simple SVG color extraction by parsing the file content
      const svgContent = fs.readFileSync(imagePath, "utf8");
      const colorRegex =
        /#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{3}|rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)/g;
      const matches = svgContent.match(colorRegex) || [];

      // Deduplicate colors
      const uniqueColors = [...new Set(matches)];

      if (uniqueColors.length === 0) {
        spinner.fail("Failed to extract colors from the SVG file.");
        process.exit(1);
      }

      // Convert simple hex colors to Color objects
      const colors: Color[] = uniqueColors.map((hex, index) => {
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
          hex: hex,
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

      spinner.succeed(
        `Successfully extracted ${colors.length} colors from the SVG.`
      );
      return colors;
    }

    // For other image types, use get-pixels and extract-colors
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

    const colors = (await extractColors(
      { data, width, height },
      options
    )) as Color[];

    if (colors.length === 0) {
      spinner.fail("Failed to extract colors from the image.");
      process.exit(1);
    }

    spinner.succeed(
      `Successfully extracted ${colors.length} colors from the image.`
    );
    return colors;
  } catch (error: any) {
    spinner.fail(`Error extracting colors: ${error.message || String(error)}`);
    process.exit(1);
  }
}

function generateCSSVariables(colors: Color[]): Record<string, string> {
  // Make sure we have at least some colors to work with
  if (colors.length === 0) {
    console.error("No colors provided to generate theme");
    process.exit(1);
  }

  // Sort colors by different properties for better selection
  const byArea = [...colors].sort((a, b) => b.area - a.area);
  const byLightness = [...colors].sort((a, b) => b.lightness - a.lightness);
  const byDarkness = [...colors].sort((a, b) => a.lightness - b.lightness);
  const bySaturation = [...colors].sort((a, b) => b.saturation - a.saturation);

  // Find colors with good contrast
  const findContrastColor = (baseColor: Color, preferDark = false): Color => {
    // Calculate contrast ratio between two colors
    const getLuminance = (color: Color): number => {
      const r = color.red / 255;
      const g = color.green / 255;
      const b = color.blue / 255;

      const R = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
      const G = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
      const B = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);

      return 0.2126 * R + 0.7152 * G + 0.0722 * B;
    };

    const baseLuminance = getLuminance(baseColor);

    // Sort by contrast ratio
    const sorted = [...colors].sort((a, b) => {
      const aLuminance = getLuminance(a);
      const bLuminance = getLuminance(b);

      const aRatio =
        (Math.max(aLuminance, baseLuminance) + 0.05) /
        (Math.min(aLuminance, baseLuminance) + 0.05);
      const bRatio =
        (Math.max(bLuminance, baseLuminance) + 0.05) /
        (Math.min(bLuminance, baseLuminance) + 0.05);

      // If we prefer dark colors and both have good contrast, prioritize the darker one
      if (preferDark && aRatio > 4.5 && bRatio > 4.5) {
        return aLuminance - bLuminance;
      }

      return bRatio - aRatio;
    });

    // Return the color with the best contrast
    return sorted[0];
  };

  // Get dominant color (largest area) for background
  const background = byLightness[0]; // Lightest color for background

  // Find a foreground with good contrast against background
  const foreground = findContrastColor(background, true); // Prefer dark

  // Get a color with medium lightness for card background
  const cardIndex = Math.floor(byLightness.length / 2);
  const card = byLightness[cardIndex];

  // Find a good contrast for card foreground
  const cardForeground = findContrastColor(card);

  // Get a vibrant color for primary (high saturation)
  const primary = bySaturation[0];

  // Find a good contrast for primary foreground
  const primaryForeground = findContrastColor(primary);

  // Get a less saturated color for secondary
  const secondaryIndex = Math.min(
    Math.floor(bySaturation.length / 2),
    bySaturation.length - 1
  );
  const secondary = bySaturation[secondaryIndex];

  // Find a good contrast for secondary foreground
  const secondaryForeground = findContrastColor(secondary);

  // Get a subtle color for muted (low saturation, medium lightness)
  const muted =
    [...colors]
      .sort((a, b) => a.saturation - b.saturation)
      .filter((c) => c.lightness > 0.3 && c.lightness < 0.7)[0] ||
    byLightness[Math.floor(byLightness.length / 2)];

  // Find a good contrast for muted foreground
  const mutedForeground = findContrastColor(muted);

  // Get a light color for popover
  const popover = byLightness[Math.min(1, byLightness.length - 1)]; // Second lightest

  // Find a good contrast for popover foreground
  const popoverForeground = findContrastColor(popover);

  // Create a mapping for the theme variables
  return {
    "--background": background.hex,
    "--foreground": foreground.hex,
    "--card": card.hex,
    "--card-foreground": cardForeground.hex,
    "--popover": popover.hex,
    "--popover-foreground": popoverForeground.hex,
    "--primary": primary.hex,
    "--primary-foreground": primaryForeground.hex,
    "--secondary": secondary.hex,
    "--secondary-foreground": secondaryForeground.hex,
    "--muted": muted.hex,
    "--muted-foreground": mutedForeground.hex,
    "--accent": secondary.hex, // Reuse secondary for accent
    "--accent-foreground": secondaryForeground.hex, // Reuse secondary foreground
    "--destructive": "#ff0000", // Keep a standard red for destructive
    "--destructive-foreground": "#ffffff", // White text on destructive
    "--border": muted.hex, // Reuse muted for border
    "--input": muted.hex, // Reuse muted for input
    "--ring": primary.hex, // Reuse primary for ring
  };
}

function updateGlobalsCss(
  cssPath: string,
  colorVariables: Record<string, string>
): void {
  const spinner = ora(`Updating ${cssPath} with new theme colors...`).start();

  try {
    let cssContent = fs.readFileSync(cssPath, "utf8");

    // Check if the file contains a :root section with CSS variables
    if (!cssContent.includes(":root")) {
      spinner.fail(
        "The globals.css file does not contain a :root section with CSS variables."
      );
      process.exit(1);
    }

    // Create a backup of the original file
    const backupPath = `${cssPath}.backup`;
    fs.writeFileSync(backupPath, cssContent);
    spinner.info(`Created backup of original file at ${backupPath}`);

    // Update each variable in the CSS content
    Object.entries(colorVariables).forEach(([variable, color]) => {
      // Use regex to replace the variable value
      const regex = new RegExp(`(${variable}\\s*:\\s*)([^;]+)(;)`, "g");

      if (regex.test(cssContent)) {
        cssContent = cssContent.replace(regex, `$1${color}$3`);
      } else {
        // If the variable doesn't exist, we'll add it to the :root section
        const rootRegex = /(:root\s*{[^}]*)(})/;
        cssContent = cssContent.replace(
          rootRegex,
          `$1  ${variable}: ${color};\n$2`
        );
      }
    });

    // Write the updated content back to the file
    fs.writeFileSync(cssPath, cssContent);
    spinner.succeed(
      `Successfully updated ${cssPath} with the new theme colors.`
    );
  } catch (error: any) {
    spinner.fail(
      `Error updating globals.css: ${error.message || String(error)}`
    );
    process.exit(1);
  }
}

async function main() {
  try {
    // Find images in public folder
    const images = await findImagesInPublicFolder();

    // Ask user to select an image
    const { selectedImage } = await inquirer.prompt([
      {
        type: "list",
        name: "selectedImage",
        message: "Select an image to base your theme on:",
        choices: images.map((img) => ({
          name: path.relative("./public", img),
          value: img,
        })),
      },
    ]);

    // Find globals.css path
    const cssPath = await findGlobalsCssPath();

    // Extract colors from the selected image
    const colors = await extractColorsFromImage(selectedImage);

    // Generate CSS variables from the extracted colors
    const colorVariables = generateCSSVariables(colors);

    // Update globals.css with the new theme colors
    updateGlobalsCss(cssPath, colorVariables);

    console.log(chalk.green("\n✨ Theme updated successfully! ✨"));
    console.log(chalk.cyan("The following colors were applied:"));

    Object.entries(colorVariables).forEach(([variable, color]) => {
      console.log(`${chalk.yellow(variable)}: ${chalk.hex(color)(color)}`);
    });

    console.log(
      chalk.cyan(
        "\nIf you need to revert the changes, a backup file was created."
      )
    );
  } catch (error: any) {
    console.error(chalk.red(`\nError: ${error.message || String(error)}`));
    process.exit(1);
  }
}

main();
