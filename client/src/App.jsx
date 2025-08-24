import { useState, useEffect, useMemo } from 'react';
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
  const [activeTab, setActiveTab] = useState('search'); // "search" or "logged" or "stats"
  const [sortBy, setSortBy] = useState('rating');       // sort field
  const [sortOrder, setSortOrder] = useState('desc');   // "asc" or "desc"
  const [selectedAlbumIds, setSelectedAlbumIds] = useState(new Set()); // for multi-select
  const [isDeleteMode, setIsDeleteMode] = useState(false); // toggle delete mode
  const [showConfirm, setShowConfirm] = useState(false);
  const [hoveredRating, setHoveredRating] = useState(null);
  const [clickedRating, setClickedRating] = useState(null); // persist selection on click
  const [hoveredGenre, setHoveredGenre] = useState(null);
  const [clickedGenre, setClickedGenre] = useState(null);
  const [hoveredDecade, setHoveredDecade] = useState(null);
  const [clickedDecade, setClickedDecade] = useState(null);
  // Filter state variables
  const [filterArtist, setFilterArtist] = useState('');
  const [filterGenre, setFilterGenre] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterRating, setFilterRating] = useState('');
  const [hoveredMonth, setHoveredMonth] = useState(null);
  const [clickedMonth, setClickedMonth] = useState(null);
  // Function to clear all filters
  const clearAllFilters = () => {
    setFilterArtist('');
    setFilterGenre('');
    setFilterYear('');
    setFilterRating('');
  };

  // Update handleSelectAll function to work with filtered results
  const handleSelectAll = () => {
    if (selectedAlbumIds.size === filteredAndSortedAlbums.length) {
      // Deselect all
      setSelectedAlbumIds(new Set());
    } else {
      // Select all visible (filtered) albums
      const visibleIds = new Set(filteredAndSortedAlbums.map(album => album.collectionId));
      setSelectedAlbumIds(visibleIds);
    }
  };

  useEffect(() => {
    fetchRatings();
  }, []);

  const fetchRatings = async () => {
    try {
      const res = await fetch('/api/survey/rated');
      const data = await res.json();
      const albums = data.albums || [];
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

  const handleDeleteSelected = () => {
    if (selectedAlbumIds.size === 0) return;
    setShowConfirm(true);
  };

  const confirmDelete = async () => {
    try {
      // Delete all selected albums
      await Promise.all(
        Array.from(selectedAlbumIds).map(albumId =>
          fetch(`/api/survey/${albumId}`, { method: 'DELETE' })
        )
      );
      // Get fresh ratings map from backend
      const updatedRatingsMap = await fetchRatings();

      setAlbums(prevAlbums =>
        prevAlbums.map(album => {
          if (selectedAlbumIds.has(String(album.collectionId))) {
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

      // Clear selections & modes
      setSelectedAlbumIds(new Set());
      setIsDeleteMode(false);


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

  // Helper function to get unique values for filter options
  const uniqueArtists = useMemo(() => {
    return [...new Set(loggedAlbums.map(album => album.artistName))].sort();
  }, [loggedAlbums]);

  const uniqueGenres = useMemo(() => {
    return [...new Set(loggedAlbums.map(album => album.genre))].filter(Boolean).sort();
  }, [loggedAlbums]);

  const uniqueYears = useMemo(() => {
    return [...new Set(loggedAlbums.map(album => {
      if (album.releaseDate) {
        return new Date(album.releaseDate).getFullYear();
      }
      return null;
    }))].filter(Boolean).sort((a, b) => b - a);
  }, [loggedAlbums]);

  const uniqueDecades = useMemo(() => {
    const decades = [...new Set(uniqueYears.map(year => Math.floor(year / 10) * 10))];
    return decades.sort((a, b) => b - a);
  }, [uniqueYears]);

  // Filter and sort logic
  const filteredAndSortedAlbums = useMemo(() => {
    let filtered = loggedAlbums.filter(album => {
      // Artist filter
      if (filterArtist && album.artistName !== filterArtist) {
        return false;
      }

      // Genre filter
      if (filterGenre && album.genre !== filterGenre) {
        return false;
      }

      // Year/Decade filter
      if (filterYear) {
        if (album.releaseDate) {
          const albumYear = new Date(album.releaseDate).getFullYear();

          if (filterYear.endsWith('s')) {
            // Decade filter (e.g., "1990s")
            const decade = parseInt(filterYear.slice(0, -1));
            if (albumYear < decade || albumYear >= decade + 10) {
              return false;
            }
          } else {
            // Specific year filter
            if (albumYear !== parseInt(filterYear)) {
              return false;
            }
          }
        } else {
          // No release date, exclude if year filter is applied
          return false;
        }
      }

      // Rating filter
      if (filterRating && album.rating) {
        const rating = album.rating;

        switch (filterRating) {
          case '10':
            if (rating !== 10) return false;
            break;
          case '9':
            if (rating < 9 || rating >= 10) return false;
            break;
          case '8':
            if (rating < 8 || rating >= 9) return false;
            break;
          case '7':
            if (rating < 7 || rating >= 8) return false;
            break;
          case '6':
            if (rating < 6 || rating >= 7) return false;
            break;
          case '9-10':
            if (rating < 9) return false;
            break;
          case '8-10':
            if (rating < 8) return false;
            break;
          case '7-10':
            if (rating < 7) return false;
            break;
          case '6-10':
            if (rating < 6) return false;
            break;
          case '5-10':
            if (rating < 5) return false;
            break;
          case '1-5':
            if (rating >= 5) return false;
            break;
          default:
            break;
        }
      } else if (filterRating) {
        // If rating filter is applied but album has no rating, exclude it
        return false;
      }

      return true;
    });

    // Apply sorting
    return filtered.sort((a, b) => {
      let aValue, bValue;

      switch (sortBy) {
        case 'rating':
          aValue = a.rating || 0;
          bValue = b.rating || 0;
          break;
        case 'artist':
          aValue = a.artistName?.toLowerCase() || '';
          bValue = b.artistName?.toLowerCase() || '';
          break;
        case 'album':
          aValue = a.collectionName?.toLowerCase() || '';
          bValue = b.collectionName?.toLowerCase() || '';
          break;
        case 'logdatetime':
          aValue = new Date(a.logdatetime || 0);
          bValue = new Date(b.logdatetime || 0);
          break;
        case 'releaseDate':
          aValue = new Date(a.releaseDate || 0);
          bValue = new Date(b.releaseDate || 0);
          break;
        case 'trackCount':
          aValue = a.trackCount || 0;
          bValue = b.trackCount || 0;
          break;
        case 'genre':
          aValue = a.genre?.toLowerCase() || '';
          bValue = b.genre?.toLowerCase() || '';
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [loggedAlbums, filterArtist, filterGenre, filterYear, filterRating, sortBy, sortOrder]);


  return (
    <div className="app-container">

      {/* Tab Navigation */}
      <div className="tab-buttons">
        <button
          className="tab-button"
          onClick={() => setActiveTab('search')}
        >
          Search
        </button>
        <button
          className="tab-button"
          onClick={() => setActiveTab('logged')}
        >
          Logged Albums
        </button>
        <button
          className="tab-button"
          onClick={() => setActiveTab('stats')}
        >
          Stats
        </button>
      </div>

      {/* Search Tab */}
      {activeTab === 'search' && (
        <section>
          <div className="search-container">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for albums..."
              onKeyUp={(e) => e.key === 'Enter' && handleSearch()}
            />
            <button className="search-button" onClick={handleSearch}>Search</button>
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
                alignItems: 'flex-start',
                marginBottom: '1.5rem',
                flexWrap: 'wrap',
                gap: '1rem'
              }}>
                {/* Left side - Sorting and Filtering controls */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  flex: '1',
                  minWidth: '300px'
                }}>
                  {/* Sorting controls */}
                  <div className="sort-controls" style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    flexWrap: 'wrap'
                  }}>
                    <label htmlFor="sort">Sort by:</label>
                    <select
                      id="sort"
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="sort-select"
                      style={{
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        border: '1px solid #d1d5db'
                      }}
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
                      style={{
                        padding: '0.25rem 0.5rem',
                        background: 'none',
                        border: '1px solid #d1d5db',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      {sortOrder === 'asc' ? '🔼' : '🔽'}
                    </button>
                  </div>

                  {/* Filter controls */}
                  <div className="filter-controls" style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    flexWrap: 'wrap',
                    padding: '1rem',
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(10px)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <label htmlFor="artist-filter" style={{ fontWeight: '500', fontSize: '0.9rem', color: '#e2e8f0' }}>Artist:</label>
                      <select
                        id="artist-filter"
                        value={filterArtist}
                        onChange={(e) => setFilterArtist(e.target.value)}
                        style={{
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          fontSize: '0.9rem',
                          background: 'rgba(255, 255, 255, 0.1)',
                          color: '#e2e8f0',
                          maxWidth: '80%',
                          backdropFilter: 'blur(5px)'
                        }}
                      >
                        <option value="" style={{ background: '#1e293b', color: '#e2e8f0' }}>All Artists</option>
                        {uniqueArtists.map(artist => (
                          <option key={artist} value={artist} style={{ background: '#1e293b', color: '#e2e8f0' }}>{artist}</option>
                        ))}
                      </select>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <label htmlFor="genre-filter" style={{ fontWeight: '500', fontSize: '0.9rem', color: '#e2e8f0' }}>Genre:</label>
                      <select
                        id="genre-filter"
                        value={filterGenre}
                        onChange={(e) => setFilterGenre(e.target.value)}
                        style={{
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          fontSize: '0.9rem',
                          background: 'rgba(255, 255, 255, 0.1)',
                          color: '#e2e8f0',
                          backdropFilter: 'blur(5px)'
                        }}
                      >
                        <option value="" style={{ background: '#1e293b', color: '#e2e8f0' }}>All Genres</option>
                        {uniqueGenres.map(genre => (
                          <option key={genre} value={genre} style={{ background: '#1e293b', color: '#e2e8f0' }}>{genre}</option>
                        ))}
                      </select>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <label htmlFor="year-filter" style={{ fontWeight: '500', fontSize: '0.9rem', color: '#e2e8f0' }}>Year:</label>
                      <select
                        id="year-filter"
                        value={filterYear}
                        onChange={(e) => setFilterYear(e.target.value)}
                        style={{
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          fontSize: '0.9rem',
                          background: 'rgba(255, 255, 255, 0.1)',
                          color: '#e2e8f0',
                          backdropFilter: 'blur(5px)'
                        }}
                      >
                        <option value="" style={{ background: '#1e293b', color: '#e2e8f0' }}>All Years</option>
                        <optgroup label="Decades" style={{ background: '#1e293b', color: '#e2e8f0' }}>
                          {uniqueDecades.map(decade => (
                            <option key={decade} value={`${decade}s`} style={{ background: '#1e293b', color: '#e2e8f0' }}>{decade}s</option>
                          ))}
                        </optgroup>
                        <optgroup label="Specific Years" style={{ background: '#1e293b', color: '#e2e8f0' }}>
                          {uniqueYears.map(year => (
                            <option key={year} value={year} style={{ background: '#1e293b', color: '#e2e8f0' }}>{year}</option>
                          ))}
                        </optgroup>
                      </select>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <label style={{ fontWeight: '500', fontSize: '0.9rem', color: '#e2e8f0' }}>Rating:</label>
                      <select
                        value={filterRating}
                        onChange={(e) => setFilterRating(e.target.value)}
                        style={{
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          fontSize: '0.9rem',
                          background: 'rgba(255, 255, 255, 0.1)',
                          color: '#e2e8f0',
                          backdropFilter: 'blur(5px)'
                        }}
                      >
                        <option value="" style={{ background: '#1e293b', color: '#e2e8f0' }}>All Ratings</option>
                        <option value="10" style={{ background: '#1e293b', color: '#e2e8f0' }}>10.0</option>
                        <option value="9-10" style={{ background: '#1e293b', color: '#e2e8f0' }}>9.0 - 10.0 </option>
                        <option value="8-9" style={{ background: '#1e293b', color: '#e2e8f0' }}>8.0 - 9.0</option>
                        <option value="7-8" style={{ background: '#1e293b', color: '#e2e8f0' }}>7.0 - 8.0</option>
                        <option value="6-7" style={{ background: '#1e293b', color: '#e2e8f0' }}>6.0 - 7.0</option>
                        <option value="5-6" style={{ background: '#1e293b', color: '#e2e8f0' }}>5.0 - 6.0</option>
                        <option value="4-5" style={{ background: '#1e293b', color: '#e2e8f0' }}>4.0 - 5.0</option>
                        <option value="0-4" style={{ background: '#1e293b', color: '#e2e8f0' }}>0 - 4.0</option>
                      </select>
                    </div>

                    {/* Clear filters button */}
                    {(filterArtist || filterGenre || filterYear || filterRating) && (
                      <button
                        onClick={clearAllFilters}
                        style={{
                          padding: '0.25rem 0.75rem',
                          fontSize: '0.8rem',
                          fontWeight: '500',
                          background: 'rgba(239, 68, 68, 0.8)',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          backdropFilter: 'blur(5px)'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.background = 'rgba(220, 38, 38, 0.9)';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.background = 'rgba(239, 68, 68, 0.8)';
                        }}
                      >
                        Clear Filters
                      </button>
                    )}
                  </div>
                </div>

                {/* Right side - Delete Mode Controls */}
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
                          background: selectedAlbumIds.size === filteredAndSortedAlbums.length ? '#3b82f6' : 'transparent',
                          color: selectedAlbumIds.size === filteredAndSortedAlbums.length ? '#fff' : '#3b82f6',
                          border: '1px solid #3b82f6',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        {selectedAlbumIds.size === filteredAndSortedAlbums.length ? 'Deselect All' : 'Select All'}
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

              {/* Results summary */}
              <div style={{
                marginBottom: '1rem',
                maxWidth: 'fit-content',
                padding: '0.5rem 1rem',
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '6px',
                fontSize: '0.9rem',
                color: '#94a3b8',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                margin: '0 auto'
              }}>
                Showing {filteredAndSortedAlbums.length} of {loggedAlbums.length} albums
                {(filterArtist || filterGenre || filterYear || filterRating) && (
                  <span style={{ fontWeight: '500' }}> (filtered)</span>
                )}
              </div>

              <div className="album-grid">
                {filteredAndSortedAlbums.map((album) => (
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

              {filteredAndSortedAlbums.length === 0 && (filterArtist || filterGenre || filterYear || filterRating) && (
                <div style={{
                  textAlign: 'center',
                  padding: '2rem',
                  color: '#94a3b8',
                  fontSize: '1.1rem'
                }}>
                  <p>No albums match your current filters.</p>
                  <button
                    onClick={clearAllFilters}
                    style={{
                      marginTop: '1rem',
                      padding: '0.5rem 1rem',
                      fontSize: '0.9rem',
                      fontWeight: '500',
                      background: 'rgba(59, 130, 246, 0.8)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      backdropFilter: 'blur(5px)'
                    }}
                  >
                    Clear All Filters
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      )}

      {/* Stats Tab */}
      {activeTab === 'stats' && (
        <section>
          {loggedAlbums.length === 0 ? (
            <p>No albums logged yet. Start rating some albums to see statistics!</p>
          ) : (
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
              <div style={{
                background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
                padding: '2rem',
                borderRadius: '20px',
                marginTop: '1.5rem',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                marginBottom: '2rem',
                border: '1px solid rgba(148, 163, 184, 0.2)'
              }}>
                <h3 style={{
                  marginBottom: '1.5rem',
                  color: '#f8fafc',
                  fontSize: '1.5rem',
                  fontWeight: '600',
                  textShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  textAlign: 'center'
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
                  Artist Leaderboard
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



              {/* Genre Distribution Pie Chart */}
              <div style={{
                background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
                padding: '2rem',
                borderRadius: '20px',
                marginTop: '1.5rem',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                border: '1px solid rgba(148, 163, 184, 0.2)'
              }}>
                <h3 style={{
                  marginBottom: '1.5rem',
                  color: '#f8fafc',
                  fontSize: '1.5rem',
                  fontWeight: '600',
                  textShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  textAlign: 'center'
                }}>
                  Genre Distribution
                </h3>

                {(() => {
                  // Calculate genre statistics
                  const genreStats = {};
                  loggedAlbums.forEach(album => {
                    const genre = album.genre || 'Unknown';
                    if (!genreStats[genre]) {
                      genreStats[genre] = {
                        count: 0,
                        totalRating: 0,
                        albums: [],
                        highestRated: null
                      };
                    }
                    genreStats[genre].count += 1;
                    genreStats[genre].totalRating += album.rating || 0;
                    genreStats[genre].albums.push(album);

                    // Update highest rated album for this genre
                    if (!genreStats[genre].highestRated || (album.rating || 0) > (genreStats[genre].highestRated.rating || 0)) {
                      genreStats[genre].highestRated = album;
                    }
                  });

                  // Convert to array and sort by count
                  const genreData = Object.entries(genreStats)
                    .map(([genre, stats]) => ({
                      genre,
                      count: stats.count,
                      percentage: (stats.count / loggedAlbums.length) * 100,
                      averageRating: stats.count > 0 ? (stats.totalRating / stats.count).toFixed(1) : '0.0',
                      highestRated: stats.highestRated,
                      albums: stats.albums
                    }))
                    .sort((a, b) => b.count - a.count);

                  // Generate colors for each genre
                  const colors = [
                    '#ef4444', '#f97316', '#eab308', '#22c55e', '#10b981',
                    '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7',
                    '#d946ef', '#ec4899', '#f43f5e', '#84cc16', '#65a30d',
                    '#059669', '#0891b2', '#1d4ed8', '#4338ca', '#7c3aed'
                  ];

                  // Calculate pie chart data
                  let cumulativePercentage = 0;
                  const pieData = genreData.map((item, index) => {
                    const startAngle = (cumulativePercentage / 100) * 360;
                    cumulativePercentage += item.percentage;
                    const endAngle = (cumulativePercentage / 100) * 360;

                    return {
                      ...item,
                      startAngle,
                      endAngle,
                      color: colors[index % colors.length]
                    };
                  });

                  // SVG dimensions
                  const size = 300;
                  const center = size / 2;
                  const radius = 120;

                  // Function to create SVG path for pie slice
                  const createPieSlice = (startAngle, endAngle, radius) => {
                    const start = polarToCartesian(center, center, radius, endAngle);
                    const end = polarToCartesian(center, center, radius, startAngle);
                    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

                    return [
                      "M", center, center,
                      "L", start.x, start.y,
                      "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y,
                      "Z"
                    ].join(" ");
                  };

                  const polarToCartesian = (centerX, centerY, radius, angleInDegrees) => {
                    const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
                    return {
                      x: centerX + (radius * Math.cos(angleInRadians)),
                      y: centerY + (radius * Math.sin(angleInRadians))
                    };
                  };

                  if (genreData.length === 0) {
                    return (
                      <div style={{
                        textAlign: 'center',
                        padding: '3rem',
                        color: '#94a3b8',
                        fontSize: '1.1rem'
                      }}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.7 }}>🎵</div>
                        <p>No genre data available yet.</p>
                      </div>
                    );
                  }

                  return (
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 400px',
                      gap: '2rem',
                      minHeight: '400px'
                    }}>
                      {/* Pie Chart - Left Side */}
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        background: 'rgba(15, 23, 42, 0.6)',
                        borderRadius: '16px',
                        padding: '1.5rem',
                        boxShadow: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
                        border: '1px solid rgba(71, 85, 105, 0.3)',
                        backdropFilter: 'blur(10px)'
                      }}>
                        <svg width={size} height={size} style={{ marginBottom: '1rem' }}>
                          {pieData.map((slice, index) => {
                            const isHovered = hoveredGenre === slice.genre;
                            const isClicked = clickedGenre === slice.genre;
                            const isActive = isHovered || isClicked;

                            return (
                              <path
                                key={slice.genre}
                                d={createPieSlice(slice.startAngle, slice.endAngle, radius)}
                                fill={slice.color}
                                stroke="rgba(15, 23, 42, 0.8)"
                                strokeWidth="2"
                                style={{
                                  cursor: 'pointer',
                                  transition: 'all 0.3s ease',
                                  transform: isActive ? 'scale(1.05)' : 'scale(1)',
                                  transformOrigin: `${center}px ${center}px`,
                                  opacity: (hoveredGenre === null && clickedGenre === null) || isActive ? 1 : 0.7,
                                  filter: isActive ? 'brightness(1.1)' : 'brightness(1)',
                                  outline: 'none'
                                }}
                                onMouseEnter={() => setHoveredGenre(slice.genre)}
                                onMouseLeave={() => setHoveredGenre(null)}
                                onClick={() => setClickedGenre(clickedGenre === slice.genre ? null : slice.genre)}
                              />
                            );
                          })}
                        </svg>

                        {/* Legend */}
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                          gap: '0.5rem',
                          width: '100%',
                          maxHeight: '120px',
                          overflowY: 'auto'
                        }}>
                          {pieData.map((item) => {
                            const isActive = hoveredGenre === item.genre || clickedGenre === item.genre;
                            return (
                              <div
                                key={item.genre}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.5rem',
                                  padding: '0.5rem',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s ease',
                                  background: isActive ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                                  border: isActive ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid transparent'
                                }}
                                onMouseEnter={() => setHoveredGenre(item.genre)}
                                onMouseLeave={() => setHoveredGenre(null)}
                                onClick={() => setClickedGenre(clickedGenre === item.genre ? null : item.genre)}
                              >
                                <div
                                  style={{
                                    width: '12px',
                                    height: '12px',
                                    backgroundColor: item.color,
                                    borderRadius: '2px',
                                    flexShrink: 0
                                  }}
                                />
                                <span style={{
                                  fontSize: '0.8rem',
                                  color: isActive ? '#e2e8f0' : '#cbd5e1',
                                  fontWeight: isActive ? '600' : '400',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap'
                                }}>
                                  {item.genre} ({item.count})
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Genre Details - Right Side */}
                      <div style={{
                        background: 'rgba(15, 23, 42, 0.6)',
                        borderRadius: '16px',
                        padding: '1.5rem',
                        boxShadow: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
                        border: '1px solid rgba(71, 85, 105, 0.3)',
                        backdropFilter: 'blur(10px)'
                      }}>
                        {(hoveredGenre === null && clickedGenre === null) ? (
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
                              🎵
                            </div>
                            <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: '500', color: '#e2e8f0' }}>
                              Hover or click a bar
                            </p>
                            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem' }}>
                            </p>
                          </div>
                        ) : (
                          <div>
                            {(() => {
                              const displayGenre = clickedGenre || hoveredGenre;
                              const genreInfo = pieData.find(item => item.genre === displayGenre);

                              return (
                                <>
                                  <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginBottom: '1.5rem'
                                  }}>
                                    <h4 style={{
                                      margin: 0,
                                      color: '#f8fafc',
                                      fontSize: '1.3rem',
                                      fontWeight: '600',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '0.5rem'
                                    }}>
                                      <div
                                        style={{
                                          width: '16px',
                                          height: '16px',
                                          backgroundColor: genreInfo.color,
                                          borderRadius: '3px'
                                        }}
                                      />
                                      {genreInfo.genre}
                                    </h4>
                                    {clickedGenre && (
                                      <button
                                        onClick={() => setClickedGenre(null)}
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
                                        title="Close genre details"
                                      >
                                        ✕
                                      </button>
                                    )}
                                  </div>

                                  {/* Stats Cards */}
                                  <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: '1fr 1fr',
                                    gap: '1rem',
                                    marginBottom: '1.5rem'
                                  }}>
                                    <div style={{
                                      background: 'rgba(30, 41, 59, 0.4)',
                                      padding: '1rem',
                                      borderRadius: '10px',
                                      border: '1px solid rgba(71, 85, 105, 0.3)',
                                      textAlign: 'center'
                                    }}>
                                      <div style={{ fontSize: '1.8rem', fontWeight: '700', color: '#f8fafc' }}>
                                        {genreInfo.count}
                                      </div>
                                      <div style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: '500' }}>
                                        Albums ({genreInfo.percentage.toFixed(1)}%)
                                      </div>
                                    </div>
                                    <div style={{
                                      background: 'rgba(30, 41, 59, 0.4)',
                                      padding: '1rem',
                                      borderRadius: '10px',
                                      border: '1px solid rgba(71, 85, 105, 0.3)',
                                      textAlign: 'center'
                                    }}>
                                      <div style={{ fontSize: '1.8rem', fontWeight: '700', color: '#f8fafc' }}>
                                        {genreInfo.averageRating}
                                      </div>
                                      <div style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: '500' }}>
                                        Average Rating ⭐
                                      </div>
                                    </div>
                                  </div>

                                  {/* Highest Rated Album */}
                                  {genreInfo.highestRated && (
                                    <div style={{
                                      background: 'rgba(30, 41, 59, 0.4)',
                                      padding: '1rem',
                                      borderRadius: '10px',
                                      border: '1px solid rgba(71, 85, 105, 0.3)',
                                      marginBottom: '1rem'
                                    }}>
                                      <div style={{
                                        fontSize: '0.9rem',
                                        fontWeight: '600',
                                        color: '#22c55e',
                                        marginBottom: '0.5rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem'
                                      }}>
                                        🏆 Highest Rated ({genreInfo.highestRated.rating}/10)
                                      </div>
                                      <div style={{
                                        fontSize: '1rem',
                                        fontWeight: '600',
                                        color: '#f8fafc',
                                        marginBottom: '0.25rem'
                                      }}>
                                        {genreInfo.highestRated.collectionName}
                                      </div>
                                      <div style={{
                                        fontSize: '0.85rem',
                                        color: '#cbd5e1',
                                        fontStyle: 'italic'
                                      }}>
                                        by {genreInfo.highestRated.artistName}
                                      </div>
                                    </div>
                                  )}

                                  {/* Album List */}
                                  <div style={{
                                    maxHeight: '180px',
                                    overflowY: 'auto',
                                    paddingRight: '0.5rem'
                                  }}>
                                    <div style={{
                                      fontSize: '0.9rem',
                                      fontWeight: '600',
                                      color: '#e2e8f0',
                                      marginBottom: '0.75rem'
                                    }}>
                                      All Albums:
                                    </div>
                                    {genreInfo.albums
                                      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
                                      .map((album) => (
                                        <div key={album.collectionId} style={{
                                          padding: '0.5rem',
                                          background: 'rgba(30, 41, 59, 0.3)',
                                          borderRadius: '8px',
                                          marginBottom: '0.5rem',
                                          border: '1px solid rgba(71, 85, 105, 0.2)',
                                          display: 'flex',
                                          justifyContent: 'space-between',
                                          alignItems: 'center'
                                        }}>
                                          <div>
                                            <div style={{
                                              fontSize: '0.85rem',
                                              fontWeight: '500',
                                              color: '#f8fafc',
                                              marginBottom: '0.1rem'
                                            }}>
                                              {album.collectionName}
                                            </div>
                                            <div style={{
                                              fontSize: '0.75rem',
                                              color: '#cbd5e1',
                                              fontStyle: 'italic'
                                            }}>
                                              {album.artistName}
                                            </div>
                                          </div>
                                          <div style={{
                                            fontSize: '0.9rem',
                                            fontWeight: '700',
                                            color: '#22c55e',
                                            marginLeft: '0.5rem'
                                          }}>
                                            {album.rating}/10
                                          </div>
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
                  );
                })()}
              </div>

              <div style={{
                background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
                padding: '2rem',
                borderRadius: '20px',
                marginTop: '1.5rem',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                border: '1px solid rgba(148, 163, 184, 0.2)'
              }}>
                <h3 style={{
                  marginBottom: '1.5rem',
                  color: '#f8fafc',
                  fontSize: '1.5rem',
                  fontWeight: '600',
                  textShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  textAlign: 'center'
                }}>
                  Decade Distribution
                </h3>

                {(() => {
                  // Calculate decade statistics
                  const decadeStats = {};
                  loggedAlbums.forEach(album => {
                    const releaseYear = album.releaseDate ? new Date(album.releaseDate).getFullYear() : null;
                    const decade = releaseYear ? Math.floor(releaseYear / 10) * 10 : 'Unknown';
                    if (!decadeStats[decade]) {
                      decadeStats[decade] = {
                        count: 0,
                        totalRating: 0,
                        albums: [],
                        highestRated: null
                      };
                    }
                    decadeStats[decade].count += 1;
                    decadeStats[decade].totalRating += album.rating || 0;
                    decadeStats[decade].albums.push(album);

                    // Update highest rated album for this decade
                    if (!decadeStats[decade].highestRated || (album.rating || 0) > (decadeStats[decade].highestRated.rating || 0)) {
                      decadeStats[decade].highestRated = album;
                    }
                  });

                  // Convert to array and sort by decade (newest first)
                  const decadeData = Object.entries(decadeStats)
                    .map(([decade, stats]) => ({
                      decade: decade === 'Unknown' ? 'Unknown' : `${decade}s`,
                      decadeValue: decade === 'Unknown' ? -1 : decade,
                      count: stats.count,
                      percentage: (stats.count / loggedAlbums.length) * 100,
                      averageRating: stats.count > 0 ? (stats.totalRating / stats.count).toFixed(1) : '0.0',
                      highestRated: stats.highestRated,
                      albums: stats.albums
                    }))
                    .sort((a, b) => b.decadeValue - a.decadeValue);

                  // Generate colors for each decade
                  const colors = [
                    '#ef4444', '#f97316', '#eab308', '#22c55e', '#10b981',
                    '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7',
                    '#d946ef', '#ec4899', '#f43f5e', '#84cc16', '#65a30d',
                    '#059669', '#0891b2', '#1d4ed8', '#4338ca', '#7c3aed'
                  ];

                  // Calculate pie chart data
                  let cumulativePercentage = 0;
                  const pieData = decadeData.map((item, index) => {
                    const startAngle = (cumulativePercentage / 100) * 360;
                    cumulativePercentage += item.percentage;
                    const endAngle = (cumulativePercentage / 100) * 360;

                    return {
                      ...item,
                      startAngle,
                      endAngle,
                      color: colors[index % colors.length]
                    };
                  });

                  // SVG dimensions
                  const size = 500;
                  const center = size / 2;
                  const radius = 200;

                  // Function to create SVG path for pie slice
                  const createPieSlice = (startAngle, endAngle, radius) => {
                    const start = polarToCartesian(center, center, radius, endAngle);
                    const end = polarToCartesian(center, center, radius, startAngle);
                    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

                    return [
                      "M", center, center,
                      "L", start.x, start.y,
                      "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y,
                      "Z"
                    ].join(" ");
                  };

                  const polarToCartesian = (centerX, centerY, radius, angleInDegrees) => {
                    const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
                    return {
                      x: centerX + (radius * Math.cos(angleInRadians)),
                      y: centerY + (radius * Math.sin(angleInRadians))
                    };
                  };

                  if (decadeData.length === 0) {
                    return (
                      <div style={{
                        textAlign: 'center',
                        padding: '3rem',
                        color: '#94a3b8',
                        fontSize: '1.1rem'
                      }}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.7 }}>📅</div>
                        <p>No decade data available yet.</p>
                      </div>
                    );
                  }

                  return (
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '400px 1fr',
                      gap: '2rem',
                      minHeight: '400px'
                    }}>
                      {/* Decade Details - Left Side */}
                      <div style={{
                        background: 'rgba(15, 23, 42, 0.6)',
                        borderRadius: '16px',
                        padding: '1.5rem',
                        boxShadow: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
                        border: '1px solid rgba(71, 85, 105, 0.3)',
                        backdropFilter: 'blur(10px)'
                      }}>
                        {(hoveredDecade === null && clickedDecade === null) ? (
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
                              📅
                            </div>
                            <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: '500', color: '#e2e8f0' }}>
                              Hover or click a decade
                            </p>
                            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem' }}>
                              Click to keep the details persistent
                            </p>
                          </div>
                        ) : (
                          <div>
                            {(() => {
                              const displayDecade = clickedDecade || hoveredDecade;
                              const decadeInfo = pieData.find(item => item.decade === displayDecade);

                              return (
                                <>
                                  <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginBottom: '1.5rem'
                                  }}>
                                    <h4 style={{
                                      margin: 0,
                                      color: '#f8fafc',
                                      fontSize: '1.3rem',
                                      fontWeight: '600',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '0.5rem'
                                    }}>
                                      <div
                                        style={{
                                          width: '16px',
                                          height: '16px',
                                          backgroundColor: decadeInfo.color,
                                          borderRadius: '3px'
                                        }}
                                      />
                                      {decadeInfo.decade}
                                    </h4>
                                    {clickedDecade && (
                                      <button
                                        onClick={() => setClickedDecade(null)}
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
                                        title="Close decade details"
                                      >
                                        ✕
                                      </button>
                                    )}
                                  </div>

                                  {/* Stats Cards */}
                                  <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: '1fr 1fr',
                                    gap: '1rem',
                                    marginBottom: '1.5rem'
                                  }}>
                                    <div style={{
                                      background: 'rgba(30, 41, 59, 0.4)',
                                      padding: '1rem',
                                      borderRadius: '10px',
                                      border: '1px solid rgba(71, 85, 105, 0.3)',
                                      textAlign: 'center'
                                    }}>
                                      <div style={{ fontSize: '1.8rem', fontWeight: '700', color: '#f8fafc' }}>
                                        {decadeInfo.count}
                                      </div>
                                      <div style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: '500' }}>
                                        Albums ({decadeInfo.percentage.toFixed(1)}%)
                                      </div>
                                    </div>
                                    <div style={{
                                      background: 'rgba(30, 41, 59, 0.4)',
                                      padding: '1rem',
                                      borderRadius: '10px',
                                      border: '1px solid rgba(71, 85, 105, 0.3)',
                                      textAlign: 'center'
                                    }}>
                                      <div style={{ fontSize: '1.8rem', fontWeight: '700', color: '#f8fafc' }}>
                                        {decadeInfo.averageRating}
                                      </div>
                                      <div style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: '500' }}>
                                        Average Rating
                                      </div>
                                    </div>
                                  </div>

                                  {/* Highest Rated Album */}
                                  {decadeInfo.highestRated && (
                                    <div style={{
                                      background: 'rgba(30, 41, 59, 0.4)',
                                      padding: '1rem',
                                      borderRadius: '10px',
                                      border: '1px solid rgba(71, 85, 105, 0.3)',
                                      marginBottom: '1rem'
                                    }}>
                                      <div style={{
                                        fontSize: '0.9rem',
                                        fontWeight: '600',
                                        color: '#22c55e',
                                        marginBottom: '0.5rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem'
                                      }}>
                                        🏆 Highest Rated ({decadeInfo.highestRated.rating}/10)
                                      </div>
                                      <div style={{
                                        fontSize: '1rem',
                                        fontWeight: '600',
                                        color: '#f8fafc',
                                        marginBottom: '0.25rem'
                                      }}>
                                        {decadeInfo.highestRated.collectionName}
                                      </div>
                                      <div style={{
                                        fontSize: '0.85rem',
                                        color: '#cbd5e1',
                                        fontStyle: 'italic'
                                      }}>
                                        by {decadeInfo.highestRated.artistName} ({decadeInfo.highestRated.releaseDate ? new Date(decadeInfo.highestRated.releaseDate).getFullYear() : 'Unknown'})
                                      </div>
                                    </div>
                                  )}

                                  {/* Album List */}
                                  <div style={{
                                    maxHeight: '180px',
                                    overflowY: 'auto',
                                    paddingRight: '0.5rem'
                                  }}>
                                    <div style={{
                                      fontSize: '0.9rem',
                                      fontWeight: '600',
                                      color: '#e2e8f0',
                                      marginBottom: '0.75rem'
                                    }}>
                                      All Albums:
                                    </div>
                                    {decadeInfo.albums
                                      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
                                      .map((album) => (
                                        <div key={album.collectionId} style={{
                                          padding: '0.5rem',
                                          background: 'rgba(30, 41, 59, 0.3)',
                                          borderRadius: '8px',
                                          marginBottom: '0.5rem',
                                          border: '1px solid rgba(71, 85, 105, 0.2)',
                                          display: 'flex',
                                          justifyContent: 'space-between',
                                          alignItems: 'center'
                                        }}>
                                          <div>
                                            <div style={{
                                              fontSize: '0.85rem',
                                              fontWeight: '500',
                                              color: '#f8fafc',
                                              marginBottom: '0.1rem'
                                            }}>
                                              {album.collectionName}
                                            </div>
                                            <div style={{
                                              fontSize: '0.75rem',
                                              color: '#cbd5e1',
                                              fontStyle: 'italic'
                                            }}>
                                              {album.artistName} ({album.releaseDate ? new Date(album.releaseDate).getFullYear() : 'Unknown'})
                                            </div>
                                          </div>
                                          <div style={{
                                            fontSize: '0.9rem',
                                            fontWeight: '700',
                                            color: '#22c55e',
                                            marginLeft: '0.5rem'
                                          }}>
                                            {album.rating}/10
                                          </div>
                                        </div>
                                      ))}
                                  </div>
                                </>
                              );
                            })()}
                          </div>
                        )}
                      </div>

                      {/* Pie Chart - Right Side */}
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        background: 'rgba(15, 23, 42, 0.6)',
                        borderRadius: '16px',
                        padding: '1.5rem',
                        boxShadow: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
                        border: '1px solid rgba(71, 85, 105, 0.3)',
                        backdropFilter: 'blur(10px)'
                      }}>
                        <svg width={size} height={size} style={{ marginBottom: '1rem' }}>
                          {pieData.map((slice, index) => {
                            const isHovered = hoveredDecade === slice.decade;
                            const isClicked = clickedDecade === slice.decade;
                            const isActive = isHovered || isClicked;

                            return (
                              <path
                                key={slice.decade}
                                d={createPieSlice(slice.startAngle, slice.endAngle, radius)}
                                fill={slice.color}
                                stroke="rgba(15, 23, 42, 0.8)"
                                strokeWidth="2"
                                style={{
                                  cursor: 'pointer',
                                  transition: 'all 0.3s ease',
                                  transform: isActive ? 'scale(1.05)' : 'scale(1)',
                                  transformOrigin: `${center}px ${center}px`,
                                  opacity: (hoveredDecade === null && clickedDecade === null) || isActive ? 1 : 0.7,
                                  filter: isActive ? 'brightness(1.1)' : 'brightness(1)',
                                  outline: 'none'
                                }}
                                onMouseEnter={() => setHoveredDecade(slice.decade)}
                                onMouseLeave={() => setHoveredDecade(null)}
                                onClick={() => setClickedDecade(clickedDecade === slice.decade ? null : slice.decade)}
                              />
                            );
                          })}
                        </svg>

                        {/* Legend */}
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                          gap: '0.5rem',
                          width: '100%',
                          maxHeight: '120px',
                          overflowY: 'auto'
                        }}>
                          {pieData.map((item) => {
                            const isActive = hoveredDecade === item.decade || clickedDecade === item.decade;
                            return (
                              <div
                                key={item.decade}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.5rem',
                                  padding: '0.5rem',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s ease',
                                  background: isActive ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                                  border: isActive ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid transparent'
                                }}
                                onMouseEnter={() => setHoveredDecade(item.decade)}
                                onMouseLeave={() => setHoveredDecade(null)}
                                onClick={() => setClickedDecade(clickedDecade === item.decade ? null : item.decade)}
                              >
                                <div
                                  style={{
                                    width: '12px',
                                    height: '12px',
                                    backgroundColor: item.color,
                                    borderRadius: '2px',
                                    flexShrink: 0
                                  }}
                                />
                                <span style={{
                                  fontSize: '0.8rem',
                                  color: isActive ? '#e2e8f0' : '#cbd5e1',
                                  fontWeight: isActive ? '600' : '400',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap'
                                }}>
                                  {item.decade} ({item.count})
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })()}


              </div>
              {/*end here*/}

            </div>
          )}

{/* Monthly Logging Activity Chart */}
<div style={{
  background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
  padding: '2rem',
  borderRadius: '20px',
  marginTop: '1.5rem',
  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  border: '1px solid rgba(148, 163, 184, 0.2)'
}}>
  <h3 style={{
    marginBottom: '1.5rem',
    color: '#f8fafc',
    fontSize: '1.5rem',
    fontWeight: '600',
    textShadow: '0 2px 4px rgba(0,0,0,0.1)',
    textAlign: 'center'
  }}>
    Monthly Logging Activity
  </h3>

  {(() => {
    // Calculate monthly statistics
    const monthlyStats = {};
    loggedAlbums.forEach(album => {
      if (album.logdatetime) {
        const logDate = new Date(album.logdatetime);
        const monthKey = `${logDate.getFullYear()}-${(logDate.getMonth() + 1).toString().padStart(2, '0')}`;
        const monthLabel = logDate.toLocaleDateString('en-US', { 
          month: 'long', 
          year: 'numeric' 
        });
        
        if (!monthlyStats[monthKey]) {
          monthlyStats[monthKey] = {
            monthLabel,
            count: 0,
            totalRating: 0,
            albums: [],
            date: logDate
          };
        }
        monthlyStats[monthKey].count += 1;
        monthlyStats[monthKey].totalRating += album.rating || 0;
        monthlyStats[monthKey].albums.push(album);
      }
    });

    // Convert to array and sort by date (most recent first)
    const monthlyData = Object.entries(monthlyStats)
      .map(([key, stats]) => ({
        monthKey: key,
        monthLabel: stats.monthLabel,
        count: stats.count,
        averageRating: stats.count > 0 ? (stats.totalRating / stats.count).toFixed(1) : '0.0',
        albums: stats.albums,
        date: stats.date
      }))
      .sort((a, b) => b.date - a.date);

    if (monthlyData.length === 0) {
      return (
        <div style={{
          textAlign: 'center',
          padding: '3rem',
          color: '#94a3b8',
          fontSize: '1.1rem'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.7 }}>📊</div>
          <p>No logging data available yet.</p>
        </div>
      );
    }

    // Calculate chart dimensions
    const chartHeight = 300;
    const chartPadding = { top: 20, right: 20, bottom: 60, left: 60 };
    const chartWidth = Math.max(800, monthlyData.length * 60);
    const barWidth = Math.max(30, (chartWidth - chartPadding.left - chartPadding.right) / monthlyData.length - 10);
    const maxCount = Math.max(...monthlyData.map(d => d.count));
    const yScale = (chartHeight - chartPadding.top - chartPadding.bottom) / maxCount;

    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem'
      }}>
        {/* Chart Container */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.6)',
          borderRadius: '16px',
          padding: '1.5rem',
          boxShadow: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
          border: '1px solid rgba(71, 85, 105, 0.3)',
          backdropFilter: 'blur(10px)',
          overflowX: 'auto'
        }}>
          <svg width={chartWidth} height={chartHeight} style={{ minWidth: '100%' }}>
            {/* Y-axis grid lines */}
            {Array.from({ length: 6 }, (_, i) => {
              const y = chartPadding.top + (i * (chartHeight - chartPadding.top - chartPadding.bottom) / 5);
              const value = Math.round(maxCount - (i * maxCount / 5));
              return (
                <g key={i}>
                  <line
                    x1={chartPadding.left}
                    y1={y}
                    x2={chartWidth - chartPadding.right}
                    y2={y}
                    stroke="rgba(71, 85, 105, 0.3)"
                    strokeWidth="1"
                  />
                  <text
                    x={chartPadding.left - 10}
                    y={y + 4}
                    textAnchor="end"
                    fill="#94a3b8"
                    fontSize="12"
                    fontWeight="500"
                  >
                    {value}
                  </text>
                </g>
              );
            })}

            {/* Bars */}
            {monthlyData.map((item, index) => {
              const x = chartPadding.left + (index * (barWidth + 10));
              const barHeight = item.count * yScale;
              const y = chartHeight - chartPadding.bottom - barHeight;
              const isHovered = hoveredMonth === item.monthKey;
              const isClicked = clickedMonth === item.monthKey;
              const isActive = isHovered || isClicked;
              
              return (
                <g key={item.monthKey}>
                  {/* Bar */}
                  <rect
                    x={x}
                    y={y}
                    width={barWidth}
                    height={barHeight}
                    fill="url(#barGradient)"
                    stroke={isActive ? '#3b82f6' : 'rgba(59, 130, 246, 0.3)'}
                    strokeWidth={isActive ? '3' : '1'}
                    style={{
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      opacity: (isHovered || clickedMonth === item.monthKey) ? 1 : 0.8,
                      filter: (isHovered || clickedMonth === item.monthKey) ? 'brightness(1.2)' : 'brightness(1)'
                    }}
                    onMouseEnter={() => setHoveredMonth(item.monthKey)}
                    onMouseLeave={() => setHoveredMonth(null)}
                    onClick={() => setClickedMonth(clickedMonth === item.monthKey ? null : item.monthKey)}
                  />
                  
                  {/* Value label on top of bar */}
                  <text
                    x={x + barWidth / 2}
                    y={y - 5}
                    textAnchor="middle"
                    fill={isActive ? '#f8fafc' : '#e2e8f0'}
                    fontSize="12"
                    fontWeight="600"
                    style={{ transition: 'all 0.3s ease' }}
                  >
                    {item.count}
                  </text>
                  
                  {/* Month label */}
                  <text
                    x={x + barWidth / 2}
                    y={chartHeight - chartPadding.bottom + 20}
                    textAnchor="middle"
                    fill={isActive ? '#f8fafc' : '#cbd5e1'}
                    fontSize="11"
                    fontWeight={isActive ? '600' : '400'}
                    style={{ transition: 'all 0.3s ease' }}
                  >
                    {item.monthLabel.split(' ')[0]}
                  </text>
                  <text
                    x={x + barWidth / 2}
                    y={chartHeight - chartPadding.bottom + 35}
                    textAnchor="middle"
                    fill={isActive ? '#f8fafc' : '#94a3b8'}
                    fontSize="10"
                    fontWeight={isActive ? '500' : '400'}
                    style={{ transition: 'all 0.3s ease' }}
                  >
                    {item.monthLabel.split(' ')[1]}
                  </text>
                </g>
              );
            })}

            {/* Gradient definition */}
            <defs>
              <linearGradient id="barGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.7" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Summary Stats */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem'
        }}>
          <div style={{
            background: 'rgba(15, 23, 42, 0.6)',
            borderRadius: '12px',
            padding: '1.25rem',
            border: '1px solid rgba(71, 85, 105, 0.3)',
            textAlign: 'center'
          }}>
            <div style={{
              fontSize: '2rem',
              fontWeight: '700',
              color: '#22c55e',
              marginBottom: '0.5rem'
            }}>
              {monthlyData.reduce((sum, month) => sum + month.count, 0)}
            </div>
            <div style={{
              color: '#94a3b8',
              fontSize: '0.9rem',
              fontWeight: '500'
            }}>
              Total Albums Logged
            </div>
          </div>

          <div style={{
            background: 'rgba(15, 23, 42, 0.6)',
            borderRadius: '12px',
            padding: '1.25rem',
            border: '1px solid rgba(71, 85, 105, 0.3)',
            textAlign: 'center'
          }}>
            <div style={{
              fontSize: '2rem',
              fontWeight: '700',
              color: '#3b82f6',
              marginBottom: '0.5rem'
            }}>
              {monthlyData.find(d => d.count === Math.max(...monthlyData.map(m => m.count))).monthLabel}
            </div>
            <div style={{
              color: '#94a3b8',
              fontSize: '0.9rem',
              fontWeight: '500'
            }}>
              Most Active Month
            </div>
          </div>

          <div style={{
            background: 'rgba(15, 23, 42, 0.6)',
            borderRadius: '12px',
            padding: '1.25rem',
            border: '1px solid rgba(71, 85, 105, 0.3)',
            textAlign: 'center'
          }}>
            <div style={{
              fontSize: '2rem',
              fontWeight: '700',
              color: '#f59e0b',
              marginBottom: '0.5rem'
            }}>
              {(monthlyData.reduce((sum, month) => sum + month.count, 0) / monthlyData.length).toFixed(1)}
            </div>
            <div style={{
              color: '#94a3b8',
              fontSize: '0.9rem',
              fontWeight: '500'
            }}>
              Average per Month
            </div>
          </div>
        </div>

        {/* Month Details */}
        {(hoveredMonth || clickedMonth) && (
          <div style={{
            background: 'rgba(15, 23, 42, 0.8)',
            borderRadius: '12px',
            padding: '1.5rem',
            border: '2px solid rgba(59, 130, 246, 0.4)',
            backdropFilter: 'blur(10px)'
          }}>
            {(() => {
              const displayMonth = clickedMonth || hoveredMonth;
              const monthData = monthlyData.find(item => item.monthKey === displayMonth);
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
                      fontWeight: '600'
                    }}>
                      {monthData.monthLabel}
                    </h4>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem'
                    }}>
                      <div style={{
                        fontSize: '1.5rem',
                        fontWeight: '700',
                        color: '#3b82f6'
                      }}>
                        {monthData.count} albums
                      </div>
                      {clickedMonth && (
                        <button
                          onClick={() => setClickedMonth(null)}
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
                          title="Close month details"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>

                  {!clickedMonth && (
                    <div style={{
                      fontSize: '0.9rem',
                      color: '#94a3b8',
                      marginBottom: '1rem',
                      fontStyle: 'italic'
                    }}>
                      Click the column to keep these details persistent
                    </div>
                  )}

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                    gap: '1rem',
                    maxHeight: '200px',
                    overflowY: 'auto'
                  }}>
                    {monthData.albums
                      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
                      .map((album) => (
                        <div key={album.collectionId} style={{
                          padding: '0.75rem',
                          background: 'rgba(30, 41, 59, 0.4)',
                          borderRadius: '8px',
                          border: '1px solid rgba(71, 85, 105, 0.3)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          <div>
                            <div style={{
                              fontSize: '0.9rem',
                              fontWeight: '500',
                              color: '#f8fafc',
                              marginBottom: '0.2rem'
                            }}>
                              {album.collectionName}
                            </div>
                            <div style={{
                              fontSize: '0.8rem',
                              color: '#cbd5e1',
                              fontStyle: 'italic'
                            }}>
                              {album.artistName}
                            </div>
                          </div>
                          <div style={{
                            fontSize: '1rem',
                            fontWeight: '700',
                            color: '#22c55e',
                            marginLeft: '0.5rem'
                          }}>
                            {album.rating}/10
                          </div>
                        </div>
                      ))}
                  </div>
                </>
              );
            })()}
          </div>
        )}
      </div>
    );
  })()}

          </div>
        </section>
      )}

      {/* Confirm Popup */}
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
          onClick={handleSurveyClose}
        >
          <div
            className="modal-content"
            style={{
              borderRadius: '12px',
              minWidth: '320px',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <SurveyForm album={selectedAlbum} onSubmitted={handleSurveyClose} />
          </div>
        </div>
      )}
    </div>
  );
}