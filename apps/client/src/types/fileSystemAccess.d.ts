export {};

declare global {
  interface FileSystemDirectoryHandle {
    kind: "directory";
    name: string;
    entries(): AsyncIterableIterator<[string, FileSystemDirectoryHandle | FileSystemFileHandle]>;
  }

  interface FileSystemFileHandle {
    kind: "file";
    name: string;
    getFile(): Promise<File>;
  }

  interface Window {
    showDirectoryPicker?: () => Promise<FileSystemDirectoryHandle>;
  }
}
