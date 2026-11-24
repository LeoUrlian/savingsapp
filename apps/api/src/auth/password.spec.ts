import { hashPassword, verifyPassword } from './password.js';
import { LoginThrottle } from './login-throttle.js';

describe('password', () => {
  it('aceita a senha certa e recusa a errada', async () => {
    const hash = await hashPassword('minha-senha-123');

    expect(await verifyPassword('minha-senha-123', hash)).toBe(true);
    expect(await verifyPassword('outra-senha', hash)).toBe(false);
  });

  it('não guarda a senha em texto e usa sal (mesma senha, hashes diferentes)', async () => {
    const a = await hashPassword('minha-senha-123');
    const b = await hashPassword('minha-senha-123');

    expect(a).not.toContain('minha-senha-123');
    expect(a).not.toBe(b);
  });

  it('hash em formato inválido é recusado sem lançar erro', async () => {
    expect(await verifyPassword('x', 'lixo')).toBe(false);
    expect(await verifyPassword('x', 'md5$a$b')).toBe(false);
  });
});

describe('LoginThrottle', () => {
  it('bloqueia depois de 5 falhas na janela', () => {
    const t = new LoginThrottle(5, 1000);
    for (let i = 0; i < 4; i++) t.recordFailure('k', 0);
    expect(t.isBlocked('k', 0)).toBe(false);

    t.recordFailure('k', 0);
    expect(t.isBlocked('k', 0)).toBe(true);
  });

  it('libera quando a janela passa', () => {
    const t = new LoginThrottle(2, 1000);
    t.recordFailure('k', 0);
    t.recordFailure('k', 0);

    expect(t.isBlocked('k', 999)).toBe(true);
    expect(t.isBlocked('k', 1001)).toBe(false);
  });

  it('cada chave tem a sua contagem, e reset zera', () => {
    const t = new LoginThrottle(1, 1000);
    t.recordFailure('a', 0);

    expect(t.isBlocked('a', 0)).toBe(true);
    expect(t.isBlocked('b', 0)).toBe(false);
    t.reset('a');
    expect(t.isBlocked('a', 0)).toBe(false);
  });
});
