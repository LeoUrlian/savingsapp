import { BadGatewayException } from '@nestjs/common';
import { CurrencyService } from './currency.service.js';

const HOUR = 60 * 60 * 1000;

function okResponse(rates: Record<string, number>, date = '2026-11-16') {
  return { ok: true, status: 200, json: async () => ({ date, rates }) };
}

describe('CurrencyService', () => {
  let service: CurrencyService;
  let fetchMock: ReturnType<typeof vi.fn>;
  let now: number;

  beforeEach(() => {
    service = new CurrencyService();
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    now = 1_000_000;
    vi.spyOn(Date, 'now').mockImplementation(() => now);
    // O serviço registra um aviso quando a fonte falha; silencia nos testes.
    vi.spyOn(service['logger'], 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('devolve as cotações com a moeda base valendo 1', async () => {
    fetchMock.mockResolvedValue(okResponse({ USD: 0.17, EUR: 0.16 }));

    const result = await service.getRates('BRL');

    expect(result).toEqual({
      base: 'BRL',
      date: '2026-11-16',
      rates: { BRL: 1, USD: 0.17, EUR: 0.16 },
    });
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain('base=BRL');
    expect(url).toContain('symbols=USD,EUR');
  });

  it('usa o cache dentro de 1 hora (uma só chamada à fonte)', async () => {
    fetchMock.mockResolvedValue(okResponse({ USD: 0.17, EUR: 0.16 }));

    await service.getRates('BRL');
    now += HOUR - 1;
    await service.getRates('BRL');

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('busca de novo depois que o cache vence', async () => {
    fetchMock.mockResolvedValue(okResponse({ USD: 0.17, EUR: 0.16 }));

    await service.getRates('BRL');
    now += HOUR + 1;
    await service.getRates('BRL');

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('guarda cache separado por moeda base', async () => {
    fetchMock
      .mockResolvedValueOnce(okResponse({ BRL: 5.7, EUR: 0.9 }))
      .mockResolvedValueOnce(okResponse({ USD: 0.17, EUR: 0.16 }));

    await service.getRates('USD');
    await service.getRates('BRL');

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('se a fonte cair, devolve a última cotação guardada', async () => {
    fetchMock.mockResolvedValueOnce(okResponse({ USD: 0.17, EUR: 0.16 }));
    const first = await service.getRates('BRL');

    now += HOUR + 1;
    fetchMock.mockRejectedValueOnce(new Error('rede caiu'));
    const second = await service.getRates('BRL');

    expect(second).toEqual(first);
  });

  it('se a fonte cair e não há cache, lança 502', async () => {
    fetchMock.mockRejectedValue(new Error('rede caiu'));

    await expect(service.getRates('BRL')).rejects.toBeInstanceOf(
      BadGatewayException,
    );
  });

  it('trata resposta HTTP de erro como falha', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({}),
    });

    await expect(service.getRates('BRL')).rejects.toBeInstanceOf(
      BadGatewayException,
    );
  });

  it('trata cotação faltando na resposta como falha', async () => {
    fetchMock.mockResolvedValue(okResponse({ USD: 0.17 }));

    await expect(service.getRates('BRL')).rejects.toBeInstanceOf(
      BadGatewayException,
    );
  });
});
