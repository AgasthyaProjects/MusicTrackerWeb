// src/api/itunes.jsx
import { getAlbumListeners } from "./lastfm";

export async function searchAlbums(query) {
  const res = await fetch(
    `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=album&limit=200`
  );
  const data = await res.json();

  const seen = new Set();
  let filtered = (data.results ?? []).filter((album) => {
    const name = album.collectionName?.toLowerCase() ?? "";
    const key = `${album.collectionName}-${album.artistName}`;
    const singleRegex = /[-–—]\s*single/i;

    return (
      album.collectionType === "Album" &&
      !singleRegex.test(name) &&
      !seen.has(key) &&
      seen.add(key)
    );
  });

  // Enrich with listener counts from Last.fm
  filtered = await Promise.all(
    filtered.map(async (album) => {
      const listeners = await getAlbumListeners(
        album.artistName,
        album.collectionName
      );
      return { ...album, listeners };
    })
  );

  // Sort by popularity
  filtered.sort((a, b) => b.listeners - a.listeners);

  return filtered;
}
