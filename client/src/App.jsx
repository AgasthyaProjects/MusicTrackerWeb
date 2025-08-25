import { useState } from 'react';
import SurveyForm from './components/SurveyForm';
import SearchTab from './components/SearchTab';
import LoggedAlbumsTab from './components/LoggedAlbumsTab';
import StatsTab from './components/StatsTab';
import ConfirmPopup from './Popup/ConfirmPopup';
import { useAlbumData } from './hooks/useAlbumData';
import FavoritesTab from './components/FavoritesTab';

import './styles/App.css';
import { searchAlbums, searchSongs } from './api/itunes';

export default function App() {
  const [activeTab, setActiveTab] = useState('search');
  const [showSurvey, setShowSurvey] = useState(false);
  const [selectedAlbum, setSelectedAlbum] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [songs, setSongs] = useState([]);

  const {
    albums,
    loggedAlbums,
    selectedAlbumIds,
    isDeleteMode,
    setAlbums,
    setIsDeleteMode,
    fetchRatings,
    confirmDelete,
    handleCancelDelete,
    handleAlbumSelect,
    handleSelectAllAlbums,
    handleDeselectAllAlbums,
    handleDeleteSelected
  } = useAlbumData();

  const handleAlbumSearch = async (query) => {
    const results = await searchAlbums(query);
    setAlbums(results);
    setSelectedAlbum(null);
    setShowSurvey(false);
  };

 let currentSearchId = 0; // Track current search

const handleSongSearch = async (query, onProgress) => {
  try {
    // Increment search ID to identify this search
    currentSearchId++;
    const thisSearchId = currentSearchId;
    
    // This returns initial results immediately
    const initialResults = await searchSongs(query, (updatedSongs, enrichmentId) => {
      // Only update if this is still the current search
      if (thisSearchId === currentSearchId) {
        onProgress?.(updatedSongs);
      }
    });
    
    // Only set initial results if this is still the current search
    if (thisSearchId === currentSearchId) {
      setSongs(initialResults);
    }
  } catch (err) {
    console.error('Song search failed:', err);
  }
};
  const handleSongsUpdate = (updatedSongs) => {
    setSongs(updatedSongs);
  };
  const handleOpenSurvey = async (album) => {
    let rating = album.rating;
    let logdatetime = album.logdatetime;

    try {
      const res = await fetch(`/api/survey/individual/${album.collectionId}`);
      if (res.ok) {
        const data = await res.json();
        rating = data.rating ?? null;
        logdatetime = data.logdatetime ?? null;
      } else if (res.status === 404) {
        rating = null;
        logdatetime = null;
      }
    } catch (err) {
      console.error("Failed to fetch album data", err);
    }

    setSelectedAlbum({ ...album, rating, logdatetime });
    setShowSurvey(true);
  };

  const handleSurveyClose = async () => {
    if (selectedAlbum) {
      const updatedRatingsMap = await fetchRatings();
      setAlbums((prevAlbums) =>
        prevAlbums.map((album) => {
          if (album.collectionId === selectedAlbum.collectionId) {
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

  const handleToggleDeleteMode = () => {
    setIsDeleteMode(!isDeleteMode);
  };

  const handleDeleteClick = () => {
    const hasSelected = handleDeleteSelected();
    if (hasSelected) {
      setShowConfirm(true);
    }
  };

  const handleActualDelete = async () => {
    try {
      await confirmDelete();
      setShowConfirm(false);
    } catch (err) {
      console.error('Delete failed:', err);
      // Handle error - maybe show an error message
    }
  };

  const handleCancelConfirm = () => {
    setShowConfirm(false);
  };

  return (
    <div className="app-container">
      {/* Tab Navigation */}
      <div className="tab-buttons">
        <button className="tab-button" onClick={() => setActiveTab('search')}>
          Search
        </button>
        <button className="tab-button" onClick={() => setActiveTab('logged')}>
          Logged Albums
        </button>
        <button className="tab-button" onClick={() => setActiveTab('stats')}>
          Stats
        </button>
        <button className="tab-button" onClick={() => setActiveTab('favorites')}>
          Favorites
        </button>

      </div>

      {/* Tab Content */}
      {activeTab === 'search' && (
        <SearchTab
          albums={albums}
          songs={songs}
          onSearchAlbum={handleAlbumSearch}
          onSearchSong={handleSongSearch}
          onSongsUpdate={handleSongsUpdate}
          onOpenSurvey={handleOpenSurvey}
        />
      )}

      {activeTab === 'logged' && (
        <LoggedAlbumsTab
          loggedAlbums={loggedAlbums}
          selectedAlbumIds={selectedAlbumIds}
          isDeleteMode={isDeleteMode}
          onOpenSurvey={handleOpenSurvey}
          onAlbumSelect={handleAlbumSelect}
          onSelectAllAlbums={handleSelectAllAlbums}
          onDeselectAllAlbums={handleDeselectAllAlbums}
          onDeleteSelected={handleDeleteClick}
          onCancelDelete={handleCancelDelete}
          onToggleDeleteMode={handleToggleDeleteMode}
        />
      )}

      {activeTab === 'stats' && (
        <StatsTab loggedAlbums={loggedAlbums} />
      )}
      {activeTab === 'favorites' && (
        <FavoritesTab onOpenSurvey={handleOpenSurvey} />
      )}


      {/* Modals */}
      {showConfirm && (
        <ConfirmPopup
          message={
            selectedAlbumIds.size === 1
              ? 'Are you sure you want to delete this album?'
              : `Are you sure you want to delete these ${selectedAlbumIds.size} albums?`
          }
          onConfirm={handleActualDelete}
          onCancel={handleCancelConfirm}
        />
      )}

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