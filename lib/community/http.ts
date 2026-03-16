import { NextResponse } from "next/server";
import { isCommunityHttpError } from "@/lib/community/errors";

export const communityJson = (
  payload: Record<string, unknown>,
  init?: ResponseInit,
) => NextResponse.json(payload, init);

export const communityErrorResponse = (error: unknown) => {
  if (isCommunityHttpError(error)) {
    return communityJson(
      { success: false, error: error.message },
      { status: error.status },
    );
  }

  console.error("Community route error:", error);
  return communityJson(
    { success: false, error: "Internal server error" },
    { status: 500 },
  );
};
