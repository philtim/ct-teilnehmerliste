import writeXlsxFile from 'write-excel-file/browser';
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate/browser';
import { withCachedLinkValues } from './cached-values';
import type { ExportSheet } from './workbook';

/**
 * The only module that pulls in `write-excel-file` (ADR-008).
 *
 * Imported dynamically by its caller, so the library lands in its own chunk
 * and the initial bundle never carries a spreadsheet writer until someone
 * downloads. Keep this file free of anything but the write for the same
 * reason: whatever is imported here is imported with the library.
 *
 * Its zip backend is redirected to a synchronous one in `vite.config.ts`,
 * because the host's CSP refuses the Web Worker the asynchronous one spawns
 * (`./fflate-sync.ts`). The same synchronous `fflate` reopens the file once,
 * to give the link formulas their value (`./cached-values.ts`).
 */
export async function downloadWorkbook(sheets: ExportSheet[], fileName: string): Promise<void> {
    const blob = await writeXlsxFile(sheets, { fontFamily: 'Arial', fontSize: 11 }).toBlob();
    const files = unzipSync(new Uint8Array(await blob.arrayBuffer()));
    for (const [path, content] of Object.entries(files)) {
        if (/^xl\/worksheets\/sheet\d+\.xml$/.test(path)) {
            files[path] = strToU8(withCachedLinkValues(strFromU8(content)));
        }
    }
    save(new Blob([zipSync(files)], { type: blob.type }), fileName);
}

function save(blob: Blob, fileName: string) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
