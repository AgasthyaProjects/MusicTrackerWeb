export default function AlbumCard({ album, onOpenSurvey, onRatingClick }) {
  const handleAppleMusicClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    window.open(album.collectionViewUrl, '_blank', 'noopener,noreferrer');
  };

  // const handleRatingClick = (e) => {
  //   e.preventDefault();
  //   e.stopPropagation();
  //   if (onRatingClick) {
  //     console.log(`Rating clicked for album: ${album.collectionName}`);
  //   }
  // };

  return (
    <div
      className="album-card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        position: 'relative'
      }}
    >
      <img
        src={
          album.artworkUrl100
            ? album.artworkUrl100.replace('100x100', '500x500')
            : '/placeholder.png' // 👈 fallback image in public/ folder
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
        <a
          href={album.collectionViewUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleAppleMusicClick}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
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
          <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>↗</span>
        </a>

        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            //handleRatingClick(e);
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
      </div>
    </div>
  );
}