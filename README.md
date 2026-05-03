# JSK Stationery Shop

JSK Stationery Shop is a full-stack stationery management application built with an Express/MongoDB backend and a React/Vite frontend.

The app supports customer browsing, admin inventory control, billing/POS workflows, PDF bill downloads, sales history tracking, and daily sales report downloads.

## Features

- Customer signup and login
- Admin login and protected admin routes
- Admin dashboard with sales statistics
- Product inventory add, edit, search, and soft delete
- Billing/POS cart for creating customer bills
- Automatic stock deduction when a bill is generated
- Bill PDF download
- Sales history list with date filter
- Day-wise sales breakdown
- Daily sales report PDF download
- Bill deletion with automatic stock restore
- Customer product catalog with cart estimate
- Krishna image branding for admin logo/profile areas

## Tech Stack

- Frontend: React, Vite, React Router, Axios
- Backend: Node.js, Express
- Database: MongoDB with Mongoose
- Auth: JWT and bcrypt password hashing
- PDF generation: html2canvas and jsPDF
- UI helpers: react-hot-toast and lucide-react
- Deployment config: Vercel multi-service setup

## Project Structure

```txt
.
├── backend
│   ├── db
│   │   ├── db.json
│   │   └── fileDB.js
│   ├── middleware
│   │   └── auth.js
│   ├── models
│   │   ├── Bill.js
│   │   ├── Product.js
│   │   └── User.js
│   ├── routes
│   │   ├── auth.js
│   │   ├── bills.js
│   │   └── products.js
│   ├── package.json
│   └── server.js
├── frontend
│   ├── public
│   ├── src
│   │   ├── api
│   │   ├── assets
│   │   ├── components
│   │   ├── context
│   │   ├── pages
│   │   ├── App.jsx
│   │   ├── index.css
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
├── package.json
├── vercel.json
└── README.md
```

## Environment Variables

Create `backend/.env` with the required backend configuration.

```env
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
ADMIN_EMAIL=admin@jsk.com
ADMIN_PASSWORD=admin123
PORT=5000
```

Notes:

- `MONGO_URI` is required for the backend to connect to MongoDB.
- `JWT_SECRET` should be a strong private secret in production.
- `ADMIN_EMAIL` and `ADMIN_PASSWORD` are used to seed a default admin if one does not already exist.
- Do not commit real `.env` secrets to GitHub.

## Installation

Install everything from the project root:

```bash
npm run install-all
```

Or install each side manually:

```bash
npm install
cd backend
npm install
cd ../frontend
npm install
```

## Running Locally

Start the backend:

```bash
cd backend
npm run dev
```

Start the frontend:

```bash
cd frontend
npm run dev
```

Frontend runs on:

```txt
http://localhost:3000
```

Backend runs on:

```txt
http://localhost:5000
```

During local development, Vite proxies `/api` requests to `http://localhost:5000`.

## Build

Build the frontend:

```bash
cd frontend
npm run build
```

Root build script:

```bash
npm run build
```

## Backend Overview

### `backend/server.js`

Main Express app.

Responsibilities:

- Loads environment variables
- Sets up CORS and JSON parsing
- Connects to MongoDB
- Seeds the default admin user
- Mounts API route groups
- Exports the Express app for production hosting
- Starts the local server in non-production mode

Mounted routes:

```txt
/api/auth
/api/products
/api/bills
```

### `backend/middleware/auth.js`

Authentication and authorization helpers.

- `protect`: verifies JWT token and attaches the user to `req.user`
- `adminOnly`: allows only admin users

Clients must send:

```txt
Authorization: Bearer <token>
```

### `backend/models/User.js`

MongoDB schema for users.

Fields:

- `name`
- `email`
- `password`
- `role`

Important behavior:

- Passwords are hashed before saving.
- Password hashes are hidden from normal query results.
- `comparePassword()` checks login passwords.

### `backend/models/Product.js`

MongoDB schema for products.

Fields:

- `name`
- `quantity`
- `mrp`
- `discountPercent`
- `finalPrice`
- `dateAdded`
- `isActive`

Important behavior:

- `finalPrice` is calculated before saving.
- Products are soft deleted by setting `isActive` to `false`.

### `backend/models/Bill.js`

MongoDB schema for bills.

Bill fields:

- `billNumber`
- `customerName`
- `items`
- `subtotal`
- `totalDiscount`
- `grandTotal`
- `createdAt`
- `createdBy`

Each bill item stores a snapshot of product pricing at the time of sale.

### `backend/routes/auth.js`

Auth routes.

```txt
POST /api/auth/register
POST /api/auth/login
```

`register` creates a customer account and returns a JWT.

`login` validates credentials and returns user data plus a JWT.

### `backend/routes/products.js`

Product routes.

```txt
GET    /api/products
POST   /api/products
PUT    /api/products/:id
DELETE /api/products/:id
```

Access:

- `GET /api/products`: any authenticated user
- Add, update, delete: admin only

Important behavior:

- Product final price is calculated server-side.
- Delete is a soft delete.

### `backend/routes/bills.js`

Bill and sales routes.

```txt
POST   /api/bills
GET    /api/bills
GET    /api/bills/stats
GET    /api/bills/daywise
DELETE /api/bills/:id
```

Access:

- All bill routes are admin only.

Important behavior:

- Creating a bill checks product stock.
- Creating a bill deducts stock.
- Deleting a bill restores stock.
- Date filtering uses the selected day's start and end time.
- Day-wise route groups bills by year/month/day.

### `backend/db/fileDB.js` and `backend/db/db.json`

Older JSON-file database helper and local JSON data.

The current main application uses MongoDB through Mongoose models.

## Frontend Overview

### `frontend/src/main.jsx`

React entry point.

Responsibilities:

- Mounts the app
- Wraps app in `BrowserRouter`
- Adds global toast notifications
- Imports global CSS

### `frontend/src/App.jsx`

Main route configuration.

Routes:

```txt
/login
/admin/login
/signup
/welcome
/admin/dashboard
/admin/inventory
/admin/billing
/admin/history
/products
```

`PrivateRoute` protects pages that require login.

Role protection sends non-admin users away from admin routes.

### `frontend/src/api/axios.js`

Central Axios client.

Responsibilities:

- Sets the API base URL
- Adds JWT token to outgoing requests
- Redirects to login on `401`

Base URL:

```js
import.meta.env.VITE_API_URL || '/_/backend/api'
```

### Auth Context Files

Files:

- `frontend/src/context/AuthContext.jsx`
- `frontend/src/context/auth-context.js`
- `frontend/src/context/useAuth.js`

Responsibilities:

- Store current user in React state
- Persist user in `localStorage`
- Provide `login()` and `logout()`
- Provide the `useAuth()` hook

### `frontend/src/components/Layout.jsx`

Main logged-in layout.

Shows:

- Sidebar
- Topbar
- Current page title
- Profile area
- Page content through React Router `Outlet`

The topbar profile avatar uses the Krishna image.

### `frontend/src/components/Sidebar.jsx`

Sidebar navigation.

Admin links:

- Dashboard
- Inventory
- Billing / POS
- Sales History

Customer links:

- Product Catalog

Also includes:

- JSK logo with Krishna image
- User profile area with Krishna image
- Logout button

### `frontend/src/index.css`

Main global styling file.

Includes styles for:

- Theme variables
- Sidebar
- Topbar
- Cards
- Forms
- Buttons
- Tables
- Badges
- Auth pages
- Welcome screen
- Billing/POS receipt
- Product cards
- Alerts
- Search bars
- Responsive mobile layout

Recent styling improvements:

- Bill PDF product text and prices render black for visibility.
- Sidebar logo image is cropped cleanly.
- Profile avatars support image cropping.

## Frontend Pages

### `frontend/src/pages/auth/Login.jsx`

Customer login page.

Flow:

1. Customer enters email and password.
2. Frontend calls `POST /api/auth/login`.
3. Returned user data is saved in auth context and `localStorage`.
4. User is redirected to `/welcome`.

### `frontend/src/pages/auth/AdminLogin.jsx`

Admin login page.

Flow:

1. Admin enters credentials.
2. Frontend calls `POST /api/auth/login`.
3. Page checks that returned role is `admin`.
4. Admin is redirected to `/welcome`.

### `frontend/src/pages/auth/Signup.jsx`

Customer signup page.

Flow:

1. Customer enters name, email, password, and confirm password.
2. Frontend validates password match and length.
3. Frontend calls `POST /api/auth/register`.
4. New customer is logged in.
5. User is redirected to `/welcome`.

### `frontend/src/pages/WelcomeScreen.jsx`

Post-login welcome screen.

Features:

- Krishna image
- Jai Shri Krishna greeting
- Progress bar
- Auto redirect after a short delay

Redirect destination:

- Admin: `/admin/dashboard`
- Customer: `/products`

### `frontend/src/pages/admin/Dashboard.jsx`

Admin dashboard.

Calls:

```txt
GET /api/bills/stats
GET /api/bills
```

Shows:

- Total revenue
- Total bills
- Today's sales
- Today's bills
- Recent bills table

### `frontend/src/pages/admin/Inventory.jsx`

Admin inventory management.

Calls:

```txt
GET    /api/products
POST   /api/products
PUT    /api/products/:id
DELETE /api/products/:id
```

Features:

- Add product
- Edit product
- Delete product
- Product search
- Stock badges
- MRP display
- Discount display
- Final price preview

Security note:

- The frontend previews final price, but the backend calculates and stores it.

### `frontend/src/pages/admin/Billing.jsx`

Admin billing/POS page.

Calls:

```txt
GET  /api/products
POST /api/bills
```

Features:

- Search products
- Add products to cart
- Quantity controls
- Customer name input
- Generate bill
- Bill preview
- PDF bill download

Bill generation flow:

1. Admin selects products.
2. Admin clicks generate bill.
3. Frontend sends product IDs and quantities.
4. Backend validates stock.
5. Backend creates bill.
6. Backend deducts stock.
7. Frontend displays bill.
8. Admin can download PDF.

PDF generation:

- `html2canvas` captures the bill preview.
- `jsPDF` saves the PDF in A5 size.

### `frontend/src/pages/admin/SalesHistory.jsx`

Admin sales history page.

Calls:

```txt
GET    /api/bills
GET    /api/bills?date=YYYY-MM-DD
GET    /api/bills/daywise
DELETE /api/bills/:id
```

Features:

- List all bills
- Filter by date
- Day-wise sales view
- Expand bill details
- Delete bill
- Stock restore after deletion
- Download daily sales report PDF

Daily report PDF:

- Creates a hidden report container in the DOM.
- Uses compact table styling.
- Converts the report to canvas.
- Saves it as a PDF.

### `frontend/src/pages/customer/ProductCatalog.jsx`

Customer product catalog.

Calls:

```txt
GET /api/products
```

Features:

- Product search
- Product cards
- Stock badges
- Add-to-cart estimate
- Quantity controls
- Cart drawer
- Total amount preview
- Savings calculation

Important:

- Customer cart is only a price estimate.
- It does not create a real bill or deduct stock.
- Real billing is done by admin in Billing/POS.

## Key User Flows

### Customer Flow

1. Customer signs up or logs in.
2. Welcome screen appears.
3. Customer is redirected to product catalog.
4. Customer browses products.
5. Customer adds items to cart for estimate.
6. Customer visits shop counter to complete purchase.

### Admin Inventory Flow

1. Admin logs in.
2. Admin opens Inventory.
3. Admin adds or edits product details.
4. Backend calculates final price.
5. Product appears in billing and customer catalog.

### Admin Billing Flow

1. Admin opens Billing/POS.
2. Admin selects products and quantities.
3. Admin generates bill.
4. Backend creates bill and deducts stock.
5. Admin downloads bill PDF if needed.

### Admin Sales History Flow

1. Admin opens Sales History.
2. Admin views all bills or filters by date.
3. Admin can download daily report PDF.
4. Admin can delete a bill.
5. Backend restores product stock after bill deletion.

## Deployment Notes

The app includes `vercel.json` for Vercel services:

- Frontend service at `/`
- Backend service at `/_/backend`

The frontend API client defaults to:

```txt
/_/backend/api
```

For local development, Vite proxies `/api` to:

```txt
http://localhost:5000
```

## Recent Work Completed

- Fixed downloaded customer bill text color so product names and prices are visible.
- Made daily sales report PDF more compact.
- Added Krishna image to JSK admin logo.
- Added Krishna image to admin profile and topbar avatar.
- Pushed those code changes to GitHub previously.

## GitHub

Repository:

```txt
https://github.com/Bishal08-png/JSK
```

This README was created locally and has not been pushed unless committed and pushed later.
