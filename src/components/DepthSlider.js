'use client';

import React, { useMemo } from 'react';
import { Paper, Typography, Slider } from '@mui/material';

export default function DepthSlider({ metadata, depthIndex, setDepthIndex }) {
  const depthMarks = useMemo(() => {
    if (!metadata?.depth_levels) return [];
    const numLevels = metadata.depth_levels.length;
    const interval = Math.max(1, Math.floor(numLevels / 10));
    return metadata.depth_levels
      .map((depth, index) => ({
        value: numLevels - 1 - index,
        label: `${depth}`
      }))
      .filter((_, index) => index % interval === 0 || index === numLevels - 1);
  }, [metadata]);

  return (
    <Paper
      elevation={4}
      sx={{
        position: 'absolute', right: 20, bottom: 40, px: 1, py: 2,
        height: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1
      }}
    >
      <Typography sx={{ pb: 1 }}>Depth (m)</Typography>
      <Slider
        orientation="vertical"
        size='small'
        value={metadata.depth_levels.length - 1 - depthIndex}
        min={0}
        max={metadata.depth_levels.length - 1}
        onChange={(e, val) => setDepthIndex(metadata.depth_levels.length - 1 - val)}
        sx={{ fontSize: '0.5rem', flexGrow: 1 }}
        marks={depthMarks}
      />
    </Paper>
  );
}