import { Color } from "../types";

/**
 * Calculates the luminance of a color
 * @param color The color to calculate luminance for
 * @returns Luminance value between 0 and 1
 */
function calculateLuminance(color: Color): number {
  // Convert RGB to relative luminance using the formula
  // L = 0.2126 * R + 0.7152 * G + 0.0722 * B
  const r = color.red / 255;
  const g = color.green / 255;
  const b = color.blue / 255;
  
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Assigns colors to specific roles based on their properties
 * @param colors Array of colors to assign roles to
 * @returns Object with color roles assigned
 */
function assignColors(colors: Color[]): Record<string, string> {
  // We need exactly 6 colors for our theme
  if (colors.length !== 6) {
    // If we have fewer than 6 colors, we'll create variations
    if (colors.length < 6) {
      // Sort by luminance to get a range from darkest to lightest
      colors.sort((a, b) => calculateLuminance(a) - calculateLuminance(b));
      
      // Create variations to fill in the missing colors
      while (colors.length < 6) {
        // Take the color with the most contrast to the last added color
        const baseColor = colors[0];
        
        // Create a variation with adjusted RGB values
        const variation: Color = {
          ...baseColor,
          red: Math.max(0, Math.min(255, baseColor.red + Math.floor(Math.random() * 40) - 20)),
          green: Math.max(0, Math.min(255, baseColor.green + Math.floor(Math.random() * 40) - 20)),
          blue: Math.max(0, Math.min(255, baseColor.blue + Math.floor(Math.random() * 40) - 20)),
        };
        
        // Update the hex value based on the new RGB
        variation.hex = `#${variation.red.toString(16).padStart(2, "0")}${
          variation.green.toString(16).padStart(2, "0")}${
          variation.blue.toString(16).padStart(2, "0")}`;
        
        colors.push(variation);
      }
    } else {
      // If we have more than 6 colors, select the most representative ones
      
      // Sort by area (prominence in the image)
      colors.sort((a, b) => b.area - a.area);
      
      // Take the top 6 colors by area
      colors = colors.slice(0, 6);
    }
  }
  
  // Sort colors by luminance for role assignment
  colors.sort((a, b) => calculateLuminance(a) - calculateLuminance(b));
  
  // Assign roles based on position in the sorted array
  return {
    "--background": colors[0].hex, // Darkest color for background
    "--foreground": colors[5].hex, // Lightest color for foreground text
    "--primary": colors[3].hex,    // Mid-bright color for primary elements
    "--secondary": colors[2].hex,  // Mid-dark color for secondary elements
    "--accent": colors[4].hex,     // Bright but not brightest for accent
    "--muted": colors[1].hex,      // Dark but not darkest for muted elements
  };
}

/**
 * Generates a theme from extracted colors
 * @param colors Array of extracted colors
 * @returns Object with CSS variable names and their color values
 */
export function generateTheme(colors: Color[]): Record<string, string> {
  // Validate input
  if (colors.length === 0) {
    throw new Error("No colors provided to generate theme");
  }
  
  // Sort colors by area (prominence in the image)
  colors.sort((a, b) => b.area - a.area);
  
  // Get the most prominent colors (up to 6)
  const prominentColors = colors.slice(0, Math.min(colors.length, 6));
  
  // Assign colors to specific roles
  const assignedColors = assignColors(prominentColors);
  
  // Create and return the theme variable mapping
  return {
    // Base colors
    "--background": assignedColors["--background"],
    "--foreground": assignedColors["--foreground"],

    // Card component colors
    "--card": assignedColors["--background"],
    "--card-foreground": assignedColors["--foreground"],

    // Popover/dropdown colors
    "--popover": assignedColors["--background"],
    "--popover-foreground": assignedColors["--foreground"],

    // Primary action colors (buttons, links, etc.)
    "--primary": assignedColors["--primary"],
    "--primary-foreground": assignedColors["--foreground"],

    // Secondary action colors
    "--secondary": assignedColors["--secondary"],
    "--secondary-foreground": assignedColors["--foreground"],

    // Muted/subtle UI elements
    "--muted": assignedColors["--muted"],
    "--muted-foreground": assignedColors["--primary"],

    // Accent colors
    "--accent": assignedColors["--accent"],
    "--accent-foreground": assignedColors["--foreground"],

    // Destructive action colors (delete, warning, etc.)
    "--destructive": "#ff0000", // Standard red for destructive actions
    "--destructive-foreground": "#ffffff", // White text on destructive background

    // UI element colors
    "--border": assignedColors["--muted"],
    "--input": assignedColors["--muted"],
    "--ring": assignedColors["--primary"],
  };
}
