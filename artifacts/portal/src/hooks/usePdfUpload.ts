import { useState } from "react";

interface PdfUploadResult {
  uploadId: number;
  url: string;
}

interface UsePdfUploadOptions {
  onSuccess?: (result: PdfUploadResult) => void;
  onError?: (error: Error) => void;
}

export function usePdfUpload(options?: UsePdfUploadOptions) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const upload = async (file: File): Promise<PdfUploadResult | null> => {
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/uploads/pdf", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      const result: PdfUploadResult = { uploadId: data.id, url: data.url };
      options?.onSuccess?.(result);
      return result;
    } catch (err) {
      const e = err instanceof Error ? err : new Error("Upload failed");
      setError(e);
      options?.onError?.(e);
      return null;
    } finally {
      setUploading(false);
    }
  };

  return { upload, uploading, error };
}
