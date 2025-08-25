// FavoritesTab.jsx
import React, { useEffect, useState, useMemo } from 'react';
import SongCard from './SongCard';

export default function FavoritesTab() {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pendingIds, setPendingIds] = useState(new Set());

  // Sorting and filtering state
  const [sortBy, setSortBy] = useState('date_favorited');
  const [sortOrder, setSortOrder] = useState('desc');
  const [filterArtist, setFilterArtist] = useState('');
  const [filterAlbum, setFilterAlbum] = useState('');
  const [filterGenre, setFilterGenre] = useState('');

  const loadFavorites = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/favoriteTracks/allTracks');
      if (!res.ok) throw new Error(`Server ${res.status}`);
      const data = await res.json();
      const favs = data?.favorites ?? data ?? [];
      setFavorites(favs);
    } catch (err) {
      console.error('Failed to load favorites', err);
      setError('Failed to load favorites');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFavorites();
  }, []);

  const clearAllFilters = () => {
    setFilterArtist('');
    setFilterAlbum('');
    setFilterGenre('');
  };

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

  const handleUnfavorite = async (track, e) => {
    e.preventDefault();
    if (pendingIds.has(track.track_id)) return;

    setPendingIds(prev => new Set([...prev, track.track_id]));
    try {
      const res = await fetch('/api/favoriteTracks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          albumId: track.album_id,
          trackId: track.track_id,
          action: 'remove',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setFavorites(prev =>
          prev.filter(f => !(f.album_id === track.album_id && f.track_id === track.track_id))
        );
      }
    } catch (err) {
      console.error('Failed to unfavorite track:', err);
    } finally {
      setPendingIds(prev => {
        const copy = new Set(prev);
        copy.delete(track.track_id);
        return copy;
      });
    }
  };

  // Function to get genre based on track data (simplified)
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

  // Create unique lists for filters
  const uniqueArtists = useMemo(() => {
    return [...new Set(favorites.map(track => track.artist_name))].filter(Boolean).sort();
  }, [favorites]);

  const uniqueAlbums = useMemo(() => {
    return [...new Set(favorites.map(track => track.album_name))].filter(Boolean).sort();
  }, [favorites]);

  const uniqueGenres = useMemo(() => {
    return [...new Set(favorites.map(track => getGenreFromTrack(track)))].filter(genre => genre !== 'Unknown').sort();
  }, [favorites]);

  // Filter and sort favorites
  const filteredAndSortedFavorites = useMemo(() => {
    let filtered = favorites.filter(track => {
      if (filterArtist && track.artist_name !== filterArtist) return false;
      if (filterAlbum && track.album_name !== filterAlbum) return false;
      if (filterGenre && getGenreFromTrack(track) !== filterGenre) return false;
      return true;
    });

    return filtered.sort((a, b) => {
      let aValue, bValue;

      switch (sortBy) {
        case 'track_name':
          aValue = a.track_name?.toLowerCase() || '';
          bValue = b.track_name?.toLowerCase() || '';
          break;
        case 'date_favorited':
          aValue = new Date(a.date_favorited || 0);
          bValue = new Date(b.date_favorited || 0);
          break;
        case 'listeners':
          aValue = Number(a.listeners) || 0;
          bValue = Number(b.listeners) || 0;
          break;
        case 'playcount':
          aValue = Number(a.playcount) || 0;
          bValue = Number(b.playcount) || 0;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [favorites, filterArtist, filterAlbum, filterGenre, sortBy, sortOrder]);

  if (loading) return (<div style={{ padding: 16, color: '#94a3b8' }}>Loading favorites...</div>);
  if (error) return (<div style={{ padding: 16, color: '#f87171' }}>{error}</div>);
  if (favorites.length === 0) return (<div style={{ padding: 16, color: '#94a3b8' }}>You haven't favorited any songs yet.</div>);

  return (
    <div style={{ padding: '12px 8px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 'bold', color: '#ffffff' }}>Your Favorite Songs</h2>
      </div>

      {/* Controls (unchanged from your original) */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        marginBottom: '1.5rem'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          flexWrap: 'wrap'
        }}>
          <label htmlFor="sort" style={{ color: '#e2e8f0', fontWeight: '500' }}>Sort by:</label>
          <select
            id="sort"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{
              padding: '0.25rem 0.5rem',
              borderRadius: '4px',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              background: 'rgba(255, 255, 255, 0.1)',
              color: '#e2e8f0',
              backdropFilter: 'blur(5px)'
            }}
          >
            <option value="date_favorited" style={{ background: '#1e293b', color: '#e2e8f0' }}>Date Favorited</option>
            <option value="track_name" style={{ background: '#1e293b', color: '#e2e8f0' }}>Song Name</option>
            <option value="listeners" style={{ background: '#1e293b', color: '#e2e8f0' }}>Listeners</option>
            <option value="playcount" style={{ background: '#1e293b', color: '#e2e8f0' }}>Playcount</option>
          </select>

          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            style={{
              padding: '0.25rem 0.5rem',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '4px',
              cursor: 'pointer',
              color: '#e2e8f0',
              backdropFilter: 'blur(5px)'
            }}
          >
            {sortOrder === 'asc' ? '🔼' : '🔽'}
          </button>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          flexWrap: 'wrap',
          padding: '1rem',
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '8px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label style={{ fontWeight: '500', fontSize: '0.9rem', color: '#e2e8f0' }}>Artist:</label>
            <select
              value={filterArtist}
              onChange={(e) => setFilterArtist(e.target.value)}
              style={{
                padding: '0.25rem 0.5rem',
                borderRadius: '4px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                fontSize: '0.9rem',
                background: 'rgba(255, 255, 255, 0.1)',
                color: '#e2e8f0',
                minWidth: '120px',
                maxWidth: '200px',
                backdropFilter: 'blur(5px)'
              }}
            >
              <option value="" style={{ background: '#1e293b', color: '#e2e8f0' }}>All Artists</option>
              {uniqueArtists.map(artist => (
                <option key={artist} value={artist} style={{ background: '#1e293b', color: '#e2e8f0' }}>{artist}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label style={{ fontWeight: '500', fontSize: '0.9rem', color: '#e2e8f0' }}>Album:</label>
            <select
              value={filterAlbum}
              onChange={(e) => setFilterAlbum(e.target.value)}
              style={{
                padding: '0.25rem 0.5rem',
                borderRadius: '4px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                fontSize: '0.9rem',
                background: 'rgba(255, 255, 255, 0.1)',
                color: '#e2e8f0',
                minWidth: '120px',
                maxWidth: '200px',
                backdropFilter: 'blur(5px)'
              }}
            >
              <option value="" style={{ background: '#1e293b', color: '#e2e8f0' }}>All Albums</option>
              {uniqueAlbums.map(album => (
                <option key={album} value={album} style={{ background: '#1e293b', color: '#e2e8f0' }}>{album}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label style={{ fontWeight: '500', fontSize: '0.9rem', color: '#e2e8f0' }}>Genre:</label>
            <select
              value={filterGenre}
              onChange={(e) => setFilterGenre(e.target.value)}
              style={{
                padding: '0.25rem 0.5rem',
                borderRadius: '4px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                fontSize: '0.9rem',
                background: 'rgba(255, 255, 255, 0.1)',
                color: '#e2e8f0',
                minWidth: '120px',
                maxWidth: '200px',
                backdropFilter: 'blur(5px)'
              }}
            >
              <option value="" style={{ background: '#1e293b', color: '#e2e8f0' }}>All Genres</option>
              {uniqueGenres.map(genre => (
                <option key={genre} value={genre} style={{ background: '#1e293b', color: '#e2e8f0' }}>{genre}</option>
              ))}
            </select>
          </div>

          {(filterArtist || filterAlbum || filterGenre) && (
            <button
              onClick={clearAllFilters}
              style={{
                padding: '0.25rem 0.75rem',
                fontSize: '0.8rem',
                fontWeight: '500',
                background: 'rgba(239, 68, 68, 0.8)',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                backdropFilter: 'blur(5px)'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(220, 38, 38, 0.9)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'rgba(239, 68, 68, 0.8)';
              }}
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Results summary */}
      <div style={{
        maxWidth: 'fit-content',
        padding: '0.5rem 1rem',
        background: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '6px',
        fontSize: '0.9rem',
        color: '#94a3b8',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        margin: '0 auto 1rem'
      }}>
        Showing {filteredAndSortedFavorites.length} of {favorites.length} songs
        {(filterArtist || filterAlbum || filterGenre) && (
          <span style={{ fontWeight: '500' }}> (filtered)</span>
        )}
      </div>

      {/* Grid using SongCard */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: 16
      }}>
        {filteredAndSortedFavorites.map(track => {
          const isPending = pendingIds.has(track.track_id);
          const isFav = true;
          const genre = getGenreFromTrack(track);
          const fullReleaseDate = formatFullReleaseDate(track);
          const trackduration = formatDuration(track.durations_ms);

          return (
            <SongCard
              key={track.track_id}
              track={track}
              isPending={isPending}
              isFav={isFav}
              onUnfavorite={handleUnfavorite}
              genre={genre}
              fullReleaseDate={fullReleaseDate}
              trackduration={trackduration}
            />
          );
        })}
      </div>

      {filteredAndSortedFavorites.length === 0 && (filterArtist || filterAlbum || filterGenre) && (
        <div style={{
          textAlign: 'center',
          padding: '2rem',
          color: '#94a3b8',
          fontSize: '1.1rem'
        }}>
          <p>No songs match your current filters.</p>
          <button
            onClick={clearAllFilters}
            style={{
              marginTop: '1rem',
              padding: '0.5rem 1rem',
              fontSize: '0.9rem',
              fontWeight: '500',
              background: 'rgba(59, 130, 246, 0.8)',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              backdropFilter: 'blur(5px)'
            }}
          >
            Clear All Filters
          </button>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
export {}
