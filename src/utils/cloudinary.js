// ─── Cloudinary Upload Utility ───────────────────────────────────────────────
// Setup:
//  1. Create a free account at https://cloudinary.com
//  2. Go to Settings → Upload → Upload presets → Add unsigned preset
//  3. Note your Cloud Name from the dashboard
//  4. Add to your .env:
//       VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
//       VITE_CLOUDINARY_UPLOAD_PRESET=your_unsigned_preset

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

if (!CLOUD_NAME || CLOUD_NAME.trim() === "" || CLOUD_NAME.startsWith("YOUR_")) {
  throw new Error("Cloudinary configuration failed: VITE_CLOUDINARY_CLOUD_NAME is missing or unconfigured.");
}
if (!UPLOAD_PRESET || UPLOAD_PRESET.trim() === "" || UPLOAD_PRESET.startsWith("YOUR_")) {
  throw new Error("Cloudinary configuration failed: VITE_CLOUDINARY_UPLOAD_PRESET is missing or unconfigured.");
}

/**
 * Upload a single File to Cloudinary.
 * Returns the secure HTTPS URL of the uploaded image.
 */
export async function uploadToCloudinary(file, folder = "campusmart/listings") {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);
  formData.append("folder", folder);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: "POST", body: formData }
  );

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || "Cloudinary upload failed");
  }

  const data = await res.json();
  return data.secure_url;
}

/**
 * Upload multiple Files to Cloudinary in parallel.
 * Returns an array of secure URLs.
 */
export async function uploadMultipleToCloudinary(files, folder = "campusmart/listings") {
  return Promise.all(files.map(f => uploadToCloudinary(f, folder)));
}

/**
 * Optimize Cloudinary URLs by inserting transformation parameters.
 * @param {string} url - Original image URL
 * @param {string} transforms - Transformation string (e.g. "f_auto,q_auto,w_400,c_fill")
 */
export function optimizeCloudinaryUrl(url, transforms = "f_auto,q_auto") {
  if (!url) return "";
  if (!url.includes("res.cloudinary.com") || !url.includes("/upload/")) {
    return url;
  }
  return url.replace("/upload/", `/upload/${transforms}/`);
}
