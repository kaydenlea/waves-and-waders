import { CommunityHttpError } from "./errors";

type RateLimitRecord = {
  count: number;
  resetAt: number;
};

const rateLimitStore = new Map<string, RateLimitRecord>();

const hitRateLimit = (
  key: string,
  maxRequests: number,
  windowMs: number,
): boolean => {
  const now = Date.now();
  const record = rateLimitStore.get(key);
  if (!record || now >= record.resetAt) {
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });
    return false;
  }
  if (record.count >= maxRequests) {
    return true;
  }
  record.count += 1;
  return false;
};

export const enforceCommunityWriteRateLimit = (input: {
  userId: string;
  ip: string;
  action: "create" | "update" | "delete" | "flag" | "upload_prepare" | "upload_finalize";
}) => {
  const perActionConfig = {
    create: { maxRequests: 20, windowMs: 60 * 60 * 1000 },
    update: { maxRequests: 30, windowMs: 60 * 60 * 1000 },
    delete: { maxRequests: 20, windowMs: 60 * 60 * 1000 },
    flag: { maxRequests: 15, windowMs: 60 * 60 * 1000 },
    upload_prepare: { maxRequests: 25, windowMs: 60 * 60 * 1000 },
    upload_finalize: { maxRequests: 25, windowMs: 60 * 60 * 1000 },
  } as const;

  const config = perActionConfig[input.action];
  const userKey = `community:${input.action}:user:${input.userId}`;
  const ipKey = `community:${input.action}:ip:${input.ip}`;
  if (
    hitRateLimit(userKey, config.maxRequests, config.windowMs) ||
    hitRateLimit(ipKey, config.maxRequests * 2, config.windowMs)
  ) {
    throw new CommunityHttpError(429, "Too many requests. Please try again later.");
  }
};
