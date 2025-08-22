import { useState, useEffect } from 'react';

export default function SurveyForm({ album = {}, onSubmitted }) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);

  useEffect(() => {
    setRating(0);
  }, [album]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      albumId: album.collectionId,
      albumName: album.collectionName,
      artistName: album.artistName,
      rating,
    };
    await fetch('/api/survey', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    onSubmitted?.();
  };

  const handleRatingClick = (value) => {
    setRating(value);
  };

  const handleRatingHover = (value) => {
    setHoveredRating(value);
  };

  const handleRatingLeave = () => {
    setHoveredRating(0);
  };

  const getRatingColor = (currentRating) => {
    if (currentRating <= 3) return '#ef4444'; // red for low ratings
    if (currentRating <= 6) return '#f59e0b'; // yellow for medium ratings
    return '#10b981'; // green for high ratings
  };

  const activeRating = hoveredRating || rating;
  const circumference = 2 * Math.PI * 60; // radius of 60
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (activeRating / 10) * circumference;

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
      <button
        type="button"
        onClick={onSubmitted}
        aria-label="Close"
        style={{
          position: 'absolute',
          top: '1rem',
          right: '1rem',
          background: 'rgba(239, 68, 68, 0.1)',
          border: 'none',
          color: '#94a3b8',
          fontSize: '1.5rem',
          cursor: 'pointer',
          zIndex: 10,
          width: '2.5rem',
          height: '2.5rem',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s ease'
        }}
        onMouseEnter={(e) => {
          e.target.style.color = '#f1f5f9';
          e.target.style.background = 'rgba(239, 68, 68, 0.3)';
          e.target.style.transform = 'scale(1.1)';
        }}
        onMouseLeave={(e) => {
          e.target.style.color = '#94a3b8';
          e.target.style.background = 'rgba(239, 68, 68, 0.1)';
          e.target.style.transform = 'scale(1)';
        }}
      >
        ×
      </button>

      {/* Album Info Header */}
      <div style={{ 
        textAlign: 'center', 
        marginBottom: '2rem', 
        marginTop: '1rem' 
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
            src={album.artworkUrl100.replace('100x100', '200x200')}
            alt={`${album.collectionName} artwork`}
            style={{
              width: '140px',
              height: '140px',
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
        marginBottom: '2rem' 
      }}>
        <span style={{
          fontSize: '1rem',
          fontWeight: '500',
          display: 'block',
          marginBottom: '1.5rem',
          color: '#e2e8f0'
        }}>
          Rate this album
        </span>

        {/* Circular Slider */}
        <div style={{ 
          position: 'relative', 
          display: 'inline-block',
          marginBottom: '1rem'
        }}>
          <svg width="160" height="160" style={{ transform: 'rotate(-90deg)' }}>
            {/* Background circle */}
            <circle
              cx="80"
              cy="80"
              r="60"
              stroke="rgba(30, 41, 59, 0.8)"
              strokeWidth="8"
              fill="none"
            />
            {/* Progress circle */}
            <circle
              cx="80"
              cy="80"
              r="60"
              stroke={activeRating > 0 ? getRatingColor(activeRating) : 'rgba(30, 41, 59, 0.8)'}
              strokeWidth="8"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              style={{ transition: 'all 0.3s ease' }}
            />
            {/* Interactive overlay for clicks */}
            <circle
              cx="80"
              cy="80"
              r="60"
              stroke="transparent"
              strokeWidth="20"
              fill="none"
              style={{ cursor: 'pointer' }}
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;
                const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
                let normalizedAngle = (angle + Math.PI / 2) / (2 * Math.PI);
                if (normalizedAngle < 0) normalizedAngle += 1;
                const value = Math.max(0.5, Math.min(10, normalizedAngle * 10));
                const roundedValue = Math.round(value * 2) / 2; // Round to nearest 0.5
                handleRatingHover(roundedValue);
              }}
              onMouseLeave={handleRatingLeave}
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;
                const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
                let normalizedAngle = (angle + Math.PI / 2) / (2 * Math.PI);
                if (normalizedAngle < 0) normalizedAngle += 1;
                const value = Math.max(0.5, Math.min(10, normalizedAngle * 10));
                const roundedValue = Math.round(value * 2) / 2; // Round to nearest 0.5
                handleRatingClick(roundedValue);
              }}
            />
          </svg>

          {/* Rating display in center */}
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            fontSize: '1.5rem',
            fontWeight: '600',
            color: activeRating > 0 ? '#f1f5f9' : '#64748b',
            pointerEvents: 'none'
          }}>
            {activeRating > 0 ? activeRating.toFixed(1) : '0.0'}
          </div>
        </div>
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

        {/* Apple Music Button */}
        {album.collectionViewUrl && (
          <a
            href={album.collectionViewUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'block',
              padding: '0.75rem 2rem',
              fontSize: '1rem',
              fontWeight: '600',
              background: 'linear-gradient(135deg, #fa233b, #d91e36)',
              color: '#fff',
              border: 'none',
              borderRadius: '12px',
              textAlign: 'center',
              textDecoration: 'none',
              transition: 'all 0.3s ease',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(250, 35, 59, 0.3)'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'linear-gradient(135deg, #d91e36, #b91c3c)';
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 8px 25px rgba(250, 35, 59, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'linear-gradient(135deg, #fa233b, #d91e36)';
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 4px 14px rgba(250, 35, 59, 0.3)';
            }}
          >
            Listen on Apple Music
          </a>
        )}

        {/* Album Summary Card */}
        <div
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
          {album.artworkUrl100 && (
            <img
              src={album.artworkUrl100.replace('100x100', '60x60')}
              alt={`${album.collectionName} artwork`}
              style={{
                width: '50px',
                height: '50px',
                borderRadius: '8px',
                objectFit: 'cover',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)'
              }}
            />
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ 
              fontWeight: '500', 
              fontSize: '1rem', 
              marginBottom: '0.25rem',
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
              Rating: {rating > 0 ? `${rating.toFixed(1)}/10` : 'Not rated'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Example: After rating is submitted
async function refreshAlbumRating(albumId) {
  const res = await fetch(`/api/survey/${albumId}`);
  const data = await res.json();
  // Update your album state with the new rating
  // e.g., setAlbum({ ...album, rating: data.rating });
}