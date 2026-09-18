(function () {
  const AREAS = [
    { name: "Serangoon", lat: 1.3554, lng: 103.8679 },
    { name: "Kovan", lat: 1.3600, lng: 103.8850 },
    { name: "Bartley", lat: 1.3426, lng: 103.8797 },
    { name: "Bishan", lat: 1.3526, lng: 103.8352 },
    { name: "Thomson", lat: 1.3553, lng: 103.8329 },
    { name: "Toa Payoh", lat: 1.3343, lng: 103.8563 },
    { name: "Potong Pasir", lat: 1.3313, lng: 103.8686 },
    { name: "Paya Lebar", lat: 1.3183, lng: 103.8925 },
    { name: "MacPherson", lat: 1.3262, lng: 103.8901 },
    { name: "Katong", lat: 1.3033, lng: 103.9036 },
  ];

  const map = L.map("map").setView([1.335, 103.865], 12.2);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors",
    maxZoom: 18,
  }).addTo(map);

  const properties = prowlLoadProperties();

  AREAS.forEach((a) => {
    const inArea = properties.filter((p) => p.area === a.name);
    const marker = L.circleMarker([a.lat, a.lng], {
      radius: inArea.length ? 11 : 8,
      color: "#ffffff",
      fillColor: "#a8446b",
      fillOpacity: inArea.length ? 0.95 : 0.75,
      weight: 2,
    }).addTo(map);
    marker.bindPopup(`
      <b>${a.name}</b><br>
      ${inArea.length} propert${inArea.length === 1 ? "y" : "ies"} being stalked here<br>
      <a href="properties.html">View in Properties →</a>
    `);
  });
})();
