'use client';

import React, { useMemo } from 'react';
import { Paper, Box, Typography, IconButton, Divider } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { calculateDateByIndex } from '../utils/mapUtils';

export default function InfoBox({ clickInfo, onClose, variables, getTimeSeries, selectedVariable, timeIndex, metadata }) {
    if (!clickInfo || !clickInfo.object) {
        return null;
    }

    const { object, x, y } = clickInfo;
    const { properties, index: pointIndex } = object;

    const timeSeries = useMemo(() => {
        return getTimeSeries(pointIndex);
    }, [getTimeSeries, pointIndex]);

    const activeVarData = useMemo(() => {
        if (!timeSeries.length) return [];
        return timeSeries.map(d => ({
            value: d[selectedVariable],
            timeIndex: d.timeIndex,
            date: d.date
        }));
    }, [timeSeries, selectedVariable]);

    const currentDate = useMemo(() => {
        return calculateDateByIndex(timeIndex, metadata);
    }, [timeIndex, metadata]);

    const formattedCurrentDate = useMemo(() => {
        if (!currentDate) return 'N/A';
        return new Intl.DateTimeFormat('en-GB', {
            day: 'numeric', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit', timeZone: 'UTC'
        }).format(currentDate);
    }, [currentDate]);

    const stats = useMemo(() => {
        if (!activeVarData.length) return null;
        const vals = activeVarData.map(d => d.value).filter(v => v !== null && v !== undefined);
        if (!vals.length) return null;
        return {
            min: Math.min(...vals),
            max: Math.max(...vals),
            current: properties[selectedVariable]
        };
    }, [activeVarData, properties, selectedVariable]);

    // Simple SVG Sparkline with gradient area and X-axis labels
    const renderChart = () => {
        if (!stats || activeVarData.length < 2) return null;

        const width = 480;
        const height = 80;

        const minVal = stats.min;
        const maxVal = stats.max;
        const range = maxVal - minVal || 1;

        const points = activeVarData.map((d, i) => {
            const px = (i / (activeVarData.length - 1)) * width;
            const py = height - ((d.value - minVal) / range) * height;
            return `${px},${py}`;
        }).join(' ');

        // Format dates for labels
        const formatDate = (date) => {
            if (!date) return '';
            return new Intl.DateTimeFormat('en-GB', {
                day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'UTC'
            }).format(date);
        };

        const startDateStr = formatDate(activeVarData[0]?.date);
        const endDateStr = formatDate(activeVarData[activeVarData.length - 1]?.date);
        const midDateStr = formatDate(activeVarData[Math.floor(activeVarData.length / 2)]?.date);

        return (
            <Box sx={{ mt: 2, mb: 1.5, pl: '30px' }}>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)', display: 'block', mb: 0.5 }}>
                    Time Series ({variables[selectedVariable]?.name || selectedVariable})
                </Typography>
                <svg width={width} height={height} style={{ overflow: 'visible', marginTop: '12px' }}>
                    <defs>
                        <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#90caf9" stopOpacity="0.4" />
                            <stop offset="100%" stopColor="#90caf9" stopOpacity="0" />
                        </linearGradient>
                    </defs>

                    {/* Gradient Area */}
                    <path
                        fill="url(#chartGradient)"
                        d={`M 0,${height} L ${points} L ${width},${height} Z`}
                    />

                    {/* Main Line */}
                    <polyline
                        fill="none"
                        stroke="#90caf9"
                        strokeWidth="2"
                        strokeLinejoin="round"
                        points={points}
                    />

                    {/* Left/Right padding indicators (vertical lines) for aesthetics */}
                    <line x1="0" y1="0" x2="0" y2={height} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
                    <line x1={width} y1="0" x2={width} y2={height} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />

                    {/* Y-Axis Min/Max labels */}
                    <text x="-8" y="0" fontSize="10" fill="rgba(255,255,255,0.5)" textAnchor="end">{maxVal.toFixed(2)}</text>
                    <text x="-8" y={height} fontSize="10" fill="rgba(255,255,255,0.5)" textAnchor="end">{minVal.toFixed(2)}</text>

                    {/* X-Axis Dates */}
                    <text x="0" y={height + 15} fontSize="9" fill="rgba(255,255,255,0.4)" textAnchor="start">{startDateStr}</text>
                    <text x={width / 2} y={height + 15} fontSize="9" fill="rgba(255,255,255,0.4)" textAnchor="middle">{midDateStr}</text>
                    <text x={width} y={height + 15} fontSize="9" fill="rgba(255,255,255,0.4)" textAnchor="end">{endDateStr}</text>
                </svg>
            </Box>
        );
    };

    return (
        <Paper elevation={6} sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            p: 2.5,
            width: 550,
            zIndex: 10,
            pointerEvents: 'auto',
            borderRadius: 2,
            backgroundColor: 'rgba(30, 41, 59, 0.95)',
            backdropFilter: 'blur(10px)',
            color: 'white',
            border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
            <IconButton onClick={onClose} size="small" sx={{ position: 'absolute', top: 4, right: 4, color: 'white' }}>
                <CloseIcon fontSize="inherit" />
            </IconButton>

            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 0.5, color: 'primary.main' }}>
                Point Details
            </Typography>
            <Typography variant="caption" sx={{ display: 'block', mb: 1, color: 'rgba(255,255,255,0.6)' }}>
                {formattedCurrentDate}
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                {Object.keys(properties).map((key) => {
                    const isSelected = key === selectedVariable || (selectedVariable === 'currents' && (key === 'u' || key === 'v'));
                    const varInfo = variables[key] || { name: key };
                    if (key === 'index' || key == 'time') return null;

                    return (
                        <Typography
                            key={key}
                            variant="body2"
                            sx={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                color: isSelected ? 'white' : 'rgba(255,255,255,0.7)',
                                fontWeight: isSelected ? 'bold' : 'normal',
                                backgroundColor: isSelected ? 'rgba(144, 202, 249, 0.1)' : 'transparent',
                                px: 0.5,
                                borderRadius: 0.5
                            }}
                        >
                            <Box component="span" sx={{ textTransform: 'capitalize' }}>{varInfo.name || key}:</Box>
                            <Box component="span">
                                {properties[key] !== null && properties[key] !== undefined
                                    ? properties[key].toFixed(3)
                                    : 'N/A'}
                            </Box>
                        </Typography>
                    );
                })}
            </Box>

            {renderChart()}
        </Paper>
    );
}