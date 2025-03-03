import { Color } from "../types";

/**
 * WCAG Accessibility Guidelines
 * These constants are based on Web Content Accessibility Guidelines (WCAG)
 * They help ensure text remains readable against different background colors
 */
const WCAG = {
  // Minimum contrast ratio for normal text (WCAG AA)
  MINIMUM_CONTRAST_RATIO: 4.5,
  // Luminance coefficients based on human perception of color
  LUMINANCE: {
    RED: 0.2126,
    GREEN: 0.7152,
    BLUE: 0.0722,
  },
};

/**
 * Calculates the relative luminance of a color according to WCAG standards
 * This is used to determine contrast between colors for accessibility
 *
 * @param color - The color object containing RGB values
 * @returns The luminance value between 0 (black) and 1 (white)
 */
function calculateLuminance(color: Color): number {
  // Step 1: Normalize RGB values to 0-1 range
  const r = color.red / 255;
  const g = color.green / 255;
  const b = color.blue / 255;

  // Step 2: Apply gamma correction (sRGB color space)
  // This accounts for how human vision perceives brightness
  const R = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
  const G = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
  const B = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);

  // Step 3: Calculate luminance using WCAG coefficients
  // These coefficients represent how humans perceive the brightness of each color
  return (
    WCAG.LUMINANCE.RED * R + WCAG.LUMINANCE.GREEN * G + WCAG.LUMINANCE.BLUE * B
  );
}

/**
 * Calculates the contrast ratio between two colors
 *
 * @param color1Luminance - Luminance of first color
 * @param color2Luminance - Luminance of second color
 * @returns Contrast ratio between 1:1 (no contrast) and 21:1 (max contrast)
 */
function calculateContrastRatio(
  color1Luminance: number,
  color2Luminance: number
): number {
  const lighter = Math.max(color1Luminance, color2Luminance);
  const darker = Math.min(color1Luminance, color2Luminance);

  // Formula from WCAG 2.0 guidelines
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Assigns 6 colors to specific theme roles based on luminance
 *
 * @param colors - Array of colors to assign (must contain exactly 6 colors)
 * @returns Object with assigned colors for each theme role
 * @throws Error if not exactly 6 colors are provided
 */
function assignColors(colors: Color[]) {
  if (colors.length !== 6) throw new Error("Exactly six colors required");

  // Sort colors by luminance (darkest to lightest)
  const sorted = [...colors].sort(
    (a, b) => calculateLuminance(a) - calculateLuminance(b)
  );

  return {
    background: sorted[0], // Darkest color for background
    foreground: sorted[5], // Lightest color for foreground (text)
    primary: sorted[4], // High contrast with background
    secondary: sorted[3], // Supporting contrast color
    accent: sorted[2], // A pop of color
    muted: sorted[1], // Softest color for subtle elements
  };
}

/**
 * Generates CSS variables for a theme based on extracted colors
 *
 * @param colors - Array of colors extracted from an image
 * @returns Object mapping CSS variable names to color values
 * @throws Error if no colors are provided
 */
export function generateCSSVariables(colors: Color[]): Record<string, string> {
  // Validate input
  if (colors.length === 0) {
    throw new Error("No colors provided to generate theme");
  }

  // Step 1: Select the 6 most representative colors
  // If we have more than 6 colors, select them based on area and saturation
  let selectedColors: Color[] = [];

  if (colors.length <= 6) {
    // If we have 6 or fewer colors, use all of them
    selectedColors = [...colors];
  } else {
    // Sort by area (most dominant colors in the image)
    const byArea = [...colors].sort((a, b) => b.area - a.area);

    // Take the 3 most dominant colors
    selectedColors = byArea.slice(0, 3);

    // Add 3 more colors prioritizing saturation variety
    const remainingColors = byArea.slice(3);
    const bySaturation = remainingColors.sort(
      (a, b) => b.saturation - a.saturation
    );

    // Add the most saturated color
    selectedColors.push(bySaturation[0]);

    // Add a medium saturated color
    const midIndex = Math.floor(bySaturation.length / 2);
    if (midIndex < bySaturation.length) {
      selectedColors.push(bySaturation[midIndex]);
    }

    // Add the least saturated color
    const lowSatIndex = bySaturation.length - 1;
    if (lowSatIndex > midIndex && lowSatIndex < bySaturation.length) {
      selectedColors.push(bySaturation[lowSatIndex]);
    }
  }

  // Ensure we have exactly 6 colors
  while (selectedColors.length < 6) {
    // If we don't have enough colors, duplicate the last one with slight variations
    const lastColor = { ...selectedColors[selectedColors.length - 1] };

    // Slightly modify the color to create variation
    lastColor.red = Math.max(
      0,
      Math.min(255, lastColor.red + Math.floor(Math.random() * 40) - 20)
    );
    lastColor.green = Math.max(
      0,
      Math.min(255, lastColor.green + Math.floor(Math.random() * 40) - 20)
    );
    lastColor.blue = Math.max(
      0,
      Math.min(255, lastColor.blue + Math.floor(Math.random() * 40) - 20)
    );

    // Update hex value to match the new RGB values
    lastColor.hex = `#${lastColor.red
      .toString(16)
      .padStart(2, "0")}${lastColor.green
      .toString(16)
      .padStart(2, "0")}${lastColor.blue.toString(16).padStart(2, "0")}`;

    // Add the new color
    selectedColors.push(lastColor);
  }

  // If we have more than 6 colors, trim to exactly 6
  if (selectedColors.length > 6) {
    selectedColors = selectedColors.slice(0, 6);
  }

  // Step 2: Assign colors to theme roles
  const assignedColors = assignColors(selectedColors);

  // Step 3: Create and return the theme variable mapping
  return {
    // Base colors
    "--background": assignedColors.background.hex,
    "--foreground": assignedColors.foreground.hex,

    // Card component colors
    "--card": assignedColors.background.hex,
    "--card-foreground": assignedColors.foreground.hex,

    // Popover/dropdown colors
    "--popover": assignedColors.background.hex,
    "--popover-foreground": assignedColors.foreground.hex,

    // Primary action colors (buttons, links, etc.)
    "--primary": assignedColors.primary.hex,
    "--primary-foreground": assignedColors.foreground.hex,

    // Secondary action colors
    "--secondary": assignedColors.secondary.hex,
    "--secondary-foreground": assignedColors.foreground.hex,

    // Muted/subtle UI elements
    "--muted": assignedColors.muted.hex,
    "--muted-foreground": assignedColors.primary.hex,

    // Accent colors
    "--accent": assignedColors.accent.hex,
    "--accent-foreground": assignedColors.foreground.hex,

    // Destructive action colors (delete, warning, etc.)
    "--destructive": "#ff0000", // Standard red for destructive actions
    "--destructive-foreground": "#ffffff", // White text for readability

    // UI element colors
    "--border": assignedColors.muted.hex,
    "--input": assignedColors.muted.hex,
    "--ring": assignedColors.primary.hex,
  };
}
