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
 */
function getContrastRatio(color1: Color, color2: Color): number {
  const l1 =
    (0.2126 * color1.red) / 255 +
    (0.7152 * color1.green) / 255 +
    (0.0722 * color1.blue) / 255;
  const l2 =
    (0.2126 * color2.red) / 255 +
    (0.7152 * color2.green) / 255 +
    (0.0722 * color2.blue) / 255;
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
  const maxAttempts = 10;

  while (contrast < minContrast && attempts < maxAttempts) {
    // Adjust lightness based on whether we need more or less contrast
    const lightnessAdjustment = background.lightness > 0.5 ? -5 : 5;
    adjustedColor = {
      ...adjustedColor,
      lightness: Math.max(
        0,
        Math.min(1, adjustedColor.lightness + lightnessAdjustment / 100)
      ),
    };
    contrast = getContrastRatio(adjustedColor, background);
    attempts++;
  }

  return adjustHSL(adjustedColor, {});
}

export function generateTheme(colors: Color[]): Record<string, string> {
  if (colors.length === 0) {
    throw new Error("No colors provided to generate theme");
  }

  // Sort colors by prominence and intensity
  const sortedColors = [...colors]
    .sort((a, b) => b.area - a.area) // Sort by prominence first
    .slice(0, Math.min(5, colors.length)); // Take top 5 most prominent colors

  // Get the three most prominent colors sorted by intensity
  const [baseColor, secondaryColor, accentColor] = sortedColors
    .sort((a, b) => calculateIntensity(a) - calculateIntensity(b))
    .slice(0, 3);

  // Generate color scheme based on color theory
  const complementary = generateHueVariant(baseColor, 0.5); // Opposite on color wheel
  const analogous1 = generateHueVariant(baseColor, 0.083); // 30 degrees
  const analogous2 = generateHueVariant(baseColor, -0.083); // -30 degrees

  // Create dark and light variants for backgrounds
  const darkBg = adjustHSL(baseColor, { saturation: -20, lightness: -45 });
  const lightBg = adjustHSL(baseColor, { saturation: -20, lightness: 45 });

  // Use the base color's lightness to determine if we're in dark or light mode
  const isDarkMode = baseColor.lightness < 0.5;

  // Set up our background and foreground
  const background = isDarkMode ? darkBg : lightBg;
  const foreground = isDarkMode
    ? adjustHSL(baseColor, { saturation: -30, lightness: 80 })
    : adjustHSL(baseColor, { saturation: -30, lightness: -80 });

  return {
    "--background": background,
    "--foreground": foreground,

    // Card and popover - slight variation of background
    "--card": adjustHSL(baseColor, {
      saturation: -15,
      lightness: isDarkMode ? -40 : 40,
    }),
    "--card-foreground": foreground,
    "--popover": adjustHSL(baseColor, {
      saturation: -15,
      lightness: isDarkMode ? -35 : 35,
    }),
    "--popover-foreground": foreground,

    // Primary - use the base color
    "--primary": adjustHSL(baseColor, {}),
    "--primary-foreground": ensureContrast(
      baseColor,
      { ...baseColor, hex: background } as Color,
      4.5
    ),

    // Secondary - use second most salient color
    "--secondary": adjustHSL(secondaryColor, {}),
    "--secondary-foreground": ensureContrast(
      secondaryColor,
      { ...baseColor, hex: background } as Color,
      4.5
    ),

    // Accent - use third most salient color
    "--accent": adjustHSL(accentColor, {}),
    "--accent-foreground": ensureContrast(
      accentColor,
      { ...baseColor, hex: background } as Color,
      4.5
    ),

    // Muted - desaturated version of base color
    "--muted": adjustHSL(baseColor, {
      saturation: -40,
      lightness: isDarkMode ? -20 : 20,
    }),
    "--muted-foreground": ensureContrast(
      { ...baseColor, hex: analogous1 } as Color,
      { ...baseColor, hex: background } as Color,
      3.5 // Slightly lower contrast for muted
    ),

    // Destructive - warm red with guaranteed contrast
    "--destructive": "#ff4444",
    "--destructive-foreground": "#ffffff",

    // Border and input - subtle variations
    "--border": adjustHSL(baseColor, {
      saturation: -30,
      lightness: isDarkMode ? -25 : 25,
    }),
    "--input": adjustHSL(baseColor, {
      saturation: -30,
      lightness: isDarkMode ? -20 : 20,
    }),

    // Ring - saturated version of base color
    "--ring": adjustHSL(baseColor, {
      saturation: 10,
      lightness: isDarkMode ? 20 : -20,
    }),
  };
}
