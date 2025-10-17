'use client';

import React from 'react';
import { useMemo } from 'react';
import { DeckGL } from '@deck.gl/react';
import { ContourLayer } from '@deck.gl/aggregation-layers';
import { ScatterplotLayer, IconLayer, GeoJsonLayer } from '@deck.gl/layers';
import { Map } from 'react-map-gl/maplibre';
import esriMapStyle from '../app/esri_map_style.json';
import { MATPLOTLIB_COLORMAPS, generateContours, getColorFromColormap } from '../utils/mapUtils';
import {MaskExtension} from '@deck.gl/extensions';
import landPolygon from '../app/sa_province_outline.json';

const ICON_ATLAS = 'arrow.svg';
const ICON_MAPPING = 'icon-mapping.json';


export default function MapView({
  metadata,
  pointsData,
  selectedVariable,
  timeIndex,
  depthIndex,
  setClickInfo,
  viewState,
  setViewState,
  currentVarDepthConfig
}) {

  const initialViewState = useMemo(() => {
    if (!metadata?.bounds) return null;
    const [minLon, minLat, maxLon, maxLat] = metadata.bounds;
    return {
      longitude: (minLon + maxLon) / 2,
      latitude: (minLat + maxLat) / 2,
      zoom: 6,
      pitch: 0,
      bearing: 0,
    };
  }, [metadata]);

  const layers = useMemo(() => {
    if (!pointsData || !currentVarDepthConfig) return [];

    const visibleLayers = [];

    if (selectedVariable === 'currents') {
      const colors = MATPLOTLIB_COLORMAPS[currentVarDepthConfig.colormap];
      const vminMag = 0;
      const vmaxMag = currentVarDepthConfig.vmax;

      const arrowLayer = new IconLayer({
        id: `arrow-layer-${timeIndex}-${depthIndex}`,
        data: pointsData,
        iconAtlas: ICON_ATLAS,
        iconMapping: ICON_MAPPING,
        getIcon: d => 'arrow',
        getPosition: d => d.position,
        getSize: d => {
          const u = d.properties.u;
          const v = d.properties.v;
          const magnitude = Math.sqrt(u * u + v * v);
          return 1000 + magnitude * 5000;
        },
        getColor: d => {
          const u = d.properties.u;
          const v = d.properties.v;
          const magnitude = Math.sqrt(u * u + v * v);
          return getColorFromColormap(magnitude, vminMag, vmaxMag, colors);
        },
        getAngle: d => {
          const u = d.properties.u;
          const v = d.properties.v;
          const angle = -(Math.atan2(u, v) * (180 / Math.PI));
          return angle;
        },
        pickable: true,
        autoHighlight: true,
        highlightColor: [255, 255, 0, 255],
        onClick: info => info.object ? setClickInfo(info) : setClickInfo(null),
        sizeUnits: 'meters',
        sizeMinPixels: 2,
        sizeMaxPixels: 50,
      });
            
      visibleLayers.push(arrowLayer);

    } else {      
      const landMaskingLayer = new GeoJsonLayer({
        id: 'land-mask-layer',
        data: landPolygon,
        operation: 'mask',
      });

      const scatterplotLayer = new ScatterplotLayer({
        id: `scatterplot-layer-${timeIndex}-${depthIndex}`,
        data: pointsData,
        getPosition: d => d.position,
        getFillColor: d => [200, 200, 200, 150],
        getRadius: 300,
        radiusMinPixels: 0,
        radiusMaxPixels: 3,
        pickable: true,
        autoHighlight: true,
        highlightColor: [255, 255, 0, 200],
        onClick: info => info.object ? setClickInfo(info) : setClickInfo(null),
      });

      const contourLayer = new ContourLayer({
        id: `contour-layer-${selectedVariable}-${timeIndex}-${depthIndex}`,
        data: pointsData,
        contours: generateContours(
          currentVarDepthConfig.vmin,
          currentVarDepthConfig.vmax,
          MATPLOTLIB_COLORMAPS[currentVarDepthConfig.colormap]
        ),
        cellSize: 4000,
        getPosition: d => d.position,
        getWeight: d => d.properties[selectedVariable],
        pickable: false,
        aggregation: 'MIN',
        maskId: 'land-mask-layer',        
        maskInverted: true,
        extensions: [new MaskExtension()]
      });
  
      visibleLayers.push(landMaskingLayer);
      visibleLayers.push(contourLayer);      
      visibleLayers.push(scatterplotLayer);
    }

    return visibleLayers;

  }, [pointsData, selectedVariable, timeIndex, depthIndex, setClickInfo, currentVarDepthConfig]);

  if (!initialViewState) {
      return <div>Loading map data...</div>;
  }

  return (
    <DeckGL
      style={{ position: 'relative', width: '100%', height: '100%' }}
      initialViewState={viewState || initialViewState}
      onViewStateChange={({ viewState: vs }) => setViewState(vs)}
      controller={true}
      layers={layers}
    >
      <Map mapStyle={esriMapStyle} />
    </DeckGL>
  );
}