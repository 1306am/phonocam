(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const els = {
    cameraPreview: $('cameraPreview'), cameraEmpty: $('cameraEmpty'), cameraState: $('cameraState'),
    startCamera: $('startCamera'), stopCamera: $('stopCamera'), switchCamera: $('switchCamera'),
    toggleGuide: $('toggleGuide'), guideLayer: $('guideLayer'), viewfinderTop: $('viewfinderTop'),
    viewfinderBottom: $('viewfinderBottom'), actualResolution: $('actualResolution'), actualFps: $('actualFps'),
    statusText: $('statusText'), statusLine: document.querySelector('.status-line'),
    recordButton: $('recordButton'), recState: $('recState'), recTimer: $('recTimer'),
    clipPanel: $('clipPanel'), recordedPreview: $('recordedPreview'), videoFormat: $('videoFormat'),
    downloadVideo: $('downloadVideo'), fpsSelect: $('fpsSelect'), resolutionSelect: $('resolutionSelect'),
    exposureSelect: $('exposureSelect'), isoRange: $('isoRange'), isoValue: $('isoValue'),
    focusSelect: $('focusSelect'), manualBadge: $('manualBadge'), manualNote: $('manualNote'),
    captureTab: $('captureTab'), syncTab: $('syncTab'), capturePanel: $('capturePanel'), syncPanel: $('syncPanel'),
    rpmSelect: $('rpmSelect'), customRpm: $('customRpm'), customRpmRow: $('customRpmRow'),
    drawingCount: $('drawingCount'), minusDrawings: $('minusDrawings'), plusDrawings: $('plusDrawings'),
    stepSelect: $('stepSelect'), idealFps: $('idealFps'), syncExplain: $('syncExplain'),
    fpsSuggestion: $('fpsSuggestion'), useSyncFps: $('useSyncFps'),
    fpsRange: $('fpsRange'), fpsRangeValue: $('fpsRangeValue'), focusModeButton: $('focusModeButton'),
    cameraHud: $('cameraHud'), hudTitle: $('hudTitle'), hudValue: $('hudValue'),
    hudHint: $('hudHint'), hudFpsRange: $('hudFpsRange'), hudShutterSelect: $('hudShutterSelect'),
    hudIsoRange: $('hudIsoRange'), hudFocusSelect: $('hudFocusSelect'),
    hudFpsTab: $('hudFpsTab'), hudShutterTab: $('hudShutterTab'), hudIsoTab: $('hudIsoTab'),
    hudFocusTab: $('hudFocusTab'), hudFpsLabel: $('hudFpsLabel'), hudShutterLabel: $('hudShutterLabel'),
    hudIsoLabel: $('hudIsoLabel'), hudFocusLabel: $('hudFocusLabel'),
    hudGuides: $('hudGuides'), hudSwapCamera: $('hudSwapCamera'), hudFit: $('hudFit'), hudRecord: $('hudRecord'),
    hudClip: $('hudClip'), hudAdvanced: $('hudAdvanced'), hudPower: $('hudPower'),
    closeAdvanced: $('closeAdvanced'), closeClip: $('closeClip'),
  };
  const supportedFps = [12, 15, 24, 25, 30, 60];
  let studioMode = false;
  let hudMode = 'fps';
  let fitFrame = false;
  function setStudioMode(enabled) {
    studioMode = enabled;
    document.body.classList.toggle('studio-mode', enabled);
    if (!enabled) {
      document.body.classList.remove('advanced-open', 'clip-open');
      els.hudAdvanced?.setAttribute('aria-expanded', 'false');
    }
    els.focusModeButton.setAttribute('aria-pressed', String(enabled));
    els.focusModeButton.setAttribute('aria-label', enabled ? 'Salir del modo estudio' : 'Entrar al modo estudio');
    els.focusModeButton.title = enabled ? 'Volver al diseño completo' : 'Mantener la cámara a la vista';
    els.focusModeButton.textContent = enabled ? '⤡' : '⤢';
    const studioStatus = document.getElementById('studioStatus');
    if (studioStatus) studioStatus.textContent = enabled ? 'STUDIO MODE · LIVE' : 'PHONOTROPE MODE';
  }
  function syncFpsControls() {
    const idx = supportedFps.indexOf(Number(els.fpsSelect.value));
    if (idx >= 0) {
      els.fpsRange.value = String(idx);
      els.fpsRangeValue.textContent = supportedFps[idx] + ' FPS';
      renderHud();
    }
  }
  let stream = null, videoTrack = null, facingMode = 'environment';
  let recorder = null, parts = [], recordingStarted = 0, timerId = null, videoUrl = null;
  let guideEnabled = true, busy = false, currentCapabilities = {};
  let syncRecommendation = 24;
  const presets = [60, 125, 250, 500, 1000, 2000, 4000];

  function status(message, mode = 'normal') {
    els.statusText.textContent = message;
    els.statusLine.classList.toggle('online', mode === 'online');
    els.statusLine.classList.toggle('error', mode === 'error');
  }

  function clamp(value, low, high) { return Math.min(high, Math.max(low, value)); }
  function round2(num) { return Math.round(num * 100) / 100; }
  function isNumberRange(obj) { return obj && Number.isFinite(obj.min) && Number.isFinite(obj.max); }


  // Overlay controls mirror the same native browser constraints as the full settings.
  // The HUD overlays the preview only; none of these elements are written to the video file.
  function mirrorOptions(source, destination) {
    destination.replaceChildren(...Array.from(source.options,
      (item) => new Option(item.text, item.value, item.defaultSelected, item.selected)));
    destination.value = source.value;
  }

  function renderHud() {
    const recording = recorder?.state === 'recording';
    const fps = Number(els.fpsSelect.value);
    const i = supportedFps.indexOf(fps);
    if (i >= 0) els.hudFpsRange.value = String(i);
    els.hudFpsRange.disabled = recording || !stream;
    els.hudFpsLabel.textContent = String(fps);
    mirrorOptions(els.exposureSelect, els.hudShutterSelect);
    mirrorOptions(els.focusSelect, els.hudFocusSelect);
    els.hudShutterSelect.disabled = recording || els.exposureSelect.disabled;
    els.hudFocusSelect.disabled = recording || els.focusSelect.disabled;
    els.hudIsoRange.min = els.isoRange.min;
    els.hudIsoRange.max = els.isoRange.max;
    els.hudIsoRange.step = els.isoRange.step;
    els.hudIsoRange.value = els.isoRange.value;
    els.hudIsoRange.disabled = recording || els.isoRange.disabled;
    els.hudShutterLabel.textContent = els.exposureSelect.disabled ? '—'
      : (els.exposureSelect.value ? '1/' + els.exposureSelect.value : 'SET');
    els.hudIsoLabel.textContent = els.isoRange.disabled ? '—'
      : (els.isoValue.textContent === 'sin verificar' ? '?' : els.isoRange.value);
    const focusLabels = { continuous: 'AUTO', 'single-shot': 'SINGLE', manual: 'LOCK' };
    els.hudFocusLabel.textContent = els.focusSelect.disabled ? '—'
      : (focusLabels[els.focusSelect.value] || 'SET');
    els.hudShutterTab.classList.toggle('is-unavailable', els.exposureSelect.disabled);
    els.hudIsoTab.classList.toggle('is-unavailable', els.isoRange.disabled);
    els.hudFocusTab.classList.toggle('is-unavailable', els.focusSelect.disabled);
    els.hudRecord.classList.toggle('is-recording', recording);
    els.hudRecord.disabled = !stream || els.recordButton.disabled;
    els.hudRecord.setAttribute('aria-label', recording ? 'Detener grabación' : 'Iniciar grabación');
    els.hudSwapCamera.disabled = recording || !stream;
    els.hudPower.disabled = recording || !stream;
    els.hudAdvanced.disabled = recording;
    els.hudGuides.classList.toggle('is-active', guideEnabled);
    els.hudClip.hidden = !videoUrl || recording;
    updateHudMode();
  }

  function updateHudMode() {
    const config = {
      fps: { tab: els.hudFpsTab, input: els.hudFpsRange, name: 'FRAME RATE', label: els.hudFpsLabel },
      shutter: { tab: els.hudShutterTab, input: els.hudShutterSelect, name: 'SHUTTER / EXPOSURE', label: els.hudShutterLabel },
      iso: { tab: els.hudIsoTab, input: els.hudIsoRange, name: 'ISO', label: els.hudIsoLabel },
      focus: { tab: els.hudFocusTab, input: els.hudFocusSelect, name: 'FOCUS MODE', label: els.hudFocusLabel }
    };
    Object.entries(config).forEach(([key, item]) => {
      const active = key === hudMode;
      item.tab.classList.toggle('is-selected', active);
      item.tab.setAttribute('aria-pressed', String(active));
      item.input.hidden = !active;
    });
    const active = config[hudMode];
    els.hudTitle.textContent = active.name;
    const isUnavailable = active.input.disabled;
    els.hudValue.textContent = isUnavailable ? 'NO DISPONIBLE'
      : hudMode === 'fps' ? active.label.textContent + ' FPS' : active.label.textContent;
    els.hudHint.textContent = recorder?.state === 'recording'
      ? 'Detén la grabación para cambiar estos parámetros.'
      : isUnavailable && hudMode !== 'fps'
        ? 'Tu navegador no permite ajustar este parámetro manualmente.'
        : hudMode === 'fps'
          ? 'FPS solicitados. Desliza y suelta; comprueba el valor real en LIVE.'
          : 'Ajuste solicitado a la cámara. Comprueba la confirmación debajo del visor.';
  }

  function showHudMode(which) {
    hudMode = which;
    updateHudMode();
  }

  function closeAdvanced() {
    document.body.classList.remove('advanced-open');
    els.hudAdvanced.setAttribute('aria-expanded', 'false');
  }

  function toggleAdvanced() {
    if (!studioMode) {
      document.querySelector('.settings-panel')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    const willOpen = !document.body.classList.contains('advanced-open');
    document.body.classList.remove('clip-open');
    document.body.classList.toggle('advanced-open', willOpen);
    els.hudAdvanced.setAttribute('aria-expanded', String(willOpen));
  }

  function openClip() {
    if (!videoUrl) return;
    if (studioMode) {
      closeAdvanced();
      document.body.classList.add('clip-open');
    } else {
      els.clipPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function setCameraUI(enabled) {
    els.cameraEmpty.hidden = enabled;
    els.cameraPreview.style.display = enabled ? 'block' : 'none';
    els.viewfinderTop.hidden = !enabled;
    els.viewfinderBottom.hidden = !enabled;
    els.guideLayer.hidden = !enabled || !guideEnabled;
    els.cameraHud.hidden = !enabled;
    document.body.classList.toggle('camera-live', enabled);
    if (!enabled) {
      closeAdvanced();
      document.body.classList.remove('clip-open');
    }
    els.recordButton.disabled = !enabled;
    els.stopCamera.disabled = !enabled;
    els.switchCamera.disabled = !enabled;
    els.cameraState.classList.toggle('online', enabled);
    els.cameraState.innerHTML = enabled
      ? '<span class="pill-dot"></span> CÁMARA ACTIVA'
      : '<span class="pill-dot"></span> CÁMARA APAGADA';
    renderHud();
  }

  function updateActualSettings() {
    if (!videoTrack) return;
    const actual = typeof videoTrack.getSettings === 'function' ? videoTrack.getSettings() : {};
    els.actualResolution.textContent = actual.width && actual.height ? `${actual.width} × ${actual.height}` : 'Resolución no informada';
    els.actualFps.textContent = Number.isFinite(actual.frameRate) ? `${round2(actual.frameRate)} FPS` : 'FPS no informados';
    return actual;
  }

  function resetManualControls() {
    currentCapabilities = {};
    els.exposureSelect.replaceChildren(new Option('No disponible', ''));
    els.focusSelect.replaceChildren(new Option('No disponible', ''));
    els.exposureSelect.disabled = true;
    els.isoRange.disabled = true;
    els.focusSelect.disabled = true;
    els.isoValue.textContent = '—';
    els.manualBadge.textContent = 'NO DETECTADO';
    els.manualBadge.classList.remove('supported');
    els.manualNote.textContent = 'Este navegador no expone los controles manuales. Prueba otra combinación de teléfono/navegador o utiliza una app nativa.';
    renderHud();
  }

  function setupManualControls() {
    resetManualControls();
    if (!videoTrack || typeof videoTrack.getCapabilities !== 'function') return;
    try { currentCapabilities = videoTrack.getCapabilities() || {}; } catch (_) { return; }
    const cap = currentCapabilities;
    const manualExposure = Array.isArray(cap.exposureMode) && cap.exposureMode.includes('manual');
    let controls = 0;

    // W3C Image Capture uses units of 100 microseconds for exposureTime.
    if (manualExposure && isNumberRange(cap.exposureTime)) {
      const available = presets.filter((denom) => {
        const units = 10000 / denom;
        return units >= cap.exposureTime.min && units <= cap.exposureTime.max;
      });
      if (available.length) {
        els.exposureSelect.replaceChildren(new Option('Seleccionar…', ''));
        available.forEach((denom) => els.exposureSelect.add(new Option(`1/${denom} s`, String(denom))));
        els.exposureSelect.disabled = false;
        controls++;
      }
    }
    if (manualExposure && isNumberRange(cap.iso)) {
      els.isoRange.min = String(cap.iso.min);
      els.isoRange.max = String(cap.iso.max);
      els.isoRange.step = String(cap.iso.step > 0 ? cap.iso.step : 1);
      const settings = videoTrack.getSettings?.() || {};
      els.isoRange.value = String(clamp(settings.iso ?? cap.iso.min, cap.iso.min, cap.iso.max));
      els.isoValue.textContent = settings.iso ? String(settings.iso) : 'sin verificar';
      els.isoRange.disabled = false;
      controls++;
    }
    if (Array.isArray(cap.focusMode) && cap.focusMode.length) {
      els.focusSelect.replaceChildren(new Option('Seleccionar…', ''));
      cap.focusMode.forEach((mode) => {
        const labels = { continuous: 'Automático continuo', 'single-shot': 'Un enfoque', manual: 'Manual (bloqueado)' };
        els.focusSelect.add(new Option(labels[mode] || mode, mode));
      });
      els.focusSelect.disabled = false;
      controls++;
    }

    if (controls > 0) {
      els.manualBadge.textContent = `${controls} CONTROL${controls > 1 ? 'ES' : ''} DISPONIBLE${controls > 1 ? 'S' : ''}`;
      els.manualBadge.classList.add('supported');
      els.manualNote.textContent = 'Los ajustes se envían al hardware. Comprueba el mensaje de confirmación: si el navegador no reporta el valor aplicado, no podemos verificar el cambio.';
    }
    renderHud();
  }

  async function applyManual(settings, field, expected) {
    if (!videoTrack || recorder?.state === 'recording') return;
    try {
      await videoTrack.applyConstraints({ advanced: [settings] });
      const actual = videoTrack.getSettings?.() || {};
      if (actual[field] === undefined) {
        status(`${field}: solicitado, pero el navegador no permite verificar su aplicación.`);
      } else if (typeof expected === 'number' && Math.abs(actual[field] - expected) > Math.max(0.01, expected * 0.03)) {
        status(`${field}: valor aplicado ${round2(actual[field])}; se solicitó ${round2(expected)}.`, 'error');
      } else if (actual[field] !== expected && typeof expected !== 'number') {
        status(`${field}: el navegador reporta “${actual[field]}”, no “${expected}”.`, 'error');
      } else {
        status(`${field}: cambio verificado (${actual[field]}).`, 'online');
      }
      updateActualSettings();
    } catch (err) { status(`No se pudo aplicar ${field}: ${err.message}`, 'error'); }
    renderHud();
  }

  async function startCamera() {
    if (busy || stream) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      status('Este navegador no ofrece acceso a cámara. Abre la app por HTTPS en Safari o Chrome.', 'error');
      return;
    }
    busy = true;
    els.startCamera.disabled = true;
    status('Solicitando permiso para utilizar la cámara…');
    const [width, height] = els.resolutionSelect.value.split('x').map(Number);
    const video = { facingMode: { ideal: facingMode }, width: { ideal: width }, height: { ideal: height }, frameRate: { ideal: Number(els.fpsSelect.value) } };
    try {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video, audio: false });
      } catch (firstError) {
        // Fallback for a device/browser that rejects requested capture settings.
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: facingMode } }, audio: false });
      }
      videoTrack = stream.getVideoTracks()[0];
      els.cameraPreview.srcObject = stream;
      await els.cameraPreview.play();
      setCameraUI(true);
      updateActualSettings();
      setupManualControls();
      status('Cámara activa. Revisa los FPS efectivos en el monitor.', 'online');
    } catch (err) {
      cleanupStream();
      const msg = err.name === 'NotAllowedError'
        ? 'Permiso denegado. Autoriza la cámara en los ajustes del navegador.'
        : `No se pudo iniciar la cámara (${err.name || 'error'}). ${err.message || ''}`;
      status(msg, 'error');
    } finally { busy = false; els.startCamera.disabled = false; }
  }

  function cleanupStream() {
    if (stream) stream.getTracks().forEach((track) => track.stop());
    stream = null; videoTrack = null;
    els.cameraPreview.pause();
    els.cameraPreview.srcObject = null;
    setCameraUI(false);
    resetManualControls();
    els.actualResolution.textContent = '—';
    els.actualFps.textContent = '— FPS';
  }

  function stopCamera() {
    if (recorder?.state === 'recording') return;
    cleanupStream();
    status('Cámara desactivada. Tu última grabación sigue disponible.');
  }

  async function applyCaptureSettings() {
    if (!videoTrack || recorder?.state === 'recording') return;
    const [width, height] = els.resolutionSelect.value.split('x').map(Number);
    const frameRate = Number(els.fpsSelect.value);
    try {
      await videoTrack.applyConstraints({ width: { ideal: width }, height: { ideal: height }, frameRate: { ideal: frameRate } });
      const actual = updateActualSettings() || {};
      status(`Solicitado ${width}×${height} a ${frameRate} FPS. Real: ${actual.width || '?'}×${actual.height || '?'} a ${actual.frameRate || '?'} FPS.`, 'online');
      setupManualControls();
    } catch (err) { status(`El teléfono no aceptó el cambio: ${err.message}`, 'error'); }
  }

  function chooseMimeType() {
    if (typeof MediaRecorder === 'undefined') return '';
    const types = [
      'video/mp4;codecs=avc1.42E01E', 'video/mp4',
      'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'
    ];
    return types.find((type) => MediaRecorder.isTypeSupported(type)) || '';
  }

  function formatTimer(seconds) {
    return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  }

  function updateRecordTimer() {
    els.recTimer.textContent = formatTimer(Math.floor((Date.now() - recordingStarted) / 1000));
  }

  function startRecording() {
    if (!stream || recorder?.state === 'recording') return;
    if (typeof MediaRecorder === 'undefined') {
      status('Este navegador no soporta MediaRecorder. Usa Safari o Chrome actualizado.', 'error');
      return;
    }
    const requestedMime = chooseMimeType();
    try {
      // Let the browser choose a supported format when isTypeSupported cannot identify one.
      recorder = new MediaRecorder(stream, requestedMime
        ? { mimeType: requestedMime, videoBitsPerSecond: 8000000 }
        : { videoBitsPerSecond: 8000000 });
      parts = [];
      recorder.ondataavailable = (event) => { if (event.data && event.data.size > 0) parts.push(event.data); };
      recorder.onerror = (event) => { status(`Problema durante la grabación: ${event.error?.message || 'error desconocido'}`, 'error'); };
      recorder.onstop = finalizeRecording;
      recorder.start(1000);
      recordingStarted = Date.now();
      clearInterval(timerId); timerId = setInterval(updateRecordTimer, 250);
      els.recTimer.textContent = '00:00';
      els.recState.hidden = false;
      els.recordButton.classList.add('recording');
      els.recordButton.setAttribute('aria-label', 'Detener grabación');
      els.stopCamera.disabled = true;
      els.switchCamera.disabled = true;
      els.fpsSelect.disabled = true;
      els.resolutionSelect.disabled = true;
      els.exposureSelect.disabled = true;
      els.isoRange.disabled = true;
      els.focusSelect.disabled = true;
      closeAdvanced();
      document.body.classList.remove('clip-open');
      renderHud();
      status('Grabando video localmente…', 'online');
    } catch (err) {
      status(`No se pudo comenzar la grabación: ${err.message}`, 'error');
    }
  }

  function stopRecording() {
    if (recorder?.state !== 'recording') return;
    els.recordButton.disabled = true;
    renderHud();
    status('Finalizando archivo de video…');
    try { recorder.stop(); } catch (err) { status(`Error al detener la grabación: ${err.message}`, 'error'); }
  }

  function finalizeRecording() {
    clearInterval(timerId);
    els.recState.hidden = true;
    els.recordButton.classList.remove('recording');
    els.recordButton.disabled = !stream;
    els.recordButton.setAttribute('aria-label', 'Iniciar grabación');
    els.stopCamera.disabled = !stream;
    els.switchCamera.disabled = !stream;
    els.fpsSelect.disabled = false;
    els.resolutionSelect.disabled = false;
    setupManualControls();
    if (!parts.length) { renderHud(); status('No se recibieron datos de video; intenta una grabación más larga.', 'error'); return; }
    const type = recorder.mimeType || parts[0].type || 'video/webm';
    const isMp4 = type.includes('mp4');
    const extension = isMp4 ? 'mp4' : 'webm';
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    const blob = new Blob(parts, { type });
    videoUrl = URL.createObjectURL(blob);
    els.recordedPreview.src = videoUrl;
    els.videoFormat.textContent = `${extension.toUpperCase()} · ${(blob.size / (1024 * 1024)).toFixed(1)} MB`;
    els.downloadVideo.href = videoUrl;
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    els.downloadVideo.download = `phonocam-${stamp}.${extension}`;
    els.clipPanel.hidden = false;
    renderHud(); // Stay in camera mode; the clip is available via the thumbnail button.
    status(`Video preparado (${extension.toUpperCase()}). Pulsa “Descargar video” para guardarlo.`, 'online');
  }

  function toggleRecording() {
    if (recorder?.state === 'recording') stopRecording();
    else startRecording();
  }

  async function switchCamera() {
    if (recorder?.state === 'recording' || busy) return;
    cleanupStream();
    facingMode = facingMode === 'environment' ? 'user' : 'environment';
    await startCamera();
  }

  function changeTab(which) {
    const capture = which === 'capture';
    els.capturePanel.hidden = !capture;
    els.syncPanel.hidden = capture;
    els.captureTab.classList.toggle('active', capture);
    els.syncTab.classList.toggle('active', !capture);
    els.captureTab.setAttribute('aria-selected', String(capture));
    els.syncTab.setAttribute('aria-selected', String(!capture));
  }

  function updateSync() {
    const isCustom = els.rpmSelect.value === 'custom';
    els.customRpmRow.hidden = !isCustom;
    const rpm = Number(isCustom ? els.customRpm.value : els.rpmSelect.value);
    const drawings = Number(els.drawingCount.value);
    const step = Number(els.stepSelect.value);
    const valid = Number.isFinite(rpm) && rpm > 0 && rpm <= 300 && Number.isInteger(drawings) && drawings >= 2 && drawings <= 200;
    if (!valid) {
      els.idealFps.innerHTML = `— <small>FPS</small>`;
      els.syncExplain.textContent = 'Introduce RPM entre 1 y 300, y de 2 a 200 dibujos.';
      els.fpsSuggestion.textContent = 'Esperando datos válidos.';
      els.useSyncFps.disabled = true;
      return;
    }
    const theoretical = rpm * drawings / (60 * step);
    syncRecommendation = supportedFps.reduce((best, fps) => Math.abs(fps - theoretical) < Math.abs(best - theoretical) ? fps : best, supportedFps[0]);
    const deviation = Math.abs(syncRecommendation - theoretical);
    const exact = deviation < 0.015;
    els.idealFps.innerHTML = `${theoretical.toFixed(2)} <small>FPS</small>`;
    els.syncExplain.textContent = `${round2(rpm)} RPM × ${drawings} dibujos ÷ (60 × ${step}) = ${theoretical.toFixed(2)} FPS.`;
    els.fpsSuggestion.textContent = exact
      ? `${syncRecommendation} FPS coincide con la relación teórica. Pruébalo con un obturador rápido y luz suficiente.`
      : `El preset disponible más cercano es ${syncRecommendation} FPS (diferencia de ${deviation.toFixed(2)} FPS). Habrá deriva; ajusta las RPM o el número de dibujos.`;
    els.useSyncFps.disabled = false;
    try { localStorage.setItem('phonocam-sync', JSON.stringify({ rpmSelect: els.rpmSelect.value, customRpm: els.customRpm.value, drawings, step })); } catch (_) { /* optional */ }
  }

  function setDrawings(amount) {
    const current = parseInt(els.drawingCount.value, 10) || 32;
    els.drawingCount.value = String(clamp(current + amount, 2, 200));
    updateSync();
  }

  function loadSync() {
    try {
      const stored = JSON.parse(localStorage.getItem('phonocam-sync') || 'null');
      if (!stored) return;
      if (['33.3333333333', '45', '78', 'custom'].includes(stored.rpmSelect)) els.rpmSelect.value = stored.rpmSelect;
      if (Number.isFinite(Number(stored.customRpm))) els.customRpm.value = stored.customRpm;
      if (Number.isInteger(stored.drawings) && stored.drawings >= 2 && stored.drawings <= 200) els.drawingCount.value = stored.drawings;
      if ([1, 2, 3, 4].includes(stored.step)) els.stepSelect.value = stored.step;
    } catch (_) { /* ignore */ }
  }

  els.startCamera.addEventListener('click', startCamera);
  els.stopCamera.addEventListener('click', stopCamera);
  els.switchCamera.addEventListener('click', switchCamera);
  els.recordButton.addEventListener('click', toggleRecording);
  els.toggleGuide.addEventListener('click', () => {
    guideEnabled = !guideEnabled;
    els.toggleGuide.classList.toggle('active', guideEnabled);
    els.guideLayer.hidden = !guideEnabled || !stream;
    els.hudGuides.classList.toggle('is-active', guideEnabled);
  });
  els.captureTab.addEventListener('click', () => changeTab('capture'));
  els.syncTab.addEventListener('click', () => changeTab('sync'));
  els.fpsSelect.addEventListener('change', () => { syncFpsControls(); applyCaptureSettings(); });
  els.fpsRange.addEventListener('input', () => {
    const fps = supportedFps[Number(els.fpsRange.value)];
    els.fpsRangeValue.textContent = fps + ' FPS';
  });
  els.fpsRange.addEventListener('change', () => {
    const fps = supportedFps[Number(els.fpsRange.value)];
    els.fpsSelect.value = String(fps);
    syncFpsControls();
    applyCaptureSettings();
  });
  els.focusModeButton.addEventListener('click', () => setStudioMode(!studioMode));
  els.resolutionSelect.addEventListener('change', applyCaptureSettings);
  els.exposureSelect.addEventListener('change', () => {
    if (!els.exposureSelect.value) return;
    const units = 10000 / Number(els.exposureSelect.value);
    applyManual({ exposureMode: 'manual', exposureTime: units }, 'exposureTime', units);
  });
  els.isoRange.addEventListener('change', () => {
    const value = Number(els.isoRange.value);
    applyManual({ exposureMode: 'manual', iso: value }, 'iso', value).then(() => {
      const actual = videoTrack?.getSettings?.() || {};
      els.isoValue.textContent = actual.iso === undefined ? 'sin verificar' : actual.iso;
      renderHud();
    });
  });
  els.focusSelect.addEventListener('change', () => {
    if (!els.focusSelect.value) return;
    applyManual({ focusMode: els.focusSelect.value }, 'focusMode', els.focusSelect.value);
  });
  [els.rpmSelect, els.customRpm, els.drawingCount, els.stepSelect].forEach((elem) => elem.addEventListener('input', updateSync));
  els.minusDrawings.addEventListener('click', () => setDrawings(-1));
  els.plusDrawings.addEventListener('click', () => setDrawings(1));
  els.useSyncFps.addEventListener('click', () => {
    els.fpsSelect.value = String(syncRecommendation);
    syncFpsControls();
    changeTab('capture');
    closeAdvanced();
    applyCaptureSettings();
    status(`Preset ${syncRecommendation} FPS seleccionado. Comprueba los FPS reales al activar la cámara.`);
  });

  // Touch controls live in the preview, but use the canonical capture settings.
  const hudModes = [
    [els.hudFpsTab, 'fps'], [els.hudShutterTab, 'shutter'],
    [els.hudIsoTab, 'iso'], [els.hudFocusTab, 'focus']
  ];
  hudModes.forEach(([button, mode]) => button.addEventListener('click', () => showHudMode(mode)));
  els.hudFpsRange.addEventListener('input', () => {
    const fps = supportedFps[Number(els.hudFpsRange.value)];
    els.hudFpsLabel.textContent = String(fps);
    els.hudValue.textContent = fps + ' FPS · pendiente';
  });
  els.hudFpsRange.addEventListener('change', () => {
    const fps = supportedFps[Number(els.hudFpsRange.value)];
    els.fpsSelect.value = String(fps);
    syncFpsControls();
    applyCaptureSettings();
  });
  els.hudShutterSelect.addEventListener('change', () => {
    els.exposureSelect.value = els.hudShutterSelect.value;
    els.exposureSelect.dispatchEvent(new Event('change'));
    renderHud();
  });
  els.hudIsoRange.addEventListener('input', () => {
    els.hudValue.textContent = els.hudIsoRange.value + ' · pendiente';
    els.hudIsoLabel.textContent = els.hudIsoRange.value;
  });
  els.hudIsoRange.addEventListener('change', () => {
    els.isoRange.value = els.hudIsoRange.value;
    els.isoRange.dispatchEvent(new Event('change'));
    renderHud();
  });
  els.hudFocusSelect.addEventListener('change', () => {
    els.focusSelect.value = els.hudFocusSelect.value;
    els.focusSelect.dispatchEvent(new Event('change'));
    renderHud();
  });
  els.hudRecord.addEventListener('click', toggleRecording);
  els.hudSwapCamera.addEventListener('click', switchCamera);
  els.hudFit.addEventListener('click', () => {
    fitFrame = !fitFrame;
    document.body.classList.toggle('fit-frame', fitFrame);
    els.hudFit.textContent = fitFrame ? 'FIT' : 'FILL';
    els.hudFit.classList.toggle('is-active', fitFrame);
    els.hudFit.setAttribute('aria-label', fitFrame
      ? 'Cambiar a llenar el visor' : 'Mostrar el encuadre completo');
    els.hudFit.title = fitFrame
      ? 'Ver video llenando la pantalla' : 'Ver cuadro completo sin recorte';
    status(fitFrame
      ? 'Modo FIT: se ve todo el encuadre, con barras si es necesario.'
      : 'Modo FILL: el visor llena la pantalla; la grabación conserva el cuadro completo.',
      'online');
  });
  els.hudGuides.addEventListener('click', () => els.toggleGuide.click());
  els.hudPower.addEventListener('click', stopCamera);
  els.hudAdvanced.addEventListener('click', toggleAdvanced);
  els.closeAdvanced.addEventListener('click', closeAdvanced);
  els.hudClip.addEventListener('click', openClip);
  els.closeClip.addEventListener('click', () => document.body.classList.remove('clip-open'));
  window.addEventListener('pagehide', () => { if (recorder?.state === 'recording') { try { recorder.stop(); } catch (_) {} } cleanupStream(); });

  loadSync();
  updateSync();
  syncFpsControls();
  if (window.matchMedia('(max-width: 960px)').matches) setStudioMode(true);
  setCameraUI(false);
  resetManualControls();
  if ('serviceWorker' in navigator && window.isSecureContext) {
    navigator.serviceWorker.register('./service-worker.js').catch(() => {});
  }
})();
