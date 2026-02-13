import React, { useEffect, useRef, useState } from 'react';
import { getTrackStats } from '../api/lastfm';

export default function AlbumCard({
  album,
  onOpenSurvey,
  onArtistClick,
  onRatingClick,
  isDeleteMode,
  isSelected,
  onSelect
}) {
  const [showBack, setShowBack] = useState(false);
  const [tracks, setTracks] = useState([]);
  const [loadingTracks, setLoadingTracks] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // favorites: Set of string trackIds
  const [favoriteTrackIds, setFavoriteTrackIds] = useState(new Set());
  // pending requests (trackId strings)
  const [pendingTrackIds, setPendingTrackIds] = useState(new Set());

  // favorite-fetch bookkeeping
  const [favoritesLoading, setFavoritesLoading] = useState(false);
  const [favoritesLoaded, setFavoritesLoaded] = useState(false);
  const favFetchCounter = useRef(0); // prevent stale response overwrite

  // Helper: localStorage key per album
  const LOCAL_KEY = (albumId) => `favorites-${String(albumId)}`;

  // --- Fetch album tracks (from iTunes) ---
  const fetchAlbumDetails = async (collectionId) => {
    try {
      const res = await fetch(`https://itunes.apple.com/lookup?id=${collectionId}&entity=song`);
      const data = await res.json();
      if (data?.resultCount > 0) {
        const _tracks = data.results.slice(1);
        return _tracks;
      }
      return [];
    } catch (err) {
      console.error('Error fetching album details:', err);
      return [];
    }
  };

  // --- Load cached favorites from localStorage (fast) ---
  const loadFavoritesFromCache = (albumId) => {
    if (!albumId) return;
    try {
      const raw = localStorage.getItem(LOCAL_KEY(albumId));
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setFavoriteTrackIds(new Set(parsed.map(String)));
      }
    } catch (e) {
      console.warn('Failed to load favorites from cache', e);
    }
  };

  // --- Persist favorites to localStorage ---
  const persistFavoritesToCache = (albumId, set) => {
    if (!albumId) return;
    try {
      localStorage.setItem(LOCAL_KEY(albumId), JSON.stringify(Array.from(set)));
    } catch (e) {
      console.warn('Failed to save favorites to cache', e);
    }
  };

  // --- Fetch favorites for this album from server (authoritative) ---
  const fetchFavoritesFromServer = async (albumId) => {
    if (!albumId) return;
    const reqId = ++favFetchCounter.current;
    setFavoritesLoading(true);

    try {
      const resp = await fetch(`/api/favoriteTracks/album/${albumId}`);
      if (!resp.ok) {
        console.warn('Failed to fetch favorites from server:', resp.status);
        setFavoritesLoading(false);
        return;
      }
      const data = await resp.json();
      // ignore stale fetch results
      if (reqId !== favFetchCounter.current) return;

      const favs = data?.favorites ?? null;
      if (Array.isArray(favs)) {
        const favoriteSet = new Set(favs.map(f => String(f.trackId ?? f.track_id ?? f)));
        setFavoriteTrackIds(favoriteSet);
        persistFavoritesToCache(albumId, favoriteSet);
        setFavoritesLoaded(true);
      } else {
        // server didn't send favorites array; keep current cache/state
      }
    } catch (e) {
      console.error('Error loading favorites from server', e);
    } finally {
      setFavoritesLoading(false);
    }
  };

  // --- Public: lazy load favorites + tracks when flipping open ---
  const openCardBack = async () => {
    // if already showing back, nothing
    if (showBack) return;

    // show back immediately (so user sees animation/layout)
    setShowBack(true);

    // quick: load cache for immediate star display
    loadFavoritesFromCache(album.collectionId);

    // Fetch tracks if not loaded yet
    if (tracks.length === 0) {
      setLoadingTracks(true);
      const loaded = await fetchAlbumDetails(album.collectionId);
      setTracks(loaded);
      setLoadingTracks(false);
      setInitialLoading(false);
    }

    // Now authoritative fetch of favorites (server) so UI reconciles
    await fetchFavoritesFromServer(album.collectionId);
  };

  // --- Helper safe re-sync (used on server reject) ---
  const loadFavoriteTracksForAlbumSafe = async (albumId) => {
    return await fetchFavoritesFromServer(albumId);
  };

  // --- Toggle favorite for a track (optimistic, then reconcile) ---
  // Replace your existing handleTrackFavorite with this:
// Replace your existing handleTrackFavorite with this function:
const handleTrackFavorite = async (trackIdRaw, e, track = null) => {
  e?.preventDefault();
  e?.stopPropagation();

  const trackId = String(trackIdRaw ?? '').trim();
  if (!trackId || !album?.collectionId) return;

  // guard: don't duplicate concurrent requests for same track
  if (pendingTrackIds.has(trackId)) return;

  const wasFavorited = favoriteTrackIds.has(trackId);
  const intendedAction = wasFavorited ? 'remove' : 'add';

  // optimistic update
  setFavoriteTrackIds(prev => {
    const next = new Set(prev);
    if (next.has(trackId)) next.delete(trackId);
    else next.add(trackId);
    return next;
  });

  // persist optimistic to cache for fast cross-view
  persistFavoritesToCache(album.collectionId, new Set([...Array.from(favoriteTrackIds), ...(wasFavorited ? [] : [trackId])]));

  // mark pending
  setPendingTrackIds(prev => {
    const next = new Set(prev);
    next.add(trackId);
    return next;
  });
  const songdata = getTrackStats(album.artistName, track?.trackName ?? track?.name ?? '');
  
  const listeners = (await songdata).listeners || 0;
  const playcount = (await songdata).playcount || 0;
  const payloadBase = {
    albumId: String(album.collectionId),
    trackId,
    trackName: (track && track.trackName) ? track.trackName : (track?.name ?? ''),
    artistName: album.artistName ?? '',
    albumName: album.collectionName ?? '',
    artworkUrl: (album.artworkUrl100 || album.artworkUrl || '').replace('100x100', '500x500'),
    duration: track?.trackTimeMillis ?? null,
    releaseDate: track.releaseDate ?? null,
    listeners,    
    playcount,
    genre: album.primaryGenreName || null
  };

  let didRetry = false;

  try {
    const doPost = async (action) => {
      const resp = await fetch('/api/favoriteTracks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payloadBase, action })
      });

      let result = null;
      try { result = await resp.json(); } catch (parseErr) {
        console.error('Failed to parse /api/favoriteTracks JSON', parseErr);
      }


      return { resp, result };
    };

    // first attempt (the intended action)
    const { resp, result } = await doPost(intendedAction);

    if (!resp.ok) {
      // HTTP-level error -> rollback & re-sync
      throw new Error(`HTTP ${resp.status}`);
    }

    // success: false -> backend refused; rollback & re-sync
    if (result && typeof result.success !== 'undefined' && result.success === false) {
      console.warn('Server responded success:false', result);
      // rollback optimistic
      setFavoriteTrackIds(prev => {
        const next = new Set(prev);
        if (wasFavorited) next.add(trackId);
        else next.delete(trackId);
        return next;
      });
      await loadFavoriteTracksForAlbumSafe(album.collectionId);
      // optional: surface reason from result.error
      console.warn('Server error detail:', result.error ?? result.message ?? result);
      return;
    }

    // success:true path
    if (result && typeof result.added !== 'undefined') {
      // If we intended to ADD but server says added:false, that's suspicious -> verify & retry once
      if (intendedAction === 'add' && result.added === false) {
        console.warn('Server returned added:false while we tried to add — double-checking server state');
        // re-sync authoritative list
        await loadFavoriteTracksForAlbumSafe(album.collectionId);

        // after re-sync, if track still not present, attempt one explicit retry to add
        const isNowFav = favoriteTrackIds.has(trackId);
        if (!isNowFav && !didRetry) {
          didRetry = true;
          const { resp: resp2, result: result2 } = await doPost('add');

          if (!resp2.ok) {
            console.error('Retry HTTP error', resp2.status);
            // rollback optimistic & re-sync
            setFavoriteTrackIds(prev => {
              const next = new Set(prev);
              if (wasFavorited) next.add(trackId);
              else next.delete(trackId);
              return next;
            });
            await loadFavoriteTracksForAlbumSafe(album.collectionId);
            return;
          }

          if (result2 && typeof result2.success !== 'undefined' && result2.success === false) {
            console.warn('Retry also failed:', result2);
            // rollback optimistic and re-sync
            setFavoriteTrackIds(prev => {
              const next = new Set(prev);
              if (wasFavorited) next.add(trackId);
              else next.delete(trackId);
              return next;
            });
            await loadFavoriteTracksForAlbumSafe(album.collectionId);
            return;
          }

          // If retry succeeded and result2.added exists, reconcile to it
          if (result2 && typeof result2.added !== 'undefined') {
            setFavoriteTrackIds(prev => {
              const next = new Set(prev);
              if (result2.added) next.add(trackId);
              else next.delete(trackId);
              persistFavoritesToCache(album.collectionId, next);
              return next;
            });
            return;
          }

          // otherwise, fallback to resync
          await loadFavoriteTracksForAlbumSafe(album.collectionId);
          return;
        }

        // if isNowFav was true (server already had it), we're done.
        return;
      }

      // Normal success: reconcile to server `added`
      setFavoriteTrackIds(prev => {
        const next = new Set(prev);
        if (result.added) next.add(trackId);
        else next.delete(trackId);
        // persist authoritative state
        persistFavoritesToCache(album.collectionId, next);
        return next;
      });
      return;
    }

    // If server didn't provide added flag, re-sync
    await loadFavoriteTracksForAlbumSafe(album.collectionId);
  } catch (err) {
    console.error('Error toggling favorite:', err);
    // rollback optimistic
    setFavoriteTrackIds(prev => {
      const next = new Set(prev);
      if (wasFavorited) next.add(trackId);
      else next.delete(trackId);
      return next;
    });
    await loadFavoriteTracksForAlbumSafe(album.collectionId);
  } finally {
    // clear pending
    setPendingTrackIds(prev => {
      const next = new Set(prev);
      next.delete(trackId);
      return next;
    });
  }
};


  const isInteractiveTarget = (e) => {
    return (
      e?.target?.tagName === 'BUTTON' ||
      e?.target?.tagName === 'A' ||
      e?.target?.closest?.('button') ||
      e?.target?.closest?.('a') ||
      e?.target?.closest?.('.music-platforms') ||
      e?.target?.classList?.contains('music-platform-btn') ||
      e?.target?.closest?.('.track-favorite-star')
    );
  };

  const handleBackCardClick = (e) => {
    if (isDeleteMode) {
      e?.preventDefault();
      e?.stopPropagation();
      onSelect?.();
      return;
    }

    if (isInteractiveTarget(e)) {
      return;
    }

    e?.preventDefault();
    e?.stopPropagation();
    setShowBack(false);
  };

  const handleArtworkFlip = async (e) => {
    e?.preventDefault();
    e?.stopPropagation();

    if (isDeleteMode) {
      onSelect?.();
      return;
    }

    await openCardBack();
  };

  // --- helpers for UI formatting ---
  const formatDuration = (milliseconds) => {
    if (!milliseconds) return null;
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes > 60) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${hours}h ${mins}m`;
    } else {
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
  };

  const getReleaseYear = (releaseDate) => {
    if (!releaseDate) return null;
    try {
      return new Date(releaseDate).getFullYear();
    } catch {
      return null;
    }
  };

  const getTotalAlbumDuration = (tracksList) => {
    if (!tracksList || tracksList.length === 0) return null;
    const totaldur = tracksList.reduce((total, t) => total + (t.trackTimeMillis || 0), 0);
    return formatDuration(totaldur);
  };

  const handleAppleMusicClick = (e) => {
    e?.preventDefault();
    e?.stopPropagation();
    window.open(album.collectionViewUrl, '_blank', 'noopener,noreferrer');
  };
  const handleSpotifyClick = (e) => {
    e?.preventDefault();
    e?.stopPropagation();
    const query = encodeURIComponent(`${album.collectionName} ${album.artistName}`);
    window.open(`https://open.spotify.com/search/${query}`, '_blank', 'noopener,noreferrer');
  };
  const handleYouTubeClick = (e) => {
    e?.preventDefault();
    e?.stopPropagation();
    const query = encodeURIComponent(`${album.collectionName} ${album.artistName} full album`);
    window.open(`https://www.youtube.com/results?search_query=${query}`, '_blank', 'noopener,noreferrer');
  };

  const handleArtistNameClick = (e) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (onArtistClick && album?.artistName) {
      onArtistClick(album.artistName, album.artistId);
    }
  };

  // Loading overlay while tracks are being fetched
  if (loadingTracks) {
    return (
      <div className="album-card" style={{
        display: 'flex', flexDirection: 'column', height: '100%', position: 'relative',
        cursor: 'wait', transform: isSelected ? 'scale(0.95)' : 'scale(1)', opacity: 0.7,
        transition: 'all 0.2s ease', border: isSelected ? '2px solid #ef4444' : '2px solid transparent',
        borderRadius: '18px', padding: isSelected ? '0.5rem' : '0', alignItems: 'center',
        justifyContent: 'center', backgroundColor: '#1e293b'
      }}>
        <div style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Loading tracklist...</div>
      </div>
    );
  }

  // Back/tracklist view (shows favorites which were loaded when opening)
  if (showBack && tracks.length > 0) {
    return (
      <div className="album-card" style={{
        display: 'flex', flexDirection: 'column', height: '100%', position: 'relative',
        cursor: 'pointer', transform: isSelected ? 'scale(0.95)' : 'scale(1)',
        opacity: isDeleteMode && !isSelected ? 0.6 : 1, transition: 'all 0.2s ease',
        border: isSelected ? '2px solid #ef4444' : '2px solid transparent', borderRadius: '18px',
        padding: isSelected ? '0.5rem' : '0'
      }} onClick={handleBackCardClick}>
        <div style={{
          display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#1e293b',
          borderRadius: '16px', padding: '1rem', boxShadow: '0 8px 32px rgba(0,0,0,0.3), 0 2px 8px rgba(0,0,0,0.2)'
        }}>
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <h3 style={{ fontWeight: 700, fontSize: '1.1rem', color: '#f1f5f9', margin: 0, flex: 1, minWidth: 0 }}>
                {album.collectionName}
              </h3>
              <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowBack(false); }}
                style={{
                  background: 'rgba(148,163,184,0.2)', border: 'none', borderRadius: '50%',
                  width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: '#94a3b8', fontSize: '16px', flexShrink: 0, marginLeft: '0.5rem'
                }}>×</button>
            </div>
            <button
              type="button"
              onClick={handleArtistNameClick}
              style={{
                fontSize: '0.9rem',
                color: '#93c5fd',
                margin: 0,
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: onArtistClick ? 'pointer' : 'default',
                textAlign: 'left',
                textDecoration: onArtistClick ? 'underline' : 'none',
                textUnderlineOffset: '2px'
              }}
            >
              {album.artistName}
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', marginBottom: '1rem' }}>
            {tracks.map((track, index) => {
              const tId = String(track.trackId ?? `${index}`);
              const isFav = favoriteTrackIds.has(tId);
              const isPending = pendingTrackIds.has(tId);

              return (
                <div key={tId} style={{
                  display: 'flex', alignItems: 'center', padding: '0.5rem 0',
                  borderBottom: index < tracks.length - 1 ? '1px solid rgba(148,163,184,0.06)' : 'none',
                  transition: 'all 0.12s ease', borderRadius: '6px', marginBottom: '2px',
                  background: isFav ? 'rgba(239,68,68,0.04)' : 'transparent'
                }}>
                  <button
                    className="track-favorite-star"
                    onClick={(e) => handleTrackFavorite(tId, e, track)}
                    disabled={isPending}
                    style={{
                      background: 'none', border: 'none', cursor: isPending ? 'default' : 'pointer',
                      padding: '4px', marginRight: '0.5rem', borderRadius: '4px', display: 'flex',
                      alignItems: 'center', justifyContent: 'center', transition: 'all 0.12s ease',
                      fontSize: '16px', width: '28px', height: '28px',
                      color: isFav ? '#ef4444' : '#64748b',
                      transform: isFav ? 'scale(1.07)' : 'scale(1)',
                      opacity: isPending ? 0.6 : 1
                    }}
                    title={isFav ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    {isPending ? '…' : (isFav ? '★' : '☆')}
                  </button>

                  <span style={{ fontSize: '0.8rem', color: '#64748b', minWidth: '2rem', textAlign: 'right', marginRight: '0.75rem' }}>
                    {track.trackNumber || index + 1}
                  </span>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      fontSize: '0.85rem', color: '#f1f5f9', margin: 0,
                      fontWeight: isFav ? '600' : '500', overflow: 'hidden', textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap', transition: 'all 0.12s ease'
                    }}>{track.trackName}</p>
                  </div>

                  {track.trackTimeMillis && (
                    <span style={{ fontSize: '0.8rem', color: '#64748b', marginLeft: '0.5rem', flexShrink: 0 }}>
                      {formatDuration(track.trackTimeMillis)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowBack(false); }} style={{
            padding: '0.75rem 1rem', fontSize: '0.9rem', fontWeight: '600', borderRadius: '12px', border: 'none',
            cursor: 'pointer', backgroundColor: '#475569', color: '#fff', transition: 'all 0.2s ease', marginTop: 'auto'
          }}>← Back to Album</button>
        </div>
      </div>
    );
  }

  // Front view
  return (
    <div className="album-card" style={{
      display: 'flex', flexDirection: 'column', height: '100%', position: 'relative',
      cursor: isDeleteMode ? 'pointer' : 'pointer', transform: isSelected ? 'scale(0.95)' : 'scale(1)',
      opacity: isDeleteMode && !isSelected ? 0.6 : 1, transition: 'all 0.2s ease',
      border: isSelected ? '2px solid #ef4444' : '2px solid transparent', borderRadius: '18px',
      padding: isSelected ? '0.5rem' : '0'
    }}>

      {isDeleteMode && (
        <div style={{
          position: 'absolute', top: '0.5rem', right: '0.5rem', width: '24px', height: '24px', borderRadius: '50%',
          background: isSelected ? '#ef4444' : 'rgba(0,0,0,0.5)', border: isSelected ? 'none' : '2px solid #fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10, cursor: 'pointer'
        }} onClick={(e) => { e.preventDefault(); e.stopPropagation(); onSelect?.(); }}>
          {isSelected && <span style={{ color: '#fff', fontSize: '14px', fontWeight: 'bold' }}>✓</span>}
        </div>
      )}

      <button
        className="album-artwork-button"
        type="button"
        onClick={handleArtworkFlip}
        style={{
          border: 'none',
          background: 'transparent',
          padding: 0,
          marginBottom: '1rem',
          width: '100%',
          cursor: isDeleteMode ? 'pointer' : 'zoom-in',
          borderRadius: '16px',
        }}
      >
        <img src={album.artworkUrl100 ? album.artworkUrl100.replace('100x100', '500x500') : '/placeholder.png'}
          alt={album.collectionName}
          style={{
            width: '100%', height: 'auto', aspectRatio: '1', objectFit: 'cover', borderRadius: '16px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3), 0 2px 8px rgba(0,0,0,0.2)', transition: 'all 0.3s ease'
          }} />
      </button>

      <div style={{ textAlign: 'center', flex: '1', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <h3 style={{
          marginBottom: '0.5rem', fontWeight: 700, fontSize: '1.1rem', lineHeight: '1.3', color: '#f1f5f9',
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'
        }}>{album.collectionName}</h3>

        <button
          type="button"
          onClick={handleArtistNameClick}
          style={{
            marginBottom: '0.75rem',
            fontSize: '0.9rem',
            color: '#93c5fd',
            lineHeight: '1.4',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: onArtistClick ? 'pointer' : 'default',
            textDecoration: onArtistClick ? 'underline' : 'none',
            textUnderlineOffset: '2px',
            alignSelf: 'center'
          }}
        >
          {album.artistName}
        </button>

        <div style={{ alignContent: 'center', marginBottom: 'auto', paddingBottom: '0.75rem' }}>
          {(album.primaryGenreName || getReleaseYear(album.releaseDate) || getTotalAlbumDuration(tracks)) && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.5rem',
              flexWrap: 'wrap'
            }}>
              {album.primaryGenreName && (<span style={{
                fontSize: '0.75rem', color: '#60a5fa', backgroundColor: 'rgba(96,165,250,0.1)',
                padding: '0.25rem 0.5rem', borderRadius: '6px', fontWeight: '500', border: '1px solid rgba(96,165,250,0.2)'
              }}>{album.primaryGenreName}</span>)}
              {getReleaseYear(album.releaseDate) && (<span style={{
                fontSize: '0.75rem', color: '#a78bfa', backgroundColor: 'rgba(167,139,250,0.1)',
                padding: '0.25rem 0.5rem', borderRadius: '6px', fontWeight: '500', border: '1px solid rgba(167,139,250,0.2)'
              }}>{getReleaseYear(album.releaseDate)}</span>)}
              {getTotalAlbumDuration(tracks) && (<span style={{
                fontSize: '0.75rem', color: '#34d399', backgroundColor: 'rgba(52,211,153,0.1)',
                padding: '0.25rem 0.5rem', borderRadius: '6px', fontWeight: '500', border: '1px solid rgba(52,211,153,0.2)'
              }}>{getTotalAlbumDuration(tracks)}</span>)}
              {album.listeners > 0 && (<span style={{
                fontSize: '0.75rem', color: '#f87171', backgroundColor: 'rgba(248,113,113,0.1)',
                padding: '0.25rem 0.5rem', borderRadius: '6px', fontWeight: '500', border: '1px solid rgba(248,113,113,0.2)'
              }}>{album.listeners.toLocaleString()} listeners</span>)}
            </div>
          )}
        </div>

        {album.rating && album.favoriteSong && (
          <div style={{
            marginTop: '0.75rem', marginLeft: 'auto', marginRight: 'auto', padding: '0.75rem',
            background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '10px',
            position: 'relative', width: 'fit-content', maxWidth: '300px', flex: 'none'
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', color: '#f59e0b', fontWeight: '600', whiteSpace: 'nowrap' }}>
                Favorite Song:
              </span>
              <span style={{ fontSize: '0.8rem', color: '#f1f5f9', fontWeight: '500', wordBreak: 'break-word', lineHeight: '1.2' }}>
                {album.favoriteSong}
              </span>
            </div>
          </div>
        )}
      </div>

      <div style={{ marginTop: 'auto', paddingTop: '1rem' }}>
        {!isDeleteMode && (
          <div className="music-platforms">
            <button className="music-platform-btn apple-music-btn" onClick={handleAppleMusicClick}>
              <img src="/applelogo.png" alt="Apple Music" />
            </button>
            <button className="music-platform-btn spotify-btn" onClick={handleSpotifyClick}>
              <img src="/spotify-icon.png" alt="Spotify" />
            </button>
            <button className="music-platform-btn youtube-btn" onClick={handleYouTubeClick}>
              <img src="/youtube-icon.png" alt="YouTube" />
            </button>
          </div>
        )}

        {isDeleteMode ? (
          <div onClick={(e) => { e.preventDefault(); e.stopPropagation(); onSelect?.(); }} style={{
            display: 'block', width: '100%', padding: '0.75rem 1rem', fontSize: '0.9rem', fontWeight: '600',
            borderRadius: '12px', border: '2px dashed #ef4444', backgroundColor: isSelected ? 'rgba(239,68,68,0.1)' : 'rgba(107,114,128,0.1)',
            color: isSelected ? '#ef4444' : '#6b7280', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s ease'
          }}>
            {isSelected ? '✓ Selected for Deletion' : 'Click to Select'}
          </div>
        ) : (
          <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (onOpenSurvey) onOpenSurvey(album); }}
            className={`album-rate-button${album.rating ? ' rated' : ''}`}
            style={{
              display: 'block', width: 'calc(100% - 1rem)', margin: '0 auto', padding: '0.875rem 1.25rem',
              fontSize: '0.9rem', fontWeight: '600', borderRadius: '16px', border: 'none', cursor: 'pointer',
              backgroundColor: album.rating ? '#10b981' : '#3b82f6', color: '#fff', transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
              boxShadow: album.rating ? '0 4px 14px rgba(16,185,129,0.3)' : '0 4px 14px rgba(59,130,246,0.3)', zIndex: 10, position: 'relative'
            }}
            onMouseEnter={(e) => {
              if (album.rating) { e.target.style.backgroundColor = '#059669'; e.target.style.transform = 'translateY(-2px)'; }
              else { e.target.style.backgroundColor = '#2563eb'; e.target.style.transform = 'translateY(-2px)'; }
            }}
            onMouseLeave={(e) => {
              if (album.rating) { e.target.style.backgroundColor = '#10b981'; e.target.style.transform = 'translateY(0)'; }
              else { e.target.style.backgroundColor = '#3b82f6'; e.target.style.transform = 'translateY(0)'; }
            }}
          >
            {album.rating ? `⭐ ${album.rating}/10` : 'Rate Album'}
          </button>
        )}
      </div>
    </div>
  );
}
