# CONTEXT — Balneário Hair Institute · Site Institucional

> **Última atualização:** 14 de abril de 2026  
> **Responsável:** Gilcimar Rodrigues  
> **Desenvolvido por:** Claude (Anthropic) via Claude Code + Claude.ai

---

## 1. IDENTIDADE DO PROJETO

**Cliente:** Balneário Hair Institute (BHI)  
**Segmento:** Clínica de transplante capilar premium  
**Localização:** Rua Julieta Lins, 330 — Pioneiros, Balneário Camboriú, SC  
**WhatsApp:** +55 47 99249-5146 → `https://wa.me/5547992495146`  
**E-mail do proprietário:** gilcimar.rodrigues14@gmail.com  
**GitHub:** github.com/gilcimarrodrigues14-eng  

---

## 2. ARQUITETURA DE SISTEMAS

O BHI opera **3 sistemas distintos** sob o mesmo domínio raiz `balneariohair.com.br`:

| Sistema | Subdomínio | Projeto Cloudflare | Repositório GitHub | Deploy |
|---|---|---|---|---|
| **Site Institucional** | `www.balneariohair.com.br` | `bhi-site-institucional` | `gilcimarrodrigues14-eng/bhi-site-institucional` | Auto (GitHub → CF Pages) |
| **Portal do Paciente** | `portal.balneariohair.com.br` | `bhi-platform` | `gilcimarrodrigues14-eng/bhi-platform` | Auto (GitHub → CF Pages) |
| **Plataforma de Gestão** | `gestao.balneariohair.com.br` | `bhi-platform` | `gilcimarrodrigues14-eng/bhi-platform` | Auto (GitHub → CF Pages) |

> **Importante:** Portal e Gestão compartilham o mesmo repositório e projeto Cloudflare (`bhi-platform`). São rotas diferentes dentro do mesmo build.

---

## 3. IDENTIDADE VISUAL (Brand Bible)

```
Paleta:
  #000000   → Preto absoluto
  #0A1128   → Navy (cor principal)
  #060c1a   → Navy escuro (fundos)
  #B4B5B9   → Prata (destaques)
  #FFFFFF   → Branco

Tipografia:
  Cormorant Garamond (serif) → títulos, taglines, números
  Montserrat (sans-serif)    → corpo, navegação, botões

Taglines:
  "Imagem não se cria. Se mantém."
  "Precisão médica. Confiança restaurada."
```

---

## 4. RASTREAMENTO & ANALYTICS

| Ferramenta | ID |
|---|---|
| Google Tag Manager | `GTM-P9KH9B2W` |
| Google Analytics 4 | `G-3H6PW0KKGH` |
| Google Ads (conversão) | `AW-18028440055` |
| Meta Pixel | `1451356119991534` |

Todos implementados em **todas** as páginas do site via GTM no `<head>`.

---

## 5. ESTRUTURA DO SITE INSTITUCIONAL

```
/                              → Home (index.html)
/transplante-capilar/          → Página de técnicas
/transplante-capilar/fue/      → FUE Sapphire (subpágina)
/transplante-capilar/dhi/      → DHI Choi (subpágina)
/sobre/                        → A Clínica
/resultados/                   → Galeria de Resultados
/depoimentos/                  → Depoimentos de Pacientes
/contato/                      → Contato e Localização
/blog/                         → Index dos 29 artigos SEO
/blog/[slug]/                  → Cada artigo individual
/fotos/                        → Imagens do site (organizadas)
/sitemap.xml                   → Sitemap completo (38 URLs)
/robots.txt                    → Configuração de crawlers
```

### Seções da Home (index.html)
1. **Hero** — foto da sala cirúrgica, tagline "Imagem não se cria. Se mantém.", 3 stats (97%, 3mil+, 0 cicatrizes)
2. **Técnicas** — FUE Sapphire e DHI Choi
3. **Vídeo Institucional** — YouTube embed `M7XwkXzPHrk`
4. **Resultados** — 6 casos antes/depois (fotos reais)
5. **Instrumentos** — 3 fotos de equipamentos cirúrgicos
6. **Diagnóstico Gratuito (Portal)** — iframe do `bhi-platform.pages.dev/portal`
7. **Clínica** — 3 fotos da estrutura
8. **Depoimentos** — carrossel
9. **FAQ** — 8 perguntas com Schema FAQPage
10. **Localização** — mapa Google Maps embed
11. **Footer** — contato, links, disclaimers CFM

---

## 6. BLOG — 29 ARTIGOS SEO

Organizados em 6 clusters temáticos:

### Cluster 1 — Balneário Camboriú (âncora local)
- `transplante-capilar-balneario-camboriu` ← artigo principal
- `balneario-camboriu-polo-saude`
- `transplante-capilar-voo-viagem`
- `transplante-capilar-sul-brasil`

### Cluster 2 — Técnicas Cirúrgicas
- `transplante-capilar-fue-sapphire`
- `transplante-capilar-dhi-choi`
- `diferenca-fue-dhi-transplante`
- `transplante-capilar-seguro`
- `transplante-capilar-linha-frontal`
- `transplante-capilar-sem-cicatriz`
- `transplante-capilar-barba`
- `transplante-capilar-segunda-sessao`

### Cluster 3 — Calvície
- `escala-norwood-calvicie`
- `calvicie-masculina-tratamento`
- `calvicie-hereditaria-tratamento`
- `calvicie-androgens-alopecia`
- `finasterida-minoxidil-transplante`

### Cluster 4 — Pós-Operatório
- `choque-folicular-transplante`
- `pos-operatorio-transplante-capilar`
- `cuidados-pos-transplante-capilar`
- `recuperacao-transplante-capilar`

### Cluster 5 — Resultados
- `transplante-capilar-resultado-permanente`
- `transplante-capilar-tempo-resultado`
- `transplante-capilar-famosos`

### Cluster 6 — Planejamento
- `enxertos-capilares-quantos-preciso`
- `area-doadora-transplante-capilar`
- `trichoscopia-diagnostico-capilar`
- `transplante-capilar-idade-minima`
- `transplante-capilar-inverno-verao`

### Schema implementado em cada artigo
- `Article` (com author, datePublished, image)
- `FAQPage` (3 perguntas por artigo)
- `BreadcrumbList`
- `MedicalBusiness` (na home)

---

## 7. FOTOS — ORGANIZAÇÃO

```
fotos/
├── clinica/
│   ├── sala-cirurgica-transplante-capilar-balneario-camboriu.jpg
│   ├── laboratorio-enxertos-capilares-bhi.jpg
│   ├── area-recuperacao-clinica-capilar-balneario-camboriu.jpg
│   ├── recepcao-balneario-hair-institute.jpg
│   └── fachada-clinica-transplante-capilar-bc.jpg
├── procedimento/
│   ├── maos-cirurgiao-transplante-capilar-fue.jpg
│   ├── caneta-choi-dhi-transplante-capilar.jpg
│   ├── lamina-safira-fue-sapphire-transplante.jpg
│   └── tricoscopia-transplante-capilar.jpg
├── resultados/
│   ├── resultado-transplante-capilar-caso-1.jpg  (a -6.jpg)
│   └── ...
├── seo/
│   ├── og-image-balneario-hair-institute.jpg
│   ├── favicon-balneario-hair-institute.png
│   ├── blog-resultado-transplante-capilar-masculino.jpg
│   ├── blog-instrumentos-transplante-capilar.jpg
│   └── blog-balneario-camboriu-polo-saude.jpg
└── logo/
    └── logo-balneario-hair-institute.png
```

> Todas as imagens foram **otimizadas para web** (de 50MB+ originais para 2.2MB total).  
> Faces de pacientes **preservadas por ética médica** (CFM) — fotos de resultado com identificação protegida.

---

## 8. PORTAL DO PACIENTE — INTEGRAÇÃO IFRAME

**URL do Portal:** `https://bhi-platform.pages.dev/portal`

### Problema resolvido
O portal tinha `X-Frame-Options: DENY` impedindo embedding via iframe.

**Solução:** Editado `frontend/public/_headers` no repositório `bhi-platform` em `14/04/2026`:

```
/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(self), microphone=(self), geolocation=()
  Content-Security-Policy: frame-ancestors 'self' https://balneariohair.com.br https://www.balneariohair.com.br https://balneario-hair-institute.pages.dev

/assets/*
  Cache-Control: public, max-age=31536000, immutable
```

**Resultado:** `X-Frame-Options: null` — iframe funciona em todos os domínios autorizados.

### Implementação no index.html
```html
<iframe
  id="portal-iframe"
  src="https://bhi-platform.pages.dev/portal"
  title="Portal do Paciente — Diagnóstico Capilar Gratuito"
  allow="camera; microphone"
  loading="lazy"
></iframe>
```

---

## 9. VÍDEO INSTITUCIONAL

**YouTube ID:** `M7XwkXzPHrk`  
**URL completa:** `https://youtu.be/M7XwkXzPHrk`  
**Embed usado no site:**
```
https://www.youtube.com/embed/M7XwkXzPHrk?autoplay=1&rel=0&modestbranding=1&color=white
```

**Localização no código:** `index.html` → variável `VIDEO_YOUTUBE_URL`

---

## 10. INFRAESTRUTURA CLOUDFLARE

**Account ID:** `7b495578c62f00a2fbcb5aca39a23dcb`  
**Nameservers do domínio:** `javier.ns.cloudflare.com` / `zoe.ns.cloudflare.com`

### Workers ativos
| Worker | Função |
|---|---|
| `www-redirect-bhi` | Redireciona raiz para www |
| `apex-canonical-rewriter` | Reescreve canonical para domínio correto |

### Projetos Pages
| Projeto | URL Pages | Domínios | GitHub |
|---|---|---|---|
| `bhi-site-institucional` | `bhi-site-institucional.pages.dev` | `www.balneariohair.com.br`, `balneariohair.com.br` | `gilcimarrodrigues14-eng/bhi-site-institucional` (main) |
| `bhi-platform` | `bhi-platform.pages.dev` | `gestao.balneariohair.com.br`, `portal.balneariohair.com.br` | `gilcimarrodrigues14-eng/bhi-platform` (main) |
| `balneario-hair-institute` | `balneario-hair-institute.pages.dev` | — (sem domínio, projeto legado) | Upload manual |

> **Nota:** O projeto `balneario-hair-institute` é legado (criado via upload de ZIP). Os domínios foram migrados para `bhi-site-institucional`. Pode ser deletado futuramente.

---

## 11. WORKFLOW DE DESENVOLVIMENTO

### Como atualizar o site
```
1. Editar arquivo diretamente no GitHub
   → github.com/gilcimarrodrigues14-eng/bhi-site-institucional
   → editar na branch main
   → commit → Cloudflare faz deploy automático em ~2 min

2. Ou via Claude Code (terminal):
   → editar em /home/claude/bhi-site/
   → git add . && git commit -m "mensagem"
   → git push origin main
```

### Arquivos mais editados
| Arquivo | Função |
|---|---|
| `index.html` | Home completa |
| `blog/index.html` | Index do blog com 29 artigos |
| `sitemap.xml` | Mapa do site para Google |
| `fotos/**` | Imagens otimizadas |

### Deploy automático
Qualquer push na branch `main` dispara o deploy automático no Cloudflare Pages.  
Tempo médio: **1-2 minutos** até o site atualizado estar ao vivo.

---

## 12. SEO — CONFIGURAÇÃO

### Sitemap
**URL:** `https://www.balneariohair.com.br/sitemap.xml`  
**Total de URLs:** 38  
**Pendência:** Submeter no Google Search Console

### Robots.txt
```
User-agent: *
Allow: /
Sitemap: https://www.balneariohair.com.br/sitemap.xml
```

### Canonical
Todas as páginas usam canonical apontando para `https://www.balneariohair.com.br/`.  
Redirecionamento `balneariohair.com.br` → `www.balneariohair.com.br` via Worker Cloudflare.

---

## 13. PENDÊNCIAS & PRÓXIMOS PASSOS

| # | Tarefa | Prioridade |
|---|---|---|
| 1 | Submeter sitemap no Google Search Console | 🔴 Alta |
| 2 | Substituir depoimentos de exemplo por depoimentos reais de pacientes | 🔴 Alta |
| 3 | Confirmar configuração de `portal.balneariohair.com.br` no Cloudflare | 🟡 Média |
| 4 | Testar iframe do portal em mobile | 🟡 Média |
| 5 | Publicar mais conteúdo no blog (artigos novos) | 🟢 Baixa |
| 6 | Deletar projeto legado `balneario-hair-institute` no Cloudflare | 🟢 Baixa |

---

## 14. DECISÕES TÉCNICAS RELEVANTES

| Decisão | Motivo |
|---|---|
| Site estático (HTML puro) em vez de CMS | Velocidade, SEO, custo zero, sem vulnerabilidades |
| Cloudflare Pages (free) | CDN global, HTTPS automático, deploy automático via GitHub |
| YouTube embed em vez de vídeo nativo | Arquivo MP4 (49MB) excede limite do CF Pages (25MB/arquivo) |
| Fotos otimizadas com Pillow | Redução de 50MB+ para 2.2MB sem perda visual perceptível |
| Separação site/portal/gestão em subdomínios | Clareza arquitetural, deploy independente por sistema |
| iframe para portal | Experiência integrada sem redirecionar o usuário para outro domínio |

---

## 15. CONTATOS E ACESSOS

| Recurso | Acesso |
|---|---|
| GitHub | github.com/gilcimarrodrigues14-eng |
| Cloudflare | dash.cloudflare.com (conta: Gilcimar.rodrigues14@gmail.com) |
| Google Tag Manager | GTM-P9KH9B2W |
| Google Analytics | G-3H6PW0KKGH |
| WhatsApp Clínica | +55 47 99249-5146 |

---

*Este arquivo é o documento de referência técnica do projeto. Atualize após cada sessão significativa de desenvolvimento.*
