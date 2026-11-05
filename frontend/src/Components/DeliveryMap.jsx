import { useEffect, useRef, useState } from "react";
import { useLanguage } from "../contexts/LanguageContext";
import "leaflet/dist/leaflet.css";
import "./DeliveryMap.css";

export default function DeliveryMap({ value, onChange }) {
  const { t } = useLanguage();
  const container = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const leafletRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    let observer;
    // Load only in the browser, so server rendering can still render checkout.
    import("leaflet").then(({ default: L }) => {
      if (cancelled) return;
      leafletRef.current = L;
      const map = L.map(container.current, { scrollWheelZoom: false }).setView([29.3759, 47.9774], 11);
      mapRef.current = map;
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).on("tileerror", () => setError("The map could not load. You can still order using your written address."))
        .on("tileload", () => setError(""))
        .addTo(map);
      map.on("click", ({ latlng }) => {
        const { lat, lng } = latlng.wrap();
        onChange({ latitude: lat, longitude: lng });
      });
      observer = new ResizeObserver(() => map.invalidateSize());
      observer.observe(container.current);
      setReady(true);
    }).catch(() => {
      if (!cancelled) setError("The map could not load. You can still order using your written address.");
    });
    return () => {
      cancelled = true;
      observer?.disconnect();
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, [onChange]);

  useEffect(() => {
    const map = mapRef.current;
    const L = leafletRef.current;
    if (!ready || !map || !L) return;
    if (!value) {
      markerRef.current?.remove();
      markerRef.current = null;
      return;
    }
    const position = [value.latitude, value.longitude];
    if (!markerRef.current) {
      markerRef.current = L.marker(position, {
        draggable: true,
        icon: L.divIcon({ className: "delivery-map-pin", html: '<span aria-hidden="true"></span>', iconSize: [28, 36], iconAnchor: [14, 36] }),
        alt: t("Selected delivery location"),
        title: t("Drag to adjust your location"),
      }).on("dragend", (event) => {
        const { lat, lng } = event.target.getLatLng().wrap();
        onChange({ latitude: lat, longitude: lng });
      }).addTo(map);
    } else {
      markerRef.current.setLatLng(position);
    }
    if (!map.getBounds().contains(position)) map.panTo(position);
  }, [value, ready, onChange, t]);

  const locate = () => {
    if (!navigator.geolocation) return setError("Your browser does not support location sharing. Please select a point on the map.");
    setLocating(true);
    setError("");
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      if (!mapRef.current) return;
      const position = { latitude: coords.latitude, longitude: coords.longitude };
      onChange(position);
      mapRef.current.setView([position.latitude, position.longitude], 17);
      setLocating(false);
    }, () => {
      if (!mapRef.current) return;
      setError("We could not access your location. Allow location access or select a point on the map.");
      setLocating(false);
    }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
  };

  return <div className="mt-6 border-t border-border pt-6">
    <h3 className="font-semibold text-text-main">{t("Delivery location on map")} <span className="text-sm font-normal text-text-muted">{t("(optional)")}</span></h3>
    <p id="delivery-map-help" className="mt-2 text-sm text-text-muted">{t("Tap the map to drop a pin, or use your current location. Drag the pin to adjust it.")}</p>
    <p className="mt-2 text-sm text-text-muted">{t("Your selected location will be emailed with your address. Please keep your governorate and area consistent with the pin.")}</p>
    <div className="my-3 flex flex-wrap gap-3">
      <button type="button" disabled={!ready || locating} onClick={locate} className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-primary disabled:opacity-50">{t(locating ? "Finding your location…" : "Use my current location")}</button>
      <button type="button" disabled={!ready} onClick={() => {
        const center = mapRef.current.getCenter().wrap();
        onChange({ latitude: center.lat, longitude: center.lng });
      }} className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-primary disabled:opacity-50">{t("Select map center")}</button>
      {value && <button type="button" onClick={() => onChange(null)} className="px-2 py-2 text-sm text-text-muted">{t("Remove location")}</button>}
    </div>
    <div ref={container} role="region" aria-label={t("Delivery location map")} aria-describedby="delivery-map-help" dir="ltr" className="delivery-map relative z-0 h-80 w-full overflow-hidden rounded-xl border border-border" />
    <p role="status" className="mt-3 text-sm text-text-muted">{value ? <>{t("Selected location")}: <span dir="ltr">{value.latitude.toFixed(6)}, {value.longitude.toFixed(6)}</span> · <a href={`https://www.google.com/maps/search/?api=1&query=${value.latitude},${value.longitude}`} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary underline">{t("Open in Google Maps")}</a></> : t("No map location selected")}</p>
    {error && <p role="alert" className="mt-2 text-sm text-red-600">{t(error)}</p>}
  </div>;
}
