import { useState, useEffect } from 'react';

export default function StatsTab({ loggedAlbums }) {
  const [activeSubTab, setActiveSubTab] = useState('albums');

  // Albums interaction states (kept as before)
  const [hoveredRating, setHoveredRating] = useState(null);
  const [clickedRating, setClickedRating] = useState(null);
  const [hoveredGenre, setHoveredGenre] = useState(null);
  const [clickedGenre, setClickedGenre] = useState(null);
  const [hoveredDecade, setHoveredDecade] = useState(null);
  const [clickedDecade, setClickedDecade] = useState(null);
  const [hoveredMonth, setHoveredMonth] = useState(null);
  const [clickedMonth, setClickedMonth] = useState(null);

  // Songs states
  const [hoveredSongGenre, setHoveredSongGenre] = useState(null);
  const [clickedSongGenre, setClickedSongGenre] = useState(null);
  const [favoriteSongs, setFavoriteSongs] = useState([]);
  const [songsLoading, setSongsLoading] = useState(true);

  useEffect(() => {
    const loadFavoriteSongs = async () => {
      setSongsLoading(true);
      try {
        const res = await fetch('/api/favoriteTracks/allTracks');
        if (res.ok) {
          const data = await res.json();
          const songs = data?.favorites ?? data ?? [];
          setFavoriteSongs(songs);
        } else {
          setFavoriteSongs([]);
        }
      } catch (err) {
        console.error('Failed to load favorite songs:', err);
        setFavoriteSongs([]);
      } finally {
        setSongsLoading(false);
      }
    };

    if (activeSubTab === 'songs') {
      loadFavoriteSongs();
    }
  }, [activeSubTab]);

  const getGenreFromTrack = (track) => {
    return track?.genre || track?.primaryGenreName || 'Unknown';
  };

  const formatDate = (track) => {
    const possible =
      track?.loggedAt ??
      track?.logged_at ??
      track?.dateLogged ??
      track?.date_logged ??
      track?.addedAt ??
      track?.added_at ??
      track?.date ??
      track?.logged ??
      track?.timestamp ??
      track?.createdAt ??
      track?.created_at ??
      track?.logdatetime ??
      track?.date_added;
    if (!possible) return '';
    let d;
    if (typeof possible === 'number') {
      d = new Date(possible < 1e12 ? possible * 1000 : possible);
    } else {
      d = new Date(possible);
    }
    if (isNaN(d.getTime())) return String(possible);
    return d.toLocaleDateString();
  };

  return (
    <section>
      {/* Sub-tab buttons */}
      <div className="tab-buttons" style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button
          className="subtab-button"
          onClick={() => setActiveSubTab('albums')}
          style={{
            padding: '8px 16px',
            backgroundColor: activeSubTab === 'albums' ? 'rgba(59, 130, 246, 0.8)' : 'rgba(71, 85, 105, 0.6)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '0.9rem',
            fontWeight: '500',
            transition: 'all 0.2s ease',
          }}
        >
          Albums
        </button>

        <button
          className="subtab-button"
          onClick={() => setActiveSubTab('songs')}
          style={{
            padding: '8px 16px',
            backgroundColor: activeSubTab === 'songs' ? 'rgba(59, 130, 246, 0.8)' : 'rgba(71, 85, 105, 0.6)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '0.9rem',
            fontWeight: '500',
            transition: 'all 0.2s ease',
          }}
        >
          Songs
        </button>
      </div>

      {activeSubTab == "albums" && (
        <>
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
        </>
      )}

{activeSubTab === 'songs' && (
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div
            style={{
              background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
              padding: '2rem',
              borderRadius: '20px',
              marginTop: '1.5rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              border: '1px solid rgba(148, 163, 184, 0.2)',
            }}
          >
            <h3
              style={{
                marginBottom: '1.5rem',
                color: '#f8fafc',
                fontSize: '1.5rem',
                fontWeight: '600',
                textShadow: '0 2px 4px rgba(0,0,0,0.1)',
                textAlign: 'center',
              }}
            >
              Favorite Songs by Genre
            </h3>

            <div
              style={{
                background: 'rgba(15, 23, 42, 0.6)',
                borderRadius: '16px',
                padding: '1.5rem',
                boxShadow: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
                border: '1px solid rgba(71, 85, 105, 0.3)',
                backdropFilter: 'blur(10px)',
              }}
            >
              {songsLoading ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>Loading favorite songs...</div>
              ) : favoriteSongs.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.7 }}>🎵</div>
                  <p>No favorite songs found yet.</p>
                </div>
              ) : (
                (() => {
                  // Build genre stats
                  const genreStats = {};
                  favoriteSongs.forEach((track) => {
                    const genre = getGenreFromTrack(track) || 'Unknown';
                    if (!genreStats[genre]) {
                      genreStats[genre] = { count: 0, tracks: [], topTrack: null };
                    }
                    genreStats[genre].count += 1;
                    genreStats[genre].tracks.push(track);
                    // top track heuristic (optional)
                    if (!genreStats[genre].topTrack || (track.playcount || 0) > (genreStats[genre].topTrack.playcount || 0)) {
                      genreStats[genre].topTrack = track;
                    }
                  });

                  const total = favoriteSongs.length;
                  const genreData = Object.entries(genreStats)
                    .map(([genre, stats]) => ({
                      genre,
                      count: stats.count,
                      percentage: (stats.count / total) * 100,
                      tracks: stats.tracks,
                      topTrack: stats.topTrack,
                    }))
                    .sort((a, b) => b.count - a.count);

                  // Artist leaderboard for songs (rename to avoid conflicts)
                  const songArtistStats = {};
                  favoriteSongs.forEach((track) => {
                    const artist = track?.artistName || track?.artist_name || track?.artist || 'Unknown';
                    if (!songArtistStats[artist]) songArtistStats[artist] = 0;
                    songArtistStats[artist] += 1;
                  });
                  const artistData = Object.entries(songArtistStats)
                    .map(([artist, count]) => ({ artist, count }))
                    .sort((a, b) => b.count - a.count);

                  // Colors and pie geometry
                  const colors = [
                    '#ef4444',
                    '#f97316',
                    '#eab308',
                    '#22c55e',
                    '#10b981',
                    '#06b6d4',
                    '#3b82f6',
                    '#6366f1',
                    '#8b5cf6',
                    '#a855f7',
                  ];
                  let cumulative = 0;
                  const pieData = genreData.map((item, idx) => {
                    const startAngle = (cumulative / 100) * 360;
                    cumulative += item.percentage;
                    const endAngle = (cumulative / 100) * 360;
                    return { ...item, startAngle, endAngle, color: colors[idx % colors.length] };
                  });

                  const size = 320;
                  const center = size / 2;
                  const radius = 120;

                  const polarToCartesian = (cx, cy, r, angleDeg) => {
                    const a = ((angleDeg - 90) * Math.PI) / 180.0;
                    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
                  };

                  const createPieSlice = (startAngle, endAngle, r) => {
                    const start = polarToCartesian(center, center, r, endAngle);
                    const end = polarToCartesian(center, center, r, startAngle);
                    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
                    return ['M', center, center, 'L', start.x, start.y, 'A', r, r, 0, largeArcFlag, 0, end.x, end.y, 'Z'].join(' ');
                  };

                  return (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '1.25rem', minHeight: '320px' }}>
                      {/* Left: leaderboard + pie */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {/* Leaderboard (separate figure) */}
                        <div
                          style={{
                            background: 'linear-gradient(135deg, #0f172a, #1e293b)',
                            padding: '1rem',
                            borderRadius: 12,
                            border: '1px solid rgba(148,163,184,0.06)',
                          }}
                        >
                          <div style={{ fontSize: '1rem', fontWeight: 700, color: '#e2e8f0', marginBottom: '0.5rem' }}>
                            Top Artists — Most Songs Favorited
                          </div>
                          {artistData.length === 0 ? (
                            <div style={{ color: '#94a3b8' }}>No favorite tracks yet.</div>
                          ) : (
                            <div style={{ display: 'grid', gap: '0.5rem' }}>
                              {artistData.slice(0, 10).map((a, idx) => (
                                <div
                                  key={a.artist}
                                  style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '0.5rem',
                                    borderRadius: 8,
                                    background: 'rgba(15,23,42,0.3)',
                                  }}
                                >
                                  <div style={{ fontWeight: 600, color: '#e2e8f0' }}>
                                    {idx + 1}. {a.artist}
                                  </div>
                                  <div style={{ color: '#94a3b8', fontWeight: 700 }}>{a.count}</div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Pie */}
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem' }}>
                          <svg width={size} height={size}>
                            {pieData.map((slice) => {
                              const isHovered = hoveredSongGenre === slice.genre;
                              const isClicked = clickedSongGenre === slice.genre;
                              const isActive = isHovered || isClicked;
                              return (
                                <path
                                  key={slice.genre}
                                  d={createPieSlice(slice.startAngle, slice.endAngle, radius)}
                                  fill={slice.color}
                                  stroke="rgba(15,23,42,0.8)"
                                  strokeWidth={2}
                                  style={{
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    transform: isActive ? 'scale(1.03)' : 'scale(1)',
                                    transformOrigin: `${center}px ${center}px`,
                                    opacity: (hoveredSongGenre === null && clickedSongGenre === null) || isActive ? 1 : 0.75,
                                  }}
                                  onMouseEnter={() => setHoveredSongGenre(slice.genre)}
                                  onMouseLeave={() => setHoveredSongGenre(null)}
                                  onClick={() => setClickedSongGenre(clickedSongGenre === slice.genre ? null : slice.genre)}
                                />
                              );
                            })}
                          </svg>
                        </div>
                      </div>

                      {/* Right: legend + details */}
                      <div style={{ background: 'rgba(15,23,42,0.6)', borderRadius: 12, padding: '1rem', border: '1px solid rgba(71,85,105,0.2)' }}>
                        {/* Legend */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.5rem', marginBottom: '1rem' }}>
                          {pieData.map((item, i) => {
                            const isActive = hoveredSongGenre === item.genre || clickedSongGenre === item.genre;
                            return (
                              <div
                                key={item.genre}
                                onMouseEnter={() => setHoveredSongGenre(item.genre)}
                                onMouseLeave={() => setHoveredSongGenre(null)}
                                onClick={() => setClickedSongGenre(clickedSongGenre === item.genre ? null : item.genre)}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.6rem',
                                  padding: '0.45rem',
                                  borderRadius: 8,
                                  cursor: 'pointer',
                                  background: isActive ? 'rgba(59,130,246,0.04)' : 'transparent',
                                }}
                              >
                                <div style={{ width: 12, height: 12, background: item.color, borderRadius: 2, flexShrink: 0 }} />
                                <div style={{ fontSize: '0.9rem', color: isActive ? '#e2e8f0' : '#cbd5e1', fontWeight: isActive ? 700 : 500 }}>
                                  {item.genre} ({item.count})
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Details */}
                        {(hoveredSongGenre === null && clickedSongGenre === null) ? (
                          <div style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem' }}>
                            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🎧</div>
                            <div style={{ fontWeight: 600, color: '#e2e8f0' }}>Hover or click a genre</div>
                          </div>
                        ) : (() => {
                          const display = clickedSongGenre || hoveredSongGenre;
                          const info = pieData.find((p) => p.genre === display);
                          if (!info) return null;
                          return (
                            <div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <div style={{ width: 14, height: 14, background: info.color, borderRadius: 3 }} />
                                  <div style={{ color: '#f8fafc', fontWeight: 700 }}>{info.genre}</div>
                                </div>
                                {clickedSongGenre && (
                                  <button onClick={() => setClickedSongGenre(null)} style={{ background: 'rgba(71,85,105,0.35)', border: 'none', color: '#94a3b8', padding: '0.25rem 0.5rem', borderRadius: 6 }}>
                                    ✕
                                  </button>
                                )}
                              </div>

                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', marginBottom: '0.75rem' }}>
                                <div style={{ background: 'rgba(30,41,59,0.4)', padding: '0.75rem', borderRadius: 8, textAlign: 'center' }}>
                                  <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#f8fafc' }}>{info.count}</div>
                                  <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Tracks ({info.percentage.toFixed(1)}%)</div>
                                </div>
                                <div style={{ background: 'rgba(30,41,59,0.4)', padding: '0.75rem', borderRadius: 8, textAlign: 'center' }}>
                                  <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc' }}>{info.topTrack ? (info.topTrack.trackName || info.topTrack.track_name || '—') : '—'}</div>
                                  <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Top Track</div>
                                </div>
                              </div>

                              <div style={{ maxHeight: '220px', overflowY: 'auto', paddingRight: '0.25rem' }}>
                                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#e2e8f0', marginBottom: '0.5rem' }}>Tracks</div>
                                {info.tracks.slice(0, 200).map((t, i) => (
                                  <div key={(t.trackId ?? t.track_id ?? i) + '-' + i} style={{ padding: '0.5rem', borderRadius: 8, background: 'rgba(30,41,59,0.3)', marginBottom: '0.4rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                      <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#f8fafc' }}>{t.trackName ?? t.track_name ?? 'Unknown'}</div>
                                      <div style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>{t.artistName ?? t.artist_name ?? ''}</div>
                                    </div>
                                    <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>{formatDate(t)}</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  );
                })()
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}