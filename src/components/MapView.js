'use client';

import React from 'react';
import { useMemo } from 'react';
import { DeckGL } from '@deck.gl/react';
import { ContourLayer } from '@deck.gl/aggregation-layers';
import { ScatterplotLayer, IconLayer, GeoJsonLayer } from '@deck.gl/layers';
import { Map } from 'react-map-gl/maplibre';
import esriMapStyle from '../app/esri_map_style.json';
import { MATPLOTLIB_COLORMAPS, generateContours, getColorFromColormap } from '../utils/mapUtils';
import { MaskExtension } from '@deck.gl/extensions';
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
    if (!pointsData || !currentVarDepthConfig || !pointsData.lons) return [];

    const visibleLayers = [];

    const landMaskingLayer = new GeoJsonLayer({
      id: 'land-mask-layer',
      data: landPolygon,
      operation: 'mask',
    });
    visibleLayers.push(landMaskingLayer);

    // Filter points based on the selected variable to avoid interpolating over NaN/bathymetry
    const validIndices = [];
    if (selectedVariable === 'currents') {
      const u = pointsData.u;
      const v = pointsData.v;
      if (u && v) {
        for (let i = 0; i < u.length; i++) {
          if (u[i] !== null && u[i] !== undefined && v[i] !== null && v[i] !== undefined) {
            validIndices.push(i);
          }
        }
      }
    } else {
      const vals = pointsData[selectedVariable];
      if (vals) {
        for (let i = 0; i < vals.length; i++) {
          if (vals[i] !== null && vals[i] !== undefined) {
            validIndices.push(i);
          }
        }
      } else {
         console.warn(`Variable ${selectedVariable} not found in this depth index`);
      }
    }

    // Helper to reconstruct object for InfoBox
    const getPointObject = (index) => {
      if (index === -1 || index === undefined) return null;
      const props = {};
      Object.keys(pointsData).forEach(key => {
        if (key !== 'lons' && key !== 'lats') {
          props[key] = pointsData[key][index];
        }
      });
      return {
        position: [pointsData.lons[index], pointsData.lats[index]],
        properties: props
      };
    };

    if (selectedVariable === 'currents') {
      const colors = MATPLOTLIB_COLORMAPS[currentVarDepthConfig.colormap];
      const vminMag = 0;
      const vmaxMag = currentVarDepthConfig.vmax;

      const arrowLayer = new IconLayer({
        id: 'arrow-layer',
        data: validIndices,
        iconAtlas: ICON_ATLAS,
        iconMapping: ICON_MAPPING,
        getIcon: d => 'arrow',
        getPosition: d => [pointsData.lons[d], pointsData.lats[d]],
        getSize: d => {
          const u = pointsData.u[d];
          const v = pointsData.v[d];
          const magnitude = Math.sqrt(u * u + v * v);
          return 1000 + magnitude * 5000;
        },
        getColor: d => {
          const u = pointsData.u[d];
          const v = pointsData.v[d];
          const magnitude = Math.sqrt(u * u + v * v);
          return getColorFromColormap(magnitude, vminMag, vmaxMag, colors);
        },
        getAngle: d => {
          const u = pointsData.u[d];
          const v = pointsData.v[d];
          return -(Math.atan2(u, v) * (180 / Math.PI));
        },
        pickable: true,
        autoHighlight: true,
        highlightColor: [255, 255, 0, 255],
        onClick: info => {
          if (info.object !== undefined) {
            setClickInfo({ ...info, object: getPointObject(info.object) });
          } else {
            setClickInfo(null);
          }
        },
        sizeUnits: 'meters',
        maskId: 'land-mask-layer',
        maskInverted: true,
        extensions: [new MaskExtension()],
        updateTriggers: {
          getSize: [pointsData],
          getColor: [pointsData, vminMag, vmaxMag, colors],
          getAngle: [pointsData]
        }
      });

      visibleLayers.push(arrowLayer);

    } else {
      const scatterplotLayer = new ScatterplotLayer({
        id: 'scatterplot-layer',
        data: validIndices,
        getPosition: d => [pointsData.lons[d], pointsData.lats[d]],
        getFillColor: d => [200, 200, 200, 150],
        getRadius: 300,
        radiusMinPixels: 0,
        radiusMaxPixels: 3,
        pickable: true,
        autoHighlight: true,
        highlightColor: [255, 255, 0, 200],
        onClick: info => {
          if (info.object !== undefined) {
            setClickInfo({ ...info, object: getPointObject(info.object) });
          } else {
            setClickInfo(null);
          }
        },
        maskId: 'land-mask-layer',
        maskInverted: true,
        extensions: [new MaskExtension()]
      });

      const contourLayer = new ContourLayer({
        id: 'contour-layer',
        data: validIndices,
        contours: generateContours(
          currentVarDepthConfig.vmin,
          currentVarDepthConfig.vmax,
          MATPLOTLIB_COLORMAPS[currentVarDepthConfig.colormap]
        ),
        cellSize: 4000,
        getPosition: d => [pointsData.lons[d], pointsData.lats[d]],
        getWeight: d => pointsData[selectedVariable][d],
        pickable: false,
        aggregation: 'MIN',
        maskId: 'land-mask-layer',
        maskInverted: true,
        extensions: [new MaskExtension()],
        updateTriggers: {
          getWeight: [pointsData, selectedVariable],
          contours: [currentVarDepthConfig.vmin, currentVarDepthConfig.vmax, currentVarDepthConfig.colormap]
        }
      });

      visibleLayers.push(contourLayer);
      visibleLayers.push(scatterplotLayer);
    }

    return visibleLayers;

  }, [pointsData, selectedVariable, setClickInfo, currentVarDepthConfig]);

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