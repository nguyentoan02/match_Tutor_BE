import { PutObjectCommand } from "@aws-sdk/client-s3";
import s3Client from "../config/r2";
import Material from "../models/material.model";
import { Types } from "mongoose";
import { v4 as uuidv4 } from "uuid";
import Session from "../models/session.model";
import { NotFoundError } from "../utils/error.response";

export const uploadMaterial = async (
   file: Express.Multer.File,
   title: string,
   description: string,
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

   const newMaterial = new Material({
      title,
      description,
      fileUrl,
      uploadedBy: userId,
   });

   await newMaterial.save();
   return newMaterial;
};

export const getMaterialsByUserId = async (userId: Types.ObjectId) => {
   const materials = await Material.find({ uploadedBy: userId })
      .populate("uploadedBy", "name email")
      .sort({ uploadedAt: -1 });
   return materials;
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
