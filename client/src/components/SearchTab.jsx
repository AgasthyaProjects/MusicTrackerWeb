import { useEffect, useState } from 'react';
import AlbumCard from './AlbumCard';
import SongCard from './SongCard';
import { searchAlbumsByArtist } from '../api/itunes';

export default function SearchTab({
  albums = [],
  songs = [],
  ratingsLookup = {},
  latestRatedAlbum = null,
  onSearchAlbum,
  onSearchSong,
  onOpenSurvey,
  onSongsUpdate,
}) {
  const [activeSubTab, setActiveSubTab] = useState('albums');
  const [albumQuery, setAlbumQuery] = useState('');
  const [songQuery, setSongQuery] = useState('');
  const [pendingIds, setPendingIds] = useState(new Set());
  const [favoritedTracks, setFavoritedTracks] = useState(new Set());
  const [artistView, setArtistView] = useState({
    isOpen: false,
    artistName: '',
    artistId: null,
    albums: [],
    isLoading: false,
    error: '',
  });

  const handleAlbumSearch = () => {
    onSearchAlbum?.(albumQuery.trim());
  };

  const handleSongSearch = () => {
    onSearchSong?.(songQuery.trim(), (updatedSongs) => {
      onSongsUpdate?.(updatedSongs);
    });
  };

  const handleOpenArtistView = async (artistName, artistId = null) => {
    if (!artistName) return;

    setArtistView({
      isOpen: true,
      artistName,
      artistId,
      albums: [],
      isLoading: true,
      error: '',
    });

    try {
      const results = await searchAlbumsByArtist({ artistName, artistId });
      const hydratedResults = results.map((album) => {
        const rating =
          ratingsLookup[album.collectionName] ??
          ratingsLookup[String(album.collectionId)] ??
          ratingsLookup[album.collectionName?.trim()] ??
          album.rating ??
          null;
        return { ...album, rating };
      });

      setArtistView((prev) => ({
        ...prev,
        albums: hydratedResults,
        isLoading: false,
      }));
    } catch (err) {
      console.error('Failed to load artist albums:', err);
      setArtistView((prev) => ({
        ...prev,
        isLoading: false,
        error: 'Failed to load artist albums.',
      }));
    }
  };

  const handleCloseArtistView = () => {
    setArtistView({
      isOpen: false,
      artistName: '',
      artistId: null,
      albums: [],
      isLoading: false,
      error: '',
    });
  };

  useEffect(() => {
    if (!latestRatedAlbum?.collectionId) return;

    setArtistView((prev) => {
      if (!prev.albums.length) return prev;

      const nextAlbums = prev.albums.map((album) => {
        if (String(album.collectionId) !== String(latestRatedAlbum.collectionId)) {
          return album;
        }

        return {
          ...album,
          rating: latestRatedAlbum.rating,
          favoriteSong: latestRatedAlbum.favoriteSong ?? album.favoriteSong,
          logdatetime: latestRatedAlbum.logdatetime ?? album.logdatetime,
        };
      });

      return {
        ...prev,
        albums: nextAlbums,
      };
    });
  }, [latestRatedAlbum]);

  useEffect(() => {
    setArtistView((prev) => {
      if (!prev.albums.length) return prev;

      const nextAlbums = prev.albums.map((album) => {
        const rating =
          ratingsLookup[album.collectionName] ??
          ratingsLookup[String(album.collectionId)] ??
          ratingsLookup[album.collectionName?.trim()] ??
          album.rating ??
          null;
        return { ...album, rating };
      });

      return {
        ...prev,
        albums: nextAlbums,
      };
    });
  }, [ratingsLookup]);

  const formatDuration = (milliseconds) => {
    if (!milliseconds) return null;
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes > 60) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${hours}h ${mins}m`;
    }
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getGenreFromTrack = (track) => {
    return track.genre || 'Unknown';
  };

  const formatFullReleaseDate = (track) => {
    if (track.release_date) {
      const date = new Date(track.release_date);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    }
    return null;
  };

  const handleFavoriteToggle = async (track, e) => {
    e.preventDefault();
    e.stopPropagation();
    const trackId = String(track.track_id ?? track.trackId ?? '').trim();
    const albumId = String(track.album_id ?? track.collectionId ?? '').trim();

    if (!trackId || !albumId) {
      console.warn('Cannot favorite track without trackId/albumId', track);
      return;
    }

    if (pendingIds.has(trackId)) return;

    const isCurrentlyFavorited = favoritedTracks.has(trackId);
    const action = isCurrentlyFavorited ? 'remove' : 'add';

    // Optimistic update for immediate UI response.
    setFavoritedTracks((prev) => {
      const next = new Set(prev);
      if (action === 'add') next.add(trackId);
      else next.delete(trackId);
      return next;
    });
    setPendingIds((prev) => new Set([...prev, trackId]));

    try {
      const payload = {
        albumId,
        trackId,
        action,
        trackName: track.track_name ?? track.trackName ?? '',
        artistName: track.artist_name ?? track.artistName ?? '',
        albumName: track.album_name ?? track.collectionName ?? '',
        artworkUrl: (track.artwork_url ?? track.artworkUrl100 ?? '').replace('100x100', '500x500'),
        duration: track.durations_ms ?? track.trackTimeMillis ?? null,
        releaseDate: track.release_date ?? track.releaseDate ?? null,
        listeners: track.listeners ?? 0,
        playcount: track.playcount ?? 0,
        genre: track.genre ?? null,
      };

      const res = await fetch('/api/favoriteTracks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok || !data?.success) {
        throw new Error(data?.error || `Favorite API failed (${res.status})`);
      }
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
      // Rollback optimistic change on failure.
      setFavoritedTracks((prev) => {
        const next = new Set(prev);
        if (action === 'add') next.delete(trackId);
        else next.add(trackId);
        return next;
      });
    } finally {
      setPendingIds((prev) => {
        const copy = new Set(prev);
        copy.delete(trackId);
        return copy;
      });
    }
  };

  const renderSongsGrid = (tracks) => (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: 16,
        marginBottom: '1rem',
      }}
    >
      {tracks.length ? (
        tracks.map((track, index) => {
          const normalizedTrack = {
            ...track,
            track_id: String(track.trackId ?? track.track_id ?? ''),
            track_name: track.trackName || track.track_name,
            artist_name: track.artistName || track.artist_name,
            artist_id: track.artistId || track.artist_id,
            album_name: track.collectionName || track.album_name,
            album_id: String(track.collectionId ?? track.album_id ?? ''),
            artwork_url: track.artworkUrl100 || track.artwork_url,
            durations_ms: track.trackTimeMillis || track.durations_ms,
            release_date: track.releaseDate || track.release_date,
            listeners: track.listeners,
            playcount: track.playcount,
          };

          const isPending = pendingIds.has(normalizedTrack.track_id);
          const isFav = favoritedTracks.has(normalizedTrack.track_id);
          const genre = getGenreFromTrack(normalizedTrack);
          const fullReleaseDate = formatFullReleaseDate(normalizedTrack);
          const trackduration = formatDuration(normalizedTrack.durations_ms);

          const uniqueKey = normalizedTrack.track_id
            || `${normalizedTrack.artist_name || 'unknown'}-${normalizedTrack.track_name || 'unknown'}-${normalizedTrack.album_name || 'unknown'}-${index}`
            || `song-${index}`;

          return (
            <SongCard
              key={uniqueKey}
              track={normalizedTrack}
              isPending={isPending}
              isFav={isFav}
              onUnfavorite={handleFavoriteToggle}
              onArtistClick={handleOpenArtistView}
              genre={genre}
              fullReleaseDate={fullReleaseDate}
              trackduration={trackduration}
            />
          );
        })
      ) : (
        <p>No songs yet - try a search.</p>
      )}
    </div>
  );

  return (
    <section>
      <div className="tab-buttons" style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button className="subtab-button" onClick={() => setActiveSubTab('albums')}>
          Albums
        </button>
        <button className="subtab-button" onClick={() => setActiveSubTab('songs')}>
          Songs
        </button>
      </div>

      <div className="search-container" style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {activeSubTab === 'albums' ? (
          <>
            <input
              type="text"
              value={albumQuery}
              onChange={(e) => setAlbumQuery(e.target.value)}
              placeholder="Search for albums or artists..."
              onKeyUp={(e) => e.key === 'Enter' && handleAlbumSearch()}
            />
            <button className="search-button" onClick={handleAlbumSearch}>Search</button>
          </>
        ) : (
          <>
            <input
              type="text"
              value={songQuery}
              onChange={(e) => setSongQuery(e.target.value)}
              placeholder="Search for songs or artists..."
              onKeyUp={(e) => e.key === 'Enter' && handleSongSearch()}
            />
            <button className="search-button" onClick={handleSongSearch}>Search</button>
          </>
        )}
      </div>

      {activeSubTab === 'albums' ? (
        <div className="album-grid" style={{ marginBottom: '1rem' }}>
          {albums.length ? (
            albums.map((album) => (
              <AlbumCard
                key={album.collectionId ?? `${album.artist}-${album.name}`}
                album={album}
                onArtistClick={handleOpenArtistView}
                onOpenSurvey={() => onOpenSurvey?.(album)}
              />
            ))
          ) : (
            <p>No albums yet - try a search.</p>
          )}
        </div>
      ) : (
        renderSongsGrid(songs)
      )}

      {artistView.isOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(2, 6, 23, 0.78)',
            zIndex: 1200,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '1.5rem',
          }}
          onClick={handleCloseArtistView}
        >
          <div
            style={{
              width: 'min(1200px, 100%)',
              maxHeight: '90vh',
              overflowY: 'auto',
              background: 'linear-gradient(180deg, #0f172a 0%, #020617 100%)',
              border: '1px solid #334155',
              borderRadius: 16,
              padding: '1.2rem',
              boxShadow: '0 24px 48px rgba(0, 0, 0, 0.45)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem',
                gap: '1rem',
              }}
            >
              <div>
                <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#f8fafc' }}>
                  {artistView.artistName}
                </h2>
                <p style={{ margin: '0.25rem 0 0 0', color: '#94a3b8', fontSize: '0.9rem' }}>
                  Artist albums
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseArtistView}
                style={{
                  border: '1px solid #475569',
                  background: '#1e293b',
                  color: '#f8fafc',
                  borderRadius: 10,
                  padding: '0.55rem 0.85rem',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Close
              </button>
            </div>

            {artistView.isLoading ? (
              <p style={{ color: '#94a3b8', margin: 0 }}>Loading albums...</p>
            ) : artistView.error ? (
              <p style={{ color: '#fca5a5', margin: 0 }}>{artistView.error}</p>
            ) : artistView.albums.length ? (
              <div className="album-grid" style={{ marginBottom: 0 }}>
                {artistView.albums.map((album) => (
                  <AlbumCard
                    key={`artist-${album.collectionId ?? `${album.artistName}-${album.collectionName}`}`}
                    album={album}
                    onArtistClick={handleOpenArtistView}
                    onOpenSurvey={() => onOpenSurvey?.(album)}
                  />
                ))}
              </div>
            ) : (
              <p style={{ color: '#94a3b8', margin: 0 }}>No albums found for this artist.</p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
