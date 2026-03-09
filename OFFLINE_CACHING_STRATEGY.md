# Offline Caching Strategy for Time Strolls

## 📋 Project Context

**App Purpose:** Historical hiking/exploration app for rural areas with GPS but poor/no internet connectivity.

**Primary Use Case:** Users explore freely in the "middle of nowhere" where internet is unavailable. They need to pre-download map data, location information, historical images, and audio content before their hike.

**Geographic Focus:** Deutsch Reichenau region (Austria) - can expand to other areas.

**Current Stack:**
- Frontend: React + Leaflet maps
- Backend: FastAPI + PostgreSQL
- Map Tiles: CartoCD (modern) + Custom CDN (1945 historic tiles)
- Data: ~14 locations with images and audio podcasts

---

## 🎯 Project Goal

**Enable users to download map areas for completely offline use** with the following requirements:

1. **User-initiated downloads** - Explicit action, not automatic
2. **Viewport-based** - Download what's currently visible on the map
3. **Complete offline capability** - Assume zero internet connectivity during use
4. **Cross-platform** - Work identically on mobile and desktop browsers
5. **Storage-conscious** - Protect users from excessive storage use
6. **Free exploration** - Not tour-based, users wander and discover

---

## 📦 What Gets Downloaded

For the current map viewport, download:

### Essential Data:
- ✅ **Location metadata** (coordinates, names, slugs, descriptions)
- ✅ **All images** for locations in viewport (full resolution JPEGs)
- ✅ **All audio podcasts** for locations in viewport (MP3 files)
- ✅ **Modern map tiles** (CartoCDN) for viewport at zoom levels ±2
- ✅ **Historic 1945 map tiles** (custom CDN) for same viewport at zoom levels ±2
- ✅ **Tour data** if tours pass through the viewport

### Why Include Historic Tiles:
Users expect the full experience offline. Since they already paid the storage cost for modern tiles, historic tiles (~2x the data) provide significant value for the historical exploration use case.

---

## 🏗️ Technical Architecture

### Storage Strategy

```
┌─────────────────────────────────────┐
│  Cache API ("timestrolls-cache")   │
├─────────────────────────────────────┤
│  • Modern map tiles (CartoCDN)      │
│  • Historic 1945 tiles (CDN)        │
│  • Location images (JPEGs)          │
│  • Podcast audio files (MP3s)       │
│                                     │
│  Storage: ~95% of total size        │
│  Use Case: URL-based resources      │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  IndexedDB ("timestrolls-db")       │
├─────────────────────────────────────┤
│  Store: "locations"                 │
│    - id, slug, name, lat, lon       │
│    - image metadata, podcast meta   │
│                                     │
│  Store: "tours"                     │
│    - id, name, route, waypoints     │
│                                     │
│  Store: "downloadedAreas"           │
│    - bounds (ne/sw lat/lon)         │
│    - timestamp, expiresAt           │
│    - size, zoomLevels               │
│                                     │
│  Storage: ~5% of total size         │
│  Use Case: Structured data, queries │
└─────────────────────────────────────┘
```

### Why This Architecture:

**Cache API:**
- Designed for offline web apps
- Perfect for URL-based resources (tiles, images, audio)
- Integrates seamlessly with Service Workers
- Browser-managed storage quotas
- Works identically on mobile & desktop

**IndexedDB:**
- Fast queries with indexes
- Transactional integrity
- Perfect for structured JSON data
- Can store large objects efficiently
- Enables download tracking and expiration management

**Service Worker:**
- Intercepts network requests
- Serves cached content when offline
- Enables Progressive Web App (PWA) functionality
- Runs in background, doesn't block UI

---

## 🔄 Data Flow

### Online - First Visit:
```
User → React App → Fetch API → Backend (FastAPI)
                                    ↓
                              PostgreSQL
                                    ↓
                          Returns: locations, images, tiles
                                    ↓
                          Display (not cached)
```

### User Initiates Download:
```
1. User pans/zooms to area of interest
2. Clicks "Download for Offline" button
3. App calculates:
   - Viewport bounds (lat/lon)
   - Locations within bounds
   - Required tile URLs (zoom ±2 levels)
   - Total estimated size
4. Shows confirmation: "Download 45 MB?"
5. User confirms
6. Download sequence:
   a. Fetch locations → IndexedDB
   b. Fetch tiles → Cache API
   c. Fetch images → Cache API
   d. Fetch audio → Cache API
   e. Store metadata → IndexedDB (downloadedAreas)
7. Show progress: "23/150 items downloaded"
```

### Offline - Later Use:
```
User opens app (no internet)
        ↓
Service Worker intercepts all fetch requests
        ↓
Check Cache API / IndexedDB
        ↓
   Found? → Serve from local storage ✅
   Not found? → Show offline message ❌
```

---

## 📐 Zoom Level Strategy

**Decision: Download current zoom ±2 levels**

### Rationale:
- Allows users to zoom in for detail or out for context while offline
- Balances storage vs. usability
- Typical use: User hikes at zoom 14-15, may zoom to 13-17 range

### Example:
```
User viewing at zoom 14
  → Download tiles for zoom: 12, 13, 14, 15, 16
  
Result:
  - Zoom out 2 levels (12, 13) ✅
  - Current view (14) ✅
  - Zoom in 2 levels (15, 16) ✅
```

### Alternatives Considered:
- **±1 level** - Too restrictive, users may want more detail
- **±3 levels** - Excessive storage for marginal benefit
- **Current only** - Too limiting, users naturally zoom
- **Full range (10-18)** - Excessive data, exponential growth

---

## 🛡️ Storage Protection Strategy

### The Problem:
User downloads 500 MB, hikes once, forgets about app → wasted storage forever.

### Solution: **30-Day Auto-Expiration**

```javascript
Downloaded data expires after 30 days automatically
├── Store timestamp with each download
├── Check age on app startup
├── Auto-delete if older than 30 days
└── Notify user: "Old data (45 days) cleared, 50 MB freed"
```

### Why 30 Days:

| Duration | Pros | Cons | Verdict |
|----------|------|------|---------|
| 7 days | Very safe, aggressive | May expire before next hike | Too short |
| **30 days** | Industry standard, balanced | Good middle ground | ✅ **CHOSEN** |
| 90 days | User-friendly | More wasted storage | Too long |

### Additional Protections:

1. **Storage Quota API** - Check available space before download
2. **Size Warnings** - Alert if download >200 MB
3. **Transparency** - Show size and expiration before download
4. **Cache Management UI** - Settings → View/delete cached areas
5. **Browser Protection** - Browsers auto-manage storage when device is low

### Progressive Data Retention (Future Enhancement):
```
Location data:   90 days (tiny, keep longer)
Map tiles:       30 days (medium size)
Images:          14 days (large, expire sooner)
Podcasts:         7 days (very large, expire soonest)
```

---

## 📱 Cross-Platform Compatibility

### Storage Limits by Platform:

**Mobile:**
- Chrome Android: ~50% available disk space
- Safari iOS: ~50 MB initially, can request more
- Firefox Android: ~50% available disk space

**Desktop:**
- Chrome: ~60% available disk space (10s of GBs)
- Firefox: ~50% available disk space
- Safari: ~1 GB initially, can request more

### Design Decision:
**Design for mobile constraints, desktop will have more headroom.**

### What Works Identically:
- ✅ Cache API
- ✅ IndexedDB
- ✅ Service Workers
- ✅ Storage Estimate API
- ✅ Offline detection

### Platform Differences:
- ⚠️ iOS Safari: More restrictive quotas
- ⚠️ iOS PWA: Better persistence when "Add to Home Screen"
- ✅ All modern browsers support the same APIs

---

## 🎨 User Interface Design

### Download Flow:

```
1. User pans/zooms to area
2. "Download for Offline" button appears (when online)
3. Click button
4. Modal shows:
   ┌─────────────────────────────────┐
   │  Download Area?                 │
   │                                 │
   │  📦 Size: 150 MB                │
   │  ⏱️  Expires: 30 days            │
   │                                 │
   │  Includes:                      │
   │  • 8 locations                  │
   │  • 32 images                    │
   │  • 4 audio files                │
   │  • Map tiles (zoom 12-16)       │
   │  • Historic 1945 tiles          │
   │                                 │
   │  This data auto-deletes after   │
   │  30 days to protect storage.    │
   │                                 │
   │  [Cancel]  [Download]           │
   └─────────────────────────────────┘
5. Progress indicator: "47/152 items downloaded"
6. Success: "✓ Area downloaded (150 MB)"
```

### Cache Management UI:

```
Settings → Offline Data
┌─────────────────────────────────┐
│  Storage Used: 280 MB           │
│                                 │
│  Downloaded Areas:              │
│  ┌─────────────────────────┐   │
│  │ Deutsch Reichenau       │   │
│  │ 150 MB • Dec 15         │   │
│  │ Expires: Jan 14         │   │
│  │           [Delete] 🗑️   │   │
│  └─────────────────────────┘   │
│  ┌─────────────────────────┐   │
│  │ Sankt Oswald area       │   │
│  │ 130 MB • Dec 18         │   │
│  │ Expires in 27 days      │   │
│  │           [Delete] 🗑️   │   │
│  └─────────────────────────┘   │
│                                 │
│  [Clear All Offline Data]       │
└─────────────────────────────────┘
```

### Offline Indicator:

```
Top of map:
┌─────────────────────┐
│ 📡 Offline Mode     │  ← Shown when no internet
│ Using cached data   │
└─────────────────────┘
```

---

## 🔧 Implementation Components

### 1. Tile Calculation Logic

```javascript
function calculateTilesForViewport(bounds, currentZoom) {
  const minZoom = currentZoom - 2;
  const maxZoom = currentZoom + 2;
  const tiles = [];
  
  for (let z = minZoom; z <= maxZoom; z++) {
    const neXY = latLonToTile(bounds.ne.lat, bounds.ne.lon, z);
    const swXY = latLonToTile(bounds.sw.lat, bounds.sw.lon, z);
    
    for (let x = swXY.x; x <= neXY.x; x++) {
      for (let y = neXY.y; y <= swXY.y; y++) {
        tiles.push({
          z, x, y,
          modernUrl: `https://basemaps.cartocdn.com/.../${z}/${x}/${y}.png`,
          historicUrl: `https://cdn.../1945/${z}/${x}/${y}.png`
        });
      }
    }
  }
  
  return tiles;
}
```

### 2. Download Manager

```javascript
async function downloadArea(bounds, currentZoom) {
  // 1. Check storage
  const estimate = await navigator.storage.estimate();
  const available = estimate.quota - estimate.usage;
  
  // 2. Calculate what to download
  const locations = findLocationsInBounds(bounds);
  const tiles = calculateTilesForViewport(bounds, currentZoom);
  const estimatedSize = calculateSize(locations, tiles);
  
  // 3. Verify space
  if (estimatedSize > available) {
    throw new Error('Not enough storage');
  }
  
  // 4. Download & cache
  const cache = await caches.open('timestrolls-cache');
  const db = await openDB('timestrolls-db', 1);
  
  // Download tiles
  for (const tile of tiles) {
    await cache.add(tile.modernUrl);
    await cache.add(tile.historicUrl);
    updateProgress();
  }
  
  // Download location media
  for (const location of locations) {
    for (const image of location.images) {
      await cache.add(image.url);
      updateProgress();
    }
    if (location.podcast) {
      await cache.add(location.podcast.url);
      updateProgress();
    }
  }
  
  // Store metadata
  await db.put('downloadedAreas', {
    id: generateId(),
    bounds,
    zoomRange: [currentZoom - 2, currentZoom + 2],
    downloadedAt: Date.now(),
    expiresAt: Date.now() + (30 * 24 * 60 * 60 * 1000),
    size: estimatedSize,
    locationCount: locations.length
  });
}
```

### 3. Service Worker

```javascript
// sw.js
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached if available
        if (response) {
          return response;
        }
        
        // Try network
        return fetch(event.request)
          .catch(() => {
            // Offline and not cached
            if (event.request.destination === 'image') {
              return new Response('Image not available offline');
            }
            return new Response('Content not available offline', {
              status: 503,
              statusText: 'Service Unavailable'
            });
          });
      })
  );
});
```

### 4. Cache Cleanup

```javascript
async function cleanupExpiredCache() {
  const db = await openDB('timestrolls-db', 1);
  const areas = await db.getAll('downloadedAreas');
  
  for (const area of areas) {
    if (Date.now() > area.expiresAt) {
      // Delete metadata
      await db.delete('downloadedAreas', area.id);
      
      // Delete tiles and media
      const cache = await caches.open('timestrolls-cache');
      // Calculate and delete associated cache entries
      await deleteAreaCache(area, cache);
      
      // Notify user
      console.log(`Cleaned up expired area: ${area.id}, freed ${area.size} bytes`);
    }
  }
}

// Run on app startup
window.addEventListener('load', cleanupExpiredCache);
```

---

## ⚖️ Alternatives Considered

### Alternative 1: Tour-Based Downloads
**Rejected because:** Users explore freely, not following predefined tours primarily.

### Alternative 2: Automatic Background Caching
**Rejected because:** 
- Wastes user data/storage without consent
- Can't predict where users will hike
- User-initiated is more transparent and respectful

### Alternative 3: Area Selection Tool (Draw on Map)
**Deferred to future:** 
- More complex UI
- Viewport-based is simpler and covers most use cases
- Can add later if needed

### Alternative 4: Full Region Download
**Rejected because:**
- Excessive storage (potentially GBs)
- Most areas never visited
- Wasteful for single-use hikers

### Alternative 5: Native App (iOS/Android)
**Rejected because:**
- PWA achieves same offline functionality
- No app store friction
- Cross-platform with single codebase
- Easier updates
- Better for occasional users

### Alternative 6: LocalStorage
**Rejected because:**
- Only 5-10 MB limit
- Synchronous (blocks UI)
- Can't store binary efficiently
- Cache API + IndexedDB are superior

---

## 🎯 Success Metrics

### Technical Metrics:
- Cache hit rate when offline: >95%
- Download success rate: >98%
- Average download time for typical area: <2 minutes
- Storage efficiency: <50 MB per typical hiking area

### User Metrics:
- Percentage of users who download before hiking: (to be measured)
- Cache expiration compliance: 100% (automatic)
- User-initiated cache deletions: (to be tracked)
- Offline usage sessions: (to be measured)

---

## 🚀 Implementation Phases

### Phase 1: Core PWA Setup (Week 1)
- [ ] Service Worker registration
- [ ] Basic cache for app shell (HTML/CSS/JS)
- [ ] Offline detection and indicator
- [ ] Test offline app loading

### Phase 2: Strategic Caching (Week 2-3)
- [ ] Tile calculation logic
- [ ] Location filtering by viewport
- [ ] Download button UI
- [ ] Progress indicator
- [ ] Cache API integration
- [ ] IndexedDB setup
- [ ] Download manager implementation

### Phase 3: Cache Management (Week 3-4)
- [ ] Storage quota checking
- [ ] Size estimation
- [ ] Confirmation dialogs with warnings
- [ ] Cache management UI (Settings)
- [ ] View downloaded areas
- [ ] Delete individual/all cached areas
- [ ] Expiration logic (30 days)
- [ ] Cleanup on app startup

### Phase 4: Testing & Polish (Week 4-5)
- [ ] Cross-browser testing (Chrome, Safari, Firefox)
- [ ] Mobile testing (iOS, Android)
- [ ] Offline functionality testing
- [ ] Storage limit testing
- [ ] Expiration testing
- [ ] Error handling and edge cases
- [ ] Performance optimization

### Phase 5: Advanced Features (Future)
- [ ] Visual indicator of cached areas on map
- [ ] Progressive data retention (different expiration for media types)
- [ ] Pre-expiration notifications ("Data expires in 3 days")
- [ ] Extend expiration button
- [ ] Background sync for updates
- [ ] Area selection tool (draw on map)
- [ ] Tour-based quick downloads

---

## 📚 References & Standards

- **Progressive Web Apps (PWA):** https://web.dev/progressive-web-apps/
- **Cache API:** https://developer.mozilla.org/en-US/docs/Web/API/Cache
- **IndexedDB:** https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API
- **Service Workers:** https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API
- **Storage API:** https://developer.mozilla.org/en-US/docs/Web/API/Storage_API
- **Tile Calculations:** https://wiki.openstreetmap.org/wiki/Slippy_map_tilenames

---

## 🤝 Collaboration Notes

**This document was created:** January 2025

**Next Steps:**
When resuming implementation, refer to this document for:
- Overall strategy and justifications
- Technical architecture decisions
- Component breakdown
- Implementation phases

**Key Reminders:**
- All storage is client-side (browser APIs)
- Backend requires no changes
- Design for mobile storage constraints
- 30-day auto-expiration is critical for storage protection
- User-initiated downloads ensure transparency and consent

---

## ❓ Open Questions for Future Discussion

1. Should we show visual overlay on map for cached areas?
2. What icon/button style for "Download for Offline"?
3. Should we pre-cache frequently visited locations automatically?
4. How to handle partial downloads (connection lost mid-download)?
5. Should we support background downloads using Background Sync API?
6. Do we need analytics for offline usage patterns?
7. Should tours get special download shortcuts?

---

**Document Version:** 1.0  
**Last Updated:** January 2025  
**Status:** Strategy Approved, Ready for Implementation