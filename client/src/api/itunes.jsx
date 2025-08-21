export async function searchAlbums(query) {
  const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=album&limit=200`);
  const data = await res.json();

  const seen = new Set();
  const filtered = (data.results ?? []).filter(album => {
    const name = album.collectionName?.toLowerCase() ?? '';
    const key = `${album.collectionName}-${album.artistName}`;
    const singleRegex = /[-–—]\s*single/i;

    return (
      album.collectionType === 'Album' &&
      !singleRegex.test(name) &&
      !seen.has(key) &&
      seen.add(key)
    );
  });

  return filtered;
}
