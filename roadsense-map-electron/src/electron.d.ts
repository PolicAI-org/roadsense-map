export {};

declare global {
  interface Window {
    api: {
      pickFile: () => Promise<{
        filePath: string;
        data: unknown;
      } | null>;
    };
  }
}
