'use client';

import React from 'react';
import { Paper, Box, Typography } from '@mui/material';
import { MATPLOTLIB_COLORMAPS } from '../utils/mapUtils';

export default function ColourLegend({ variableConfig, selectedVariable }) {
    if (!variableConfig || typeof variableConfig.vmax === 'undefined' || typeof variableConfig.vmin === 'undefined') {
        return null;
    }
    
    let displayConfig = { ...variableConfig };

    if (selectedVariable === 'currents') {
      displayConfig.vmin = 0;
    }
    
    const colors = MATPLOTLIB_COLORMAPS[displayConfig.colormap] || [];
    const gradient = `linear-gradient(to top, ${colors.join(', ')})`;

    return (
        <Paper elevation={4} sx={{ position: 'absolute', bottom: 40, left: 16, p: 1.5, display: 'flex', alignItems: 'center', gap: 1, backgroundColor: 'rgba(30, 41, 59, 0.9)' }}>
            <Box sx={{ background: gradient, width: '20px', height: '40vh', borderRadius: '4px' }}></Box>
            <Box sx={{ textAlign: 'left', color: 'white', fontSize: '0.875rem', display: 'flex', flexDirection: 'column', height: '40vh' }}>
                {/* Use the modified displayConfig for rendering */}
                <Typography variant="body2">{displayConfig.vmax.toFixed(1)}</Typography>
                <Box sx={{ flexGrow: 1 }} />
                <Typography variant="body2">{displayConfig.vmin.toFixed(1)}</Typography>
            </Box>
        </Paper>
    );
}