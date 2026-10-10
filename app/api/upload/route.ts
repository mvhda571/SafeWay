import { handle, HttpError, requireUser } from "@/lib/auth";
import { putUpload } from "@/lib/store";

const TYPES = ["image/jpeg", "image/png", "image/webp"];
/** The client downsizes photos to ≤ 1280 px and ≤ 2 MB before upload; this is the server-side guard. */
const MAX = 2 * 1024 * 1024;

/** Stores the image in MongoDB (`images` collection) and returns its URL. */
export async function POST(req: Request) {
  return handle(async () => {
    const session = await requireUser();
    const form = await req.formData().catch(() => null);
    const file = form?.get("file");
    if (!(file instanceof File)) throw new HttpError(400, "no_file", "No file");
    if (!TYPES.includes(file.type)) throw new HttpError(415, "bad_file_type", "Only JPG, PNG or WEBP images");
    if (file.size > MAX) throw new HttpError(413, "file_too_large", "Max 2 MB");
    const id = await putUpload(Buffer.from(await file.arrayBuffer()), file.type, session.sub);
    return Response.json({ url: `/api/uploads/${id}` }, { status: 201 });
  });
}
