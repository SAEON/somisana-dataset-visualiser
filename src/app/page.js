'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Box, LinearProgress, ThemeProvider, createTheme } from '@mui/material';
import dynamic from 'next/dynamic';

import { useOceanData } from '../hooks/useOceanData';
import { VARIABLES_CONFIG } from '../utils/mapUtils';

import LayerSelector from '../components/LayerSelector';
import DepthSlider from '../components/DepthSlider';
import TimeSlider from '../components/TimeSlider';
import ColourLegend from '../components/ColourLegend';
import InfoBox from '../components/InfoBox';
import Header from '../components/Header';

const MapView = dynamic(() => import('../components/MapView'), {
  ssr: false,
});

const darkTheme = createTheme({
  palette: { mode: 'dark', primary: { main: '#90caf9' }, background: { paper: 'rgba(30, 41, 59, 0.9)' } },
});

export default function HomePage() {
  const {
    metadata,
    pointsData,
    gridData,
    selectedVariable,
    setSelectedVariable,
    timeIndex,
    setTimeIndex,
    depthIndex,
    setDepthIndex,
    loading,
    error,
    isPlaying,
    setIsPlaying,
    clickInfo,
    setClickInfo
  } = useOceanData();

  const [viewState, setViewState] = useState(null);

  useEffect(() => {
    if (metadata && metadata.bounds) {
      setViewState({
        longitude: (metadata.bounds[0] + metadata.bounds[2]) / 2,
        latitude: (metadata.bounds[1] + metadata.bounds[3]) / 2,
        zoom: 6,
        pitch: 0,
        bearing: 0,
        transitionDuration: 800
      });
    }
  }, [metadata]);

  const currentVarDepthConfig = useMemo(() => {
    if (!metadata || !selectedVariable) {
      return null;
    }

    const staticConfig = VARIABLES_CONFIG[selectedVariable];
    if (!staticConfig) return null;

    const currentDepth = metadata.depth_levels[depthIndex];
    if (currentDepth === undefined) return null;

    const depthKey = currentDepth.toFixed(1);

    if (selectedVariable === 'currents') {
      const uMeta = metadata.variables.u;
      const vMeta = metadata.variables.v;
      if (!uMeta?.depth_stats || !vMeta?.depth_stats) return null;

      const uStats = uMeta.depth_stats[depthKey];
      const vStats = vMeta.depth_stats[depthKey];
      if (!uStats || !vStats) return null;

      const vmax = Math.max(
        Math.abs(uStats.vmax), Math.abs(uStats.vmin),
        Math.abs(vStats.vmax), Math.abs(vStats.vmin)
      );

      return { ...staticConfig, vmin: 0, vmax: vmax, units: 'm/s' };
    }

    const variableMeta = metadata.variables[selectedVariable];
    if (!variableMeta?.depth_stats) {
      return { ...staticConfig, ...variableMeta };
    }

    const dynamicStats = variableMeta.depth_stats[depthKey];
    if (!dynamicStats) return null;

    return { ...staticConfig, units: variableMeta['units'], ...dynamicStats };
  }, [metadata, selectedVariable, depthIndex]);

  if (loading.initial) {
    return <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', bgcolor: '#111827', color: 'white' }}>Loading initial data...</Box>;
  }
  if (error) {
    return <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', bgcolor: 'darkred', color: 'white', p: 4 }}>{error}</Box>;
  }
  if (!metadata) {
    return <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', bgcolor: '#111827', color: 'white' }}>Failed to load metadata. Please check the API connection and refresh.</Box>;
  }

  return (
    <ThemeProvider theme={darkTheme}>      
      <Box sx={{ position: 'fixed', top: 0, zIndex: 1500, width: '100vw' }}>
        <Header />
        {(loading.data || !viewState) && <LinearProgress />}
      </Box>      
      <Box sx={{ height: '100vh', width: '100vw', position: 'relative' }}>
        {viewState && <MapView
          pointsData={pointsData}
          gridData={gridData}
          currentVarDepthConfig={currentVarDepthConfig}
          metadata={metadata}
          selectedVariable={selectedVariable}
          timeIndex={timeIndex}
          depthIndex={depthIndex}
          setClickInfo={setClickInfo}
          viewState={viewState}
          setViewState={setViewState}
        />}
        <LayerSelector metadata={metadata} selectedVariable={selectedVariable} setSelectedVariable={setSelectedVariable} />
        <DepthSlider metadata={metadata} depthIndex={depthIndex} setDepthIndex={setDepthIndex} />
        <TimeSlider metadata={metadata} timeIndex={timeIndex} setTimeIndex={setTimeIndex} isPlaying={isPlaying} setIsPlaying={setIsPlaying} />
        <ColourLegend variableConfig={currentVarDepthConfig} selectedVariable={selectedVariable} />
        {clickInfo && <InfoBox clickInfo={clickInfo} onClose={() => setClickInfo(null)} variables={metadata.variables} />}
      </Box>
    </ThemeProvider>
  );
}