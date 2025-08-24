import { useState, useMemo } from 'react';
import AlbumCard from './AlbumCard';

export default function LoggedAlbumsTab({
    loggedAlbums,
    selectedAlbumIds,
    isDeleteMode,
    onOpenSurvey,
    onAlbumSelect,
    onDeleteSelected,
    onCancelDelete,
    onToggleDeleteMode
}) {
    const [sortBy, setSortBy] = useState('rating');
    const [sortOrder, setSortOrder] = useState('desc');
    const [filterArtist, setFilterArtist] = useState('');
    const [filterGenre, setFilterGenre] = useState('');
    const [filterYear, setFilterYear] = useState('');
    const [filterRating, setFilterRating] = useState('');
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
    );
}