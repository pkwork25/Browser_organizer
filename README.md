# ⬡ Nexmark — Your Digital Shelf

> A zero-dependency, privacy-first personal workspace — bookmarks, notes, cloud files, whiteboard, todos, habits, goals, and a book library. All in your browser. No account required.

---

## 🗂 Table of Contents

- [Features](#-features)
- [Deploy to GitHub Pages](#-deploy-to-github-pages)
- [How to Push Updates (Browser Only)](#-how-to-push-updates-browser-only)
- [Google Drive Integration](#-google-drive-integration)
- [Importing Links from a File](#-importing-links-from-a-file)
- [Project Structure](#-project-structure)
- [Data & Privacy](#-data--privacy)
- [Coming Soon](#-coming-soon)
- [Tips & Shortcuts](#-tips--shortcuts)
- [Customisation](#-customisation)

---

## ✨ Features

### 📌 Bookmarks
- Save URLs with auto-detected titles, favicons, descriptions and tags
- **Groups** — organise bookmarks into colour-coded, emoji-labelled collections (default view)
- **Tags view** — accordion sections grouped automatically by tag
- **All view** — flat list with 4 layout modes:
  - 🔲 **Grid** — card grid (default)
  - 📋 **List** — single-column with inline actions
  - ▤ **Compact** — dense row view like a file explorer
  - 🗞 **Magazine** — wider cards for richer previews
- **Import links from a file** — upload `.txt`, `.csv`, `.md` or `.html`; Nexmark extracts every URL and creates a named group in one click
- Search across titles, URLs, descriptions and tags
- Filter by tag from any view

### ✎ Notes
- Markdown-style editor with toolbar (Bold, Italic, Lists, Quotes, Headings, Todos)
- Auto-saves every 500ms — you never lose work
- Word count, Tab indentation support
- Search across all notes

### ☁ Cloud
- **Saved Links** — store share links from any cloud service
- **Google Drive browser** — connect via OAuth and browse your Drive directly: navigate folders, open files, delete files, save files as quick-access links
- **MEGA, Dropbox, OneDrive** — direct open links with paste-and-save workflow

### ⊞ Apps Hub
- Central launcher for all built-in tools
- Placeholder cards for upcoming Account/Sync and Notifications

### 🎨 Whiteboard
- Freehand canvas — works with mouse, trackpad and touch (mobile/tablet)
- Tools: Pen, Highlighter, Eraser, Line, Rectangle, Circle
- Colour picker + 4 stroke sizes, undo (40 steps)
- Save/load named sessions, export as PNG

### ✅ Todos & Habits
- Todo lists with 6 built-in templates (Daily Routine, Weekly Goals, Work Tasks, Shopping, Reading, Fitness)
- Habit tracker with 7-day visual grid and automatic streak counter
- Goal tracker with progress bar, target value and deadline

### 📚 Book Library
- Add books with cover, author, total pages, genre tags and notes
- Status: 📌 To Read / 📖 Reading / ✅ Finished / ⏸ Paused
- Reading progress bar and per-page updater
- Search by title, author or tag; filter by status

### ⚙ Settings
- Dark / Light theme + 5 accent colours
- Export / Import all data as JSON
- Google Drive OAuth management
- Placeholder UI for Account/Sync and Notifications (coming soon)

---

## 🚀 Deploy to GitHub Pages

### Step 1 — Create a repo and upload files

1. Go to [github.com](https://github.com) → **+** → **New repository**
2. Name it `nexmark`, set it to **Public**, leave everything else unchecked → **Create repository**
3. Click **uploading an existing file**
4. Unzip `nexmark-v3.zip`, open the folder, and drag all contents into the upload area
5. Make sure the hidden `.github` folder is included:
   - **Windows:** File Explorer → View → check **Hidden items**
   - **Mac:** Press `Cmd + Shift + .` to show hidden files
6. Write commit message `Initial commit` → **Commit changes**

### Step 2 — Enable GitHub Pages

1. Repo → **Settings** → **Pages**
2. Under **Source**, select **GitHub Actions**

### Step 3 — Done

After your first commit the workflow runs automatically (~60 seconds). Your live URL:

```
https://YOUR_USERNAME.github.io/nexmark/
```

---

## 🖥 How to Push Updates (Browser Only)

No Git client needed. Update any file directly on GitHub:

1. Go to your repo → click the file (e.g. `js/app.js`)
2. Click the **✏️ pencil icon** (top-right of the file view)
3. Select all existing content (`Ctrl+A`) and delete it
4. Paste the new content
5. Write a commit message → **Commit changes**

GitHub Actions redeploys automatically in ~60 seconds. Watch progress under the **Actions** tab.

### Updating all 3 files after a new release

| Step | File | Suggested commit message |
|------|------|--------------------------|
| 1 | `index.html` | `feat: vX.X html update` |
| 2 | `css/style.css` | `style: vX.X design update` |
| 3 | `js/app.js` | `feat: vX.X app logic` |

> **Tip:** The JS file is ~1,500 lines. After pasting in GitHub's editor, wait 2–3 seconds before clicking Commit.

---

## 🔗 Google Drive Integration

### Setup (5 minutes)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project → **APIs & Services** → **Enable APIs** → enable **Google Drive API**
3. **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID** → type: **Web application**
4. Add **Authorized JavaScript origin**:
   ```
   https://YOUR_USERNAME.github.io
   ```
5. Add **Authorized redirect URI**:
   ```
   https://YOUR_USERNAME.github.io/nexmark/
   ```
6. Copy the **Client ID**
7. In Nexmark → **Settings** → **Connect Google Drive** → paste your Client ID → sign in

### What you can do

| Action | How |
|--------|-----|
| Browse folders | Click any folder card |
| Navigate back | Click "My Drive" in the breadcrumb |
| Open a file | Click the file card or **Open ↗** |
| Delete a file | Click **🗑** (moves to Drive Trash) |
| Save a file as a link | Click **+ Save** |
| Disconnect | Drive tab → **Disconnect** |

> **Token storage:** The OAuth token is stored only in your browser's localStorage and used exclusively for Google API calls.

---

## 📥 Importing Links from a File

Turn any document containing URLs into a bookmark group instantly.

### Supported formats

| Format | Best for |
|--------|----------|
| `.txt` | Plain text, exported bookmark lists |
| `.csv` | Spreadsheets with URL columns |
| `.md` | Markdown files, Notion/Obsidian exports |
| `.html` / `.htm` | Browser bookmark exports |

### How to use

1. **Bookmarks** → **Groups** tab → click **↑ Import Links**
2. Select your file — Nexmark extracts all URLs and shows a preview
3. Name the group, add icon, colour and description
4. Click **Import as Group** — done

### Tips

- **Chrome/Firefox bookmarks:** Export as HTML → import that file
- **Notion/Obsidian:** Export as Markdown → import `.md`
- **Spreadsheets:** Export as CSV — any cell with `https://` is picked up

---

## 🗂 Project Structure

```
nexmark/
├── index.html                     # App shell — all panels, modals, layout (713 lines)
├── css/
│   └── style.css                  # Design system — CSS variables, all components (409 lines)
├── js/
│   └── app.js                     # All app logic (1,480 lines)
│       ├── State & localStorage helpers
│       ├── Navigation & panel switching
│       ├── Bookmarks (CRUD, 4 views, groups, tags view, file import)
│       ├── Notes (editor, auto-save, formatting toolbar)
│       ├── Cloud (saved links, Google Drive API browser)
│       ├── Todos (lists, items, 6 templates)
│       ├── Habits (7-day grid, streak counter)
│       ├── Goals (progress bar, deadline tracker)
│       ├── Books (library, reading progress)
│       ├── Whiteboard (canvas, 7 tools, sessions, PNG export)
│       └── Settings (themes, export/import, GDrive OAuth)
├── .github/
│   └── workflows/
│       └── deploy.yml             # Auto-deploy to GitHub Pages on push to main
├── .gitignore
└── README.md
```

---

## 🛡 Data & Privacy

| What | Where |
|------|-------|
| All your data | Browser `localStorage` only |
| Bookmarks, notes, todos, books | Never leaves your device unless you export |
| Google Drive OAuth token | `localStorage`, used only for Google API calls |
| Whiteboard sessions | Stored as base64 PNG in `localStorage` |
| Analytics / tracking | **None** |
| Ads | **None** |
| Third-party scripts | Google Fonts only |

### localStorage keys

| Key | Contents |
|-----|----------|
| `nx_bm` | Bookmarks |
| `nx_notes` | Notes |
| `nx_cloud` | Cloud file links |
| `nx_groups` | Bookmark groups |
| `nx_tlists` | Todo lists |
| `nx_titems` | Todo items |
| `nx_habits` | Habits |
| `nx_goals` | Goals |
| `nx_books` | Books |
| `nx_wb` | Whiteboard sessions (base64 PNG) |
| `nx_prefs` | Theme, accent colour, view mode |

> **Back up regularly** — Settings → **Export JSON** — especially before clearing browser data.

---

## 🚧 Coming Soon

Placeholder UI for both features is already built into the app.

### 🔐 Account & Multi-Device Sync
- Login with email / Google
- Real-time sync across all your devices
- Per-device views (Laptop, Phone, Tablet) + unified "All Devices" view
- Powered by [Supabase](https://supabase.com) (free tier)

### 🔔 Notifications & Reminders
- Browser push notifications for todo deadlines and habit reminders
- Date/time reminders on notes
- Social feed monitoring — WhatsApp Web, Telegram Web alerts
- Notification centre with badge count, snooze and mark-as-done

---

## 💡 Tips & Shortcuts

| Action | How |
|--------|-----|
| Close any modal | `Escape` key |
| Add a todo item | Type → press `Enter` |
| Tab indent in notes | `Tab` key inside the note editor |
| Undo whiteboard stroke | **↩ Undo** button (up to 40 steps) |
| Save whiteboard | **Save** button — creates/updates a named session |
| Export whiteboard | **Export PNG** button |
| Load a whiteboard session | **Sessions** → **Load** |
| Import Chrome bookmarks | Export from Chrome as HTML → **↑ Import Links** |
| Filter bookmarks by tag | Click any `#tag` pill on a bookmark card |
| Change accent colour | Settings → colour swatches |
| Full data backup | Settings → **Export JSON** |
| Restore from backup | Settings → **Import JSON** |

---

## 🔧 Customisation

The entire design is CSS-variable driven. Edit `css/style.css`:

```css
:root {
  --accent: #7c6af7;                   /* Primary accent colour */
  --bg: #0d0e11;                       /* Main background */
  --font-ui: 'Syne', sans-serif;       /* UI font */
  --font-d: 'DM Serif Display', serif; /* Display / heading font */
  --sidebar-w: 224px;                  /* Sidebar width */
  --r: 12px;                           /* Default border radius */
}
```

To add a custom accent theme:

```css
[data-accent="mycolor"] {
  --accent: #ff5722;
  --accent2: #e64a19;
  --accent-glow: rgba(255, 87, 34, 0.2);
}
```

Then add a swatch button in Settings inside `index.html`.

---

*Zero dependencies. Zero tracking. Yours forever.*
