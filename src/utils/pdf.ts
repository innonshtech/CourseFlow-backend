/**
 * Utility functions for handling Cloudinary PDF viewing and forced downloads.
 */

/**
 * Returns a clean view URL for a PDF document.
 * Returns the exact secure_url returned by Cloudinary without modifications or Blob wrappers.
 */
export function getPdfViewUrl(url: string | null | undefined): string {
  if (!url) return "";
  return url.trim();
}

/**
 * Sanitizes a lesson or file title for safe usage in HTTP attachment headers and file download names.
 * Removes/replaces unsupported characters: :, &, ?, #, %, /, \, commas, quotes, spaces, etc.
 */
export function sanitizeDownloadFilename(name: string | null | undefined): string {
  if (!name || typeof name !== "string") return "Lesson_Notes.pdf";

  let base = name.replace(/\.pdf$/i, "").trim();
  // Remove special characters, symbols, colons, commas, ampersands, quotes
  base = base.replace(/[^a-zA-Z0-9_-]/g, "_");
  // Collapse consecutive underscores
  base = base.replace(/_+/g, "_");
  // Strip leading and trailing underscores
  base = base.replace(/^_+|_+$/g, "");

  return (base || "Lesson_Notes") + ".pdf";
}

/**
 * Transforms a Cloudinary URL to attach `fl_attachment` header flag,
 * forcing native browser file download instead of opening inline.
 * Ensures no invalid transformation characters (:, &, ?, #, %, commas, spaces) cause HTTP 400.
 */
export function getPdfDownloadUrl(url: string | null | undefined, filename?: string): string {
  if (!url) return "";
  const trimmedUrl = url.trim();

  if (!trimmedUrl.includes("cloudinary.com") || !trimmedUrl.includes("/upload/")) {
    return trimmedUrl;
  }

  if (trimmedUrl.includes("fl_attachment")) {
    return trimmedUrl;
  }

  const rawBase = (filename || "Lesson_Notes").replace(/\.pdf$/i, "");
  const cleanName = rawBase.replace(/[^a-zA-Z0-9_-]/g, "_").replace(/_+/g, "_").replace(/^_+|_+$/g, "") || "Lesson_Notes";

  // Cloudinary "raw" resources do NOT support fl_attachment:filename syntax (causes HTTP 400)
  if (trimmedUrl.includes("/raw/upload/")) {
    return trimmedUrl.replace("/raw/upload/", "/raw/upload/fl_attachment/");
  }

  // Cloudinary "image" resources support fl_attachment:cleanName (where cleanName contains only [a-zA-Z0-9_-])
  return trimmedUrl.replace("/upload/", `/upload/fl_attachment:${cleanName}/`);
}
