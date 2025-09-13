import multer from "multer";

/**
 * Các mime types ảnh cho phép
 */
export enum ImageMimeType {
   JPEG = "image/jpeg",
   PNG = "image/png",
   JPG = "image/jpg",
   WEBP = "image/webp",
   GIF = "image/gif"
}

export const MAX_AVATAR_SIZE = 5 * 1024 * 1024; // 5MB
export const MAX_CERTIFICATION_SIZE = 10 * 1024 * 1024; // 10MB for certifications
export const MAX_FILES = 10; // Maximum number of files in array

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
         const err = new Error("Only image files are allowed (JPEG, PNG, JPG, WEBP, GIF)");
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

/**
 * Sử dụng: uploadArray("certificationImages", 10)
 * - Giữ buffers trong req.files để service upload lên Cloudinary
 * - maxCount: maximum number of files allowed
 */
export const uploadArray = (fieldName: string, maxCount: number = MAX_FILES) =>
   upload.array(fieldName, maxCount);

/**
 * Sử dụng: uploadFields([{ name: "avatar", maxCount: 1 }, { name: "certifications", maxCount: 5 }])
 * - Giữ buffers trong req.files để service upload lên Cloudinary
 */
export const uploadFields = (fields: multer.Field[]) => upload.fields(fields);

/**
 * Sử dụng: uploadAny() - for mixed single and multiple files
 * - Giữ buffers trong req.files để service upload lên Cloudinary
 */
export const uploadAny = () => upload.any();

export default upload;