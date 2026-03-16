import { randomUUID } from "crypto";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { serverEnv } from "@/lib/env/server";
import { COMMUNITY_UPLOAD_URL_TTL_SECONDS } from "@/lib/community/constants";
import { CommunityHttpError } from "@/lib/community/errors";
import {
  doesUploadPathBelongToReport,
  isAllowedUploadExtension,
  normalizeUploadExtension,
} from "@/lib/community/uploadRules";
import type {
  FinalizeUploadInput,
  PrepareUploadInput,
} from "@/lib/community/schemas";

const DEFAULT_BUCKET = "community-images";
const DEFAULT_MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const DEFAULT_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_MEDIA_PER_REPORT = 4;

export const getCommunityUploadBucket = () =>
  serverEnv.COMMUNITY_UPLOAD_BUCKET ?? DEFAULT_BUCKET;

export const getCommunityAllowedMimeTypes = () =>
  serverEnv.COMMUNITY_ALLOWED_UPLOAD_MIME_TYPES
    ?.split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0) ?? DEFAULT_MIME_TYPES;

export const getCommunityMaxUploadBytes = () => {
  const raw = serverEnv.COMMUNITY_MAX_UPLOAD_BYTES;
  if (!raw) return DEFAULT_MAX_UPLOAD_BYTES;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_MAX_UPLOAD_BYTES;
};

const ensureReportOwnership = async (userId: string, reportId: string) => {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("community_reports")
    .select("id, author_id, deleted_at")
    .eq("id", reportId)
    .maybeSingle();

  if (error) {
    throw new CommunityHttpError(500, "Failed to verify report ownership.");
  }

  if (!data || data.author_id !== userId || data.deleted_at != null) {
    throw new CommunityHttpError(404, "Report not found.");
  }
};

export const prepareCommunityUpload = async (
  userId: string,
  payload: PrepareUploadInput,
) => {
  await ensureReportOwnership(userId, payload.reportId);

  const allowedMimeTypes = getCommunityAllowedMimeTypes();
  if (!allowedMimeTypes.includes(payload.mimeType)) {
    throw new CommunityHttpError(400, "Unsupported upload MIME type.");
  }
  if (payload.byteSize > getCommunityMaxUploadBytes()) {
    throw new CommunityHttpError(413, "Upload exceeds the configured size limit.");
  }

  const admin = getSupabaseAdmin();
  const { count, error: countError } = await admin
    .from("community_media")
    .select("id", { count: "exact", head: true })
    .eq("report_id", payload.reportId)
    .neq("status", "removed");

  if (countError) {
    throw new CommunityHttpError(500, "Failed to verify upload limit.");
  }
  if ((count ?? 0) >= MAX_MEDIA_PER_REPORT) {
    throw new CommunityHttpError(400, "This report already has the maximum number of images.");
  }

  const extension = normalizeUploadExtension(payload.extension);
  const objectPath = `reports/${userId}/${payload.reportId}/${randomUUID()}.${extension}`;
  const bucket = getCommunityUploadBucket();

  const { data, error } = await admin.storage
    .from(bucket)
    .createSignedUploadUrl(objectPath);

  if (error || !data) {
    throw new CommunityHttpError(500, "Failed to prepare upload URL.");
  }

  return {
    bucket,
    objectPath,
    signedUrl: data.signedUrl,
    token: data.token,
    expiresInSeconds: COMMUNITY_UPLOAD_URL_TTL_SECONDS,
    allowedMimeTypes,
    maxUploadBytes: getCommunityMaxUploadBytes(),
  };
};

export const finalizeCommunityUpload = async (
  userId: string,
  payload: FinalizeUploadInput,
) => {
  await ensureReportOwnership(userId, payload.reportId);

  if (payload.byteSize > getCommunityMaxUploadBytes()) {
    throw new CommunityHttpError(413, "Upload exceeds the configured size limit.");
  }

  const bucket = getCommunityUploadBucket();
  const admin = getSupabaseAdmin();
  const pathParts = payload.objectPath.split("/");
  const objectName = pathParts.pop();
  const prefix = pathParts.join("/");

  if (
    !objectName ||
    !doesUploadPathBelongToReport(userId, payload.reportId, payload.objectPath)
  ) {
    throw new CommunityHttpError(400, "Upload path is invalid for this report.");
  }

  const { data: objects, error: listError } = await admin.storage
    .from(bucket)
    .list(prefix, {
      search: objectName,
      limit: 1,
    });

  if (listError) {
    throw new CommunityHttpError(500, "Failed to verify uploaded object.");
  }

  const uploadedObject = objects?.find((entry) => entry.name === objectName) ?? null;
  if (!uploadedObject) {
    throw new CommunityHttpError(404, "Uploaded object not found.");
  }

  const objectSize = Number(uploadedObject.metadata?.size ?? payload.byteSize);
  if (!Number.isFinite(objectSize) || objectSize <= 0) {
    throw new CommunityHttpError(400, "Uploaded object metadata is invalid.");
  }
  if (objectSize > getCommunityMaxUploadBytes()) {
    throw new CommunityHttpError(413, "Uploaded object exceeds the configured size limit.");
  }

  const objectMime = String(
    uploadedObject.metadata?.mimetype ?? payload.mimeType,
  ).toLowerCase();
  if (!getCommunityAllowedMimeTypes().includes(objectMime)) {
    throw new CommunityHttpError(400, "Uploaded object MIME type is not allowed.");
  }

  const extension = objectName.split(".").pop()?.toLowerCase();
  if (!extension || !isAllowedUploadExtension(extension)) {
    throw new CommunityHttpError(400, "Uploaded object extension is not allowed.");
  }

  const { data, error } = await admin
    .from("community_media")
    .insert({
      report_id: payload.reportId,
      author_id: userId,
      kind: "image",
      storage_path: payload.objectPath,
      mime_type: objectMime,
      extension: normalizeUploadExtension(extension),
      byte_size: objectSize,
      width: payload.width ?? null,
      height: payload.height ?? null,
      status: "ready",
    })
    .select("*")
    .maybeSingle();

  if (error || !data) {
    throw new CommunityHttpError(500, "Failed to finalize uploaded image.");
  }

  return data as Record<string, unknown>;
};
