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
  if (colors.length !== 6) throw new Error("Exactly six colors required");

  // Function to calculate relative luminance for contrast checking
  function luminance(color: Color) {
    const rgb = [color.red, color.green, color.blue].map((c) => c / 255);
    return rgb.reduce(
      (lum, c) =>
        lum + (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4),
      0
    );
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
