# Cloth Store (Expo + React Native + expo-sqlite)

Offline-first clothing shopping demo. Browse and search clothing, pick sizes/colors,
save favorites, manage the cart, complete a local demo checkout, and revisit saved
orders. Includes local store-management tools (products, inventory, order statuses,
coupons, sales reports).

## Reference used

No Figma URL or Figma MCP server was available in this environment, so the three
supplied frames (Home, Details, My Cart) were matched from the existing project code
and bundled assets, which already implement those frames. Functionality patterns
(stock validation, transactional checkout, coupon rule, cancel-restore-once) were
adapted from `Shoe Store/shoe-store` source (its `AppContext`, types, and seed data);
no Shoe Store layouts, branding, or products were reused.

## Tech

- Expo SDK 57, React Native, JavaScript/JSX, Expo Go + Expo Web compatible
- `expo-sqlite` (products, variant inventory, SQL search) + `@react-native-async-storage/async-storage`
  (cart, wishlist, orders, profile, preferences)
- Entry: `App.js` → `ShopProvider` → `AppNavigator` (existing tab approach: Home, Shop, Cart, Profile)

## Setup

```bash
npm install
npx expo start        # phone via Expo Go (same Wi-Fi), or press w for web
npx expo start --web  # web demo
```

### Windows web SQLite startup

After changing Metro configuration, restart the server and reload the browser:

```powershell
npx expo start --web --clear --port 8081
```

Use `http://localhost:8081/` consistently. Browser storage belongs to its origin:
changing to `127.0.0.1`, another port, or another browser shows separate data.
Plain HTTP on a LAN IP is not a secure browser context; use localhost on the
laptop or HTTPS when hosting the web app.

Web SQLite needs both `Cross-Origin-Opener-Policy: same-origin` and
`Cross-Origin-Embedder-Policy: credentialless` on the **HTML document**, not just
the bundle. SDK 57's single-page HTML handler runs before Metro's custom
middleware. `scripts/sqlite-web-headers.cjs` adds the headers to that development
handler, while `metro.config.js` covers the SQLite worker and WASM assets.
This is a project-local Expo CLI compatibility shim; rerun the HTTP regression
test after upgrading Expo. No files in `node_modules` are patched. A production
hosting server must supply the same headers itself.

`src/services/db.web.js` uses asynchronous SQLite worker calls to avoid the
SDK 57.0.4 synchronous cold-open timeout and large-result truncation observed
in Brave. Native platforms retain the synchronous service in `db.js`. Both use
the existing `clothstore.db`, schema, and `seeded_v1` flag. Web writes are queued;
seeding, product creation, reset, checkout and deletion use transactions.
Neither a storage reset nor a dependency upgrade is needed for this fix.

### Regression checks

```powershell
npm test          # Real SQLite in memory; native/web data and rollback checks
npm run test:web  # Requires the running Expo server at localhost:8081
```

The database tests require Node's built-in `node:sqlite` (Node 22.13+; validated
with Node 24). For the real browser worker integration test, temporarily serve
the test HTML and open `http://127.0.0.1:8081/catalog-tests.html`:

```powershell
New-Item -ItemType Directory -Path .\public -Force | Out-Null
Copy-Item .\tests\catalog-tests.html .\public\catalog-tests.html
# After testing, remove the temporary served test page before exporting:
Remove-Item .\public\catalog-tests.html
```

The browser test intentionally uses the separate `127.0.0.1` origin; it never
runs against the user's `localhost` catalog. Product fixtures are removed after
testing. Profile picture upload remains on the existing image-picker and
AsyncStorage path.

If `npx expo install` fails on npm 11 with `EALLOWSCRIPTS`, install with:

```bash
npm install --save expo-sqlite @react-native-async-storage/async-storage --ignore-scripts
```

## Offline product database (`src/services/db.js`)

- `openDatabaseSync('clothstore.db')`, WAL mode requested on native (`PRAGMA journal_mode = WAL`, safely ignored on web).
- Schema: `products(id INTEGER PRIMARY KEY AUTOINCREMENT, name, category, price REAL, stock INTEGER, ...)`
  plus metadata (`description`, `imageKey` → bundled asset, `categories` JSON, `sortOrder`, `available`)
  and `variants(product_id, size, color, stock)` keeping aggregate stock consistent in transactions.
- First run seeds 6 existing clothing products (names/prices/images/display order preserved) **once**
  via a `meta` flag — deleting every product is never auto-reseeded. Only the confirmed
  **Reset demo data** action restores the seed catalog.
- Search runs parameterized SQL: `WHERE name LIKE ? OR description LIKE ? ...` with bound values
  (no string-concatenated user input). Lists render in a virtualized `FlatList`.

## Profile picture upload

- Profile screen: large circular avatar with a camera badge; both open the picker.
  **Upload/Change Profile Picture** button + **Remove Profile Picture** (confirmed, restores default).
- `expo-image-picker` gallery on Android/iOS, browser file picker on Web
  (Downloads/Pictures folders included). JPG/JPEG/PNG + compatible image types.
- Square crop editor on native (`allowsEditing`, aspect 1:1); circular display via
  cover-crop everywhere, so nothing distorts. Preview modal with **Save Picture**
  (loading indicator) and **Cancel**.
- Stored as a small JPEG data URI in AsyncStorage (`clothstore:profilePic:v1`) —
  persistent app storage on Android, persistent browser storage on Web. No temp
  URLs, works offline, survives refresh/restart. Success toast only after the write.
- Home avatar uses the same saved image and navigates to Profile when tapped.

## Product picture upload

- Inventory shows each product's picture beside its name and stock; Products shows
  accessible thumbnails; catalog, details, cart, and saved orders render the same photo.
- Add/Edit Product offers **Upload/Change picture** with an in-form preview plus the
  existing sample pictures (Purple hoodie, Knit shirt, Essential shirt). Cancelling
  the edit leaves the saved picture unchanged; picker/save guards block saving or
  closing mid-upload.
- `pickProductImage` (`src/services/avatar.js`) resizes uploads preserving aspect
  ratio, keeps PNG transparency, and caps the saved data URI at 1MB. Photos persist
  in the SQLite `products.imageKey` field and survive restarts.
- Order snapshots never embed photo blobs: checkout stores each uploaded photo once
  in the additive SQLite `order_images` table (`order-picture:<orderId>:<productId>`
  keys) via `src/services/orderPictures.js`. AsyncStorage order history holds only
  small references and display pictures are restored from SQLite at startup — so
  large photos stay out of the Android AsyncStorage limit, legacy blob-embedded
  orders are compacted on load, missing photos degrade to the sample picture, and
  photos survive product edits and deletion. Confirmed demo reset also clears
  `order_images` since it clears order history.

## Lab verification — teacher's offline test (physical phone, Expo Go)

1. `npx expo start`, open in Expo Go.
2. Profile → Store tools → **Products** → **+ Add**, create two products (name, category, price, stock).
3. Home/Shop search box → keyword search finds a product (SQL `LIKE` query).
4. Products → **Delete** one existing product → confirm; it disappears from catalog/cart/wishlist.
5. Enable **Airplane Mode**, fully close Expo Go (swipe away), reopen via the dev server entry.
6. Confirm the two added products remain and the deleted one stays deleted.

Also verified without a phone: normal restart persistence is via SQLite (products) and AsyncStorage
(cart/wishlist/orders/profile); empty catalog is not reseeded (meta flag).

> Status: web catalog loading, product CRUD, search, inventory transactions,
> checkout/cancellation and profile picture upload/persistence verified in browsers.
> Product-picture upload/preview/save/reload verified in a real browser; `npm test`
> 19/19 and `npm run test:web` 2/2 pass with the server running; fresh web and
> Android exports verified.
> The required **physical-phone demonstration remains unverified** — no device was available
> in this environment. Web SQLite ships (wa-sqlite `.wasm` bundled via `metro.config.js`);
> web persistence uses the browser's OPFS layer and may vary by browser.

## Demo recording checklist (2–4 min, show name + section on screen)

1. Fresh launch → seeded catalog loads (6 products, original order).
2. Search a keyword (e.g. “knit”) — results filter via SQL.
3. Store tools → Products → Add Product → appears immediately in Shop.
4. Delete a product with confirmation → gone from catalog/cart/wishlist; old orders unchanged.
5. Airplane Mode → kill Expo Go → reopen → added stays, deleted stays gone.
6. Full journey (optional): variant select → cart → checkout with `DISCOUNT20` → confirmation → My Orders.

Submission: public GitHub repo link + unlisted YouTube / Anyone-with-link Drive video.

## Notes / limitations

- Demo stock numbers are fictional; payments/statuses are local simulations (labeled in-app).
- Delivery fee default ₱150, editable in Settings; past orders keep their saved fee.
- Coupon `DISCOUNT20` = 20% off merchandise subtotal only, once per checkout, no stacking.
- Order statuses: Pending, Processing, Shipped, Delivered, Cancelled. Cancelling restores
  stock exactly once. Reports count Delivered orders only; cancelled orders are excluded.
- Expo restart needed after installing native packages (`expo-sqlite`, `async-storage`)
  if the dev server was already running.
