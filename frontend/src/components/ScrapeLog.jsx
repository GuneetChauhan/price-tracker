const OUTCOME_STYLE = {
  success: { color: '#15803d', background: '#dcfce7' },
  retried: { color: '#b45309', background: '#fef3c7' },
  failed: { color: '#b91c1c', background: '#fee2e2' },
};

export default function ScrapeLog({ log }) {
  if (!log.length) return <p className="muted">No scrape attempts yet.</p>;

  return (
    <table className="log-table">
      <thead>
        <tr>
          <th>Time (UTC)</th>
          <th>Attempt</th>
          <th>Outcome</th>
          <th>Price</th>
          <th>Stock</th>
          <th>Error</th>
        </tr>
      </thead>
      <tbody>
        {log.map((row) => (
          <tr key={row.id}>
            <td>{new Date(row.attempted_at).toISOString()}</td>
            <td>{row.attempt_number}</td>
            <td>
              <span className="badge" style={OUTCOME_STYLE[row.outcome]}>
                {row.outcome}
              </span>
            </td>
            <td>{row.price ?? '—'}</td>
            <td>{row.stock ?? '—'}</td>
            <td className="muted">{row.error_message ?? ''}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
