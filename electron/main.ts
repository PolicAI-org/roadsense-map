import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import db from './db'
import fs from 'fs'
import { spawn } from 'child_process'
import { json } from 'node:stream/consumers'

//const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

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

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null

function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
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

app.whenReady().then(createWindow)

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

ipcMain.handle('insert-rows', (_event, rows: TableRow[]) => {
  const stmt = db.prepare(`
    INSERT INTO coordinates (lat, lon, quality)
    VALUES (?, ?, ?)
  `)

  const insertMany = db.transaction((rows: TableRow[]) => {
    for (const row of rows) {
      stmt.run(row.lat, row.lon, row.quality)
    }
  })

  insertMany(rows)
})

ipcMain.handle('read-file', (_event, filePath: string) => {
  return new Promise((resolve, reject) => {
    const pythonPath = process.platform === 'win32' ? 'python' : 'python3'
    const py = spawn(pythonPath, ['./scripts/process_data.py', filePath])

    let output = ''
    let errorOutput = ''

    py.stdout.on('data', (data) => {
      output += data.toString()
    })

    py.stderr.on('data', (data) => {
      errorOutput += data.toString()
    })

    py.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Napaka pri zagonu skripte (code ${code}): ${errorOutput}`))
        return
      }
      let json_data = output
      //console.log(output)
      resolve(json_data)
    })
  })
})

ipcMain.handle('get-coordinates', () => {
  return db.prepare(`
    SELECT lat, lon, quality
    FROM coordinates
    ORDER BY id ASC
  `).all()
})

ipcMain.handle('clear-coordinates', () => {
  db.prepare('DELETE FROM coordinates').run()
})