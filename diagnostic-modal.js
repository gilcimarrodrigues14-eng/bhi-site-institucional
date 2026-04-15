/* =============================================================================
   BHI — Diagnostic Modal (vanilla JS, self-contained)
   -----------------------------------------------------------------------------
   Modal full-screen para captura de 4 fotos do couro cabeludo + dados do lead,
   com instrução por áudio (Web Speech API), preview ao vivo de câmera e envio
   multipart para POST /api/portal/lead da plataforma BHI.

   Uso:
     <script src="/diagnostic-modal.js" defer></script>
     // depois, em qualquer botão:
     <button onclick="openDiagnosticModal()">Diagnóstico Gratuito</button>

   API global exposta:
     window.openDiagnosticModal()  → abre o modal
     window.closeDiagnosticModal() → fecha o modal

   O modal injeta seu próprio <style> em <head> e seu próprio container em <body>
   na primeira chamada. Não há dependência de framework, build step, ou outros
   arquivos.
   ============================================================================= */
(function () {
  'use strict'

  // ─── Configuração ────────────────────────────────────────────────────────────
  var API_URL = 'https://bhi-platform-production.up.railway.app/api/portal/lead'
  var MAX_TENTATIVAS = 5 // após N falhas consecutivas, libera "continuar assim mesmo"

  // ─── Definição das 4 fotos (ordem importa) ──────────────────────────────────
  var FOTOS = [
    {
      field: 'foto_frente',
      label: 'Frente',
      instrucao: 'Aponte a câmera para a frente da cabeça, com a linha do cabelo bem visível.',
    },
    {
      field: 'foto_topo',
      label: 'Topo',
      instrucao: 'Abaixe sua cabeça. Mantenha o topo da cabeça centralizado no quadro.',
    },
    {
      field: 'foto_lateral_direita',
      label: 'Lateral Direita',
      instrucao: 'Vire a cabeça para a sua direita até o ombro.',
    },
    {
      field: 'foto_lateral_esquerda',
      label: 'Lateral Esquerda',
      instrucao: 'Vire a cabeça para a sua esquerda até o ombro.',
    },
  ]

  var LOADING_MESSAGES = [
    'Analisando imagens com IA clínica…',
    'Identificando padrão de queda…',
    'Calculando densidade da área doadora…',
    'Estimando quantidade de enxertos…',
    'Preparando seu laudo técnico…',
  ]

  // ─── Estado interno ──────────────────────────────────────────────────────────
  var state = {
    step: 1,           // 1 = welcome, 2 = camera, 3 = form, 4 = loading/result
    fotoIndex: 0,      // 0..3
    fotos: [null, null, null, null], // Blob[]
    validacoes: [null, null, null, null],
    tentativas: [0, 0, 0, 0],
    stream: null,
    formData: { nome: '', email: '', telefone: '' },
    loadingTimer: null,
    loadingIdx: 0,
    _success: null,
  }

  var rootEl = null
  var injected = false

  // ─── Web Speech API (com fallback silencioso) ───────────────────────────────
  var speechSupported =
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    typeof window.SpeechSynthesisUtterance !== 'undefined'

  function falarInstrucao(texto) {
    if (!speechSupported) return null
    try {
      window.speechSynthesis.cancel()
      var u = new window.SpeechSynthesisUtterance(texto)
      u.lang = 'pt-BR'
      u.rate = 0.95
      u.pitch = 1.0
      u.volume = 1.0
      var icon = document.querySelector('.bhi-dx-audio-icon')
      u.onstart = function () { if (icon) icon.classList.add('is-active') }
      u.onend = function () { if (icon) icon.classList.remove('is-active') }
      u.onerror = function () { if (icon) icon.classList.remove('is-active') }
      window.speechSynthesis.speak(u)
      return u
    } catch (e) {
      return null
    }
  }

  function pararFala() {
    if (speechSupported) {
      try { window.speechSynthesis.cancel() } catch (e) { /* noop */ }
    }
  }

  // ─── CSS injetado uma única vez ──────────────────────────────────────────────
  var CSS = `
.bhi-dx-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.92);z-index:9999;display:flex;align-items:center;justify-content:center;font-family:'Montserrat',Arial,sans-serif;-webkit-font-smoothing:antialiased;animation:bhi-dx-fade 220ms ease}
.bhi-dx-card{position:relative;background:#0A1128;border-radius:14px;width:min(540px,calc(100vw - 24px));max-height:calc(100vh - 32px);overflow-y:auto;padding:36px 32px 32px;color:#fff;box-shadow:0 20px 60px rgba(0,0,0,.5);animation:bhi-dx-slide 320ms cubic-bezier(.2,.8,.2,1);z-index:10000}
@keyframes bhi-dx-fade{from{opacity:0}to{opacity:1}}
@keyframes bhi-dx-slide{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
.bhi-dx-close{position:absolute;top:16px;right:16px;width:36px;height:36px;border-radius:50%;background:rgba(0,0,0,.4);border:1px solid rgba(180,181,185,.4);color:#B4B5B9;font-size:18px;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .2s;z-index:99999;pointer-events:all}
.bhi-dx-close:hover{background:rgba(180,181,185,.18);color:#fff;border-color:#fff}
.bhi-dx-h1{font-family:'Cormorant Garamond',Georgia,serif;font-size:30px;font-weight:400;line-height:1.1;color:#fff;margin:0 0 10px;letter-spacing:-.5px}
.bhi-dx-sub{font-size:14px;color:#B4B5B9;margin:0 0 22px;line-height:1.5}
.bhi-dx-instructions{display:flex;gap:14px;margin:18px 0 26px}
.bhi-dx-instr-item{flex:1;text-align:center;padding:14px 6px;border:1px solid rgba(180,181,185,.18);border-radius:8px;background:rgba(255,255,255,.02)}
.bhi-dx-instr-icon{font-size:22px;margin-bottom:6px;color:#fff}
.bhi-dx-instr-label{font-size:11px;color:#B4B5B9;text-transform:uppercase;letter-spacing:.5px;font-weight:500}
.bhi-dx-btn{display:block;width:100%;padding:14px 18px;border:0;border-radius:6px;font-family:inherit;font-size:14px;font-weight:600;letter-spacing:.5px;cursor:pointer;transition:all .2s;text-transform:uppercase}
.bhi-dx-btn-primary{background:#fff;color:#0A1128}
.bhi-dx-btn-primary:hover{background:#f0eee8}
.bhi-dx-btn-primary:disabled{background:#3a3a3a;color:#888;cursor:not-allowed}
.bhi-dx-btn-secondary{background:transparent;border:1px solid #B4B5B9;color:#B4B5B9;margin-top:10px}
.bhi-dx-btn-secondary:hover{background:rgba(180,181,185,.08);color:#fff}
.bhi-dx-link{display:block;text-align:center;background:transparent;border:0;color:#B4B5B9;font-size:13px;cursor:pointer;padding:14px 0 0;font-family:inherit;text-decoration:underline;text-decoration-color:rgba(180,181,185,.4)}
.bhi-dx-link:hover{color:#fff}
.bhi-dx-progress{display:flex;gap:8px;margin-bottom:16px;align-items:center;justify-content:center}
.bhi-dx-progress-thumb{width:46px;height:46px;border-radius:6px;background:rgba(255,255,255,.06);border:1px solid rgba(180,181,185,.2);display:flex;align-items:center;justify-content:center;font-size:11px;color:#B4B5B9;background-size:cover;background-position:center;position:relative}
.bhi-dx-progress-thumb.is-current{border-color:#fff;box-shadow:0 0 0 2px rgba(255,255,255,.2)}
.bhi-dx-progress-thumb.is-done{border-color:rgba(180,181,185,.6)}
.bhi-dx-progress-thumb.is-done::after{content:'✓';position:absolute;bottom:-2px;right:-2px;width:16px;height:16px;border-radius:50%;background:#fff;color:#0A1128;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center}
.bhi-dx-step-counter{font-size:12px;color:#B4B5B9;text-transform:uppercase;letter-spacing:1px;text-align:center;margin-bottom:8px}
.bhi-dx-step-title{font-family:'Cormorant Garamond',Georgia,serif;font-size:24px;text-align:center;margin:0 0 8px}
.bhi-dx-instruction-line{display:flex;gap:8px;align-items:flex-start;justify-content:center;color:#B4B5B9;font-size:13px;line-height:1.5;text-align:center;margin:8px 18px 4px;min-height:42px}
.bhi-dx-audio-icon{display:inline-flex;gap:2px;align-items:flex-end;height:14px;flex-shrink:0;margin-top:3px}
.bhi-dx-audio-icon span{display:block;width:2px;background:#B4B5B9;border-radius:1px;height:4px}
.bhi-dx-audio-icon.is-active span{animation:bhi-dx-eq 1s ease-in-out infinite}
.bhi-dx-audio-icon.is-active span:nth-child(1){animation-delay:0s}
.bhi-dx-audio-icon.is-active span:nth-child(2){animation-delay:.15s}
.bhi-dx-audio-icon.is-active span:nth-child(3){animation-delay:.3s}
@keyframes bhi-dx-eq{0%,100%{height:4px}50%{height:14px}}
.bhi-dx-replay{display:block;margin:0 auto 12px;background:transparent;border:1px solid rgba(180,181,185,.25);color:#B4B5B9;font-size:11px;padding:6px 14px;border-radius:20px;cursor:pointer;font-family:inherit}
.bhi-dx-replay:hover{color:#fff;border-color:#fff}
.bhi-dx-camera-wrap{position:relative;width:100%;aspect-ratio:1/1;max-height:54vh;background:#000;border-radius:10px;overflow:hidden;margin:6px 0 16px}
.bhi-dx-preview-img{width:100%;height:100%;object-fit:cover;display:block}
/* scaleX(-1) = só espelhamento (efeito selfie). Sem zoom CSS — preview e foto final ficam no mesmo enquadramento. */
.bhi-dx-video{width:100%;height:100%;object-fit:cover;display:block;transform:scaleX(-1);transform-origin:center center}
.bhi-dx-guide{position:absolute;left:5%;top:5%;width:90%;height:90%;pointer-events:none;z-index:5;animation:bhi-dx-guide-pulse 2s ease-in-out infinite}
@keyframes bhi-dx-guide-pulse{0%,100%{opacity:.6}50%{opacity:1}}
.bhi-dx-guide-label{position:absolute;top:10px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,.6);color:#fff;font-size:10px;font-weight:600;letter-spacing:.8px;padding:6px 14px;border-radius:14px;text-align:center;white-space:nowrap;max-width:90%;overflow:hidden;text-overflow:ellipsis;text-transform:uppercase;z-index:6;font-family:'Montserrat',Arial,sans-serif}
.bhi-dx-preview-img{transition:outline .2s}
.bhi-dx-preview-img.is-ok{outline:2px solid #1D9E75;outline-offset:-2px}
.bhi-dx-preview-img.is-warn{outline:2px solid #EF9F27;outline-offset:-2px}
.bhi-dx-preview-img.is-error{outline:2px solid #CC0000;outline-offset:-2px}
.bhi-dx-validation{margin:-8px 0 10px;padding:11px 13px;border-radius:8px;font-size:12px;line-height:1.45;display:flex;gap:9px;align-items:flex-start}
.bhi-dx-validation.is-ok{background:rgba(29,158,117,.12);border:1px solid rgba(29,158,117,.4);color:#7fe0b6}
.bhi-dx-validation.is-warn{background:rgba(239,159,39,.12);border:1px solid rgba(239,159,39,.45);color:#ffd596}
.bhi-dx-validation.is-error{background:rgba(204,0,0,.12);border:1px solid rgba(204,0,0,.45);color:#ff9a9a}
.bhi-dx-validation-icon{flex-shrink:0;font-size:15px;line-height:1.1}
.bhi-dx-validation-body{flex:1}
.bhi-dx-validation-hint{display:block;margin-top:4px;font-size:11px;opacity:.85}
.bhi-dx-tries{display:block;text-align:center;font-size:10px;color:#B4B5B9;letter-spacing:.5px;text-transform:uppercase;margin:-4px 0 8px}
.bhi-dx-btn-fallback{background:transparent;border:1px dashed rgba(180,181,185,.5);color:#B4B5B9;margin-top:8px}
.bhi-dx-btn-fallback:hover{color:#fff;border-color:#fff}
.bhi-dx-camera-error{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:24px;color:#B4B5B9;font-size:13px;text-align:center;line-height:1.5}
.bhi-dx-shutter{display:flex;justify-content:center;margin:0 0 12px}
.bhi-dx-shutter-btn{width:64px;height:64px;border-radius:50%;background:#fff;border:4px solid rgba(255,255,255,.3);cursor:pointer;transition:transform .15s;padding:0}
.bhi-dx-shutter-btn:hover{transform:scale(1.05)}
.bhi-dx-shutter-btn:active{transform:scale(.95)}
.bhi-dx-shutter-btn[disabled]{background:#444;border-color:rgba(255,255,255,.1);cursor:not-allowed;transform:none}
.bhi-dx-actions{display:flex;gap:10px;margin-top:6px}
.bhi-dx-actions .bhi-dx-btn{margin:0;flex:1;text-transform:none;font-size:13px;padding:12px 16px}
.bhi-dx-form-field{margin-bottom:16px}
.bhi-dx-form-label{display:block;font-size:11px;text-transform:uppercase;letter-spacing:.8px;color:#B4B5B9;margin-bottom:6px;font-weight:500}
.bhi-dx-form-input{width:100%;padding:12px 14px;background:rgba(255,255,255,.04);border:1px solid rgba(180,181,185,.25);border-radius:6px;color:#fff;font-family:inherit;font-size:14px;transition:border-color .2s;box-sizing:border-box}
.bhi-dx-form-input:focus{outline:none;border-color:#fff;background:rgba(255,255,255,.06)}
.bhi-dx-form-error{color:#ff8b8b;font-size:11px;margin-top:4px;display:none}
.bhi-dx-form-error.is-shown{display:block}
.bhi-dx-loading{text-align:center;padding:30px 10px}
.bhi-dx-spinner{width:54px;height:54px;border:3px solid rgba(255,255,255,.1);border-top-color:#fff;border-radius:50%;margin:0 auto 22px;animation:bhi-dx-spin 1s linear infinite}
@keyframes bhi-dx-spin{to{transform:rotate(360deg)}}
.bhi-dx-loading-text{font-size:14px;color:#B4B5B9;line-height:1.5;min-height:42px;transition:opacity .3s}
.bhi-dx-result{text-align:center;padding:14px 6px}
.bhi-dx-result-icon{width:64px;height:64px;border-radius:50%;background:#fff;color:#0A1128;display:flex;align-items:center;justify-content:center;font-size:32px;margin:0 auto 18px;font-weight:700}
.bhi-dx-result h3{font-family:'Cormorant Garamond',Georgia,serif;font-size:26px;font-weight:400;margin:0 0 12px}
.bhi-dx-result p{font-size:14px;color:#B4B5B9;line-height:1.55;margin:0 0 22px}
@media (max-width:520px){
  .bhi-dx-card{padding:28px 20px 22px;border-radius:12px}
  .bhi-dx-h1{font-size:26px}
  .bhi-dx-instructions{flex-wrap:wrap}
  .bhi-dx-instr-item{flex-basis:calc(50% - 7px)}
  .bhi-dx-camera-wrap{aspect-ratio:3/4;max-height:55vh}
}
`

  function injectAssets() {
    if (injected) return
    var style = document.createElement('style')
    style.id = 'bhi-dx-style'
    style.textContent = CSS
    document.head.appendChild(style)

    rootEl = document.createElement('div')
    rootEl.id = 'bhi-dx-root'
    document.body.appendChild(rootEl)
    injected = true
  }

  // ─── Renderização ────────────────────────────────────────────────────────────
  function render() {
    if (!rootEl) return
    rootEl.innerHTML = ''
    var overlay = document.createElement('div')
    overlay.className = 'bhi-dx-overlay'
    // Loading é o único estado onde fechar é bloqueado — sucesso/erro permitem.
    var isLoadingStep = state.step === 4 && state._success === null
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay && !isLoadingStep) closeModal()
    })

    var card = document.createElement('div')
    card.className = 'bhi-dx-card'
    card.setAttribute('role', 'dialog')
    card.setAttribute('aria-modal', 'true')

    if (!isLoadingStep) {
      var closeBtn = document.createElement('button')
      closeBtn.className = 'bhi-dx-close'
      closeBtn.type = 'button'
      closeBtn.setAttribute('aria-label', 'Fechar')
      closeBtn.innerHTML = '&times;'
      closeBtn.addEventListener('click', closeModal)
      card.appendChild(closeBtn)
    }

    if (state.step === 1) renderStep1(card)
    else if (state.step === 2) renderStep2(card)
    else if (state.step === 3) renderStep3(card)
    else if (state.step === 4) renderStep4(card)

    overlay.appendChild(card)
    rootEl.appendChild(overlay)
  }

  // ─── Step 1: Welcome ─────────────────────────────────────────────────────────
  function renderStep1(card) {
    var html = ''
    html += '<h2 class="bhi-dx-h1">Diagnóstico Capilar Gratuito</h2>'
    html += '<p class="bhi-dx-sub">Análise clínica com inteligência artificial em menos de 2 minutos. Vamos precisar de 4 fotos do seu couro cabeludo:</p>'
    html += '<div class="bhi-dx-instructions">'
    var icons = ['↑', '◐', '→', '←']
    for (var i = 0; i < FOTOS.length; i++) {
      html += '<div class="bhi-dx-instr-item">'
      html += '<div class="bhi-dx-instr-icon">' + icons[i] + '</div>'
      html += '<div class="bhi-dx-instr-label">' + FOTOS[i].label + '</div>'
      html += '</div>'
    }
    html += '</div>'
    html += '<button type="button" class="bhi-dx-btn bhi-dx-btn-primary" id="bhi-dx-start">Iniciar capturas</button>'
    html += '<button type="button" class="bhi-dx-link" id="bhi-dx-cancel">Fechar</button>'
    // insertAdjacentHTML preserva o closeBtn (X) e seu listener já adicionado
    // via addEventListener — usar innerHTML+= re-parseia tudo e destrói o listener.
    card.insertAdjacentHTML('beforeend', html)
    setTimeout(function () {
      var startBtn = document.getElementById('bhi-dx-start')
      var cancelBtn = document.getElementById('bhi-dx-cancel')
      if (startBtn) startBtn.addEventListener('click', goToStep2)
      if (cancelBtn) cancelBtn.addEventListener('click', closeModal)
    }, 0)
  }

  function goToStep2() {
    state.step = 2
    state.fotoIndex = 0
    state.fotos = [null, null, null, null]
    state.validacoes = [null, null, null, null]
    state.tentativas = [0, 0, 0, 0]
    render()
    // Dispara áudio imediatamente dentro da mesma tarefa síncrona do clique
    // para não ser bloqueado pela política de autoplay em mobile.
    falarInstrucao(FOTOS[0].instrucao)
    startCamera()
  }

  // ─── Step 2: Camera + 4 captures ─────────────────────────────────────────────
  function renderStep2(card) {
    var foto = FOTOS[state.fotoIndex]
    var html = ''

    // Progress thumbs
    html += '<div class="bhi-dx-progress">'
    for (var i = 0; i < FOTOS.length; i++) {
      var cls = 'bhi-dx-progress-thumb'
      if (i === state.fotoIndex) cls += ' is-current'
      else if (state.fotos[i]) cls += ' is-done'
      html += '<div class="' + cls + '" data-idx="' + i + '">' + (i + 1) + '</div>'
    }
    html += '</div>'

    html += '<div class="bhi-dx-step-counter">Foto ' + (state.fotoIndex + 1) + ' de ' + FOTOS.length + '</div>'
    html += '<h3 class="bhi-dx-step-title">' + foto.label + '</h3>'

    html += '<div class="bhi-dx-instruction-line">'
    if (speechSupported) {
      html += '<div class="bhi-dx-audio-icon" aria-hidden="true"><span></span><span></span><span></span></div>'
    }
    html += '<span>' + foto.instrucao + '</span>'
    html += '</div>'

    if (speechSupported) {
      html += '<button type="button" class="bhi-dx-replay" id="bhi-dx-replay">🔊 Ouvir novamente</button>'
    }

    var capturedBlob = state.fotos[state.fotoIndex]
    var validation = (state.validacoes && state.validacoes[state.fotoIndex]) || null
    var tentativas = (state.tentativas && state.tentativas[state.fotoIndex]) || 0
    var hardErrorTypes = { PRETA: 1, DESFOCADA: 1, UNIFORME: 1 }
    var isHardError = validation && !validation.ok && validation.tipo && hardErrorTypes[validation.tipo]
    var imgClass = 'bhi-dx-preview-img'
    if (validation) {
      if (validation.ok) imgClass += ' is-ok'
      else if (isHardError) imgClass += ' is-error'
      else imgClass += ' is-warn'
    }
    html += '<div class="bhi-dx-camera-wrap">'
    if (capturedBlob) {
      var url = URL.createObjectURL(capturedBlob)
      html += '<img src="' + url + '" class="' + imgClass + '" alt="Foto capturada">'
    } else {
      html += '<video class="bhi-dx-video" id="bhi-dx-video" autoplay playsinline muted></video>'
      html += guideSvgHtml(state.fotoIndex)
      html += '<div class="bhi-dx-camera-error" id="bhi-dx-camera-error" style="display:none"></div>'
    }
    html += '</div>'

    if (tentativas > 0) {
      html += '<span class="bhi-dx-tries">Tentativa ' + Math.min(tentativas, MAX_TENTATIVAS) + ' de ' + MAX_TENTATIVAS + '</span>'
    }

    if (validation) {
      var vCls = validation.ok ? 'is-ok' : (isHardError ? 'is-error' : 'is-warn')
      var vIcon = validation.icon || (validation.ok ? '✓' : '⚠')
      html += '<div class="bhi-dx-validation ' + vCls + '">'
      html += '<span class="bhi-dx-validation-icon">' + vIcon + '</span>'
      html += '<div class="bhi-dx-validation-body">'
      html += '<span>' + validation.message + '</span>'
      if (validation.hint) html += '<span class="bhi-dx-validation-hint">' + validation.hint + '</span>'
      html += '</div>'
      html += '</div>'
    }

    if (!capturedBlob) {
      html += '<div class="bhi-dx-shutter"><button type="button" class="bhi-dx-shutter-btn" id="bhi-dx-shutter" aria-label="Capturar foto"></button></div>'
    } else {
      var allowFallback = validation && !validation.ok && tentativas >= MAX_TENTATIVAS
      html += '<div class="bhi-dx-actions">'
      html += '<button type="button" class="bhi-dx-btn bhi-dx-btn-secondary" id="bhi-dx-retake">Refazer</button>'
      var nextLabel = state.fotoIndex === FOTOS.length - 1 ? 'Continuar' : 'Próxima foto'
      var nextDisabled = validation && !validation.ok && !allowFallback ? ' disabled' : ''
      html += '<button type="button" class="bhi-dx-btn bhi-dx-btn-primary" id="bhi-dx-next"' + nextDisabled + '>' + nextLabel + '</button>'
      html += '</div>'
      if (allowFallback) {
        html += '<button type="button" class="bhi-dx-btn bhi-dx-btn-fallback" id="bhi-dx-fallback">Continuar assim mesmo</button>'
      }
    }

    card.insertAdjacentHTML('beforeend', html)

    setTimeout(function () {
      // Hook up video stream
      var video = document.getElementById('bhi-dx-video')
      if (video && state.stream) {
        video.srcObject = state.stream
      }

      var replay = document.getElementById('bhi-dx-replay')
      if (replay) replay.addEventListener('click', function () { falarInstrucao(FOTOS[state.fotoIndex].instrucao) })

      var shutter = document.getElementById('bhi-dx-shutter')
      if (shutter) shutter.addEventListener('click', capturePhoto)

      var retake = document.getElementById('bhi-dx-retake')
      if (retake) retake.addEventListener('click', function () {
        state.fotos[state.fotoIndex] = null
        if (state.validacoes) state.validacoes[state.fotoIndex] = null
        render()
        // re-attach stream
        var v = document.getElementById('bhi-dx-video')
        if (v && state.stream) v.srcObject = state.stream
        falarInstrucao(FOTOS[state.fotoIndex].instrucao)
      })

      var fallback = document.getElementById('bhi-dx-fallback')
      if (fallback) fallback.addEventListener('click', function () {
        if (state.validacoes && state.validacoes[state.fotoIndex]) {
          state.validacoes[state.fotoIndex].ok = true
          state.validacoes[state.fotoIndex]._forced = true
        }
        var btn = document.getElementById('bhi-dx-next')
        if (btn) btn.click()
      })

      var next = document.getElementById('bhi-dx-next')
      if (next) next.addEventListener('click', function () {
        var curVal = state.validacoes && state.validacoes[state.fotoIndex]
        var curTries = (state.tentativas && state.tentativas[state.fotoIndex]) || 0
        if (curVal && !curVal.ok && curTries < MAX_TENTATIVAS) return
        if (state.fotoIndex === FOTOS.length - 1) {
          stopCamera()
          state.step = 3
          render()
        } else {
          state.fotoIndex += 1
          render()
          var v2 = document.getElementById('bhi-dx-video')
          if (v2 && state.stream) v2.srcObject = state.stream
          falarInstrucao(FOTOS[state.fotoIndex].instrucao)
        }
      })
    }, 0)
  }

  function startCamera() {
    if (state.stream) return Promise.resolve(true)
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      showCameraError('Seu navegador não suporta acesso à câmera.')
      return Promise.resolve(false)
    }
    // Constraints: câmera frontal, aspect 1:1 (quadrado força enquadramento mais
    // próximo ao rosto), resolução alvo 1080x1080. O zoom 2.0 é tentado via
    // advanced — se o device não suportar, o fallback CSS scale(1.6) no .bhi-dx-video
    // garante que o frame ainda apareça aproximado.
    return navigator.mediaDevices
      .getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1080 },
          height: { ideal: 1080 },
          aspectRatio: { ideal: 1.0 },
        },
        audio: false,
      })
      .then(function (stream) {
        state.stream = stream
        var video = document.getElementById('bhi-dx-video')
        if (video) video.srcObject = stream
        // Sem zoom nativo — preview e captura no mesmo enquadramento
        return true
      })
      .catch(function (err) {
        console.error('[BHI-DX] Camera error:', err)
        showCameraError('Não foi possível acessar a câmera. Verifique a permissão do navegador e tente novamente.')
        return false
      })
  }

  function showCameraError(msg) {
    var box = document.getElementById('bhi-dx-camera-error')
    if (box) {
      box.style.display = 'flex'
      box.textContent = msg
    }
    var v = document.getElementById('bhi-dx-video')
    if (v) v.style.display = 'none'
    var sh = document.getElementById('bhi-dx-shutter')
    if (sh) sh.disabled = true
  }

  function stopCamera() {
    if (state.stream) {
      try { state.stream.getTracks().forEach(function (t) { t.stop() }) } catch (e) {}
      state.stream = null
    }
  }

  function capturePhoto() {
    var video = document.getElementById('bhi-dx-video')
    if (!video || !video.videoWidth) return

    // Crop centrado de 90% — coincide com a área do molde SVG visível no preview
    // (CSS .bhi-dx-guide ocupa 90% × 90% centralizado). O retrato salvo é
    // exatamente o que o usuário viu encaixado no molde.
    var srcW = video.videoWidth
    var srcH = video.videoHeight
    var GUIDE_RATIO = 0.90
    var cropW = Math.round(srcW * GUIDE_RATIO)
    var cropH = Math.round(srcH * GUIDE_RATIO)
    var cropX = Math.round((srcW - cropW) / 2)
    var cropY = Math.round((srcH - cropH) / 2)

    // Limita resolução final pra não inflar o upload
    var maxOutW = 1080
    var outW = Math.min(cropW, maxOutW)
    var outH = Math.round((outW / cropW) * cropH)

    var canvas = document.createElement('canvas')
    canvas.width = outW
    canvas.height = outH
    var ctx = canvas.getContext('2d')
    // IMPORTANTE: não espelhamos o canvas — o preview é espelhado só via CSS
    // para UX de selfie, mas a imagem enviada ao backend fica na orientação real.
    ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, outW, outH)

    var validation = validatePhoto(ctx, outW, outH)
    var idx = state.fotoIndex
    if (!state.tentativas) state.tentativas = [0, 0, 0, 0]
    state.tentativas[idx] = (state.tentativas[idx] || 0) + 1

    canvas.toBlob(function (blob) {
      if (!blob) return
      // Se passou na validação OU se o usuário já atingiu o limite de tentativas,
      // grava o blob. Caso contrário, mostra o feedback de erro mas mantém o
      // estado de captura para a próxima tentativa.
      if (validation.ok || state.tentativas[idx] >= MAX_TENTATIVAS) {
        state.fotos[idx] = blob
      } else {
        state.fotos[idx] = blob // mantém pra preview, mas com flag de erro
      }
      if (!state.validacoes) state.validacoes = [null, null, null, null]
      state.validacoes[idx] = validation
      pararFala()
      render()
    }, 'image/jpeg', 0.85)
  }

  // ─── Validação de qualidade da foto (client-side) ───────────────────────────
  // Retorna { ok, tipo, message, hint, icon } onde tipo ∈
  //   OK | PRETA | ESCURA | CLARA | DESFOCADA | UNIFORME
  function validatePhoto(ctx, w, h) {
    try {
      var img = ctx.getImageData(0, 0, w, h)
      var data = img.data
      var totalPixels = data.length / 4

      var totalLum = 0
      var blackPx = 0
      var lumas = new Float32Array(totalPixels)

      // Loop completo sobre todos os pixels (cálculo de luminância + contagem
      // de pretos + buffer pra desvio padrão e nitidez)
      for (var i = 0, p = 0; i < data.length; i += 4, p++) {
        var r = data[i]
        var g = data[i + 1]
        var b = data[i + 2]
        var luma = r * 0.299 + g * 0.587 + b * 0.114
        totalLum += luma
        lumas[p] = luma
        if (r < 10 && g < 10 && b < 10) blackPx++
      }

      var avg = totalLum / totalPixels
      var blackRatio = blackPx / totalPixels

      // Desvio padrão da luminância
      var varSum = 0
      for (var k = 0; k < totalPixels; k++) {
        var d = lumas[k] - avg
        varSum += d * d
      }
      var stddev = Math.sqrt(varSum / totalPixels)

      // Nitidez via Laplaciano simplificado (variação horizontal absoluta entre
      // canais R consecutivos). Quanto maior, mais bordas — mais nítida.
      var sharpSum = 0
      for (var j = 0; j < data.length - 4; j += 4) {
        sharpSum += Math.abs(data[j] - data[j + 4])
      }
      var nitidez = sharpSum / totalPixels

      // Validação mínima: só barra fotos claramente inutilizáveis
      // (câmera tampada, escuridão total, estouro total, ou borrão extremo).
      // Não busca foto perfeita — só aceitável.
      if (blackRatio > 0.92) {
        return {
          ok: false,
          tipo: 'PRETA',
          icon: '✗',
          message: 'Câmera bloqueada ou tampada. Verifique se a câmera está desobstruída.',
          hint: '',
        }
      }
      if (avg < 25) {
        return {
          ok: false,
          tipo: 'ESCURA',
          icon: '💡',
          message: 'Ambiente muito escuro. Acenda uma luz e tente novamente.',
          hint: '',
        }
      }
      if (avg > 235) {
        return {
          ok: false,
          tipo: 'CLARA',
          icon: '☀️',
          message: 'Excesso de luz no enquadramento. Afaste-se da luz direta.',
          hint: '',
        }
      }
      // Checagem de nitidez/uniformidade removida — só valida iluminação.
      // (Selfie do rosto pode ter fundo uniforme e leve borrão sem prejudicar
      // a análise. Foco do filtro é só barrar foto preta/escura/estourada.)
      void nitidez; void stddev;
      return {
        ok: true,
        tipo: 'OK',
        icon: '✓',
        message: 'Foto registrada com sucesso.',
        hint: '',
      }
    } catch (e) {
      // Se leitura dos pixels falhar (canvas tainted), aceita a foto
      return { ok: true, tipo: 'OK', icon: '✓', message: 'Foto registrada com sucesso.', hint: '' }
    }
  }

  // ─── Guias visuais SVG por foto (silhuetas realistas de rosto) ──────────────
  // Cada SVG ocupa ~70% da área central do preview (via CSS .bhi-dx-guide) e
  // tem uma animação suave de pulse pra chamar atenção do usuário.
  function guideSvgHtml(idx) {
    // Silhuetas humanas reais (PNG pontilhado branco sobre transparente).
    // Arquivos em assets/face-guides/, gerados a partir do modelo enviado pelo cliente.
    var GUIDES = ['frontal.png', 'top.png', 'right.png', 'left.png']
    var LABELS = [
      'ENCAIXE O ROSTO NA MOLDURA',
      'ABAIXE A CABEÇA E ENQUADRE O TOPO',
      'VIRE O ROSTO PARA A DIREITA',
      'VIRE O ROSTO PARA A ESQUERDA'
    ]
    var src = 'assets/face-guides/' + (GUIDES[idx] || GUIDES[0])
    var label = LABELS[idx] || LABELS[0]

    // Cantos de viewfinder (presentes nos 4 moldes)
    var CORNERS =
      '<path d="M30,80 L30,55 L55,55" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"/>' +
      '<path d="M270,80 L270,55 L245,55" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"/>' +
      '<path d="M30,320 L30,345 L55,345" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"/>' +
      '<path d="M270,320 L270,345 L245,345" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"/>'

    // A silhueta "esquerda" (idx=3) estava desenhada virada pro lado errado.
    // Aplica espelhamento horizontal via SVG transform só nessa imagem —
    // translate(300,0) scale(-1,1) inverte em torno do eixo X central do viewBox.
    var imageTag = idx === 3
      ? '<image href="' + src + '" x="20" y="20" width="260" height="360" preserveAspectRatio="xMidYMid meet" opacity="0.95" transform="translate(300,0) scale(-1,1)"/>'
      : '<image href="' + src + '" x="20" y="20" width="260" height="360" preserveAspectRatio="xMidYMid meet" opacity="0.95"/>'

    var svg =
      '<svg class="bhi-dx-guide" viewBox="0 0 300 400" preserveAspectRatio="xMidYMid meet" aria-hidden="true">' +
        imageTag +
        CORNERS +
      '</svg>'
    return '<div class="bhi-dx-guide-label">' + label + '</div>' + svg
  }

  // ─── Step 3: Form ────────────────────────────────────────────────────────────
  function renderStep3(card) {
    var d = state.formData
    var html = ''
    html += '<h2 class="bhi-dx-h1">Quase lá</h2>'
    html += '<p class="bhi-dx-sub">Para enviar seu laudo, precisamos saber pra quem entregar.</p>'
    html += '<form id="bhi-dx-form" novalidate>'
    html += fieldHtml('nome', 'Nome completo', 'text', d.nome, 'Nome obrigatório')
    html += fieldHtml('email', 'E-mail', 'email', d.email, 'E-mail inválido')
    html += fieldHtml('telefone', 'WhatsApp', 'tel', d.telefone, 'WhatsApp obrigatório')
    html += '<button type="submit" class="bhi-dx-btn bhi-dx-btn-primary" style="margin-top:8px">Enviar para análise</button>'
    html += '</form>'
    card.insertAdjacentHTML('beforeend', html)

    setTimeout(function () {
      var form = document.getElementById('bhi-dx-form')
      var tel = document.getElementById('bhi-dx-field-telefone')
      if (tel) tel.addEventListener('input', function () { tel.value = maskPhone(tel.value) })
      if (form) form.addEventListener('submit', handleSubmit)
    }, 0)
  }

  function fieldHtml(name, label, type, val, errMsg) {
    var safeVal = (val || '').replace(/"/g, '&quot;')
    var s = ''
    s += '<div class="bhi-dx-form-field">'
    s += '<label class="bhi-dx-form-label" for="bhi-dx-field-' + name + '">' + label + '</label>'
    s += '<input class="bhi-dx-form-input" type="' + type + '" id="bhi-dx-field-' + name + '" name="' + name + '" value="' + safeVal + '" autocomplete="' + (name === 'nome' ? 'name' : name === 'email' ? 'email' : 'tel') + '" required>'
    s += '<div class="bhi-dx-form-error" data-for="' + name + '">' + errMsg + '</div>'
    s += '</div>'
    return s
  }

  function maskPhone(v) {
    var d = v.replace(/\D/g, '').slice(0, 11)
    if (d.length <= 10) {
      return d.replace(/^(\d{0,2})(\d{0,4})(\d{0,4}).*/, function (_, a, b, c) {
        var out = ''
        if (a) out += '(' + a
        if (a && a.length === 2) out += ') '
        if (b) out += b
        if (c) out += '-' + c
        return out
      })
    }
    return d.replace(/^(\d{2})(\d{5})(\d{0,4}).*/, '($1) $2-$3')
  }

  function showFieldError(name, show) {
    var el = document.querySelector('.bhi-dx-form-error[data-for="' + name + '"]')
    if (el) el.classList.toggle('is-shown', !!show)
  }

  function handleSubmit(e) {
    e.preventDefault()
    var nome = document.getElementById('bhi-dx-field-nome').value.trim()
    var email = document.getElementById('bhi-dx-field-email').value.trim()
    var telefone = document.getElementById('bhi-dx-field-telefone').value.trim()

    var ok = true
    if (nome.length < 2) { showFieldError('nome', true); ok = false } else showFieldError('nome', false)
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { showFieldError('email', true); ok = false } else showFieldError('email', false)
    var digits = telefone.replace(/\D/g, '')
    if (digits.length < 10) { showFieldError('telefone', true); ok = false } else showFieldError('telefone', false)
    if (!ok) return

    state.formData = { nome: nome, email: email, telefone: telefone }
    submitDiagnostico()
  }

  // ─── Step 4: Loading + Result ────────────────────────────────────────────────
  function renderStep4(card) {
    if (state._success === true) {
      card.insertAdjacentHTML('beforeend',
        '<div class="bhi-dx-result">' +
          '<div class="bhi-dx-result-icon">✓</div>' +
          '<h3>Diagnóstico concluído.</h3>' +
          '<p>Seu laudo técnico foi preparado. Em instantes você receberá no WhatsApp o resultado completo da análise com as recomendações do nosso time.</p>' +
          '<button type="button" class="bhi-dx-btn bhi-dx-btn-primary" id="bhi-dx-close-final">Fechar</button>' +
        '</div>')
      setTimeout(function () {
        var b = document.getElementById('bhi-dx-close-final')
        if (b) b.addEventListener('click', closeModal)
      }, 0)
      return
    }
    if (state._success === false) {
      card.insertAdjacentHTML('beforeend',
        '<div class="bhi-dx-result">' +
          '<div class="bhi-dx-result-icon" style="background:#ff8b8b;color:#fff">!</div>' +
          '<h3>Não conseguimos enviar</h3>' +
          '<p>Ocorreu um problema ao enviar suas imagens. Por favor, tente novamente.</p>' +
          '<button type="button" class="bhi-dx-btn bhi-dx-btn-primary" id="bhi-dx-retry">Tentar novamente</button>' +
        '</div>')
      setTimeout(function () {
        var b = document.getElementById('bhi-dx-retry')
        if (b) b.addEventListener('click', function () {
          state._success = null
          state.step = 3
          render()
        })
      }, 0)
      return
    }
    // loading
    card.insertAdjacentHTML('beforeend',
      '<div class="bhi-dx-loading">' +
        '<div class="bhi-dx-spinner"></div>' +
        '<div class="bhi-dx-loading-text" id="bhi-dx-loading-text">' + LOADING_MESSAGES[0] + '</div>' +
      '</div>')

    // close button hidden during loading (we removed it earlier in render())
  }

  function startLoadingRotation() {
    state.loadingIdx = 0
    if (state.loadingTimer) clearInterval(state.loadingTimer)
    state.loadingTimer = setInterval(function () {
      state.loadingIdx = (state.loadingIdx + 1) % LOADING_MESSAGES.length
      var el = document.getElementById('bhi-dx-loading-text')
      if (!el) return
      el.style.opacity = '0'
      setTimeout(function () {
        if (el) {
          el.textContent = LOADING_MESSAGES[state.loadingIdx]
          el.style.opacity = '1'
        }
      }, 280)
    }, 3000)
  }

  function stopLoadingRotation() {
    if (state.loadingTimer) {
      clearInterval(state.loadingTimer)
      state.loadingTimer = null
    }
  }

  // ─── Submissão ───────────────────────────────────────────────────────────────
  function submitDiagnostico() {
    state.step = 4
    state._success = null
    render()
    startLoadingRotation()

    var fd = new FormData()
    fd.append('nome', state.formData.nome)
    fd.append('email', state.formData.email)
    fd.append('telefone', state.formData.telefone)
    for (var i = 0; i < FOTOS.length; i++) {
      var blob = state.fotos[i]
      if (blob) fd.append(FOTOS[i].field, blob, FOTOS[i].field + '.jpg')
    }

    var ctrl = ('AbortController' in window) ? new AbortController() : null
    var timeout = setTimeout(function () { if (ctrl) ctrl.abort() }, 90000)

    fetch(API_URL, {
      method: 'POST',
      body: fd,
      signal: ctrl ? ctrl.signal : undefined,
    })
      .then(function (res) {
        clearTimeout(timeout)
        if (!res.ok) throw new Error('HTTP ' + res.status)
        return res.json().catch(function () { return {} })
      })
      .then(function () {
        stopLoadingRotation()
        state._success = true
        render()
        try {
          if (typeof window.gtag === 'function') {
            window.gtag('event', 'diagnostico_enviado', { event_category: 'Diagnostico' })
          }
          // Meta Pixel — evento Lead com parâmetros completos para otimização
          // algorítmica do Meta Ads (ticket médio da cirurgia capilar).
          if (typeof window.fbq === 'function') {
            window.fbq('track', 'Lead', {
              content_name: 'Diagnóstico Capilar BHI',
              content_category: 'Transplante Capilar',
              currency: 'BRL',
              value: 20000
            })
          }
        } catch (e) {}
      })
      .catch(function (err) {
        clearTimeout(timeout)
        console.error('[BHI-DX] submit failed:', err)
        stopLoadingRotation()
        state._success = false
        render()
      })
  }

  // ─── Open / Close ────────────────────────────────────────────────────────────
  function openModal() {
    injectAssets()
    state = {
      step: 1,
      fotoIndex: 0,
      fotos: [null, null, null, null],
      validacoes: [null, null, null, null],
      tentativas: [0, 0, 0, 0],
      stream: null,
      formData: { nome: '', email: '', telefone: '' },
      loadingTimer: null,
      loadingIdx: 0,
      _success: null,
    }
    render()
    document.documentElement.style.overflow = 'hidden'
    document.addEventListener('keydown', escListener)
  }

  function closeModal() {
    pararFala()
    stopCamera()
    stopLoadingRotation()
    if (rootEl) rootEl.innerHTML = ''
    document.documentElement.style.overflow = ''
    document.removeEventListener('keydown', escListener)
  }

  function escListener(e) {
    var isLoadingStep = state.step === 4 && state._success === null
    if (e.key === 'Escape' && !isLoadingStep) closeModal()
  }

  // ─── Auto-wire de CTAs ───────────────────────────────────────────────────────
  // Religa todos os CTAs do site institucional pra abrir o modal sem mexer no
  // HTML de cada página. Cobre 3 padrões:
  //   1. Qualquer link cujo href termine em "#portal" (convenção do site —
  //      todos os botões "Iniciar Diagnóstico", "Agendar Avaliação", "Iniciar
  //      Diagnóstico por IA", "Diagnóstico Gratuito", etc. apontam pra cá).
  //   2. Qualquer link pro WhatsApp do BHI (wa.me/5547992495146 ou API),
  //      conforme especificação que pede para botões "Falar no WhatsApp"
  //      também caírem no fluxo do modal.
  //   3. Escape hatch via atributo HTML: data-bhi-dx="open"
  //
  // Roda no DOMContentLoaded e novamente após mudanças via MutationObserver
  // (alguns botões mobile são injetados dinamicamente pelo menu hambúrguer).
  var BHI_PHONE_DIGITS = '5547992495146'

  function isCtaCandidate(el) {
    if (!el || el.dataset && el.dataset.bhiDxBound === '1') return false
    if (el.hasAttribute && el.hasAttribute('data-bhi-dx')) return true
    if (el.tagName !== 'A') return false
    var href = el.getAttribute('href') || ''
    if (!href) return false
    // Match exato ou termina em "#portal" (substring no fim, evitando falso
    // positivo do bug de length-7 com indexOf retornando -1)
    var idxPortal = href.indexOf('#portal')
    if (idxPortal !== -1 && idxPortal === href.length - 7) return true
    if (href.indexOf('wa.me/' + BHI_PHONE_DIGITS) !== -1) return true
    if (href.indexOf('api.whatsapp.com/send') !== -1 && href.indexOf(BHI_PHONE_DIGITS) !== -1) return true
    return false
  }

  function bindCta(el) {
    if (!el || (el.dataset && el.dataset.bhiDxBound === '1')) return
    el.addEventListener('click', function (e) {
      e.preventDefault()
      e.stopPropagation()
      try {
        if (typeof window.gtag === 'function') {
          window.gtag('event', 'open_diagnostic_modal', {
            event_category: 'Diagnostico',
            event_label: el.textContent.trim().slice(0, 80) || el.getAttribute('aria-label') || 'cta',
          })
        }
      } catch (e2) {}
      openModal()
      return false
    }, true)
    if (el.dataset) el.dataset.bhiDxBound = '1'
  }

  function autoWireCTAs(root) {
    var scope = root || document
    var nodes = scope.querySelectorAll('a, [data-bhi-dx]')
    for (var i = 0; i < nodes.length; i++) {
      if (isCtaCandidate(nodes[i])) bindCta(nodes[i])
    }
  }

  function initAutoWire() {
    autoWireCTAs(document)
    // Observa o DOM pra capturar CTAs adicionados depois do load (ex.: menus
    // mobile lazy, modais de outras features, etc.)
    if (typeof MutationObserver !== 'undefined') {
      var mo = new MutationObserver(function (mutations) {
        for (var i = 0; i < mutations.length; i++) {
          var m = mutations[i]
          for (var j = 0; j < m.addedNodes.length; j++) {
            var n = m.addedNodes[j]
            if (n.nodeType === 1) {
              if (isCtaCandidate(n)) bindCta(n)
              if (n.querySelectorAll) autoWireCTAs(n)
            }
          }
        }
      })
      mo.observe(document.documentElement || document.body, { childList: true, subtree: true })
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAutoWire)
  } else {
    initAutoWire()
  }

  // Expor API global
  window.openDiagnosticModal = openModal
  window.closeDiagnosticModal = closeModal
})()
