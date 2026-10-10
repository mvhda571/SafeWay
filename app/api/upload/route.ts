import { randomUUID } from "crypto";
import { handle, HttpError, requireUser } from "@/lib/auth";
import { putUpload } from "@/lib/store";

const TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
// Netlify functions accept request bodies up to ~6 MB, multipart overhead included.
const MAX = 4.5 * 1024 * 1024;

/** Stores the image in ./data/uploads locally or Netlify Blobs on Netlify. */
export async function POST(req: Request) {
  return handle(async () => {
    await requireUser();
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new HttpError(400, "No file");
    const ext = TYPES[file.type];
    if (!ext) throw new HttpError(415, "Only JPG, PNG or WEBP images");
    if (file.size > MAX) throw new HttpError(413, "Max 4.5 MB");
    const name = `${randomUUID()}.${ext}`;
    await putUpload(name, await file.arrayBuffer());
    return Response.json({ url: `/api/uploads/${name}` }, { status: 201 });
  });
}
