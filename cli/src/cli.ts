#!/usr/bin/env node

import { Command } from "commander";
import chalk from "chalk";
import figlet from "figlet";
import inquirer from "inquirer";
import path from "path";
import { findImagesInPublicFolder, findGlobalsCssPath, updateGlobalsCss } from "./utils/file";
import { extractColorsFromImage } from "./extractors/colorExtractor";
import { generateTheme } from "./generators/themeGenerator";

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
    const colorVariables = generateTheme(colors);

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
