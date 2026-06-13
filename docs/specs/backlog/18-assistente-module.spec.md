# 18 — Módulo Assistente

**Depende de:** 05, 07
**Entrega:** endpoint de auxílio de IA para refinamento de descrições

---

## Objetivo

Integração com a API da Anthropic para refinar, clarificar e complementar
descrições já escritas pelo usuário. O usuário escreve — o assistente aprimora.
Nunca gera do zero. A API key nunca sai do servidor.

---

## DTOs já existem em `shared/src/dtos/assistente/`

Criados na task 01. Implementar agora:

```typescript
// AssistenteDescricaoAuxiliarDto.ts
textoOriginal: string          @IsString @IsNotEmpty @MinLength(10)
tipoEntidade: 'execucao' | 'atividade' | 'demanda'  @IsIn([...])
contextoEntidade: string       @IsString @IsNotEmpty
// contextoEntidade = nome da atividade/demanda para dar contexto ao modelo

// AssistenteDescricaoAuxiliadaDto.ts
textoOriginal: string
textoAuxiliado: string
```

---

## Arquivos a Implementar

```
backend/src/modules/assistente/
  assistente.module.ts
  controllers/
    assistente.controller.ts
  services/
    assistente.service.ts
```

---

## Service — `assistente.service.ts`

```typescript
async auxiliarDescricao(
  dto: AssistenteDescricaoAuxiliarDto,
): Promise<StandardResponse<AssistenteDescricaoAuxiliadaDto>>
```

**Implementação:**

```typescript
async auxiliarDescricao(dto: AssistenteDescricaoAuxiliarDto) {
  const configuracao = this.configService.obter().anthropic;

  const tipoEntidadeFormatado = {
    execucao: 'execução de trabalho',
    atividade: 'atividade de desenvolvimento',
    demanda: 'demanda de projeto',
  }[dto.tipoEntidade];

  const prompt = `Você é um assistente que ajuda desenvolvedores a escrever 
descrições técnicas mais claras e completas. 

Contexto: o usuário está descrevendo uma ${tipoEntidadeFormatado} 
chamada "${dto.contextoEntidade}".

Texto original do usuário:
${dto.textoOriginal}

Refine, clarifique e complemente esse texto mantendo a voz e intenção original do usuário. 
Corrija erros gramaticais, melhore a clareza técnica e adicione detalhes relevantes 
quando faltarem. Responda apenas com o texto refinado, sem explicações adicionais.`;

  const resposta = await this.clienteAnthropic.messages.create({
    model:      configuracao.modelo,
    max_tokens: configuracao.maximoTokens,
    messages:   [{ role: 'user', content: prompt }],
  });

  const textoAuxiliado = resposta.content
    .filter((bloco) => bloco.type === 'text')
    .map((bloco) => bloco.text)
    .join('');

  return {
    sucesso: true,
    dados: { textoOriginal: dto.textoOriginal, textoAuxiliado },
    mensagem: 'Descrição auxiliada com sucesso',
  };
}
```

O `clienteAnthropic` é instanciado no construtor usando `@anthropic-ai/sdk`:

```typescript
import Anthropic from '@anthropic-ai/sdk';

constructor(private readonly configService: ConfigService) {
  this.clienteAnthropic = new Anthropic({
    apiKey: configService.obter().anthropic.apiKey,
  });
}
```

**Tratamento de erros da API Anthropic:**
- Capturar qualquer erro da chamada e lançar `BusinessException('Serviço de IA temporariamente indisponível')`

---

## Controller — `assistente.controller.ts`

```
POST /api/v1/assistente/auxiliar-descricao → auxiliarDescricao
```

Qualquer usuário autenticado pode usar o assistente.

---

## NÃO implementar nesta task

- Chat com histórico de mensagens
- Streaming de resposta
- Limite de uso por usuário
- Outras funcionalidades de IA além do auxílio de descrição
