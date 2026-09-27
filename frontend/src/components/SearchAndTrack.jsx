import { useState } from 'react';
import { api } from '../api/client';

export default function SearchAndTrack({ onTracked }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [optionByUrl, setOptionByUrl] = useState({});

  async function runSearch(e) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const { results } = await api.search(query.trim());
      setResults(results);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function track(item) {
    const optionLabel = (optionByUrl[item.url] || '').trim();
    if (!optionLabel) {
      setError('Enter which option to track (e.g. "128GB", "Pack of 3") before tracking.');
      return;
    }
    try {
      await api.trackProduct({
        storeProductId: item.storeProductId,
        productName: item.name,
        optionLabel,
        productUrl: item.url,
      });
      onTracked();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="card">
      <h2>Search &amp; track a product</h2>
      <form onSubmit={runSearch} className="search-form">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Partial or full product name..."
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>

      {error && <p className="error">{error}</p>}

      <ul className="result-list">
        {results.map((item) => (
          <li key={item.url} className="result-item">
            <div>
              <strong>{item.name}</strong>
              <div className="muted">{item.storeProductId}</div>
            </div>
            <input
              placeholder="option to track, e.g. 128GB"
              value={optionByUrl[item.url] || ''}
              onChange={(e) => setOptionByUrl({ ...optionByUrl, [item.url]: e.target.value })}
            />
            <button onClick={() => track(item)}>Track</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
