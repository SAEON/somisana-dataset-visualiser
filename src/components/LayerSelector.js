'use client';

import React, { useMemo } from 'react';
import { 
    Paper, 
    Typography, 
    Box, 
    RadioGroup, 
    FormControlLabel, 
    Radio, 
    FormControl 
} from '@mui/material';

export default function LayerSelector({ metadata, selectedVariable, setSelectedVariable }) {
  // Create a new list for display, replacing u/v with a single 'currents' entry
  const displayVariables = useMemo(() => {
    if (!metadata?.variables) return [];

    const variables = [
      // Manually add our new 'Currents' layer
      { key: 'currents', name: 'Currents' }
    ];

    // Filter out 'u' and 'v' from the original list and add the rest
    Object.keys(metadata.variables).forEach(key => {
      if (key !== 'u' && key !== 'v') {
        variables.push({
          key: key,
          name: metadata.variables[key].name
        });
      }
    });

    return variables;
  }, [metadata]);

  const handleVariableChange = (event) => {
    setSelectedVariable(event.target.value);
  };

  return (
    <Paper elevation={4} sx={{ position: 'absolute', top: 100, left: 16, p: 2, width: 'max-content' }}>
      <Typography variant="h6" component="h1" id="layer-select-label" sx={{ mb: 1 }}>
        Layer Select
      </Typography>
      <Box>
        <FormControl component="fieldset">
          <RadioGroup
            aria-labelledby="layer-select-label"
            name="layer-select-radio-group"
            value={selectedVariable}
            onChange={handleVariableChange}
          >
            {displayVariables.map((variable) => (
              <FormControlLabel
                key={variable.key}
                value={variable.key}
                control={<Radio size="small" />}
                label={variable.name}
              />
            ))}
          </RadioGroup>
        </FormControl>
      </Box>
    </Paper>
  );
}