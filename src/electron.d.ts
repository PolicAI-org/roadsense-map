export {};
declare global {
  interface Window {
    electronAPI: {
      pickFile: () => Promise<{ filePath: string; data: unknown } | null>
      openFile: () => Promise<string[] | null>
      readFile: (path: string) => Promise<string>
      insertRows: (rows: { lat: number; lon: number; quality: number }[], filepath: string) => Promise<void>
      getFiles: () => Promise<{ id: number; file_name: string; title: string; stored_at: string }[]>
      deleteFile: (fileId: number) => Promise<void>
      renameFile: (fileId: number, newName: string) => Promise<void>
      getFileStats: (fileId: number) => Promise<{
        total: { count: number }
        high: { count: number }
        medium: { count: number }
        low: { count: number }
        bounds: { minLat: number; maxLat: number; minLon: number; maxLon: number }
      }>
      getCoordinates: () => Promise<{ lat: number; lon: number; quality: number; file_id: number }[]>
      getCoordinatesByFile: (fileId: number) => Promise<{ lat: number; lon: number; quality: number }[]>
      clearCoordinates: () => Promise<void>
      getTheme: () => Promise<'dark' | 'light' | 'system'>
      onThemeChange: (callback: (theme: 'dark' | 'light' | 'system') => void) => void
    }
  }
}