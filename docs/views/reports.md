# Relatórios V2 - Métricas, Inteligência e Fontes de Dados

Visão analítica proativa e estratégica das demandas do calendário. O foco evolui do controle reativo (o que está atrasado) para a inteligência de fluxo (como prever e evitar atrasos).

## Estrutura das Abas (Atualizada)

| Aba | Descrição | Foco Analítico |
|-----|-----------|----------------|
| **Geral / Dashboard** | KPIs preditivos, Vazão (Throughput), CFD (Cumulative Flow Diagram) | Visão executiva e saúde do sistema |
| **Fluxo e Processos** | Lead Time vs Cycle Time, Scatter Plot de Entregas | Gargalos ocultos e eficiência de fluxo |
| **Timeline** | Entregas por mês, previsibilidade vs capacidade real | Planejamento e vazão futura |
| **Membros** | Grid de cards por membro (capacity, steps ativos, atalho calendário), Capacidade cruzada (Heatmap), WIP (Work in Progress) | Qualidade da alocação e sobrecarga silenciosa |
| **Alertas Preditivos** | Risco por histórico, tarefas estagnadas, bloqueios crônicos | Ação preventiva antes do atraso |

---

## 1. Novas Métricas (Eficiência de Fluxo)

Substituímos o foco exclusivo em "médias" por métricas estatísticas mais robustas para lidar com *outliers* e gargalos sistêmicos.

| Métrica | Cálculo / Lógica | O que revela |
|---------|------------------|--------------|
| **Lead Time** | `completedAt - createdAt` (Dias corridos) | O tempo total de espera do ponto de vista do cliente. |
| **Cycle Time** | `(completedAt - startedAt) - tempoEmFila/Bloqueio` | O tempo real de trabalho da equipe na demanda. |
| **Percentil 85 (P85)** | O valor de tempo onde 85% das tarefas são concluídas. Ordenar durações e pegar o valor na posição 85%. | A previsibilidade real do time. (Ex: "85% das tasks de Dev levam até 9 dias"). |
| **Idade do Bloqueio** | `Σ (unblockedAt - blockedAt)` acumulado na task | O custo financeiro/tempo que dependências externas geram. |
| **Taxa de Retrabalho** | Count de transições de status/steps que retrocedem (Ex: `Review -> In Progress`) | Qualidade da entrega e clareza do escopo inicial. |

---

## 2. Gráficos - Revelando o Invisível

### A. Cumulative Flow Diagram (CFD)
* **Fonte de Dados:** Snapshot diário da contagem de tasks por status/step.
* **Visualização:** Áreas empilhadas ao longo do tempo (Eixo X = Data, Eixo Y = Quantidade de Tasks).
* **Interpretação:**
    * Faixas que "engordam" indicam acúmulo e formação de gargalo (ex: muitas tasks aguardando aprovação).
    * Faixas paralelas indicam um fluxo contínuo e saudável.

### B. Scatter Plot de Tempo de Ciclo (Cycle Time Scatter Plot)
* **Fonte de Dados:** `tasks` concluídas.
* **Visualização:** Eixo X = Data de conclusão; Eixo Y = Duração em dias. Linhas de tendência para a Média e o Percentil 85.
* **Interpretação:** Identifica anomalias (*outliers*). Pontos muito acima do P85 são tasks que deram muito errado e merecem investigação qualitativa (post-mortem).

### C. Gráfico de Throughput (Vazão Histórica)
* **Fonte de Dados:** `tasks` concluídas filtradas por período.
* **Visualização:** Gráfico de barras simples (Tasks concluídas por semana/mês).
* **Interpretação:** Se a vazão média é de 20 tasks/semana, mas a *Timeline* prevê 40 entregas para a próxima semana, o atraso já é garantido matematicamente.

### D. Heatmap de Risco vs. Capacidade
* **Fonte de Dados:** `members` x `tasks.steps` x `Lead Time` histórico.
* **Visualização:** Matriz (Membros no Eixo Y, Tipos de Step no Eixo X). Cores de verde a vermelho baseadas no tempo médio que cada membro leva para cada tipo de task.
* **Interpretação:** Identifica se um membro está aparentemente livre, mas alocado em uma atividade onde historicamente tem baixa performance (gargalo de senioridade).

---

## 3. Alertas Preditivos (Machine Learning Simples / Heurística)

| Tipo de Alerta | Lógica (Condição de Disparo) | Mensagem / Ação Sugerida |
|----------------|------------------------------|--------------------------|
| **Prazo Irrealista** | Prazo estipulado (`step.end - step.start`) < Histórico do Percentil 85 para esse tipo de step. | *"Atenção: Historicamente este step leva X dias. O prazo de Y dias tem alto risco desde a criação."* |
| **Estagnação (Task Esquecida)** | Task não atrasada, mas `hoje - lastUpdatedAt > limite_aceitavel` (ex: 4 dias sem interações). | *"Demanda sem movimentação há X dias. Verifique se há impedimentos não relatados."* |
| **Alerta de WIP (Work in Progress)** | Membro possui mais de 3 steps `In Progress` **iniciados no mesmo período** (dias sobrepostos). | *"Context Switching excessivo: Membro com múltiplas frentes simultâneas ativas."* |
| **Bloqueio Crônico** | `status.blocked === true` por mais de X dias corridos. | *"Bloqueio prolongado impactando Lead Time geral. Necessita escalação."* |

---

## 4. Atualizações Necessárias no Banco de Dados (Supabase)

Para viabilizar as métricas acima, o schema atual precisa registrar o histórico de eventos, e não apenas o "estado atual".

### Novos Campos e Tabelas

1. **Na tabela `tasks` / `steps`:**
   - `createdAt` (Timestamp exato da criação)
   - `completedAt` (Timestamp da conclusão final)
   - `estimatedEffort` vs `actualEffort` (Opcional, em horas ou pontos)

2. **Nova tabela `task_events` (Logs de transição para calcular tempos em fila):**
   - `id` (UUID)
   - `taskId` (Referência)
   - `eventType` (ENUM: `STATUS_CHANGE`, `BLOCKED`, `UNBLOCKED`, `STEP_STARTED`, `STEP_COMPLETED`)
   - `fromState` (ex: 'To Do')
   - `toState` (ex: 'In Progress')
   - `timestamp` (Data e hora do evento)
   - `userId` (Quem moveu)

---

## 5. Funções Utilitárias Expandidas (`utils.ts`)

| Função | Descrição |
|--------|-----------|
| `calculatePercentile(array, percentile)` | Ordena um array de tempos e retorna o valor no percentil desejado (ex: 85). |
| `getLeadTime(task, events)` | Retorna dias totais cruzando a criação e o último evento de conclusão. |
| `getCycleTime(task, events)` | Subtrai do Lead Time todo o tempo em que a task esteve nos estados "Aguardando" ou "Bloqueado". |
| `isTaskStagnant(task, daysThreshold)` | Compara o `lastUpdatedAt` com o `hoje` pulando finais de semana. |