import { Color } from "../types";

function adjustLightness(color: Color, percentage: number): string {
  const newLightness = Math.min(
    1,
    Math.max(0, color.lightness + percentage / 100)
  );
  return `hsl(${color.hue}, ${color.saturation * 100}%, ${
    newLightness * 100
  }%)`;
}

function assignColors(colors: Color[]) {
  // Function to calculate relative luminance for contrast checking
  function luminance(color: Color) {
    const rgb = [color.red, color.green, color.blue].map((c) => c / 255);
    return rgb.reduce(
      (lum, c) =>
        lum + (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4),
      0
    );
  }

  // If we don't have 6 colors, create monochromatic variations
  if (colors.length < 6) {
    // Sort by area to get the most prominent color
    colors.sort((a, b) => b.area - a.area);
    const baseColor = colors[0];

    // Create monochromatic variations until we have 6 colors
    const variations = [
      { ...baseColor }, // Original color
      { ...baseColor, lightness: Math.max(0.1, baseColor.lightness - 0.3) }, // Darker
      { ...baseColor, lightness: Math.min(0.9, baseColor.lightness + 0.3) }, // Lighter
      { ...baseColor, lightness: Math.max(0.05, baseColor.lightness - 0.5) }, // Much darker
      { ...baseColor, lightness: Math.min(0.95, baseColor.lightness + 0.5) }, // Much lighter
      { ...baseColor, saturation: Math.max(0.1, baseColor.saturation - 0.2) }, // Less saturated
    ];

    // Take as many variations as needed
    colors = variations.slice(0, 6);
  } else if (colors.length > 6) {
    // If we have more than 6 colors, select the most representative ones
    // Sort by area (prominence in the image)
    colors.sort((a, b) => b.area - a.area);

    // Take the top 6 colors by area
    colors = colors.slice(0, 6);
  }

  // Sort colors by luminance
  const sorted = [...colors].sort((a, b) => luminance(a) - luminance(b));

  return {
    "--background": adjustLightness(sorted[0], -5),
    "--foreground": adjustLightness(sorted[5], 5),
    "--card": adjustLightness(sorted[0], 0),
    "--card-foreground": adjustLightness(sorted[5], 0),
    "--popover": adjustLightness(sorted[0], 5),
    "--popover-foreground": adjustLightness(sorted[5], -5),
    "--primary": adjustLightness(sorted[4], 0),
    "--primary-foreground": adjustLightness(sorted[5], -10),
    "--secondary": adjustLightness(sorted[3], 0),
    "--secondary-foreground": adjustLightness(sorted[5], -15),
    "--muted": adjustLightness(sorted[1], 5),
    "--muted-foreground": adjustLightness(sorted[4], -5),
    "--accent": adjustLightness(sorted[2], 0),
    "--accent-foreground": adjustLightness(sorted[5], -10),
    "--destructive": "#ff0000",
    "--destructive-foreground": "#ffffff",
    "--border": adjustLightness(sorted[1], -5),
    "--input": adjustLightness(sorted[1], 5),
    "--ring": adjustLightness(sorted[4], 10),
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
  return assignedColors;
}
