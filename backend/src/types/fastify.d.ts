import "fastify";
import type { Container } from "../container.js";
declare module "fastify" {
  interface FastifyRequest {
    authUser?: { userId: string; sessionId: string };
  }
  interface FastifyInstance {
    container: Container;
    authenticate: (request: FastifyRequest) => Promise<void>;
    optionalAuthenticate: (request: FastifyRequest) => Promise<void>;
  }
}
