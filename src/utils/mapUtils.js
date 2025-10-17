export const VARIABLES_CONFIG = {
    temp: { name: "Temperature", colormap: "plasma" },
    salt: { name: "Salinity", colormap: "viridis" },
    u: { name: "U-Velocity", colormap: "seismic" },
    v: { name: "V-Velocity", colormap: "seismic" },
    currents: { name: "Currents", colormap: "coolwarm" },
    zeta: { name: "Sea Surface Height", colormap: "coolwarm" },
};

export const MATPLOTLIB_COLORMAPS = {
    plasma: [
        '#0d0887', '#46039f', '#7201a8', '#9c179e', '#bd3786',
        '#d8576b', '#ed7953', '#fb9f3a', '#fdca26', '#f0f921'
    ],
    viridis: [
        '#440154', '#482878', '#3e4989', '#31688e', '#26828e',
        '#1f9e89', '#35b779', '#6dcd59', '#b4de2c', '#fde725'
    ],
    seismic: [
        '#000033', '#000066', '#000099', '#0000cc', '#0000ff',
        '#3333ff', '#6666ff', '#9999ff', '#ccccff', '#ffffff',
        '#ffcccc', '#ff9999', '#ff6666', '#ff3333', '#ff0000',
        '#cc0000', '#990000', '#660000', '#330000'
    ],
    coolwarm: [
        '#3b4cc0', '#5868c7', '#7385cf', '#8ea1d6', '#a8bddd',
        '#c1d9e4', '#dae2e8', '#f2f2f2', '#f4dcdb', '#f5c5c5',
        '#f7afaf', '#f89898', '#f98282', '#ba2f38', '#b40426'
    ],
};

export function generateContours(vmin, vmax, colors) {
    if (typeof vmin !== 'number' || typeof vmax !== 'number' || !Array.isArray(colors)) {
        return [];
    }

    const thresholds = [];
    const numSegments = colors.length;
    const step = (vmax - vmin) / numSegments;
    const BIG_NUMBER = 100;

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
    if (!hex || hex.length < 7) return [255, 255, 255];
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return [r, g, b];
}

export function getColorFromColormap(value, vmin, vmax, colors) {
    if (!colors || colors.length === 0) {
        return [255, 255, 255, 128];
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