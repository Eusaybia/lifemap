export interface AuraSpec {
  color: string;
  luminance: number;
  size: number;
}

export const AURA_LUMINANCE_MIN = 1;
export const AURA_LUMINANCE_MAX = 1000;
export const AURA_SIZE_MIN = 1;
export const AURA_SIZE_MAX = 100;

export const CURRENT_FOCUS_TIMEPOINT_ID = "timepoint:current-focus";

// Baseline aura for the Current Focus tag.
export const CURRENT_FOCUS_AURA: AuraSpec = {
  color: "#fff3c4",
  luminance: 860,
  size: 92,
};

const HEX_COLOR_PATTERN = /^#?([0-9a-fA-F]{6})$/;

const clamp = (value: number, min: number, max: number): number => {
  if (Number.isNaN(value)) return min;
  if (value < min) return min;
  if (value > max) return max;
  return value;
};

const toNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
};

export const normalizeHexColor = (value: unknown, fallback = "#ffffff"): string => {
  const raw = String(value ?? "").trim();
  const match = raw.match(HEX_COLOR_PATTERN);
  if (!match) return fallback.toLowerCase();
  return `#${match[1].toLowerCase()}`;
};

export const sanitizeAura = (value: unknown): AuraSpec | null => {
  if (!value || typeof value !== "object") return null;

  const source = value as Partial<Record<keyof AuraSpec, unknown>>;
  const luminance = toNumber(source.luminance);
  const size = toNumber(source.size);

  if (luminance === null || size === null) return null;

  return {
    color: normalizeHexColor(source.color),
    luminance: Math.round(clamp(luminance, AURA_LUMINANCE_MIN, AURA_LUMINANCE_MAX)),
    size: Math.round(clamp(size, AURA_SIZE_MIN, AURA_SIZE_MAX)),
  };
};

export const readAuraFromDataAttributes = (attrs: Record<string, unknown>): AuraSpec | null => {
  const colorRaw = attrs["data-aura-color"];
  const luminanceRaw = attrs["data-aura-luminance"];
  const sizeRaw = attrs["data-aura-size"];

  if (colorRaw == null && luminanceRaw == null && sizeRaw == null) {
    return null;
  }

  const luminance = toNumber(luminanceRaw) ?? 500;
  const size = toNumber(sizeRaw) ?? 50;

  return {
    color: normalizeHexColor(colorRaw),
    luminance: Math.round(clamp(luminance, AURA_LUMINANCE_MIN, AURA_LUMINANCE_MAX)),
    size: Math.round(clamp(size, AURA_SIZE_MIN, AURA_SIZE_MAX)),
  };
};

export const readAuraFromAttrs = (attrs: Record<string, unknown>): AuraSpec | null => {
  const fromObject = sanitizeAura(attrs.aura);
  if (fromObject) return fromObject;

  const fromDataAttributes = readAuraFromDataAttributes(attrs);
  if (fromDataAttributes) return fromDataAttributes;

  return null;
};

export const getDefaultAuraForTimepointId = (id: unknown): AuraSpec | null => {
  if (id === CURRENT_FOCUS_TIMEPOINT_ID) {
    return { ...CURRENT_FOCUS_AURA };
  }
  return null;
};

export const readTimepointAuraFromAttrs = (attrs: Record<string, unknown>): AuraSpec | null => {
  const explicitAura = readAuraFromAttrs(attrs);
  if (explicitAura) {
    return explicitAura;
  }

  return getDefaultAuraForTimepointId(attrs.id);
};

export const toAuraDataAttributes = (aura: AuraSpec): Record<string, string> => {
  const sanitized = sanitizeAura(aura);
  if (!sanitized) return {};

  return {
    "data-aura-color": sanitized.color,
    "data-aura-luminance": String(sanitized.luminance),
    "data-aura-size": String(sanitized.size),
  };
};

const hexToRgb = (hexColor: string): { r: number; g: number; b: number } => {
  const normalized = normalizeHexColor(hexColor);
  return {
    r: parseInt(normalized.slice(1, 3), 16),
    g: parseInt(normalized.slice(3, 5), 16),
    b: parseInt(normalized.slice(5, 7), 16),
  };
};

const rgbToHex = ({ r, g, b }: { r: number; g: number; b: number }): string => {
  const componentToHex = (component: number) =>
    clamp(Math.round(component), 0, 255)
      .toString(16)
      .padStart(2, "0");

  return `#${componentToHex(r)}${componentToHex(g)}${componentToHex(b)}`;
};

export interface WeightedAuraSource {
  aura: AuraSpec;
  weight: number;
}

export const blendWeightedAuras = (sources: WeightedAuraSource[]): AuraSpec | null => {
  const normalizedSources = sources
    .map((source) => ({
      aura: sanitizeAura(source.aura),
      weight: Number.isFinite(source.weight) ? source.weight : 0,
    }))
    .filter(
      (source): source is { aura: AuraSpec; weight: number } =>
        Boolean(source.aura) && source.weight > 0
    );

  if (normalizedSources.length === 0) {
    return null;
  }

  const totalWeight = normalizedSources.reduce((sum, source) => sum + source.weight, 0);
  if (totalWeight <= 0) {
    return null;
  }

  let weightedR = 0;
  let weightedG = 0;
  let weightedB = 0;
  let weightedLuminance = 0;
  let weightedSize = 0;

  normalizedSources.forEach(({ aura, weight }) => {
    const rgb = hexToRgb(aura.color);
    weightedR += rgb.r * weight;
    weightedG += rgb.g * weight;
    weightedB += rgb.b * weight;
    weightedLuminance += aura.luminance * weight;
    weightedSize += aura.size * weight;
  });

  return {
    color: rgbToHex({
      r: weightedR / totalWeight,
      g: weightedG / totalWeight,
      b: weightedB / totalWeight,
    }),
    luminance: Math.round(
      clamp(weightedLuminance / totalWeight, AURA_LUMINANCE_MIN, AURA_LUMINANCE_MAX)
    ),
    size: Math.round(clamp(weightedSize / totalWeight, AURA_SIZE_MIN, AURA_SIZE_MAX)),
  };
};

export const areAurasEqual = (left: AuraSpec | null | undefined, right: AuraSpec | null | undefined): boolean => {
  const leftSanitized = left ? sanitizeAura(left) : null;
  const rightSanitized = right ? sanitizeAura(right) : null;

  if (!leftSanitized && !rightSanitized) return true;
  if (!leftSanitized || !rightSanitized) return false;

  return (
    leftSanitized.color === rightSanitized.color &&
    leftSanitized.luminance === rightSanitized.luminance &&
    leftSanitized.size === rightSanitized.size
  );
};
