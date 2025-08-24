import { useState, useEffect, useMemo } from 'react';
import { searchAlbums } from '../api/itunes';

export const useAlbumData = () => {
  const [albums, setAlbums] = useState([]);
  const [loggedAlbums, setLoggedAlbums] = useState([]);
  const [ratingsMap, setRatingsMap] = useState({});
  const [selectedAlbumIds, setSelectedAlbumIds] = useState(new Set());
  const [isDeleteMode, setIsDeleteMode] = useState(false);

  useEffect(() => {
    fetchRatings();
  }, []);

  const fetchRatings = async () => {
    try {
      const res = await fetch('/api/survey/rated');
      const data = await res.json();
      const albums = data.albums || [];
      setLoggedAlbums(albums);

      const map = {};
      albums.forEach(a => {
        map[a.collectionName] = a.rating;
        map[String(a.collectionId)] = a.rating;
        const normalizedName = a.collectionName?.trim();
        if (normalizedName && normalizedName !== a.collectionName) {
          map[normalizedName] = a.rating;
        }
      });

      setRatingsMap(map);
      return map;
    } catch (err) {
      console.error('Failed to fetch ratings', err);
      return {};
    }
  };

  const handleSearch = async (query) => {
    const results = await searchAlbums(query);
    const enriched = results.map((album) => {
      let rating = ratingsMap[album.collectionName] ||
        ratingsMap[String(album.collectionId)] ||
        ratingsMap[album.collectionName?.trim()] ||
        null;
      return { ...album, rating };
    });
    return enriched;
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
    return selectedAlbumIds.size > 0;
  };

  const confirmDelete = async () => {
    try {
      await Promise.all(
        Array.from(selectedAlbumIds).map(albumId =>
          fetch(`/api/survey/${albumId}`, { method: 'DELETE' })
        )
      );
      const updatedRatingsMap = await fetchRatings();
      setSelectedAlbumIds(new Set());
      setIsDeleteMode(false);
      return updatedRatingsMap;
    } catch (err) {
      console.error('Delete failed:', err);
      throw err;
    }
  };

  const handleCancelDelete = () => {
    setSelectedAlbumIds(new Set());
    setIsDeleteMode(false);
  };

  return {
    albums,
    loggedAlbums,
    ratingsMap,
    selectedAlbumIds,
    isDeleteMode,
    setAlbums,
    setSelectedAlbumIds,
    setIsDeleteMode,
    fetchRatings,
    handleSearch,
    handleDeleteSelected,
    confirmDelete,
    handleCancelDelete,
    handleAlbumSelect
  };
};