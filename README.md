# Clothing Admin (Web)

React + Vite admin panel for the ClothingEcommerce backend. Manage products
(colour variants, images, pricing, discounts, inventory, ratings), categories,
orders (status updates), and store settings (tax, shop location, delivery rules).

## Run
```bash
cd admin-web
npm install
npm run dev        # http://localhost:5173
```

Login with an admin account (seeded: `admin@shop.com` / `admin123`).

## Config
Backend URL defaults to the deployed Render API. Override with a `.env`:
```
VITE_API_URL=http://localhost:8000
```

## Build
```bash
npm run build      # outputs dist/ (deploy to Vercel/Netlify/Render static)
```
