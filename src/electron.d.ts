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
    };
  }
}
