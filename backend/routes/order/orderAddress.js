function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[character]);
}

function addressEmailHtml(address) {
    if (!address || typeof address !== "object" || Array.isArray(address)) {
        throw new Error("A delivery address is required.");
    }
    const location = address.location;
    let mapHtml = "";
    // Existing clients can continue placing orders without a map pin.
    if (location !== undefined && location !== null) {
        const { latitude, longitude } = location;
        if (typeof latitude !== "number" || !Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
            typeof longitude !== "number" || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
            throw new Error("Please select a valid location on the map.");
        }
        const coordinates = `${latitude},${longitude}`;
        const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(coordinates)}`;
        mapHtml = `<br><strong>Map coordinates:</strong> ${escapeHtml(coordinates)}<br><a href="${escapeHtml(mapsUrl)}">Open delivery location in Google Maps</a>`;
    }
    return `<p>
        <strong>Governorate:</strong> ${escapeHtml(address.governorate)}<br>
        <strong>Area:</strong> ${escapeHtml(address.area)}<br>
        <strong>Block:</strong> ${escapeHtml(address.block)}<br>
        <strong>Street:</strong> ${escapeHtml(address.street)}<br>
        <strong>Mobile number:</strong> ${escapeHtml(address.mobile)}<br>
        <strong>Notes:</strong> ${escapeHtml(address.notes || "None")}${mapHtml}
    </p>`;
}

module.exports = { addressEmailHtml };
