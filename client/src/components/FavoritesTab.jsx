import React, { useEffect, useState, useMemo } from 'react';

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
      // Artist filter
      if (filterArtist && track.artist_name !== filterArtist) {
        return false;
      }

      // Album filter
      if (filterAlbum && track.album_name !== filterAlbum) {
        return false;
      }

      // Genre filter
      if (filterGenre && getGenreFromTrack(track) !== filterGenre) {
        return false;
      }

      return true;
    });

    // Apply sorting
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

      {/* Controls */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        marginBottom: '1.5rem'
      }}>
        {/* Sorting controls */}
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

        {/* Filter controls */}
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

          {/* Clear filters button */}
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

      {/* Three-column grid */}
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
            <div
              key={track.track_id}
              style={{
                background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 50%, #1e293b 100%)',
                borderRadius: 12,
                padding: 14,
                border: '1px solid #334155',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
                position: 'relative',
                overflow: 'hidden',
                minWidth: 0,
                display: 'flex',
                flexDirection: 'column',
                height: 'auto'
              }}
            >
              {/* Header with genre and year tags */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, gap: 8 }}>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{
                    padding: '4px 8px',
                    background: 'rgba(59, 130, 246, 0.2)',
                    color: '#60a5fa',
                    fontSize: 10,
                    fontWeight: 600,
                    borderRadius: 20,
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    {genre}
                  </span>
                  {trackduration && (
                    <span style={{
                      padding: '4px 8px',
                      background: 'rgba(34, 197, 94, 0.2)',
                      color: '#4ade80',
                      fontSize: 10,
                      fontWeight: 500,
                      borderRadius: 6,
                      border: '1px solid rgba(34, 197, 94, 0.3)'
                    }}>
                      {trackduration}
                    </span>
                  )}
                </div>
                {fullReleaseDate && (
                  <span style={{
                    padding: '4px 8px',
                    background: 'rgba(168, 85, 247, 0.2)',
                    color: '#c084fc',
                    fontSize: 10,
                    fontWeight: 500,
                    borderRadius: 6,
                    border: '1px solid rgba(168, 85, 247, 0.3)',
                    whiteSpace: 'nowrap'
                  }}>
                    {fullReleaseDate}
                  </span>
                )}
              </div>

              {/* Main content with artwork - expanded to fill vertical space */}
              <div style={{ 
                display: 'flex', 
                gap: 12, 
                flex: 1,
                alignItems: 'center',
                marginBottom: 12 
              }}>
                {/* Album artwork */}
                <div style={{ flexShrink: 0 }}>
                  {track.artwork_url ? (
                    <img
                      src={track.artwork_url.replace('100x100', '200x200')}
                      alt={track.album_name}
                      style={{
                        width: 64,
                        height: 64,
                        borderRadius: 8,
                        objectFit: 'cover',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
                        border: '1px solid rgba(255, 255, 255, 0.1)'
                      }}
                    />
                  ) : (
                    <div style={{
                      width: 64,
                      height: 64,
                      background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                      borderRadius: 8,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
                      border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}>
                      <div style={{
                        width: 56,
                        height: 56,
                        background: 'rgba(15, 23, 42, 0.5)',
                        borderRadius: 6,
                        border: '2px solid rgba(255, 255, 255, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <svg style={{ width: 20, height: 20, color: 'rgba(255, 255, 255, 0.7)' }} fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 3a1 1 0 00-1.447-.894L8.763 6H5a3 3 0 000 6h.28l1.771 5.316A1 1 0 008 18h1a1 1 0 001-1v-4.382l6.553 3.276A1 1 0 0018 15V3z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                  )}
                </div>

                {/* Track info - expanded to center vertically */}
                <div style={{ 
                  flex: 1, 
                  minWidth: 0, 
                  display: 'flex', 
                  flexDirection: 'column', 
                  justifyContent: 'center',
                  gap: 6
                }}>
                  <h3 style={{
                    margin: 0,
                    fontSize: 14,
                    fontWeight: 'bold',
                    color: '#ffffff',
                    lineHeight: 1.2,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {track.track_name}
                  </h3>
                  <p style={{
                    margin: 0,
                    color: '#cbd5e1',
                    fontSize: 12,
                    fontWeight: 500,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {track.artist_name}
                  </p>
                  <p style={{
                    margin: 0,
                    color: '#94a3b8',
                    fontSize: 11,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    from <em>{track.album_name}</em>
                  </p>
                </div>

                {/* Right side container for favorite button and date */}
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center',
                  gap: 8,
                  flexShrink: 0 
                }}>
                  {/* Favorite button */}
                  <button
                    className="track-favorite-star"
                    onClick={(e) => handleUnfavorite(track, e)}
                    disabled={isPending}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: isPending ? 'default' : 'pointer',
                      padding: '4px',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.12s ease',
                      fontSize: '16px',
                      width: '24px',
                      height: '24px',
                      color: isFav ? '#ef4444' : '#64748b',
                      transform: isFav ? 'scale(1.1)' : 'scale(1)',
                      opacity: isPending ? 0.6 : 1
                    }}
                    title={isFav ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    {isPending ? '…' : (isFav ? '★' : '☆')}
                  </button>

                  {/* Date favorited - positioned under favorite button */}
                  {track.date_favorited && (
                    <div style={{
                      background: 'rgba(30, 41, 59, 0.6)',
                      padding: '4px 6px',
                      borderRadius: '4px',
                      border: '1px solid rgba(51, 65, 85, 0.4)',
                      textAlign: 'center',
                      minWidth: 'fit-content'
                    }}>
                      <div style={{
                        color: '#64748b',
                        fontSize: '8px',
                        fontWeight: 500,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        marginBottom: '1px'
                      }}>
                        Favorited
                      </div>
                      <div style={{
                        color: '#e2e8f0',
                        fontSize: '9px',
                        fontWeight: 600,
                        whiteSpace: 'nowrap'
                      }}>
                        {new Date(track.date_favorited).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Stats grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {track.listeners && (
                  <div style={{
                    background: 'rgba(15, 23, 42, 0.5)',
                    padding: '8px 10px',
                    borderRadius: 6,
                    border: '1px solid rgba(51, 65, 85, 0.3)'
                  }}>
                    <div style={{
                      color: '#94a3b8',
                      fontSize: 9,
                      fontWeight: 500,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      marginBottom: 2
                    }}>
                      Listeners
                    </div>
                    <div style={{ color: '#ffffff', fontSize: 11, fontWeight: 600 }}>
                      {Number(track.listeners).toLocaleString()}
                    </div>
                  </div>
                )}

                {track.playcount && (
                  <div style={{
                    background: 'rgba(15, 23, 42, 0.5)',
                    padding: '8px 10px',
                    borderRadius: 6,
                    border: '1px solid rgba(51, 65, 85, 0.3)'
                  }}>
                    <div style={{
                      color: '#94a3b8',
                      fontSize: 9,
                      fontWeight: 500,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      marginBottom: 2
                    }}>
                      Plays
                    </div>
                    <div style={{ color: '#ffffff', fontSize: 11, fontWeight: 600 }}>
                      {Number(track.playcount).toLocaleString()}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* No results message */}
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