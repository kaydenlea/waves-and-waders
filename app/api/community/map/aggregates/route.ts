import { fetchPublicAggregates } from "@/lib/community/aggregates";
import { communityErrorResponse, communityJson } from "@/lib/community/http";
import { mapAggregatesQuerySchema } from "@/lib/community/schemas";
import { serializePublicAggregate } from "@/lib/community/serializers";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = mapAggregatesQuerySchema.parse({
      scopeType: searchParams.get("scopeType") ?? undefined,
      scopeIds: searchParams.get("scopeIds") ?? undefined,
      domain: searchParams.get("domain") ?? undefined,
      reportType: searchParams.get("reportType") ?? undefined,
      days: searchParams.get("days") ?? undefined,
    });
    const scopeIds = query.scopeIds
      ? query.scopeIds
          .split(",")
          .map((value) => value.trim())
          .filter((value) => value.length > 0)
      : undefined;
    const rows = await fetchPublicAggregates({
      scopeType: query.scopeType,
      scopeIds,
      domain: query.domain,
      reportType: query.reportType,
      days: query.days,
    });
    return communityJson({
      success: true,
      data: rows.map((row) => serializePublicAggregate(row)),
    });
  } catch (error) {
    return communityErrorResponse(error);
  }
}
