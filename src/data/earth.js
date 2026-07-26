// EARTH — the one world we have to get right.
//
// Robert: *"when going to orbit we need to see earth like this... make a model of earth 1 to 1 so
// we see it like this when leaving earth. day and night should depend on that. aim for visual awe
// but aligned with our style."*
//
// ⚠ THERE WAS NO GEOGRAPHY IN THIS PROJECT. The cities sheet has 1,050 rows and not one coordinate
// (`_cityLL` in hud.js hashes country+city into a plausible-looking lat/lon precisely because the
// sheet has none), `data/geography.js` is an authored join keyed on country NAME, and every planet
// in the space layer was a flat-shaded icosahedron with colour bands. Drawing Earth means having
// coastlines, and there were none to have.
//
// So they are AUTHORED here, the same way terrain and climate are authored in their own files
// rather than faked out of a column that does not exist. These are coarse outlines — a few dozen
// points per landmass, accurate to roughly a degree at the scale they are drawn — and they are
// deliberately polygons rather than a bitmap: a polygon rasterises to ANY resolution, so the same
// data gives a 64px thumbnail and a 4096px globe, and it also answers "is this point on land",
// which is what the city lights and the ice caps need.
//
// ⚠ It is a MAP, not a survey. Do not use it to answer a question about the real world.

// Each entry is a closed ring of [lon, lat] in degrees. Lon -180..180, lat -90..90.
export const COASTS = {
  africa: [
    [-17.0, 14.7], [-16.0, 19.4], [-13.0, 21.3], [-9.8, 26.0], [-9.6, 29.9], [-5.3, 35.9],
    [0.0, 36.8], [8.6, 36.9], [10.2, 37.3], [11.5, 33.8], [19.0, 30.3], [25.0, 31.6],
    [32.3, 31.2], [34.0, 27.5], [39.0, 21.0], [43.3, 12.6], [51.4, 11.8], [50.8, 6.5],
    [42.5, 0.9], [40.1, -6.5], [40.5, -15.5], [35.5, -23.9], [32.6, -28.5], [27.9, -33.0],
    [22.0, -34.8], [18.4, -34.4], [14.5, -22.9], [11.7, -15.9], [13.4, -8.9], [8.9, -1.0],
    [9.4, 4.0], [4.0, 6.4], [-1.0, 5.2], [-7.5, 4.4], [-13.3, 8.6], [-16.7, 12.3],
  ],
  eurasia: [
    [-9.5, 38.7], [-9.2, 43.2], [-1.6, 47.0], [-4.7, 48.6], [1.9, 51.0], [4.3, 52.4],
    [8.5, 55.0], [10.5, 57.7], [5.3, 61.5], [12.0, 65.5], [17.0, 69.9], [28.0, 71.0],
    [40.5, 67.8], [55.0, 68.5], [69.0, 73.0], [80.0, 73.5], [93.0, 76.0], [105.0, 77.5],
    [113.0, 73.5], [130.0, 71.5], [142.0, 72.5], [160.0, 69.7], [170.0, 69.9], [179.0, 65.8],
    [170.0, 60.0], [163.0, 57.5], [156.0, 51.0], [142.0, 54.0], [140.5, 45.9], [130.5, 42.8],
    [126.0, 37.5], [122.0, 39.5], [121.5, 30.8], [110.0, 21.5], [106.5, 10.5], [100.0, 13.5],
    [98.5, 8.0], [100.5, 3.0], [96.0, 5.6], [92.0, 21.0], [88.0, 21.7], [80.3, 15.9],
    [77.5, 8.1], [73.0, 15.0], [68.9, 23.9], [61.0, 25.0], [56.5, 26.8], [50.0, 28.9],
    [48.0, 30.0], [43.5, 29.0], [35.0, 31.5], [36.0, 36.0], [29.0, 41.0], [23.7, 38.0],
    [18.5, 40.5], [12.5, 37.9], [15.6, 38.2], [12.4, 44.2], [14.5, 45.5], [18.6, 40.1],
    [12.0, 41.0], [8.8, 44.4], [3.0, 43.0], [-0.3, 39.5], [-6.9, 37.0],
  ],
  namerica: [
    [-168.0, 65.7], [-161.0, 70.6], [-141.0, 70.0], [-128.0, 70.2], [-115.0, 69.5],
    [-95.0, 68.5], [-85.0, 70.0], [-78.0, 73.0], [-65.0, 66.0], [-56.0, 51.5],
    [-64.0, 46.0], [-66.0, 44.5], [-70.5, 43.0], [-74.0, 40.7], [-75.5, 35.2],
    [-81.0, 31.0], [-80.1, 25.8], [-82.6, 27.8], [-84.0, 30.0], [-89.0, 29.2],
    [-94.8, 29.3], [-97.5, 26.0], [-95.0, 18.6], [-91.0, 18.7], [-87.0, 21.5],
    [-88.0, 15.9], [-83.0, 8.9], [-79.0, 9.0], [-83.5, 12.5], [-88.0, 13.5],
    [-95.0, 16.0], [-105.5, 20.5], [-109.5, 23.5], [-112.0, 30.0], [-117.1, 32.5],
    [-121.0, 36.6], [-124.2, 42.0], [-124.7, 48.4], [-131.0, 54.0], [-136.0, 58.5],
    [-146.0, 60.5], [-152.0, 58.0], [-158.0, 56.5], [-165.0, 60.0], [-166.5, 64.5],
  ],
  samerica: [
    [-81.3, 4.5], [-77.0, 8.5], [-71.5, 12.4], [-63.0, 10.6], [-60.0, 8.6], [-52.0, 4.9],
    [-49.0, 0.0], [-44.0, -2.5], [-38.5, -3.7], [-35.2, -5.8], [-38.5, -13.0],
    [-39.0, -18.0], [-42.0, -22.9], [-48.5, -25.5], [-52.0, -32.0], [-57.5, -34.9],
    [-62.0, -39.0], [-65.0, -41.0], [-65.5, -45.0], [-68.5, -50.0], [-68.0, -54.9],
    [-74.0, -52.5], [-75.5, -47.0], [-73.5, -42.0], [-73.5, -37.0], [-71.5, -30.0],
    [-70.4, -23.6], [-70.5, -18.4], [-77.0, -12.0], [-81.0, -6.0], [-80.9, -2.2],
    [-79.5, 1.0],
  ],
  australia: [
    [113.2, -26.0], [113.7, -22.0], [122.0, -18.0], [130.0, -11.5], [136.7, -12.0],
    [135.0, -15.0], [140.0, -17.5], [142.5, -10.7], [145.5, -15.0], [149.0, -21.0],
    [153.5, -28.0], [151.0, -34.0], [147.5, -38.5], [140.0, -38.0], [135.0, -34.8],
    [129.0, -31.7], [123.0, -34.0], [117.5, -35.1], [115.0, -34.0], [113.5, -30.0],
  ],
  antarctica: [
    [-180, -71], [-150, -75], [-120, -73], [-90, -72], [-60, -68], [-45, -75],
    [-20, -71], [10, -70], [40, -68], [70, -67], [100, -66], [130, -66],
    [160, -70], [180, -78], [180, -90], [-180, -90],
  ],
  greenland: [
    [-45.0, 60.0], [-52.0, 65.0], [-53.0, 69.0], [-56.0, 72.0], [-60.0, 76.0],
    [-68.0, 78.5], [-60.0, 82.0], [-45.0, 83.5], [-25.0, 82.5], [-20.0, 78.0],
    [-22.0, 72.0], [-30.0, 68.0], [-38.0, 65.0],
  ],
  madagascar: [[43.2, -12.2], [50.5, -15.5], [50.4, -20.0], [47.0, -25.6], [44.0, -21.0], [43.3, -16.0]],
  japan: [[130.0, 31.0], [135.0, 34.0], [140.0, 35.5], [141.5, 39.0], [141.0, 43.5], [144.5, 44.0],
          [143.0, 42.0], [138.0, 37.0], [132.0, 34.5], [129.5, 33.0]],
  britain: [[-5.0, 50.0], [-3.0, 53.5], [-5.0, 55.0], [-5.5, 58.5], [-2.0, 57.7], [0.5, 52.8], [1.5, 51.3]],
  ireland: [[-10.3, 51.6], [-10.0, 54.3], [-8.0, 55.3], [-6.0, 54.5], [-6.0, 52.2]],
  nzealand: [[172.7, -34.4], [178.5, -37.6], [177.0, -39.5], [174.8, -41.4], [170.5, -43.0],
             [166.5, -45.9], [168.5, -46.6], [173.3, -43.6], [174.0, -41.0], [173.0, -38.0]],
  borneo: [[109.5, 1.8], [117.5, 4.2], [119.0, -0.9], [116.0, -3.9], [110.0, -3.0], [109.0, -1.0]],
  sumatra: [[95.3, 5.6], [98.5, 3.7], [104.0, -1.0], [106.0, -5.9], [102.0, -5.2], [98.0, -1.0]],
  newguinea: [[131.0, -1.0], [141.0, -2.6], [147.0, -6.0], [150.5, -10.0], [143.0, -9.0],
              [137.0, -8.5], [132.5, -4.0]],
  iceland: [[-24.5, 65.5], [-22.0, 66.5], [-16.0, 66.5], [-14.0, 65.0], [-18.0, 63.4], [-22.5, 63.8]],
  philippines: [[120.0, 18.5], [122.5, 17.0], [126.0, 9.0], [122.0, 6.0], [120.0, 12.0]],
  cuba: [[-84.9, 21.9], [-80.0, 23.2], [-74.2, 20.3], [-77.5, 19.9], [-82.5, 21.5]],
  svalbard: [[10.5, 76.5], [17.0, 77.0], [21.0, 79.5], [15.0, 80.0], [11.0, 79.0]],
  novaya: [[52.0, 70.7], [58.0, 73.5], [69.0, 76.5], [61.0, 75.0], [55.0, 72.0]],
  srilanka: [[79.7, 9.8], [81.9, 7.5], [80.3, 5.9], [79.8, 8.0]],
  hispaniola: [[-74.5, 18.3], [-68.3, 18.6], [-69.0, 19.9], [-72.5, 20.0]],
  tasmania: [[144.7, -40.7], [148.3, -40.9], [147.0, -43.5], [145.0, -43.0]],
  hokkaido_kuriles: [[145.5, 44.0], [150.0, 46.0], [156.0, 50.5], [153.0, 47.0], [147.0, 44.5]],
  sulawesi: [[119.8, 1.5], [125.0, 1.5], [123.0, -0.8], [121.0, -5.5], [119.4, -5.0], [119.0, -1.0]],
};

// ⚠ INLAND SEAS AND GREAT LAKES ARE CUT OUT AFTER the land is filled. Without them the Caspian is
// a lump of Asia and the Great Lakes do not exist — and those are two of the handful of features
// people actually recognise from orbit, so their absence reads as "wrong planet" long before
// anybody can say why.
export const INLAND = {
  caspian: [[47.0, 45.0], [53.5, 45.5], [53.0, 41.0], [50.5, 38.0], [49.0, 40.0], [47.5, 42.5]],
  black: [[28.0, 41.5], [41.5, 42.5], [40.0, 46.0], [31.5, 46.5], [28.5, 44.0]],
  greatlakes: [[-92.0, 46.7], [-84.5, 46.5], [-79.0, 43.3], [-76.0, 44.2], [-82.5, 41.5],
               [-87.5, 41.7], [-88.0, 45.0]],
  baikal: [[103.5, 51.5], [110.0, 55.5], [109.5, 56.5], [105.5, 53.0]],
  aral: [[58.0, 44.5], [61.5, 45.5], [61.0, 43.5], [58.5, 43.5]],
  mediterranean_cut: null,   // the coast rings already describe it — kept as a note, never drawn
};

// Where the ice actually is, as a latitude band that varies with longitude. Antarctica is a
// continent and is drawn as one; the ARCTIC is sea ice and has no coastline at all, which is why
// it needs its own rule rather than a polygon.
export const ARCTIC_ICE_LAT = 72;
export const ANTARCTIC_ICE_LAT = -66;

// ---------------------------------------------------------------------------------------------
// Point-in-polygon on a lon/lat ring. Used for "is this on land" — the city lights need it and so
// does anything that wants to drop a marker on a coastline rather than in the sea.
export function inRing(lon, lat, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1], xj = ring[j][0], yj = ring[j][1];
    if ((yi > lat) !== (yj > lat) && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
export function isLand(lon, lat) {
  for (const k in COASTS) if (inRing(lon, lat, COASTS[k])) {
    for (const j in INLAND) if (INLAND[j] && inRing(lon, lat, INLAND[j])) return false;
    return true;
  }
  return false;
}

// ---------------------------------------------------------------------------------------------
// THE SUBSOLAR POINT — where the sun is directly overhead right now. This is what makes the
// terminator honest: the day/night line is not a decoration slid across the texture, it is the
// consequence of a date and a time.
//
//   LATITUDE  comes from the season — the axial tilt swings the subsolar point between the
//             tropics across the year, which is why the Arctic is lit at midsummer and black in
//             December. Same calendar the planets orbit on (data/orbits.js).
//   LONGITUDE comes from the clock — the Earth turns 15 degrees an hour, and `world.dayT` is the
//             in-world time the sky, the news bug and the pedestrians already run on.
export const AXIAL_TILT = 23.44;
export function subsolar(date, dayT) {
  const d = date || { y: 2026, m: 2, d: 12 };
  // day of year, good enough for a sun angle (no leap-year fuss at this resolution)
  const cum = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  const doy = cum[Math.max(0, Math.min(11, (d.m | 0) - 1))] + (d.d | 0);
  // declination: the standard cosine approximation, peaking at the solstice
  const lat = -AXIAL_TILT * Math.cos(((doy + 10) / 365.25) * Math.PI * 2);
  // dayT 0.25 = noon (data/news.js cityHour) — noon means the sun is over longitude 0
  const hours = (((dayT == null ? 0.25 : dayT) * 24 + 6) % 24);
  const lon = -(hours - 12) * 15;
  return { lat, lon: ((lon + 540) % 360) - 180 };
}
