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
    stream: null,
    formData: { nome: '', email: '', telefone: '' },
    loadingTimer: null,
    loadingIdx: 0,
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
.bhi-dx-camera-wrap{position:relative;width:100%;aspect-ratio:3/4;max-height:48vh;background:#000;border-radius:10px;overflow:hidden;margin:6px 0 16px}
.bhi-dx-video,.bhi-dx-preview-img{width:100%;height:100%;object-fit:cover;display:block}
.bhi-dx-video{transform:scaleX(-1)}
.bhi-dx-guide{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:5}
.bhi-dx-guide-label{position:absolute;top:10px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,.55);color:#fff;font-size:11px;letter-spacing:.5px;padding:6px 12px;border-radius:14px;text-align:center;white-space:nowrap;max-width:90%;overflow:hidden;text-overflow:ellipsis}
.bhi-dx-preview-img.is-ok{outline:3px solid #1D9E75;outline-offset:-3px}
.bhi-dx-preview-img.is-warn{outline:3px solid #EF9F27;outline-offset:-3px}
.bhi-dx-validation{margin:-8px 0 10px;padding:10px 12px;border-radius:8px;font-size:12px;line-height:1.45;display:flex;gap:8px;align-items:flex-start}
.bhi-dx-validation.is-ok{background:rgba(29,158,117,.12);border:1px solid rgba(29,158,117,.4);color:#7fe0b6}
.bhi-dx-validation.is-warn{background:rgba(239,159,39,.12);border:1px solid rgba(239,159,39,.45);color:#ffd596}
.bhi-dx-validation-icon{flex-shrink:0;font-size:14px;line-height:1}
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
    card.innerHTML += html
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
    var imgClass = 'bhi-dx-preview-img'
    if (validation) imgClass += validation.ok ? ' is-ok' : ' is-warn'
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

    if (validation) {
      var vCls = validation.ok ? 'is-ok' : 'is-warn'
      var vIcon = validation.ok ? '✓' : '⚠'
      html += '<div class="bhi-dx-validation ' + vCls + '">'
      html += '<span class="bhi-dx-validation-icon">' + vIcon + '</span>'
      html += '<span>' + validation.message + '</span>'
      html += '</div>'
    }

    if (!capturedBlob) {
      html += '<div class="bhi-dx-shutter"><button type="button" class="bhi-dx-shutter-btn" id="bhi-dx-shutter" aria-label="Capturar foto"></button></div>'
    } else {
      html += '<div class="bhi-dx-actions">'
      html += '<button type="button" class="bhi-dx-btn bhi-dx-btn-secondary" id="bhi-dx-retake">Refazer</button>'
      var nextLabel = state.fotoIndex === FOTOS.length - 1 ? 'Continuar' : 'Próxima foto'
      var nextDisabled = validation && !validation.ok ? ' disabled' : ''
      html += '<button type="button" class="bhi-dx-btn bhi-dx-btn-primary" id="bhi-dx-next"' + nextDisabled + '>' + nextLabel + '</button>'
      html += '</div>'
    }

    card.innerHTML += html

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

      var next = document.getElementById('bhi-dx-next')
      if (next) next.addEventListener('click', function () {
        var curVal = state.validacoes && state.validacoes[state.fotoIndex]
        if (curVal && !curVal.ok) return
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
    return navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'user' }, audio: false })
      .then(function (stream) {
        state.stream = stream
        var video = document.getElementById('bhi-dx-video')
        if (video) video.srcObject = stream
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
    var canvas = document.createElement('canvas')
    var maxW = 1280
    var ratio = video.videoWidth / video.videoHeight
    var w = Math.min(video.videoWidth, maxW)
    var h = Math.round(w / ratio)
    canvas.width = w
    canvas.height = h
    var ctx = canvas.getContext('2d')
    // IMPORTANTE: não espelhamos o canvas — o preview é espelhado só via CSS
    // para UX de selfie, mas a imagem enviada ao backend fica na orientação real.
    ctx.drawImage(video, 0, 0, w, h)
    var validation = validatePhoto(ctx, w, h)
    canvas.toBlob(function (blob) {
      if (!blob) return
      state.fotos[state.fotoIndex] = blob
      if (!state.validacoes) state.validacoes = [null, null, null, null]
      state.validacoes[state.fotoIndex] = validation
      pararFala()
      render()
    }, 'image/jpeg', 0.85)
  }

  // ─── Validação de qualidade da foto (client-side) ───────────────────────────
  function validatePhoto(ctx, w, h) {
    try {
      // Amostragem 1 em cada 4x4 pixels (reduz custo sem perder precisão útil)
      var step = 4
      var img = ctx.getImageData(0, 0, w, h)
      var data = img.data
      var total = 0
      var sum = 0
      var blackish = 0
      var lumas = []
      for (var y = 0; y < h; y += step) {
        for (var x = 0; x < w; x += step) {
          var i = (y * w + x) * 4
          var r = data[i]
          var g = data[i + 1]
          var b = data[i + 2]
          var luma = r * 0.299 + g * 0.587 + b * 0.114
          sum += luma
          lumas.push(luma)
          if (r < 10 && g < 10 && b < 10) blackish++
          total++
        }
      }
      if (total === 0) return { ok: true, message: 'Foto registrada com sucesso' }
      var avg = sum / total
      // Desvio padrão
      var varSum = 0
      for (var k = 0; k < lumas.length; k++) {
        var d = lumas[k] - avg
        varSum += d * d
      }
      var stddev = Math.sqrt(varSum / total)
      var blackRatio = blackish / total

      if (blackRatio > 0.9) {
        return { ok: false, message: 'Foto fora do padrão. Mantenha a câmera estável e tente novamente.' }
      }
      if (avg < 40) {
        return { ok: false, message: 'Foto muito escura. Vá para um local com mais luz e tente novamente.' }
      }
      if (avg > 220) {
        return { ok: false, message: 'Foto com excesso de luz. Evite luz direta e tente novamente.' }
      }
      if (stddev < 15) {
        return { ok: false, message: 'Foto fora do padrão. Mantenha a câmera estável e tente novamente.' }
      }
      return { ok: true, message: 'Foto registrada com sucesso' }
    } catch (e) {
      // Se leitura dos pixels falhar (ex: canvas tainted), aceita a foto
      return { ok: true, message: 'Foto registrada com sucesso' }
    }
  }

  // ─── Guias visuais SVG por foto ─────────────────────────────────────────────
  function guideSvgHtml(idx) {
    var STROKE = 'stroke="rgba(255,255,255,0.6)" stroke-width="2" stroke-dasharray="8 4" fill="none"'
    var svgInner = ''
    var label = ''
    if (idx === 0) {
      // Frente: elipse centrada no terço superior + linha do cabelo
      label = 'Centralize seu rosto aqui'
      svgInner =
        '<ellipse cx="150" cy="130" rx="78" ry="100" ' + STROKE + '/>' +
        '<line x1="80" y1="85" x2="220" y2="85" ' + STROKE + '/>'
    } else if (idx === 1) {
      // Topo: círculo centralizado
      label = 'Abaixe a cabeça — topo centralizado'
      svgInner = '<circle cx="150" cy="200" r="105" ' + STROKE + '/>'
    } else if (idx === 2) {
      // Lateral direita: elipse inclinada
      label = 'Vire para a direita até o ombro'
      svgInner =
        '<ellipse cx="150" cy="180" rx="75" ry="105" transform="rotate(-8 150 180)" ' + STROKE + '/>'
    } else {
      // Lateral esquerda: espelhada
      label = 'Vire para a esquerda até o ombro'
      svgInner =
        '<ellipse cx="150" cy="180" rx="75" ry="105" transform="rotate(8 150 180)" ' + STROKE + '/>'
    }
    var svg =
      '<svg class="bhi-dx-guide" viewBox="0 0 300 400" preserveAspectRatio="xMidYMid meet" aria-hidden="true">' +
      svgInner + '</svg>'
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
    card.innerHTML += html

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
      card.innerHTML +=
        '<div class="bhi-dx-result">' +
          '<div class="bhi-dx-result-icon">✓</div>' +
          '<h3>Diagnóstico concluído.</h3>' +
          '<p>Seu laudo técnico foi preparado. Em instantes você receberá no WhatsApp o resultado completo da análise com as recomendações do nosso time.</p>' +
          '<button type="button" class="bhi-dx-btn bhi-dx-btn-primary" id="bhi-dx-close-final">Fechar</button>' +
        '</div>'
      setTimeout(function () {
        var b = document.getElementById('bhi-dx-close-final')
        if (b) b.addEventListener('click', closeModal)
      }, 0)
      return
    }
    if (state._success === false) {
      card.innerHTML +=
        '<div class="bhi-dx-result">' +
          '<div class="bhi-dx-result-icon" style="background:#ff8b8b;color:#fff">!</div>' +
          '<h3>Não conseguimos enviar</h3>' +
          '<p>Ocorreu um problema ao enviar suas imagens. Por favor, tente novamente.</p>' +
          '<button type="button" class="bhi-dx-btn bhi-dx-btn-primary" id="bhi-dx-retry">Tentar novamente</button>' +
        '</div>'
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
    card.innerHTML +=
      '<div class="bhi-dx-loading">' +
        '<div class="bhi-dx-spinner"></div>' +
        '<div class="bhi-dx-loading-text" id="bhi-dx-loading-text">' + LOADING_MESSAGES[0] + '</div>' +
      '</div>'

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
          if (typeof window.fbq === 'function') {
            window.fbq('track', 'Lead', { content_name: 'Diagnostico Capilar' })
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
