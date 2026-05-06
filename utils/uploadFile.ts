const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "dezgwdrfs";
const UPLOAD_PRESET =
  process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "ResQ_SOS";

function isHeicFile(file: File): boolean {
  return (
    file.type === "image/heic" ||
    file.type === "image/heif" ||
    file.name.toLowerCase().endsWith(".heic") ||
    file.name.toLowerCase().endsWith(".heif")
  );
}

/**
 * Convert any image File to a JPEG Blob.
 * HEIC files are converted via heic2any (browser-native HEIC is not supported).
 * Other formats are converted via canvas.
 */
async function toJpegBlob(file: File): Promise<Blob> {
  if (isHeicFile(file)) {
    if (typeof window === "undefined") {
      throw new Error("HEIC conversion is only supported in the browser");
    }
    try {
      const heic2any = (await import("heic2any")).default;
      const result = await heic2any({
        blob: file,
        toType: "image/jpeg",
        quality: 0.92,
      });
      return Array.isArray(result) ? result[0] : result;
    } catch (err) {
      console.error("[heic2any] Conversion failed:", err);
      throw new Error(
        "Không thể chuyển đổi ảnh HEIC. Vui lòng thử định dạng khác.",
      );
    }
  }

  if (typeof window === "undefined") {
    // SSR: skip canvas conversion, return file as-is
    return file;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas không khả dụng"));
      ctx.drawImage(img, 0, 0);
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Không thể chuyển đổi ảnh"));
        },
        "image/jpeg",
        0.92,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Không thể đọc ảnh"));
    };
    img.src = url;
  });
}

export async function uploadImageToCloudinary(
  file: File,
  folder = "resq/avatars",
  assetFolder?: string,
): Promise<string> {
  // Convert to JPEG: needed for HEIC and to satisfy Cloudinary preset format restrictions
  const needsConversion =
    isHeicFile(file) ||
    (file.type !== "image/jpeg" && file.type !== "image/jpg");
  const uploadBlob = needsConversion ? await toJpegBlob(file) : file;

  const formData = new FormData();
  formData.append("file", uploadBlob, file.name.replace(/\.[^.]+$/, ".jpg"));
  formData.append("upload_preset", UPLOAD_PRESET);
  if (folder) formData.append("folder", folder);
  if (assetFolder) formData.append("asset_folder", assetFolder);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    {
      method: "POST",
      body: formData,
    },
  );
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    console.error("[Cloudinary] Upload error:", errData);
    throw new Error(errData?.error?.message || "Upload ảnh thất bại");
  }
  const data = await res.json();
  if (!data.secure_url) throw new Error("Upload ảnh thất bại");
  return data.secure_url as string;
}

export function uploadMessageImageToCloudinary(file: File): Promise<string> {
  return uploadImageToCloudinary(file, "messages", "messages");
}

export async function uploadRawToCloudinary(
  file: File,
  folder = "resq/invoices",
): Promise<string> {
  const result = await uploadRawToCloudinaryWithId(file, folder);
  return result.secureUrl;
}

/**
 * Upload a raw file (PDF, etc.) to Cloudinary.
 * Returns both the secure URL and public_id so the file can be deleted later
 * if downstream operations fail.
 */
export async function uploadRawToCloudinaryWithId(
  file: File,
  folder = "resq/invoices",
): Promise<{ secureUrl: string; publicId: string }> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);
  if (folder) formData.append("folder", folder);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/raw/upload`,
    {
      method: "POST",
      body: formData,
    },
  );
  if (!res.ok) throw new Error("Upload file thất bại");
  const data = await res.json();
  if (!data.secure_url) throw new Error("Upload file thất bại");
  return {
    secureUrl: data.secure_url as string,
    publicId: data.public_id as string,
  };
}

/**
 * Delete raw files from Cloudinary via server-side proxy.
 * Silently catches errors – this is a best-effort cleanup.
 */
export async function deleteCloudinaryRawFiles(
  publicIds: string[],
): Promise<void> {
  if (publicIds.length === 0) return;
  try {
    await fetch("/api/cloudinary/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ publicIds }),
    });
  } catch {
    // Best-effort cleanup – log but don't throw
    console.warn("[Cloudinary Cleanup] Failed to delete files:", publicIds);
  }
}
