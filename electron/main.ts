import { app, BrowserWindow, ipcMain, dialog, Menu, nativeTheme } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'
import db from './db'
import { processFile } from '../src/processor'
import { loadModel } from '../src/inference/classify'
import { readFileSync } from 'node:fs'

type ThemeSource = 'dark' | 'light' | 'system'
let currentTheme: ThemeSource = 'system'

function getSettingsPath() {
  return path.join(app.getPath('userData'), 'settings.json')
}

function loadTheme(): ThemeSource {
  try {
    const data = JSON.parse(fs.readFileSync(getSettingsPath(), 'utf8'))
    const t = data.theme
    if (t === 'dark' || t === 'light' || t === 'system') return t
  } catch {}
  return 'system'
}

function saveTheme(theme: ThemeSource) {
  try {
    const p = getSettingsPath()
    const existing = fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : {}
    fs.writeFileSync(p, JSON.stringify({ ...existing, theme }))
  } catch {}
}

function setTheme(theme: ThemeSource) {
  currentTheme = theme
  nativeTheme.themeSource = theme
  saveTheme(theme)
  buildMenu()
  win?.webContents.send('theme-changed', theme)
}

function buildMenu() {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'Pogled',
      submenu: [
        { role: 'reload' as const },
        { role: 'forceReload' as const },
        { role: 'toggleDevTools' as const },
        { type: 'separator' as const },
        { role: 'resetZoom' as const },
        { role: 'zoomIn' as const },
        { role: 'zoomOut' as const },
        { type: 'separator' as const },
        { role: 'togglefullscreen' as const },
        { type: 'separator' as const },
        {
          label: 'Temni način',
          type: 'radio',
          checked: currentTheme === 'dark',
          click: () => setTheme('dark'),
        },
        {
          label: 'Svetli način',
          type: 'radio',
          checked: currentTheme === 'light',
          click: () => setTheme('light'),
        },
        {
          label: 'Sistem',
          type: 'radio',
          checked: currentTheme === 'system',
          click: () => setTheme('system'),
        },
      ],
    },
    { label: "Uredi", role: 'editMenu' as const },
    { label: 'Okno', role: 'windowMenu' as const },
    // { label: 'Pomoč', role: 'help' as const },
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

const __dirname = path.dirname(fileURLToPath(import.meta.url))

let resolvedModelPath: string

process.env.APP_ROOT = path.join(__dirname, '..')
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

app.whenReady().then(async () => {
  currentTheme = loadTheme()
  nativeTheme.themeSource = currentTheme
  buildMenu()

  resolvedModelPath = app.isPackaged
    ? path.join(process.resourcesPath, 'best_model_speed.onnx')
    : path.join(process.cwd(), 'best_model_speed.onnx')
  await loadModel(resolvedModelPath)
  createWindow()
})

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, '..')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null

function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, 'icon.png'),
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, '../dist-electron/preload.mjs'),
    },
  })

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

type sectionCoordinates = {
  lat: number
  lon: number
  section_id: number
}

function findNearestRoad(
  lat: number, 
  lon: number, 
  sectionCoords: sectionCoordinates[]
): number | null {
  const delta = 0.01
  let best = null
  let bestDist = Infinity

  for (const r of sectionCoords) {
    if (Math.abs(r.lat - lat) > delta || Math.abs(r.lon - lon) > delta) continue
    const d = (r.lat - lat) ** 2 + (r.lon - lon) ** 2
    if (d < bestDist) {
      bestDist = d
      best = r.section_id
    }
  }

  return best
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

ipcMain.handle('add-marker', (_event, lat: number, lon: number) => {
  const stmt = db.prepare(`
    INSERT INTO coords (lat, lon, type)
    VALUES (?, ?, ?)
  `);

  stmt.run(lat, lon, new Date().toISOString());
});

ipcMain.handle('get-markers', () => {
  return db.prepare(`SELECT * FROM markers`).all();
});

ipcMain.handle('dialog:open-file', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [
      { name: 'All Files', extensions: ['*'] },
    ],
  });

  if (result.canceled) return null;

  return result.filePaths;
});

type TableRow = {
    lat: number
    lon: number
    quality: number
}

ipcMain.handle('insert-rows', (_event, rows: TableRow[], filepath: string) => {
  // load all section coords once
  const sectionCoords = db.prepare(`
    SELECT lat, lon, section_id FROM section_coordinates
  `).all() as sectionCoordinates[]

  const insertFile = db.prepare(`INSERT INTO files (file_name, title) VALUES (?, ?)`)
  const stmt = db.prepare(`INSERT INTO coordinates (lat, lon, quality, file_id, section_id) VALUES (?, ?, ?, ?, ?)`)
  const filename = path.basename(filepath, '.csv')

  const insertMany = db.transaction((rows: TableRow[]) => {
    const { lastInsertRowid } = insertFile.run(filename, filename)
    for (const row of rows) {
      const section_id = findNearestRoad(row.lat, row.lon, sectionCoords)
      stmt.run(row.lat, row.lon, row.quality, lastInsertRowid, section_id)
    }
  })

  insertMany(rows)
})

ipcMain.handle('read-file', async (_event, filePath: string) => {
  const rows = await processFile(filePath, resolvedModelPath);
  return rows.map(r => `${r.lat},${r.lon},${r.quality}`).join('\n');
})

ipcMain.handle('get-coordinates', () => {
  return db.prepare(`
    SELECT lat, lon, quality, file_id
    FROM coordinates
    ORDER BY id ASC
  `).all()
})

ipcMain.handle('clear-coordinates', () => {
  db.prepare('DELETE FROM coordinates').run()
  db.prepare('DELETE FROM files').run()
})

ipcMain.handle('get-files', () => {
  return db.prepare(`SELECT * FROM files ORDER BY stored_at DESC`).all()
})

ipcMain.handle('delete-file', (_event, fileId: number) => {
  db.prepare('DELETE FROM coordinates WHERE file_id = ?').run(fileId)
  db.prepare('DELETE FROM files WHERE id = ?').run(fileId)
})

ipcMain.handle('rename-file', (_event, fileId: number, newName: string) => {
  db.prepare('UPDATE files SET title = ? WHERE id = ?').run(newName, fileId)
})

ipcMain.handle('get-file-stats', (_event, fileId: number) => {
  return {
    total: db.prepare('SELECT COUNT(*) as count FROM coordinates WHERE file_id = ?').get(fileId),
    high: db.prepare('SELECT COUNT(*) as count FROM coordinates WHERE file_id = ? AND quality = 1').get(fileId),
    medium: db.prepare('SELECT COUNT(*) as count FROM coordinates WHERE file_id = ? AND quality = 2').get(fileId),
    low: db.prepare('SELECT COUNT(*) as count FROM coordinates WHERE file_id = ? AND quality = 3').get(fileId),
    bounds: db.prepare(`
      SELECT MIN(lat) as minLat, MAX(lat) as maxLat,
             MIN(lon) as minLon, MAX(lon) as maxLon
      FROM coordinates WHERE file_id = ?
    `).get(fileId),
  }
})

ipcMain.handle('get-theme', () => currentTheme)

ipcMain.handle('get-global-stats', () => {
  const rows = db.prepare(`
    SELECT lat, lon, quality, file_id
    FROM coordinates
    ORDER BY file_id ASC, id ASC
  `).all() as { lat: number; lon: number; quality: number; file_id: number }[]

  function haversine(a: typeof rows[0], b: typeof rows[0]) {
    const R = 6371000
    const dLat = (b.lat - a.lat) * Math.PI / 180
    const dLon = (b.lon - a.lon) * Math.PI / 180
    const x = Math.sin(dLat/2)**2 + Math.cos(a.lat*Math.PI/180)*Math.cos(b.lat*Math.PI/180)*Math.sin(dLon/2)**2
    return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1-x))
  }

  let total = 0, high = 0, medium = 0, low = 0

  for (let i = 1; i < rows.length; i++) {
    if (rows[i].file_id !== rows[i-1].file_id) continue
    const d = haversine(rows[i-1], rows[i]) / 1000  
    total += d
    if (rows[i].quality === 1) high += d
    else if (rows[i].quality === 2) medium += d
    else low += d
  }

  return { totalKm: total, highKm: high, mediumKm: medium, lowKm: low }
})

ipcMain.handle("load-road-file", async (_event, filePath: string) => {
  const json_data = readFileSync(filePath, "utf8")
  const data = JSON.parse(json_data)

  db.prepare(`UPDATE coordinates SET section_id = NULL`).run()
  db.prepare(`DELETE FROM section_coordinates`).run()
  db.prepare(`DELETE FROM sections`).run()

  const insertSection = db.prepare(`INSERT INTO sections (section_name, min_lat, max_lat, min_lon, max_lon) VALUES (?, ?, ?, ?, ?)`)
  const insertCoord = db.prepare(`INSERT INTO section_coordinates (section_id, lat, lon) VALUES (?, ?, ?)`)

  const features = data.features
  const CHUNK = 50

  for (let i = 0; i < features.length; i += CHUNK) {
    const chunk = features.slice(i, i + CHUNK)
    
    const process = db.transaction(() => {
      for (const feature of chunk) {
        const name = feature.properties?.name
        const geom = feature.geometry
        if (!name || !geom) continue

        const coordsList = geom.type === "LineString" ? [geom.coordinates]
          : geom.type === "MultiLineString" ? geom.coordinates : []

        for (const ring of coordsList) {
          const bounds = ring.reduce((b: any, [lon, lat]: [number, number]) => ({
            minLat: Math.min(b.minLat, lat), maxLat: Math.max(b.maxLat, lat),
            minLon: Math.min(b.minLon, lon), maxLon: Math.max(b.maxLon, lon),
          }), { minLat: Infinity, maxLat: -Infinity, minLon: Infinity, maxLon: -Infinity })

          const result = insertSection.run(name, bounds.minLat, bounds.maxLat, bounds.minLon, bounds.maxLon)
          for (const [lon, lat] of ring) {
            insertCoord.run(result.lastInsertRowid, lat, lon)
          }
        }
      }
    })
    process()

    await new Promise(resolve => setTimeout(resolve, 0))
  }
})