// SongCard.jsx
import React from 'react';

export default function SongCard({
  track,
  isPending = false,
  isFav = true,
  onUnfavorite,
  genre,
  fullReleaseDate,
  trackduration,
}) {
  // If parent didn't pass these, compute fallback values
  const getGenre = () => {
    return track.genre || 'Unknown';
  };
  const formatFullReleaseDate = () => {
    if (fullReleaseDate) return fullReleaseDate;
    if (!track.release_date) return null;
    const date = new Date(track.release_date);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDuration = (milliseconds) => {
    if (trackduration) return trackduration;
    const ms = milliseconds ?? track.durations_ms;
    if (!ms) return null;
    const seconds = Math.floor(ms / 1000);
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

  const imgUrl = track.artwork_url ? track.artwork_url.replace('100x100', '200x200') : null;

  return (
    <div
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
            {getGenre()}
          </span>
          {formatDuration() && (
            <span style={{
              padding: '4px 8px',
              background: 'rgba(34, 197, 94, 0.2)',
              color: '#4ade80',
              fontSize: 10,
              fontWeight: 500,
              borderRadius: 6,
              border: '1px solid rgba(34, 197, 94, 0.3)'
            }}>
              {formatDuration()}
            </span>
          )}
        </div>
        {formatFullReleaseDate() && (
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
            {formatFullReleaseDate()}
          </span>
        )}
      </div>

      {/* Main content with artwork */}
      <div style={{
        display: 'flex',
        gap: 12,
        flex: 1,
        alignItems: 'center',
        marginBottom: 12
      }}>
        {/* Artwork */}
        <div style={{ flexShrink: 0 }}>
          {imgUrl ? (
            <img
              src={imgUrl}
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

        {/* Track info */}
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

        {/* Right side: favorite and date */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
          flexShrink: 0
        }}>
          <button
            className="track-favorite-star"
            onClick={(e) => onUnfavorite(track, e)}
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
}
