# ⬡ Nexmark — Your Digital Shelf

A **zero-dependency, privacy-first** bookmark manager with cloud file linking and a built-in note taker. Everything runs in your browser — no server, no account required.

---

## ✨ Features

| Feature | Details |
|---------|---------|
| 📌 **Bookmark Manager** | Save URLs with titles, descriptions, tags, favicons. Search & filter by tag. |
| ☁️ **Cloud File Linker** | Link Google Drive, MEGA, Dropbox, OneDrive files/folders for quick access. |
| ✎ **Note Taker** | Markdown-style notes with formatting toolbar, word count, auto-save. |
| 🎨 **Themes** | Dark / Light mode + 5 accent color themes. |
| 💾 **Local Storage** | All data stored in your browser's localStorage. No cloud sync unless you export. |
| 📤 **Export / Import** | One-click JSON backup and restore. |
| 🔗 **Google Drive OAuth** | Optional OAuth 2.0 integration with your own Client ID. |

---

## 🚀 Deploy to GitHub Pages (5 minutes)

### Step 1 — Fork or create a repo

```bash
# Option A: Clone this project
git clone https://github.com/YOUR_USERNAME/nexmark.git
cd nexmark

# Option B: Create a new repo and push
git init
git add .
git commit -m "Initial commit — Nexmark"
git remote add origin https://github.com/YOUR_USERNAME/nexmark.git
git branch -M main
git push -u origin main
```

### Step 2 — Enable GitHub Pages

1. Go to your repo → **Settings** → **Pages**
2. Under **Source**, select **GitHub Actions**
3. The workflow at `.github/workflows/deploy.yml` will automatically trigger on every push to `main`

### Step 3 — Visit your live URL

After the action completes (~1 minute), your app will be live at:
```
https://YOUR_USERNAME.github.io/nexmark/
```

---

## 🔗 Google Drive Integration (Optional)

To enable the **Connect Google Drive** button in Settings:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project → **APIs & Services** → **Credentials**
3. Create **OAuth 2.0 Client ID** (type: Web application)
4. Add your GitHub Pages URL as an **Authorized JavaScript origin**:
   ```
   https://YOUR_USERNAME.github.io
   ```
5. Add your page URL as an **Authorized redirect URI**:
   ```
   https://YOUR_USERNAME.github.io/nexmark/
   ```
6. Copy the **Client ID**
7. In Nexmark Settings → click **Connect Google Drive** → paste your Client ID

> **Note:** The app uses OAuth 2.0 implicit flow (client-side only). The access token is stored in localStorage and used to browse your Drive files.

---

## 🗂 Project Structure

```
nexmark/
├── index.html                    # Main app shell
├── css/
│   └── style.css                 # All styles (CSS variables, responsive)
├── js/
│   └── app.js                    # All logic (bookmarks, notes, cloud, settings)
├── .github/
│   └── workflows/
│       └── deploy.yml            # Auto-deploy to GitHub Pages
└── README.md
```

---

## 🛡 Privacy

- **No data leaves your browser** unless you use the Export feature
- **No analytics, no tracking, no ads**
- Google Drive integration uses read-only OAuth scope (`drive.readonly`)
- Tokens stored locally in your browser only

---

## 💡 Tips

- **Import bookmarks from Chrome/Firefox**: Export your browser bookmarks as HTML, then use a converter tool to turn them into Nexmark JSON format
- **Tag system**: Use consistent tags like `dev`, `design`, `reading`, `tools` to organize bookmarks
- **Notes shortcut**: Press `Tab` in the note editor for indentation
- **Backup regularly**: Use Settings → Export JSON to keep a local backup

---

## 🔧 Customization

The design system is entirely CSS-variable based. Edit `css/style.css` to change:
- `--accent` — primary accent color
- `--font-ui` — UI font (currently Syne)
- `--font-display` — heading font (currently DM Serif Display)
- `--radius` — border radius
- `--sidebar-w` — sidebar width

---

Made with care. Zero dependencies. Yours forever.
