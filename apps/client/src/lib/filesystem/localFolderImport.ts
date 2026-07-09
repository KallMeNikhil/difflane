import { BINARY_FILE_EXTENSIONS, IMPORT_LIMITS, extensionOf } from "@difflane/shared-types";

export interface RawImportedFile {
  path: string;
  content: string;
  size: number;
}

export function isFileSystemAccessSupported(): boolean {
  return typeof window !== "undefined" && "showDirectoryPicker" in window;
}

async function readFileEntry(handle: FileSystemFileHandle, path: string): Promise<RawImportedFile | null> {
  if (isBinaryPath(path)) {
    return null;
  }
  const file = await handle.getFile();
  if (file.size > IMPORT_LIMITS.maxFileSizeBytes) {
    return null;
  }
  const content = await file.text();
  return { path, content, size: file.size };
}

function isBinaryPath(path: string): boolean {
  return BINARY_FILE_EXTENSIONS.has(extensionOf(path));
}

async function walkDirectory(
  directoryHandle: FileSystemDirectoryHandle,
  prefix: string,
  results: RawImportedFile[],
): Promise<void> {
  for await (const [name, handle] of directoryHandle.entries()) {
    const path = prefix ? `${prefix}/${name}` : name;
    if (results.length >= IMPORT_LIMITS.maxFiles) {
      return;
    }
    if (handle.kind === "file") {
      const entry = await readFileEntry(handle, path);
      if (entry) {
        results.push(entry);
      }
    } else if (handle.kind === "directory") {
      await walkDirectory(handle, path, results);
    }
  }
}

export async function pickLocalFolder(): Promise<{ folderName: string; files: RawImportedFile[] } | null> {
  if (!isFileSystemAccessSupported() || !window.showDirectoryPicker) {
    return null;
  }
  let directoryHandle: FileSystemDirectoryHandle;
  try {
    directoryHandle = await window.showDirectoryPicker();
  } catch {
    return null;
  }
  const files: RawImportedFile[] = [];
  await walkDirectory(directoryHandle, "", files);
  return { folderName: directoryHandle.name, files };
}

export async function processFileList(fileList: FileList): Promise<{ folderName: string; files: RawImportedFile[] }> {
  const files: RawImportedFile[] = [];
  let folderName = "Local Folder";

  for (let index = 0; index < fileList.length && files.length < IMPORT_LIMITS.maxFiles; index += 1) {
    const file = fileList.item(index);
    if (!file) {
      continue;
    }
    const relativePath = (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name;
    if (index === 0) {
      folderName = relativePath.split("/")[0] || folderName;
    }
    if (isBinaryPath(relativePath) || file.size > IMPORT_LIMITS.maxFileSizeBytes) {
      continue;
    }
    const content = await file.text();
    files.push({ path: relativePath, content, size: file.size });
  }

  return { folderName, files };
}
