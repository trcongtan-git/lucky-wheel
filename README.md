# Lucky Spin TET 2026

Vòng quay may mắn + game đập trứng (Next.js).

## Chạy local

```bash
npm install
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000) (trang chính) và [http://localhost:3000/split](http://localhost:3000/split) (vòng quay + đập trứng).

## Build & chạy production

```bash
npm run build
npm start
```

## Deploy lên Vercel

1. Push code lên GitHub.
2. Vào [vercel.com](https://vercel.com) → **New Project** → Import repo.
3. **Framework Preset:** Next.js (tự nhận).
4. **Build Command:** `npm run build` (mặc định).
5. **Output Directory:** để mặc định.
6. Deploy.

Sau khi deploy:

- **/** → Trang vòng quay (dữ liệu: API hoặc localStorage nếu API lỗi).
- **/split** → Trang unified (vòng quay + đập trứng, dữ liệu localStorage).

## Cấu trúc

- `app/` – Next.js App Router (layout, trang `/`, `/split`, API `/api/data`).
- `app/globals.css` – Toàn bộ CSS (wheel + egg game).
- `public/script.js` – Logic vòng quay (canvas, import, lưu).
- `public/egg-game-unified.js` – Logic game đập trứng (chỉ chạy trên `/split`).
- `public/images/` – Logo, background, ảnh trứng, quà.

Dữ liệu trang chính: gọi `/api/data` (in-memory trên Vercel); nếu lỗi thì dùng localStorage. Trang `/split` luôn dùng localStorage.
