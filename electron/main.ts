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
  } catch (err) {
    console.error('loadTheme failed:', err)
  }
  return 'system'
}

function saveTheme(theme: ThemeSource) {
  try {
    const p = getSettingsPath()
    const existing = fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : {}
    fs.writeFileSync(p, JSON.stringify({ ...existing, theme }))
  } catch (err) {
    console.error('saveTheme failed:', err)
  }
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

type Section = {
  id: number
  min_lat: number
  max_lat: number
  min_lon: number
  max_lon: number
}

type Coord = {
  id: number
  lat: number
  lon: number
}

export function recalculateNearestSectionsForFile(fileId: number) {
  const sections = db.prepare(`
    SELECT id, min_lat, max_lat, min_lon, max_lon
    FROM sections
  `).all() as Section[]

  const coords = db.prepare(`
    SELECT id, lat, lon
    FROM coordinates
    WHERE file_id = ?
  `).all(fileId) as Coord[]

  if (sections.length === 0 || coords.length === 0) return

  const centroids = sections.map(s => ({
    id: s.id,
    lat: (s.min_lat + s.max_lat) / 2,
    lon: (s.min_lon + s.max_lon) / 2,
  }))

  const update = db.prepare(`
    UPDATE coordinates
    SET section_id = ?
    WHERE id = ?
  `)

  const tx = db.transaction(() => {
    for (const c of coords) {
      let bestId: number | null = null
      let bestDist = Infinity

      for (const s of centroids) {
        // fast squared distance (no sqrt needed)
        const dx = c.lat - s.lat
        const dy = c.lon - s.lon
        const dist = dx * dx + dy * dy

        if (dist < bestDist) {
          bestDist = dist
          bestId = s.id
        }
      }

      if (bestId !== null) {
        update.run(bestId, c.id)
      }
    }
  })

  tx()
}

function isGeoJSON(data: unknown): boolean {
  if (!data || typeof data !== "object") return false

  if (
    "type" in data &&
    typeof (data as { type?: unknown }).type === "string"
  ) {
    const d = data as { type: string; features?: unknown; geometry?: unknown }

    if (d.type === "FeatureCollection" && Array.isArray(d.features)) {
      return true
    }

    if (d.type === "Feature" && d.geometry) {
      return true
    }
  }

  return false
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

  if (!isGeoJSON(data)) {
    return false
  }

  db.prepare(`UPDATE coordinates SET section_id = NULL`).run()
  db.prepare(`DELETE FROM section_coordinates`).run()
  db.prepare(`DELETE FROM sections`).run()

  const insertSection = db.prepare(`
    INSERT INTO sections (section_name, min_lat, max_lat, min_lon, max_lon)
    VALUES (?, ?, ?, ?, ?)
  `)

  const insertCoord = db.prepare(`
    INSERT INTO section_coordinates (section_id, lat, lon)
    VALUES (?, ?, ?)
  `)

  const features = data.features

  const processAll = db.transaction((features) => {
    for (const feature of features) {
      const name = feature.properties?.name
      const geom = feature.geometry
      if (!name || !geom) continue

      const coordsList =
        geom.type === "LineString"
          ? [geom.coordinates]
          : geom.type === "MultiLineString"
          ? geom.coordinates
          : []

      let minLat = Infinity
      let maxLat = -Infinity
      let minLon = Infinity
      let maxLon = -Infinity

      for (const ring of coordsList) {
        for (const [lon, lat] of ring) {
          if (lat < minLat) minLat = lat
          if (lat > maxLat) maxLat = lat
          if (lon < minLon) minLon = lon
          if (lon > maxLon) maxLon = lon
        }
      }

      if (!isFinite(minLat)) continue

      const result = insertSection.run(
        name,
        minLat,
        maxLat,
        minLon,
        maxLon
      )

      const sectionId = result.lastInsertRowid

      for (const ring of coordsList) {
        for (const [lon, lat] of ring) {
          insertCoord.run(sectionId, lat, lon)
        }
      }
    }
    
  })

  processAll(features)

  return true
})

ipcMain.handle("get-section-stats", (_event, fileId: number) => {

  const stmt = db.prepare(`
    SELECT
      s.id,
      s.section_name,
      s.min_lat,
      s.max_lat,
      s.min_lon,
      s.max_lon,

      SUM(CASE WHEN c.quality = 1 THEN 1 ELSE 0 END) AS high_count,
      SUM(CASE WHEN c.quality = 2 THEN 1 ELSE 0 END) AS medium_count,
      SUM(CASE WHEN c.quality = 3 THEN 1 ELSE 0 END) AS low_count,

      MIN(c.lat) AS meas_min_lat,
      MAX(c.lat) AS meas_max_lat,
      MIN(c.lon) AS meas_min_lon,
      MAX(c.lon) AS meas_max_lon

    FROM sections s
    INNER JOIN coordinates c
      ON c.section_id = s.id
      AND c.file_id = ?

    GROUP BY
      s.id,
      s.section_name,
      s.min_lat,
      s.max_lat,
      s.min_lon,
      s.max_lon

    ORDER BY s.section_name
  `)

  let result = stmt.all(fileId)

  if(result.length === 0) {
    recalculateNearestSectionsForFile(fileId)
    result = stmt.all(fileId)
  }

  return result
})