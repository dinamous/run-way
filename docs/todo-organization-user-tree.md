Especificação Funcional - Nexus Org (MVP)

1. Visão Geral do Produto

O Nexus Org é uma aplicação front-end de página única (SPA) desenhada para gerenciar e visualizar a estrutura organizacional (Organograma) e a alocação de pessoas em projetos/clientes.

A interface foca em elegância, utilizando um design clean (inspirado no Shadcn UI), com feedback visual claro, modo de leitura/gestão e suporte a RBAC (Role-Based Access Control) simulado.

2. Personas e Regras de Acesso (RBAC)

O sistema possui um seletor de "Persona" no cabeçalho que altera dinamicamente o estado global da aplicação (isAdmin).

2.1. Administrador (Admin)

Acesso: Total (Global).

Organograma (Diagrama/Lista): Vê a árvore corporativa inteira a partir do nó raiz (CEO).

Projetos: Vê todos os projetos e clientes.

Ações Permitidas: * Pode ver botões de edição, exclusão e adição de nós na árvore.

Pode criar novos projetos.

Tem acesso ao Modal de "Gerenciar Alocação", onde pode adicionar ou remover pessoas de qualquer projeto.

2.2. Colaborador Comum (Ex: Dev, Designer)

Acesso: Restrito ao escopo de atuação.

Organograma (Diagrama/Lista): O sistema busca recursivamente o "Time" (nó do tipo team) ao qual o usuário pertence. O diagrama/lista renderiza apenas essa sub-árvore, deixando claro que ele está visualizando "A hierarquia completa do seu time".

Projetos: Visualiza apenas os projetos onde seu ID consta na lista de members. Não visualiza projetos de terceiros.

Ações Permitidas:

Modo puramente de visualização (Read-only).

Todos os botões de ação (editar, deletar, alocar) ficam ocultos.

3. Estrutura de Dados (Estado)

3.1. Árvore Organizacional (initialData)

Estrutura recursiva (N-ary tree).

Campos: id, type ('person' | 'team'), name, role, department, avatar (URL), children (Array of nodes).

3.2. Projetos (projects)

Array de objetos independentes da árvore, referenciando as pessoas por ID.

Campos: id, name, client, members (Array of Strings correspondentes aos IDs das pessoas na árvore).

4. Visualizações (View Modes)

A aplicação alterna entre 3 modos de visualização geridos pelo estado viewMode:

Diagrama (Tree): * Renderização recursiva em blocos horizontais simulando um organograma clássico.

Utiliza CSS nativo (com pseudo-elementos ::before e ::after) injetado via <style> para desenhar linhas conectoras perfeitas que escalam com N filhos.

Suporta controles de Zoom in/out (altera o transform: scale()).

Lista (List):

Tabela em formato Accordion infinito.

Utiliza paddings incrementais (level * 2) para indentar filhos, facilitando a visualização de empresas com centenas de funcionários, com otimização de espaço para mobile.

Projetos (Grid):

Visualização em Cards (Kanban-style).

Mostra o nome do Projeto, Cliente em formato de Tag/Badge, e a lista de membros alocados.

Multi-alocação: Uma pessoa pode estar no Projeto A e no Projeto B simultaneamente.

5. Componentes e Interações Core

Modal de Alocação (Admin): Um modal overlay que divide a tela em duas colunas. A coluna esquerda mostra os "Membros Atuais" (com botão de remoção rápida). A coluna direita mostra pessoas "Disponíveis" com um campo de Busca Dinâmica (filtra por nome ou cargo), excluindo automaticamente quem já está alocado.

Card/Node de Organograma: Exibe Avatar, Nome, Cargo e Badge do departamento. O design muda sutilmente (cores de borda e backgrounds) para diferenciar nós do tipo person de nós do tipo team.

Collapsible Nodes: Em ambas as visões (Árvore e Lista), nós com filhos possuem um botão de Chevron para expandir/recolher seus subordinados, controlados por um estado local isExpanded.

6. Stack Técnica e Identidade Visual

Framework: React (Functional Components + Hooks).

Estilização: Tailwind CSS.

Paleta Principal: Zinc (tons neutros profundos para textos e bordas) e Violet (cor de destaque primária para ações e times).

Efeitos Visuais: Uso extensivo de backdrop-blur (Glassmorphism), sombras suaves (shadow-sm, shadow-md otimizadas), bordas semi-transparentes (border-zinc-200/80) e backgrounds em gradiente radial.

Ícones: Lucide React (Consistência com Shadcn UI).

Scrollbars: Scrollbars customizadas inseridas via CSS para garantir elegância nos dropdowns e listas internas.