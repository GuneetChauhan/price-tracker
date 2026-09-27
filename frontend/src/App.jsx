import { useEffect, useState, useCallback } from 'react';
import { api } from './api/client';
import SearchAndTrack from './components/SearchAndTrack';
import PriceChart from './components/PriceChart';
import ScrapeLog from './components/ScrapeLog';

export default function App() {
  const [products, setProducts] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [history, setHistory] = useState([]);
  const [log, setLog] = useState([]);

  const refreshProducts = useCallback(async () => {
    const data = await api.listProducts();
    setProducts(data);
    if (!selectedId && data.length) setSelectedId(data[0].id);
  }, [selectedId]);

  useEffect(() => {
    refreshProducts();
  }, [refreshProducts]);

  useEffect(() => {
    if (!selectedId) return;
    api.getHistory(selectedId).then(setHistory);
    api.getLog(selectedId).then(setLog);
  }, [selectedId]);

  async function untrack(id) {
    await api.untrackProduct(id);
    setSelectedId(null);
    refreshProducts();
  }

  const selected = products.find((p) => p.id === selectedId);

  return (
    <div className="app">
      <header>
        <h1>INE Product Price Tracker</h1>
        <a className="export-btn" href={api.exportCsvUrl()}>
          Export CSV
        </a>
      </header>

      <SearchAndTrack onTracked={refreshProducts} />

      <div className="card">
        <h2>Tracked products</h2>
        <ul className="tracked-list">
          {products.map((p) => (
            <li
              key={p.id}
              className={p.id === selectedId ? 'active' : ''}
              onClick={() => setSelectedId(p.id)}
            >
              <div>
                <strong>{p.product_name}</strong> — {p.option_label}
                <div className="muted">{p.store_product_id}</div>
              </div>
              <div className="latest">
                {p.latest ? (
                  <>
                    ${p.latest.price} · {p.latest.stock}
                  </>
                ) : (
                  <span className="muted">no reading yet</span>
                )}
              </div>
              <button onClick={(e) => { e.stopPropagation(); untrack(p.id); }}>Stop tracking</button>
            </li>
          ))}
        </ul>
      </div>

      {selected && (
        <div className="card">
          <h2>
            {selected.product_name} — {selected.option_label}
          </h2>
          <PriceChart history={history} />
          <h3>Scrape log</h3>
          <ScrapeLog log={log} />
        </div>
      )}
    </div>
  );
}
