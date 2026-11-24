import {
  BadGatewayException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { GoalStats } from '@savings/shared';
import { AiService } from './ai.service.js';

const STATS: GoalStats = {
  goalId: 'segredo-id',
  currency: 'BRL',
  targetAmountCents: 100_000,
  savedAmountCents: 40_000,
  progressPct: 40,
  depositCount: 2,
  monthlyPaceCents: 20_000,
  history: [{ date: '2026-10-01T12:00:00.000Z', cumulativeCents: 40_000 }],
  monthly: [{ month: '2026-10', amountCents: 40_000 }],
  projectedDate: '2027-01-10T12:00:00.000Z',
  requiredMonthlyCents: 30_000,
  reached: false,
  onTrack: false,
};

describe('AiService', () => {
  let service: AiService;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    service = new AiService();
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(service['logger'], 'warn').mockImplementation(() => undefined);
    vi.stubEnv('OPENAI_API_KEY', 'sk-teste');
    vi.stubEnv('AI_MODEL', 'modelo-teste');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('sem chave ou modelo: 503 e não chama a rede', async () => {
    vi.stubEnv('OPENAI_API_KEY', '');

    await expect(service.adviseOnGoal(STATS)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('devolve o texto e o modelo', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [{ message: { content: '  Você está em 40%.  ' } }],
      }),
    });

    const advice = await service.adviseOnGoal(STATS);

    expect(advice).toEqual({
      text: 'Você está em 40%.',
      model: 'modelo-teste',
    });
  });

  it('envia só números: sem id da meta nem datas dos aportes', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ choices: [{ message: { content: 'ok' } }] }),
    });

    await service.adviseOnGoal(STATS);

    const [, init] = fetchMock.mock.calls[0];
    expect(init.body).not.toContain('segredo-id');
    expect(init.body).not.toContain('2026-10-01');
    expect(init.headers.Authorization).toBe('Bearer sk-teste');
    expect(JSON.parse(init.body).model).toBe('modelo-teste');
  });

  it('usa AI_BASE_URL quando definida e a OpenAI por padrão', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ choices: [{ message: { content: 'ok' } }] }),
    });

    await service.adviseOnGoal(STATS);
    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://api.openai.com/v1/chat/completions',
    );

    vi.stubEnv('AI_BASE_URL', 'https://api.groq.com/openai/v1/');
    await service.adviseOnGoal(STATS);
    expect(fetchMock.mock.calls[1][0]).toBe(
      'https://api.groq.com/openai/v1/chat/completions',
    );
  });

  /** Lê o JSON de fatos que foi enviado ao modelo. */
  async function sentFacts(stats: GoalStats) {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ choices: [{ message: { content: 'ok' } }] }),
    });
    await service.adviseOnGoal(stats);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    return JSON.parse(body.messages[1].content);
  }

  it('envia datas em dia/mês/ano e valores em reais', async () => {
    const facts = await sentFacts(STATS);

    expect(facts.dataPrevistaNoRitmoAtual).toBe('10/01/2027');
    expect(facts.valorAlvo).toMatch(/1\.000,00/);
    expect(facts.valorAlvo).toContain('R$');
    expect(JSON.stringify(facts)).not.toMatch(/\d{4}-\d{2}-\d{2}/);
  });

  it('descreve o prazo por extenso', async () => {
    expect((await sentFacts({ ...STATS, daysToTarget: 30 })).prazo).toBe(
      '30 dia(s)',
    );
  });

  it('prazo vencido e prazo longo', async () => {
    expect((await sentFacts({ ...STATS, daysToTarget: -12 })).prazo).toBe(
      'vencido há 12 dia(s)',
    );
    fetchMock.mockClear();
    expect((await sentFacts({ ...STATS, daysToTarget: 180 })).prazo).toBe(
      '180 dias (cerca de 6 meses)',
    );
  });

  it('sem data-alvo, prazo é nulo', async () => {
    expect((await sentFacts(STATS)).prazo).toBeNull();
  });
  it('HTTP de erro vira 502 sem vazar o corpo', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: 'chave sk-teste inválida' }),
    });

    const err = await service.adviseOnGoal(STATS).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(BadGatewayException);
    expect(String((err as Error).message)).not.toContain('sk-teste');
  });

  it('falha de rede vira 502', async () => {
    fetchMock.mockRejectedValue(new Error('timeout'));

    await expect(service.adviseOnGoal(STATS)).rejects.toBeInstanceOf(
      BadGatewayException,
    );
  });

  it('resposta sem texto vira 502', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ choices: [] }),
    });

    await expect(service.adviseOnGoal(STATS)).rejects.toBeInstanceOf(
      BadGatewayException,
    );
  });
});
