// src/api/itunes.jsx
import { getAlbumListeners, getTrackStats } from "./lastfm";

export async function searchAlbums(query) {
  const res = await fetch(
    `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=album&limit=200`
  );
  const data = await res.json();

  const seen = new Set();
  let filtered = (data.results ?? []).filter((album) => {
    const name = album.collectionName?.toLowerCase() ?? "";
    const key = `${album.collectionName}-${album.artistName}`;
    const singleRegex = /[-–—]\s*single/i;

    return (
      album.collectionType === "Album" &&
      !singleRegex.test(name) &&
      !seen.has(key) &&
      seen.add(key)
    );
  });

  // Enrich with listener counts from Last.fm
  filtered = await Promise.all(
    filtered.map(async (album) => {
      const listeners = await getAlbumListeners(
        album.artistName,
        album.collectionName
      );
      return { ...album, listeners };
    })
  );

  // Sort by popularity
  filtered.sort((a, b) => b.listeners - a.listeners);

  return filtered;
}

export async function searchSongs(query, onProgress) {
  if (!query) return [];

  // Increment the enrichment ID to cancel any previous enrichments
  currentEnrichmentId++;
  const thisEnrichmentId = currentEnrichmentId;

  const res = await fetch(
    `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&attribute=songTerm&media=music&limit=200&country=US`
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`iTunes error ${res.status}: ${text}`);
  }
  const data = await res.json();
  const results = Array.isArray(data.results) ? data.results : [];
  
  // Dedupe by trackName + artistName
  const seen = new Set();
  const filtered = results.filter((t) => {
    const trackName = (t.trackName || '').trim();
    const artist = (t.artistName || '').trim();
    if (!trackName || !artist) return false;
    const key = `${trackName.toLowerCase()}|${artist.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Return initial results immediately with placeholder stats
  const initialResults = filtered.map(track => ({
    trackId: track.trackId,
    trackName: track.trackName,
    artistName: track.artistName,
    collectionName: track.collectionName,
    collectionId: track.collectionId,
    releaseDate: track.releaseDate,
    trackTimeMillis: track.trackTimeMillis,
    previewUrl: track.previewUrl,
    trackViewUrl: track.trackViewUrl,
    artworkUrl100: track.artworkUrl100,
    genre: track.primaryGenreName,
    listeners: null, // null indicates loading
    playcount: null, // null indicates loading
    isEnriching: true, // flag to show loading state
  }));

  // Start background enrichment if onProgress callback provided
  if (onProgress && typeof onProgress === 'function') {
    enrichInBackground(initialResults, onProgress, thisEnrichmentId);
  }

  return initialResults;
}

// Background enrichment function
let currentEnrichmentId = 0; // Global counter to track current enrichment

async function enrichInBackground(tracks, onProgress, enrichmentId) {
  const BATCH_SIZE = 5; // Small batches for better UX
  const enrichedTracks = [...tracks]; // Copy to avoid mutations
  
  for (let i = 0; i < tracks.length; i += BATCH_SIZE) {
    // Check if this enrichment has been cancelled
    if (enrichmentId !== currentEnrichmentId) {
      console.log('Enrichment cancelled, stopping background process');
      return;
    }
    
    const chunk = tracks.slice(i, i + BATCH_SIZE);
    
    // Process batch
    const enrichedChunk = await Promise.all(
      chunk.map(async (track, index) => {
        // Check again after async operation
        if (enrichmentId !== currentEnrichmentId) {
          return null; // Signal to stop
        }
        
        try {
          const stats = await getTrackStats(track.artistName, track.trackName);
          const enriched = {
            ...track,
            listeners: stats ? Number(stats.listeners) || 0 : 0,
            playcount: stats ? Number(stats.playcount) || 0 : 0,
            isEnriching: false,
          };
          
          // Update the enriched array
          enrichedTracks[i + index] = enriched;
          
          return enriched;
        } catch (err) {
          console.warn('getTrackStats failed for', track.artistName, track.trackName, err);
          const fallback = {
            ...track,
            listeners: 0,
            playcount: 0,
            isEnriching: false,
          };
          enrichedTracks[i + index] = fallback;
          return fallback;
        }
      })
    );
    
    // Final check before calling progress callback
    if (enrichmentId !== currentEnrichmentId) {
      console.log('Enrichment cancelled before progress callback');
      return;
    }
    
    // Only call progress if some results were processed
    if (enrichedChunk.some(result => result !== null)) {
      onProgress([...enrichedTracks], enrichmentId);
    }
    
    // Small delay to prevent overwhelming the API
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

// Utility function to enrich a single track (for on-demand enrichment)
export async function enrichSingleTrack(track) {
  if (track.listeners !== null && track.playcount !== null && !track.isEnriching) {
    return track; // Already enriched
  }
  
  try {
    const stats = await getTrackStats(track.artistName, track.trackName);
    return {
      ...track,
      listeners: stats ? Number(stats.listeners) || 0 : 0,
      playcount: stats ? Number(stats.playcount) || 0 : 0,
      isEnriching: false,
    };
  } catch (err) {
    console.warn('getTrackStats failed for', track.artistName, track.trackName, err);
    return {
      ...track,
      listeners: 0,
      playcount: 0,
      isEnriching: false,
    };
  }
}