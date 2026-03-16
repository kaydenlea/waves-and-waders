import { updateCommunityReportSchema } from "@/lib/community/schemas";
import { requireCommunityUser } from "@/lib/community/auth";
import {
  deleteCommunityReport,
  updateCommunityReport,
} from "@/lib/community/service";
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

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const ip = getRequestIpAddress(request);
  try {
    const { id } = await context.params;
    const { supabase, user } = await requireCommunityUser();
    const payload = updateCommunityReportSchema.parse(await request.json());
    enforceCommunityWriteRateLimit({
      userId: user.id,
      ip,
      action: "update",
    });
    const report = await updateCommunityReport(supabase, user.id, id, payload);
    logCommunityInfo({
      event: "report_updated",
      userId: user.id,
      reportId: id,
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
        event: "report_update_rejected",
        ip,
        reason: error.message,
        status: error.status,
      });
    } else {
      logCommunityError({
        event: "report_update_failed",
        ip,
      });
    }
    return communityErrorResponse(error);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const ip = getRequestIpAddress(request);
  try {
    const { id } = await context.params;
    const { supabase, user } = await requireCommunityUser();
    enforceCommunityWriteRateLimit({
      userId: user.id,
      ip,
      action: "delete",
    });
    await deleteCommunityReport(supabase, user.id, id);
    logCommunityInfo({
      event: "report_deleted",
      userId: user.id,
      reportId: id,
      ip,
    });
    return communityJson({ success: true });
  } catch (error) {
    if (isCommunityHttpError(error) && error.status < 500) {
      logCommunityWarn({
        event: "report_delete_rejected",
        ip,
        reason: error.message,
        status: error.status,
      });
    } else {
      logCommunityError({
        event: "report_delete_failed",
        ip,
      });
    }
    return communityErrorResponse(error);
  }
}
