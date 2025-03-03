import { Color } from "../types";

/**
 * Calculate color intensity (how harsh/soft it is)
 * Lower values indicate softer colors
 */
function calculateIntensity(color: Color): number {
  const saturationWeight = 0.6;
  const lightnessWeight = 0.4;

  // Penalize very high/low lightness and very high saturation
  const lightnessBalance = 1 - Math.abs(0.5 - color.lightness);
  const saturationPenalty = Math.max(0, color.saturation - 0.8);

  return (
    color.saturation * saturationWeight +
    lightnessBalance * lightnessWeight -
    saturationPenalty * 0.5
  );
}

/**
 * Generate a color at a specific hue angle from the base color
 */
function generateHueVariant(baseColor: Color, hueOffset: number): string {
  const newHue = (baseColor.hue + hueOffset) % 1;
  return `hsl(${newHue * 360}, ${baseColor.saturation * 100}%, ${
    baseColor.lightness * 100
  }%)`;
}

/**
 * Adjust HSL values of a color
 */
function adjustHSL(
  color: Color,
  adjustments: {
    hue?: number;
    saturation?: number;
    lightness?: number;
  }
): string {
  const h = ((color.hue + (adjustments.hue || 0)) % 1) * 360;
  const s = Math.max(
    0,
    Math.min(100, color.saturation * 100 + (adjustments.saturation || 0))
  );
  const l = Math.max(
    0,
    Math.min(100, color.lightness * 100 + (adjustments.lightness || 0))
  );
  return `hsl(${h}, ${s}%, ${l}%)`;
}

/**
 * Calculate contrast ratio between two colors
 * Returns a value between 1 (no contrast) and 21 (max contrast)
 */
function getContrastRatio(color1: Color, color2: Color): number {
  // Calculate relative luminance for both colors
  const getLuminance = (color: Color) => {
    // Convert RGB to linear values
    const rgb = [color.red, color.green, color.blue].map((c) => {
      const sRGB = c / 255;
      return sRGB <= 0.03928 ? sRGB / 12.92 : ((sRGB + 0.055) / 1.055) ** 2.4;
    });

    // Calculate luminance using the formula for relative luminance
    return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
  };

  const l1 = getLuminance(color1);
  const l2 = getLuminance(color2);

  // Calculate contrast ratio
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Ensure a color meets minimum contrast with a background
 */
function ensureContrast(
  color: Color,
  background: Color,
  minContrast: number
): string {
  let adjustedColor = { ...color };
  let contrast = getContrastRatio(adjustedColor, background);
  let attempts = 0;
  const maxAttempts = 20;

  while (contrast < minContrast && attempts < maxAttempts) {
    // Adjust lightness based on whether background is light or dark
    const lightnessAdjustment = background.lightness > 0.5 ? -5 : 5;
    adjustedColor = {
      ...adjustedColor,
      lightness: Math.max(
        0.05,
        Math.min(0.95, adjustedColor.lightness + lightnessAdjustment / 100)
      ),
    };
    contrast = getContrastRatio(adjustedColor, background);
    attempts++;
  }

  return adjustHSL(adjustedColor, {});
}

/**
 * Convert a color to a readable text color (black or white)
 * Based on the color's luminance
 */
function getReadableTextColor(bgColor: Color): string {
  // Calculate relative luminance
  const rgb = [bgColor.red, bgColor.green, bgColor.blue].map((c) => c / 255);
  const luminance = 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];

  // Use white text on dark backgrounds, black text on light backgrounds
  return luminance > 0.5 ? "hsl(0, 0%, 0%)" : "hsl(0, 0%, 100%)";
}

// Create a fallback color to use when colors are missing or undefined
const createFallbackColor = (): Color => ({
  hex: "#6366f1",
  red: 99,
  green: 102,
  blue: 241,
  hue: 0.6666,
  intensity: 0.5,
  lightness: 0.6,
  saturation: 0.8,
  area: 1,
});

export function generateTheme(colors: Color[]): Record<string, string> {
  if (!colors || colors.length === 0) {
    // If no colors are provided, create a default theme
    const fallbackColor = createFallbackColor();
    return generateThemeFromSingleColor(fallbackColor);
  }

  // Filter out any invalid colors
  const validColors = colors.filter(
    (color) =>
      color &&
      typeof color.hue === "number" &&
      typeof color.saturation === "number" &&
      typeof color.lightness === "number"
  );

  if (validColors.length === 0) {
    // If no valid colors remain, use fallback
    const fallbackColor = createFallbackColor();
    return generateThemeFromSingleColor(fallbackColor);
  }

  // Sort colors by prominence and intensity
  const sortedColors = [...validColors]
    .sort((a, b) => b.area - a.area) // Sort by prominence first
    .slice(0, Math.min(6, validColors.length)); // Take top 6 most prominent colors

  // Ensure we have at least 6 colors to work with
  while (sortedColors.length < 6) {
    // Create variations of the first color if we don't have enough
    const baseColor = sortedColors[0];
    // Create variations with different hue and lightness
    const variation = {
      ...baseColor,
      hue: (baseColor.hue + sortedColors.length * 0.1) % 1,
      lightness: 0.3 + ((sortedColors.length * 0.1) % 0.7),
    };
    sortedColors.push(variation);
  }

  // Sort colors by luminance (from darkest to lightest)
  const colorsByLuminance = [...sortedColors].sort((a, b) => {
    const lumA =
      0.2126 * (a.red / 255) +
      0.7152 * (a.green / 255) +
      0.0722 * (a.blue / 255);
    const lumB =
      0.2126 * (b.red / 255) +
      0.7152 * (b.green / 255) +
      0.0722 * (b.blue / 255);
    return lumA - lumB;
  });

  // Sort colors by saturation (from most saturated to least)
  const colorsBySaturation = [...sortedColors].sort(
    (a, b) => b.saturation - a.saturation
  );

  // Determine if we should use a light or dark theme based on the most prominent color
  const mostProminentColor = sortedColors[0];
  const isDarkTheme = mostProminentColor.lightness < 0.5;

  // 1. Set up background and foreground with high contrast
  const bgColor = isDarkTheme
    ? {
        ...colorsByLuminance[0],
        lightness: Math.max(0.05, colorsByLuminance[0].lightness - 0.1),
      }
    : {
        ...colorsByLuminance[5],
        lightness: Math.min(0.95, colorsByLuminance[5].lightness + 0.1),
      };

  const fgColor = isDarkTheme
    ? {
        ...colorsByLuminance[5],
        lightness: Math.min(0.95, colorsByLuminance[5].lightness + 0.1),
      }
    : {
        ...colorsByLuminance[0],
        lightness: Math.max(0.05, colorsByLuminance[0].lightness - 0.1),
      };

  // 2. Primary color - use the most saturated color with good contrast
  const primaryColor = colorsBySaturation[0];

  // 3. Secondary color - less saturated than primary, good for secondary elements
  const secondaryColor = isDarkTheme
    ? {
        ...colorsBySaturation[2],
        lightness: Math.min(0.8, colorsBySaturation[2].lightness + 0.1),
      }
    : {
        ...colorsBySaturation[2],
        lightness: Math.max(0.2, colorsBySaturation[2].lightness - 0.1),
      };

  // 4. Accent color - complementary or triadic to primary
  const accentColor = {
    ...primaryColor,
    hue: (primaryColor.hue + 0.33) % 1, // Triadic color relationship
    saturation: Math.min(1, primaryColor.saturation * 1.1),
  };

  // 5. Muted color - low saturation, medium contrast
  const mutedColor = {
    ...colorsByLuminance[isDarkTheme ? 1 : 4],
    saturation: Math.min(
      0.3,
      colorsByLuminance[isDarkTheme ? 1 : 4].saturation
    ),
  };

  // 6. Border/Input color - subtle, low contrast with background
  const borderColor = {
    ...bgColor,
    lightness: isDarkTheme
      ? Math.min(0.5, bgColor.lightness + 0.15)
      : Math.max(0.5, bgColor.lightness - 0.15),
  };

  // Build the theme object
  return {
    // Background colors
    "--background": adjustHSL(bgColor, {}),
    "--foreground": adjustHSL(fgColor, {}),

    // Card colors - slightly different from background for depth
    "--card": adjustHSL(bgColor, {
      lightness: isDarkTheme ? 5 : -5,
    }),
    "--card-foreground": adjustHSL(fgColor, {}),

    // Popover colors - slightly elevated from background
    "--popover": adjustHSL(bgColor, {
      lightness: isDarkTheme ? 8 : -8,
    }),
    "--popover-foreground": adjustHSL(fgColor, {}),

    // Primary colors - main brand color with guaranteed contrast
    "--primary": adjustHSL(primaryColor, {}),
    "--primary-foreground": getReadableTextColor(primaryColor),

    // Secondary colors - less prominent than primary
    "--secondary": adjustHSL(secondaryColor, {}),
    "--secondary-foreground": getReadableTextColor(secondaryColor),

    // Accent colors - for highlights and accents
    "--accent": adjustHSL(accentColor, {}),
    "--accent-foreground": getReadableTextColor(accentColor),

    // Muted colors - for subtle UI elements
    "--muted": adjustHSL(mutedColor, {}),
    "--muted-foreground": adjustHSL(fgColor, {
      lightness: isDarkTheme ? -15 : 15, // Less contrasting version of foreground
    }),

    // Destructive colors - keep as specified
    "--destructive": "#ff4444",
    "--destructive-foreground": "#ffffff",

    // Border and input colors - subtle
    "--border": adjustHSL(borderColor, {}),
    "--input": adjustHSL(borderColor, {
      lightness: isDarkTheme ? 5 : -5,
    }),

    // Ring color - based on primary but more saturated
    "--ring": adjustHSL(primaryColor, {
      saturation: 10,
      lightness: isDarkTheme ? 10 : -10,
    }),

    // Border radius - random values
    "--radius": `${(Math.random() * 0.5 + 0.3).toFixed(3)}rem`,
  };
}

// Function to generate a theme from a single color
function generateThemeFromSingleColor(color: Color): Record<string, string> {
  const isDarkTheme = color.lightness < 0.5;

  // Create base colors
  const bgColor = isDarkTheme
    ? { ...color, lightness: 0.1, saturation: 0.1 }
    : { ...color, lightness: 0.98, saturation: 0.05 };

  const fgColor = isDarkTheme
    ? { ...color, lightness: 0.9, saturation: 0.1 }
    : { ...color, lightness: 0.1, saturation: 0.1 };

  // Create primary color (the main brand color)
  const primaryColor = {
    ...color,
    saturation: Math.min(1, color.saturation * 1.2),
  };

  // Create secondary color (less prominent)
  const secondaryColor = {
    ...color,
    hue: (color.hue + 0.1) % 1,
    saturation: Math.max(0.2, color.saturation * 0.7),
  };

  // Create accent color (complementary or triadic)
  const accentColor = {
    ...color,
    hue: (color.hue + 0.33) % 1,
    saturation: Math.min(1, color.saturation * 1.1),
  };

  // Create muted color (low saturation)
  const mutedColor = {
    ...color,
    saturation: Math.min(0.3, color.saturation * 0.5),
    lightness: isDarkTheme ? 0.2 : 0.8,
  };

  // Create border color (subtle)
  const borderColor = {
    ...bgColor,
    lightness: isDarkTheme ? 0.25 : 0.75,
  };

  return {
    // Background colors
    "--background": adjustHSL(bgColor, {}),
    "--foreground": adjustHSL(fgColor, {}),

    // Card colors
    "--card": adjustHSL(bgColor, {
      lightness: isDarkTheme ? 5 : -5,
    }),
    "--card-foreground": adjustHSL(fgColor, {}),

    // Popover colors
    "--popover": adjustHSL(bgColor, {
      lightness: isDarkTheme ? 8 : -8,
    }),
    "--popover-foreground": adjustHSL(fgColor, {}),

    // Primary colors
    "--primary": adjustHSL(primaryColor, {}),
    "--primary-foreground": isDarkTheme ? "#ffffff" : "#000000",

    // Secondary colors
    "--secondary": adjustHSL(secondaryColor, {}),
    "--secondary-foreground": isDarkTheme ? "#ffffff" : "#000000",

    // Accent colors
    "--accent": adjustHSL(accentColor, {}),
    "--accent-foreground": isDarkTheme ? "#ffffff" : "#000000",

    // Muted colors
    "--muted": adjustHSL(mutedColor, {}),
    "--muted-foreground": isDarkTheme ? "#a1a1aa" : "#71717a",

    // Destructive colors
    "--destructive": "#ff4444",
    "--destructive-foreground": "#ffffff",

    // Border and input colors
    "--border": adjustHSL(borderColor, {}),
    "--input": adjustHSL(borderColor, {
      lightness: isDarkTheme ? 5 : -5,
    }),

    // Ring color
    "--ring": adjustHSL(primaryColor, {
      saturation: 10,
      lightness: isDarkTheme ? 10 : -10,
    }),

    // Border radius - random values
    "--radius": `${(Math.random() * 0.5 + 0.3).toFixed(3)}rem`,
  };
}
