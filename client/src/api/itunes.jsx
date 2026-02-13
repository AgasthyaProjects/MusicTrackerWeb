// src/api/itunes.jsx
import { getAlbumListeners, getTrackStats } from "./lastfm";

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenizeQuery(query) {
  const normalized = normalizeText(query);
  return normalized ? normalized.split(" ") : [];
}

function stringMatchScore(text, normalizedQuery, tokens) {
  const hay = normalizeText(text);
  if (!hay) return 0;

  let score = 0;
  if (hay === normalizedQuery) score += 120;
  else if (hay.startsWith(normalizedQuery)) score += 70;
  else if (hay.includes(normalizedQuery)) score += 40;

  const tokenHits = tokens.reduce((acc, token) => acc + (hay.includes(token) ? 1 : 0), 0);
  score += tokenHits * 8;
  return score;
}

function albumRelevanceScore(album, query) {
  const normalizedQuery = normalizeText(query);
  const tokens = tokenizeQuery(query);

  const titleScore = stringMatchScore(album.collectionName, normalizedQuery, tokens);
  const artistScore = stringMatchScore(album.artistName, normalizedQuery, tokens);
  const genreScore = stringMatchScore(album.primaryGenreName, normalizedQuery, tokens) * 0.2;
  const listenerBoost = Math.log10((Number(album.listeners) || 0) + 1) * 12;

  return titleScore * 1.35 + artistScore * 1.1 + genreScore + listenerBoost;
}

function trackRelevanceScore(track, query) {
  const normalizedQuery = normalizeText(query);
  const tokens = tokenizeQuery(query);

  const titleScore = stringMatchScore(track.trackName, normalizedQuery, tokens);
  const artistScore = stringMatchScore(track.artistName, normalizedQuery, tokens);
  const albumScore = stringMatchScore(track.collectionName, normalizedQuery, tokens) * 0.4;
  const listenerBoost = Math.log10((Number(track.listeners) || 0) + 1) * 8;
  const playcountBoost = Math.log10((Number(track.playcount) || 0) + 1) * 6;

  return titleScore * 1.4 + artistScore * 1.1 + albumScore + listenerBoost + playcountBoost;
}

function isValidAlbumItem(album) {
  const name = album.collectionName?.toLowerCase() ?? "";
  const singleSuffixRegex = /\s-\s*single$/i;
  return album.collectionType === "Album" && !singleSuffixRegex.test(name);
}

function dedupeAlbums(results) {
  const seen = new Set();
  return results.filter((album) => {
    if (!isValidAlbumItem(album)) return false;
    const key = `${normalizeText(album.collectionName)}|${normalizeText(album.artistName)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function enrichAndRankAlbums(albums, rankingQuery) {
  let filtered = dedupeAlbums(albums);

  filtered = await Promise.all(
    filtered.map(async (album) => {
      const listeners = await getAlbumListeners(album.artistName, album.collectionName);
      return { ...album, listeners };
    })
  );

  if (!rankingQuery?.trim()) return filtered;

  return filtered
    .map((album, index) => ({
      ...album,
      _searchScore: albumRelevanceScore(album, rankingQuery),
      _initialIndex: index,
    }))
    .sort((a, b) => {
      if (b._searchScore !== a._searchScore) return b._searchScore - a._searchScore;
      if ((b.listeners ?? 0) !== (a.listeners ?? 0)) return (b.listeners ?? 0) - (a.listeners ?? 0);
      return a._initialIndex - b._initialIndex;
    })
    .map(({ _searchScore, _initialIndex, ...album }) => album);
}

export async function searchAlbums(query) {
  if (!query?.trim()) return [];

  const res = await fetch(
    `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=album&country=US&limit=200`
  );
  const data = await res.json();
  const results = Array.isArray(data.results) ? data.results : [];

  return enrichAndRankAlbums(results, query);
}

export async function searchAlbumsByArtist({ artistName, artistId }) {
  if (!artistName?.trim() && !artistId) return [];

  const requests = [];
  if (artistId) {
    requests.push(
      fetch(`https://itunes.apple.com/lookup?id=${encodeURIComponent(artistId)}&entity=album&country=US&limit=200`)
    );
  }

  if (artistName?.trim()) {
    requests.push(
      fetch(
        `https://itunes.apple.com/search?term=${encodeURIComponent(artistName)}&entity=album&attribute=artistTerm&country=US&limit=200`
      )
    );
  }

  const responses = await Promise.all(requests);
  const payloads = await Promise.all(
    responses.map(async (res) => {
      if (!res.ok) return { results: [] };
      return res.json();
    })
  );

  const artistIdNum = Number(artistId);
  const normalizedArtist = normalizeText(artistName);
  const merged = payloads.flatMap((payload) => {
    const rows = Array.isArray(payload.results) ? payload.results : [];
    return rows.filter((item) => {
      if (item.wrapperType && item.wrapperType !== "collection") return false;
      if (item.collectionType !== "Album") return false;

      if (artistIdNum) {
        return Number(item.artistId) === artistIdNum;
      }

      if (!normalizedArtist) return true;
      const itemArtist = normalizeText(item.artistName);
      return itemArtist === normalizedArtist || itemArtist.includes(normalizedArtist);
    });
  });

  const rankingQuery = artistName?.trim() || "";
  return enrichAndRankAlbums(merged, rankingQuery);
}

export async function searchSongs(query, onProgress) {
  if (!query?.trim()) return [];

  currentEnrichmentId++;
  const thisEnrichmentId = currentEnrichmentId;

  const [songTermRes, artistTermRes] = await Promise.all([
    fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&attribute=songTerm&media=music&limit=200&country=US`
    ),
    fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&attribute=artistTerm&media=music&limit=200&country=US`
    ),
  ]);

  if (!songTermRes.ok || !artistTermRes.ok) {
    const failed = !songTermRes.ok ? songTermRes : artistTermRes;
    const text = await failed.text();
    throw new Error(`iTunes error ${failed.status}: ${text}`);
  }

  const [songTermData, artistTermData] = await Promise.all([songTermRes.json(), artistTermRes.json()]);
  const mergedRaw = [
    ...(Array.isArray(songTermData.results) ? songTermData.results : []),
    ...(Array.isArray(artistTermData.results) ? artistTermData.results : []),
  ];

  const seen = new Set();
  const filtered = mergedRaw.filter((t) => {
    const trackName = (t.trackName || "").trim();
    const artist = (t.artistName || "").trim();
    if (!trackName || !artist) return false;

    const key = t.trackId
      ? `id:${t.trackId}`
      : `${trackName.toLowerCase()}|${artist.toLowerCase()}`;

    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const initialResults = filtered
    .map((track, index) => ({
      trackId: track.trackId,
      trackName: track.trackName,
      artistName: track.artistName,
      artistId: track.artistId,
      collectionName: track.collectionName,
      collectionId: track.collectionId,
      releaseDate: track.releaseDate,
      trackTimeMillis: track.trackTimeMillis,
      previewUrl: track.previewUrl,
      trackViewUrl: track.trackViewUrl,
      artworkUrl100: track.artworkUrl100,
      genre: track.primaryGenreName,
      listeners: null,
      playcount: null,
      isEnriching: true,
      _initialIndex: index,
      _searchScore: trackRelevanceScore(track, query),
    }))
    .sort((a, b) => {
      if (b._searchScore !== a._searchScore) return b._searchScore - a._searchScore;
      return a._initialIndex - b._initialIndex;
    });

  if (onProgress && typeof onProgress === "function") {
    enrichInBackground(initialResults, query, onProgress, thisEnrichmentId);
  }

  return initialResults.map(({ _initialIndex, _searchScore, ...track }) => track);
}

let currentEnrichmentId = 0;

async function enrichInBackground(tracks, query, onProgress, enrichmentId) {
  const BATCH_SIZE = 5;
  const enrichedTracks = [...tracks];

  for (let i = 0; i < tracks.length; i += BATCH_SIZE) {
    if (enrichmentId !== currentEnrichmentId) {
      return;
    }

    const chunk = tracks.slice(i, i + BATCH_SIZE);
    const enrichedChunk = await Promise.all(
      chunk.map(async (track, index) => {
        if (enrichmentId !== currentEnrichmentId) {
          return null;
        }

        try {
          const stats = await getTrackStats(track.artistName, track.trackName);
          const enriched = {
            ...track,
            listeners: stats ? Number(stats.listeners) || 0 : 0,
            playcount: stats ? Number(stats.playcount) || 0 : 0,
            isEnriching: false,
          };

          enrichedTracks[i + index] = enriched;
          return enriched;
        } catch (err) {
          console.warn("getTrackStats failed for", track.artistName, track.trackName, err);
          const fallback = {
            ...track,
            listeners: 0,
            playcount: 0,
            isEnriching: false,
          };
          enrichedTracks[i + index] = fallback;
          return fallback;
        }
      })
    );

    if (enrichmentId !== currentEnrichmentId) {
      return;
    }

    if (enrichedChunk.some((result) => result !== null)) {
      const reranked = [...enrichedTracks]
        .map((track, index) => ({
          ...track,
          _searchScore: trackRelevanceScore(track, query),
          _initialIndex: track._initialIndex ?? index,
        }))
        .sort((a, b) => {
          if (b._searchScore !== a._searchScore) return b._searchScore - a._searchScore;
          return a._initialIndex - b._initialIndex;
        })
        .map(({ _searchScore, _initialIndex, ...track }) => track);

      onProgress(reranked, enrichmentId);
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

export async function enrichSingleTrack(track) {
  if (track.listeners !== null && track.playcount !== null && !track.isEnriching) {
    return track;
  }

  try {
    const stats = await getTrackStats(track.artistName, track.trackName);
    return {
      ...track,
      listeners: stats ? Number(stats.listeners) || 0 : 0,
      playcount: stats ? Number(stats.playcount) || 0 : 0,
      isEnriching: false,
    };
  } catch (err) {
    console.warn("getTrackStats failed for", track.artistName, track.trackName, err);
    return {
      ...track,
      listeners: 0,
      playcount: 0,
      isEnriching: false,
    };
  }
}
