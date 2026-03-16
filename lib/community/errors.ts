export class CommunityHttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "CommunityHttpError";
    this.status = status;
  }
}

export const isCommunityHttpError = (
  error: unknown,
): error is CommunityHttpError => error instanceof CommunityHttpError;
