'use client';

import React, { useCallback } from 'react';
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

function generateArrowSVG(magnitude) {
  const headSize = 20;
  const strokeWidth = 5;

  const maxWidth = 120;
  const height = 60;
  const centerY = height / 2;

  return `
    <svg width="${maxWidth}" height="${height}" viewBox="0 0 ${maxWidth} ${height}" xmlns="http://www.w3.org/2000/svg">
      <line 
        x1="0" y1="${centerY}" 
        x2="${magnitude}" y2="${centerY}" 
        stroke="white" 
        stroke-width="${strokeWidth}" 
        stroke-linecap="round"
      />
      <path 
        d="M ${magnitude} ${centerY - headSize / 2} 
           L ${magnitude + headSize} ${centerY} 
           L ${magnitude} ${centerY + headSize / 2} 
           Z" 
        fill="white" 
      />
    </svg>
  `;
}

export default function MapView({
  metadata,
  pointsData,
  selectedVariable,
  timeIndex,
  depthIndex,
  setClickInfo,
  viewState,
  setViewState,
  currentVarDepthConfig,
  isHome,
  allMetadata,
  products,
  onBoxClick
}) {

  const initialViewState = useMemo(() => {
    if (isHome) {
      return {
        longitude: 25,
        latitude: -30,
        zoom: 4,
        pitch: 0,
        bearing: 0,
      };
    }
    if (!metadata?.bounds) return null;
    const minLat = Math.min(metadata.bounds[0], metadata.bounds[1]);
    const maxLat = Math.max(metadata.bounds[0], metadata.bounds[1]);
    const minLon = Math.min(metadata.bounds[2], metadata.bounds[3]);
    const maxLon = Math.max(metadata.bounds[2], metadata.bounds[3]);
    return {
      longitude: (minLon + maxLon) / 2,
      latitude: (minLat + maxLat) / 2,
      zoom: 6,
      pitch: 0,
      bearing: 0,
    };
  }, [metadata, isHome]);

  const step = useMemo(() => {
    const zl = viewState ? viewState.zoom : (initialViewState ? initialViewState.zoom : 6);
    if (zl < 7.0) return 6;
    if (zl < 8.0) return 4;
    if (zl < 10.0) return 2;
    return 1;
  }, [viewState, initialViewState]);

  const iconSize = useMemo(() => {
    const zl = viewState ? viewState.zoom : (initialViewState ? initialViewState.zoom : 6);
    if (zl < 7.0) return 10000;
    if (zl < 8.0) return 5000;
    if (zl < 10.0) return 3000;
    return 1000;
  }, [viewState, initialViewState]);

  const getPointObject = useCallback((index) => {
    if (index === -1 || index === undefined || !pointsData) return null;
    const props = {};
    Object.keys(pointsData).forEach(key => {
      if (key !== 'lons' && key !== 'lats') {
        props[key] = pointsData[key][index];
      }
    });
    if (pointsData.u && pointsData.v) {
      const u = pointsData.u[index];
      const v = pointsData.v[index];
      if (u !== null && v !== null) {
        props.currents = Math.sqrt(u * u + v * v);
      }
    }

    return {
      position: [pointsData.lons[index], pointsData.lats[index]],
      properties: props,
      index: index
    };
  }, [pointsData]);

  const handleMapClick = useCallback((info) => {
    if (isHome || !pointsData || !pointsData.lons || !pointsData.lats || !info.coordinate) {
      // Allow bounds layer click to be handled by DeckGL's layer-specific onClick if isHome
      if (isHome) return;
      setClickInfo(null);
      return;
    }

    const clickedLon = info.coordinate[0];
    const clickedLat = info.coordinate[1];

    let closestIndex = -1;
    let minDistanceSq = Infinity;

    for (let i = 0; i < pointsData.lons.length; i++) {
      const lon = pointsData.lons[i];
      const lat = pointsData.lats[i];
      if (lon === undefined || lat === undefined) continue;

      // Only snap to valid points for the selected variable
      if (selectedVariable === 'currents') {
         if (pointsData.u?.[i] === null || pointsData.u?.[i] === undefined) continue;
         if (pointsData.v?.[i] === null || pointsData.v?.[i] === undefined) continue;
      } else {
         if (pointsData[selectedVariable]?.[i] === null || pointsData[selectedVariable]?.[i] === undefined) continue;
      }

      const dSq = (lon - clickedLon) ** 2 + (lat - clickedLat) ** 2;
      if (dSq < minDistanceSq) {
        minDistanceSq = dSq;
        closestIndex = i;
      }
    }

    if (closestIndex !== -1) {
      setClickInfo({
        object: getPointObject(closestIndex),
        x: info.x,
        y: info.y,
        coordinate: info.coordinate
      });
    } else {
      setClickInfo(null);
    }
  }, [isHome, pointsData, selectedVariable, getPointObject, setClickInfo]);


  const layers = useMemo(() => {
    const visibleLayers = [];

    const landMaskingLayer = new GeoJsonLayer({
      id: 'land-mask-layer',
      data: landPolygon,
      operation: 'mask',
    });
    visibleLayers.push(landMaskingLayer);

    if (isHome && products) {
      const boxFeatures = products.map((product) => {
        const latA = product.bounds[0];
        const latB = product.bounds[1];
        const lonA = product.bounds[2];
        const lonB = product.bounds[3];

        const minLat = Math.min(latA, latB);
        const maxLat = Math.max(latA, latB);
        const minLon = Math.min(lonA, lonB);
        const maxLon = Math.max(lonA, lonB);

        return {
          type: 'Feature',
          properties: { product: product },
          geometry: {
            type: 'Polygon',
            coordinates: [[
              [minLon, minLat],
              [maxLon, minLat],
              [maxLon, maxLat],
              [minLon, maxLat],
              [minLon, minLat]
            ]]
          }
        };
      });

      const boundsLayer = new GeoJsonLayer({
        id: 'bounds-layer',
        data: { type: 'FeatureCollection', features: boxFeatures },
        getFillColor: [5, 15, 50, 180],
        getLineColor: [15, 45, 100, 255],
        getLineWidth: 2,
        lineWidthUnits: 'pixels',
        pickable: true,
        autoHighlight: true,
        highlightColor: [144, 202, 249, 200],
        onClick: info => {
          if (info.object && onBoxClick) {
            onBoxClick(info.object.properties.product);
          }
        },
        maskId: 'land-mask-layer',
        maskInverted: true,
        extensions: [new MaskExtension()]
      });
      visibleLayers.push(boundsLayer);
      return visibleLayers;
    }

    if (!pointsData || !currentVarDepthConfig || !pointsData.lons) return visibleLayers;

    const validIndices = [];
    if (selectedVariable === 'currents') {
      const u = pointsData.u;
      const v = pointsData.v;
      const lons = pointsData.lons;
      if (u && v && lons) {
        let nx = 0;
        if (lons.length > 1) {
          for (let i = 1; i < lons.length; i++) {
            if (lons[i] < lons[i - 1]) {
              nx = i;
              break;
            }
          }
        }

        if (nx === 0) nx = lons.length;

        for (let i = 0; i < u.length; i++) {
          if (u[i] !== null && u[i] !== undefined && v[i] !== null && v[i] !== undefined) {
            const col = i % nx;
            const row = Math.floor(i / nx);
            if (col % step === 0 && row % step === 0) {
              validIndices.push(i);
            }
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

    if (selectedVariable === 'currents') {
      const colors = MATPLOTLIB_COLORMAPS[currentVarDepthConfig.colormap];
      const vminMag = 0;
      const vmaxMag = currentVarDepthConfig.vmax;

      const arrowLayer = new IconLayer({
        id: 'arrow-layer',
        data: validIndices,
        sizeUnits: "pixels",
        getSize: iconSize,
        getIcon: d => {
          const u = pointsData.u[d];
          const v = pointsData.v[d];
          const magnitude = Math.sqrt(u * u + v * v);
          const svgMag = Math.min(Math.round(magnitude * 100), 100);
          const svgString = generateArrowSVG(svgMag);
          return {
            url: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString),
            id: `arrow-${svgMag}`,
            width: 120,
            height: 60,
            anchorX: 0,
            anchorY: 30,
            mask: true,
          };
        },
        getPosition: d => [pointsData.lons[d], pointsData.lats[d]],
        getColor: d => {
          const u = pointsData.u[d];
          const v = pointsData.v[d];
          const magnitude = Math.sqrt(u * u + v * v);
          return getColorFromColormap(magnitude, vminMag, vmaxMag, colors);
        },
        getAngle: d => {
          const u = pointsData.u[d];
          const v = pointsData.v[d];
          return (Math.atan2(v, u) * 180) / Math.PI;
        },
        pickable: true,
        autoHighlight: true,
        highlightColor: [255, 255, 0, 255],
        sizeUnits: 'meters',
        maskId: 'land-mask-layer',
        maskInverted: true,
        extensions: [new MaskExtension()],
        updateTriggers: {
          getSize: [pointsData],
          getIcon: [pointsData],
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

  }, [pointsData, selectedVariable, currentVarDepthConfig, step, iconSize, isHome, allMetadata, products, onBoxClick]);

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
      onClick={handleMapClick}
    >
      <Map mapStyle={esriMapStyle} />
    </DeckGL>
  );
}