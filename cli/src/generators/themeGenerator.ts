import { Color } from "../types";

// Calculate luminance for WCAG contrast calculations
function getLuminance(color: Color): number {
  const r = color.red / 255;
  const g = color.green / 255;
  const b = color.blue / 255;
  
  const R = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
  const G = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
  const B = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);
  
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

// Find a color with good contrast against a base color
function findContrastColor(colors: Color[], baseColor: Color, preferDark = false): Color {
  const baseLuminance = getLuminance(baseColor);
  
  // Sort by contrast ratio
  const sorted = [...colors].sort((a, b) => {
    const aLuminance = getLuminance(a);
    const bLuminance = getLuminance(b);
    
    const aRatio = (Math.max(aLuminance, baseLuminance) + 0.05) / 
                   (Math.min(aLuminance, baseLuminance) + 0.05);
    const bRatio = (Math.max(bLuminance, baseLuminance) + 0.05) / 
                   (Math.min(bLuminance, baseLuminance) + 0.05);
    
    // If we prefer dark colors and both have good contrast, prioritize the darker one
    if (preferDark && aRatio > 4.5 && bRatio > 4.5) {
      return aLuminance - bLuminance;
    }
    
    return bRatio - aRatio;
  });
  
  // Return the color with the best contrast
  return sorted[0];
}

export function generateCSSVariables(colors: Color[]): Record<string, string> {
  if (colors.length === 0) {
    throw new Error("No colors provided to generate theme");
  }

  // Sort colors by different properties
  const byLightness = [...colors].sort((a, b) => b.lightness - a.lightness);
  const bySaturation = [...colors].sort((a, b) => b.saturation - a.saturation);

  // Select colors for different UI elements
  const background = byLightness[0]; // Lightest color for background
  const foreground = findContrastColor(colors, background, true); // Prefer dark
  
  const cardIndex = Math.floor(byLightness.length / 2);
  const card = byLightness[cardIndex]; // Medium lightness for card
  const cardForeground = findContrastColor(colors, card);
  
  const primary = bySaturation[0]; // Most saturated for primary
  const primaryForeground = findContrastColor(colors, primary);
  
  const secondaryIndex = Math.min(Math.floor(bySaturation.length / 2), bySaturation.length - 1);
  const secondary = bySaturation[secondaryIndex]; // Medium saturation for secondary
  const secondaryForeground = findContrastColor(colors, secondary);
  
  const muted = [...colors]
    .sort((a, b) => a.saturation - b.saturation)
    .filter(c => c.lightness > 0.3 && c.lightness < 0.7)[0] || 
    byLightness[Math.floor(byLightness.length / 2)]; // Low saturation for muted
  const mutedForeground = findContrastColor(colors, muted);
  
  const popover = byLightness[Math.min(1, byLightness.length - 1)]; // Second lightest for popover
  const popoverForeground = findContrastColor(colors, popover);

  // Create theme variable mapping
  return {
    "--background": background.hex,
    "--foreground": foreground.hex,
    "--card": card.hex,
    "--card-foreground": cardForeground.hex,
    "--popover": popover.hex,
    "--popover-foreground": popoverForeground.hex,
    "--primary": primary.hex,
    "--primary-foreground": primaryForeground.hex,
    "--secondary": secondary.hex,
    "--secondary-foreground": secondaryForeground.hex,
    "--muted": muted.hex,
    "--muted-foreground": mutedForeground.hex,
    "--accent": secondary.hex, // Reuse secondary for accent
    "--accent-foreground": secondaryForeground.hex,
    "--destructive": "#ff0000", // Standard red for destructive
    "--destructive-foreground": "#ffffff", // White text on destructive
    "--border": muted.hex,
    "--input": muted.hex,
    "--ring": primary.hex,
  };
}
