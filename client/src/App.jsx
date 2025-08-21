import { useState } from 'react';
import { searchAlbums } from './api/itunes';
import AlbumCard from './components/AlbumCard';
import SurveyForm from './components/SurveyForm';
import './styles/App.css';

export default function App() {
  const [query, setQuery] = useState('');
  const [albums, setAlbums] = useState([]);
  const [selectedAlbum, setSelectedAlbum] = useState(null);
  const [showSurvey, setShowSurvey] = useState(false);

  const handleSearch = async () => {
    const results = await searchAlbums(query);

    // Fetch rated album IDs from backend
    const ratedRes = await fetch('/api/survey/rated');
    const ratedData = await ratedRes.json();
    const ratedAlbumIds = ratedData.ratedAlbumIds || [];

    // Only fetch rating for albums that exist in DB
    const albumsWithRatings = await Promise.all(
      results.map(async (album) => {
        let rating = null;
        if (ratedAlbumIds.includes(String(album.collectionId))) {
          const res = await fetch(`/api/survey/${album.collectionId}`);
          const data = await res.json();
          rating = data.rating;
        }
        return { ...album, rating };
      })
    );
    setAlbums(albumsWithRatings);
    setSelectedAlbum(null);
    setShowSurvey(false);
  };

  const handleAppleMusicClick = (album) => {
    setSelectedAlbum(album);
    setShowSurvey(true);
  };

  const handleSurveyClose = async () => {
    if (selectedAlbum) {
      const updatedRating = await fetchAlbumRating(selectedAlbum.collectionId);
      setAlbums((prevAlbums) =>
        prevAlbums.map((album) =>
          album.collectionId === selectedAlbum.collectionId
            ? { ...album, rating: updatedRating }
            : album
        )
      );
    }
    setShowSurvey(false);
    setSelectedAlbum(null);
  };

  const fetchAlbumRating = async (albumId) => {
    try {
      console.log(`/api/survey/${albumId}`);
      const res = await fetch(`/api/survey/${albumId}`);
      const data = await res.json();
      return data.rating;
    } catch {
      return null;
    }
  };

  return (
    <div className="app-container">
      <h1>🎵 iTunes Album Explorer</h1>

      <div className="search-bar">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for albums..."
        />
        <button onClick={handleSearch}>Search</button>
      </div>

      <div className="album-grid">
        {albums.map((album) => (
          <AlbumCard
            key={album.collectionId}
            album={album}
            onAppleMusicClick={() => handleAppleMusicClick(album)}
          />
        ))}
      </div>

      {showSurvey && selectedAlbum && (
        <div className="modal-overlay" style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="modal-content" style={{
            borderRadius: '8px',
            minWidth: '320px',
            position: 'relative'
          }}>
            <button
              onClick={handleSurveyClose}
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                background: 'transparent',
                border: 'none',
                fontSize: '1.5rem',
                cursor: 'pointer'
              }}
              aria-label="Close"
            >
              &times;
            </button>
            {showSurvey && selectedAlbum && (
              <SurveyForm
                album={selectedAlbum}
                onSubmitted={handleSurveyClose}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
