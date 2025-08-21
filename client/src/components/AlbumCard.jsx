export default function AlbumCard({ album, onAppleMusicClick }) {
  return (
    <div className="album-card">
      <img src={album.artworkUrl100} alt={album.collectionName} />
      <h3>{album.collectionName}</h3>
      <p>{album.artistName}</p>

      <a
        href={album.collectionViewUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => {
          e.preventDefault();
          onAppleMusicClick?.();
          window.open(album.collectionViewUrl, '_blank');
        }}
        style={{ color: '#007aff', textDecoration: 'underline' }}
      >
        Listen on Apple Music
      </a>

      <button
        type="button"
        disabled={!album.rating}
        style={{
          marginTop: '0.8rem',
          padding: '0.5rem 1.2rem',
          fontSize: '0.95rem',
          fontWeight: '500',
          borderRadius: '6px',
          border: 'none',
          cursor: album.rating ? 'pointer' : 'not-allowed',
          backgroundColor: album.rating ? '#10b981' : '#444',
          color: album.rating ? '#fff' : '#aaa',
          transition: 'all 0.2s ease'
        }}
      >
        {album.rating ? 'See Current Rating' : 'No Rating'}
      </button>
    </div>
  );
}
