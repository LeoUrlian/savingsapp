/**
 * Contrato compartilhado entre a API (NestJS) e o front (Next.js).
 * Definir os tipos UMA vez aqui e importar nos dois lados é o que dá
 * segurança de ponta a ponta: se a API muda a forma de uma resposta,
 * o TypeScript quebra o build do front na hora.
 *
 * Na Fatia 0 temos só o health-check. Os tipos de schema/migração
 * (introspection, de-para, validações) entram nas fatias seguintes.
 */

/** Resposta do endpoint GET /health */
export interface HealthResponse {
  status: "ok";
  service: string;
  timestamp: string; // ISO 8601
}
