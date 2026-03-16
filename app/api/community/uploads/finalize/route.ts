import { requireCommunityUser } from "@/lib/community/auth";
import { communityErrorResponse, communityJson } from "@/lib/community/http";
import { finalizeUploadSchema } from "@/lib/community/schemas";
import { finalizeCommunityUpload } from "@/lib/community/uploads";
import {
  getRequestIpAddress,
  logCommunityError,
  logCommunityInfo,
  logCommunityWarn,
} from "@/lib/community/logging";
import { enforceCommunityWriteRateLimit } from "@/lib/community/rateLimit";
import { isCommunityHttpError } from "@/lib/community/errors";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const ip = getRequestIpAddress(request);
  try {
    const { user } = await requireCommunityUser();
    const payload = finalizeUploadSchema.parse(await request.json());
    enforceCommunityWriteRateLimit({
      userId: user.id,
      ip,
      action: "upload_finalize",
    });
    const data = await finalizeCommunityUpload(user.id, payload);
    logCommunityInfo({
      event: "upload_finalize_succeeded",
      userId: user.id,
      reportId: payload.reportId,
      ip,
    });
    return communityJson({ success: true, data });
  } catch (error) {
    if (isCommunityHttpError(error) && error.status < 500) {
      logCommunityWarn({
        event: "upload_finalize_rejected",
        ip,
        reason: error.message,
        status: error.status,
      });
    } else {
      logCommunityError({
        event: "upload_finalize_failed",
        ip,
      });
    }
    return communityErrorResponse(error);
  }
}
