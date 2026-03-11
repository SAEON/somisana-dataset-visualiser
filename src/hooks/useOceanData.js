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
        const data = await response.json();
        
        depthCache.current.set(cacheKey, data);
        return data;
      } catch (e) {
        console.error(`Error fetching depth ${cacheKey}:`, e);
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
      setLoading(l => ({ ...l, data: true }));
      try {
        const fullDepthData = await fetchDepthData(depthIndex);
        if (fullDepthData && fullDepthData[timeIndex]) {
          // Merge grid coords with time values
          setPointsData({
            ...gridData,
            ...fullDepthData[timeIndex]
          });
          setError(null);
        } else if (fullDepthData && !fullDepthData[timeIndex]) {
           setError(`Time index ${timeIndex} out of bounds for fetched data.`);
        }
      } catch (e) {
        setError(`Failed to load data for depth index ${depthIndex}: ${e.message}`);
      } finally {
        setLoading(l => ({ ...l, data: false }));
      }
    };

    loadData();
  }, [metadata, gridData, timeIndex, depthIndex, datasetId, fetchDepthData]);

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