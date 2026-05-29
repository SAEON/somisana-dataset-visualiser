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

export default function HomeView({ products }) {
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

  const handleBoxClick = (product) => {
    if (!product.datasets || product.datasets.length === 0) return;
    if (product.datasets.length === 1) {
      router.push(`/?dataset_id=${product.datasets[0].id}&product_title=${product.title}`);
    } else {
      setSelectedGroup(product);
    }
  };

  return (
    <ThemeProvider theme={darkTheme}>
      <Box sx={{ position: 'fixed', top: 0, zIndex: 1500, width: '100vw' }}>
        <Header products={products} />
      </Box>
      <Box sx={{ height: '100vh', width: '100vw', position: 'relative' }}>
        <MapView
          products={products}
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
        <DialogTitle sx={{ pb: 1, fontWeight: 'bold' }}>
          {selectedGroup ? selectedGroup.title : 'Select a Member'}
        </DialogTitle>
        <Divider sx={{ bgcolor: 'rgba(255,255,255,0.1)' }} />
        <List sx={{ py: 0 }}>
          {selectedGroup && selectedGroup.datasets.map((ds) => (
            <ListItem disablePadding key={ds.id}>
              <ListItemButton onClick={() => router.push(`/?dataset_id=${ds.id}&product_title=${selectedGroup.title}`)}>
                <ListItemText primary={ds.title || beautifyModelName(ds.id)} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
        <Box sx={{ p: 2, pt: 1, textAlign: 'center' }}>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>
            Select a member to visualise
          </Typography>
        </Box>
      </Dialog>
    </ThemeProvider>
  );
}
