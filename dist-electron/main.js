import { app as s, BrowserWindow as p, ipcMain as t, dialog as T } from "electron";
import { fileURLToPath as f } from "node:url";
import n from "node:path";
import u from "better-sqlite3";
import I from "fs";
const o = new u("roadsense.db");
o.exec(`
  CREATE TABLE IF NOT EXISTS coordinates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lat REAL,
    lon REAL,
    quality INTEGER
  )
`);
const d = n.dirname(f(import.meta.url));
process.env.APP_ROOT = n.join(d, "..");
const c = process.env.VITE_DEV_SERVER_URL, L = n.join(process.env.APP_ROOT, "dist-electron"), _ = n.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = c ? n.join(process.env.APP_ROOT, "public") : _;
let e;
function E() {
  e = new p({
    icon: n.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    webPreferences: {
      preload: n.join(d, "../dist-electron/preload.mjs")
    }
  }), e.webContents.on("did-finish-load", () => {
    e == null || e.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  }), c ? e.loadURL(c) : e.loadFile(n.join(d, "../dist/index.html"));
}
s.on("window-all-closed", () => {
  process.platform !== "darwin" && (s.quit(), e = null);
});
s.on("activate", () => {
  p.getAllWindows().length === 0 && E();
});
s.whenReady().then(E);
t.handle("add-marker", (r, a, i) => {
  o.prepare(`
    INSERT INTO coords (lat, lon, type)
    VALUES (?, ?, ?)
  `).run(a, i, (/* @__PURE__ */ new Date()).toISOString());
});
t.handle("get-markers", () => o.prepare("SELECT * FROM markers").all());
t.handle("dialog:open-file", async () => {
  const r = await T.showOpenDialog({
    properties: ["openFile"],
    filters: [
      { name: "All Files", extensions: ["*"] }
    ]
  });
  return r.canceled ? null : r.filePaths;
});
t.handle("insert-rows", (r, a) => {
  const i = o.prepare(`
    INSERT INTO coordinates (lat, lon, quality)
    VALUES (?, ?, ?)
  `);
  o.transaction((m) => {
    for (const l of m)
      i.run(l.lat, l.lon, l.quality);
  })(a);
});
t.handle("read-file", (r, a) => I.readFileSync(a, "utf-8"));
t.handle("get-coordinates", () => o.prepare(`
    SELECT lat, lon, quality
    FROM coordinates
    ORDER BY id ASC
  `).all());
t.handle("clear-coordinates", () => {
  o.prepare("DELETE FROM coordinates").run();
});
export {
  L as MAIN_DIST,
  _ as RENDERER_DIST,
  c as VITE_DEV_SERVER_URL
};
