import { useState, useEffect } from 'react';
import { useDragHandlers } from './useDragHandler';

const formatLogDate = (dateString) => {
  if (!dateString) return null;

  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return null;

    return {
      dateString: date.toLocaleDateString(),
      timeString: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  } catch (error) {
    console.error('Error formatting date:', error, dateString);
    return null;
  }
};

export default function SurveyForm({ album = {}, onSubmitted }) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [tracks, setTracks] = useState([]);
  const [loadingTracks, setLoadingTracks] = useState(false);
  const [favoriteSong, setFavoriteSong] = useState('');

  // Initialize drag handlers
  const dragHandlers = useDragHandlers(
    (value) => setRating(value),           // onRatingChange
    (value) => setHoveredRating(value)     // onRatingHover  
  );

  // Fetch album tracks when component mounts
  useEffect(() => {
    const fetchAlbumTracks = async () => {
      if (!album.collectionId) return;

      setLoadingTracks(true);
      try {
        const res = await fetch(
          `https://itunes.apple.com/lookup?id=${album.collectionId}&entity=song`
        );
        const data = await res.json();
        if (data.resultCount > 0) {
          const trackList = data.results.slice(1); // Remove album info, keep only tracks
          setTracks(trackList);
        }
      } catch (err) {
        console.error('Error fetching album tracks:', err);
      } finally {
        setLoadingTracks(false);
      }
    };

    fetchAlbumTracks();
  }, [album.collectionId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      albumId: album.collectionId,
      albumName: album.collectionName,
      artistName: album.artistName,
      artworkUrl100: album.artworkUrl100,
      rating,
      releaseDate: album.releaseDate || null,
      trackCount: album.trackCount || null,
      primaryGenreName: album.primaryGenreName || null,
      favoriteSong: favoriteSong || null, // Add favorite song to payload

    };
    await fetch('/api/survey', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    onSubmitted?.();
  };

  const getRatingColor = (currentRating) => {
    if (currentRating <= 3) return '#ef4444';
    if (currentRating <= 6) return '#f59e0b';
    return '#10b981';
  };

  const activeRating = hoveredRating || rating;

  return (
    <div
      style={{
        width: '100%',
        maxWidth: '420px',
        background: 'rgba(15, 23, 42, 0.98)',
        backdropFilter: 'blur(20px)',
        color: '#e2e8f0',
        display: 'flex',
        flexDirection: 'column',
        padding: '2rem',
        borderRadius: '24px',
        border: '2px solid rgba(96, 165, 250, 0.2)',
        position: 'relative',
        boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(148, 163, 184, 0.1)',
        maxHeight: '90vh',
        overflowY: 'auto'
      }}
    >
      {/* Close Button */}
      <button className='survey-close-btn' onClick={onSubmitted} aria-label='close'>
        &times;
      </button>

      {/* Album Info Header */}
      <div style={{
        textAlign: 'center',
        padding: '1rem 1.25rem'
      }}>
        <h2 style={{
          fontSize: '1.3rem',
          fontWeight: '600',
          letterSpacing: '0.025em',
          marginBottom: '0.5rem',
          color: '#f1f5f9',
          lineHeight: '1.3'
        }}>
          {album.collectionName || 'Unknown Album'}
        </h2>

        <p style={{
          fontSize: '0.95rem',
          fontWeight: '400',
          color: '#94a3b8',
          marginBottom: '1.5rem'
        }}>
          by {album.artistName || 'Unknown Artist'}
        </p>

        {/* Album Artwork */}
        {album.artworkUrl100 && (
          <img
            src={album.artworkUrl100.replace('100x100', '300x300')}
            alt={`${album.collectionName} artwork`}
            style={{
              width: '200px',
              height: '200px',
              borderRadius: '16px',
              margin: '0 auto',
              display: 'block',
              objectFit: 'cover',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 4px 12px rgba(0, 0, 0, 0.3)'
            }}
          />
        )}
      </div>

      {/* Rating Section */}
      <div style={{
        textAlign: 'center',
        marginBottom: '1.5rem',
        padding: '0 1rem'
      }}>
        {/* Instruction Text */}
        <p style={{
          fontSize: '0.85rem',
          color: '#94a3b8',
          marginBottom: '1rem',
          fontWeight: '400'
        }}>
          Click or drag to rate
        </p>

        {/* Circular Slider */}
        <div style={{
          position: 'relative',
          display: 'inline-block',
          marginBottom: '1rem'
        }}>
          <svg width="180" height="180" style={{ transform: 'rotate(-90deg)' }}>
            {/* Background circle */}
            <circle
              cx="90"
              cy="90"
              r="70"
              stroke="rgba(30, 41, 59, 0.8)"
              strokeWidth="8"
              fill="none"
            />
            {/* Progress circle */}
            <circle
              cx="90"
              cy="90"
              r="70"
              stroke={activeRating > 0 ? getRatingColor(activeRating) : 'rgba(30, 41, 59, 0.8)'}
              strokeWidth="8"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 70}
              strokeDashoffset={2 * Math.PI * 70 - (activeRating / 10) * 2 * Math.PI * 70}
              style={{ transition: 'all 0.3s ease' }}
            />
            {/* Interactive overlay for clicks */}
            <circle
              cx="90"
              cy="90"
              r="85"
              stroke="transparent"
              strokeWidth="30"
              fill="none"
              style={{ cursor: 'pointer' }}
              onMouseDown={dragHandlers.startCircularDrag}
              onMouseMove={dragHandlers.handleCircularHover}
              onMouseLeave={dragHandlers.handleRatingLeave}
              onClick={dragHandlers.handleCircularClick}
            />
          </svg>

          {/* Rating display in center */}
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            fontSize: '1.6rem',
            fontWeight: '700',
            color: activeRating > 0 ? '#f1f5f9' : '#64748b',
            pointerEvents: 'none'
          }}>
            {activeRating > 0 ? activeRating.toFixed(1) : '0.0'}
          </div>
        </div>

        {/* Horizontal Slider */}
        <div style={{
          width: '200px',
          margin: '0 auto',
          position: 'relative'
        }}>
          <div 
            data-trackbar
            style={{
              height: '8px',
              background: 'rgba(30, 41, 59, 0.8)',
              borderRadius: '4px',
              position: 'relative',
              cursor: 'pointer'
            }}
            onMouseDown={dragHandlers.startHorizontalDrag}
            onClick={dragHandlers.handleHorizontalClick}
            onMouseMove={dragHandlers.handleHorizontalHover}
            onMouseLeave={dragHandlers.handleRatingLeave}
          >
            {/* Progress bar */}
            <div style={{
              height: '100%',
              width: `${(activeRating / 10) * 100}%`,
              background: activeRating > 0 ? getRatingColor(activeRating) : 'rgba(30, 41, 59, 0.8)',
              borderRadius: '4px',
              transition: 'all 0.3s ease',
              pointerEvents: 'none'
            }} />
            
            {/* Slider thumb */}
            {activeRating > 0 && (
              <div style={{
                position: 'absolute',
                top: '50%',
                left: `${(activeRating / 10) * 100}%`,
                transform: 'translate(-50%, -50%)',
                width: '16px',
                height: '16px',
                background: getRatingColor(activeRating),
                borderRadius: '50%',
                border: '2px solid #f1f5f9',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
                transition: 'all 0.3s ease',
                pointerEvents: 'none'
              }} />
            )}
          </div>
          
          {/* Scale markers */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: '0.5rem',
            fontSize: '0.7rem',
            color: '#64748b'
          }}>
            <span>1</span>
            <span>5</span>
            <span>10</span>
          </div>
        </div>
      </div>

      {/* Favorite Song Dropdown */}
      <div style={{ marginBottom: '2rem' }}>
        <label style={{
          display: 'block',
          fontSize: '1rem',
          fontWeight: '500',
          color: '#e2e8f0',
          marginBottom: '0.75rem',
          textAlign: 'center'
        }}>
          Favorite Song (Optional)
        </label>

        {loadingTracks ? (
          <div style={{
            padding: '1rem',
            textAlign: 'center',
            fontSize: '0.9rem',
            color: '#94a3b8',
            background: 'rgba(30, 41, 59, 0.8)',
            border: '2px solid rgba(148, 163, 184, 0.2)',
            borderRadius: '12px'
          }}>
            Loading tracks...
          </div>
        ) : (
          <select
            value={favoriteSong}
            onChange={(e) => setFavoriteSong(e.target.value)}
            style={{
              width: '100%',
              padding: '1rem',
              fontSize: '0.9rem',
              background: 'rgba(30, 41, 59, 0.8)',
              color: '#e2e8f0',
              border: '2px solid rgba(148, 163, 184, 0.2)',
              borderRadius: '12px',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              outline: 'none',
              appearance: 'none',
              backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6,9 12,15 18,9'%3e%3c/polyline%3e%3c/svg%3e")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 1rem center',
              backgroundSize: '16px',
              paddingRight: '3rem'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#60a5fa';
              e.target.style.boxShadow = '0 0 0 4px rgba(96, 165, 250, 0.1)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'rgba(148, 163, 184, 0.2)';
              e.target.style.boxShadow = 'none';
            }}
          >
            <option value="" style={{ background: '#1e293b', color: '#e2e8f0' }}>
              Select a favorite track...
            </option>
            {tracks.map((track, index) => (
              <option
                key={track.trackId}
                value={track.trackName}
                style={{ background: '#1e293b', color: '#e2e8f0' }}
              >
                {track.trackNumber || index + 1}. {track.trackName}
              </option>
            ))}
          </select>
        )}

        {favoriteSong && (
          <div style={{
            marginTop: '0.75rem',
            padding: '0.75rem',
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            borderRadius: '8px',
            fontSize: '0.85rem',
            color: '#10b981',
            textAlign: 'center'
          }}>
            Favortie Song Selected: {favoriteSong}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={rating === 0}
          style={{
            padding: '0.75rem 2rem',
            fontSize: '1rem',
            fontWeight: '600',
            background: rating === 0 ?
              'rgba(55, 65, 81, 0.8)' :
              'linear-gradient(135deg, #3b82f6, #1d4ed8)',
            color: rating === 0 ? '#9ca3af' : '#fff',
            cursor: rating === 0 ? 'not-allowed' : 'pointer',
            border: 'none',
            borderRadius: '12px',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: rating === 0 ? 'none' : '0 4px 14px rgba(59, 130, 246, 0.3)'
          }}
          onMouseEnter={(e) => {
            if (rating !== 0) {
              e.target.style.background = 'linear-gradient(135deg, #2563eb, #1e40af)';
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 8px 25px rgba(59, 130, 246, 0.4)';
            }
          }}
          onMouseLeave={(e) => {
            if (rating !== 0) {
              e.target.style.background = 'linear-gradient(135deg, #3b82f6, #1d4ed8)';
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 4px 14px rgba(59, 130, 246, 0.3)';
            }
          }}
        >
          Submit Rating
        </button>


        {/* Album Summary Card */}
        <div align="center"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            padding: '1rem',
            background: 'rgba(30, 41, 59, 0.8)',
            border: '1px solid rgba(148, 163, 184, 0.2)',
            borderRadius: '12px',
            marginTop: '0.5rem'
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontWeight: '500',
              fontSize: '1rem',
              marginBottom: '0.15rem',
              color: '#f1f5f9',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {album.collectionName || 'Unknown Album'}
            </div>
            <div style={{
              fontSize: '0.85rem',
              color: '#94a3b8',
              marginBottom: '0.25rem',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {album.artistName || 'Unknown Artist'}
            </div>
            <div style={{
              fontSize: '0.9rem',
              color: rating > 0 ? '#10b981' : '#64748b',
              fontWeight: '500'
            }}>
              {album.rating != null ? (
                <>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: getRatingColor(album.rating) }}>
                    Rating: {album.rating}/10
                  </p>
                  {(() => {
                    const logDateFormatted = formatLogDate(album.logdatetime);
                    return logDateFormatted ? (
                      <div className="date-logged-info">
                        <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8' }}>
                          Logged on: {logDateFormatted.dateString}
                        </p>
                        <p style={{ margin: 0, fontSize: '0.6rem', color: '#94a3b8' }}>
                          {logDateFormatted.timeString}
                        </p>
                      </div>
                    ) : null;
                  })()}
                </>
              ) : (
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8' }}>
                  Rating: Not rated
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}