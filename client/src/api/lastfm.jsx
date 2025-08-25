// lastfm.js
const API_KEY = "c232e162878fbba571bbc6333143f41e";

export async function getAlbumListeners(artist, album) {
  const url = `https://ws.audioscrobbler.com/2.0/?method=album.getinfo&api_key=${API_KEY}&artist=${encodeURIComponent(artist)}&album=${encodeURIComponent(album)}&format=json`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    if (data?.album?.listeners) {
      return parseInt(data.album.listeners, 10);
    } else {
      return 0; // fallback if not found
    }
  } catch (err) {
    console.error("Error fetching listeners:", err);
    return 0;
  }
}

export async function getTrackStats(artist, track) {
  const url = `https://ws.audioscrobbler.com/2.0/?method=track.getInfo&api_key=${API_KEY}&artist=${encodeURIComponent(artist)}&track=${encodeURIComponent(track)}&format=json`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data?.track) {
      return {
        listeners: parseInt(data.track.listeners ?? "0", 10),
        playcount: parseInt(data.track.playcount ?? "0", 10),
      };
    } else {
      return { listeners: 0, playcount: 0 }; // fallback if not found
    }
  } catch (err) {
    console.error("Error fetching track stats:", err);
    return { listeners: 0, playcount: 0 };
  }
}