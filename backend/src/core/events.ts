import { EventEmitter } from "node:events";
export type DomainEvent = {
  type:
    | "prediction.placed"
    | "prediction.resolved"
    | "market.updated"
    | "social.interaction"
    | "security.new_session"
    | "wallet.changed";
  userId?: string;
  at: string;
  data: Record<string, string>;
};
export class EventBus {
  private emitter = new EventEmitter();
  publish(event: DomainEvent) {
    this.emitter.emit(event.type, event);
  }
  subscribe(type: DomainEvent["type"], handler: (event: DomainEvent) => void) {
    this.emitter.on(type, handler);
    return () => this.emitter.off(type, handler);
  }
}
