# CONTEXT — Balneário Hair Institute · Site Institucional

> **Última atualização:** 14 de abril de 2026  
> **Responsável:** Gilcimar Rodrigues (gilcimar.rodrigues14@gmail.com)  
> **Desenvolvido por:** Claude (Anthropic) via Claude.ai

---

## 1. IDENTIDADE DO PROJETO

**Cliente:** Balneário Hair Institute (BHI)  
**Segmento:** Clínica de transplante capilar premium  
**Localização:** Rua Julieta Lins, 330 — Pioneiros, Balneário Camboriú, SC  
**WhatsApp:** +55 47 99249-5146 → `https://wa.me/5547992495146`  
**GitHub:** github.com/gilcimarrodrigues14-eng

---

## 2. ARQUITETURA DE SISTEMAS

| Sistema | Subdomínio | Projeto Cloudflare | Repositório GitHub | Deploy |
|---|---|---|---|---|
| **Site Institucional** | `www.balneariohair.com.br` | `bhi-site-institucional` | `gilcimarrodrigues14-eng/bhi-site-institucional` | Auto (GitHub → CF Pages) |
| **Portal do Paciente** | `portal.balneariohair.com.br` | `bhi-platform` | `gilcimarrodrigues14-eng/bhi-platform` | Auto (GitHub → CF Pages) |
| **Plataforma de Gestão** | `gestao.balneariohair.com.br` | `bhi-platform` | `gilcimarrodrigues14-eng/bhi-platform` | Auto (GitHub → CF Pages) |

> **Nota:** O projeto legado `balneario-hair-institute` (upload manual, sem GitHub) ainda existe no Cloudflare Pages mas sem domínio customizado. Pode ser deletado futuramente.

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

Todos implementados em **todas** as páginas via GTM no `<head>`.

---

## 5. ESTRUTURA DO SITE

```
/                              → Home (index.html)
/transplante-capilar/          → Página de técnicas (com OG tags)
/transplante-capilar/fue/      → FUE Sapphire
/transplante-capilar/dhi/      → DHI Choi
/sobre/                        → noindex → redireciona para /#clinica
/resultados/                   → noindex → redireciona para /#resultados
/contato/                      → noindex → redireciona para /#contato
/depoimentos/                  → noindex → redireciona para /#depoimentos
/blog/                         → Index dos 29 artigos (com OG + Schema)
/blog/[slug]/                  → Cada artigo individual
/fotos/                        → Imagens otimizadas
/sitemap.xml                   → 34 URLs válidas (sem páginas noindex)
/robots.txt                    → Allow: / + Sitemap
```

### Seções da Home (index.html)
1. **Hero** — foto sala cirúrgica, tagline, 3 stats
2. **Técnicas** — FUE Sapphire e DHI Choi
3. **Vídeo Institucional** — YouTube embed `00VDVvAPYhE`
4. **Resultados** — 6 casos antes/depois (fotos reais, CFM compliant)
5. **Instrumentos** — 3 fotos de equipamentos
6. **Diagnóstico Gratuito (Portal)** — iframe `bhi-platform.pages.dev/portal`
7. **A Clínica** — 3 fotos da estrutura
8. **Depoimentos** — carrossel
9. **FAQ** — 8 perguntas com Schema FAQPage
10. **Localização** — Google Maps embed
11. **Footer**

---

## 6. VÍDEO INSTITUCIONAL

**YouTube ID:** `00VDVvAPYhE`  
**URL:** `https://youtu.be/00VDVvAPYhE`  
**Embed:** `https://www.youtube.com/embed/00VDVvAPYhE?autoplay=1&rel=0&modestbranding=1&color=white`  
**Localização no código:** `index.html` → variável `VIDEO_YOUTUBE_URL`

> Vídeo anterior (cortado): `M7XwkXzPHrk` — substituído em 14/04/2026

---

## 7. BLOG — 29 ARTIGOS SEO

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

### SEO por artigo (todos os 29)
- ✅ Title < 65 chars
- ✅ Meta description < 155 chars
- ✅ Schema JSON-LD (Article + FAQPage + BreadcrumbList)
- ✅ Canonical com www
- ✅ og:title, og:description, og:url, og:image
- ✅ twitter:card, twitter:image
- ✅ GTM em todas as páginas

---

## 8. FOTOS — ORGANIZAÇÃO

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
│   └── resultado-transplante-capilar-caso-1 a caso-6.jpg
├── seo/
│   ├── og-image-balneario-hair-institute.jpg  (1200x630)
│   ├── favicon-balneario-hair-institute.png
│   ├── blog-resultado-transplante-capilar-masculino.jpg
│   ├── blog-instrumentos-transplante-capilar.jpg
│   └── blog-balneario-camboriu-polo-saude.jpg
└── logo/
    └── logo-balneario-hair-institute.png
```

> Todas otimizadas com Pillow — de 50MB+ originais para 2.2MB total.  
> Faces de pacientes protegidas conforme normas CFM.

---

## 9. PORTAL DO PACIENTE — INTEGRAÇÃO IFRAME

**URL:** `https://bhi-platform.pages.dev/portal`

### Problema resolvido (14/04/2026)
`X-Frame-Options: DENY` bloqueava embedding.  
**Solução:** Editado `frontend/public/_headers` no repo `bhi-platform`:

```
/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(self), microphone=(self), geolocation=()
  Content-Security-Policy: frame-ancestors 'self' https://balneariohair.com.br https://www.balneariohair.com.br https://balneario-hair-institute.pages.dev

/assets/*
  Cache-Control: public, max-age=31536000, immutable
```

**Status:** `X-Frame-Options: null` — iframe funciona em todos os domínios autorizados.

---

## 10. INFRAESTRUTURA CLOUDFLARE

**Account ID:** `7b495578c62f00a2fbcb5aca39a23dcb`  
**Nameservers:** `javier.ns.cloudflare.com` / `zoe.ns.cloudflare.com`

### Workers ativos
| Worker | Função |
|---|---|
| `www-redirect-bhi` | Redireciona apex para www |
| `apex-canonical-rewriter` | Reescreve canonical para domínio correto |

### Projetos Pages
| Projeto | URL Pages | Domínios customizados | GitHub |
|---|---|---|---|
| `bhi-site-institucional` | `bhi-site-institucional.pages.dev` | `www.balneariohair.com.br`, `balneariohair.com.br` | branch `main` |
| `bhi-platform` | `bhi-platform.pages.dev` | `gestao.balneariohair.com.br`, `portal.balneariohair.com.br` | branch `main` |
| `balneario-hair-institute` | `balneario-hair-institute.pages.dev` | — (legado, sem domínio) | upload manual |

---

## 11. SEO — AUDITORIA REALIZADA (14/04/2026)

### Correções aplicadas
| Item | Antes | Depois |
|---|---|---|
| Home title | 68 chars ❌ | 47 chars ✅ |
| Home description | 180 chars ❌ | 140 chars ✅ |
| Blog Index OG tags | Ausentes ❌ | Completos ✅ |
| Blog Index Schema | Ausente ❌ | Blog + BreadcrumbList ✅ |
| Transplante Capilar title | 80 chars ❌ | 52 chars ✅ |
| Transplante Capilar OG | Ausente ❌ | Completo ✅ |
| Páginas noindex (sobre/resultados/contato/depoimentos) | Redirect simples ❌ | noindex + redirect correto ✅ |
| Sitemap — páginas noindex | Incluídas ❌ | Removidas ✅ |
| 29 artigos og:image | Ausente ❌ | Adicionado ✅ |
| 7 artigos title > 65c | ❌ | Corrigidos ✅ |
| 9 artigos description > 155c | ❌ | Corrigidas ✅ |

### Sitemap
**URL:** `https://www.balneariohair.com.br/sitemap.xml`  
**Total de URLs válidas:** 34 (após remoção de páginas noindex)  
**Submetido no Google Search Console:** ✅ 14/04/2026

### Google Search Console
**Propriedade:** `balneariohair.com.br` (domínio raiz)  
**Sitemap sem www:** Processado ✅ (38 URLs — versão anterior)  
**Sitemap com www:** Submetido ✅ — aguardando propagação DNS  
**Home indexada:** ✅ com rerastreamento solicitado  
**Artigo âncora BC:** Indexação solicitada ✅  

### URLs para solicitar indexação (próximos dias)
```
Dia 1 (fazer):
https://www.balneariohair.com.br/blog/
https://www.balneariohair.com.br/transplante-capilar/
https://www.balneariohair.com.br/blog/transplante-capilar-fue-sapphire/
https://www.balneariohair.com.br/blog/diferenca-fue-dhi-transplante/
https://www.balneariohair.com.br/blog/escala-norwood-calvicie/
https://www.balneariohair.com.br/blog/calvicie-masculina-tratamento/
https://www.balneariohair.com.br/blog/enxertos-capilares-quantos-preciso/
https://www.balneariohair.com.br/blog/transplante-capilar-resultado-permanente/

Dia 2:
https://www.balneariohair.com.br/blog/transplante-capilar-tempo-resultado/
https://www.balneariohair.com.br/blog/choque-folicular-transplante/
https://www.balneariohair.com.br/blog/pos-operatorio-transplante-capilar/
https://www.balneariohair.com.br/blog/cuidados-pos-transplante-capilar/
https://www.balneariohair.com.br/blog/recuperacao-transplante-capilar/
https://www.balneariohair.com.br/blog/trichoscopia-diagnostico-capilar/
https://www.balneariohair.com.br/blog/calvicie-hereditaria-tratamento/
https://www.balneariohair.com.br/blog/area-doadora-transplante-capilar/

Dia 3:
https://www.balneariohair.com.br/blog/transplante-capilar-seguro/
https://www.balneariohair.com.br/blog/transplante-capilar-linha-frontal/
https://www.balneariohair.com.br/blog/transplante-capilar-barba/
https://www.balneariohair.com.br/blog/transplante-capilar-segunda-sessao/
https://www.balneariohair.com.br/blog/transplante-capilar-sem-cicatriz/
https://www.balneariohair.com.br/blog/finasterida-minoxidil-transplante/
https://www.balneariohair.com.br/blog/calvicie-androgens-alopecia/
https://www.balneariohair.com.br/blog/transplante-capilar-famosos/
```

---

## 12. WORKFLOW DE DESENVOLVIMENTO

### Como atualizar o site
```bash
# Via GitHub (mais simples):
# Acessar github.com/gilcimarrodrigues14-eng/bhi-site-institucional
# Editar arquivo direto na interface → commit → deploy automático (~2 min)

# Via terminal (Claude Code):
cd /home/claude/bhi-site
# editar arquivos...
git add -A
git commit -m "feat/fix/docs: descrição da alteração"
git push origin main
```

### Deploy automático
Push na branch `main` → Cloudflare Pages detecta → build → deploy em ~2 min.

---

## 13. PENDÊNCIAS

| # | Tarefa | Prioridade |
|---|---|---|
| 1 | Solicitar indexação dos 29 artigos no GSC (3 dias) | 🔴 Alta |
| 2 | Reenviar sitemap www após propagação DNS (24-48h) | 🔴 Alta |
| 3 | Substituir depoimentos de exemplo por depoimentos reais | 🟡 Média |
| 4 | Testar iframe do portal em mobile | 🟡 Média |
| 5 | Deletar projeto legado `balneario-hair-institute` | 🟢 Baixa |

---

## 14. DECISÕES TÉCNICAS

| Decisão | Motivo |
|---|---|
| Site estático HTML puro | Velocidade, SEO, custo zero, sem vulnerabilidades |
| Cloudflare Pages free | CDN global, HTTPS automático, deploy via GitHub |
| YouTube embed (não arquivo) | MP4 de 49MB excede limite do CF Pages (25MB) |
| Fotos otimizadas com Pillow | 50MB+ → 2.2MB sem perda visual perceptível |
| Subdomínios separados | Deploy independente por sistema, clareza arquitetural |
| Iframe para portal | UX integrada sem redirecionar o usuário |
| Páginas redirect como noindex | Evita duplicate content, preserva crawl budget |
| Schema em todos os artigos | Elegibilidade para rich snippets no Google |

---

## 15. ACESSOS

| Recurso | Detalhe |
|---|---|
| GitHub | github.com/gilcimarrodrigues14-eng |
| Cloudflare | dash.cloudflare.com · ID: 7b495578c62f00a2fbcb5aca39a23dcb |
| Google Search Console | balneariohair.com.br |
| GTM | GTM-P9KH9B2W |
| GA4 | G-3H6PW0KKGH |
| Google Ads | AW-18028440055 |
| Meta Pixel | 1451356119991534 |

---

*Atualizar este arquivo a cada sessão significativa de desenvolvimento.*
