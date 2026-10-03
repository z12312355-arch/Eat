export function validateLocation(lat, lon) {
  return Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180;
}
export function distanceMeters(a, b) {
  const rad = n => n * Math.PI / 180;
  const dLat = rad(b.lat - a.lat), dLon = rad(b.lon - a.lon);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(Math.max(0, 1 - x)));
}
export function buildQuery(location, radius) {
  if (!validateLocation(location.lat, location.lon) || !Number.isFinite(radius) || radius < 300 || radius > 5000) throw new Error('位置或距離不正確');
  return `[out:json][timeout:25];nwr["amenity"~"^(restaurant|fast_food|cafe)$"]["name"](around:${radius},${location.lat},${location.lon});out center tags;`;
}
export function normalizePlaces(elements, location, radius) {
  const seen = new Set();
  return elements.flatMap(e => {
    const lat = e.lat ?? e.center?.lat, lon = e.lon ?? e.center?.lon, tags = e.tags ?? {};
    const name = tags['name:zh'] || tags.name;
    if (!name || !validateLocation(lat, lon) || !['restaurant','fast_food','cafe'].includes(tags.amenity)) return [];
    const distance = distanceMeters(location, {lat, lon});
    if (distance > radius) return [];
    const key = `${name.trim().toLowerCase()}|${lat.toFixed(4)}|${lon.toFixed(4)}`;
    if (seen.has(key)) return [];
    seen.add(key);
    return [{id:`osm:${e.type}:${e.id}`,name,lat,lon,distance,kind:tags.amenity,cuisine:tags.cuisine || '',hours:tags.opening_hours || '',source:'osm',address:[tags['addr:city'],tags['addr:district'],tags['addr:street'],tags['addr:housenumber']].filter(Boolean).join('')}];
  }).sort((a,b) => a.distance - b.distance);
}
export function eligiblePlaces(places, {selected, blocked, history, avoidRecent, kind, now = Date.now()}) {
  const recent = new Set(history.filter(h => now - h.at < 7 * 86400000 && now >= h.at).map(h => h.id));
  return places.filter(p => selected.has(p.id) && !blocked.some(b => b.id === p.id) && (!avoidRecent || !recent.has(p.id)) && (p.source !== 'osm' || kind === 'all' || p.kind === kind));
}
export function randomIndex(length, cryptoSource = globalThis.crypto) {
  if (!Number.isInteger(length) || length < 1 || length > 0xffffffff) throw new Error('沒有候選餐廳');
  const ceiling = Math.floor(0x100000000 / length) * length;
  const values = new Uint32Array(1);
  do { cryptoSource.getRandomValues(values); } while (values[0] >= ceiling);
  return values[0] % length;
}
export function targetRotation(current, index, count) {
  const target = (360 - (index + .5) * (360 / count)) % 360;
  const normalized = ((current % 360) + 360) % 360;
  return current + 5 * 360 + ((target - normalized + 360) % 360);
}
export function mapsUrl(place, navigation = false) {
  const hasCoordinates=validateLocation(place.lat,place.lon);
  const target=hasCoordinates ? `${place.lat},${place.lon}` : [place.name,place.address].filter(Boolean).join(' ');
  if(navigation) return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(target)}&travelmode=walking`;
  const query=[place.name,place.address || (hasCoordinates ? `${place.lat},${place.lon}` : '')].filter(Boolean).join(' ');
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
