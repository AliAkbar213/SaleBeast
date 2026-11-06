import { useEffect, useState } from 'react';

const api = `${import.meta.env.VITE_API_URL || ''}/api/admin/orders`;
const orderStatuses = ['Processing', 'Confirmed', 'Delivered', 'Cancelled'];

async function requestOrders(path = '', options = {}) {
  const response = await fetch(`${api}${path}`, {
    ...options,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', 'X-Admin-Request': '1' },
  });
  const data = await response.json();
  if (!response.ok) throw Object.assign(new Error(data.err || 'Unable to load orders.'), { status: response.status });
  return data;
}

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('en-KW');
}

function formatPrice(value) {
  return value == null ? '—' : Number(value).toFixed(3);
}

export default function AdminOrders({ setAuthenticated }) {
  const [orders, setOrders] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const data = await requestOrders('', { signal: controller.signal });
        if (!controller.signal.aborted) { setOrders(data); setDrafts({}); }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(err.message);
          if (err.status === 401) setAuthenticated(false);
        }
      } finally { if (!controller.signal.aborted) setLoading(false); }
    }
    load();
    return () => controller.abort();
  }, [attempt, setAuthenticated]);

  async function saveStatus(event, order) {
    event.preventDefault();
    if (saving !== null) return;
    const status = (drafts[order.id] ?? order.status ?? '').trim();
    if (!orderStatuses.includes(status)) { setError('Choose an order status.'); return; }
    setSaving(order.id); setError(''); setMessage('');
    try {
      const updated = await requestOrders(`/${order.id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
      setOrders(items => items.map(item => item.id === updated.id ? updated : item));
      setDrafts(current => { const next = { ...current }; delete next[order.id]; return next; });
      const confirmationType = updated.status === 'Delivered' ? 'delivery' : 'order';
      if (updated.confirmation_email === 'failed') {
        setError(`Order #${order.id} status saved, but the customer ${confirmationType} confirmation email could not be sent.`);
      } else {
        setMessage(`Order #${order.id} status updated.${updated.confirmation_email === 'sent' ? ` Customer ${confirmationType} confirmation email sent.` : ''}`);
      }
    } catch (err) {
      setError(err.message);
      if (err.status === 401) setAuthenticated(false);
    } finally { setSaving(null); }
  }

  return (
    <section aria-labelledby="admin-orders-heading" aria-busy={loading || saving !== null} className="mt-12 border-t border-border pt-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div><h2 id="admin-orders-heading" className="text-2xl font-bold">Orders</h2><p className="mt-2 text-sm text-text-muted">Choose a status and save. Confirmed sends a confirmation email; Delivered sends a delivery email with an invoice.</p></div>
        <button type="button" disabled={loading || saving !== null} className="rounded-md border border-border px-4 py-2 disabled:opacity-50" onClick={() => { setLoading(true); setError(''); setMessage(''); setAttempt(value => value + 1); }}>Refresh orders</button>
      </div>
      {error && <p role="alert" className="mb-5 rounded-md bg-red-50 p-4 text-red-700">{error}</p>}
      {message && <p role="status" className="mb-5 rounded-md bg-green-50 p-4 text-green-800">{message}</p>}
      {loading ? <p role="status" className="py-6 text-text-muted">Loading orders…</p> : (
        <div className="overflow-x-auto rounded-xl border border-border bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-muted"><tr>{['Order ID', 'User ID', 'Created', 'Area ID', 'Total (KWD)', 'Delivery (KWD)', 'Current status', 'Update status'].map(label => <th key={label} className="whitespace-nowrap p-4">{label}</th>)}</tr></thead>
            <tbody>{orders.map(order => <tr key={order.id} className="border-t border-border">
              <td className="p-4">#{order.id}</td><td className="p-4">{order.user_id ?? '—'}</td><td className="whitespace-nowrap p-4">{formatDate(order.created_at)}</td><td className="p-4">{order.area_id ?? '—'}</td><td className="p-4">{formatPrice(order.total)}</td><td className="p-4">{formatPrice(order.delivery_charge)}</td><td className="whitespace-nowrap p-4">{order.status || '—'}</td>
              <td className="p-4"><form onSubmit={event => saveStatus(event, order)} className="flex items-center gap-3">
                <select aria-label={`Status for order #${order.id}`} required value={drafts[order.id] ?? (orderStatuses.includes(order.status) ? order.status : '')} disabled={saving !== null} onChange={event => setDrafts(current => ({ ...current, [order.id]: event.target.value }))} className="w-48 rounded-md border border-border px-3 py-2">
                  <option value="" disabled>Choose status</option>
                  {orderStatuses.map(status => <option key={status} value={status}>{status}</option>)}
                </select>
                <button disabled={saving !== null || !orderStatuses.includes(drafts[order.id] ?? order.status) || (drafts[order.id] ?? order.status) === order.status} className="rounded-md bg-primary px-4 py-2 font-bold text-white disabled:opacity-50">{saving === order.id ? 'Saving…' : 'Save'}<span className="sr-only"> status for order #{order.id}</span></button>
              </form></td>
            </tr>)}</tbody>
          </table>
          {!error && !orders.length && <p className="p-6 text-text-muted">No orders found.</p>}
        </div>
      )}
    </section>
  );
}
