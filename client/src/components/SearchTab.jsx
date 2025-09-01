import { useState } from 'react';
import AlbumCard from './AlbumCard';
import SongCard from './SongCard';

export default function SearchTab({
  albums = [],
  songs = [],
  onSearchAlbum,
  onSearchSong,
  onOpenSurvey,
  onSongsUpdate, // New prop to receive updated songs with enriched data
}) {
  // internal sub-tab: 'albums' or 'songs'
  const [activeSubTab, setActiveSubTab] = useState('albums');

  // separate queries per tab (keeps input state distinct)
  const [albumQuery, setAlbumQuery] = useState('');
  const [songQuery, setSongQuery] = useState('');

  // Add state for managing favorite operations (similar to FavoritesTab)
  const [pendingIds, setPendingIds] = useState(new Set());
  const [favoritedTracks, setFavoritedTracks] = useState(new Set());

  const handleAlbumSearch = () => {
    onSearchAlbum?.(albumQuery.trim());
  };

  const handleSongSearch = () => {
    // Pass a callback to receive progressive updates
    onSearchSong?.(songQuery.trim(), (updatedSongs) => {
      // If the parent provides onSongsUpdate, use it
      onSongsUpdate?.(updatedSongs);
    });
  };

  // Helper functions (copied from FavoritesTab logic)
  const formatDuration = (milliseconds) => {
    if (!milliseconds) return null;
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes > 60) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${hours}h ${mins}m`;
    } else {
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
  };

  const getGenreFromTrack = (track) => {
    return track.genre || 'Unknown';
  };

  const formatFullReleaseDate = (track) => {
    if (track.release_date) {
      const date = new Date(track.release_date);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    }
    return null;
  };

  // Handle favoriting/unfavoriting tracks
  const handleFavoriteToggle = async (track, e) => {
    e.preventDefault();
    if (pendingIds.has(track.track_id)) return;

    const isCurrentlyFavorited = favoritedTracks.has(track.track_id);
    const action = isCurrentlyFavorited ? 'remove' : 'add';

    setPendingIds(prev => new Set([...prev, track.track_id]));

    try {
      const res = await fetch('/api/favoriteTracks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          albumId: track.album_id, // Now should be available from iTunes lookup
          trackId: track.track_id,
          action: action,
        }),
      });
      const data = await res.json();

      if (data.success) {
        setFavoritedTracks(prev => {
          const newSet = new Set(prev);
          if (action === 'add') {
            newSet.add(track.track_id);
          } else {
            newSet.delete(track.track_id);
          }
          return newSet;
        });
      }
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
    } finally {
      setPendingIds(prev => {
        const copy = new Set(prev);
        copy.delete(track.track_id);
        return copy;
      });
    }
  };

  return (
    <section>
      {/* sub-tab buttons */}
      <div className="tab-buttons" style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button
          className="subtab-button"
          onClick={() => setActiveSubTab('albums')}
        >
          Albums
        </button>
        <button
          className="subtab-button"
          onClick={() => setActiveSubTab('songs')}
        >
          Songs
        </button>
      </div>

      {/* shared-looking search area, but with per-tab query */}
      <div className="search-container" style={{ display: 'flex', gap: 8, marginBottom: 20
       }}>
        {activeSubTab === 'albums' ? (
          <>
            <input
              type="text"
              value={albumQuery}
              onChange={(e) => setAlbumQuery(e.target.value)}
              placeholder="Search for albums or artists..."
              onKeyUp={(e) => e.key === 'Enter' && handleAlbumSearch()}
            />
            <button className="search-button" onClick={handleAlbumSearch}>Search</button>
          </>
        ) : (
          <>
            <input
              type="text"
              value={songQuery}
              onChange={(e) => setSongQuery(e.target.value)}
              placeholder="Search for songs or artists..."
              onKeyUp={(e) => e.key === 'Enter' && handleSongSearch()}
            />
            <button className="search-button" onClick={handleSongSearch}>Search</button>
          </>
        )}
      </div>

      {/* results grid - different styling for albums vs songs */}
      {activeSubTab === 'albums' ? (
        <div className="album-grid" style={{ marginBottom: "1rem" }}>
          {albums.length ? (
            albums.map((album) => (
              <AlbumCard
                key={album.collectionId ?? `${album.artist}-${album.name}`}
                album={album}
                onOpenSurvey={() => onOpenSurvey?.(album)}
              />
            ))
          ) : (
            <p>No albums yet — try a search.</p>
          )}
        </div>
      ) : (
        /* Songs grid with 2-column layout like FavoritesTab */
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: 16,
          marginBottom: "1rem"
        }}>
          {songs.length ? (
            songs.map((track, index) => {
              // Map the search result properties to match what SongCard expects
              const normalizedTrack = {
                ...track,
                track_id: track.trackId || track.track_id,
                track_name: track.trackName || track.track_name,
                artist_name: track.artistName || track.artist_name,
                album_name: track.collectionName || track.album_name,
                album_id: track.collectionId || track.album_id, // Now available from iTunes API
                artwork_url: track.artworkUrl100 || track.artwork_url,
                durations_ms: track.trackTimeMillis || track.durations_ms,
                release_date: track.releaseDate || track.release_date, // Now available from album lookup
                listeners: track.listeners, // Keep existing if available
                playcount: track.playcount, // Keep existing if available
              };

              const isPending = pendingIds.has(normalizedTrack.track_id);
              const isFav = favoritedTracks.has(normalizedTrack.track_id);
              const genre = getGenreFromTrack(normalizedTrack);
              const fullReleaseDate = formatFullReleaseDate(normalizedTrack);
              const trackduration = formatDuration(normalizedTrack.durations_ms);

              // Generate a unique key with fallbacks
              const uniqueKey = normalizedTrack.track_id
                || `${normalizedTrack.artist_name || 'unknown'}-${normalizedTrack.track_name || 'unknown'}-${normalizedTrack.album_name || 'unknown'}-${index}`
                || `song-${index}`;

              return (
                <SongCard
                  key={uniqueKey}
                  track={normalizedTrack}
                  isPending={isPending}
                  isFav={isFav}
                  onUnfavorite={handleFavoriteToggle}
                  genre={genre}
                  fullReleaseDate={fullReleaseDate}
                  trackduration={trackduration}
                />
              );
            })
          ) : (
            <p>No songs yet — try a search.</p>
          )}
        </div>
      )}
    </section>
  );
}