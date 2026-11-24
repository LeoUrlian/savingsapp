import {
  BadGatewayException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { GoalAdvice, GoalStats } from '@savings/shared';

/** Qualquer provedor com API no formato da OpenAI (Groq, OpenRouter, Gemini, Ollama...). */
const DEFAULT_BASE_URL = 'https://api.openai.com/v1';

const SYSTEM_PROMPT = [
  'Você é um assistente de organização financeira pessoal, em português do Brasil.',
  'Você recebe números de UMA meta de poupança e explica a situação em poucas frases.',
  'Use SOMENTE os números recebidos. Não invente valores, datas ou taxas.',
  'Não recomende investimentos, produtos financeiros nem prometa rendimento.',
  'Estrutura: 1) onde a meta está; 2) se o ritmo atual basta para a data-alvo;',
  '3) uma sugestão prática e curta. No máximo 120 palavras. Sem markdown.',
  'Os valores monetários já vêm formatados na moeda (ex.: R$ 1.000,00). Repita-os assim e nunca fale em centavos.',
  'Se prazo disser que está vencido, diga isso e sugira definir uma nova data-alvo.',
  'Não faça contas: use só os valores e o prazo prontos. Datas no formato dia/mês/ano.',
  'Dê sugestões, não ordens (nada de "faça agora").',
  'Se precisaGuardarPorMes for igual ao valor que falta, o prazo é menor que 1 mês: não chame isso de ritmo mensal viável.',
].join(' ');

const money = (cents: number, currency: string) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(
    cents / 100,
  );

/** Data no formato dia/mês/ano, no fuso de Brasília. */
const date = (iso: string) =>
  new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo' }).format(
    new Date(iso),
  );

/** Prazo por extenso, para o modelo não precisar contar dias. */
function describeDeadline(days: number): string {
  if (days < 0) return `vencido há ${-days} dia(s)`;
  if (days === 0) return 'vence hoje';
  if (days <= 31) return `${days} dia(s)`;
  return `${days} dias (cerca de ${Math.round(days / 30.44)} meses)`;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  /**
   * Pede ao modelo uma análise em texto. Só os NÚMEROS saem do servidor: nome
   * da meta, ids e datas dos aportes não são enviados.
   */
  async adviseOnGoal(stats: GoalStats): Promise<GoalAdvice> {
    const apiKey = process.env.OPENAI_API_KEY;
    const model = process.env.AI_MODEL;
    if (!apiKey || !model) {
      throw new ServiceUnavailableException(
        'IA não configurada: defina OPENAI_API_KEY e AI_MODEL no .env',
      );
    }

    const m = (cents: number) => money(cents, stats.currency);
    const facts = {
      valorAlvo: m(stats.targetAmountCents),
      guardado: m(stats.savedAmountCents),
      faltaGuardar: m(
        Math.max(0, stats.targetAmountCents - stats.savedAmountCents),
      ),
      progressoPorcento: stats.progressPct,
      quantidadeDeAportes: stats.depositCount,
      ritmoMensalAtual: m(stats.monthlyPaceCents),
      dataPrevistaNoRitmoAtual: stats.projectedDate
        ? date(stats.projectedDate)
        : null,
      precisaGuardarPorMes:
        stats.requiredMonthlyCents === undefined
          ? null
          : m(stats.requiredMonthlyCents),
      prazo:
        stats.daysToTarget === undefined
          ? null
          : describeDeadline(stats.daysToTarget),
      metaAtingida: stats.reached,
      noPrazo: stats.onTrack ?? null,
      aportesPorMes: stats.monthly
        .slice(-12)
        .map((x) => ({ mes: x.month, valor: m(x.amountCents) })),
    };

    let res: Response;
    try {
      const baseUrl = (process.env.AI_BASE_URL || DEFAULT_BASE_URL).replace(
        /\/+$/,
        '',
      );
      res = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: JSON.stringify(facts) },
          ],
        }),
        signal: AbortSignal.timeout(30_000),
      });
    } catch (err) {
      this.logger.warn(`Falha ao chamar a IA: ${String(err)}`);
      throw new BadGatewayException('Serviço de IA indisponível');
    }

    if (!res.ok) {
      // O motivo vai só para o log do servidor (curto, só mensagem e código),
      // nunca para o front: pode citar detalhes da conta.
      const detail = await res
        .json()
        .then((b: { error?: { message?: string; code?: string } }) =>
          `${b.error?.code ?? ''} ${b.error?.message ?? ''}`
            .trim()
            .slice(0, 200),
        )
        .catch(() => '');
      this.logger.warn(`IA respondeu HTTP ${res.status} ${detail}`.trim());
      throw new BadGatewayException(
        `Serviço de IA recusou (HTTP ${res.status})`,
      );
    }

    const body = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = body.choices?.[0]?.message?.content?.trim();
    if (!text) throw new BadGatewayException('A IA não devolveu texto');

    return { text, model };
  }
}
