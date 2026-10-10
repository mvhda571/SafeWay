import "server-only";
import { promises as fs } from "fs";
import path from "path";
import { getStore } from "@netlify/blobs";

/**
 * Where the JSON database and uploaded photos live.
 *
 * - On Netlify the filesystem is read-only and every function instance is separate, so data goes
 *   to Netlify Blobs (zero config; the runtime provides credentials). Writes are conditional on the
 *   ETag we read, so concurrent requests from different instances can't overwrite each other.
 * - Locally (`next dev` / `next start`) it uses ./data on disk.
 */
export interface DBVersion { exists: boolean; etag?: string }

export interface Backend {
  kind: "blobs" | "fs";
  readDB(): Promise<DBVersion & { text: string | null }>;
  /** Returns false when someone else wrote since `prev` was read (caller retries). */
  writeDB(text: string, prev?: DBVersion): Promise<boolean>;
  putFile(name: string, data: ArrayBuffer): Promise<void>;
  getFile(name: string): Promise<ArrayBuffer | null>;
}

const DB_KEY = "db.json";

/**
 * fetch for the Blobs client.
 * - Uses Next's original fetch: the patched one belongs to Next's data cache, and our database
 *   reads must never be cached or deferred.
 * - Buffers the body into a fresh Response: inside the Next server, cancelling an unread response
 *   stream (which the Blobs client does on 404/412) never settles and the request hangs forever.
 */
const bufferedFetch: typeof fetch = async (input, init) => {
  const f = globalThis.fetch as typeof fetch & { _nextOriginalFetch?: typeof fetch };
  const res = await (f._nextOriginalFetch ?? f)(input, init);
  const body = res.status === 204 || res.status === 304 ? null : await res.arrayBuffer();
  return new Response(body, { status: res.status, statusText: res.statusText, headers: res.headers });
};

function blobsBackend(): Backend | null {
  let store: ReturnType<typeof getStore>;
  try {
    // Throws MissingBlobsEnvironmentError when not running on Netlify.
    store = getStore({ name: "safeway", consistency: "strong", fetch: bufferedFetch });
  } catch {
    return null;
  }
  return {
    kind: "blobs",
    async readDB() {
      const r = await store.getWithMetadata(DB_KEY, { type: "text" });
      return r ? { text: r.data, etag: r.etag, exists: true } : { text: null, exists: false };
    },
    async writeDB(text, prev) {
      // Missing → create only if still missing; known ETag → update only if unchanged.
      // (Existing entry without an ETag shouldn't happen on Netlify; write unconditionally then.)
      const res = !prev?.exists
        ? await store.set(DB_KEY, text, { onlyIfNew: true })
        : prev.etag
          ? await store.set(DB_KEY, text, { onlyIfMatch: prev.etag })
          : await store.set(DB_KEY, text);
      return res.modified;
    },
    async putFile(name, data) {
      await store.set(`uploads/${name}`, data);
    },
    async getFile(name) {
      return (await store.get(`uploads/${name}`, { type: "arrayBuffer" })) ?? null;
    },
  };
}

function fsBackend(): Backend {
  const dir = path.join(/*turbopackIgnore: true*/ process.cwd(), "data");
  const dbFile = path.join(dir, DB_KEY);
  const uploads = path.join(dir, "uploads");
  return {
    kind: "fs",
    async readDB() {
      try {
        return { text: await fs.readFile(dbFile, "utf8"), exists: true };
      } catch {
        return { text: null, exists: false };
      }
    },
    async writeDB(text) {
      await fs.mkdir(dir, { recursive: true });
      const tmp = dbFile + ".tmp";
      await fs.writeFile(tmp, text);
      await fs.rename(tmp, dbFile);
      return true;
    },
    async putFile(name, data) {
      await fs.mkdir(uploads, { recursive: true });
      await fs.writeFile(path.join(/*turbopackIgnore: true*/ uploads, name), Buffer.from(data));
    },
    async getFile(name) {
      try {
        const buf = await fs.readFile(path.join(/*turbopackIgnore: true*/ uploads, name));
        return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
      } catch {
        return null;
      }
    },
  };
}

let backend: Backend | null = null;
export function storage(): Backend {
  return (backend ??= blobsBackend() ?? fsBackend());
}
