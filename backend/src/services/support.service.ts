import type { Repository } from "../repositories/interfaces.js";
import { AppError } from "../core/errors.js";
import { id, now } from "../core/utils.js";
export class SupportService {
  constructor(private repo: Repository) {}
  create(userId: string, subject: string, message: string) {
    if (
      !subject.trim() ||
      subject.length > 120 ||
      !message.trim() ||
      message.length > 4000
    )
      throw new AppError(
        "INVALID_TICKET",
        "Subject and message are required and must fit the limits",
        422,
      );
    const t = {
      id: id("ticket"),
      userId,
      subject: subject.trim(),
      message: message.trim(),
      status: "open" as const,
      createdAt: now(),
    };
    this.repo.supportTickets.set(t.id, t);
    return t;
  }
  list(userId: string) {
    return [...this.repo.supportTickets.values()].filter(
      (t) => t.userId === userId,
    );
  }
}
