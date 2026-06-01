# CCI Ajah Info Desk Hub

A link & QR code directory with announcements for the CCI Ajah information desk.
- **Frontend** — Next.js, deployed on Vercel
- **Backend** — FastAPI (Python), deployed on Render
- **Database** — Google Sheets (your own spreadsheet)

---

## Project structure

```
infodesk-hub/
├── frontend/                    # Next.js application
│   ├── pages/
│   │   ├── index.jsx           # Public directory (links + announcements)
│   │   └── admin/
│   │       ├── index.jsx       # Admin login
│   │       └── dashboard.jsx   # Links & announcements management
│   ├── lib/
│   │   ├── api.js              # API client
│   │   └── utils.js            # Shared utilities
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
4. The app auto-creates **Links** and **Announcements** tabs with headers on first run

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
GOOGLE_SHEET_ID=              # from Step 1
GOOGLE_SERVICE_ACCOUNT_JSON=  # paste entire JSON from Step 2 as one line
ADMIN_PASSWORD=               # choose a strong password
JWT_SECRET=                   # any 64-char random string
CLOUDINARY_URL=               # cloudinary://API_KEY:API_SECRET@CLOUD_NAME
FRONTEND_URL=http://localhost:3000
SECURE_COOKIES=false          # set true in production (HTTPS)
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

### Backend → Render

1. Push to GitHub
2. Go to [render.com](https://render.com) → New → Web Service
3. Connect your repo, set:
   - **Root Directory:** `backend`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
4. Add environment variables (same as `.env` plus `SECURE_COOKIES=true`)
5. Deploy → Copy the URL (e.g. `https://infodesk-api.onrender.com`)

### Frontend → Vercel

1. Go to [vercel.com](https://vercel.com) → New Project → Import GitHub repo
2. Set root directory to `frontend/`
3. Add environment variable: `NEXT_PUBLIC_API_URL=https://your-api.onrender.com`
4. Deploy
5. Go back to Render and update `FRONTEND_URL` to your Vercel URL

---

## Using the app

### Admin panel
- Go to `your-vercel-url/admin`
- Enter your admin password

**Links:**
- **Add a link** — fill name, description, category, URL → click Add (QR auto-generated)
- **Upload a custom QR** — click the ↑ button to upload an existing QR image
- **Edit a link** — update details, QR updates automatically if using auto-generate
- **Hide a link** — uncheck "Show in directory" to hide from public view
- **Delete a link** — removes it permanently

**Announcements:**
- **Add announcement** — fill title and message
- **Edit/Hide/Delete** — same as links
- Announcements auto-categorize based on title keywords (service, prayer, meeting, etc.)

### Public directory
- Go to `your-vercel-url`
- **Links tab** — search by name or category, view QR codes, copy links
- **Announcements tab** — view latest announcements with expandable messages

---

## How QR codes work

| Situation | What happens |
|-----------|-------------|
| No custom QR uploaded | App auto-generates a QR from the URL on the fly |
| You upload a custom QR image | That image is stored in Cloudinary and shown instead |
| URL changes | If using auto-QR, it updates instantly. If you had a custom QR, you'll need to upload the new one |

---

## Google Sheet columns reference

### Links sheet

| Column | Name | Description |
|--------|------|-------------|
| A | id | Auto-generated timestamp ID — don't edit |
| B | name | Display name on the card |
| C | desc | Short description |
| D | cat | Category: `membership`, `new_members`, `testimony`, `books`, `connect`, `map`, `giving`, `devotion`, `counselling` |
| E | url | The link URL |
| F | qr_image | Cloudinary URL of uploaded QR (blank = auto-generate) |
| G | active | `true` = visible, `false` = hidden |

### Announcements sheet

| Column | Name | Description |
|--------|------|-------------|
| A | id | Auto-generated timestamp ID — don't edit |
| B | title | Announcement title |
| C | message | Announcement message body |
| D | active | `true` = visible, `false` = hidden |

You can bulk-add rows directly in the sheet — the app picks them up immediately.
