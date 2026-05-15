'use client';

import React, { useState } from 'react';
import { Box, ThemeProvider, createTheme, Typography, Dialog, DialogTitle, List, ListItem, ListItemButton, ListItemText, Divider } from '@mui/material';
import dynamic from 'next/dynamic';
import Header from './Header';
import { useRouter } from 'next/navigation';
import { beautifyModelName } from '../utils/mapUtils';

const MapView = dynamic(() => import('./MapView'), {
  ssr: false,
});

const darkTheme = createTheme({
  palette: { mode: 'dark', primary: { main: '#90caf9' }, background: { paper: 'rgba(30, 41, 59, 0.9)' }, surface: { main: '#1e293b' } },
});

export default function HomeView({ allMetadata }) {
  const router = useRouter();
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [viewState, setViewState] = useState({
    longitude: 25,
    latitude: -30,
    zoom: 4,
    pitch: 0,
    bearing: 0,
    transitionDuration: 800
  });

  // Group datasets by their bounds
  const groupedMetadata = React.useMemo(() => {
    if (!allMetadata) return {};
    const groups = {};
    Object.entries(allMetadata).forEach(([id, meta]) => {
      if (!meta.bounds) return;
      const key = meta.bounds.join(',');
      if (!groups[key]) {
        groups[key] = {
          bounds: meta.bounds,
          datasets: []
        };
      }
      groups[key].datasets.push({ id, name: meta.name || id });
    });
    return groups;
  }, [allMetadata]);

  const handleBoxClick = (datasets) => {
    if (datasets.length === 1) {
      router.push(`/?dataset_id=${datasets[0].id}`);
    } else {
      setSelectedGroup(datasets);
    }
  };

  return (
    <ThemeProvider theme={darkTheme}>
      <Box sx={{ position: 'fixed', top: 0, zIndex: 1500, width: '100vw' }}>
        <Header allMetadata={allMetadata} />
      </Box>
      <Box sx={{ height: '100vh', width: '100vw', position: 'relative' }}>
        <MapView
          groupedMetadata={groupedMetadata}
          viewState={viewState}
          setViewState={setViewState}
          isHome={true}
          onBoxClick={handleBoxClick}
        />
        <Box sx={{
          position: 'absolute',
          bottom: 40,
          left: '50%',
          transform: 'translateX(-50%)',
          bgcolor: 'rgba(15, 23, 42, 0.8)',
          p: 2,
          borderRadius: 2,
          border: '1px solid rgba(144, 202, 249, 0.3)',
          backdropFilter: 'blur(4px)',
          textAlign: 'center',
          pointerEvents: 'none'
        }}>
          <Typography variant="h6" sx={{ color: '#90caf9', fontWeight: 'bold' }}>
            Somisana Datasets
          </Typography>
          <Typography variant="body2" sx={{ color: 'white', opacity: 0.8 }}>
            Click on a bounding box to explore the dataset
          </Typography>
        </Box>
      </Box>

      <Dialog
        open={Boolean(selectedGroup)}
        onClose={() => setSelectedGroup(null)}
        PaperProps={{
          sx: {
            bgcolor: '#1e293b',
            color: '#e2e8f0',
            border: '1px solid rgba(144, 202, 249, 0.2)',
            minWidth: '300px'
          }
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>Select a Dataset</DialogTitle>
        <Divider sx={{ bgcolor: 'rgba(255,255,255,0.1)' }} />
        <List sx={{ py: 0 }}>
          {selectedGroup && selectedGroup.map((ds) => (
            <ListItem disablePadding key={ds.id}>
              <ListItemButton onClick={() => router.push(`/?dataset_id=${ds.id}`)}>
                <ListItemText primary={beautifyModelName(ds.id)} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Dialog>
    </ThemeProvider>
  );
}
