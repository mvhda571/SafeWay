import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { handle, HttpError, requireUser } from "@/lib/auth";
import { UPLOAD_DIR } from "@/lib/store";

const TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const MAX = 5 * 1024 * 1024;

/** Stores the image locally under data/uploads. Swap for Supabase Storage / Cloudinary in production. */
export async function POST(req: Request) {
  return handle(async () => {
    await requireUser();
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new HttpError(400, "No file");
    const ext = TYPES[file.type];
    if (!ext) throw new HttpError(415, "Only JPG, PNG or WEBP images");
    if (file.size > MAX) throw new HttpError(413, "Max 5 MB");
    const name = `${randomUUID()}.${ext}`;
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    await fs.writeFile(path.join(/*turbopackIgnore: true*/ UPLOAD_DIR, name), Buffer.from(await file.arrayBuffer()));
    return Response.json({ url: `/api/uploads/${name}` }, { status: 201 });
  });
}
