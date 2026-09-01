import { createHash, randomBytes, randomUUID } from "node:crypto";
import { AppError } from "./errors.js";
export const id = (prefix: string) => `${prefix}_${randomUUID()}`;
export const now = () => new Date().toISOString();
export const opaqueToken = () => randomBytes(48).toString("base64url");
export const tokenHash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export function toMinor(value: string): bigint {
  if (!/^\d+(\.\d{1,2})?$/.test(value))
    throw new AppError(
      "INVALID_AMOUNT",
      "Amount must be a positive decimal with at most two decimal places",
      422,
    );
  const [whole, fraction = ""] = value.split(".");
  const minor = BigInt(whole!) * 100n + BigInt((fraction + "00").slice(0, 2));
  if (minor <= 0n)
    throw new AppError(
      "INVALID_AMOUNT",
      "Amount must be greater than zero",
      422,
    );
  return minor;
}
export const fromMinor = (value: bigint) =>
  `${value < 0n ? "-" : ""}${(value < 0n ? -value : value) / 100n}.${((value < 0n ? -value : value) % 100n).toString().padStart(2, "0")}`;
export const normalizeSearch = (value: string) =>
  value
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .slice(0, 100);
export const publicBigInt = (_key: string, value: unknown) =>
  typeof value === "bigint" ? fromMinor(value) : value;
export function page<T>(items: T[], cursor?: string, requested = 20) {
  const limit = Math.min(Math.max(requested, 1), 100);
  const offset = cursor
    ? Math.max(Number(Buffer.from(cursor, "base64url").toString()) || 0, 0)
    : 0;
  const data = items.slice(offset, offset + limit);
  const next =
    offset + limit < items.length
      ? Buffer.from(String(offset + limit)).toString("base64url")
      : undefined;
  return { data, meta: { nextCursor: next, limit, total: items.length } };
}
