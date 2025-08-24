import { useState } from 'react';
import AlbumCard from './AlbumCard';

export default function SearchTab({ albums, onSearch, onOpenSurvey }) {
  const [query, setQuery] = useState('');

  const handleSearch = () => {
    onSearch(query);
  };

  return (
    <section>
      <div className="search-container">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for albums..."
          onKeyUp={(e) => e.key === 'Enter' && handleSearch()}
        />
        <button className="search-button" onClick={handleSearch}>Search</button>
      </div>

      <div className="album-grid">
        {albums.map((album) => (
          <AlbumCard
            key={album.collectionId}
            album={album}
            onOpenSurvey={() => onOpenSurvey(album)}
          />
        ))}
      </div>
    </section>
  );
}
