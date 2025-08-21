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

  // Generate rating values from 0.5 to 10 in 0.5 increments
  const ratingValues = Array.from({ length: 20 }, (_, i) => (i + 1) * 0.5);

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
        maxWidth: '400px',
        aspectRatio: '2/3',
        backgroundColor: '#23233a',
        color: '#f0f0f0',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '2rem',
        borderRadius: '16px',
        border: 'none',
        margin: '-2rem -2.5rem',
        position: 'relative'
      }}
    >
      <button
        type="button"
        onClick={onSubmitted}
        aria-label="Close"
        style={{
          position: 'absolute',
          top: '-0.8rem',
          right: '-2rem',
          background: 'transparent',
          border: 'none',
          color: '#aaa',
          fontSize: '1.3rem',
          cursor: 'pointer',
          zIndex: 2,
        }}
      >
        &times;
      </button>
      {/* Album info header */}
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h2 style={{
          fontSize: '1.25rem',
          fontWeight: '400',
          letterSpacing: '0.025em',
          marginBottom: '0.5rem',
          color: '#f0f0f0'
        }}>
          {album.collectionName || 'Unknown Album'}
        </h2>
        <p style={{
          fontSize: '0.9rem',
          fontWeight: '300',
          color: '#aaa',
          marginBottom: '1.5rem'
        }}>
          by {album.artistName || 'Unknown Artist'}
        </p>

        {/* Album artwork */}
        {album.artworkUrl100 && (
          <img
            src={album.artworkUrl100.replace('100x100', '200x200')}
            alt={`${album.collectionName} artwork`}
            style={{
              width: '120px',
              height: '120px',
              borderRadius: '8px',
              margin: '0 auto',
              display: 'block',
              objectFit: 'cover'
            }}
          />
        )}
      </div>

      {/* Circular Rating Slider */}
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <span style={{
          fontSize: '1rem',
          fontWeight: '300',
          display: 'block',
          marginBottom: '1.5rem',
          color: '#f0f0f0'
        }}>
          Rate this album
        </span>

        {/* Circular Slider */}
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <svg width="160" height="160" style={{ transform: 'rotate(-90deg)' }}>
            {/* Background circle */}
            <circle
              cx="80"
              cy="80"
              r="60"
              stroke="#2c2c3e"
              strokeWidth="8"
              fill="none"
            />
            {/* Progress circle */}
            <circle
              cx="80"
              cy="80"
              r="60"
              stroke={activeRating > 0 ? getRatingColor(activeRating) : '#2c2c3e'}
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
            fontWeight: '300',
            color: activeRating > 0 ? '#f0f0f0' : '#aaa',
            pointerEvents: 'none'
          }}>
            {activeRating > 0 ? activeRating.toFixed(1) : '0.0'}
          </div>
        </div>
      </div>

      {/* Submit button */}
      <button
        onClick={handleSubmit}
        disabled={rating === 0}
        style={{
          padding: '0.6rem 1.5rem',
          fontSize: '0.9rem',
          fontWeight: '400',
          letterSpacing: '0.025em',
          backgroundColor: rating === 0 ? '#2c2c3e' : '#0077cc',
          color: rating === 0 ? '#aaa' : '#fff',
          cursor: rating === 0 ? 'not-allowed' : 'pointer',
          border: 'none',
          borderRadius: '6px',
          transition: 'all 0.2s ease'
        }}
        onMouseEnter={(e) => {
          if (rating !== 0) {
            e.target.style.backgroundColor = '#005fa3';
          }
        }}
        onMouseLeave={(e) => {
          if (rating !== 0) {
            e.target.style.backgroundColor = '#0077cc';
          }
        }}
      >
        Submit Rating
      </button>

      {/* Listen on Apple Music button */}
      {album.collectionViewUrl && (
        <a
          href={album.collectionViewUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'block',
            margin: '1.2rem auto 0.5rem auto',
            padding: '0.6rem 1.5rem',
            fontSize: '0.9rem',
            fontWeight: '400',
            letterSpacing: '0.025em',
            backgroundColor: '#fa233b',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            textAlign: 'center',
            textDecoration: 'none',
            transition: 'all 0.2s ease',
            cursor: 'pointer',
            width: '100%',
            maxWidth: '260px'
          }}
        >
          Listen on Apple Music
        </a>
      )}

      {/* Update Rating button */}
      <button
        type="button"
        style={{
          alignItems: 'center',
          gap: '0.8rem',
          margin: '0.5rem auto 0',
          padding: '0.6rem 1.2rem',
          backgroundColor: '#23233a',
          color: '#f0f0f0',
          border: '1px solid #444',
          borderRadius: '8px',
          cursor: 'pointer',
          width: '100%',
          maxWidth: '320px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        }}
        onClick={() => {
          // You can add logic here to open the rating update modal, etc.
        }}
      >
        {album.artworkUrl100 && (
          <img
            src={album.artworkUrl100.replace('100x100', '60x60')}
            alt={`${album.collectionName} artwork`}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '6px',
              objectFit: 'cover',
              boxShadow: '0 1px 4px rgba(0,0,0,0.10)'
            }}
          />
        )}
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: '500', fontSize: '1rem', marginBottom: '0.2rem' }}>
            {album.collectionName || 'Unknown Album'}
          </div>
          <div style={{ fontSize: '0.85rem', color: '#aaa', marginBottom: '0.2rem' }}>
            {album.artistName || 'Unknown Artist'}
          </div>
          <div style={{ fontSize: '0.9rem', color: '#10b981', fontWeight: '500' }}>
            Rating: {rating > 0 ? rating.toFixed(1) : 'Not rated'}
          </div>
        </div>
      </button>
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
