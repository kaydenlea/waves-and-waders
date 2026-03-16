import { fetchPublicAggregates } from "@/lib/community/aggregates";
import { communityErrorResponse, communityJson } from "@/lib/community/http";
import { summaryQuerySchema } from "@/lib/community/schemas";
import { serializePublicAggregate } from "@/lib/community/serializers";

type RouteContext = {
  params: Promise<{ regionId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  try {
    const { regionId } = await context.params;
    const { searchParams } = new URL(request.url);
    const query = summaryQuerySchema.parse({
      days: searchParams.get("days") ?? undefined,
    });
    const rows = await fetchPublicAggregates({
      scopeType: "region",
      scopeIds: [regionId],
      days: query.days,
    });
    const data = rows.map((row) => serializePublicAggregate(row));
    return communityJson({
      success: true,
      state: data.length > 0 ? "ok" : "not_enough_data",
      data,
    });
  } catch (error) {
    return communityErrorResponse(error);
  }
}
