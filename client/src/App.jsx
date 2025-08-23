import { useState, useEffect } from 'react';
import { searchAlbums } from './api/itunes';
import AlbumCard from './components/AlbumCard';
import SurveyForm from './components/SurveyForm';
import './styles/App.css';
import ConfirmPopup from './Popup/ConfirmPopup';

export default function App() {
  const [query, setQuery] = useState('');
  const [albums, setAlbums] = useState([]);
  const [loggedAlbums, setLoggedAlbums] = useState([]);
  const [ratingsMap, setRatingsMap] = useState({});
  const [selectedAlbum, setSelectedAlbum] = useState(null);
  const [showSurvey, setShowSurvey] = useState(false);
  const [activeTab, setActiveTab] = useState('search'); // "search" or "logged"
  const [sortBy, setSortBy] = useState('rating');       // sort field
  const [sortOrder, setSortOrder] = useState('desc');   // "asc" or "desc"
  const [selectedAlbumIds, setSelectedAlbumIds] = useState(new Set()); // for multi-select
  const [isDeleteMode, setIsDeleteMode] = useState(false); // toggle delete mode
  const [showConfirm, setShowConfirm] = useState(false);


  useEffect(() => {
    fetchRatings();
  }, []);



  const fetchRatings = async () => {
    try {
      const res = await fetch('/api/survey/rated');
      const data = await res.json();
      console.log('Ratings fetch response:', data);
      const albums = data.albums || [];
      console.log('Fetched logged albums:', albums);
      setLoggedAlbums(albums);

      // Build ratingsMap using both album names AND IDs as keys for better matching
      const map = {};
      albums.forEach(a => {


        // Use album name as primary key
        map[a.collectionName] = a.rating;
        // Also store by ID as fallback
        map[String(a.collectionId)] = a.rating;

        // Handle potential name variations (trim whitespace, normalize)
        const normalizedName = a.collectionName?.trim();
        if (normalizedName && normalizedName !== a.collectionName) {
          map[normalizedName] = a.rating;
        }
      });

      setRatingsMap(map);
      return map; // Return the map so we can use it immediately
    } catch (err) {
      console.error('Failed to fetch ratings', err);
      return {};
    }
  };

  // ✅ Search and enrich with ratings - try multiple lookup strategies
  const handleSearch = async () => {
    const results = await searchAlbums(query);

    const enriched = results.map((album) => {

      // Try multiple lookup strategies
      let rating = ratingsMap[album.collectionName] ||
        ratingsMap[String(album.collectionId)] ||
        ratingsMap[album.collectionName?.trim()] ||
        null;


      return {
        ...album,
        rating: rating,
      };
    });
    setAlbums(enriched);
    console.log('Enriched search results:', albums)
    setSelectedAlbum(null);
    setShowSurvey(false);
  };

  const handleOpenSurvey = async (album) => {
    let rating = album.rating;
    let logdatetime = album.logdatetime;

    // Always fetch fresh data from backend to get both rating and logdatetime
    try {
      const res = await fetch(`/api/survey/individual/${album.collectionId}`); 
      if (res.ok) {
        const data = await res.json();
        rating = data.rating ?? null;
        logdatetime = data.logdatetime ?? null;
        console.log('Fresh album data:', {
          albumName: album.collectionName,
          rating,
          logdatetime,
          fromDatabase: true
        });
      } else if (res.status === 404) {
        // Album not rated yet
        rating = null;
        logdatetime = null;
      }
    } catch (err) {
      console.error("Failed to fetch album data", err);
      // Keep original values if fetch fails
    }

    setSelectedAlbum({ ...album, rating, logdatetime });
    setShowSurvey(true);
  };
  const handleSurveyClose = async () => {
    if (selectedAlbum) {

      // Refresh ratings from backend and get the updated map
      const updatedRatingsMap = await fetchRatings();

      // Update the albums list with new ratings using the fresh map
      setAlbums((prevAlbums) =>
        prevAlbums.map((album) => {
          if (album.collectionId === selectedAlbum.collectionId) {
            // Try multiple lookup strategies for the updated rating
            const updatedRating = updatedRatingsMap[album.collectionName] ||
              updatedRatingsMap[String(album.collectionId)] ||
              updatedRatingsMap[album.collectionName?.trim()] ||
              null;
            console.log('Updated album rating:', updatedRating, 'for', album.collectionName);

            return { ...album, rating: updatedRating };
          }
          return album;
        }),
      );
    }
    setShowSurvey(false);
    setSelectedAlbum(null);
  };

  // ✅ Handle album selection for deletion
  const handleAlbumSelect = (albumId) => {
    setSelectedAlbumIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(albumId)) {
        newSet.delete(albumId);
      } else {
        newSet.add(albumId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedAlbumIds.size === loggedAlbums.length) {
      setSelectedAlbumIds(new Set()); // Deselect all
    } else {
      setSelectedAlbumIds(new Set(loggedAlbums.map(album => album.collectionId))); // Select all
    }
  };


  const handleDeleteSelected = () => {
    if (selectedAlbumIds.size === 0) return;
    setShowConfirm(true);
  };

  const confirmDelete = async () => {
    try {
      // 1️⃣ Delete all selected albums
      await Promise.all(
        Array.from(selectedAlbumIds).map(albumId =>
          fetch(`/api/survey/${albumId}`, { method: 'DELETE' })
        )
      );
      // 2️⃣ Get fresh ratings map from backend
      const updatedRatingsMap = await fetchRatings();

      setAlbums(prevAlbums =>
        prevAlbums.map(album => {
          console.log(selectedAlbumIds, album.collectionId);
          if (selectedAlbumIds.has(String(album.collectionId))) {

            console.log('Updating rating for deleted album:')
            const updatedRating =
              updatedRatingsMap[album.collectionName] ||
              updatedRatingsMap[String(album.collectionId)] ||
              updatedRatingsMap[album.collectionName?.trim()] ||
              null;
            return { ...album, rating: updatedRating };
          }
          return album;
        })
      );

      // 4️⃣ Clear selections & modes
      setSelectedAlbumIds(new Set());
      setIsDeleteMode(false);

      console.log('Deleted successfully:', Array.from(selectedAlbumIds));

    } catch (err) {
      console.error('Delete failed:', err);
    } finally {
      setShowConfirm(false);
    }
  };





  // ✅ Cancel delete mode
  const handleCancelDelete = () => {
    setSelectedAlbumIds(new Set());
    setIsDeleteMode(false);
  };

  const sortedLoggedAlbums = [...loggedAlbums].sort((a, b) => {
    let compare = 0;
    if (sortBy === 'rating') {
      compare = (a.rating ?? 0) - (b.rating ?? 0);
    } else if (sortBy === 'artist') {
      compare = a.artistName.localeCompare(b.artistName);
    } else if (sortBy === 'album') {
      compare = a.collectionName.localeCompare(b.collectionName);
    } else if (sortBy == 'logdatetime') {
      compare = new Date(a.logdatetime) - new Date(b.logdatetime);
    } else if (sortBy == 'releaseDate') {
      compare = new Date(a.releaseDate) - new Date(b.releaseDate);
    } else if (sortBy == 'trackCount') {
      compare = (a.trackCount ?? 0) - (b.trackCount ?? 0);
    } else if (sortBy == 'genre') {
      compare = (a.genre ?? '').localeCompare(b.genre ?? '');
    }
    return sortOrder === 'asc' ? compare : -compare;
  });

  return (
    <div className="app-container">

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

      {/* Search Tab */}
     {activeTab === 'search' && (
  <section>
    <form
      className="search-bar"
      onSubmit={(e) => {
        e.preventDefault(); // Prevent page reload
        handleSearch();     // Trigger search
      }}
    >
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search for albums..."
      />
      <button className="search-button" type="submit">Search</button>
    </form>

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


      {/* Logged Albums Tab */}
      {activeTab === 'logged' && (
        <section>
          {loggedAlbums.length === 0 ? (
            <p>No albums logged yet.</p>
          ) : (
            <>
              {/* Controls Row */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1.5rem',
                flexWrap: 'wrap',
                gap: '1rem'
              }}>
                {/* Sorting controls */}
                <div className="sort-controls" style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <label htmlFor="sort">Sort by:</label>
                  <select
                    id="sort"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="sort-select"
                  >
                    <option value="rating">Rating</option>
                    <option value="artist">Artist</option>
                    <option value="album">Album</option>
                    <option value="logdatetime">Date Logged</option>
                    <option value="releaseDate">Release Date</option>
                    <option value="trackCount">Track Count</option>
                    <option value="genre">Genre</option>
                  </select>

                  <button
                    className="sort-toggle"
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    aria-label="Toggle sort order"
                  >
                    {sortOrder === 'asc' ? '🔼' : '🔽'}
                  </button>
                </div>

                {/* Delete Mode Controls */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  {!isDeleteMode ? (
                    <button
                      onClick={() => setIsDeleteMode(true)}
                      style={{
                        padding: '0.5rem 1rem',
                        fontSize: '0.9rem',
                        fontWeight: '600',
                        background: '#ef4444',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.background = '#dc2626';
                        e.target.style.transform = 'translateY(-1px)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.background = '#ef4444';
                        e.target.style.transform = 'translateY(0)';
                      }}
                    >
                      🗑️ Delete Albums
                    </button>
                  ) : (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.5rem',
                      background: 'rgba(239, 68, 68, 0.1)',
                      borderRadius: '8px',
                      border: '1px solid rgba(239, 68, 68, 0.3)'
                    }}>
                      <button
                        onClick={handleSelectAll}
                        style={{
                          padding: '0.25rem 0.5rem',
                          fontSize: '0.8rem',
                          fontWeight: '500',
                          background: selectedAlbumIds.size === loggedAlbums.length ? '#3b82f6' : 'transparent',
                          color: selectedAlbumIds.size === loggedAlbums.length ? '#fff' : '#3b82f6',
                          border: '1px solid #3b82f6',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        {selectedAlbumIds.size === loggedAlbums.length ? 'Deselect All' : 'Select All'}
                      </button>

                      <span style={{
                        fontSize: '0.9rem',
                        color: '#64748b',
                        fontWeight: '500'
                      }}>
                        {selectedAlbumIds.size} selected
                      </span>

                      <button
                        onClick={handleDeleteSelected}
                        disabled={selectedAlbumIds.size === 0}
                        style={{
                          padding: '0.25rem 0.75rem',
                          fontSize: '0.8rem',
                          fontWeight: '600',
                          background: selectedAlbumIds.size > 0 ? '#ef4444' : '#6b7280',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: selectedAlbumIds.size > 0 ? 'pointer' : 'not-allowed',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        Delete ({selectedAlbumIds.size})
                      </button>

                      <button
                        onClick={handleCancelDelete}
                        style={{
                          padding: '0.25rem 0.75rem',
                          fontSize: '0.8rem',
                          fontWeight: '500',
                          background: 'transparent',
                          color: '#6b7280',
                          border: '1px solid #6b7280',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="album-grid">
                {sortedLoggedAlbums.map((album) => (
                  <AlbumCard
                    key={album.collectionId}
                    album={{
                      ...album,
                      primaryGenreName: album.genre // map backend field to expected prop
                    }}
                    onOpenSurvey={() => handleOpenSurvey(album)}
                    isDeleteMode={isDeleteMode}
                    isSelected={selectedAlbumIds.has(album.collectionId)}
                    onSelect={() => handleAlbumSelect(album.collectionId)}
                  />
                ))}
              </div>
            </>
          )}
        </section>
      )}

      {showConfirm && (
        <ConfirmPopup
          message={
            selectedAlbumIds.size === 1
              ? 'Are you sure you want to delete this album?'
              : `Are you sure you want to delete these ${selectedAlbumIds.size} albums?`
          }
          onConfirm={confirmDelete}
          onCancel={() => setShowConfirm(false)}
        />
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
          onClick={handleSurveyClose} // 🔴 close if overlay clicked
        >
          <div
            className="modal-content"
            style={{
              borderRadius: '12px',
              minWidth: '320px',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()} // ✅ prevent clicks inside from closing
          >
            <SurveyForm album={selectedAlbum} onSubmitted={handleSurveyClose} />
          </div>
        </div>
      )}

    </div>
  );
}