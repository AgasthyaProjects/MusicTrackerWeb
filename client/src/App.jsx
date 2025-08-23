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
  const [hoveredRating, setHoveredRating] = useState(null);
  const [clickedRating, setClickedRating] = useState(null); // persist selection on click


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
        <button
          onClick={() => setActiveTab('stats')}
          className={`tab-button ${activeTab === 'stats' ? 'active' : ''}`}
        >
          Stats
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

      {/* Stats Tab */}
      {/* Stats Tab */}
      {activeTab === 'stats' && (
        <section>
          <h2>Statistics</h2>
          {loggedAlbums.length === 0 ? (
            <p>No albums logged yet. Start rating some albums to see statistics!</p>
          ) : (
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
              <div style={{
                background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
                padding: '2rem',
                borderRadius: '20px',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                marginBottom: '2rem',
                border: '1px solid rgba(148, 163, 184, 0.2)'
              }}>
                <h3 style={{
                  marginBottom: '1.5rem',
                  color: '#f8fafc',
                  fontSize: '1.5rem',
                  fontWeight: '600',
                  textShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}>
                  Albums by Rating
                </h3>

                {/* Interactive Chart Layout */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 350px',
                  gap: '2rem',
                  minHeight: '400px'
                }}>

                  {/* Bar Chart - Left Side */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    background: 'rgba(15, 23, 42, 0.6)',
                    borderRadius: '16px',
                    padding: '1.5rem',
                    boxShadow: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
                    border: '1px solid rgba(71, 85, 105, 0.3)',
                    backdropFilter: 'blur(10px)'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'end',
                      gap: '0.25rem',
                      height: '300px',
                      padding: '1rem 0',
                      overflowX: 'auto',
                      overflowY: 'visible'
                    }}>
                      {Array.from({ length: 20 }, (_, i) => (i + 1) * 0.5).map(rating => {
                        const albumsAtRating = loggedAlbums.filter(album => album.rating === rating);
                        const count = albumsAtRating.length;
                        const allRatings = Array.from({ length: 20 }, (_, i) => (i + 1) * 0.5);
                        const maxCount = Math.max(...allRatings.map(r =>
                          loggedAlbums.filter(album => album.rating === r).length
                        ));
                        const height = maxCount > 0 ? (count / maxCount) * 200 : 0;
                        const isHovered = hoveredRating === rating;
                        const isClicked = clickedRating === rating;
                        const isActive = isHovered || isClicked;

                        // Color gradient from red to green based on rating
                        const getColor = (rating) => {
                          if (rating <= 2) return ['#ef4444', '#dc2626']; // Red
                          if (rating <= 4) return ['#f97316', '#ea580c']; // Orange
                          if (rating <= 6) return ['#eab308', '#ca8a04']; // Yellow
                          if (rating <= 8) return ['#22c55e', '#16a34a']; // Light Green
                          return ['#10b981', '#059669']; // Green
                        };

                        const [color1, color2] = getColor(rating);

                        return (
                          <div key={rating} style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            minWidth: '32px',
                            position: 'relative'
                          }}>
                            {/* Count label on top */}
                            <div style={{
                              fontSize: '0.8rem',
                              fontWeight: '600',
                              color: '#e2e8f0',
                              marginBottom: '0.25rem',
                              minHeight: '1rem'
                            }}>
                              {count > 0 ? count : ''}
                            </div>


                            {/* Bar */}
                            <div
                              style={{
                                width: '100%',
                                height: `${height}px`,
                                background: `linear-gradient(135deg, ${color1}, ${color2})`,
                                borderRadius: '4px 4px 0 0',
                                transition: 'all 0.3s ease',
                                cursor: count > 0 ? 'pointer' : 'default',
                                boxShadow: height > 0 ? (isActive ? '0 4px 12px rgba(0,0,0,0.25)' : '0 2px 4px rgba(0,0,0,0.15)') : 'none',
                                minHeight: '2px',
                                transform: isActive ? 'scale(1.05)' : 'scale(1)',
                                opacity: count === 0 ? 0.3 : ((hoveredRating === null && clickedRating === null) || isActive ? 1 : 0.6),
                                border: isClicked ? '2px solid #3b82f6' : 'none'
                              }}
                              onMouseEnter={() => count > 0 && setHoveredRating(rating)}
                              onMouseLeave={() => setHoveredRating(null)}
                              onClick={() => count > 0 && setClickedRating(clickedRating === rating ? null : rating)}
                            />

                            {/* Rating label */}
                            <div style={{
                              fontSize: '0.7rem',
                              fontWeight: '500',
                              color: isClicked ? '#60a5fa' : '#cbd5e1',
                              marginTop: '0.5rem',
                              transform: 'rotate(-45deg)',
                              transformOrigin: 'center',
                              whiteSpace: 'nowrap'
                            }}>
                              {rating}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Album Details - Right Side */}
                  <div style={{
                    background: 'rgba(15, 23, 42, 0.6)',
                    borderRadius: '16px',
                    padding: '1.5rem',
                    boxShadow: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
                    border: '1px solid rgba(71, 85, 105, 0.3)',
                    backdropFilter: 'blur(10px)'
                  }}>
                    {(hoveredRating === null && clickedRating === null) ? (
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '100%',
                        color: '#94a3b8',
                        textAlign: 'center'
                      }}>
                        <div style={{
                          fontSize: '3rem',
                          marginBottom: '1rem',
                          opacity: 0.7
                        }}>
                          📊
                        </div>
                        <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: '500', color: '#e2e8f0' }}>
                          Hover or click a bar
                        </p>
                        <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem' }}>
                          Click to keep the list persistent
                        </p>
                      </div>
                    ) : (
                      <div>
                        {(() => {
                          const displayRating = clickedRating || hoveredRating;
                          return (
                            <>
                              <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: '1rem'
                              }}>
                                <h4 style={{
                                  margin: 0,
                                  color: '#f8fafc',
                                  fontSize: '1.2rem',
                                  fontWeight: '600',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.5rem'
                                }}>
                                  Rating {displayRating} ⭐
                                  <span style={{
                                    fontSize: '0.9rem',
                                    fontWeight: '400',
                                    color: '#94a3b8'
                                  }}>
                                    ({loggedAlbums.filter(album => album.rating === displayRating).length} albums)
                                  </span>
                                </h4>
                                {clickedRating && (
                                  <button
                                    onClick={() => setClickedRating(null)}
                                    style={{
                                      background: 'rgba(71, 85, 105, 0.4)',
                                      border: 'none',
                                      fontSize: '1.2rem',
                                      cursor: 'pointer',
                                      color: '#94a3b8',
                                      padding: '0.4rem',
                                      borderRadius: '6px',
                                      transition: 'all 0.2s ease'
                                    }}
                                    onMouseEnter={(e) => {
                                      e.target.style.background = 'rgba(71, 85, 105, 0.6)';
                                      e.target.style.color = '#e2e8f0';
                                    }}
                                    onMouseLeave={(e) => {
                                      e.target.style.background = 'rgba(71, 85, 105, 0.4)';
                                      e.target.style.color = '#94a3b8';
                                    }}
                                    title="Close album list"
                                  >
                                    ✕
                                  </button>
                                )}
                              </div>

                              <div style={{
                                maxHeight: '280px',
                                overflowY: 'auto',
                                paddingRight: '0.5rem'
                              }}>
                                {loggedAlbums
                                  .filter(album => album.rating === displayRating)
                                  .sort((a, b) => a.collectionName.localeCompare(b.collectionName))
                                  .map((album, index) => (
                                    <div key={album.collectionId} style={{
                                      padding: '0.75rem',
                                      background: 'rgba(30, 41, 59, 0.4)',
                                      borderRadius: '10px',
                                      marginBottom: '0.5rem',
                                      border: '1px solid rgba(71, 85, 105, 0.3)',
                                      transition: 'all 0.2s ease',
                                      backdropFilter: 'blur(5px)'
                                    }}>
                                      <div style={{
                                        fontWeight: '600',
                                        color: '#f8fafc',
                                        fontSize: '0.95rem',
                                        marginBottom: '0.25rem',
                                        lineHeight: '1.4'
                                      }}>
                                        {album.collectionName}
                                      </div>
                                      <div style={{
                                        color: '#cbd5e1',
                                        fontSize: '0.85rem',
                                        fontStyle: 'italic'
                                      }}>
                                        by {album.artistName}
                                      </div>
                                      {album.genre && (
                                        <div style={{
                                          color: '#94a3b8',
                                          fontSize: '0.75rem',
                                          marginTop: '0.25rem'
                                        }}>
                                          {album.genre}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                </div>

                {/* Summary Stats */}
                <div style={{
                  marginTop: '2rem',
                  padding: '2rem',
                  background: 'rgba(15, 23, 42, 0.6)',
                  borderRadius: '16px',
                  boxShadow: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
                  border: '1px solid rgba(71, 85, 105, 0.3)',
                  backdropFilter: 'blur(10px)',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                  gap: '1.5rem'
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', fontWeight: '700', color: '#f8fafc' }}>
                      {loggedAlbums.length}
                    </div>
                    <div style={{ color: '#94a3b8', fontWeight: '500', fontSize: '0.85rem' }}>Total Albums</div>
                  </div>

                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', fontWeight: '700', color: '#f8fafc' }}>
                      {loggedAlbums.length > 0 ?
                        (loggedAlbums.reduce((sum, album) => sum + (album.rating || 0), 0) / loggedAlbums.length).toFixed(1)
                        : '0.0'
                      }
                    </div>
                    <div style={{ color: '#94a3b8', fontWeight: '500', fontSize: '0.85rem' }}>Average Rating</div>
                  </div>

                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', fontWeight: '700', color: '#f8fafc' }}>
                      {loggedAlbums.filter(album => album.rating == 10).length}
                    </div>
                    <div style={{ color: '#94a3b8', fontWeight: '500', fontSize: '0.85rem' }}>Perfect Albums</div>
                  </div>

                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', fontWeight: '700', color: '#f8fafc' }}>
                      {(() => {
                        const artists = [...new Set(loggedAlbums.map(album => album.artistName))];
                        return artists.length;
                      })()}
                    </div>
                    <div style={{ color: '#94a3b8', fontWeight: '500', fontSize: '0.85rem' }}>Unique Artists</div>
                  </div>
                </div>
              </div>

              {/* Top Artists Leaderboard - Separate Section */}
              <div style={{
                background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
                padding: '2rem',
                borderRadius: '20px',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                border: '1px solid rgba(148, 163, 184, 0.2)'
              }}>
                <h3 style={{
                  margin: '0 0 1.5rem 0',
                  color: '#f8fafc',
                  fontSize: '1.5rem',
                  fontWeight: '600',
                  textAlign: 'center',
                  textShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}>
                  🏆 Top 5 Artists by Album Count
                </h3>

                <div style={{
                  background: 'rgba(15, 23, 42, 0.6)',
                  borderRadius: '16px',
                  padding: '1.5rem',
                  boxShadow: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
                  border: '1px solid rgba(71, 85, 105, 0.3)',
                  backdropFilter: 'blur(10px)'
                }}>
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem'
                  }}>
                    {(() => {
                      if (loggedAlbums.length === 0) {
                        return (
                          <div style={{
                            textAlign: 'center',
                            color: '#94a3b8',
                            fontSize: '0.9rem',
                            fontStyle: 'italic',
                            padding: '2rem'
                          }}>
                            No artists to display yet. Start rating some albums!
                          </div>
                        );
                      }

                      // Group albums by artist
                      const artistStats = {};
                      loggedAlbums.forEach(album => {
                        if (!artistStats[album.artistName]) {
                          artistStats[album.artistName] = {
                            albumCount: 0,
                            totalRating: 0,
                            albums: []
                          };
                        }
                        artistStats[album.artistName].albumCount += 1;
                        artistStats[album.artistName].totalRating += album.rating || 0;
                        artistStats[album.artistName].albums.push(album);
                      });

                      // Sort by album count and take top 5
                      const topArtists = Object.entries(artistStats)
                        .map(([name, stats]) => ({
                          name,
                          albumCount: stats.albumCount,
                          averageRating: stats.albumCount > 0 ? (stats.totalRating / stats.albumCount).toFixed(1) : '0.0',
                          albums: stats.albums
                        }))
                        .sort((a, b) => b.albumCount - a.albumCount)
                        .slice(0, 5);

                      return topArtists.map((artist, index) => (
                        <div key={artist.name} style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '1rem',
                          background: 'rgba(30, 41, 59, 0.4)',
                          borderRadius: '12px',
                          border: '1px solid rgba(71, 85, 105, 0.3)',
                          backdropFilter: 'blur(5px)',
                          transition: 'all 0.2s ease'
                        }}>
                          {/* Rank */}
                          <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            background: index === 0 ? 'linear-gradient(135deg, #fbbf24, #f59e0b)' :
                              index === 1 ? 'linear-gradient(135deg, #9ca3af, #6b7280)' :
                                index === 2 ? 'linear-gradient(135deg, #d97706, #b45309)' :
                                  'linear-gradient(135deg, #475569, #334155)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.1rem',
                            fontWeight: '700',
                            color: '#fff',
                            marginRight: '1rem',
                            flexShrink: 0
                          }}>
                            {index + 1}
                          </div>

                          {/* Artist Info */}
                          <div style={{
                            flex: 1,
                            minWidth: 0
                          }}>
                            <div style={{
                              fontSize: '1.1rem',
                              fontWeight: '600',
                              color: '#f8fafc',
                              marginBottom: '0.25rem',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}>
                              {artist.name}
                            </div>
                            <div style={{
                              fontSize: '0.85rem',
                              color: '#94a3b8'
                            }}>
                              {artist.albumCount} album{artist.albumCount !== 1 ? 's' : ''}
                            </div>
                          </div>

                          {/* Average Rating */}
                          <div style={{
                            textAlign: 'right',
                            marginLeft: '1rem',
                            flexShrink: 0
                          }}>
                            <div style={{
                              fontSize: '1.4rem',
                              fontWeight: '700',
                              color: '#f8fafc',
                              marginBottom: '0.1rem'
                            }}>
                              {artist.averageRating}
                            </div>
                            <div style={{
                              fontSize: '0.75rem',
                              color: '#94a3b8',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.2rem'
                            }}>
                              ⭐ avg
                            </div>
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              </div>
            </div>
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