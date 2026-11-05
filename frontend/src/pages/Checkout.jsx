import { useLanguage } from "../contexts/LanguageContext";
import { useCallback, useContext, useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router";
import { AuthContext } from "../contexts/AuthContext";
import { useCart } from "../contexts/CartContext";
import { getProductPrice } from "../utils/productPrice";

import DeliveryMap from "../Components/DeliveryMap";

const blocks = Array.from({ length: 20 }, (_, index) => String(index + 1));
const initialAddress = { governorateId: "", areaId: "", block: "", street: "", mobile: "", notes: "" };

function Checkout() {
  const { t, productText, formatPrice, errorText } = useLanguage();
  const { cartItems, cartTotal, cartFullTotal, cartDiscountTotal, clearCart } = useCart();
  const { user, isLoading } = useContext(AuthContext);
  const navigate = useNavigate();
  const [address, setAddress] = useState(initialAddress);
  const [location, setLocation] = useState(null);
  const updateLocation = useCallback((point) => setLocation(point), []);
  const [governorates, setGovernorates] = useState([]);
  const [areas, setAreas] = useState([]);
  const [isLoadingGovernorates, setIsLoadingGovernorates] = useState(true);
  const [isLoadingAreas, setIsLoadingAreas] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [voucherCode, setVoucherCode] = useState("");
  const [voucher, setVoucher] = useState(null);
  const [voucherError, setVoucherError] = useState("");
  const [isCheckingVoucher, setIsCheckingVoucher] = useState(false);
  const apiUrl = import.meta.env.VITE_API_URL;
  const selectedGovernorate = governorates.find((governorate) => String(governorate.id) === address.governorateId);
  const selectedArea = areas.find((area) => String(area.id) === address.areaId);
  const deliveryCharge = selectedArea ? Number(selectedArea.delivery_charge) : 0;
  const totalBeforeVoucher = Math.round(Number(cartTotal) * 1000) + Math.round(deliveryCharge * 1000);
  const voucherDiscount = voucher ? Math.min(totalBeforeVoucher, Math.round(voucher.amount * 1000)) : 0;
  const orderTotal = (totalBeforeVoucher - voucherDiscount) / 1000;

  const applyVoucher = async () => {
    if (isCheckingVoucher || isSubmitting) return;
    setVoucher(null);
    setVoucherError("");
    if (!voucherCode.trim()) return setVoucherError("Please enter a voucher code.");
    setIsCheckingVoucher(true);
    try {
      const response = await fetch(`${apiUrl}/api/order/voucher`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ code: voucherCode.trim() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.err || "We could not check your voucher. Please try again.");
      setVoucher(data);
      setVoucherCode(data.code);
    } catch (requestError) {
      setVoucherError(requestError.message || "We could not check your voucher. Please try again.");
    } finally {
      setIsCheckingVoucher(false);
    }
  };

  useEffect(() => {
    if (isLoading || !user) return;
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
  }, [apiUrl, isLoading, user]);

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
    if (isCheckingVoucher || isSubmitting) return;
    if (!user) return navigate("/cart", { replace: true });
    if (!cartItems.length) return setError("Your cart is empty. Add an item before placing an order.");
    if (["governorateId", "areaId", "block", "street", "mobile"].some((field) => !address[field].trim())) return setError("Please select your governorate, area, and block, and enter your street and mobile number.");

    setIsSubmitting(true);
    try {
      const response = await fetch(`${apiUrl}/api/order/place`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          user_id: user.id,
          area_id: Number(address.areaId),
          ...(voucher ? { voucher_code: voucher.code } : {}),
          cart_arr: cartItems.map((item) => ({ item_id: item.id, quantity: item.quantity })),
          address: {
            governorate: selectedGovernorate.name,
            area: selectedArea.name,
            block: address.block,
            street: address.street.trim(),
            mobile: address.mobile.trim(),
            notes: address.notes.trim(),
            location,
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

  if (isLoading) {
    return <main className="mx-auto max-w-7xl px-4 py-8" role="status">{t("Checking account…")}</main>;
  }

  if (!user) return <Navigate to="/cart" replace />;

  if (orderPlaced) {
    return <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-7xl items-center justify-center px-4 py-8 sm:px-6 lg:px-8"><section className="w-full max-w-lg rounded-2xl border border-border bg-surface p-8 text-center shadow-sm sm:p-10"><div aria-hidden="true" className="mx-auto flex size-16 items-center justify-center rounded-full bg-primary-soft text-3xl text-primary">✓</div><p className="mt-6 text-xs font-bold uppercase tracking-[0.2em] text-primary">{t("Order received")}</p><h1 className="mt-2 text-3xl font-bold tracking-tight text-text-main">{t("Thank you for your order")}</h1><p className="mt-4 leading-7 text-text-muted">{t("We will contact you to arrange your cash-on-delivery order.")}</p><Link to="/products" className="mt-8 inline-flex min-h-12 items-center justify-center rounded-xl bg-primary px-6 font-bold text-text-light transition-colors hover:bg-primary-hover">{t("Continue shopping")}</Link></section></main>;
  }

  return (
    <main className="mx-auto min-h-[calc(100vh-4rem)] max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <nav aria-label={t("Breadcrumb")} className="mb-8 flex items-center gap-2 text-sm text-text-muted"><Link to="/cart" className="hover:text-primary">{t("Cart")}</Link><span aria-hidden="true">/</span><span className="text-text-main">{t("Checkout")}</span></nav>
      <div className="mb-8"><p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-primary">{t("Secure checkout")}</p><h1 className="text-3xl font-bold tracking-tight text-text-main sm:text-4xl">{t("Complete your order")}</h1></div>
      {!cartItems.length ? (
        <section className="flex min-h-96 flex-col items-center justify-center rounded-3xl border border-border bg-surface px-6 py-12 text-center"><div aria-hidden="true" className="mb-6 text-4xl">🛒</div><h2 className="text-2xl font-bold text-text-main">{t("Your cart is empty")}</h2><p className="mt-3 text-text-muted">{t("Add products before going to checkout.")}</p><Link to="/products" className="mt-7 inline-flex min-h-12 items-center justify-center rounded-xl bg-primary px-7 font-semibold text-text-light hover:bg-primary-hover">{t("Browse products")}</Link></section>
      ) : (
        <form onSubmit={handleSubmit} className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-6">
            <section className="rounded-2xl border border-border bg-surface p-5 sm:p-7"><h2 className="text-xl font-bold text-text-main">{t("Delivery address")}</h2><p className="mt-2 text-sm text-text-muted">{t("Select your Kuwait location so we can deliver your order.")}</p><div className="mt-6 grid gap-5 sm:grid-cols-2"><SelectField id="governorateId" label={t("Governorate")} value={address.governorateId} onChange={updateGovernorate} options={governorates} placeholder={isLoadingGovernorates ? t("Loading governorates…") : t("Select governorate")} disabled={isLoadingGovernorates} /><SelectField id="areaId" label={t("Area")} value={address.areaId} onChange={updateAddress} options={areas} placeholder={isLoadingAreas ? t("Loading areas…") : t("Select area")} disabled={!address.governorateId || isLoadingAreas} /><SelectField id="block" label={t("Block")} value={address.block} onChange={updateAddress} options={blocks} placeholder={t("Select block")} /><div>
                <label htmlFor="street" className="mb-2 block text-sm font-semibold text-text-main">{t("Street")}</label>
                <input id="street" name="street" type="text" autoComplete="address-line1" value={address.street} onChange={updateAddress} required placeholder={t("Enter your street")} className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-text-main outline-none placeholder:text-text-muted/60 focus:border-primary focus:ring-2 focus:ring-primary/10" />
              </div>
              <div>
                <label htmlFor="mobile" className="mb-2 block text-sm font-semibold text-text-main">{t("Mobile number")}</label>
                <input id="mobile" name="mobile" type="tel" dir="ltr" autoComplete="tel" value={address.mobile} onChange={updateAddress} required placeholder={t("Enter your mobile number")} className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-text-main outline-none placeholder:text-text-muted/60 focus:border-primary focus:ring-2 focus:ring-primary/10" />
              </div></div><div className="mt-5"><label htmlFor="notes" className="mb-2 block text-sm font-semibold text-text-main">{t("Delivery notes")} <span className="font-normal text-text-muted">{t("(optional)")}</span></label><textarea id="notes" name="notes" value={address.notes} onChange={updateAddress} rows="4" placeholder={t("Landmark, entrance instructions, or anything that will help the driver.")} className="w-full resize-y rounded-xl border border-border bg-background px-4 py-3 text-sm text-text-main outline-none placeholder:text-text-muted/60 focus:border-primary focus:ring-2 focus:ring-primary/10" /></div><DeliveryMap value={location} onChange={updateLocation} /></section>
            <section className="rounded-2xl border border-border bg-surface p-5 sm:p-7"><h2 className="text-xl font-bold text-text-main">{t("Payment method")}</h2><div className="mt-5 space-y-3"><label className="flex cursor-pointer items-center gap-3 rounded-xl border border-primary bg-primary-soft px-4 py-4 text-sm font-semibold text-text-main"><input type="radio" name="payment" value="cash-on-delivery" defaultChecked className="size-4 accent-primary" /><span className="flex-1">{t("Cash on delivery")}</span><span className="text-xs font-bold uppercase tracking-wide text-primary">{t("Available")}</span></label><label className="flex cursor-not-allowed items-center gap-3 rounded-xl border border-border bg-surface-muted px-4 py-4 text-sm font-semibold text-text-muted"><input type="radio" name="payment" value="online" disabled className="size-4" /><span className="flex-1">{t("Online payment")}</span><span className="text-xs font-bold uppercase tracking-wide">{t("Unavailable")}</span></label></div></section>
          </div>
          <aside aria-labelledby="order-summary" className="rounded-2xl border border-border bg-surface p-6 lg:sticky lg:top-24"><h2 id="order-summary" className="text-xl font-bold text-text-main">{t("Your order")}</h2><div className="mt-6 space-y-4 border-b border-border pb-6">{cartItems.map((item) => <div key={item.id} className="flex items-start justify-between gap-4 text-sm"><p className="min-w-0 text-text-muted"><span className="font-semibold text-text-main">{item.quantity}×</span> {productText(item)}</p><p className="shrink-0 font-semibold text-text-main">{formatPrice(getProductPrice(item) * item.quantity)}</p></div>)}</div><div className="space-y-3 border-b border-border py-6 text-sm"><div className="flex justify-between gap-4 text-text-muted"><span>{t("Total")}</span><span className="font-semibold text-text-main">{formatPrice(cartFullTotal)}</span></div><div className="flex justify-between gap-4 text-text-muted"><span className="text-green-600">{t("Total discount")}</span><span className="font-semibold text-green-600">{formatPrice(cartDiscountTotal)}</span></div><div className="flex justify-between gap-4 font-bold text-text-main"><span>{t("After discount")}</span><span>{formatPrice(cartTotal)}</span></div><div className="flex justify-between gap-4 text-text-muted"><span>{t("Delivery")}</span><span className="font-semibold text-text-main">{selectedArea ? formatPrice(deliveryCharge) : t("Select an area")}</span></div></div><section className="border-b border-border py-5" aria-label={t("Voucher code")}>
              <label htmlFor="voucher-code" className="mb-2 block text-sm font-semibold text-text-main">{t("Voucher code")}</label>
              <div className="flex gap-2">
                <input id="voucher-code" type="text" dir="ltr" autoComplete="off" value={voucherCode} disabled={isCheckingVoucher || isSubmitting} onChange={(event) => { setVoucherCode(event.target.value); setVoucher(null); setVoucherError(""); }} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); applyVoucher(); } }} placeholder={t("Enter voucher code")} aria-invalid={Boolean(voucherError)} aria-describedby={voucherError ? "voucher-error" : undefined} className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-3 text-sm text-text-main outline-none focus:border-primary disabled:opacity-60" />
                <button type="button" onClick={applyVoucher} disabled={isCheckingVoucher || isSubmitting || Boolean(voucher)} className="rounded-xl bg-primary px-4 text-sm font-bold text-text-light hover:bg-primary-hover disabled:opacity-60">{isCheckingVoucher ? t("Checking…") : t("Apply")}</button>
              </div>
              {voucherError && <p id="voucher-error" role="alert" className="mt-2 text-sm text-red-600">{errorText(voucherError)}</p>}
              {voucher && <div className="mt-3 flex items-center justify-between gap-3 text-sm"><p role="status" className="text-green-600">{t("Voucher applied")}</p><button type="button" disabled={isSubmitting} onClick={() => { setVoucher(null); setVoucherCode(""); setVoucherError(""); }} className="font-semibold text-text-muted hover:text-primary">{t("Remove voucher")}</button></div>}
              {voucher && <div className="mt-3 flex justify-between gap-4 text-sm font-semibold text-green-600"><span>{t("Voucher discount")}</span><span>−{formatPrice(voucherDiscount / 1000)}</span></div>}
            </section><div className="flex items-center justify-between gap-4 py-6 font-bold text-text-main"><span className="text-lg">{t("Total")}</span><span className="text-xl">{formatPrice(orderTotal)}</span></div>{error && <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">{errorText(error)}</p>}<button type="submit" disabled={isSubmitting || isCheckingVoucher} className="flex min-h-14 w-full items-center justify-center rounded-xl bg-primary px-6 font-bold text-text-light transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60">{isSubmitting ? t("Placing order…") : t("Place order")}</button><button type="button" onClick={() => navigate("/cart")} className="mt-3 w-full text-sm font-semibold text-text-muted hover:text-primary">{t("Return to cart")}</button></aside>
        </form>
      )}
    </main>
  );
}

function SelectField({ id, label, value, onChange, options, placeholder, disabled = false }) {
  const { dataName } = useLanguage();
  return <div><label htmlFor={id} className="mb-2 block text-sm font-semibold text-text-main">{label}</label><select id={id} name={id} value={value} onChange={onChange} required disabled={disabled} className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-text-main outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-60"><option value="">{placeholder}</option>{options.map((option) => { const isLocation = typeof option === "object"; const optionValue = isLocation ? option.id : option; const optionLabel = isLocation ? dataName(option) : option; return <option key={optionValue} value={optionValue}>{optionLabel}</option>; })}</select></div>;
}

export default Checkout;
