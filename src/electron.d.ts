export {};

declare global {
  interface Window {
    api: {
      pickFile: () => Promise<{
        filePath: string;
        data: unknown;
      } | null>;
      getFiles: () => Promise<{
        id: number; 
        file_name: string; 
        title: string; 
        stored_at: string 
      }[]>;
      deleteFile: (fileId: number) => Promise<void>
      renameFile: (fileId: number, newName: string) => Promise<void>
      getFileStats: (fileId: number) => Promise<{
        total: { count: number }
        high: { count: number }
        medium: { count: number }
        low: { count: number }
        bounds: { minLat: number; maxLat: number; minLon: number; maxLon: number }
      }>
    };
  }
}
