// src/hooks/useOceanData.js
'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation'; // Assuming Next.js App Router

const API_BASE_URL = 'http://127.0.0.1:8000/ocean_dataset';

export function useOceanData() {
  // --- State remains the same ---
  const [metadata, setMetadata] = useState(null);
  const [pointsData, setPointsData] = useState(null);
  const [selectedVariable, setSelectedVariable] = useState('');
  const [timeIndex, setTimeIndex] = useState(0);
  const [depthIndex, setDepthIndex] = useState(0);
  const [loading, setLoading] = useState({ initial: true, data: false });
  const [error, setError] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [clickInfo, setClickInfo] = useState(null);

  // --- NEW: Get dataset_id from URL search parameters ---
  const searchParams = useSearchParams();
  const datasetId = searchParams.get('dataset_id');

  // --- MODIFIED: Initial metadata fetch, now dependent on datasetId ---
  useEffect(() => {
    // If there's no datasetId, do nothing and show an error.
    if (!datasetId) {
      setLoading({ initial: false, data: false });
      setError("No dataset specified. Please add '?dataset_id=<name>' to the URL.");
      setMetadata(null); // Clear any previous metadata
      return;
    }

    const fetchInitialData = async () => {
      // Reset state when a new dataset is being fetched
      setMetadata(null);
      setPointsData(null);
      setTimeIndex(0);
      setDepthIndex(0);
      setError(null);
      setLoading({ initial: true, data: false });

      try {
        // Use the new API endpoint for dataset-specific metadata
        const response = await fetch(`${API_BASE_URL}/metadata/${datasetId}`);
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error(`Dataset '${datasetId}' not found on the server.`);
          }
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const data = await response.json();
        setMetadata(data);
        if (data && data.variables) {
          // Set the default selected variable from the new metadata
          setSelectedVariable(Object.keys(data.variables)[0]);
        }
      } catch (e) {
        setError(e.message || `Failed to fetch data for '${datasetId}'. Is the server at ${API_BASE_URL} running?`);
      } finally {
        setLoading(l => ({ ...l, initial: false }));
      }
    };

    fetchInitialData();
    // This effect now re-runs whenever the datasetId in the URL changes
  }, [datasetId]);

  // --- MODIFIED: Fetch points data, now dependent on datasetId ---
  useEffect(() => {
    // Don't fetch if we don't have a datasetId or the metadata isn't loaded yet
    if (!datasetId || !metadata) return;

    const fetchPointsData = async () => {
      setLoading(l => ({ ...l, data: true }));
      try {
        // Use the new API endpoint for dataset-specific points
        const response = await fetch(`${API_BASE_URL}/points/${datasetId}/${timeIndex}/${depthIndex}`);
        if (!response.ok) throw new Error(`Data fetch failed: ${response.status}`);
        const data = await response.json();
        setPointsData(data);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(l => ({ ...l, data: false }));
      }
    };

    fetchPointsData();
    // This effect re-runs if metadata, time, depth, OR datasetId changes
  }, [metadata, timeIndex, depthIndex, datasetId]);

  // Animation timer (no changes needed here)
  useEffect(() => {
    if (!isPlaying || loading.data || !metadata) return;
    const timer = setTimeout(() => {
      setTimeIndex(currentTimeIndex => (currentTimeIndex + 1) % metadata.time_steps);
    }, 500);
    return () => clearTimeout(timer);
  }, [isPlaying, loading.data, timeIndex, metadata]);

  return {
    datasetId, // Expose the current datasetId
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