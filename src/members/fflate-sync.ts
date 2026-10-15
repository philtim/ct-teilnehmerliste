/**
 * `fflate` with synchronous compression, because ChurchTools forbids workers.
 *
 * `write-excel-file`'s browser build zips through `fflate`'s asynchronous
 * `zip()`, which moves the work off the main thread by spawning a Web Worker
 * from a `blob:` URL. ChurchTools serves the extension under a
 * Content-Security-Policy whose `child-src *` does not cover `blob:` — `*`
 * matches network schemes only — so the worker is refused:
 *
 *     blocked a worker script (worker-src) at blob:… because it violates
 *     the following directive: "child-src * https://data"
 *
 * `new Worker(…)` in `fflate` has no try/catch and no fallback, so the refusal
 * surfaces as a failed export rather than a slow one.
 *
 * The failure is size-dependent, which is why it survived every check: `zip()`
 * compresses a file inline when it is under 160 kB (`fflate`'s own threshold)
 * and only reaches for a worker above it. Our synthetic fixtures produce a
 * ~12 kB sheet; a live list of 305 rows produces ~300 kB (found in the RR
 * dashboard, where this shim comes from). Node, where exports are tested, has
 * no CSP at all.
 *
 * So this module keeps `fflate`'s API and swaps the one incompatible piece:
 * `zip()` delegates to `zipSync()`. `vite.config.ts` aliases bare `fflate`
 * here, which is why the imports below name `fflate/browser` — a public
 * subpath, so nothing reaches into the package's internals. Blocking the main
 * thread is the deliberate cost: a few tens of milliseconds once per export,
 * in exchange for an export that works at all.
 */
import { zipSync } from 'fflate/browser';
import type {
    AsyncTerminable,
    AsyncZipOptions,
    AsyncZippable,
    FlateCallback,
    ZipOptions,
    Zippable,
} from 'fflate/browser';

// The rest of the surface `write-excel-file` imports, passed straight through.
export { AsyncZipDeflate, Zip, ZipDeflate, strToU8, zipSync } from 'fflate/browser';

export function zip(data: AsyncZippable, opts: AsyncZipOptions, cb: FlateCallback): AsyncTerminable;
export function zip(data: AsyncZippable, cb: FlateCallback): AsyncTerminable;
export function zip(
    data: AsyncZippable,
    optsOrCb: AsyncZipOptions | FlateCallback,
    maybeCb?: FlateCallback,
): AsyncTerminable {
    const cb = (typeof optsOrCb === 'function' ? optsOrCb : maybeCb) as FlateCallback;
    const opts = typeof optsOrCb === 'function' ? {} : optsOrCb;

    // `fflate` reports failures through the callback rather than by throwing,
    // including on its own synchronous path, so this does the same — the
    // caller's promise rejects either way.
    try {
        cb(null, zipSync(data as Zippable, opts as ZipOptions));
    } catch (e) {
        cb(e as Parameters<FlateCallback>[0], new Uint8Array(0));
    }

    // Nothing to terminate; the work is already done when `zip()` returns.
    return () => {};
}
