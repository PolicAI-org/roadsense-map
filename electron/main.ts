import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import db from './db'
import { processFile } from '../src/processor'
import { loadModel } from '../src/inference/classify'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

let resolvedModelPath: string

process.env.APP_ROOT = path.join(__dirname, '..')
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

app.whenReady().then(async () => {
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
  const insertFile = db.prepare(`INSERT INTO files (file_name, title) VALUES (?, ?)`)
  const stmt = db.prepare(`INSERT INTO coordinates (lat, lon, quality, file_id) VALUES (?, ?, ?, ?)`)

  const filename = path.basename(filepath, '.csv')

  //console.log(db.prepare('SELECT COUNT(*) as count FROM coordinates').get())

  const insertMany = db.transaction((rows: TableRow[]) => {
    const { lastInsertRowid } = insertFile.run(filename, filename)
    for (const row of rows) {
      stmt.run(row.lat, row.lon, row.quality, lastInsertRowid)
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