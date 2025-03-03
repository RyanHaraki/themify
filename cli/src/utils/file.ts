import fs from 'fs';
import path from 'path';
import ora from 'ora';
import { SUPPORTED_EXTENSIONS, POSSIBLE_CSS_PATHS } from './constants';

export async function findImagesInPublicFolder(): Promise<string[]> {
  const spinner = ora('Searching for images in the public folder...').start();

  try {
    const publicDir = path.join(process.cwd(), 'public');

    // Check if public directory exists
    if (!fs.existsSync(publicDir)) {
      spinner.fail("Public directory not found. Make sure you're in a Next.js project root.");
      process.exit(1);
    }

    // Get all files in the public directory recursively
    const getAllFiles = (dir: string, fileList: string[] = []): string[] => {
      const files = fs.readdirSync(dir);

      files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
          getAllFiles(filePath, fileList);
        } else {
          const ext = path.extname(file).toLowerCase();
          if (SUPPORTED_EXTENSIONS.includes(ext)) {
            fileList.push(filePath);
          }
        }
      });

      return fileList;
    };

    const imageFiles = getAllFiles(publicDir);

    if (imageFiles.length === 0) {
      spinner.fail('No supported image files found in the public folder.');
      process.exit(1);
    }

    spinner.succeed(`Found ${imageFiles.length} images in the public folder.`);
    return imageFiles;
  } catch (error: any) {
    spinner.fail(`Error searching for images: ${error.message || String(error)}`);
    process.exit(1);
  }
}

export function findGlobalsCssPath(): string {
  const spinner = ora('Searching for globals.css file...').start();

  try {
    const projectRoot = process.cwd();

    // Try each possible path
    for (const cssPath of POSSIBLE_CSS_PATHS) {
      const fullPath = path.join(projectRoot, cssPath);
      if (fs.existsSync(fullPath)) {
        spinner.succeed(`Found globals.css at ${fullPath}`);
        return fullPath;
      }
    }

    // If we get here, we couldn't find the file
    spinner.fail("Could not find globals.css file. Make sure you're in a Next.js project root.");
    process.exit(1);
  } catch (error: any) {
    spinner.fail(`Error finding globals.css: ${error.message || String(error)}`);
    process.exit(1);
  }
}

export async function updateGlobalsCss(cssPath: string, colorVariables: Record<string, string>): Promise<void> {
  const spinner = ora(`Updating ${cssPath} with new theme colors...`).start();

  try {
    // Use promises for file operations
    let cssContent = await fs.promises.readFile(cssPath, 'utf8');

    // Check if the file contains a :root section with CSS variables
    if (!cssContent.includes(':root')) {
      spinner.fail('The globals.css file does not contain a :root section with CSS variables.');
      process.exit(1);
    }

    // Create a backup of the original file
    const backupPath = `${cssPath}.backup`;
    await fs.promises.writeFile(backupPath, cssContent);
    spinner.info(`Created backup of original file at ${backupPath}`);

    // Update each variable in the CSS content
    Object.entries(colorVariables).forEach(([variable, color]) => {
      // Escape special characters in the variable name for regex
      const escapedVariable = variable.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      // Use regex to replace the variable value
      const regex = new RegExp(`(${escapedVariable}\\s*:\\s*)([^;]+)(;)`, 'g');

      // Test if the variable exists in the content
      // We need to create a new RegExp instance because test() modifies the regex's lastIndex
      const testRegex = new RegExp(`${escapedVariable}\\s*:`, 'g');

      if (testRegex.test(cssContent)) {
        // Variable exists, replace its value
        cssContent = cssContent.replace(regex, `$1${color}$3`);
      } else {
        // If the variable doesn't exist, we'll add it to the :root section
        const rootRegex = /(:root\s*{[^}]*)(})/;
        cssContent = cssContent.replace(rootRegex, `$1  ${variable}: ${color};\n$2`);
      }
    });

    // Write the updated content back to the file and ensure it completes
    await fs.promises.writeFile(cssPath, cssContent);

    // Add a small delay to ensure file system has completed the write operation
    await new Promise(resolve => setTimeout(resolve, 100));

    spinner.succeed(`Successfully updated ${cssPath} with the new theme colors.`);
  } catch (error: any) {
    spinner.fail(`Error updating globals.css: ${error.message || String(error)}`);
    process.exit(1);
  }
}
