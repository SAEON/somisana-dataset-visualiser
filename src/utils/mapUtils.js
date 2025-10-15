// ADD THIS NEW CONFIGURATION OBJECT AT THE TOP
export const VARIABLES_CONFIG = {
    temp: { name: "Temperature", colormap: "plasma" },
    salt: { name: "Salinity", colormap: "viridis" },
    u: { name: "U-Velocity", colormap: "seismic" },
    v: { name: "V-Velocity", colormap: "seismic" },
    currents: { name: "Currents", colormap: "coolwarm" },
    zeta: { name: "Sea Surface Height", colormap: "coolwarm" },
};

// ... keep the rest of the file exactly as it was
export const MATPLOTLIB_COLORMAPS = {
    plasma: ['#0d0887', '#6a00a8', '#b12a90', '#e16462', '#fca636', '#f0f921'],
    viridis: ['#440154', '#414487', '#2a788e', '#22a884', '#7ad151', '#fde725'],
    seismic: ['#000080', '#0000ff', '#6699ff', '#ff0000', '#800000'],
    coolwarm: ['#3b4cc0', '#6699ff', '#ec8faeff', '#f38383ff', '#b40426'],
};

// Shared function to generate contour data for Deck.gl
export function generateContours(vmin, vmax, colors) {
    // ... (no changes here)
    if (typeof vmin !== 'number' || typeof vmax !== 'number' || !Array.isArray(colors)) {
        return [];
    }

    const thresholds = [];
    const numSegments = colors.length;
    const step = (vmax - vmin) / numSegments;
    const BIG_NUMBER = 100; // Represents open-ended thresholds at the extremes

    for (let i = 0; i < numSegments; i++) {
        const lowerBound = i === 0 ? -BIG_NUMBER : vmin + i * step;
        const upperBound = i === numSegments - 1 ? BIG_NUMBER : vmin + (i + 1) * step;
        const hex = colors[i];
        if (!hex) continue;
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        thresholds.push({ threshold: [lowerBound, upperBound], color: [r, g, b], zIndex: i });
    }
    return thresholds;
}

function hexToRgb(hex) {
    // ... (no changes here)
    if (!hex || hex.length < 7) return [255, 255, 255];
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return [r, g, b];
}

// Linearly interpolates a color from a colormap array based on a value
export function getColorFromColormap(value, vmin, vmax, colors) {
    // ... (no changes here)
    if (!colors || colors.length === 0) {
        return [255, 255, 255, 128]; // Default color if colormap is missing
    }

    const normalized = (value - vmin) / (vmax - vmin);
    const clamped = Math.max(0, Math.min(1, normalized));

    const index = clamped * (colors.length - 1);
    const lowerIndex = Math.floor(index);
    const upperIndex = Math.ceil(index);
    const fraction = index - lowerIndex;

    if (upperIndex >= colors.length) return hexToRgb(colors[colors.length - 1]);
    if (lowerIndex < 0) return hexToRgb(colors[0]);

    const lowerColor = hexToRgb(colors[lowerIndex]);
    const upperColor = hexToRgb(colors[upperIndex]);

    const r = lowerColor[0] * (1 - fraction) + upperColor[0] * fraction;
    const g = lowerColor[1] * (1 - fraction) + upperColor[1] * fraction;
    const b = lowerColor[2] * (1 - fraction) + upperColor[2] * fraction;

    return [r, g, b];
}