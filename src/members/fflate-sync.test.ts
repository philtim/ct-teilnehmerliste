import { afterEach, describe, expect, it } from 'vitest';
import { unzipSync } from 'fflate/browser';
import { zip } from './fflate-sync';

/**
 * The shim exists because ChurchTools' CSP refuses the Web Worker `fflate`
 * spawns from a `blob:` URL (see the module header). So the load-bearing
 * assertion here is a negative one: nothing in this path may construct a
 * Worker. A `Worker` that throws on construction stands in for the refusal —
 * which is exactly how the browser reports it, the constructor having no
 * fallback in `fflate`.
 *
 * The payload is over `fflate`'s 160 kB threshold on purpose. Below it `zip()`
 * compresses inline and needs no worker, which is precisely why the live export
 * broke while every small fixture passed.
 */
const realWorker = globalThis.Worker;

function blockWorkers(): void {
    (globalThis as unknown as { Worker: unknown }).Worker = class {
        constructor() {
            throw new Error('CSP: blocked a worker script (worker-src) at blob:…');
        }
    };
}

afterEach(() => {
    (globalThis as unknown as { Worker: unknown }).Worker = realWorker;
});

/** Incompressible-ish content, so the stored size stays above the threshold. */
function largeFile(bytes: number): Uint8Array {
    const data = new Uint8Array(bytes);
    for (let i = 0; i < bytes; i++) data[i] = (i * 2654435761) % 256;
    return data;
}

describe('zip', () => {
    it('compresses a payload over fflate’s worker threshold without a Worker', async () => {
        blockWorkers();
        const files = { 'big.xml': largeFile(400_000) };

        const archive = await new Promise<Uint8Array>((resolve, reject) => {
            zip(files, (error, data) => (error ? reject(error) : resolve(data)));
        });

        const unpacked = unzipSync(archive);
        expect(Object.keys(unpacked)).toEqual(['big.xml']);
        expect(unpacked['big.xml']).toEqual(files['big.xml']);
    });

    it('accepts the two-argument form write-excel-file uses', async () => {
        blockWorkers();

        const archive = await new Promise<Uint8Array>((resolve, reject) => {
            zip({ 'a.txt': new Uint8Array([1, 2, 3]) }, (error, data) =>
                error ? reject(error) : resolve(data),
            );
        });

        expect(unzipSync(archive)['a.txt']).toEqual(new Uint8Array([1, 2, 3]));
    });

    it('accepts options without treating them as the callback', async () => {
        const archive = await new Promise<Uint8Array>((resolve, reject) => {
            zip({ 'a.txt': new Uint8Array([1, 2, 3]) }, { level: 0 }, (error, data) =>
                error ? reject(error) : resolve(data),
            );
        });

        expect(unzipSync(archive)['a.txt']).toEqual(new Uint8Array([1, 2, 3]));
    });

    it('reports a failure through the callback rather than throwing', () => {
        let reported: Error | null = null;
        expect(() => {
            zip({ ['a'.repeat(70_000)]: new Uint8Array([1]) }, (error) => {
                reported = error as Error | null;
            });
        }).not.toThrow();
        expect(reported).toBeInstanceOf(Error);
        expect((reported as unknown as Error).message).toContain('filename too long');
    });

    it('returns a terminate function, as fflate’s async API does', () => {
        const terminate = zip({ 'a.txt': new Uint8Array([1]) }, () => {});
        expect(typeof terminate).toBe('function');
        expect(() => terminate()).not.toThrow();
    });
});
