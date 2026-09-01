export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode = 400,
    public details?: unknown,
  ) {
    super(message);
  }
}
export const notFound = (name = "Resource") =>
  new AppError("NOT_FOUND", `${name} not found`, 404);
export const forbidden = (
  message = "You are not allowed to perform this action",
) => new AppError("FORBIDDEN", message, 403);
export const unauthorized = (message = "Authentication required") =>
  new AppError("UNAUTHORIZED", message, 401);
export class ProviderDisabledError extends AppError {
  constructor(provider: string) {
    super("PROVIDER_DISABLED", `${provider} is not enabled`, 501);
  }
}
