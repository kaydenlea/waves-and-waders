import { createCommunityReportSchema } from "@/lib/community/schemas";
import { requireCommunityUser } from "@/lib/community/auth";
import { createCommunityReport } from "@/lib/community/service";
import { serializePrivateCommunityReport } from "@/lib/community/serializers";
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

export async function POST(request: Request) {
  const ip = getRequestIpAddress(request);
  try {
    const { supabase, user } = await requireCommunityUser();
    const payload = createCommunityReportSchema.parse(await request.json());
    enforceCommunityWriteRateLimit({
      userId: user.id,
      ip,
      action: "create",
    });
    const report = await createCommunityReport(supabase, user.id, payload);
    logCommunityInfo({
      event: "report_created",
      userId: user.id,
      reportId: report?.report.id,
      reportType: payload.reportType,
      ip,
    });
    return communityJson({
      success: true,
      data: report ? serializePrivateCommunityReport(report) : null,
    });
  } catch (error) {
    if (isCommunityHttpError(error) && error.status < 500) {
      logCommunityWarn({
        event: "report_create_rejected",
        ip,
        reason: error.message,
        status: error.status,
      });
    } else {
      logCommunityError({
        event: "report_create_failed",
        ip,
      });
    }
    return communityErrorResponse(error);
  }
}
