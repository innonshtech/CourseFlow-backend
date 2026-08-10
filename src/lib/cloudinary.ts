import { v2 as cloudinary, UploadApiResponse } from "cloudinary";

// Initialize Cloudinary SDK
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "",
  api_key: process.env.CLOUDINARY_API_KEY || "",
  api_secret: process.env.CLOUDINARY_API_SECRET || "",
  secure: true,
});

export { cloudinary };

/**
 * Sanitizes a lesson or file name into a Cloudinary-safe public_id.
 * - Removes invalid characters: :, &, ,, ?, #, %, /, \, ", ', etc.
 * - Converts spaces to hyphens.
 * - Converts multiple hyphens into one.
 * - Trims leading and trailing hyphens.
 * - Converts to lowercase for consistent URL formatting.
 * Example: "Lesson 1: Course Overview, Setup & Objectives" -> "lesson-1-course-overview-setup-objectives"
 */
export function sanitizeCloudinaryPublicId(name: string): string {
  if (!name || typeof name !== "string") return "lesson-notes";

  let cleaned = name.replace(/\.pdf$/i, "").trim().toLowerCase();
  // Remove special symbols except spaces and hyphens
  cleaned = cleaned.replace(/[^a-z0-9\s-]/g, "");
  // Replace spaces with hyphens
  cleaned = cleaned.replace(/\s+/g, "-");
  // Collapse multiple hyphens into single hyphen
  cleaned = cleaned.replace(/-+/g, "-");
  // Strip leading and trailing hyphens
  cleaned = cleaned.replace(/^-+|-+$/g, "");

  return cleaned || "lesson-notes";
}

/**
 * Extracts Cloudinary public_id and resource_type from a Cloudinary secure_url string.
 * Handles raw and image resource types (e.g. /image/upload/v12345/course_notes/file.pdf).
 */
export function extractCloudinaryPublicId(url: string | null | undefined): {
  publicId: string;
  resourceType: "raw" | "image" | "auto";
} | null {
  if (!url || typeof url !== "string" || !url.includes("cloudinary.com")) {
    return null;
  }

  try {
    const resourceType: "raw" | "image" | "auto" = url.includes("/raw/upload/")
      ? "raw"
      : url.includes("/image/upload/")
      ? "image"
      : "auto";

    const parts = url.split("/upload/");
    if (parts.length < 2) return null;

    let pathAfterUpload = parts[1];
    // Strip transformation parameters if present (e.g., fl_attachment:filename/v12345/)
    pathAfterUpload = pathAfterUpload.replace(/^(?:[a-zA-Z0-9_:-]+\/)+v\d+\//, "");
    pathAfterUpload = pathAfterUpload.replace(/^v\d+\//, "");

    const cleanPublicId = pathAfterUpload.split("?")[0];
    if (!cleanPublicId) return null;

    return { publicId: cleanPublicId, resourceType };
  } catch {
    return null;
  }
}

/**
 * Uploads a PDF file buffer directly to Cloudinary storage as a real PDF asset.
 * Returns exact UploadApiResponse object directly from Cloudinary.
 */
export async function uploadPdfFile(
  fileBuffer: Buffer,
  originalFilename: string,
  lessonTitle?: string | null
): Promise<UploadApiResponse> {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      "Cloudinary credentials missing. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in environment variables."
    );
  }

  const base64Data = `data:application/pdf;base64,${fileBuffer.toString("base64")}`;

  // Derive safe public_id from lessonTitle or originalFilename
  const rawName = lessonTitle && lessonTitle.trim() ? lessonTitle.trim() : originalFilename;
  const cleanPublicId = sanitizeCloudinaryPublicId(rawName);

  const uploadResult = await cloudinary.uploader.upload(base64Data, {
    resource_type: "image",
    format: "pdf",
    folder: "course_notes",
    public_id: cleanPublicId,
    overwrite: true,
  });

  console.log("Cloudinary PDF Upload Result:", uploadResult);

  if (!uploadResult || !uploadResult.secure_url) {
    throw new Error("Cloudinary PDF upload failed: No URL returned.");
  }

  return uploadResult;
}

/**
 * Uploads an image file buffer directly to Cloudinary storage.
 * Returns exact UploadApiResponse object directly from Cloudinary.
 */
export async function uploadImageFile(
  fileBuffer: Buffer,
  originalFilename: string,
  mimeType: string
): Promise<UploadApiResponse> {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      "Cloudinary credentials missing. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in environment variables."
    );
  }

  const sanitizedName = originalFilename.replace(/[^a-zA-Z0-9_-]/g, "_");
  const publicId = `thumbnail_${Date.now()}_${sanitizedName}`;
  const base64Data = `data:${mimeType || "image/jpeg"};base64,${fileBuffer.toString("base64")}`;

  const uploadResult = await cloudinary.uploader.upload(base64Data, {
    resource_type: "image",
    folder: "course_thumbnails",
    public_id: publicId,
    transformation: [
      { width: 1280, height: 720, crop: "limit", quality: "auto" }
    ]
  });

  console.log("Cloudinary Image Upload Result:", uploadResult);

  if (!uploadResult || !uploadResult.secure_url) {
    throw new Error("Cloudinary image upload failed: No URL returned.");
  }

  return uploadResult;
}

/**
 * Deletes an asset from Cloudinary given its secure_url or public_id.
 * Silently handles already-deleted assets or missing configuration gracefully.
 */
export async function deleteCloudinaryFile(urlOrPublicId: string | null | undefined): Promise<boolean> {
  if (!urlOrPublicId) return false;

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    return false;
  }

  const extracted = extractCloudinaryPublicId(urlOrPublicId);
  const publicId = extracted ? extracted.publicId : urlOrPublicId;
  const resourceType = extracted ? extracted.resourceType : "image";

  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });

    if (result.result !== "ok" && resourceType === "image") {
      // Retry with "raw" resource_type if image destroy returned not found (legacy fallback)
      await cloudinary.uploader.destroy(publicId, { resource_type: "raw" });
    }

    return true;
  } catch (err) {
    console.warn("Cloudinary asset deletion warning:", err);
    return false;
  }
}
