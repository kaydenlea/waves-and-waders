type CommunityLogLevel = "info" | "warn" | "error";

type CommunityLogPayload = {
  event: string;
  reportId?: string;
  reportType?: string;
  userId?: string;
  scopeType?: string;
  scopeId?: string;
  ip?: string;
  reason?: string;
  status?: number;
};

const log = (level: CommunityLogLevel, payload: CommunityLogPayload) => {
  const safePayload = {
    namespace: "community",
    ...payload,
  };

  if (level === "error") {
    console.error(safePayload);
    return;
  }
  if (level === "warn") {
    console.warn(safePayload);
    return;
  }
  console.info(safePayload);
};

export const logCommunityInfo = (payload: CommunityLogPayload) =>
  log("info", payload);

export const logCommunityWarn = (payload: CommunityLogPayload) =>
  log("warn", payload);

export const logCommunityError = (payload: CommunityLogPayload) =>
  log("error", payload);

export const getRequestIpAddress = (request: Request) => {
  const forwardedFor = request.headers.get("x-forwarded-for");
  return (
    (forwardedFor ? forwardedFor.split(",")[0]?.trim() : null) ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
};
