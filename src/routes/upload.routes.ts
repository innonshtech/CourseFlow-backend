import { Router, Request, Response } from "express";
import multer from "multer";
import { uploadPdfFile, uploadImageFile, deleteCloudinaryFile } from "@/lib/cloudinary";
import { sendSuccess, handleApiError } from "@/utils/api-response";
import { authenticate } from "@/middlewares/auth.middleware";
import { ApiError } from "@/types/api";
import { Role } from "@/types/auth";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

const MAX_PDF_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];
const ALLOWED_IMAGE_MIMES = ["image/jpeg", "image/png", "image/webp", "image/jpg"];

router.post("/", authenticate, upload.single("file"), async (req: Request, res: Response) => {
  try {
    if (!req.user) throw ApiError.unauthorized("Authentication required");
    if (req.user.role !== Role.CREATOR && req.user.role !== Role.ADMIN) {
      throw ApiError.forbidden("Only creators and admins can upload course attachments");
    }

    const file = req.file;
    if (!file) {
      throw ApiError.badRequest("No file uploaded");
    }

    const fileNameLower = file.originalname.toLowerCase();
    const fileMimeLower = file.mimetype.toLowerCase();
    const isImageExtension = ALLOWED_IMAGE_EXTENSIONS.some((ext) => fileNameLower.endsWith(ext));
    const isImageMime = ALLOWED_IMAGE_MIMES.includes(fileMimeLower);

    if (isImageExtension || isImageMime) {
      if (!isImageExtension || (fileMimeLower !== "" && !isImageMime)) {
        throw ApiError.badRequest("Invalid image format. Supported formats: JPG, JPEG, PNG, and WEBP.");
      }
      if (file.size > MAX_IMAGE_SIZE_BYTES) {
        throw ApiError.badRequest("File size exceeds 5MB limit. Please upload a smaller image file.");
      }

      const result = await uploadImageFile(file.buffer, file.originalname, file.mimetype);
      return sendSuccess(res, {
        public_id: result.public_id,
        resource_type: result.resource_type,
        format: result.format,
        version: result.version,
        bytes: result.bytes,
        secure_url: result.secure_url,
        url: result.secure_url,
        filename: file.originalname,
      }, "Image uploaded successfully to Cloudinary");
    }

    const isPdfExtension = fileNameLower.endsWith(".pdf");
    const allowedPdfMimes = ["application/pdf", "application/x-pdf", "application/acrobat", "applications/vnd.pdf", "text/pdf", "text/x-pdf", "application/octet-stream", ""];
    const isPdfMime = allowedPdfMimes.includes(fileMimeLower);

    if (!isPdfExtension || !isPdfMime) {
      throw ApiError.badRequest("Invalid file format. Only image files and PDF documents are allowed.");
    }
    if (file.size > MAX_PDF_SIZE_BYTES) {
      throw ApiError.badRequest("File size exceeds 10MB limit. Please upload a smaller PDF file.");
    }

    const lessonTitle = (req.body?.title as string) || (req.body?.lessonTitle as string);
    const result = await uploadPdfFile(file.buffer, file.originalname, lessonTitle);

    return sendSuccess(res, {
      public_id: result.public_id,
      resource_type: result.resource_type,
      format: result.format,
      version: result.version,
      bytes: result.bytes,
      secure_url: result.secure_url,
      url: result.secure_url,
      filename: file.originalname,
    }, "PDF uploaded successfully to Cloudinary");
  } catch (error) {
    return handleApiError(res, error);
  }
});

router.delete("/", authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.user) throw ApiError.unauthorized("Authentication required");
    if (req.user.role !== Role.CREATOR && req.user.role !== Role.ADMIN) {
      throw ApiError.forbidden("Only creators and admins can delete course attachments");
    }

    const { url } = req.body;
    if (!url) throw ApiError.badRequest("No asset URL provided");

    await deleteCloudinaryFile(url);
    return sendSuccess(res, null, "Asset deleted from Cloudinary");
  } catch (error) {
    return handleApiError(res, error);
  }
});

export default router;
