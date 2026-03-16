import { communityErrorResponse, communityJson } from "@/lib/community/http";
import { publicReportsQuerySchema } from "@/lib/community/schemas";
import { serializePublicCommunityReportCard } from "@/lib/community/serializers";
import { getPublicCommunityReportCards } from "@/lib/community/service";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = publicReportsQuerySchema.parse({
      beachId: searchParams.get("beachId") ?? undefined,
      regionId: searchParams.get("regionId") ?? undefined,
      reportType: searchParams.get("reportType") ?? undefined,
      days: searchParams.get("days") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
    });
    const reports = await getPublicCommunityReportCards(query);
    return communityJson({
      success: true,
      data: reports
        .map((report) => serializePublicCommunityReportCard(report))
        .filter((report): report is NonNullable<typeof report> => report !== null),
    });
  } catch (error) {
    return communityErrorResponse(error);
  }
}
