const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "dezgwdrfs";
const UPLOAD_PRESET =
  process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "ResQ_SOS";

export async function uploadImageToCloudinary(
  file: File,
  folder = "resq/avatars",
): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);
  if (folder) formData.append("folder", folder);

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

export async function uploadRawToCloudinary(
  file: File,
  folder = "resq/invoices",
): Promise<string> {
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
  return data.secure_url as string;
}
