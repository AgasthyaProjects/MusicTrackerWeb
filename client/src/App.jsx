import { useState, useEffect } from 'react';
import { searchAlbums } from './api/itunes';
import AlbumCard from './components/AlbumCard';
import SurveyForm from './components/SurveyForm';
import './styles/App.css';

export default function App() {
  const [query, setQuery] = useState('');
  const [albums, setAlbums] = useState([]);
  const [loggedAlbums, setLoggedAlbums] = useState([]);
  const [selectedAlbum, setSelectedAlbum] = useState(null);
  const [showSurvey, setShowSurvey] = useState(false);
  const [activeTab, setActiveTab] = useState('search'); // "search" or "logged"

  useEffect(() => {
    fetchLoggedAlbums();
  }, []);

  const fetchLoggedAlbums = async () => {
  try {
    const res = await fetch('/api/survey/rated');
    const data = await res.json();
    setLoggedAlbums(data.albums || []);
  } catch (err) {
    console.error('Failed to fetch logged albums', err);
  }
};


  const handleSearch = async () => {
    const results = await searchAlbums(query);

    const ratedRes = await fetch('/api/survey/rated');
    const ratedData = await ratedRes.json();
    const ratedAlbumIds = ratedData.ratedAlbumIds || [];

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

  const handleOpenSurvey = (album) => {
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
      await fetchLoggedAlbums();
    }
    setShowSurvey(false);
    setSelectedAlbum(null);
  };

  const fetchAlbumRating = async (albumId) => {
    try {
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

      {/* Tab Buttons */}
      <div className="tab-buttons">
        <button
          onClick={() => setActiveTab('search')}
          className={`tab-button ${activeTab === 'search' ? 'active' : ''}`}
        >
          Search & Rate
        </button>
        <button
          onClick={() => setActiveTab('logged')}
          className={`tab-button ${activeTab === 'logged' ? 'active' : ''}`}
        >
          Logged Albums
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'search' && (
        <section>
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
                onOpenSurvey={() => handleOpenSurvey(album)}
              />
            ))}
          </div>
        </section>
      )}

      {activeTab === 'logged' && (
        <section>
          {loggedAlbums.length === 0 ? (
            <p>No albums logged yet.</p>
          ) : (
            <div className="album-grid">
              {loggedAlbums.map((album) => (
                <AlbumCard
                  key={album.collectionId}
                  album={album}
                  onOpenSurvey={() => handleOpenSurvey(album)}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Survey Modal */}
      {showSurvey && selectedAlbum && (
        <div
          className="modal-overlay"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div
            className="modal-content"
            style={{
              borderRadius: '8px',
              minWidth: '320px',
              position: 'relative',
            }}
          >
            <button
              onClick={handleSurveyClose}
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                background: 'transparent',
                border: 'none',
                fontSize: '1.5rem',
                cursor: 'pointer',
              }}
              aria-label="Close"
            >
              &times;
            </button>
            {showSurvey && selectedAlbum && (
              <SurveyForm album={selectedAlbum} onSubmitted={handleSurveyClose} />
            )}
          </div>
        </div>
      )}
    </div>
  );

}
