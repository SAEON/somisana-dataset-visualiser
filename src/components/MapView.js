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

    // Helper to reconstruct object for InfoBox
    const getPointObject = (index) => {
      if (index === -1) return null;
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
        data: {
          length: pointsData.lons.length,
          lons: pointsData.lons,
          lats: pointsData.lats,
          u: pointsData.u,
          v: pointsData.v
        },
        iconAtlas: ICON_ATLAS,
        iconMapping: ICON_MAPPING,
        getIcon: d => 'arrow',
        getPosition: (_, { index, data }) => [data.lons[index], data.lats[index]],
        getSize: (_, { index, data }) => {
          const u = data.u[index];
          const v = data.v[index];
          if (u === undefined || v === undefined) return 0;
          const magnitude = Math.sqrt(u * u + v * v);
          return 1000 + magnitude * 5000;
        },
        getColor: (_, { index, data }) => {
          const u = data.u[index];
          const v = data.v[index];
          if (u === undefined || v === undefined) return [0, 0, 0, 0];
          const magnitude = Math.sqrt(u * u + v * v);
          return getColorFromColormap(magnitude, vminMag, vmaxMag, colors);
        },
        getAngle: (_, { index, data }) => {
          const u = data.u[index];
          const v = data.v[index];
          if (u === undefined || v === undefined) return 0;
          const angle = -(Math.atan2(u, v) * (180 / Math.PI));
          return angle;
        },
        pickable: true,
        autoHighlight: true,
        highlightColor: [255, 255, 0, 255],
        onClick: info => {
          if (info.index !== -1) {
            setClickInfo({ ...info, object: getPointObject(info.index) });
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
        data: {
          length: pointsData.lons.length,
          lons: pointsData.lons,
          lats: pointsData.lats
        },
        getPosition: (_, { index, data }) => [data.lons[index], data.lats[index]],
        getFillColor: d => [200, 200, 200, 150],
        getRadius: 300,
        radiusMinPixels: 0,
        radiusMaxPixels: 3,
        pickable: true,
        autoHighlight: true,
        highlightColor: [255, 255, 0, 200],
        onClick: info => {
          if (info.index !== -1) {
            setClickInfo({ ...info, object: getPointObject(info.index) });
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
        data: {
          length: pointsData.lons.length,
          lons: pointsData.lons,
          lats: pointsData.lats,
          values: pointsData[selectedVariable]
        },
        contours: generateContours(
          currentVarDepthConfig.vmin,
          currentVarDepthConfig.vmax,
          MATPLOTLIB_COLORMAPS[currentVarDepthConfig.colormap]
        ),
        cellSize: 4000,
        getPosition: (_, { index, data }) => [data.lons[index], data.lats[index]],
        getWeight: (_, { index, data }) => data.values ? data.values[index] : 0,
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