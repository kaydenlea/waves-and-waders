export const COMMUNITY_ALLOWED_IMAGE_EXTENSIONS = [
  "jpg",
  "jpeg",
  "png",
  "webp",
] as const;

export const normalizeUploadExtension = (extension: string) =>
  extension.trim().toLowerCase() === "jpeg"
    ? "jpg"
    : extension.trim().toLowerCase();

export const isAllowedUploadExtension = (extension: string) =>
  COMMUNITY_ALLOWED_IMAGE_EXTENSIONS.includes(
    normalizeUploadExtension(extension) as (typeof COMMUNITY_ALLOWED_IMAGE_EXTENSIONS)[number],
  );

export const doesUploadPathBelongToReport = (
  userId: string,
  reportId: string,
  objectPath: string,
) => objectPath.startsWith(`reports/${userId}/${reportId}/`);
