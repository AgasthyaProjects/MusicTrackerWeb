import { useState } from 'react';

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

export default function AlbumCard({ album, onOpenSurvey, onRatingClick, isDeleteMode, isSelected, onSelect }) {
  const [showBack, setShowBack] = useState(false);
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleAppleMusicClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    window.open(album.collectionViewUrl, '_blank', 'noopener,noreferrer');
  };

  const handleCardClick = async (e) => {
    if (isDeleteMode) {
      e.preventDefault();
      e.stopPropagation();
      onSelect?.();
      return;
    }

    // Don't flip if clicking on buttons or links
    if (e.target.tagName === 'BUTTON' || e.target.tagName === 'A' || e.target.closest('button') || e.target.closest('a')) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    if (showBack) {
      setShowBack(false);
      return;
    }

    setLoading(true);
    const details = await fetchAlbumDetails(album.collectionId);
    setLoading(false);

    if (details && details.tracks) {
      setTracks(details.tracks);
      setShowBack(true);
    }
  };

  const formatDuration = (milliseconds) => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
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
          marginBottom: 'auto',
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
      </div>

      {/* Fixed position elements at bottom */}
      <div style={{ marginTop: 'auto', paddingTop: '1rem' }}>
        {!isDeleteMode && (
          <a
            href={album.collectionViewUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleAppleMusicClick}
            style={{
              display: 'inline-block', // instead of inline-flex
              marginBottom: '0.75rem',
              fontSize: '0.85rem',
              color: '#60a5fa',
              textDecoration: 'none',
              transition: 'all 0.2s ease',
              fontWeight: '500',
              padding: '0.25rem 0'
            }}

            onMouseEnter={(e) => {
              e.target.style.color = '#93c5fd';
              e.target.style.transform = 'translateX(4px)';
            }}
            onMouseLeave={(e) => {
              e.target.style.color = '#60a5fa';
              e.target.style.transform = 'translateX(0)';
            }}
          >
            Listen on Apple Music
          </a>
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
              if (onOpenSurvey) {
                onOpenSurvey(album);
              }
            }}
            style={{
              display: 'block',
              width: '100%',
              padding: '0.75rem 1rem',
              fontSize: '0.9rem',
              fontWeight: '600',
              borderRadius: '12px',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: album.rating ? '#10b981' : '#3b82f6',
              color: '#fff',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: album.rating ? '0 4px 14px rgba(16, 185, 129, 0.3)' : '0 4px 14px rgba(59, 130, 246, 0.3)'
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
            {album.rating ?
              `⭐ ${album.rating}/10` :
              'Rate Album'
            }
          </button>
        )}
      </div>
    </div>
  );
}