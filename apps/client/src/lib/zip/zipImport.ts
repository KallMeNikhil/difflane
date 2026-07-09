import JSZip from "jszip";
import { BINARY_FILE_EXTENSIONS, IMPORT_LIMITS, extensionOf } from "@difflane/shared-types";
import type { RawImportedFile } from "../filesystem/localFolderImport";

function isBinaryPath(path: string): boolean {
  return BINARY_FILE_EXTENSIONS.has(extensionOf(path));
}

export async function parseZipArchive(file: File): Promise<{ archiveName: string; files: RawImportedFile[] }> {
  const arrayBuffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);
  const entries = Object.values(zip.files).filter((entry) => !entry.dir);

  const files: RawImportedFile[] = [];
  for (const entry of entries) {
    if (files.length >= IMPORT_LIMITS.maxFiles) {
      break;
    }
    if (isBinaryPath(entry.name)) {
      continue;
    }
    const content = await entry.async("string");
    if (content.length > IMPORT_LIMITS.maxFileSizeBytes) {
      continue;
    }
    files.push({ path: entry.name, content, size: content.length });
  }

  const archiveName = file.name.replace(/\.zip$/i, "");
  return { archiveName, files };
}
