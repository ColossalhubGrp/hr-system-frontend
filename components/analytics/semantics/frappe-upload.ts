/**
 * Chunked upload helper for Frappe's built-in /api/method/upload_file
 * endpoint (proxied through /api/analytics/semantics/datasets/upload).
 *
 * Frappe's protocol:
 *   - Split the file into N chunks of size CHUNK_SIZE bytes.
 *   - POST each chunk as multipart/form-data with fields:
 *       file             = the raw chunk bytes
 *       filename         = original filename (same on every chunk)
 *       is_private       = 1
 *       chunk_index      = 0-based index of THIS chunk
 *       total_chunk_count = total N
 *       total_file_size  = file.size in bytes
 *   - Frappe reassembles server-side; the LAST chunk's response
 *     contains the final File record { file_url, name, ... } in the
 *     response.message object.
 *
 * Returns the file_url on success; onProgress is fired per chunk
 * with (bytesUploaded, totalBytes).
 */

export type UploadProgress = (uploaded: number, total: number) => void;

export interface UploadedFile {
  file_url: string;
  name: string;
  file_name: string;
  is_private: number;
  file_size: number;
}

const CHUNK_SIZE = 1_000_000; // 1 MB — Frappe default; keeps mem low
const UPLOAD_URL = "/api/analytics/semantics/datasets/upload";

export async function uploadFileChunked(
  file: File,
  onProgress?: UploadProgress,
): Promise<UploadedFile> {
  const total = file.size;
  const totalChunks = Math.max(1, Math.ceil(total / CHUNK_SIZE));

  let lastResponseMessage: UploadedFile | undefined;

  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, total);
    const chunk = file.slice(start, end);

    const form = new FormData();
    // Frappe accepts either a File-shaped Blob under the 'file' field
    // or a raw Blob with an explicit filename; use the latter so the
    // chunk is not confused with a whole File.
    form.append("file", chunk, file.name);
    form.append("filename", file.name);
    form.append("is_private", "1");
    form.append("chunk_index", String(i));
    form.append("total_chunk_count", String(totalChunks));
    form.append("total_file_size", String(total));

    const res = await fetch(UPLOAD_URL, { method: "POST", body: form });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(
        `Chunk ${i + 1}/${totalChunks} failed (HTTP ${res.status}): ${text.slice(0, 200)}`,
      );
    }
    const body = (await res.json().catch(() => null)) as
      | { message?: UploadedFile }
      | null;
    if (body?.message) lastResponseMessage = body.message;

    onProgress?.(end, total);
  }

  if (!lastResponseMessage?.file_url) {
    throw new Error("Upload finished but Frappe didn't return a file_url.");
  }
  return lastResponseMessage;
}
