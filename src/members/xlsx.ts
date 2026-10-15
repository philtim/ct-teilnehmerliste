import writeXlsxFile from 'write-excel-file/browser';
import type { ExportSheet } from './workbook';

/**
 * The only module that pulls in `write-excel-file` (ADR-008).
 *
 * Imported dynamically by its caller, so the library lands in its own chunk
 * and the initial bundle never carries a spreadsheet writer until someone
 * downloads. Keep this file free of anything but the write call for the same
 * reason: whatever is imported here is imported with the library.
 *
 * Its zip backend is redirected to a synchronous one in `vite.config.ts`,
 * because the host's CSP refuses the Web Worker the asynchronous one spawns
 * (`./fflate-sync.ts`).
 */
export async function downloadWorkbook(sheets: ExportSheet[], fileName: string): Promise<void> {
    await writeXlsxFile(sheets, { fontFamily: 'Arial', fontSize: 11 }).toFile(fileName);
}
