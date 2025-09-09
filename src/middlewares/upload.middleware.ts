import multer from "multer";

/**
 * Các mime types ảnh cho phép
 */
export enum ImageMimeType {
   JPEG = "image/jpeg",
   PNG = "image/png",
}

export const MAX_AVATAR_SIZE = 5 * 1024 * 1024; // 5MB

const ALLOWED_IMAGE_TYPES: Set<string> = new Set(Object.values(ImageMimeType));

const storage = multer.memoryStorage();

const upload = multer({
   storage,
   limits: { fileSize: MAX_AVATAR_SIZE },
   fileFilter: (req, file, cb) => {
      try {
         if (!file || !file.mimetype) {
            return cb(new Error("No file or mimetype provided"));
         }
         if (ALLOWED_IMAGE_TYPES.has(file.mimetype)) {
            return cb(null, true);
         }
         const err = new Error("Only image files are allowed");

         return cb(err as any);
      } catch (e) {
         return cb(e as any);
      }
   },
});

/**
 * Sử dụng: uploadSingle("avatar")
 * - Giữ buffer trong req.file để service upload lên Cloudinary
 */
export const uploadSingle = (fieldName: string) => upload.single(fieldName);
