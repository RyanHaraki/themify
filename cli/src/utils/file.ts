import fs from "fs";
import path from "path";
import ora from "ora";
import inquirer from "inquirer";

// Define supported image extensions
export const SUPPORTED_EXTENSIONS = [
  ".jpg", ".jpeg", ".png", ".svg", ".ico", ".gif", ".webp",
];

// Define possible globals.css locations
export const POSSIBLE_CSS_PATHS = [
  "./globals.css",
  "./src/app/globals.css",
  "./app/globals.css",
  "./styles/globals.css",
];

export async function findImagesInPublicFolder(): Promise<string[]> {
  const spinner = ora("Looking for images in the public folder...").start();

  try {
    // Check if public folder exists
    if (!fs.existsSync("./public")) {
      spinner.fail("Public folder not found. Make sure you are in a Next.js project root.");
      process.exit(1);
    }

    // Get all files in public folder recursively
    const getAllFiles = (dirPath: string, arrayOfFiles: string[] = []): string[] => {
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

export async function findGlobalsCssPath(): Promise<string> {
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
  const { customPath } = await inquirer.prompt([{
    type: "input",
    name: "customPath",
    message: "Please enter the path to your globals.css file:",
    default: "./src/app/globals.css",
    validate: (input) => {
      if (!input.endsWith(".css")) return "Please enter a valid CSS file path";
      return true;
    },
  }]);

  // Verify the custom path exists
  if (!fs.existsSync(customPath)) {
    spinner.fail(`The file ${customPath} does not exist.`);
    process.exit(1);
  }

  spinner.succeed(`Using globals.css at ${customPath}`);
  return customPath;
}

export function updateGlobalsCss(cssPath: string, colorVariables: Record<string, string>): void {
  const spinner = ora(`Updating ${cssPath} with new theme colors...`).start();

  try {
    let cssContent = fs.readFileSync(cssPath, "utf8");

    // Check if the file contains a :root section with CSS variables
    if (!cssContent.includes(":root")) {
      spinner.fail("The globals.css file does not contain a :root section with CSS variables.");
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
        cssContent = cssContent.replace(rootRegex, `$1  ${variable}: ${color};\n$2`);
      }
    });

    // Write the updated content back to the file
    fs.writeFileSync(cssPath, cssContent);
    spinner.succeed(`Successfully updated ${cssPath} with the new theme colors.`);
  } catch (error: any) {
    spinner.fail(`Error updating globals.css: ${error.message || String(error)}`);
    process.exit(1);
  }
}
