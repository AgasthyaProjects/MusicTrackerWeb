import { useState } from 'react';
import SurveyForm from './components/SurveyForm';
import SearchTab from './components/SearchTab';
import LoggedAlbumsTab from './components/LoggedAlbumsTab';
import StatsTab from './components/StatsTab';
import ConfirmPopup from './Popup/ConfirmPopup';
import { useAlbumData } from './hooks/useAlbumData';
import './styles/App.css';

export default function App() {
  const [activeTab, setActiveTab] = useState('search');
  const [showSurvey, setShowSurvey] = useState(false);
  const [selectedAlbum, setSelectedAlbum] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  
  const {
    albums,
    loggedAlbums,
    selectedAlbumIds,
    isDeleteMode,
    setAlbums,
    fetchRatings,
    handleSearch: performSearch,
    confirmDelete,
    handleCancelDelete,
    handleAlbumSelect
  } = useAlbumData();


  const handleSearch = async (query) => {
    const results = await performSearch(query);
    setAlbums(results);
    setSelectedAlbum(null);
    setShowSurvey(false);
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
      </div>

      {/* Tab Content */}
      {activeTab === 'search' && (
        <SearchTab 
          albums={albums}
          onSearch={handleSearch}
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
          onCancelDelete={handleCancelDelete}
          onToggleDeleteMode={() => setIsDeleteMode(!isDeleteMode)}
        />
      )}

      {activeTab === 'stats' && (
        <StatsTab loggedAlbums={loggedAlbums} />
      )}

      {/* Modals */}
      {showConfirm && (
        <ConfirmPopup
          message={
            selectedAlbumIds.size === 1
              ? 'Are you sure you want to delete this album?'
              : `Are you sure you want to delete these ${selectedAlbumIds.size} albums?`
          }
          onConfirm={onActualDelete}
          onCancel={() => setShowConfirm(false)}
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