# Music Uploader — Full Starter Project

This repository contains a **minimal full-stack music upload site**: a Node.js + Express backend that accepts uploads and serves files, and a React + Tailwind frontend to upload, list and play music.

---

## Project structure

```
music-uploader-starter/
├─ backend/
│  ├─ package.json
│  ├─ index.js
│  ├─ songs.json         # simple metadata store (auto-created)
│  └─ uploads/           # uploaded mp3/ogg files (auto-created)
├─ frontend/
│  ├─ package.json
│  ├─ postcss.config.cjs
│  ├─ tailwind.config.cjs
│  ├─ public/
│  │  └─ index.html
│  └─ src/
│     ├─ main.jsx
│     ├─ App.jsx
│     └─ index.css
└─ README.md
```

---

## Backend (Node.js + Express)

`backend/package.json`

```json
{
  "name": "music-uploader-backend",
  "version": "1.0.0",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "dev": "nodemon index.js"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "express": "^4.18.2",
    "multer": "^1.4.5"
  }
}
```

`backend/index.js`

```js
const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const UPLOAD_DIR = path.join(__dirname, 'uploads');
const METADATA_FILE = path.join(__dirname, 'songs.json');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);
if (!fs.existsSync(METADATA_FILE)) fs.writeFileSync(METADATA_FILE, JSON.stringify([]));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    // keep original name but prefix timestamp to avoid collisions
    const safeName = Date.now() + '-' + file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    cb(null, safeName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    // accept common audio types
    if (/audio\/(mpeg|mp3|ogg|wav|x-wav|mpeg3)/i.test(file.mimetype) || /\.(mp3|ogg|wav)$/i.test(file.originalname)) {
      cb(null, true);
    } else cb(new Error('Only audio files are allowed'));
  }
});

// serve uploaded files statically
app.use('/uploads', express.static(UPLOAD_DIR));

app.post('/upload', upload.single('track'), (req, res) => {
  try {
    const { originalname, filename, mimetype, size } = req.file;
    const { title = originalname, artist = 'Unknown' } = req.body;

    const metadata = JSON.parse(fs.readFileSync(METADATA_FILE));
    const entry = { id: Date.now(), title, artist, filename, originalname, mimetype, size, uploadedAt: new Date().toISOString() };
    metadata.unshift(entry);
    fs.writeFileSync(METADATA_FILE, JSON.stringify(metadata, null, 2));

    res.json({ ok: true, entry });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get('/songs', (req, res) => {
  const metadata = JSON.parse(fs.readFileSync(METADATA_FILE));
  res.json(metadata);
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Backend listening on http://localhost:${PORT}`));
```

---

## Frontend (React + Vite + Tailwind)

`frontend/package.json`

```json
{
  "name": "music-uploader-frontend",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "vite": "^5.0.0",
    "tailwindcss": "^4.0.0",
    "postcss": "^8.0.0",
    "autoprefixer": "^10.0.0"
  }
}
```

`frontend/src/main.jsx`

```jsx
import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')).render(<App />)
```

`frontend/src/App.jsx`

```jsx
import React, { useEffect, useState, useRef } from 'react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000'

export default function App(){
  const [file, setFile] = useState(null)
  const [title, setTitle] = useState('')
  const [artist, setArtist] = useState('')
  const [songs, setSongs] = useState([])
  const audioRef = useRef(null)

  useEffect(()=>{ fetchSongs() }, [])

  async function fetchSongs(){
    const res = await fetch(`${API}/songs`)
    const data = await res.json()
    setSongs(data)
  }

  async function handleUpload(e){
    e.preventDefault()
    if(!file) return alert('Pick an audio file')
    const form = new FormData()
    form.append('track', file)
    form.append('title', title)
    form.append('artist', artist)

    const res = await fetch(`${API}/upload`, { method: 'POST', body: form })
    const j = await res.json()
    if(j.ok){
      setTitle('')
      setArtist('')
      setFile(null)
      fetchSongs()
    } else alert(j.error || 'Upload failed')
  }

  return (
    <div className="min-h-screen p-6 bg-gray-50">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">Music Uploader</h1>

        <form onSubmit={handleUpload} className="mb-6 bg-white p-4 rounded shadow">
          <div className="mb-2">
            <label className="block text-sm font-medium">Title</label>
            <input value={title} onChange={e=>setTitle(e.target.value)} className="w-full border p-2 rounded" placeholder="Song title (optional)" />
          </div>
          <div className="mb-2">
            <label className="block text-sm font-medium">Artist</label>
            <input value={artist} onChange={e=>setArtist(e.target.value)} className="w-full border p-2 rounded" placeholder="Artist name (optional)" />
          </div>
          <div className="mb-3">
            <label className="block text-sm font-medium">File</label>
            <input type="file" accept="audio/*" onChange={e=>setFile(e.target.files?.[0]||null)} />
          </div>
          <button className="px-4 py-2 rounded bg-blue-600 text-white" type="submit">Upload</button>
        </form>

        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-xl font-semibold mb-3">Uploaded Songs</h2>
          {songs.length === 0 && <div className="text-sm text-gray-500">No songs yet.</div>}
          <ul className="space-y-3">
            {songs.map(s => (
              <li key={s.id} className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{s.title || s.originalname}</div>
                  <div className="text-sm text-gray-600">{s.artist} • {new Date(s.uploadedAt).toLocaleString()}</div>
                </div>
                <div>
                  <audio ref={audioRef} controls src={`${API}/uploads/${s.filename}`} />
                </div>
              </li>
            ))}
          </ul>
        </div>

      </div>
    </div>
  )
}
```

`frontend/src/index.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

html, body, #root { height: 100%; }
```

---

## How to run locally

1. Clone this repo.

### Backend

```bash
cd backend
npm install
npm run dev    # or npm start
```
Backend will run on `http://localhost:4000` by default.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open the dev server printed by Vite (usually `http://localhost:5173`). The frontend expects the backend at `http://localhost:4000` — set `VITE_API_URL` in `.env` if your backend runs elsewhere.

---

## Next steps / optional improvements

- Replace local file storage with AWS S3 / Cloudinary for scalability.
- Store metadata in a real DB (SQLite / Postgres) instead of `songs.json`.
- Add authentication so only authorized users can upload.
- Add waveform previews and metadata extraction (ID3 tags).
- Add chunked uploads for very large files.

---

If you want, I can:
- convert this into a GitHub-ready repo structure and provide downloadable files, or
- deploy the backend (Heroku/Render) and frontend (Vercel) and wire them up.

Tell me which you'd like next and I’ll continue.
