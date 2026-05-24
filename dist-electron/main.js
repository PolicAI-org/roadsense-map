import { app, BrowserWindow, ipcMain, dialog } from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";
import Database from "better-sqlite3";
import { spawn } from "child_process";
const db = new Database("roadsense.db");
db.exec(`
  CREATE TABLE IF NOT EXISTS coordinates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lat REAL,
    lon REAL,
    quality INTEGER
  )
`);
const __dirname$1 = path.dirname(fileURLToPath(import.meta.url));
process.env.APP_ROOT = path.join(__dirname$1, "..");
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, "public") : RENDERER_DIST;
let win;
function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    webPreferences: {
      preload: path.join(__dirname$1, "../dist-electron/preload.mjs")
    }
  });
  win.webContents.on("did-finish-load", () => {
    win == null ? void 0 : win.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  });
  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(__dirname$1, "../dist/index.html"));
  }
}
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
    win = null;
  }
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
app.whenReady().then(createWindow);
ipcMain.handle("add-marker", (_event, lat, lon) => {
  const stmt = db.prepare(`
    INSERT INTO coords (lat, lon, type)
    VALUES (?, ?, ?)
  `);
  stmt.run(lat, lon, (/* @__PURE__ */ new Date()).toISOString());
});
ipcMain.handle("get-markers", () => {
  return db.prepare(`SELECT * FROM markers`).all();
});
ipcMain.handle("dialog:open-file", async () => {
  const result = await dialog.showOpenDialog({
    properties: ["openFile"],
    filters: [
      { name: "All Files", extensions: ["*"] }
    ]
  });
  if (result.canceled) return null;
  return result.filePaths;
});
ipcMain.handle("insert-rows", (_event, rows) => {
  const stmt = db.prepare(`
    INSERT INTO coordinates (lat, lon, quality)
    VALUES (?, ?, ?)
  `);
  console.log(db.prepare("SELECT COUNT(*) as count FROM coordinates").get());
  const insertMany = db.transaction((rows2) => {
    for (const row of rows2) {
      stmt.run(row.lat, row.lon, row.quality);
    }
  });
  insertMany(rows);
});
ipcMain.handle("read-file", (_event, filePath) => {
  return new Promise((resolve, reject) => {
    const pythonPath = process.platform === "win32" ? "python" : "python3";
    const py = spawn(pythonPath, ["./scripts/process_data_new.py", filePath]);
    let output = "";
    let errorOutput = "";
    py.stdout.on("data", (data) => {
      output += data.toString();
    });
    py.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });
    py.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`Napaka pri zagonu skripte (code ${code}): ${errorOutput}`));
        return;
      }
      let json_data = output;
      console.log(output);
      resolve(json_data);
    });
  });
});
ipcMain.handle("get-coordinates", () => {
  return db.prepare(`
    SELECT lat, lon, quality
    FROM coordinates
    ORDER BY id ASC
  `).all();
});
ipcMain.handle("clear-coordinates", () => {
  db.prepare("DELETE FROM coordinates").run();
});
export {
  MAIN_DIST,
  RENDERER_DIST,
  VITE_DEV_SERVER_URL
};
