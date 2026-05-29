'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';

import { API_BASE_URL, ANIMATION_SPEED_MS } from '../config';
import { calculateDateByIndex } from '../utils/mapUtils';

export function useOceanData() {
  const [products, setProducts] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [gridData, setGridData] = useState(null);
  const [pointsData, setPointsData] = useState(null);
  const [selectedVariable, setSelectedVariable] = useState('');
  const [timeIndex, setTimeIndex] = useState(0);
  const [depthIndex, setDepthIndex] = useState(0);
  const [loading, setLoading] = useState({ initial: true, data: false });
  const [streamVersion, setStreamVersion] = useState(0); // Used to trigger re-renders when streaming data arrives
  const [error, setError] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [clickInfo, setClickInfo] = useState(null);

  const depthCache = useRef(new Map());
  const pendingRequests = useRef(new Map());

  const searchParams = useSearchParams();
  const datasetId = searchParams.get('dataset_id');
  const productTitle = searchParams.get('product_title');

  const fetchDepthData = useCallback(async (dIdx) => {
    if (!datasetId || !productTitle) return null;
    const cacheKey = `${datasetId}-${dIdx}`;

    if (depthCache.current.has(cacheKey)) {
      return depthCache.current.get(cacheKey);
    }

    if (pendingRequests.current.has(cacheKey)) {
      return pendingRequests.current.get(cacheKey);
    }

    const fetchPromise = (async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/points/${encodeURIComponent(productTitle)}/${encodeURIComponent(datasetId)}/${dIdx}`);
        if (!response.ok) throw new Error(`Data fetch failed: ${response.status}`);
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let partialChunk = '';
        const dataArray = [];
        depthCache.current.set(cacheKey, dataArray);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          partialChunk += decoder.decode(value, { stream: true });
          const lines = partialChunk.split('\n');
          partialChunk = lines.pop() || '';

          for (const line of lines) {
            if (line.trim()) {
              try {
                const stepData = JSON.parse(line);
                dataArray.push(stepData);
                // Trigger re-render to allow immediate display of this time-step
                setStreamVersion(v => v + 1);
              } catch (parseError) {
                console.error("Error parsing NDJSON line:", parseError);
              }
            }
          }
        }
        
        return dataArray;
      } catch (e) {
        console.error(`Error fetching depth ${cacheKey}:`, e);
        depthCache.current.delete(cacheKey); // Clear cache so we can retry
        throw e;
      } finally {
        pendingRequests.current.delete(cacheKey);
      }
    })();

    pendingRequests.current.set(cacheKey, fetchPromise);
    return fetchPromise;
  }, [datasetId, productTitle]);

  // Initial products and metadata fetch
  useEffect(() => {
    const fetchInitialData = async () => {
      setProducts(null);
      setMetadata(null);
      setGridData(null);
      setPointsData(null);
      depthCache.current.clear();
      setTimeIndex(0);
      setDepthIndex(0);
      setError(null);
      setLoading({ initial: true, data: false });

      try {
        const productsResponse = await fetch(`${API_BASE_URL}/get_products`);
        if (!productsResponse.ok) {
          throw new Error(`HTTP error fetching products! Status: ${productsResponse.status}`);
        }
        const productsList = await productsResponse.json();
        setProducts(productsList);

        if (datasetId && productTitle) {
          const gridResponse = await fetch(`${API_BASE_URL}/grid/${encodeURIComponent(productTitle)}/${encodeURIComponent(datasetId)}`);
          if (!gridResponse.ok) {
            throw new Error(`HTTP error fetching grid data for '${datasetId}'! Status: ${gridResponse.status}`);
          }
          const grid = await gridResponse.json();
          setGridData(grid);

          const metaResponse = await fetch(`${API_BASE_URL}/metadata/${encodeURIComponent(productTitle)}/${encodeURIComponent(datasetId)}`);
          if (!metaResponse.ok) {
            throw new Error(`HTTP error fetching metadata for '${datasetId}'! Status: ${metaResponse.status}`);
          }
          const datasetMetadata = await metaResponse.json();
          setMetadata(datasetMetadata);

          if (datasetMetadata && datasetMetadata.variables) {
            setSelectedVariable(Object.keys(datasetMetadata.variables)[0]);
          }
        }
      } catch (e) {
        setError(e.message || `Failed to fetch data. Is the server at ${API_BASE_URL} running?`);
      } finally {
        setLoading(l => ({ ...l, initial: false }));
      }
    };

    fetchInitialData();
  }, [datasetId, productTitle]);

  // Fetch current depth data and merge with grid for the specific time step
  useEffect(() => {
    if (!datasetId || !productTitle || !metadata || !gridData) return;

    const loadData = async () => {
      const cacheKey = `${datasetId}-${depthIndex}`;
      const cachedData = depthCache.current.get(cacheKey);

      // If the current timeIndex is already available in the cache (even if partially loaded), use it immediately
      if (cachedData && cachedData[timeIndex]) {
        setPointsData({
          ...gridData,
          ...cachedData[timeIndex]
        });
        setLoading(l => ({ ...l, data: false }));
        setError(null);
        return;
      }

      setLoading(l => ({ ...l, data: true }));

      // If we are already fetching this depth, we don't await (which waits for the WHOLE file).
      // Instead, we just wait for more chunks to arrive via streamVersion updates.
      if (pendingRequests.current.has(cacheKey)) {
        return;
      }

      try {
        // This will start a new fetch
        const fullDepthData = await fetchDepthData(depthIndex);
        
        // Only error if the stream is finished and we STILL don't have the data
        if (fullDepthData && !fullDepthData[timeIndex]) {
           setError(`Time index ${timeIndex} out of bounds for fetched data (Total available: ${fullDepthData.length}).`);
        } else {
           setError(null);
        }
      } catch (e) {
        setError(`Failed to load data for depth index ${depthIndex}: ${e.message}`);
      } finally {
        // Double check if data arrived during/after fetch
        const currentData = depthCache.current.get(cacheKey);
        if (currentData && currentData[timeIndex]) {
           setPointsData({
             ...gridData,
             ...currentData[timeIndex]
           });
           setLoading(l => ({ ...l, data: false }));
        }
      }
    };

    loadData();
  }, [metadata, gridData, timeIndex, depthIndex, datasetId, productTitle, fetchDepthData, streamVersion]);

  // Animation logic
  useEffect(() => {
    if (!isPlaying || loading.data || !metadata) return;
    const timer = setTimeout(() => {
      setTimeIndex(currentTimeIndex => (currentTimeIndex + 1) % metadata.time_steps);
    }, ANIMATION_SPEED_MS);
    return () => clearTimeout(timer);
  }, [isPlaying, loading.data, timeIndex, metadata]);

  const getTimeSeries = useCallback((pointIndex) => {
    if (!datasetId || !productTitle || !metadata) return [];
    const cacheKey = `${datasetId}-${depthIndex}`;
    const cachedData = depthCache.current.get(cacheKey);
    if (!cachedData) return [];

    return cachedData.map((step, idx) => {
      const data = {
        timeIndex: idx,
        date: calculateDateByIndex(idx, metadata)
      };

      // Add all variables for the point
      Object.keys(step).forEach(key => {
        if (Array.isArray(step[key])) {
          data[key] = step[key][pointIndex];
        }
      });

      // Special case for currents magnitude
      if (step.u && step.v) {
        const u = step.u[pointIndex];
        const v = step.v[pointIndex];
        if (u !== null && v !== null) {
          data.currents = Math.sqrt(u * u + v * v);
        } else {
          data.currents = null;
        }
      }

      return data;
    });
  }, [datasetId, productTitle, depthIndex, metadata]);

  return {
    datasetId,
    productTitle,
    products,
    metadata,
    pointsData,
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
    setClickInfo,
    getTimeSeries
  };
}