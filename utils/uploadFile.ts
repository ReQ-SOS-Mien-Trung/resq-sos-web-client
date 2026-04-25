const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "dezgwdrfs";
const UPLOAD_PRESET =
  process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "ResQ_SOS";

export async function uploadImageToCloudinary(
  file: File,
  folder = "resq/avatars",
  assetFolder?: string,
): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
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
  if (!res.ok) throw new Error("Upload ảnh thất bại");
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
    console.warn(
      "[Cloudinary Cleanup] Failed to delete files:",
      publicIds,
    );
  }
}
