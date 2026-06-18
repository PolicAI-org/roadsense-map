export {}

declare global {
  interface Window {
    electronAPI: {
      openFile: () => Promise<string[] | null>
      readFile: (path: string) => Promise<string>
      insertRows: (rows: {
        lat: number
        lon: number
        quality: number
      }[]) => Promise<void>

      getCoordinates: () => Promise<{
        lat: number
        lon: number
        quality: number
      }[]>

      clearCoordinates: () =>Promise<void>
    }
  }
}