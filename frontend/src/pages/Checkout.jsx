import { useContext, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { AuthContext } from "../contexts/AuthContext";
import { useCart } from "../contexts/CartContext";

const blocks = Array.from({ length: 20 }, (_, index) => String(index + 1));
const floors = Array.from({ length: 30 }, (_, index) => String(index + 1));
const rooms = Array.from({ length: 30 }, (_, index) => String(index + 1));
const formatPrice = (amount) => `${Number(amount || 0).toFixed(3)} KD`;
const initialAddress = { governorateId: "", areaId: "", block: "", floor: "", room: "", notes: "" };

function Checkout() {
  const { cartItems, cartCount, cartTotal, clearCart } = useCart();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [address, setAddress] = useState(initialAddress);
  const [governorates, setGovernorates] = useState([]);
  const [areas, setAreas] = useState([]);
  const [isLoadingGovernorates, setIsLoadingGovernorates] = useState(true);
  const [isLoadingAreas, setIsLoadingAreas] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const apiUrl = import.meta.env.VITE_API_URL;
  const selectedGovernorate = governorates.find((governorate) => String(governorate.id) === address.governorateId);
  const selectedArea = areas.find((area) => String(area.id) === address.areaId);
  const deliveryCharge = selectedArea ? Number(selectedArea.delivery_charge) : 0;
  const orderTotal = Number(cartTotal) + deliveryCharge;

  useEffect(() => {
    const loadGovernorates = async () => {
      try {
        const response = await fetch(`${apiUrl}/api/address/governorate`, { credentials: "include" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.err || "We could not load delivery locations.");
        setGovernorates(data);
      } catch (requestError) {
        setError(requestError.message || "We could not load delivery locations.");
      } finally {
        setIsLoadingGovernorates(false);
      }
    };

    loadGovernorates();
  }, [apiUrl]);

  const updateAddress = ({ target: { name, value } }) => {
    setAddress((currentAddress) => ({ ...currentAddress, [name]: value }));
    setError("");
  };

  const updateGovernorate = async ({ target: { value } }) => {
    setAddress((currentAddress) => ({ ...currentAddress, governorateId: value, areaId: "" }));
    setAreas([]);
    setError("");

    if (!value) return;

    setIsLoadingAreas(true);
    try {
      const response = await fetch(`${apiUrl}/api/address/area?governorate_id=${encodeURIComponent(value)}`, { credentials: "include" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.err || "We could not load areas.");
      setAreas(data);
    } catch (requestError) {
      setError(requestError.message || "We could not load areas.");
    } finally {
      setIsLoadingAreas(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!user) return setError("Please log in before placing your order.");
    if (!cartItems.length) return setError("Your cart is empty. Add an item before placing an order.");
    if (["governorateId", "areaId", "block", "floor", "room"].some((field) => !address[field])) return setError("Please select your governorate, area, block, floor, and room.");

    setIsSubmitting(true);
    try {
      const response = await fetch(`${apiUrl}/api/order/place`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          user_id: user.id,
          area_id: Number(address.areaId),
          cart_arr: cartItems.map((item) => ({ item_id: item.id, quantity: item.quantity })),
          // Keys below match the existing order endpoint's delivery-address format.
          address: {
            street: `${selectedArea.name}, ${selectedGovernorate.name}`,
            building: `Block ${address.block}`,
            floor: address.floor,
            flat: address.room,
            notes: address.notes.trim(),
          },
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.err || "We could not place your order. Please try again.");
      clearCart();
      setOrderPlaced(true);
    } catch (requestError) {
      setError(requestError.message || "We could not place your order. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (orderPlaced) {
    return <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-7xl items-center justify-center px-4 py-8 sm:px-6 lg:px-8"><section className="w-full max-w-lg rounded-2xl border border-border bg-surface p-8 text-center shadow-sm sm:p-10"><div aria-hidden="true" className="mx-auto flex size-16 items-center justify-center rounded-full bg-primary-soft text-3xl text-primary">✓</div><p className="mt-6 text-xs font-bold uppercase tracking-[0.2em] text-primary">Order received</p><h1 className="mt-2 text-3xl font-bold tracking-tight text-text-main">Thank you for your order</h1><p className="mt-4 leading-7 text-text-muted">We will contact you to arrange your cash-on-delivery order.</p><Link to="/products" className="mt-8 inline-flex min-h-12 items-center justify-center rounded-xl bg-primary px-6 font-bold text-text-light transition-colors hover:bg-primary-hover">Continue shopping</Link></section></main>;
  }

  return (
    <main className="mx-auto min-h-[calc(100vh-4rem)] max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <nav aria-label="Breadcrumb" className="mb-8 flex items-center gap-2 text-sm text-text-muted"><Link to="/cart" className="hover:text-primary">Cart</Link><span aria-hidden="true">/</span><span className="text-text-main">Checkout</span></nav>
      <div className="mb-8"><p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-primary">Secure checkout</p><h1 className="text-3xl font-bold tracking-tight text-text-main sm:text-4xl">Complete your order</h1></div>
      {!cartItems.length ? (
        <section className="flex min-h-96 flex-col items-center justify-center rounded-3xl border border-border bg-surface px-6 py-12 text-center"><div aria-hidden="true" className="mb-6 text-4xl">🛒</div><h2 className="text-2xl font-bold text-text-main">Your cart is empty</h2><p className="mt-3 text-text-muted">Add products before going to checkout.</p><Link to="/products" className="mt-7 inline-flex min-h-12 items-center justify-center rounded-xl bg-primary px-7 font-semibold text-text-light hover:bg-primary-hover">Browse products</Link></section>
      ) : (
        <form onSubmit={handleSubmit} className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-6">
            <section className="rounded-2xl border border-border bg-surface p-5 sm:p-7"><h2 className="text-xl font-bold text-text-main">Delivery address</h2><p className="mt-2 text-sm text-text-muted">Select your Kuwait location so we can deliver your order.</p><div className="mt-6 grid gap-5 sm:grid-cols-2"><SelectField id="governorateId" label="Governorate" value={address.governorateId} onChange={updateGovernorate} options={governorates} placeholder={isLoadingGovernorates ? "Loading governorates…" : "Select governorate"} disabled={isLoadingGovernorates} /><SelectField id="areaId" label="Area" value={address.areaId} onChange={updateAddress} options={areas} placeholder={isLoadingAreas ? "Loading areas…" : "Select area"} disabled={!address.governorateId || isLoadingAreas} /><SelectField id="block" label="Block" value={address.block} onChange={updateAddress} options={blocks} placeholder="Select block" /><SelectField id="floor" label="Floor" value={address.floor} onChange={updateAddress} options={floors} placeholder="Select floor" /><SelectField id="room" label="Room / flat" value={address.room} onChange={updateAddress} options={rooms} placeholder="Select room or flat" /></div><div className="mt-5"><label htmlFor="notes" className="mb-2 block text-sm font-semibold text-text-main">Delivery notes <span className="font-normal text-text-muted">(optional)</span></label><textarea id="notes" name="notes" value={address.notes} onChange={updateAddress} rows="4" placeholder="Landmark, entrance instructions, or anything that will help the driver." className="w-full resize-y rounded-xl border border-border bg-background px-4 py-3 text-sm text-text-main outline-none placeholder:text-text-muted/60 focus:border-primary focus:ring-2 focus:ring-primary/10" /></div></section>
            <section className="rounded-2xl border border-border bg-surface p-5 sm:p-7"><h2 className="text-xl font-bold text-text-main">Payment method</h2><div className="mt-5 space-y-3"><label className="flex cursor-pointer items-center gap-3 rounded-xl border border-primary bg-primary-soft px-4 py-4 text-sm font-semibold text-text-main"><input type="radio" name="payment" value="cash-on-delivery" defaultChecked className="size-4 accent-primary" /><span className="flex-1">Cash on delivery</span><span className="text-xs font-bold uppercase tracking-wide text-primary">Available</span></label><label className="flex cursor-not-allowed items-center gap-3 rounded-xl border border-border bg-surface-muted px-4 py-4 text-sm font-semibold text-text-muted"><input type="radio" name="payment" value="online" disabled className="size-4" /><span className="flex-1">Online payment</span><span className="text-xs font-bold uppercase tracking-wide">Unavailable</span></label></div></section>
          </div>
          <aside aria-labelledby="order-summary" className="rounded-2xl border border-border bg-surface p-6 lg:sticky lg:top-24"><h2 id="order-summary" className="text-xl font-bold text-text-main">Your order</h2><div className="mt-6 space-y-4 border-b border-border pb-6">{cartItems.map((item) => <div key={item.id} className="flex items-start justify-between gap-4 text-sm"><p className="min-w-0 text-text-muted"><span className="font-semibold text-text-main">{item.quantity}×</span> {item.name}</p><p className="shrink-0 font-semibold text-text-main">{formatPrice(Number(item.price) * item.quantity)}</p></div>)}</div><div className="space-y-3 border-b border-border py-6 text-sm"><div className="flex justify-between gap-4 text-text-muted"><span>Subtotal ({cartCount} {cartCount === 1 ? "item" : "items"})</span><span className="font-semibold text-text-main">{formatPrice(cartTotal)}</span></div><div className="flex justify-between gap-4 text-text-muted"><span>Delivery</span><span className="font-semibold text-text-main">{selectedArea ? formatPrice(deliveryCharge) : "Select an area"}</span></div></div><div className="flex items-center justify-between gap-4 py-6 font-bold text-text-main"><span className="text-lg">Total</span><span className="text-xl">{formatPrice(orderTotal)}</span></div>{error && <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">{error}</p>}{!user && <p className="mb-4 text-sm leading-6 text-text-muted">Already have an account? <Link to="/login" className="font-bold text-primary hover:underline">Log in</Link> to place your order.</p>}<button type="submit" disabled={isSubmitting} className="flex min-h-14 w-full items-center justify-center rounded-xl bg-primary px-6 font-bold text-text-light transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60">{isSubmitting ? "Placing order…" : "Place order"}</button><button type="button" onClick={() => navigate("/cart")} className="mt-3 w-full text-sm font-semibold text-text-muted hover:text-primary">Return to cart</button></aside>
        </form>
      )}
    </main>
  );
}

function SelectField({ id, label, value, onChange, options, placeholder, disabled = false }) {
  return <div><label htmlFor={id} className="mb-2 block text-sm font-semibold text-text-main">{label}</label><select id={id} name={id} value={value} onChange={onChange} required disabled={disabled} className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-text-main outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-60"><option value="">{placeholder}</option>{options.map((option) => { const isLocation = typeof option === "object"; const optionValue = isLocation ? option.id : option; const optionLabel = isLocation ? option.name : option; return <option key={optionValue} value={optionValue}>{optionLabel}</option>; })}</select></div>;
}

export default Checkout;
