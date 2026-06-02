import { ipcRenderer, contextBridge } from 'electron'

// --------- Expose some API to the Renderer process ---------
contextBridge.exposeInMainWorld('ipcRenderer', {
  on(...args: Parameters<typeof ipcRenderer.on>) {
    const [channel, listener] = args
    return ipcRenderer.on(channel, (event, ...args) => listener(event, ...args))
  },
  off(...args: Parameters<typeof ipcRenderer.off>) {
    const [channel, ...omit] = args
    return ipcRenderer.off(channel, ...omit)
  },
  send(...args: Parameters<typeof ipcRenderer.send>) {
    const [channel, ...omit] = args
    return ipcRenderer.send(channel, ...omit)
  },
  invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
    const [channel, ...omit] = args
    return ipcRenderer.invoke(channel, ...omit)
  },

  // You can expose other APTs you need here.
  // ...
})

contextBridge.exposeInMainWorld('electronAPI', {
  addMarker: (lat: number, lon: number) =>
    ipcRenderer.invoke('add-marker', lat, lon),

  getMarkers: () =>
    ipcRenderer.invoke('get-markers'),

  openFile: () =>
    ipcRenderer.invoke('dialog:open-file'),

  readFile: (path: string) =>
    ipcRenderer.invoke('read-file', path),

  insertRows: (rows: TableRow[], filepath: string,) =>
    ipcRenderer.invoke('insert-rows', rows, filepath),

  getCoordinates: () =>
    ipcRenderer.invoke('get-coordinates'),

  clearCoordinates: () =>
    ipcRenderer.invoke('clear-coordinates'),

  getFiles: () => 
    ipcRenderer.invoke('get-files'),

  deleteFile: (fileId: number) => 
    ipcRenderer.invoke('delete-file', fileId),

  renameFile: (fileId: number, newName: string) => 
    ipcRenderer.invoke('rename-file', fileId, newName),

  getFileStats: (fileId: number) =>
    ipcRenderer.invoke('get-file-stats', fileId),

  getGlobalStats: () =>
    ipcRenderer.invoke('get-global-stats'),

  getTheme: () =>
    ipcRenderer.invoke('get-theme'),

  onThemeChange: (callback: (theme: string) => void) => {
    ipcRenderer.on('theme-changed', (_event, theme) => callback(theme))
  },
});

type TableRow = {
    lat: number
    lon: number
    quality: number
}
