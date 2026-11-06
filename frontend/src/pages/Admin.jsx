import { useEffect, useState } from 'react';
import AdminOrders from '../Components/AdminOrders';

const api = `${import.meta.env.VITE_API_URL || ''}/api/admin`;
const inputClass = 'mt-2 w-full rounded-md border border-border bg-white px-3 py-2 text-text-main';
const buttonClass = 'rounded-md bg-primary px-5 py-2.5 font-bold text-white disabled:opacity-50';
const textFields = [
  ['name', 'Name', false], ['ar_name', 'Arabic name', false],
  ['desc', 'Description', true], ['ar_desc', 'Arabic description', true],
  ['key_features', 'Key features', true], ['ar_key_features', 'Arabic key features', true],
  ['video', 'Video URL', false],
  ['image', 'Main image URL', false],
];

export default function Admin() {
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState('');
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(null);
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function request(path, options = {}) {
    const response = await fetch(`${api}${path}`, {
      ...options, credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'X-Admin-Request': '1' },
    });
    const data = await response.json();
    if (response.status === 401) {
      setAuthenticated(false);
      setProducts([]);
      setForm(null);
    }
    if (!response.ok) throw new Error(data.err || 'The request failed. Please try again.');
    return data;
  }

  async function loadProducts() {
    const [items, groups] = await Promise.all([request('/products'), request('/categories')]);
    setProducts(items);
    setCategories(groups);
  }

  useEffect(() => {
    let active = true;
    async function checkSession() {
      try {
        const response = await fetch(api, { credentials: 'include' });
        if (!response.ok) {
          if (response.status !== 401) throw new Error('Unable to check admin access.');
          return;
        }
        const responses = await Promise.all(['/products', '/categories'].map(path => fetch(`${api}${path}`, { credentials: 'include' })));
        if (responses.some(item => !item.ok)) throw new Error('Unable to load admin data. Please sign in again.');
        const [items, groups] = await Promise.all(responses.map(item => item.json()));
        if (active) { setAuthenticated(true); setProducts(items); setCategories(groups); }
      } catch (err) { if (active) setError(err.message); }
      finally { if (active) setChecking(false); }
    }
    checkSession();
    return () => { active = false; };
  }, []);

  async function login(event) {
    event.preventDefault();
    setBusy(true); setError(''); setMessage('');
    try {
      await request('/login', { method: 'POST', body: JSON.stringify({ password }) });
      setPassword(''); setAuthenticated(true);
      await loadProducts();
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  async function logout() {
    setBusy(true); setError('');
    try {
      await request('/logout', { method: 'POST' });
      setAuthenticated(false); setProducts([]); setForm(null); setMessage('');
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  function addProduct() {
    setForm({
      ...Object.fromEntries(textFields.map(([key]) => [key, ''])),
      price: '', discounted_price: '', stock: '0', category_id: '', images: '',
    });
    setError(''); setMessage('');
  }

  function edit(product) {
    setForm({
      ...Object.fromEntries(Object.entries(product).map(([key, value]) => [key, value == null ? '' : String(value)])),
      image: product.image ?? '',
      images: product.images?.join('\n') ?? '',
    });
    setError(''); setMessage('');
  }

  async function save(event) {
    event.preventDefault();
    setBusy(true); setError(''); setMessage('');
    const { id, ...fields } = form;
    const payload = Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, value === '' ? null : value]));
    payload.name = form.name.trim();
    payload.price = form.price;
    payload.stock = form.stock === '' ? null : Number(form.stock);
    const images = form.images.split(/\r?\n/).map(value => value.trim()).filter(Boolean);
    payload.image = form.image.trim() || null;
    payload.images = images.length ? images : null;
    try {
      const updated = await request(id ? `/products/${id}` : '/products', { method: id ? 'PATCH' : 'POST', body: JSON.stringify(payload) });
      setProducts(items => id ? items.map(item => String(item.id) === id ? updated : item) : [...items, updated]);
      if (!id) setSearch('');
      setForm(null); setMessage(id ? 'Product updated.' : 'Product added.');
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  async function remove(product) {
    if (!window.confirm(`Delete “${product.name}” (ID ${product.id})? This cannot be undone.`)) return;
    setBusy(true); setError(''); setMessage('');
    try {
      await request(`/products/${product.id}`, { method: 'DELETE' });
      setProducts(items => items.filter(item => item.id !== product.id));
      if (String(form?.id) === String(product.id)) setForm(null);
      setMessage('Product deleted.');
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  if (checking) return <main className="page-container py-16">Checking admin access…</main>;

  return (
    <main className="page-container py-10" dir="ltr">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div><p className="eyebrow">SaleBeast administration</p><h1 className="mt-2 text-3xl font-black">Products &amp; orders</h1></div>
        {authenticated && <div className="flex flex-wrap gap-3">
          <button type="button" onClick={addProduct} disabled={busy} className={buttonClass}>Add product</button>
          <button type="button" onClick={logout} disabled={busy} className="rounded-md border border-border px-5 py-2.5">Lock admin</button>
        </div>}
      </div>
      {error && <p role="alert" className="mb-5 rounded-md border border-red-200 bg-red-50 p-4 text-red-700">{error}</p>}
      {message && <p role="status" className="mb-5 rounded-md bg-green-50 p-4 text-green-800">{message}</p>}
      {!authenticated ? (
        <form onSubmit={login} className="mx-auto max-w-md rounded-xl border border-border bg-white p-6">
          <h2 className="text-xl font-bold">Admin access</h2>
          <p className="mt-2 text-sm text-text-muted">Enter the admin password to manage products and orders.</p>
          <label className="mt-6 block" htmlFor="admin-password">Password</label>
          <input id="admin-password" type="password" autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)} disabled={busy} className={inputClass} />
          <button className={`${buttonClass} mt-5 w-full`} disabled={busy}>{busy ? 'Checking…' : 'Continue'}</button>
        </form>
      ) : (
        <>
          <h2 className="mb-5 text-2xl font-bold">Products</h2>
          {form && <form onSubmit={save} className="mb-8 rounded-xl border border-border bg-white p-6">
            <h2 className="mb-5 text-xl font-bold">{form.id ? `Edit product #${form.id}` : 'Add product'}</h2>
            <fieldset disabled={busy} className="grid gap-5 md:grid-cols-2">
              {textFields.map(([key, label, multiline]) => <label key={key} className="block text-sm font-medium">{label}
                {multiline ? <textarea rows={5} dir={key.startsWith('ar_') ? 'rtl' : 'ltr'} value={form[key]} onChange={event => setForm({ ...form, [key]: event.target.value })} className={inputClass} />
                  : <input required={key === 'name'} dir={key.startsWith('ar_') ? 'rtl' : 'ltr'} value={form[key]} onChange={event => setForm({ ...form, [key]: event.target.value })} className={inputClass} />}
              </label>)}
              <label className="block text-sm font-medium md:col-span-2">Gallery image URLs
                <textarea rows={5} value={form.images} onChange={event => setForm({ ...form, images: event.target.value })} className={inputClass} aria-describedby="gallery-images-help" />
                <span id="gallery-images-help" className="mt-2 block text-text-muted">Enter one image URL per line, in display order. Clear the list to remove all gallery images.</span>
              </label>
              {[['price', 'Price (KWD)'], ['discounted_price', 'Discounted price (KWD)'], ['stock', 'Stock']].map(([key, label]) => <label key={key} className="block text-sm font-medium">{label}
                <input type="number" min="0" max={key === 'stock' ? 2147483647 : undefined} step={key === 'stock' ? '1' : 'any'} required={key === 'price'} value={form[key]} onChange={event => setForm({ ...form, [key]: event.target.value })} className={inputClass} />
              </label>)}
              <label className="block text-sm font-medium">Category
                <select value={form.category_id} onChange={event => setForm({ ...form, category_id: event.target.value })} className={inputClass}>
                  <option value="">No category</option>
                  {categories.map(category => <option key={category.id} value={String(category.id)}>{category.name}</option>)}
                </select>
              </label>
              <p className="text-sm text-text-muted md:col-span-2">Clear an optional field to remove its value. Descriptions and key features support Markdown.</p>
              <div className="flex gap-3 md:col-span-2"><button className={buttonClass}>{busy ? 'Saving…' : form.id ? 'Save changes' : 'Create product'}</button><button type="button" onClick={() => setForm(null)} className="rounded-md border border-border px-5 py-2">Cancel</button></div>
            </fieldset>
          </form>}
          <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <label className="block w-full max-w-md text-sm font-medium">Search products<input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Name, Arabic name, or ID" className={inputClass} /></label>
            <button type="button" disabled={busy} onClick={async () => { setBusy(true); setError(''); try { await loadProducts(); } catch (err) { setError(err.message); } finally { setBusy(false); } }} className="rounded-md border border-border px-4 py-2">Refresh products</button>
          </div>
          <div className="overflow-x-auto rounded-xl border border-border bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-muted"><tr>{['ID', 'Name', 'Price (KWD)', 'Discount', 'Stock', 'Actions'].map(label => <th key={label} className="whitespace-nowrap p-4">{label}</th>)}</tr></thead>
              <tbody>{products.filter(product => `${product.id} ${product.name} ${product.ar_name || ''}`.toLowerCase().includes(search.toLowerCase())).map(product => <tr key={product.id} className="border-t border-border">
                <td className="p-4">{product.id}</td><td className="min-w-48 p-4"><p className="font-bold">{product.name}</p><p dir="rtl" className="text-text-muted">{product.ar_name}</p></td><td className="p-4">{product.price}</td><td className="p-4">{product.discounted_price ?? '—'}</td><td className="p-4">{product.stock ?? '—'}</td>
                <td className="whitespace-nowrap p-4"><button disabled={busy} onClick={() => edit(product)} className="me-4 font-bold text-primary">Edit<span className="sr-only"> {product.name}</span></button><button disabled={busy} onClick={() => remove(product)} className="font-bold text-red-700">Delete<span className="sr-only"> {product.name}</span></button></td>
              </tr>)}</tbody>
            </table>
            {!products.length && <p className="p-6 text-text-muted">No products found.</p>}
          </div>
          <AdminOrders setAuthenticated={setAuthenticated} />
        </>
      )}
    </main>
  );
}
