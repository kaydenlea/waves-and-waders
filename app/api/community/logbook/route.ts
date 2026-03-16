import { requireCommunityUser } from "@/lib/community/auth";
import { communityErrorResponse, communityJson } from "@/lib/community/http";
import { logbookQuerySchema } from "@/lib/community/schemas";
import { serializePrivateCommunityReport } from "@/lib/community/serializers";
import { getCommunityLogbook } from "@/lib/community/service";
import {
  getRequestIpAddress,
  logCommunityError,
  logCommunityWarn,
} from "@/lib/community/logging";
import { isCommunityHttpError } from "@/lib/community/errors";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const ip = getRequestIpAddress(request);
  try {
    const { user } = await requireCommunityUser();
    const { searchParams } = new URL(request.url);
    const filters = logbookQuerySchema.parse({
      reportType: searchParams.get("reportType") ?? undefined,
      domain: searchParams.get("domain") ?? undefined,
      visibilityTier: searchParams.get("visibilityTier") ?? undefined,
      includeDeleted: searchParams.get("includeDeleted") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      offset: searchParams.get("offset") ?? undefined,
    });
    const reports = await getCommunityLogbook(user.id, filters);
    return communityJson({
      success: true,
      data: reports.map((report) => serializePrivateCommunityReport(report)),
    });
  } catch (error) {
    if (isCommunityHttpError(error) && error.status < 500) {
      logCommunityWarn({
        event: "logbook_read_rejected",
        ip,
        reason: error.message,
        status: error.status,
      });
    } else {
      logCommunityError({
        event: "logbook_read_failed",
        ip,
      });
    }
    return communityErrorResponse(error);
  }
}
