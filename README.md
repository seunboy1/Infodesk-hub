# Info Desk Hub

A link & QR code directory for the CCI information desk.
- **Frontend** — Next.js, deployed on Vercel
- **Backend** — FastAPI (Python), deployed on Railway
- **Database** — Google Sheets (your own spreadsheet)

---

## Project structure

```
infodesk-hub/
├── frontend/                    # Next.js application
│   ├── pages/
│   │   ├── index.jsx           # Public directory
│   │   └── admin/
│   │       ├── index.jsx       # Admin login
│   │       └── dashboard.jsx   # Link management
│   ├── lib/api.js              # API client
│   └── styles/                 # CSS modules
│
├── backend/                     # FastAPI application
│   ├── main.py                 # App entry point
│   ├── config.py               # Settings loader
│   ├── models.py               # Pydantic models
│   ├── auth.py                 # JWT authentication
│   ├── routers/
│   │   ├── links.py            # Public endpoints
│   │   └── admin.py            # Admin CRUD endpoints
│   └── services/
│       ├── sheets.py           # Google Sheets operations
│       └── qr.py               # QR code generation
```

---

## One-time setup

### Step 1 — Google Sheet

1. Go to [sheets.google.com](https://sheets.google.com) and create a new spreadsheet
2. Name it **Info Desk Hub** (any name is fine)
3. Copy the Sheet ID from the URL:
   `https://docs.google.com/spreadsheets/d/**THIS_PART**/edit`
4. The app auto-creates the **Links** tab with headers on first run — nothing else to do

### Step 2 — Google Service Account

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project (e.g. "infodesk-hub")
3. Enable the **Google Sheets API** and **Google Drive API**
4. Go to **IAM & Admin → Service Accounts → Create Service Account**
5. Give it any name, click **Create**
6. On the next screen, click **Add Key → JSON** — this downloads a `.json` file
7. Open the JSON file and copy the entire contents (it's one block)
8. Go back to your Google Sheet → Share → paste the service account email (found in the JSON as `"client_email"`) → give it **Editor** access

### Step 3 — Cloudinary (for QR image uploads)

1. Sign up free at [cloudinary.com](https://cloudinary.com)
2. From your dashboard copy: **Cloud name**, **API Key**, **API Secret**

### Step 4 — Backend setup

```bash
cd backend
python -m venv venv
source venv/bin/activate       # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# Fill in .env with your values (see below)

uvicorn main:app --reload
# API runs at http://localhost:8000
# Docs at http://localhost:8000/docs
```

**.env values to fill in:**
```
GOOGLE_SHEET_ID=           # from Step 1
GOOGLE_SERVICE_ACCOUNT_JSON=   # paste entire JSON from Step 2 as one line
ADMIN_PASSWORD=            # choose a strong password
JWT_SECRET=                # any 64-char random string
CLOUDINARY_URL=cloudinary://649514925712897:SXHQI8IEX_HZ45zjWkwfSm-gBrc@ds2sg3fci
FRONTEND_URL=http://localhost:3000
```

### Step 5 — Frontend setup

```bash
cd frontend
npm install

cp .env.example .env.local
# Set NEXT_PUBLIC_API_URL=http://localhost:8000

npm run dev
# App runs at http://localhost:3000
```

---

## Deployment

### Backend → Railway

1. Push `backend/` to a GitHub repo (can be a monorepo)
2. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Select your repo, set root to `backend/`
4. Add all your `.env` variables in Railway's **Variables** tab
5. Set start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
6. Copy the public URL Railway gives you (e.g. `https://infodesk-api.railway.app`)

### Frontend → Vercel

1. Go to [vercel.com](https://vercel.com) → New Project → Import GitHub repo
2. Set root directory to `frontend/`
3. Add environment variable: `NEXT_PUBLIC_API_URL=https://infodesk-api.railway.app`
4. Also update `FRONTEND_URL` in Railway to your Vercel URL
5. Deploy — done

---

## Using the app

### Admin panel
- Go to `your-vercel-url/admin`
- Enter your admin password
- **Add a link** — fill name, description, category, URL → click Add
  - QR code is auto-generated from the URL
- **Upload a custom QR** — if you already have a printed QR code, click the ↑ button on that row to upload the image
- **Edit a link** — if a URL changes, click Edit, update the URL, save. QR updates automatically
- **Hide a link** — edit it and uncheck "Show in directory" — it disappears from the public page but stays in the sheet
- **Delete a link** — removes it from the sheet permanently

### Public directory
- Team members go to `your-vercel-url`
- Search by name or category
- Click **QR Code** to see and screenshot the QR
- Click **Copy Link** to copy the URL to clipboard

---

## How QR codes work

| Situation | What happens |
|-----------|-------------|
| No custom QR uploaded | App auto-generates a QR from the URL on the fly |
| You upload a custom QR image | That image is stored in Cloudinary and shown instead |
| URL changes | If using auto-QR, it updates instantly. If you had a custom QR, you'll need to upload the new one |

---

## Google Sheet columns reference

| Column | Name | Description |
|--------|------|-------------|
| A | id | Auto-generated timestamp ID — don't edit |
| B | name | Display name on the card |
| C | desc | Short description |
| D | cat | Category: `membership`, `forms`, `testimony`, `books`, `connect` |
| E | url | The link URL |
| F | qr_image | Cloudinary URL of uploaded QR (blank = auto-generate) |
| G | active | `true` = visible, `false` = hidden |

You can bulk-add rows directly in the sheet — the app picks them up immediately.
