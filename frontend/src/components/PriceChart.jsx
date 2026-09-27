import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function PriceChart({ history }) {
  if (!history.length) return <p className="muted">No successful scrapes yet.</p>;

  const data = history.map((h) => ({
    time: new Date(h.attempted_at).toLocaleString(),
    price: h.price,
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="time" hide />
        <YAxis domain={['auto', 'auto']} />
        <Tooltip />
        <Line type="monotone" dataKey="price" stroke="#4f46e5" dot={false} strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  );
}
