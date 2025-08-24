import { useState, useEffect } from 'react';

export default function AlbumCard({ album, onOpenSurvey, onRatingClick, isDeleteMode, isSelected, onSelect }) {
  const [showBack, setShowBack] = useState(false);
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const fetchAlbumDetails = async (collectionId) => {
    try {
      const res = await fetch(
        `https://itunes.apple.com/lookup?id=${collectionId}&entity=song`
      );
      const data = await res.json();
      if (data.resultCount > 0) {
        const albumInfo = data.results[0];
        const tracks = data.results.slice(1);
        return { albumInfo, tracks };
      }
      return null;
    } catch (err) {
      console.error('Error fetching album details:', err);
      return null;
    }
  };

  // Fetch album details on component mount
  useEffect(() => {
    const loadAlbumDetails = async () => {
      const details = await fetchAlbumDetails(album.collectionId);
      if (details && details.tracks) {
        setTracks(details.tracks);
      }
      setInitialLoading(false);
    };

    loadAlbumDetails();
  }, [album.collectionId]);

  const handleAppleMusicClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    window.open(album.collectionViewUrl, '_blank', 'noopener,noreferrer');
  };

  // Update the handleCardClick function in your AlbumCard.jsx:

  const handleCardClick = async (e) => {
    if (isDeleteMode) {
      e.preventDefault();
      e.stopPropagation();
      onSelect?.();
      return;
    }

    // Don't flip if clicking on buttons, links, or their children
    if (
      e.target.tagName === 'BUTTON' ||
      e.target.tagName === 'A' ||
      e.target.closest('button') ||
      e.target.closest('a') ||
      e.target.closest('.music-platforms') ||
      e.target.classList.contains('music-platform-btn')
    ) {
      e.preventDefault();
      e.stopPropagation();
      return; // Don't flip the card
    }

    e.preventDefault();
    e.stopPropagation();

    if (showBack) {
      setShowBack(false);
      return;
    }

    // If tracks aren't loaded yet, load them
    if (tracks.length === 0 && !initialLoading) {
      setLoading(true);
      const details = await fetchAlbumDetails(album.collectionId);
      setLoading(false);

      if (details && details.tracks) {
        setTracks(details.tracks);
        setShowBack(true);
      }
    } else if (tracks.length > 0) {
      setShowBack(true);
    }
  };

  const formatDuration = (milliseconds) => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes > 60) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      const songduration = `${hours}h ${mins}m`
      return songduration;
    } else {
      const songduration = `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
      return songduration;
    }
  };

  const getReleaseYear = (releaseDate) => {
    if (!releaseDate) return null;
    try {
      return new Date(releaseDate).getFullYear();
    } catch {
      return null;
    }
  };

  const getTotalAlbumDuration = (tracks) => {
    if (!tracks || tracks.length === 0) return null;
    const totaldur = tracks.reduce((total, track) => total + (track.trackTimeMillis || 0), 0);
    const formatted = formatDuration(totaldur);
    return formatted;
  };
  const handleSpotifyClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Construct Spotify search URL
    const query = encodeURIComponent(`${album.collectionName} ${album.artistName}`);
    window.open(`https://open.spotify.com/search/${query}`, '_blank', 'noopener,noreferrer');
  };

  const handleYouTubeClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Construct YouTube search URL
    const query = encodeURIComponent(`${album.collectionName} ${album.artistName} full album`);
    window.open(`https://www.youtube.com/results?search_query=${query}`, '_blank', 'noopener,noreferrer');
  };

  // Show loading overlay
  if (loading) {
    return (
      <div
        className="album-card"
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          position: 'relative',
          cursor: 'wait',
          transform: isSelected ? 'scale(0.95)' : 'scale(1)',
          opacity: 0.7,
          transition: 'all 0.2s ease',
          border: isSelected ? '2px solid #ef4444' : '2px solid transparent',
          borderRadius: '18px',
          padding: isSelected ? '0.5rem' : '0',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#1e293b'
        }}
      >
        <div style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Loading tracklist...</div>
      </div>
    );
  }

  // Show tracklist (back side)
  if (showBack && tracks.length > 0) {
    return (
      <div
        className="album-card"
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          position: 'relative',
          cursor: 'pointer',
          transform: isSelected ? 'scale(0.95)' : 'scale(1)',
          opacity: isDeleteMode && !isSelected ? 0.6 : 1,
          transition: 'all 0.2s ease',
          border: isSelected ? '2px solid #ef4444' : '2px solid transparent',
          borderRadius: '18px',
          padding: isSelected ? '0.5rem' : '0'
        }}
        onClick={handleCardClick}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            backgroundColor: '#1e293b',
            borderRadius: '16px',
            padding: '1rem',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), 0 2px 8px rgba(0, 0, 0, 0.2)'
          }}
        >
          {/* Header */}
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <h3 style={{
                fontWeight: '700',
                fontSize: '1.1rem',
                color: '#f1f5f9',
                margin: 0,
                flex: 1,
                minWidth: 0
              }}>
                {album.collectionName}
              </h3>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowBack(false);
                }}
                style={{
                  background: 'rgba(148, 163, 184, 0.2)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#94a3b8',
                  fontSize: '16px',
                  flexShrink: 0,
                  marginLeft: '0.5rem',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = 'rgba(148, 163, 184, 0.3)';
                  e.target.style.color = '#f1f5f9';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'rgba(148, 163, 184, 0.2)';
                  e.target.style.color = '#94a3b8';
                }}
              >
                ×
              </button>
            </div>
            <p style={{
              fontSize: '0.9rem',
              color: '#94a3b8',
              margin: 0
            }}>
              {album.artistName}
            </p>
          </div>

          {/* Tracklist */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            marginBottom: '1rem'
          }}>
            {tracks.map((track, index) => (
              <div
                key={track.trackId}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0.5rem 0',
                  borderBottom: index < tracks.length - 1 ? '1px solid rgba(148, 163, 184, 0.1)' : 'none'
                }}
              >
                <span style={{
                  fontSize: '0.8rem',
                  color: '#64748b',
                  minWidth: '2rem',
                  textAlign: 'right',
                  marginRight: '0.75rem'
                }}>
                  {track.trackNumber || index + 1}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    fontSize: '0.85rem',
                    color: '#f1f5f9',
                    margin: 0,
                    fontWeight: '500',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {track.trackName}
                  </p>
                </div>
                {track.trackTimeMillis && (
                  <span style={{
                    fontSize: '0.8rem',
                    color: '#64748b',
                    marginLeft: '0.5rem',
                    flexShrink: 0
                  }}>
                    {formatDuration(track.trackTimeMillis)}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Back to front button */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowBack(false);
            }}
            style={{
              padding: '0.75rem 1rem',
              fontSize: '0.9rem',
              fontWeight: '600',
              borderRadius: '12px',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: '#475569',
              color: '#fff',
              transition: 'all 0.2s ease',
              marginTop: 'auto'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#334155';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = '#475569';
            }}
          >
            ← Back to Album
          </button>
        </div>
      </div>
    );
  }

  // Show front side (default album card)
  return (
    <div
      className="album-card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        position: 'relative',
        cursor: isDeleteMode ? 'pointer' : 'pointer',
        transform: isSelected ? 'scale(0.95)' : 'scale(1)',
        opacity: isDeleteMode && !isSelected ? 0.6 : 1,
        transition: 'all 0.2s ease',
        border: isSelected ? '2px solid #ef4444' : '2px solid transparent',
        borderRadius: '18px',
        padding: isSelected ? '0.5rem' : '0'
      }}
      onClick={handleCardClick}
    >
      {/* Selection Checkbox (only visible in delete mode) */}
      {isDeleteMode && (
        <div
          style={{
            position: 'absolute',
            top: '0.5rem',
            right: '0.5rem',
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            background: isSelected ? '#ef4444' : 'rgba(0, 0, 0, 0.5)',
            border: isSelected ? 'none' : '2px solid #fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onSelect?.();
          }}
        >
          {isSelected && (
            <span style={{ color: '#fff', fontSize: '14px', fontWeight: 'bold' }}>✓</span>
          )}
        </div>
      )}

      <img
        src={
          album.artworkUrl100
            ? album.artworkUrl100.replace('100x100', '500x500')
            : '/placeholder.png'
        }
        alt={album.collectionName}
        style={{
          width: '100%',
          height: 'auto',
          aspectRatio: '1',
          objectFit: 'cover',
          borderRadius: '16px',
          marginBottom: '1rem',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), 0 2px 8px rgba(0, 0, 0, 0.2)',
          transition: 'all 0.3s ease'
        }}
      />

      {/* Content that can vary in height */}
      <div style={{
        textAlign: 'center',
        flex: '1',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0
      }}>
        <h3 style={{
          marginBottom: '0.5rem',
          fontWeight: '700',
          fontSize: '1.1rem',
          lineHeight: '1.3',
          color: '#f1f5f9',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden'
        }}>
          {album.collectionName}
        </h3>

        <p style={{
          marginBottom: '0.75rem',
          fontSize: '0.9rem',
          color: '#94a3b8',
          lineHeight: '1.4',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden'
        }}>
          {album.artistName}
        </p>

        {/* Album Details Section */}
        <div style={{
          alignContent: 'center',
          marginBottom: 'auto',
          paddingBottom: '0.75rem'
        }}>

          {(album.primaryGenreName || getReleaseYear(album.releaseDate) || getTotalAlbumDuration(tracks)) && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center', // Center the tags horizontally
              gap: '0.5rem',
              marginBottom: '0.5rem',
              flexWrap: 'wrap'
            }}>
              {album.primaryGenreName && (
                <span style={{
                  fontSize: '0.75rem',
                  color: '#60a5fa',
                  backgroundColor: 'rgba(96, 165, 250, 0.1)',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '6px',
                  fontWeight: '500',
                  border: '1px solid rgba(96, 165, 250, 0.2)'
                }}>
                  {album.primaryGenreName}
                </span>
              )}
              {getReleaseYear(album.releaseDate) && (
                <span style={{
                  fontSize: '0.75rem',
                  color: '#a78bfa',
                  backgroundColor: 'rgba(167, 139, 250, 0.1)',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '6px',
                  fontWeight: '500',
                  border: '1px solid rgba(167, 139, 250, 0.2)'
                }}>
                  {getReleaseYear(album.releaseDate)}
                </span>
              )}
              {getTotalAlbumDuration(tracks) && (
                <span style={{
                  fontSize: '0.75rem',
                  color: '#34d399',
                  backgroundColor: 'rgba(52, 211, 153, 0.1)',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '6px',
                  fontWeight: '500',
                  border: '1px solid rgba(52, 211, 153, 0.2)'
                }}>
                  {getTotalAlbumDuration(tracks)}
                </span>
              )}
              {initialLoading && (
                <span style={{
                  fontSize: '0.75rem',
                  color: '#64748b',
                  backgroundColor: 'rgba(100, 116, 139, 0.1)',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '6px',
                  fontWeight: '500',
                  border: '1px solid rgba(100, 116, 139, 0.2)'
                }}>
                  Loading...
                </span>
              )}
            </div>
          )}
        </div>


       {album.rating && album.favoriteSong && (
  <div style={{
    marginTop: '0.75rem',
    marginLeft: 'auto',
    marginRight: 'auto',
    padding: '0.75rem',
    display: 'block',
    background: 'rgba(245, 158, 11, 0.1)',
    border: '1px solid rgba(245, 158, 11, 0.2)',
    borderRadius: '10px',
    position: 'relative',
    width: 'fit-content',
    minWidth: 'auto',
    maxWidth: '300px', // Set a reasonable max width to trigger wrapping
    flex: 'none'
  }}>
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'auto 1fr',
      alignItems: 'center',
      gap: '0.5rem',
      width: 'fit-content'
    }}>
      <span style={{
        fontSize: '0.8rem',
        color: '#f59e0b',
        fontWeight: '600',
        whiteSpace: 'nowrap'
      }}>
        Favorite Song:
      </span>
      <span style={{
        fontSize: '0.8rem',
        color: '#f1f5f9',
        fontWeight: '500',
        wordBreak: 'break-word', // Allow long words to break
        lineHeight: '1.2' // Adjust line height for better readability
      }}>
        {album.favoriteSong}
      </span>
    </div>
  </div>
)}
      </div>


      {/* Fixed position elements at bottom */}
      <div style={{ marginTop: 'auto', paddingTop: '1rem' }}>
        {!isDeleteMode && (
          <div className="music-platforms">
            <button className="music-platform-btn apple-music-btn" onClick={handleAppleMusicClick}>
              <img src="/applelogo.png" alt="Apple Music" />
            </button>

            <button className="music-platform-btn spotify-btn" onClick={handleSpotifyClick}>
              <img src="/spotify-icon.png" alt="Spotify" />
            </button>

            <button className="music-platform-btn youtube-btn" onClick={handleYouTubeClick}>
              <img src="/youtube-icon.png" alt="YouTube" />
            </button>
          </div>
        )}





        {isDeleteMode ? (
          <div
            style={{
              display: 'block',
              width: '100%',
              padding: '0.75rem 1rem',
              fontSize: '0.9rem',
              fontWeight: '600',
              borderRadius: '12px',
              border: '2px dashed #ef4444',
              backgroundColor: isSelected ? 'rgba(239, 68, 68, 0.1)' : 'rgba(107, 114, 128, 0.1)',
              color: isSelected ? '#ef4444' : '#6b7280',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onSelect?.();
            }}
          >
            {isSelected ? '✓ Selected for Deletion' : 'Click to Select'}
          </div>
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('Rate button clicked!'); // Add this for debugging
              if (onOpenSurvey) {
                onOpenSurvey(album);
              }
            }}
            style={{
              display: 'block',
              width: 'calc(100% - 1rem)',
              margin: '0 auto',
              padding: '0.875rem 1.25rem',
              fontSize: '0.9rem',
              fontWeight: '600',
              borderRadius: '16px',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: album.rating ? '#10b981' : '#3b82f6',
              color: '#fff',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: album.rating ? '0 4px 14px rgba(16, 185, 129, 0.3)' : '0 4px 14px rgba(59, 130, 246, 0.3)',
              zIndex: 10, // Ensure button is above other elements
              position: 'relative' // Ensure proper stacking context
            }}
            onMouseEnter={(e) => {
              if (album.rating) {
                e.target.style.backgroundColor = '#059669';
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 8px 25px rgba(16, 185, 129, 0.4)';
              } else {
                e.target.style.backgroundColor = '#2563eb';
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 8px 25px rgba(59, 130, 246, 0.4)';
              }
            }}
            onMouseLeave={(e) => {
              if (album.rating) {
                e.target.style.backgroundColor = '#10b981';
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 4px 14px rgba(16, 185, 129, 0.3)';
              } else {
                e.target.style.backgroundColor = '#3b82f6';
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 4px 14px rgba(59, 130, 246, 0.3)';
              }
            }}
          >
            {album.rating ? `⭐ ${album.rating}/10` : 'Rate Album'}
          </button>
        )}
      </div>
    </div>
  );
}