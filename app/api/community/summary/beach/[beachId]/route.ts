import { fetchPublicAggregates } from "@/lib/community/aggregates";
import { communityErrorResponse, communityJson } from "@/lib/community/http";
import { summaryQuerySchema } from "@/lib/community/schemas";
import { serializePublicAggregate } from "@/lib/community/serializers";

type RouteContext = {
  params: Promise<{ beachId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  try {
    const { beachId } = await context.params;
    const { searchParams } = new URL(request.url);
    const query = summaryQuerySchema.parse({
      days: searchParams.get("days") ?? undefined,
    });
    const rows = await fetchPublicAggregates({
      scopeType: "beach",
      scopeIds: [beachId],
      days: query.days,
    });
    const data = rows
      .filter((row) => row.report_type !== "catch_report")
      .map((row) => serializePublicAggregate(row));
    return communityJson({
      success: true,
      state: data.length > 0 ? "ok" : "not_enough_data",
      data,
    });
  } catch (error) {
    return communityErrorResponse(error);
  }
}
