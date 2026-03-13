'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';

import { API_BASE_URL, ANIMATION_SPEED_MS } from '../config';

export function useOceanData() {
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

  const fetchDepthData = useCallback(async (dIdx) => {
    if (!datasetId) return null;
    const cacheKey = `${datasetId}-${dIdx}`;

    if (depthCache.current.has(cacheKey)) {
      return depthCache.current.get(cacheKey);
    }

    if (pendingRequests.current.has(cacheKey)) {
      return pendingRequests.current.get(cacheKey);
    }

    const fetchPromise = (async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/points/${datasetId}/${dIdx}`);
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
  }, [datasetId]);

  // Initial metadata and grid fetch
  useEffect(() => {
    if (!datasetId) {
      setLoading({ initial: false, data: false });
      setError("No dataset specified. Please add '?dataset_id=<name>' to the URL.");
      setMetadata(null);
      setGridData(null);
      return;
    }

    const fetchInitialData = async () => {
      setMetadata(null);
      setGridData(null);
      setPointsData(null);
      depthCache.current.clear();
      setTimeIndex(0);
      setDepthIndex(0);
      setError(null);
      setLoading({ initial: true, data: false });

      try {
        const [metaResponse, gridResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/metadata/${datasetId}`),
          fetch(`${API_BASE_URL}/grid/${datasetId}`)
        ]);

        if (!metaResponse.ok) {
          if (metaResponse.status === 404) {
            throw new Error(`Dataset '${datasetId}' not found on the server.`);
          }
          throw new Error(`HTTP error fetching metadata! Status: ${metaResponse.status}`);
        }
        if (!gridResponse.ok) {
           throw new Error(`HTTP error fetching grid data! Status: ${gridResponse.status}`);
        }

        const data = await metaResponse.json();
        const grid = await gridResponse.json();

        // Handle case where API might return a map of datasets
        const datasetMetadata = data[datasetId] || data;
        setMetadata(datasetMetadata);
        setGridData(grid);

        if (datasetMetadata && datasetMetadata.variables) {
          setSelectedVariable(Object.keys(datasetMetadata.variables)[0]);
        }
      } catch (e) {
        setError(e.message || `Failed to fetch data for '${datasetId}'. Is the server at ${API_BASE_URL} running?`);
      } finally {
        setLoading(l => ({ ...l, initial: false }));
      }
    };

    fetchInitialData();
  }, [datasetId]);

  // Fetch current depth data and merge with grid for the specific time step
  useEffect(() => {
    if (!datasetId || !metadata || !gridData) return;

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
  }, [metadata, gridData, timeIndex, depthIndex, datasetId, fetchDepthData, streamVersion]);

  // Animation logic
  useEffect(() => {
    if (!isPlaying || loading.data || !metadata) return;
    const timer = setTimeout(() => {
      setTimeIndex(currentTimeIndex => (currentTimeIndex + 1) % metadata.time_steps);
    }, ANIMATION_SPEED_MS);
    return () => clearTimeout(timer);
  }, [isPlaying, loading.data, timeIndex, metadata]);

  return {
    datasetId,
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
  };
}