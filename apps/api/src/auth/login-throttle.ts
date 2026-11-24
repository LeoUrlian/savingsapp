/**
 * Limite simples de tentativas de login, em memória: no máximo `max` falhas
 * por chave dentro da janela. Zera ao reiniciar a API e não vale entre várias
 * instâncias; para produção com várias réplicas, trocar por um limite em
 * Redis ou no proxy.
 */
export class LoginThrottle {
  private readonly failures = new Map<string, number[]>();

  constructor(
    private readonly max = 5,
    private readonly windowMs = 15 * 60 * 1000,
  ) {}

  private recent(key: string, now: number): number[] {
    const list = (this.failures.get(key) ?? []).filter(
      (t) => now - t < this.windowMs,
    );
    if (list.length === 0) this.failures.delete(key);
    else this.failures.set(key, list);
    return list;
  }

  /** true se a chave já estourou o limite de falhas. */
  isBlocked(key: string, now = Date.now()): boolean {
    return this.recent(key, now).length >= this.max;
  }

  recordFailure(key: string, now = Date.now()): void {
    const list = this.recent(key, now);
    list.push(now);
    this.failures.set(key, list);
  }

  reset(key: string): void {
    this.failures.delete(key);
  }
}
