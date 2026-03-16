import { flagReportSchema } from "@/lib/community/schemas";
import { requireCommunityUser } from "@/lib/community/auth";
import { flagCommunityReport } from "@/lib/community/service";
import { communityErrorResponse, communityJson } from "@/lib/community/http";
import {
  getRequestIpAddress,
  logCommunityError,
  logCommunityInfo,
  logCommunityWarn,
} from "@/lib/community/logging";
import { enforceCommunityWriteRateLimit } from "@/lib/community/rateLimit";
import { isCommunityHttpError } from "@/lib/community/errors";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const ip = getRequestIpAddress(request);
  try {
    const { id } = await context.params;
    const { supabase, user } = await requireCommunityUser();
    const payload = flagReportSchema.parse(await request.json());
    enforceCommunityWriteRateLimit({
      userId: user.id,
      ip,
      action: "flag",
    });
    await flagCommunityReport(supabase, user.id, id, payload);
    logCommunityInfo({
      event: "report_flagged",
      userId: user.id,
      reportId: id,
      reason: payload.reason,
      ip,
    });
    return communityJson({ success: true });
  } catch (error) {
    if (isCommunityHttpError(error) && error.status < 500) {
      logCommunityWarn({
        event: "report_flag_rejected",
        ip,
        reason: error.message,
        status: error.status,
      });
    } else {
      logCommunityError({
        event: "report_flag_failed",
        ip,
      });
    }
    return communityErrorResponse(error);
  }
}
