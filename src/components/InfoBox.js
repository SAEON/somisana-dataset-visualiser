'use client';

import React from 'react';
import { Paper, Box, Typography, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

export default function InfoBox({ clickInfo, onClose, variables }) {
    if (!clickInfo || !clickInfo.object) {
        return null;
    }
    
    const { object, x, y } = clickInfo;
    const { properties } = object;

    return (
        <Paper elevation={6} sx={{ position: 'absolute', top: y, left: x, p: 2, maxWidth: 300, zIndex: 10, pointerEvents: 'auto' }}>
            <IconButton onClick={onClose} size="small" sx={{ position: 'absolute', top: 4, right: 4 }}>
                <CloseIcon fontSize="inherit" />
            </IconButton>
            <Typography variant="subtitle2" gutterBottom>Point Data</Typography>
            {Object.keys(variables).map((key) => (
                <Typography key={key} variant="body2" component="div" sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                    <Box component="span" sx={{ fontWeight: 'bold', textTransform: 'capitalize' }}>{variables[key].name}:</Box>
                    <Box component="span">{properties[key] !== null ? properties[key].toFixed(3) : 'N/A'}</Box>
                </Typography>
            ))}
        </Paper>
    );
}