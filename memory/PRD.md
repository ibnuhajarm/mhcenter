# Sales Monitor - PRD

## Original Problem Statement
Web app (Bahasa Indonesia) untuk perhitungan penjualan & monitoring stok per sales, tersinkron dengan Google Sheets. Sales login pakai kode_sales + password. Dashboard menampilkan area/kode/nama sales & stok bawaan. Panel Input Penjualan (stok berkurang real-time, tidak bisa lebih dari stok, ada program berjalan). Panel Input Loading (dari stok gudang). Semua bisa disimpan sebagai gambar PNG dengan detail lengkap. Panel Admin untuk konfigurasi 5 URL Google Sheet & sync.

## User Choices (2026-02)
- Integrasi: Google Sheets via `/pubhtml` URL (auto-convert ke `/pub?output=csv`)
- Export receipt: PNG (html2canvas)
- Auth: JWT — sales login (kode + password dari sheet) + admin login (password khusus)
- Currency: Rupiah (Rp)

## Architecture
- Backend: FastAPI (`/app/backend/server.py`), Motor + MongoDB
- Frontend: React 19 + Tailwind + shadcn/ui + Phosphor Icons + html2canvas
- Design: "Operational Brutalism" — Cabinet Grotesk headings, Manrope body, Space Mono numerals, orange (#FF5A00) + obsidian (#09090B), hard shadows

## Data Model (Mongo)
- `master_sales`: {kode_sales, nama_sales, area_sales, password}
- `master_produk`: {kode_produk, nama_produk, harga_jual}
- `program_berjalan`: {kode_produk, beli, gratis, potongan_harga}
- `stok_sales`: {kode_sales, kode_produk, qty}
- `stok_gudang`: {kode_produk, qty}
- `transactions`: {id, type, kode_sales, items, total, note, created_at}
- `config`: sheet URLs, sync meta, admin password

## Endpoints
- Auth: POST `/api/auth/login`, POST `/api/auth/admin-login`
- Sales: GET `/api/me`, `/api/stock/sales`, `/api/stock/gudang`, `/api/transactions`
- Sales txn: POST `/api/transaction/sales`, POST `/api/transaction/loading`
- Admin: GET/POST `/api/admin/config`, POST `/api/admin/sync`, `/api/admin/password`, GET `/api/admin/transactions`

## Implemented (2026-02)
- ✅ Sales login + Admin login (JWT, role-scoped)
- ✅ Dashboard: sales info card + stock list + metrics (SKU, Unit, Nilai)
- ✅ Input Penjualan: cart, +/-, program-berjalan preview, stock cap, submit
- ✅ Input Loading: warehouse loading record
- ✅ Receipt PNG export (html2canvas) with area/kode/nama/produk/qty/total

## Update (2026-06)
- ✅ Google Sheet is READ-ONLY: saving Penjualan/Loading NO LONGER mutates stok_sales/stok_gudang in Mongo. Stock only changes via admin re-sync. Transactions still validate against available stock and are recorded. (server.py /transaction/sales & /transaction/loading)
- ✅ Review dialog (ReviewDialog.jsx) on both Penjualan & Loading — "Review & Simpan" opens a dialog listing all items for double-check before saving.
- ✅ Receipts (Penjualan + Loading) redesigned LANDSCAPE (860px table layout) with fixed Space Mono font + document.fonts.ready before capture → consistent render across devices.
- ✅ Frontend E2E verified (iteration_2): review dialog, landscape receipt, and stock-unchanged-after-save all PASS.
- ✅ Universal image save (lib/receipt.js): mobile → native share sheet (Save to Photos/Gallery), desktop → download; fixed 860px + Space Mono loaded + fixed scale → identical PNG on laptop/Android/iPhone.
- ✅ Branding (iteration_3): renamed 'Sales Monitor' → 'Mayora United Home'; company logo (assets/logo.webp, background cleaned to transparent) shown on every page via Brand/BrandHeader + on Login, AdminLogin, AdminPanel, and both receipts. All PASS.

## Update (2026-06, iteration_4)
- ✅ FIXED download bug: old code called link.click() after async work (gesture lost → silently no-op in Safari/preview iframe) yet showed a success toast. New ReceiptResult.jsx pre-builds the PNG to a blob object URL and exposes a real <a download href=blob:…> the user taps directly + an <img> for long-press "Save Image" (iOS) + a Web Share button (mobile → Save to Photos). No more phantom "tersimpan".
- ✅ Dashboard stock list simplified for mobile: qty value moved to far LEFT (always visible), rows show only SKU (kode+nama) + qty; price removed.
- ✅ Theme recolored to match logo: RED #E11414 (primary accent, was orange #FF5A00) + NAVY #142043 (dark surfaces: summary bars, Nilai Stok card, admin header/bg) + white + black. Zero orange remaining. All PASS.

## Update (2026-06, iteration_5)
- ✅ FIXED stock-sync mismatch: stok_sales had 7 stale rows for sales 277 (incl. 370068) left over from old loading transactions (when stock mutation was still active). Re-ran admin sync (full delete+reload from sheet) → 277 now shows exactly the sheet's 6 SKUs. Since transaction endpoints no longer mutate stock, DB always mirrors the sheet after a sync. Verified via API + UI.
- ✅ Dashboard 'Nilai Stok' moved to a full-width top card (no truncate) so the Rupiah value is fully visible on phones; SKU + Total Unit now in a 2-col row below.

## Update (2026-06, iteration_6)
- ✅ FIXED potongan_harga (price discount) not showing: program_berjalan in DB was stale (SKU 370157, carried by no one) vs the sheet's SKU 370152 (Rp 500/pcs). Re-synced → program now matches sheet. Discount badge, line calc (qty×harga − diskon), review dialog, and receipt DISKON column all verified. Bonus (buy1get1) regression intact. No code change needed — the calc/render code was already correct; it was a data-sync issue. Test with sales 340/719 (carry both program SKUs).
- ✅ Admin panel: 5 URL config, manual sync, row counts, last-sync timestamp, admin password change
- ✅ Google Sheet CSV parser (auto-detects pubhtml/edit/pub URLs)
- ✅ Bottom mobile nav (Dashboard, Penjualan, Loading, Logout)
- ✅ Backend tests: 21/21 pass

## Test Credentials
See `/app/memory/test_credentials.md`.

## Backlog / Next Phase
- P1: Server-side bonus_qty & diskon recomputation (currently trusts client payload)
- P2: Riwayat transaksi UI (backend endpoint exists, no page yet)
- P2: Rekap penjualan harian per area / per sales di admin panel
- P2: Offline mode (queue transaksi saat sinyal buruk di lapangan)
- P2: Barcode scanner (kamera HP) untuk pilih produk cepat
- Note: Program Berjalan (SKU 370072/370157) belum bisa diverifikasi via UI karena tidak ada sales yang membawa SKU tsb di stok_sales — perlu mapping data di Google Sheet lalu re-sync.
