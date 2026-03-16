import { requireCommunityUser } from "@/lib/community/auth";
import { communityErrorResponse, communityJson } from "@/lib/community/http";
import { prepareUploadSchema } from "@/lib/community/schemas";
import { prepareCommunityUpload } from "@/lib/community/uploads";
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
    const payload = prepareUploadSchema.parse(await request.json());
    enforceCommunityWriteRateLimit({
      userId: user.id,
      ip,
      action: "upload_prepare",
    });
    const data = await prepareCommunityUpload(user.id, payload);
    logCommunityInfo({
      event: "upload_prepare_succeeded",
      userId: user.id,
      reportId: payload.reportId,
      ip,
    });
    return communityJson({ success: true, data });
  } catch (error) {
    if (isCommunityHttpError(error) && error.status < 500) {
      logCommunityWarn({
        event: "upload_prepare_rejected",
        ip,
        reason: error.message,
        status: error.status,
      });
    } else {
      logCommunityError({
        event: "upload_prepare_failed",
        ip,
      });
    }
    return communityErrorResponse(error);
  }
}
