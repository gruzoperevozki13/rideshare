import { mkdir, writeFile } from "fs/promises";
import path from "path";

const MAX_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/jpg"]);

export async function saveUpload(
  file: File,
  folder: string,
  filenameBase: string
): Promise<string> {
  if (!ALLOWED.has(file.type)) {
    throw new Error("Допустимы только JPG, PNG или WebP");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("Файл больше 5 МБ");
  }

  const ext =
    file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";

  const dir = path.join(process.cwd(), "public", "uploads", folder);
  await mkdir(dir, { recursive: true });

  const filename = `${filenameBase}-${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, filename), buffer);

  return `/uploads/${folder}/${filename}`;
}
