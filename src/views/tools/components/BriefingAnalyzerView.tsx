import { useState } from 'react'
import { ChevronRight, Copy, CheckCircle2, Circle, HelpCircle, ShieldAlert, FileText, Zap, Monitor, Code2, Image, Film, DollarSign } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/Tooltip'
import { cn } from '@/lib/utils'

interface BriefingAnalyzerViewProps {
  onBack: () => void
}

interface ChecklistItem {
  id: string
  label: string
  tip: string
}

interface AlertItem {
  id: string
  type: 'destructive' | 'warning'
  text: string
}

interface ChecklistResults {
  [key: string]: boolean
}

interface Metrics {
  clarity: number
  seoRisk: number
  contentReady: number
}

interface Meta {
  solicitor: string
  deadline: string
  deadlineMissing: boolean
  urgency: string
}

interface AnalysisResult {
  output: string
  checklist: ChecklistResults
  metrics: Metrics
  meta: Meta
  alerts: AlertItem[]
  hasCritical: boolean
}

// ─── Escopos disponíveis ───────────────────────────────────────────────────

type ScopeId = 'webdev' | 'uiux' | 'midias' | 'audiovisual' | 'financeiro'

interface ScopeOption {
  id: ScopeId
  label: string
  icon: React.ReactNode
  checklist: ChecklistItem[]
  analyze: (text: string) => AnalysisResult | null
}

// ─── Web Development ──────────────────────────────────────────────────────

const CHECKLIST_WEBDEV: ChecklistItem[] = [
  { id: 'url_source', label: 'Link de Origem', tip: 'Onde o projeto vive hoje. Vital para comparar mudanças e planejar redirecionamentos.' },
  { id: 'url_target', label: 'URL de Destino', tip: 'Endereço final onde a LP será publicada (ex: superlógica.com/nova-lp).' },
  { id: 'repo', label: 'Repositório Git', tip: 'Qual repositório receberá o código? Com múltiplos repos no time, isso evita trabalho no lugar errado.' },
  { id: 'environment', label: 'Ambiente de Publicação', tip: 'Onde será hospedado? (Vercel, Netlify, cPanel, servidor específico). Cada ambiente tem um processo de deploy diferente.' },
  { id: 'stack', label: 'Tecnologia', tip: 'Plataforma de execução (WordPress, React, HubSpot). Define quem do time atuará.' },
  { id: 'tracking', label: 'Plano de Dados', tip: 'GTM e Pixel. Sem isso, não sabemos se o investimento em marketing deu retorno.' },
  { id: 'seo', label: 'Transição SEO', tip: 'Redirecionamento 301. Impede que o Google dê erro "404" ao tentar acessar links antigos.' },
  { id: 'form_crm', label: 'Formulário / CRM', tip: 'Qual formulário usar e para qual fila/pipeline do CRM os leads devem ir? Sem isso o lead some no limbo.' },
  { id: 'copy', label: 'Copy/Texto', tip: 'O texto final da página. Sem copy pronto, o design fica "cego".' },
  { id: 'assets', label: 'Assets/Arquivos', tip: 'Imagens, logos e referências em pastas do Drive ou Wrike.' },
  { id: 'deadline', label: 'Prazo de Entrega', tip: 'Data de go-live esperada. Sem prazo claro o time não consegue priorizar corretamente.' },
  { id: 'persona', label: 'Público-alvo', tip: 'Para quem é essa página? (segmento, persona, nível técnico). O designer precisa saber isso para tomar decisões visuais.' },
  { id: 'cta', label: 'CTA Principal', tip: 'O que o usuário deve fazer na página? (preencher form, baixar, comprar, agendar). Define hierarquia visual e o foco do design.' },
  { id: 'brand', label: 'Identidade Visual', tip: 'Qual marca/produto e qual brandbook usar? Masterbrand ou submarca? O designer não pode começar sem essa definição.' },
  { id: 'device', label: 'Prioridade de Dispositivo', tip: 'Mobile-first ou desktop? Afeta toda a estrutura do layout no Figma.' },
  { id: 'figma_deadline', label: 'Prazo do Figma', tip: 'Data que o Figma precisa estar pronto para o dev iniciar. Deve ser anterior ao go-live com margem para implementação.' },
]

function analyzeWebDev(text: string): AnalysisResult | null {
  if (!text || text.trim().length < 10) return null

  const t = text.toLowerCase()
  const alerts: AlertItem[] = []
  const results: ChecklistResults = Object.fromEntries(CHECKLIST_WEBDEV.map(c => [c.id, false]))

  const urlRegex = /(https?:\/\/[^\s\xa0]+)/gi
  const urls = text.match(urlRegex) || []
  const isMigration = /migração|transição|incorporação|mudar|de para/.test(t)
  const isNew = /criação|nova lp|novo projeto|construir/.test(t)

  const filtered = urls.filter(u => !u.includes('wrike') && !u.includes('drive') && !u.includes('google'))
  const currentLink = isMigration ? (filtered[0] || null) : null
  const targetLink = isMigration ? (filtered[1] || null) : (filtered[0] || null)

  if (currentLink) results.url_source = true
  if (targetLink || t.includes('superlógica.com')) results.url_target = true

  const foundAssets = urls.filter(u => u.includes('wrike') || u.includes('drive') || u.includes('google'))
  if (foundAssets.length > 0) results.assets = true

  const copyReady = t.includes('copy pronto') || t.includes('conteúdo pronto') || t.includes('docs.google.com')
  if (copyReady) results.copy = true

  const repoMatch =
    text.match(/(?:github\.com|gitlab\.com|bitbucket\.org)\/[^\s\xa0/]+\/([^\s\xa0/]+)/i) ||
    text.match(/repo(?:sitório|sitory)?[:\s]+([^\s\n\r,]+)/i) ||
    text.match(/reposit[oó]rio[:\s]+([^\n\r]+)/i)
  const repoName = repoMatch ? repoMatch[1].replace(/\.git$/, '') : null
  if (repoName) results.repo = true

  let envName: string | null = null
  if (t.includes('vercel')) { envName = 'Vercel'; results.environment = true }
  else if (t.includes('netlify')) { envName = 'Netlify'; results.environment = true }
  else if (t.includes('cpanel') || t.includes('c-panel')) { envName = 'cPanel'; results.environment = true }
  else if (t.includes('github pages') || t.includes('gh-pages')) { envName = 'GitHub Pages'; results.environment = true }
  else if (t.includes('aws') || t.includes('s3') || t.includes('cloudfront')) { envName = 'AWS'; results.environment = true }
  else if (t.includes('servidor') || t.includes('server') || t.includes('vps')) { envName = 'Servidor (VPS)'; results.environment = true }

  let stackName = 'Não especificada'
  if (t.includes('wordpress')) { stackName = 'WordPress'; results.stack = true }
  else if (t.includes('hubspot')) { stackName = 'HubSpot'; results.stack = true }
  else if (t.includes('react') || t.includes('next')) { stackName = 'React Ecosystem'; results.stack = true }

  if (t.includes('gtm') || t.includes('tag manager') || t.includes('pixel')) results.tracking = true
  if (t.includes('seo') || t.includes('301') || t.includes('redirecionamento')) results.seo = true

  const crmKeywords = ['rd station', 'rdstation', 'salesforce', 'pipedrive', 'hubspot crm', 'ploomes', 'formulário', 'formulario', 'form ', 'crm']
  if (crmKeywords.some(k => t.includes(k))) results.form_crm = true

  let crmName: string | null = null
  if (t.includes('rd station') || t.includes('rdstation')) crmName = 'RD Station'
  else if (t.includes('salesforce')) crmName = 'Salesforce'
  else if (t.includes('pipedrive')) crmName = 'Pipedrive'
  else if (t.includes('ploomes')) crmName = 'Ploomes'
  else if (t.includes('hubspot crm') || (t.includes('hubspot') && t.includes('crm'))) crmName = 'HubSpot CRM'
  else if (results.form_crm) crmName = 'CRM (não especificado)'

  const solicitorMatch = text.match(/Solicitante:\s*([^\n\r]+)/i)
  const contactMatch = text.match(/(?:contato|dúvidas|falar com|responsável técnico)[:\s]+([^\n\r,]+)/i)
  const deadlineMatch = text.match(/(\d{1,2}\s*(?:\/|-)\s*\d{1,2}\s*(?:\/|-)\s*\d{2,4}|\d{1,2}\s*de\s*(?:janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)(?:\s*de\s*\d{4})?)/gi)

  const solicitor = solicitorMatch ? solicitorMatch[1].trim() : null
  const contactPerson = contactMatch ? contactMatch[1].trim() : null
  const deadline = deadlineMatch ? deadlineMatch[deadlineMatch.length - 1] : null
  if (deadline) results.deadline = true
  const urgency = /urgente|asap|imediato/.test(t) ? 'Alta' : 'Normal'

  const figmaMatch = text.match(/figma\.com\/[^\s\xa0]+/gi)
  const figmaLink = figmaMatch ? figmaMatch[0] : null

  const refSiteMatch = text.match(/(?:referência|inspiração|baseado em|igual a|como o site|similar a)[^\n\r]*?(https?:\/\/[^\s\xa0]+)/gi)
  const refSites = refSiteMatch || []

  const sectionKeywords = [
    ['hero', 'banner', 'topo'], ['formulário', 'form', 'captação'], ['depoimentos', 'testimonials', 'cases'],
    ['faq', 'perguntas frequentes'], ['preços', 'pricing', 'planos'], ['sobre', 'quem somos'],
    ['cta', 'chamada para ação'], ['vídeo', 'video'], ['parceiros', 'clientes', 'logos'],
  ]
  const detectedSections = sectionKeywords
    .filter(group => group.some(k => t.includes(k)))
    .map(group => group[0])

  const branchMatch =
    text.match(/(?:branch|branch de trabalho|partir de|base)[:\s]+([\w\-/.]+)/i) ||
    text.match(/(feature\/[\w-]+|hotfix\/[\w-]+|develop|staging|main|master)/i)
  const branchName = branchMatch ? branchMatch[1].trim() : null

  const lpNameMatch =
    text.match(/(?:lp|landing page|página|projeto)[:\s]+(?:d[aeo]\s+)?([^\n\r,.]{3,40})/i) ||
    text.match(/^([^\n\r]{5,50})/)
  const lpName = lpNameMatch ? lpNameMatch[1].trim() : null

  const outOfScopeMatch = text.match(/(?:fora do escopo|não inclui|não contempla|sem |excluindo)[^\n\r]*/gi)
  const outOfScope = outOfScopeMatch || []

  const personaMatch = text.match(/(?:público[- ]alvo|persona|segmento|para\s+(?:empresas|clientes|leads|usuários|profissionais|gestores|times|equipes)|b2b|b2c|pme|smb|enterprise)[^\n\r]*/gi)
  const personaDesc = personaMatch ? personaMatch[0].replace(/^(público[- ]alvo|persona|segmento)[:\s]*/i, '').trim() : null
  if (personaDesc) results.persona = true

  const ctaMatch = text.match(/(?:cta|call to action|chamada para ação|objetivo[:\s]+[^\n\r]+|o usuário deve|converter|preencher|baixar|comprar|assinar|agendar|falar com|solicitar)[^\n\r]*/gi)
  const ctaDesc = ctaMatch ? ctaMatch[0].trim() : null
  if (ctaDesc) results.cta = true

  const brandMatch = text.match(/(?:masterbrand|submarca|brandbook|identidade visual|marca[:\s]+[^\n\r]+|produto[:\s]+[^\n\r]+|vertical[:\s]+[^\n\r]+)[^\n\r]*/gi)
  const brandDesc = brandMatch ? brandMatch[0].trim() : null
  if (brandDesc) results.brand = true

  let devicePriority: string | null = null
  if (/mobile[- ]first|prioridade mobile|responsivo/.test(t)) { devicePriority = 'Mobile-first'; results.device = true }
  else if (/desktop[- ]first|prioridade desktop/.test(t)) { devicePriority = 'Desktop-first'; results.device = true }
  else if (/mobile|celular|smartphone/.test(t)) { devicePriority = 'Mobile (mencionado)'; results.device = true }

  const hasAnimations = /animação|animaçoes|motion|parallax|hover|interação|lottie|gsap|framer/.test(t)
  const animDesc = hasAnimations ? 'Sim — mencionado no briefing' : null
  const hasDesignSystem = /design system|biblioteca de componentes|componentes existentes|ds\./.test(t)

  const figmaDeadlineMatch = text.match(/(?:figma pronto|protótipo até|design até|layout até|tela pronta)[^\n\r]*/gi)
  const figmaDeadline = figmaDeadlineMatch ? figmaDeadlineMatch[0].trim() : null
  if (figmaDeadline) results.figma_deadline = true

  let score = 0
  if (results.url_source) score += 8
  if (results.url_target) score += 8
  if (results.repo) score += 8
  if (results.environment) score += 6
  if (results.stack) score += 6
  if (results.tracking) score += 6
  if (results.seo) score += 6
  if (results.form_crm) score += 6
  if (results.copy) score += 8
  if (results.assets) score += 4
  if (results.deadline) score += 4
  if (results.persona) score += 8
  if (results.cta) score += 8
  if (results.brand) score += 6
  if (results.device) score += 4
  if (results.figma_deadline) score += 4

  const seoRisk = isMigration && !results.seo ? 90 : isMigration ? 20 : 0
  const contentReady = copyReady ? 100 : t.includes('copy') ? 50 : 0

  if (isMigration && !currentLink) alerts.push({ id: 'ORIGEM', type: 'destructive', text: 'URL atual não detectada. Risco de perda de histórico SEO.' })
  if (!targetLink && !t.includes('superlógica.com')) alerts.push({ id: 'DESTINO', type: 'warning', text: 'URL desejada não informada para o novo ativo.' })
  if (!results.repo) alerts.push({ id: 'REPO', type: 'warning', text: 'Repositório não identificado. Com múltiplos repos no time, isso pode gerar trabalho no lugar errado.' })
  if (!results.environment) alerts.push({ id: 'AMBIENTE', type: 'warning', text: 'Ambiente de publicação não informado (Vercel, Netlify, cPanel...).' })
  if (!results.deadline) alerts.push({ id: 'PRAZO', type: 'warning', text: 'Nenhuma data de entrega mencionada. O time não consegue priorizar sem prazo.' })
  if (!results.persona) alerts.push({ id: 'PERSONA', type: 'warning', text: 'Público-alvo não informado. O designer não sabe para quem está desenhando.' })
  if (!results.cta) alerts.push({ id: 'CTA', type: 'warning', text: 'CTA principal não identificado. Sem saber o objetivo, o designer não sabe o que destacar.' })
  if (!results.brand) alerts.push({ id: 'MARCA', type: 'warning', text: 'Identidade visual/marca não especificada. Masterbrand? Submarca? Brandbook?' })

  const depsDesigner: string[] = []
  if (!results.persona) depsDesigner.push('[Designer] Público-alvo / persona definido pelo solicitante')
  if (!results.cta) depsDesigner.push('[Designer] CTA principal e objetivo de conversão confirmados')
  if (!results.brand) depsDesigner.push('[Designer] Identidade visual / brandbook definido (masterbrand ou submarca?)')
  if (!copyReady) depsDesigner.push('[Designer] Copy/texto final entregue — o Figma deve refletir o texto real')
  if (!results.assets) depsDesigner.push('[Designer] Assets existentes mapeados (logos, fotos, ícones disponíveis)')

  const depsDev: string[] = []
  if (!figmaLink) depsDev.push('[Dev] Figma aprovado e linkado no briefing')
  if (!copyReady) depsDev.push('[Dev] Copy/texto final aprovado pelo marketing')
  if (!results.url_target && !targetLink) depsDev.push('[Dev] URL de destino definida e domínio apontado')
  if (!results.repo) depsDev.push('[Dev] Repositório confirmado pelo time técnico')
  if (!results.environment) depsDev.push('[Dev] Ambiente de publicação definido')
  if (!results.form_crm) depsDev.push('[Dev] Formulário e pipeline de destino no CRM definidos')
  if (!results.tracking) depsDev.push('[Dev] IDs dos pixels e container GTM confirmados')
  if (isMigration && !results.seo) depsDev.push('[Dev] Mapeamento de redirects 301 entregue pelo solicitante')

  const deps = [...depsDesigner, ...depsDev]
  const depsBlock = deps.length > 0 ? deps.map(d => `- [ ] ${d}`).join('\n') : '- Nenhuma dependência bloqueante identificada.'
  const sectionsBlock = detectedSections.length > 0
    ? detectedSections.map(s => `- ${s.charAt(0).toUpperCase() + s.slice(1)}`).join('\n')
    : '- Nenhuma seção específica mencionada no briefing.'
  const outOfScopeBlock = outOfScope.length > 0
    ? outOfScope.map(s => `- ${s.trim()}`).join('\n')
    : '- Não especificado. Confirmar com o solicitante o que NÃO está incluso.'

  const objetivoMatch = text.match(/(?:objetivo|meta|motivo|por que|porque|finalidade|propósito)[:\s]+([^\n\r]+)/i)
  const objetivoDesc = objetivoMatch ? objetivoMatch[1].trim() : null

  const actionKeywords: string[] = []
  if (/atualiz|mudar|alterar|trocar|substituir/.test(t)) actionKeywords.push('Atualização de conteúdo/estrutura')
  if (/criar|nova|novo|construir|desenvolver/.test(t)) actionKeywords.push('Criação de nova página')
  if (/migrar|migração|mover|transferir/.test(t)) actionKeywords.push('Migração de ativo existente')
  if (/integrar|conectar|plugar|integração/.test(t)) actionKeywords.push('Integração com sistema externo')
  if (/otimizar|melhorar|performance|velocidade/.test(t)) actionKeywords.push('Otimização de performance')
  if (/redesign|reestilizar|visual novo|novo layout/.test(t)) actionKeywords.push('Redesign visual')
  if (/seo|posicionamento|google|orgânico/.test(t)) actionKeywords.push('Trabalho de SEO envolvido')
  if (/a\/b|teste|experimento/.test(t)) actionKeywords.push('Teste A/B previsto')

  const pagesMatch = text.match(/(\d+)\s*(?:páginas?|lps?|landing pages?|telas?)/i)
  const pageCount = pagesMatch ? pagesMatch[1] : null

  const productMatch = text.match(/(?:produto|vertical|solução|serviço)[:\s]+([^\n\r,]{3,40})/i)
  const productName = productMatch ? productMatch[1].trim() : null

  const actionsBlock = actionKeywords.length > 0
    ? actionKeywords.map(a => `  - ${a}`).join('\n')
    : '  - Não foi possível inferir automaticamente — revisar descrição abaixo'

  const demandType = isMigration ? 'MIGRAÇÃO DE ATIVO' : isNew ? 'CRIAÇÃO DE LANDING PAGE' : 'ATUALIZAÇÃO DE LANDING PAGE'
  const descLines = text.split(/\n/).map(l => l.trim()).filter(l => l.length > 15 && !/^(solicitante|prazo|urgente|repositório|url|http|\[|-\s\[|\*|━)/i.test(l))
  const rawDesc = descLines.slice(0, 3).join('\n')

  const stackLimits = stackName !== 'Não especificada'
    ? stackName === 'WordPress'
      ? 'WordPress — evitar animações pesadas, preferir estrutura de blocos'
      : stackName === 'HubSpot'
        ? 'HubSpot — design limitado aos módulos da plataforma'
        : 'Confirmar com dev quais animações/interações a stack suporta'
    : 'PENDENTE — stack afeta o que o designer pode propor'

  const output = `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ESCOPO TÉCNICO — ${demandType}${lpName ? ': ' + lpName.toUpperCase() : ''}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[1] IDENTIFICAÇÃO
━━━━━━━━━━━━━━━━━
- Solicitante:           ${solicitor || 'PENDENTE'}
- Contato p/ dúvidas:    ${contactPerson || 'PENDENTE — quem o dev chama se travar?'}
- Prazo de go-live:      ${deadline || 'PENDENTE — sem prazo o time não consegue priorizar'}
- Urgência:              ${urgency}

[2] O QUE PRECISA SER FEITO
━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Tipo de demanda:       ${demandType}
- Produto/Vertical:      ${productName || (lpName ? lpName : 'Não especificado')}
- Quantidade de ativos:  ${pageCount ? pageCount + ' página(s)/ativo(s)' : '1 ativo (não especificado explicitamente)'}
- Objetivo declarado:    ${objetivoDesc || 'Não explicitado — pedir ao solicitante qual a meta de negócio desta entrega'}

Ações inferidas do briefing:
${actionsBlock}

Contexto/Descrição original do solicitante:
"${rawDesc || 'Nenhuma descrição clara identificada no briefing.'}"

[3] BRIEFING PARA O DESIGNER (FIGMA)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Público-alvo:          ${personaDesc || 'PENDENTE — para quem é essa página? (segmento, persona, nível técnico)'}
- CTA principal:         ${ctaDesc || 'PENDENTE — o que o usuário deve fazer? (preencher form, baixar, comprar, agendar)'}
- Identidade visual:     ${brandDesc || 'PENDENTE — masterbrand ou submarca? qual brandbook usar?'}
- Prioridade de layout:  ${devicePriority || 'PENDENTE — mobile-first ou desktop? definir antes de iniciar o Figma'}
- Animações/interações:  ${animDesc || 'Não mencionado — confirmar se há motion design previsto'}
- Design system:         ${hasDesignSystem ? 'Sim — componentes existentes mencionados. Verificar biblioteca antes de criar novos.' : 'Não mencionado — confirmar se deve usar DS existente ou criar do zero'}
- Prazo p/ entrega do Figma: ${figmaDeadline || 'PENDENTE — deve ser definido com margem para o dev implementar antes do go-live'}

Seções identificadas:
${sectionsBlock}

Referências visuais:
- Figma existente:       ${figmaLink ? 'https://' + figmaLink : 'Nenhum link detectado'}
${refSites.length > 0 ? refSites.map(r => '- ' + r).join('\n') : '- Sites de referência: Nenhum mencionado — pedir ao solicitante'}

[4] INFRAESTRUTURA E DEPLOY (DEV)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- URL de origem:         ${currentLink || (isMigration ? 'PENDENTE — migração sem URL de origem é bloqueante' : 'N/A (criação do zero)')}
- URL de destino:        ${targetLink || 'PENDENTE — informar endereço final da página'}
- Repositório Git:       ${repoName || 'PENDENTE — confirmar qual repo do time receberá este projeto'}
- Branch de trabalho:    ${branchName || 'PENDENTE — de qual branch partir? (ex: feature/nome-lp)'}
- Ambiente de publicação:${envName || 'PENDENTE — Vercel? Netlify? cPanel? Servidor?'}
- Stack tecnológica:     ${stackName}
- Limitações p/ o design:${stackLimits}
- Redirects 301 (SEO):   ${isMigration ? (results.seo ? 'OK — mapeado no briefing' : 'PENDENTE — CRÍTICO: sem redirect 301 a URL antiga vai retornar 404 e o site perde ranking no Google') : 'N/A'}

[5] DADOS, TRACKING E INTEGRAÇÕES (DEV)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- GTM / Pixels:          ${results.tracking ? 'Mencionado no briefing — confirmar IDs e se usa container Master ou novo' : 'PENDENTE — definir container GTM e IDs dos pixels (Facebook, Google Ads...)'}
- CRM:                   ${crmName ? crmName + ' — confirmar pipeline/fila exata de destino dos leads' : 'PENDENTE — para qual CRM e qual fila/pipeline os leads devem ir?'}
- Formulário:            ${results.form_crm ? 'Mencionado — confirmar ID do formulário ou template a usar' : 'PENDENTE — usar formulário nativo, embed ou custom?'}

[6] CONTEÚDO E ASSETS
━━━━━━━━━━━━━━━━━━━━━
- Status do copy:        ${copyReady ? 'OK — conteúdo disponível nos anexos' : 'PENDENTE — designer e dev precisam do texto final'}
- Imagens / Logos:       ${foundAssets.length > 0 ? 'Links detectados: ' + foundAssets.join(', ') : 'PENDENTE — onde estão os arquivos? (Drive, Wrike, Figma)'}

[7] DEPENDÊNCIAS POR RESPONSÁVEL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${depsBlock}

[8] FORA DO ESCOPO
━━━━━━━━━━━━━━━━━
${outOfScopeBlock}

[9] CRITÉRIOS DE ACEITAÇÃO (HOMOLOGAÇÃO)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Designer:
- [ ] Figma aprovado pelo solicitante antes do dev iniciar
- [ ] Versões mobile e desktop desenhadas
- [ ] Assets exportados em formato correto (SVG, WebP, PNG@2x)
- [ ] Textos no Figma são os textos reais (não lorem ipsum)

Dev:
- [ ] URL de destino respondendo sem erros de SSL
${isMigration ? '- [ ] Redirect 301 da URL antiga testado (verificar no browser e no Search Console)\n' : ''}- [ ] Formulário enviando lead para a fila correta no CRM
- [ ] Disparo de tags verificado no GTM Preview
- [ ] Responsividade testada em iOS e Android
- [ ] Deploy no ambiente correto (${envName || 'a confirmar'}) validado pelo solicitante
- [ ] Lighthouse Score > 90 em mobile`.trim()

  return {
    output,
    checklist: results,
    metrics: { clarity: score, seoRisk, contentReady },
    meta: {
      solicitor: solicitor || '---',
      deadline: deadline || 'A definir',
      deadlineMissing: !deadline,
      urgency,
    },
    alerts,
    hasCritical: alerts.some(a => a.type === 'destructive'),
  }
}

// ─── UI/UX ────────────────────────────────────────────────────────────────

const CHECKLIST_UIUX: ChecklistItem[] = [
  { id: 'objective', label: 'Objetivo do projeto', tip: 'Qual problema de experiência precisa ser resolvido? Sem isso o designer fica sem norte.' },
  { id: 'persona', label: 'Público-alvo / Persona', tip: 'Para quem se está desenhando? Segmento, nível técnico, contexto de uso.' },
  { id: 'flows', label: 'Fluxos a cobrir', tip: 'Quais telas ou jornadas precisam ser desenhadas? (ex: onboarding, checkout, dashboard).' },
  { id: 'brand', label: 'Identidade visual / DS', tip: 'Qual design system ou brandbook seguir? Existe biblioteca de componentes?' },
  { id: 'device', label: 'Plataforma / Dispositivo', tip: 'Web, mobile nativo, tablet? A estrutura de grade muda completamente.' },
  { id: 'deadline_figma', label: 'Prazo do Figma', tip: 'Data de entrega do protótipo para validação ou handoff para dev.' },
  { id: 'stakeholders', label: 'Aprovadores / Stakeholders', tip: 'Quem valida o design antes do handoff? Sem saber isso, o designer não sabe com quem alinhar.' },
  { id: 'research', label: 'Pesquisa / Dados existentes', tip: 'Há entrevistas, mapas de calor, NPS ou dados analíticos que embasam este redesign?' },
  { id: 'constraints', label: 'Restrições técnicas', tip: 'A dev já impôs alguma limitação de stack que afeta o design? (ex: sem animações, bibliotecas específicas).' },
  { id: 'assets', label: 'Assets disponíveis', tip: 'Logos, fotos, ícones — onde estão? O designer precisa saber antes de começar.' },
]

function analyzeUiUx(text: string): AnalysisResult | null {
  if (!text || text.trim().length < 10) return null
  const t = text.toLowerCase()
  const alerts: AlertItem[] = []
  const results: ChecklistResults = Object.fromEntries(CHECKLIST_UIUX.map(c => [c.id, false]))

  const urlRegex = /(https?:\/\/[^\s\xa0]+)/gi
  const urls = text.match(urlRegex) || []

  if (/objetivo|problema|melhorar|redesign|experiência|ux|jornada/.test(t)) results.objective = true
  if (/persona|público[- ]alvo|usuário|segmento|b2b|b2c/.test(t)) results.persona = true
  if (/fluxo|tela|jornada|onboarding|checkout|cadastro|dashboard/.test(t)) results.flows = true
  if (/brandbook|design system|ds\b|identidade visual|marca/.test(t)) results.brand = true
  if (/mobile|web|tablet|ios|android|desktop/.test(t)) results.device = true
  if (/stakeholder|aprovação|responsável|dono do produto|po\b|product owner/.test(t)) results.stakeholders = true
  if (/pesquisa|heatmap|mapa de calor|nps|entrevista|analytics|dados|métricas/.test(t)) results.research = true
  if (/restrição|limitação|stack|framework|biblioteca|sem animação/.test(t)) results.constraints = true

  const foundAssets = urls.filter(u => u.includes('drive') || u.includes('figma') || u.includes('wrike'))
  if (foundAssets.length > 0) results.assets = true

  const deadlineMatch = text.match(/(\d{1,2}\s*(?:\/|-)\s*\d{1,2}\s*(?:\/|-)\s*\d{2,4}|\d{1,2}\s*de\s*(?:janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)(?:\s*de\s*\d{4})?)/gi)
  const deadline = deadlineMatch ? deadlineMatch[deadlineMatch.length - 1] : null
  if (deadline) results.deadline_figma = true

  const solicitorMatch = text.match(/Solicitante:\s*([^\n\r]+)/i)
  const solicitor = solicitorMatch ? solicitorMatch[1].trim() : null
  const urgency = /urgente|asap|imediato/.test(t) ? 'Alta' : 'Normal'

  const figmaMatch = text.match(/figma\.com\/[^\s\xa0]+/gi)
  const figmaLink = figmaMatch ? figmaMatch[0] : null

  let score = 0
  if (results.objective) score += 20
  if (results.persona) score += 15
  if (results.flows) score += 15
  if (results.brand) score += 15
  if (results.device) score += 10
  if (results.deadline_figma) score += 10
  if (results.stakeholders) score += 5
  if (results.research) score += 5
  if (results.constraints) score += 3
  if (results.assets) score += 2

  if (!results.objective) alerts.push({ id: 'OBJETIVO', type: 'destructive', text: 'Objetivo do projeto não definido. O designer não sabe que problema está resolvendo.' })
  if (!results.persona) alerts.push({ id: 'PERSONA', type: 'warning', text: 'Público-alvo não informado. Decisões visuais ficam sem base.' })
  if (!results.flows) alerts.push({ id: 'FLUXOS', type: 'warning', text: 'Fluxos ou telas não especificados. Escopo do Figma indefinido.' })
  if (!results.brand) alerts.push({ id: 'MARCA', type: 'warning', text: 'Identidade visual / design system não mencionado.' })
  if (!results.deadline_figma) alerts.push({ id: 'PRAZO', type: 'warning', text: 'Prazo de entrega do Figma não informado.' })

  const deps: string[] = []
  if (!results.objective) deps.push('- [ ] Objetivo claro definido pelo solicitante/PO')
  if (!results.persona) deps.push('- [ ] Persona ou perfil de usuário entregue')
  if (!results.flows) deps.push('- [ ] Lista de fluxos/telas a cobrir aprovada')
  if (!figmaLink) deps.push('- [ ] Referências ou protótipo existente compartilhado')
  if (!results.brand) deps.push('- [ ] Design system ou brandbook acessível no Figma')
  if (!results.research) deps.push('- [ ] Dados de pesquisa/analytics compartilhados (se houver)')

  const depsBlock = deps.length > 0 ? deps.join('\n') : '- Nenhuma dependência bloqueante identificada.'

  const projectMatch = text.match(/(?:projeto|produto|feature|funcionalidade)[:\s]+([^\n\r,]{3,40})/i)
  const projectName = projectMatch ? projectMatch[1].trim() : null

  const output = `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ESCOPO — UI/UX${projectName ? ': ' + projectName.toUpperCase() : ''}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[1] IDENTIFICAÇÃO
━━━━━━━━━━━━━━━━━
- Solicitante:    ${solicitor || 'PENDENTE'}
- Prazo:          ${deadline || 'PENDENTE'}
- Urgência:       ${urgency}

[2] OBJETIVO E CONTEXTO
━━━━━━━━━━━━━━━━━━━━━━━
- Objetivo:       ${results.objective ? 'Mencionado no briefing' : 'PENDENTE — qual problema de UX precisa ser resolvido?'}
- Público-alvo:   ${results.persona ? 'Mencionado' : 'PENDENTE — persona, segmento, nível técnico'}
- Plataforma:     ${results.device ? 'Mencionada' : 'PENDENTE — web, mobile iOS/Android, tablet?'}
- Pesquisa/dados: ${results.research ? 'Dados mencionados — verificar acesso' : 'Não mencionado — há analytics, NPS ou entrevistas que embasem este trabalho?'}

[3] ESCOPO DO FIGMA
━━━━━━━━━━━━━━━━━━━
- Fluxos/telas:   ${results.flows ? 'Mencionados — listar e validar com PO' : 'PENDENTE — quais telas e jornadas precisam ser desenhadas?'}
- Design system:  ${results.brand ? 'Mencionado — verificar biblioteca no Figma' : 'PENDENTE — usar DS existente ou criar do zero?'}
- Restrições dev: ${results.constraints ? 'Mencionadas — revisar antes de iniciar' : 'Não informadas — alinhar com dev o que é viável'}
- Figma existente:${figmaLink ? 'https://' + figmaLink : 'Nenhum link detectado'}
- Prazo entrega:  ${deadline || 'PENDENTE'}

[4] ASSETS E RECURSOS
━━━━━━━━━━━━━━━━━━━━━
- Assets:         ${foundAssets.length > 0 ? 'Links detectados: ' + foundAssets.join(', ') : 'PENDENTE — logos, fotos, ícones onde estão?'}

[5] DEPENDÊNCIAS
━━━━━━━━━━━━━━━━
${depsBlock}

[6] CRITÉRIOS DE ACEITAÇÃO
━━━━━━━━━━━━━━━━━━━━━━━━━━
- [ ] Objetivo de UX validado com PO/stakeholder antes de iniciar
- [ ] Fluxos cobertos: mobile + desktop (se aplicável)
- [ ] Protótipo aprovado antes do handoff para dev
- [ ] Componentes documentados com estados (hover, erro, loading)
- [ ] Acessibilidade mínima verificada (contraste, tamanhos de toque)
- [ ] Assets exportados em formato correto (SVG, PNG@2x, WebP)`.trim()

  return {
    output,
    checklist: results,
    metrics: { clarity: score, seoRisk: 0, contentReady: results.assets ? 80 : 20 },
    meta: { solicitor: solicitor || '---', deadline: deadline || 'A definir', deadlineMissing: !deadline, urgency },
    alerts,
    hasCritical: alerts.some(a => a.type === 'destructive'),
  }
}

// ─── Mídias / Marketing ──────────────────────────────────────────────────

const CHECKLIST_MIDIAS: ChecklistItem[] = [
  { id: 'format', label: 'Formatos solicitados', tip: 'Feed, Stories, banner, e-mail, OOH? Cada formato tem dimensão e peso diferentes.' },
  { id: 'brand', label: 'Identidade visual', tip: 'Brandbook, cores, tipografia. Sem isso o designer não consegue começar.' },
  { id: 'copy', label: 'Copy / Texto das peças', tip: 'Título, CTA, disclaimer. O texto final deve chegar antes do design começar.' },
  { id: 'assets', label: 'Assets / Imagens', tip: 'Fotos, logos, ícones em alta resolução. Localização no Drive ou Wrike.' },
  { id: 'channels', label: 'Canais de veiculação', tip: 'Onde as peças serão publicadas? (Instagram, LinkedIn, Google Ads, email...). Define especificações técnicas.' },
  { id: 'persona', label: 'Público-alvo', tip: 'Para quem é essa campanha? Segmento e persona informam tom e apelo visual.' },
  { id: 'objective', label: 'Objetivo da campanha', tip: 'Awareness, geração de leads, promoção? Define hierarquia visual e CTA.' },
  { id: 'deadline', label: 'Prazo de entrega', tip: 'Data que as peças precisam estar prontas para aprovação e veiculação.' },
  { id: 'approval', label: 'Responsável pela aprovação', tip: 'Quem aprova antes de ir ao ar? Sem isso a peça pode ficar presa.' },
]

function analyzeMidias(text: string): AnalysisResult | null {
  if (!text || text.trim().length < 10) return null
  const t = text.toLowerCase()
  const alerts: AlertItem[] = []
  const results: ChecklistResults = Object.fromEntries(CHECKLIST_MIDIAS.map(c => [c.id, false]))

  const urlRegex = /(https?:\/\/[^\s\xa0]+)/gi
  const urls = text.match(urlRegex) || []

  if (/feed|stories|banner|e-mail|email|ooh|out of home|display|carrossel|reels|post/.test(t)) results.format = true
  if (/brandbook|identidade visual|marca|guia de estilo|paleta|tipografia/.test(t)) results.brand = true
  if (/copy|texto|título|headline|cta|chamada|tagline|caption|legenda/.test(t)) results.copy = true
  if (/instagram|linkedin|facebook|twitter|google ads|youtube|tiktok|email|e-mail/.test(t)) results.channels = true
  if (/persona|público[- ]alvo|segmento|audiência/.test(t)) results.persona = true
  if (/objetivo|meta|awareness|lead|venda|promoção|campanha/.test(t)) results.objective = true
  if (/aprovação|aprovador|responsável|stakeholder/.test(t)) results.approval = true

  const foundAssets = urls.filter(u => u.includes('drive') || u.includes('wrike') || u.includes('figma') || u.includes('dropbox'))
  if (foundAssets.length > 0) results.assets = true

  const deadlineMatch = text.match(/(\d{1,2}\s*(?:\/|-)\s*\d{1,2}\s*(?:\/|-)\s*\d{2,4}|\d{1,2}\s*de\s*(?:janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)(?:\s*de\s*\d{4})?)/gi)
  const deadline = deadlineMatch ? deadlineMatch[deadlineMatch.length - 1] : null
  if (deadline) results.deadline = true

  const solicitorMatch = text.match(/Solicitante:\s*([^\n\r]+)/i)
  const solicitor = solicitorMatch ? solicitorMatch[1].trim() : null
  const urgency = /urgente|asap|imediato/.test(t) ? 'Alta' : 'Normal'

  let score = 0
  if (results.format) score += 20
  if (results.brand) score += 20
  if (results.copy) score += 15
  if (results.assets) score += 10
  if (results.channels) score += 10
  if (results.persona) score += 10
  if (results.objective) score += 10
  if (results.deadline) score += 3
  if (results.approval) score += 2

  if (!results.format) alerts.push({ id: 'FORMATOS', type: 'destructive', text: 'Formatos não especificados. O designer não sabe quais dimensões produzir.' })
  if (!results.brand) alerts.push({ id: 'MARCA', type: 'destructive', text: 'Identidade visual não informada. Sem brandbook o designer não pode começar.' })
  if (!results.copy) alerts.push({ id: 'COPY', type: 'warning', text: 'Texto das peças não fornecido. Design sem copy é design sem mensagem.' })
  if (!results.channels) alerts.push({ id: 'CANAIS', type: 'warning', text: 'Canais de veiculação não informados. Especificações técnicas variam por canal.' })
  if (!results.deadline) alerts.push({ id: 'PRAZO', type: 'warning', text: 'Prazo de entrega não mencionado.' })

  const deps: string[] = []
  if (!results.brand) deps.push('- [ ] Brandbook/guia de identidade visual compartilhado')
  if (!results.copy) deps.push('- [ ] Texto final de todas as peças entregue pelo marketing/redação')
  if (!results.assets) deps.push('- [ ] Assets de alta resolução (logos, fotos) disponibilizados')
  if (!results.format) deps.push('- [ ] Lista de formatos e dimensões confirmada')
  if (!results.approval) deps.push('- [ ] Responsável pela aprovação das peças identificado')

  const depsBlock = deps.length > 0 ? deps.join('\n') : '- Nenhuma dependência bloqueante identificada.'

  const campaignMatch = text.match(/(?:campanha|projeto|ação)[:\s]+([^\n\r,]{3,40})/i)
  const campaignName = campaignMatch ? campaignMatch[1].trim() : null

  const output = `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ESCOPO — MÍDIAS / MARKETING${campaignName ? ': ' + campaignName.toUpperCase() : ''}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[1] IDENTIFICAÇÃO
━━━━━━━━━━━━━━━━━
- Solicitante:    ${solicitor || 'PENDENTE'}
- Prazo:          ${deadline || 'PENDENTE'}
- Urgência:       ${urgency}

[2] OBJETIVO E AUDIÊNCIA
━━━━━━━━━━━━━━━━━━━━━━━━
- Objetivo:       ${results.objective ? 'Mencionado no briefing' : 'PENDENTE — awareness, lead, venda, promoção?'}
- Público-alvo:   ${results.persona ? 'Mencionado' : 'PENDENTE — segmento, persona, audiência'}
- Canais:         ${results.channels ? 'Mencionados no briefing' : 'PENDENTE — Instagram, LinkedIn, Google Ads, email...?'}

[3] CONTEÚDO E ASSETS
━━━━━━━━━━━━━━━━━━━━━
- Formatos:       ${results.format ? 'Mencionados — listar e confirmar dimensões' : 'PENDENTE — feed, stories, banner, e-mail, OOH?'}
- Identidade:     ${results.brand ? 'Brandbook/guia mencionado' : 'PENDENTE — brandbook ou guia de identidade visual'}
- Copy:           ${results.copy ? 'Texto mencionado — confirmar versão final' : 'PENDENTE — texto final de todas as peças'}
- Assets:         ${foundAssets.length > 0 ? 'Links detectados: ' + foundAssets.join(', ') : 'PENDENTE — fotos, logos em alta resolução'}

[4] APROVAÇÃO
━━━━━━━━━━━━━
- Responsável:    ${results.approval ? 'Mencionado no briefing' : 'PENDENTE — quem aprova antes de ir ao ar?'}

[5] DEPENDÊNCIAS
━━━━━━━━━━━━━━━━
${depsBlock}

[6] CRITÉRIOS DE ACEITAÇÃO
━━━━━━━━━━━━━━━━━━━━━━━━━━
- [ ] Todas as dimensões/formatos solicitados entregues
- [ ] Identidade visual respeitada (cores, tipografia, logotipo)
- [ ] Texto final aplicado (sem placeholder ou lorem ipsum)
- [ ] Arquivos exportados nos formatos corretos (JPG, PNG, PDF, MP4)
- [ ] Aprovação registrada antes do envio para veiculação`.trim()

  return {
    output,
    checklist: results,
    metrics: { clarity: score, seoRisk: 0, contentReady: results.copy && results.assets ? 100 : results.copy ? 50 : 0 },
    meta: { solicitor: solicitor || '---', deadline: deadline || 'A definir', deadlineMissing: !deadline, urgency },
    alerts,
    hasCritical: alerts.some(a => a.type === 'destructive'),
  }
}

// ─── Audiovisual ─────────────────────────────────────────────────────────

const CHECKLIST_AV: ChecklistItem[] = [
  { id: 'format', label: 'Formato / Tipo de entrega', tip: 'Vídeo, motion, podcast, foto, live? Duração e proporção esperadas.' },
  { id: 'objective', label: 'Objetivo da peça', tip: 'Institucional, campanha, tutorial, teaser, social? Define tom e abordagem.' },
  { id: 'script', label: 'Roteiro / Argumento', tip: 'O roteiro ou argumento já foi aprovado? Sem isso a produção não pode começar.' },
  { id: 'brand', label: 'Identidade visual / Vinheta', tip: 'Cores, logos animados, trilha, fontes — tudo que compõe a identidade audiovisual.' },
  { id: 'location', label: 'Locação / Estúdio', tip: 'Onde será gravado? Estúdio interno, locação externa, home office, animação?' },
  { id: 'cast', label: 'Elenco / Apresentador', tip: 'Quem aparece no vídeo? Funcionário, ator, personagem animado?' },
  { id: 'deadline', label: 'Prazo de entrega', tip: 'Data de entrega do corte final aprovado.' },
  { id: 'distribution', label: 'Canal de distribuição', tip: 'YouTube, Instagram, site, apresentação interna? Define formato de exportação.' },
  { id: 'approval', label: 'Responsável pela aprovação', tip: 'Quem aprova o corte final? Sem isso o projeto fica em loop de revisões.' },
]

function analyzeAudiovisual(text: string): AnalysisResult | null {
  if (!text || text.trim().length < 10) return null
  const t = text.toLowerCase()
  const alerts: AlertItem[] = []
  const results: ChecklistResults = Object.fromEntries(CHECKLIST_AV.map(c => [c.id, false]))

  const urlRegex = /(https?:\/\/[^\s\xa0]+)/gi
  const urls = text.match(urlRegex) || []

  if (/vídeo|video|motion|reels|curta|institucional|teaser|trailer|podcast|live|foto|fotografia|animação/.test(t)) results.format = true
  if (/objetivo|meta|campanha|institucional|tutorial|apresentação|social/.test(t)) results.objective = true
  if (/roteiro|script|argumento|narrativa|storyboard/.test(t)) results.script = true
  if (/brandbook|identidade|marca|vinheta|logo animado|trilha|jingle|fontes/.test(t)) results.brand = true
  if (/estúdio|locação|gravação|set|externas|internas|home office/.test(t)) results.location = true
  if (/elenco|ator|apresentador|narrador|personagem|cast/.test(t)) results.cast = true
  if (/youtube|instagram|site|portal|apresentação|interna|tv|tela/.test(t)) results.distribution = true
  if (/aprovação|aprovador|responsável/.test(t)) results.approval = true

  const deadlineMatch = text.match(/(\d{1,2}\s*(?:\/|-)\s*\d{1,2}\s*(?:\/|-)\s*\d{2,4}|\d{1,2}\s*de\s*(?:janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)(?:\s*de\s*\d{4})?)/gi)
  const deadline = deadlineMatch ? deadlineMatch[deadlineMatch.length - 1] : null
  if (deadline) results.deadline = true

  const solicitorMatch = text.match(/Solicitante:\s*([^\n\r]+)/i)
  const solicitor = solicitorMatch ? solicitorMatch[1].trim() : null
  const urgency = /urgente|asap|imediato/.test(t) ? 'Alta' : 'Normal'

  const foundAssets = urls.filter(u => u.includes('drive') || u.includes('dropbox') || u.includes('frame') || u.includes('vimeo'))

  let score = 0
  if (results.format) score += 20
  if (results.objective) score += 15
  if (results.script) score += 20
  if (results.brand) score += 10
  if (results.location) score += 10
  if (results.cast) score += 5
  if (results.deadline) score += 5
  if (results.distribution) score += 10
  if (results.approval) score += 5

  if (!results.script) alerts.push({ id: 'ROTEIRO', type: 'destructive', text: 'Roteiro não mencionado. Produção não pode iniciar sem argumento aprovado.' })
  if (!results.format) alerts.push({ id: 'FORMATO', type: 'destructive', text: 'Tipo e formato da entrega não especificados.' })
  if (!results.distribution) alerts.push({ id: 'CANAL', type: 'warning', text: 'Canal de distribuição não informado. Afeta formato e qualidade de exportação.' })
  if (!results.deadline) alerts.push({ id: 'PRAZO', type: 'warning', text: 'Prazo de entrega não mencionado.' })
  if (!results.approval) alerts.push({ id: 'APROVAÇÃO', type: 'warning', text: 'Responsável pela aprovação não identificado.' })

  const deps: string[] = []
  if (!results.script) deps.push('- [ ] Roteiro/argumento aprovado entregue')
  if (!results.brand) deps.push('- [ ] Identidade audiovisual definida (vinheta, trilha, paleta)')
  if (!results.cast) deps.push('- [ ] Elenco/apresentador definido e disponível')
  if (!results.location) deps.push('- [ ] Locação confirmada e agendada')
  if (!results.approval) deps.push('- [ ] Responsável pela aprovação do corte final identificado')

  const depsBlock = deps.length > 0 ? deps.join('\n') : '- Nenhuma dependência bloqueante identificada.'

  const projectMatch = text.match(/(?:projeto|vídeo|campanha|série)[:\s]+([^\n\r,]{3,40})/i)
  const projectName = projectMatch ? projectMatch[1].trim() : null

  const output = `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ESCOPO — AUDIOVISUAL${projectName ? ': ' + projectName.toUpperCase() : ''}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[1] IDENTIFICAÇÃO
━━━━━━━━━━━━━━━━━
- Solicitante:        ${solicitor || 'PENDENTE'}
- Prazo:              ${deadline || 'PENDENTE'}
- Urgência:           ${urgency}

[2] FORMATO E OBJETIVO
━━━━━━━━━━━━━━━━━━━━━━
- Tipo/formato:       ${results.format ? 'Mencionado no briefing' : 'PENDENTE — vídeo, motion, podcast, foto? Duração?'}
- Objetivo:           ${results.objective ? 'Mencionado' : 'PENDENTE — institucional, campanha, tutorial, social?'}
- Canal de distribuição: ${results.distribution ? 'Mencionado' : 'PENDENTE — YouTube, Instagram, apresentação, TV?'}

[3] PRÉ-PRODUÇÃO
━━━━━━━━━━━━━━━━
- Roteiro/argumento:  ${results.script ? 'Mencionado — confirmar aprovação' : 'PENDENTE — produção não inicia sem roteiro aprovado'}
- Identidade AV:      ${results.brand ? 'Mencionada' : 'PENDENTE — vinheta, trilha, paleta de cores?'}
- Elenco/apresentador:${results.cast ? 'Mencionado' : 'PENDENTE — quem aparece? ator, funcionário, animação?'}
- Locação:            ${results.location ? 'Mencionada' : 'PENDENTE — estúdio, locação externa, home office?'}

[4] ASSETS DE REFERÊNCIA
━━━━━━━━━━━━━━━━━━━━━━━━
${foundAssets.length > 0 ? foundAssets.map(a => '- ' + a).join('\n') : '- Nenhum link de referência detectado — confirmar onde estão os arquivos'}

[5] DEPENDÊNCIAS
━━━━━━━━━━━━━━━━
${depsBlock}

[6] CRITÉRIOS DE ACEITAÇÃO
━━━━━━━━━━━━━━━━━━━━━━━━━━
- [ ] Roteiro aprovado antes do início das gravações
- [ ] Corte bruto revisado pela produção
- [ ] Identidade audiovisual aplicada (vinheta, trilha, lower thirds)
- [ ] Revisão de áudio (níveis, sem ruído de fundo)
- [ ] Exportado nos formatos corretos para cada canal
- [ ] Aprovação final registrada antes da publicação`.trim()

  return {
    output,
    checklist: results,
    metrics: { clarity: score, seoRisk: 0, contentReady: results.script ? 60 : 10 },
    meta: { solicitor: solicitor || '---', deadline: deadline || 'A definir', deadlineMissing: !deadline, urgency },
    alerts,
    hasCritical: alerts.some(a => a.type === 'destructive'),
  }
}

// ─── Financeiro ──────────────────────────────────────────────────────────

const CHECKLIST_FIN: ChecklistItem[] = [
  { id: 'type', label: 'Tipo de demanda', tip: 'Relatório, aprovação de verba, NF, reembolso, contrato? Define quem precisa agir.' },
  { id: 'value', label: 'Valor / Verba', tip: 'Qual o valor envolvido? Necessário para priorização e alçada de aprovação.' },
  { id: 'costcenter', label: 'Centro de custo', tip: 'A qual CC ou projeto o custo deve ser imputado?' },
  { id: 'approver', label: 'Aprovadores necessários', tip: 'Quem precisa assinar/aprovar? Qual o fluxo de alçadas?' },
  { id: 'deadline', label: 'Prazo / Vencimento', tip: 'Data de vencimento, fechamento ou deadline de aprovação.' },
  { id: 'docs', label: 'Documentação', tip: 'NF, contrato, proposta, cotações — quais docs precisam ser anexados?' },
  { id: 'supplier', label: 'Fornecedor / Beneficiário', tip: 'Quem vai receber o pagamento ou assinar o contrato?' },
  { id: 'recurrence', label: 'Recorrência', tip: 'É único ou recorrente? Mensal, trimestral? Afeta o planejamento orçamentário.' },
]

function analyzeFinanceiro(text: string): AnalysisResult | null {
  if (!text || text.trim().length < 10) return null
  const t = text.toLowerCase()
  const alerts: AlertItem[] = []
  const results: ChecklistResults = Object.fromEntries(CHECKLIST_FIN.map(c => [c.id, false]))

  if (/relatório|aprovação|nota fiscal|nf|reembolso|contrato|pagamento|requisição|po\b|purchase order/.test(t)) results.type = true
  if (/r\$|reais|valor|verba|budget|orçamento|\d+[.,]\d{2}/.test(t)) results.value = true
  if (/cc\b|centro de custo|cost center|projeto|verba de/.test(t)) results.costcenter = true
  if (/aprovação|aprovador|alçada|assinar|autorização|gestor/.test(t)) results.approver = true
  if (/fornecedor|empresa|prestador|beneficiário|cnpj|cpf/.test(t)) results.supplier = true
  if (/recorrente|mensal|trimestral|anual|renovação|contínuo/.test(t)) results.recurrence = true

  const urlRegex = /(https?:\/\/[^\s\xa0]+)/gi
  const urls = text.match(urlRegex) || []
  const foundDocs = urls.filter(u => u.includes('drive') || u.includes('dropbox') || u.includes('docusign') || u.includes('clicksign'))
  if (foundDocs.length > 0 || /nota fiscal|nf\b|contrato|proposta|cotação/.test(t)) results.docs = true

  const deadlineMatch = text.match(/(\d{1,2}\s*(?:\/|-)\s*\d{1,2}\s*(?:\/|-)\s*\d{2,4}|\d{1,2}\s*de\s*(?:janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)(?:\s*de\s*\d{4})?)/gi)
  const deadline = deadlineMatch ? deadlineMatch[deadlineMatch.length - 1] : null
  if (deadline) results.deadline = true

  const solicitorMatch = text.match(/Solicitante:\s*([^\n\r]+)/i)
  const solicitor = solicitorMatch ? solicitorMatch[1].trim() : null
  const urgency = /urgente|asap|imediato|vencimento próximo|vence hoje/.test(t) ? 'Alta' : 'Normal'

  const valueMatch = text.match(/R\$\s*[\d.,]+/i)
  const valueStr = valueMatch ? valueMatch[0] : null

  let score = 0
  if (results.type) score += 20
  if (results.value) score += 20
  if (results.costcenter) score += 15
  if (results.approver) score += 15
  if (results.deadline) score += 10
  if (results.docs) score += 10
  if (results.supplier) score += 5
  if (results.recurrence) score += 5

  if (!results.value) alerts.push({ id: 'VALOR', type: 'destructive', text: 'Valor não informado. Sem ele não é possível definir alçada de aprovação.' })
  if (!results.approver) alerts.push({ id: 'APROVAÇÃO', type: 'destructive', text: 'Aprovadores não identificados. Fluxo de aprovação bloqueado.' })
  if (!results.costcenter) alerts.push({ id: 'CC', type: 'warning', text: 'Centro de custo não informado. O lançamento contábil ficará pendente.' })
  if (!results.deadline) alerts.push({ id: 'PRAZO', type: 'warning', text: 'Prazo/vencimento não informado. Risco de atraso de pagamento ou multa.' })
  if (!results.docs) alerts.push({ id: 'DOCS', type: 'warning', text: 'Documentação de suporte não mencionada (NF, contrato, proposta).' })

  const deps: string[] = []
  if (!results.value) deps.push('- [ ] Valor exato confirmado pelo solicitante')
  if (!results.costcenter) deps.push('- [ ] Centro de custo definido pelo gestor financeiro')
  if (!results.approver) deps.push('- [ ] Fluxo de aprovação e alçadas definidos')
  if (!results.docs) deps.push('- [ ] Documentação (NF, contrato, proposta) anexada')
  if (!results.supplier) deps.push('- [ ] Dados do fornecedor/beneficiário cadastrados (CNPJ, dados bancários)')

  const depsBlock = deps.length > 0 ? deps.join('\n') : '- Nenhuma dependência bloqueante identificada.'

  const output = `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ESCOPO — FINANCEIRO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[1] IDENTIFICAÇÃO
━━━━━━━━━━━━━━━━━
- Solicitante:        ${solicitor || 'PENDENTE'}
- Prazo/Vencimento:   ${deadline || 'PENDENTE'}
- Urgência:           ${urgency}

[2] DETALHES DA DEMANDA
━━━━━━━━━━━━━━━━━━━━━━━
- Tipo:               ${results.type ? 'Mencionado no briefing' : 'PENDENTE — relatório, NF, reembolso, contrato, aprovação de verba?'}
- Valor:              ${valueStr || (results.value ? 'Mencionado — confirmar exato' : 'PENDENTE — sem valor não há como definir alçada')}
- Centro de custo:    ${results.costcenter ? 'Mencionado' : 'PENDENTE — a qual CC ou projeto imputar?'}
- Fornecedor/beneficiário: ${results.supplier ? 'Mencionado' : 'PENDENTE — quem receberá o pagamento?'}
- Recorrência:        ${results.recurrence ? 'Mencionada — verificar renovação automática' : 'Não informada — único ou recorrente?'}

[3] APROVAÇÃO
━━━━━━━━━━━━━
- Aprovadores:        ${results.approver ? 'Mencionados no briefing' : 'PENDENTE — quem precisa assinar? qual o fluxo de alçadas?'}
- Documentação:       ${foundDocs.length > 0 ? 'Links detectados: ' + foundDocs.join(', ') : (results.docs ? 'Mencionada — confirmar anexo' : 'PENDENTE — NF, contrato, proposta, cotações')}

[4] DEPENDÊNCIAS
━━━━━━━━━━━━━━━━
${depsBlock}

[5] CRITÉRIOS DE ACEITAÇÃO
━━━━━━━━━━━━━━━━━━━━━━━━━━
- [ ] Valor confirmado e aprovado na alçada correta
- [ ] Centro de custo lançado corretamente
- [ ] Documentação de suporte anexada e auditável
- [ ] Fornecedor com dados cadastrais completos no sistema
- [ ] Pagamento/lançamento executado dentro do prazo
- [ ] Confirmação de recebimento ou execução registrada`.trim()

  return {
    output,
    checklist: results,
    metrics: { clarity: score, seoRisk: 0, contentReady: results.docs ? 80 : 20 },
    meta: { solicitor: solicitor || '---', deadline: deadline || 'A definir', deadlineMissing: !deadline, urgency },
    alerts,
    hasCritical: alerts.some(a => a.type === 'destructive'),
  }
}

// ─── Configuração de escopos ──────────────────────────────────────────────

const SCOPES: ScopeOption[] = [
  {
    id: 'webdev',
    label: 'Web Dev',
    icon: <Code2 className="size-3.5" />,
    checklist: CHECKLIST_WEBDEV,
    analyze: analyzeWebDev,
  },
  {
    id: 'uiux',
    label: 'UI/UX',
    icon: <Monitor className="size-3.5" />,
    checklist: CHECKLIST_UIUX,
    analyze: analyzeUiUx,
  },
  {
    id: 'midias',
    label: 'Mídias',
    icon: <Image className="size-3.5" />,
    checklist: CHECKLIST_MIDIAS,
    analyze: analyzeMidias,
  },
  {
    id: 'audiovisual',
    label: 'Audiovisual',
    icon: <Film className="size-3.5" />,
    checklist: CHECKLIST_AV,
    analyze: analyzeAudiovisual,
  },
  {
    id: 'financeiro',
    label: 'Financeiro',
    icon: <DollarSign className="size-3.5" />,
    checklist: CHECKLIST_FIN,
    analyze: analyzeFinanceiro,
  },
]

// ─── Sub-componentes ──────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
      {children}
    </p>
  )
}

function MetricRow({
  label,
  value,
  tip,
  barColor,
  valueColor,
}: {
  label: string
  value: number
  tip: string
  barColor: string
  valueColor: string
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          {label}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="size-3 cursor-default" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-48 text-xs">
                {tip}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </span>
        <span className={cn('text-xs font-semibold tabular-nums', valueColor)}>{value}%</span>
      </div>
      <div className="h-1 bg-muted rounded-full overflow-hidden">
        <div
          className={cn('h-full transition-all duration-700 rounded-full', barColor)}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  )
}

// ─── View principal ───────────────────────────────────────────────────────

export function BriefingAnalyzerView({ onBack }: BriefingAnalyzerViewProps) {
  const [input, setInput] = useState('')
  const [copied, setCopied] = useState(false)
  const [activeScope, setActiveScope] = useState<ScopeId>('webdev')

  const scope = SCOPES.find(s => s.id === activeScope)!
  const result = input.trim().length >= 10 ? scope.analyze(input) : null

  const handleCopy = () => {
    if (!result) return
    navigator.clipboard.writeText(result.output).catch(() => {
      const el = document.createElement('textarea')
      el.value = result.output
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    })
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const clarityColor = result
    ? result.metrics.clarity > 75
      ? 'bg-emerald-500'
      : result.metrics.clarity > 40
        ? 'bg-amber-500'
        : 'bg-destructive'
    : 'bg-destructive'

  const clarityValueColor = result
    ? result.metrics.clarity > 75
      ? 'text-emerald-600'
      : result.metrics.clarity > 40
        ? 'text-amber-600'
        : 'text-destructive'
    : 'text-muted-foreground'

  return (
    <div className="flex flex-col gap-4 lg:h-[calc(100vh-8rem)]">
      {/* Barra de ações */}
      <div className="flex items-center justify-between shrink-0">
        <nav className="flex items-center gap-1 text-sm text-muted-foreground">
          <button
            onClick={onBack}
            className="hover:text-foreground transition-colors cursor-pointer"
          >
            Ferramentas
          </button>
          <ChevronRight className="size-3.5 shrink-0" />
          <span className="text-foreground font-medium">Analisador de Briefing</span>
        </nav>
        <div className="flex items-center gap-2">
          {result?.hasCritical && (
            <Badge variant="destructive" className="gap-1">
              <ShieldAlert className="size-3" />
              Bloqueio técnico
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            disabled={!result}
            className="gap-1.5"
          >
            {copied
              ? <><CheckCircle2 className="size-3.5 text-emerald-500" /> Copiado</>
              : <><Copy className="size-3.5" /> Copiar escopo</>
            }
          </Button>
        </div>
      </div>

      {/* Seletor de escopo */}
      <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
        {SCOPES.map(s => (
          <button
            key={s.id}
            onClick={() => setActiveScope(s.id)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
              activeScope === s.id
                ? 'bg-foreground text-background'
                : 'bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80',
            )}
          >
            {s.icon}
            {s.label}
          </button>
        ))}
      </div>

      {/* Body — 3 colunas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 min-h-0">

        {/* Coluna esquerda — input */}
        <section className="lg:col-span-4 flex flex-col gap-3 min-h-0">
          <SectionLabel>Briefing original</SectionLabel>

          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            className="flex-1 min-h-52 lg:min-h-0 w-full rounded-lg border border-border bg-muted text-foreground px-4 py-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none leading-relaxed transition-colors"
            placeholder="Cole aqui o briefing desestruturado..."
          />

          <div className="grid grid-cols-3 gap-2 shrink-0">
            {[
              { label: 'Solicitante', value: result?.meta.solicitor ?? '---', warn: false },
              { label: 'Prazo', value: result?.meta.deadline ?? '---', warn: result?.meta.deadlineMissing ?? false },
              { label: 'Urgência', value: result?.meta.urgency ?? 'Normal', warn: false },
            ].map(({ label, value, warn }) => (
              <Card key={label} className="shadow-none bg-muted">
                <CardContent className="p-3">
                  <p className="text-xs text-muted-foreground mb-1">{label}</p>
                  <p className={cn('text-sm font-semibold truncate', warn && 'text-amber-600 dark:text-amber-500')}>
                    {value}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Coluna central — integridade */}
        <section className="lg:col-span-3 flex flex-col gap-3 min-h-0">
          <SectionLabel>Integridade do escopo</SectionLabel>

          <Card className="flex-1 min-h-0 shadow-none overflow-hidden bg-muted">
            <CardContent className="p-4 h-full overflow-y-auto space-y-5">
              {/* Score principal */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Qualidade técnica</span>
                  <span className={cn('text-sm font-bold tabular-nums', clarityValueColor)}>
                    {result?.metrics.clarity ?? 0}%
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn('h-full transition-all duration-700 rounded-full', clarityColor)}
                    style={{ width: `${result?.metrics.clarity ?? 0}%` }}
                  />
                </div>
              </div>

              {/* Checklist */}
              <div className="space-y-3">
                <p className="text-xs font-medium text-muted-foreground border-b border-border pb-2">
                  Itens cruciais
                </p>
                {scope.checklist.map(item => {
                  const met = result?.checklist[item.id] ?? false
                  return (
                    <div key={item.id} className="flex items-center gap-2">
                      {met
                        ? <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                        : <Circle className="size-4 text-muted-foreground/30 shrink-0" />
                      }
                      <div className="flex-1 min-w-0 flex items-center gap-1">
                        <span className={cn(
                          'text-xs truncate',
                          met ? 'text-foreground font-medium' : 'text-muted-foreground',
                        )}>
                          {item.label}
                        </span>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="size-3 text-muted-foreground/40 cursor-default shrink-0" />
                            </TooltipTrigger>
                            <TooltipContent side="right" className="max-w-48 text-xs">
                              {item.tip}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Sub-métricas */}
              <div className="pt-4 border-t border-border space-y-4">
                <MetricRow
                  label="Risco SEO"
                  value={result?.metrics.seoRisk ?? 0}
                  tip="Indica a chance de o site perder acessos orgânicos se a migração for mal executada."
                  barColor={(result?.metrics.seoRisk ?? 0) > 50 ? 'bg-destructive' : 'bg-muted-foreground/40'}
                  valueColor={(result?.metrics.seoRisk ?? 0) > 50 ? 'text-destructive' : 'text-muted-foreground'}
                />
                <MetricRow
                  label="Prontidão de conteúdo"
                  value={result?.metrics.contentReady ?? 0}
                  tip="Indica se os textos, assets e conteúdos já estão prontos para produção começar."
                  barColor="bg-emerald-500"
                  valueColor="text-emerald-600"
                />
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Coluna direita — output */}
        <section className="lg:col-span-5 flex flex-col gap-3 min-h-0">
          <SectionLabel>
            <span className="flex items-center gap-1.5">
              <Zap className="size-3" />
              Tradução tática para o time
            </span>
          </SectionLabel>

          <Card className="flex-1 min-h-64 lg:min-h-0 overflow-hidden shadow-none flex flex-col bg-muted">
            {/* Alertas */}
            {result && result.alerts.length > 0 && (
              <div className="bg-destructive/10 border-b border-destructive/30 p-3 space-y-1.5">
                {result.alerts.map(alert => (
                  <div key={alert.id} className="flex items-start gap-2 text-xs text-destructive">
                    <ShieldAlert className="size-3.5 mt-0.5 shrink-0" />
                    <span><span className="font-semibold">{alert.id}:</span> {alert.text}</span>
                  </div>
                ))}
              </div>
            )}

            <CardContent className="flex-1 p-5 overflow-y-auto">
              {!result ? (
                <div className="h-full flex flex-col items-center justify-center gap-3 text-muted-foreground/30">
                  <FileText className="size-10" strokeWidth={1} />
                  <p className="text-xs text-center leading-relaxed max-w-48">
                    Cole o briefing para gerar a documentação técnica
                  </p>
                </div>
              ) : (
                <pre className="text-xs leading-relaxed text-foreground whitespace-pre-wrap break-words">
                  {result.output}
                </pre>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  )
}
