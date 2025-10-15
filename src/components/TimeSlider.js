'use client';

import React, { useMemo } from 'react';
import { Paper, Typography, Box, Slider, IconButton } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';

export default function TimeSlider({ metadata, timeIndex, setTimeIndex, isPlaying, setIsPlaying }) {

  const calculateDateByIndex = (index) => {
    if (!metadata?.start_date || typeof metadata.step_minutes === 'undefined') return null;
    const startDate = new Date(metadata.start_date);
    const minutesToAdd = index * metadata.step_minutes;
    const newDate = new Date(startDate.getTime());
    newDate.setMinutes(newDate.getMinutes() + minutesToAdd);
    return newDate;
  };

  const formattedDateTime = useMemo(() => {
    if (!metadata) return 'Loading Metadata...';
    const date = calculateDateByIndex(timeIndex);
    if (!date) return "Awaiting time metadata...";
    return new Intl.DateTimeFormat('en-GB', {
        day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', timeZone: 'UTC'
    }).format(date);
  }, [metadata, timeIndex]);

  return (
    <Paper
      elevation={4}
      sx={{ position: 'absolute', bottom: 40, left: '50%', transform: 'translateX(-50%)', width: 'max-content', p: 2, pt: 1 }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Typography sx={{ fontSize: '0.875rem', textAlign: 'center' }}>
          {formattedDateTime}
        </Typography>
        <IconButton onClick={() => setIsPlaying(!isPlaying)} color="primary">
          {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
        </IconButton>
        <Slider
          value={timeIndex}
          min={0}
          max={metadata.time_steps - 1}
          onChange={(e, val) => setTimeIndex(val)}
          sx={{ flex: 1, width: '60vw' }}
          valueLabelDisplay="auto"
          valueLabelFormat={(value) => {
            const date = calculateDateByIndex(value);
            if (!date) return '';
            return new Intl.DateTimeFormat('en-GB', {
                day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'UTC'
            }).format(date);
          }}
        />
      </Box>
    </Paper>
  );
}