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

export async function findGlobalsCssPath(): Promise<string> {
  const spinner = ora('Searching for globals.css file...').start();

  try {
    const projectRoot = process.cwd();

    // Try each possible path
    for (const cssPath of POSSIBLE_CSS_PATHS) {
      const fullPath = path.join(projectRoot, cssPath);
      try {
        // Use async file stat to check if file exists and is accessible
        await fs.promises.access(fullPath, fs.constants.R_OK | fs.constants.W_OK);
        spinner.succeed(`Found globals.css at ${fullPath}`);
        return fullPath;
      } catch (err) {
        // File doesn't exist or isn't accessible, try next path
        continue;
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
    // Use promises for file operations with explicit encoding
    let cssContent = await fs.promises.readFile(cssPath, { encoding: 'utf8', flag: 'r' });

    // Check if the file contains a :root section with CSS variables
    if (!cssContent.includes(':root')) {
      spinner.fail('The globals.css file does not contain a :root section with CSS variables.');
      process.exit(1);
    }

    // Create a backup of the original file
    const backupPath = `${cssPath}.backup`;
    await fs.promises.writeFile(backupPath, cssContent, { encoding: 'utf8', flag: 'w' });
    spinner.info(`Created backup of original file at ${backupPath}`);

    // Create a new CSS content string with updated variables
    let updatedCssContent = cssContent;
    
    // First, find the :root section
    const rootMatch = updatedCssContent.match(/(:root\s*{)([^}]*)(})/s);
    
    if (!rootMatch) {
      spinner.fail('Could not parse the :root section in the CSS file.');
      process.exit(1);
    }
    
    // Extract the current root content
    const [fullMatch, rootStart, rootContent, rootEnd] = rootMatch;
    
    // Process each variable
    let newRootContent = rootContent;
    
    Object.entries(colorVariables).forEach(([variable, color]) => {
      // Escape special characters in the variable name for regex
      const escapedVariable = variable.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      
      // Check if variable exists in the root content
      const varRegex = new RegExp(`${escapedVariable}\\s*:\\s*[^;]+;`, 'g');
      
      if (varRegex.test(newRootContent)) {
        // Replace existing variable
        newRootContent = newRootContent.replace(
          varRegex, 
          `${variable}: ${color};`
        );
      } else {
        // Add new variable
        newRootContent += `\n  ${variable}: ${color};`;
      }
    });
    
    // Replace the root section in the CSS content
    updatedCssContent = updatedCssContent.replace(
      /(:root\s*{)([^}]*)(})/s,
      `$1${newRootContent}$3`
    );

    // Write the updated content back to the file with explicit options
    await fs.promises.writeFile(cssPath, updatedCssContent, { 
      encoding: 'utf8', 
      flag: 'w' 
    });

    // Force a file system sync to ensure changes are written to disk
    const fd = await fs.promises.open(cssPath, 'r');
    try {
      await fd.sync();
    } finally {
      await fd.close();
    }

    // Add a longer delay to ensure file system has completed the write operation
    await new Promise(resolve => setTimeout(resolve, 500));

    spinner.succeed(`Successfully updated ${cssPath} with the new theme colors.`);
  } catch (error: any) {
    spinner.fail(`Error updating globals.css: ${error.message || String(error)}`);
    process.exit(1);
  }
}
