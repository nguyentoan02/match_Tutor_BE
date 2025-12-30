import { PutObjectCommand } from "@aws-sdk/client-s3";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import s3Client from "../config/r2";
import Material from "../models/material.model";
import { Types } from "mongoose";
import { v4 as uuidv4 } from "uuid";
import Session from "../models/session.model";
import Tutor from "../models/tutor.model";
import { BadRequestError, NotFoundError } from "../utils/error.response"; // adjust if BadRequestError exists

export const uploadMaterial = async (
   file: Express.Multer.File,
   title: string,
   description: string,
   subject: string | undefined,
   level: string | undefined,
   userId: Types.ObjectId
) => {
   const fileKey = `materials/${uuidv4()}-${file.originalname}`;
   const bucketName = process.env.R2_BUCKET_NAME;
   const publicUrl = process.env.R2_PUBLIC_URL;

   if (!bucketName || !publicUrl) {
      throw new Error("R2 bucket name or public URL is not configured.");
   }

   const params = {
      Bucket: bucketName,
      Key: fileKey,
      Body: file.buffer,
      ContentType: file.mimetype,
   };

   await s3Client.send(new PutObjectCommand(params));

   const fileUrl = `${publicUrl}/${fileKey}`;

   // verify subject/level belong to tutor (if provided)
   if (subject || level) {
      const tutor = await Tutor.findOne({ userId });
      if (!tutor) {
         throw new BadRequestError(
            "User is not a tutor or tutor profile not found."
         );
      }
      if (subject && !tutor.subjects?.includes(subject as any)) {
         throw new BadRequestError("Subject not listed in tutor profile.");
      }
      if (level && !tutor.levels?.includes(level as any)) {
         throw new BadRequestError("Level not listed in tutor profile.");
      }
   }

   const newMaterial = new Material({
      title,
      description,
      fileUrl,
      subject,
      level,
      uploadedBy: userId,
   });

   await newMaterial.save();
   return newMaterial;
};

export const getMaterialsByUserId = async (
   userId: Types.ObjectId,
   page = 1,
   limit = 10
) => {
   // ensure valid numbers
   const pageNum = Math.max(1, Number(page) || 1);
   const limitNum = Math.max(1, Number(limit) || 10);
   const skip = (pageNum - 1) * limitNum;

   const [materials, total] = await Promise.all([
      Material.find({ uploadedBy: userId })
         .populate("uploadedBy", "name email")
         .sort({ uploadedAt: -1 })
         .skip(skip)
         .limit(limitNum),
      Material.countDocuments({ uploadedBy: userId }),
   ]);

   const totalPages = Math.ceil(total / limitNum);

   return {
      items: materials,
      total,
      page: pageNum,
      totalPages,
      limit: limitNum,
   };
};

export const addMaterialToSession = async (
   sessionId: Types.ObjectId,
   materialId: Types.ObjectId,
   userId: Types.ObjectId
) => {
   const session = await Session.findById(sessionId);
   if (!session) {
      throw new NotFoundError("Session not found.");
   }

   const material = await Material.findOne({
      _id: materialId,
      uploadedBy: userId,
   });
   if (!material) {
      throw new NotFoundError(
         "Material not found or you don't have permission to use it."
      );
   }

   if (session.materials?.includes(materialId)) {
      return session; // Material already in session
   }

   // Dùng findByIdAndUpdate thay vì save()
   const updatedSession = await Session.findByIdAndUpdate(
      sessionId,
      { $push: { materials: materialId } },
      { new: true }
   ).populate("materials");

   return updatedSession;
};

export const removeMaterialFromSession = async (
   sessionId: Types.ObjectId,
   materialId: Types.ObjectId,
   userId: Types.ObjectId
) => {
   const session = await Session.findById(sessionId);
   if (!session) {
      throw new NotFoundError("Session not found.");
   }

   const material = await Material.findOne({
      _id: materialId,
      uploadedBy: userId,
   });
   if (!material) {
      throw new NotFoundError(
         "Material not found or you don't have permission to use it."
      );
   }

   if (!session.materials?.includes(materialId)) {
      throw new NotFoundError("Material is not in this session.");
   }

   // Dùng $pull để xóa materialId khỏi array materials
   const updatedSession = await Session.findByIdAndUpdate(
      sessionId,
      { $pull: { materials: materialId } },
      { new: true }
   ).populate("materials");

   return updatedSession;
};

export const getMaterialsBySessionId = async (sessionId: Types.ObjectId) => {
   const session = await Session.findById(sessionId).populate({
      path: "materials",
      select: "title description fileUrl uploadedAt uploadedBy",
      populate: {
         path: "uploadedBy",
         select: "name email",
      },
   });

   if (!session) {
      throw new NotFoundError("Session not found.");
   }

   return session.materials || [];
};

export const deleteMaterial = async (
   materialId: Types.ObjectId,
   userId: Types.ObjectId
) => {
   // Tìm material và verify quyền (uploadedBy === userId)
   const material = await Material.findOne({
      _id: materialId,
      uploadedBy: userId,
   });
   if (!material) {
      throw new NotFoundError(
         "Material not found or you don't have permission to delete it."
      );
   }

   // Xóa các tham chiếu trong sessions (pull materialId)
   const updateResult = await Session.updateMany(
      { materials: materialId },
      { $pull: { materials: materialId } }
   );

   // Nếu có fileUrl, thử xóa object trên R2 (nếu có cấu hình)
   const bucketName = process.env.R2_BUCKET_NAME;
   const publicUrl = process.env.R2_PUBLIC_URL;
   if (material.fileUrl && bucketName && publicUrl) {
      try {
         // Lấy key của object từ fileUrl (fileUrl = `${publicUrl}/${fileKey}`)
         const prefix = publicUrl.endsWith("/") ? publicUrl : `${publicUrl}/`;
         const fileKey = material.fileUrl.startsWith(prefix)
            ? material.fileUrl.slice(prefix.length)
            : material.fileUrl; // fallback: nếu không match, dùng full url — R2 sẽ lỗi nhưng không block
         await s3Client.send(
            new DeleteObjectCommand({
               Bucket: bucketName,
               Key: fileKey,
            })
         );
      } catch (err) {
         // Không throw, chỉ log vì xóa S3 không ảnh hưởng DB
         // Nếu muốn xử lý lỗi nghiêm ngặt hơn, có thể throw tại đây
         console.warn("Failed to delete object from R2:", err);
      }
   }

   // Xóa material doc
   await Material.deleteOne({ _id: material._id });

   return {
      message: "Material deleted successfully.",
      removedFromSessions: updateResult.modifiedCount || 0,
   };
};

export const getMaterialsByFilters = async (
   userId: Types.ObjectId,
   filters?: {
      subjects?: string[];
      levels?: string[];
   },
   page = 1,
   limit = 10
) => {
   const pageNum = Math.max(1, Number(page) || 1);
   const limitNum = Math.max(1, Number(limit) || 10);
   const skip = (pageNum - 1) * limitNum;

   // Build query object
   const query: any = { uploadedBy: userId };

   if (filters?.subjects && filters.subjects.length > 0) {
      query.subject = { $in: filters.subjects };
   }

   if (filters?.levels && filters.levels.length > 0) {
      query.level = { $in: filters.levels };
   }

   const [materials, total] = await Promise.all([
      Material.find(query)
         .populate("uploadedBy", "name email")
         .sort({ uploadedAt: -1 })
         .skip(skip)
         .limit(limitNum),
      Material.countDocuments(query),
   ]);

   const totalPages = Math.ceil(total / limitNum);

   return {
      items: materials,
      total,
      page: pageNum,
      totalPages,
      limit: limitNum,
   };
};
