(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const els = {
    cameraPreview: $('cameraPreview'), cameraEmpty: $('cameraEmpty'), cameraState: $('cameraState'),
    startCamera: $('startCamera'), stopCamera: $('stopCamera'), switchCamera: $('switchCamera'),
    viewfinderTop: $('viewfinderTop'),
    viewfinderBottom: $('viewfinderBottom'), actualResolution: $('actualResolution'), actualFps: $('actualFps'),
    statusText: $('statusText'), statusLine: document.querySelector('.status-line'),
    recordButton: $('recordButton'), recState: $('recState'), recTimer: $('recTimer'),
    clipPanel: $('clipPanel'), recordedPreview: $('recordedPreview'), videoFormat: $('videoFormat'),
    downloadVideo: $('downloadVideo'), fpsSelect: $('fpsSelect'), resolutionSelect: $('resolutionSelect'),
    qualitySelect: $('qualitySelect'), recordDiagnostics: $('recordDiagnostics'),
    exposureSelect: $('exposureSelect'), isoRange: $('isoRange'), isoValue: $('isoValue'),
    focusDistanceRow: $('focusDistanceRow'), focusDistanceRange: $('focusDistanceRange'),
    focusDistanceValue: $('focusDistanceValue'),
    focusSelect: $('focusSelect'), manualBadge: $('manualBadge'), manualNote: $('manualNote'),
    captureTab: $('captureTab'), syncTab: $('syncTab'), capturePanel: $('capturePanel'), syncPanel: $('syncPanel'),
    rpmSelect: $('rpmSelect'), customRpm: $('customRpm'), customRpmRow: $('customRpmRow'),
    drawingCount: $('drawingCount'), minusDrawings: $('minusDrawings'), plusDrawings: $('plusDrawings'),
    stepSelect: $('stepSelect'), idealFps: $('idealFps'), syncExplain: $('syncExplain'),
    fpsSuggestion: $('fpsSuggestion'), useSyncFps: $('useSyncFps'), syncApplyFeedback: $('syncApplyFeedback'),
    quickRpm33: $('quickRpm33'), quickRpm45: $('quickRpm45'), quickRpm78: $('quickRpm78'),
    quickDrawings: $('quickDrawings'), quickStep: $('quickStep'),
    quickTarget: $('quickTarget'), quickApply: $('quickApply'), quickFeedback: $('quickFeedback'),
    fpsRange: $('fpsRange'), fpsRangeValue: $('fpsRangeValue'), focusModeButton: $('focusModeButton'),
    cameraHud: $('cameraHud'), hudTitle: $('hudTitle'), hudValue: $('hudValue'),
    hudHint: $('hudHint'), hudFpsRange: $('hudFpsRange'), hudShutterSelect: $('hudShutterSelect'),
    hudShutterControls: $('hudShutterControls'), hudShutterRange: $('hudShutterRange'),
    hudShutterMinus: $('hudShutterMinus'), hudShutterPlus: $('hudShutterPlus'),
    hudFpsControls: $('hudFpsControls'), hudFpsMinus: $('hudFpsMinus'), hudFpsPlus: $('hudFpsPlus'),
    hudFocusMinus: $('hudFocusMinus'), hudFocusPlus: $('hudFocusPlus'),
    hudSaveVideo: $('hudSaveVideo'),
    hudIsoRange: $('hudIsoRange'), hudIsoControls: $('hudIsoControls'),
    hudIsoMinus: $('hudIsoMinus'), hudIsoPlus: $('hudIsoPlus'), hudIsoRangeToggle: $('hudIsoRangeToggle'),
    hudFocusSelect: $('hudFocusSelect'), hudFocusControls: $('hudFocusControls'), hudFocusRange: $('hudFocusRange'), hudFocusAuto: $('hudFocusAuto'),
    hudFpsTab: $('hudFpsTab'), hudShutterTab: $('hudShutterTab'), hudIsoTab: $('hudIsoTab'),
    hudFocusTab: $('hudFocusTab'), hudFpsLabel: $('hudFpsLabel'), hudShutterLabel: $('hudShutterLabel'),
    hudIsoLabel: $('hudIsoLabel'), hudFocusLabel: $('hudFocusLabel'),
    hudPresent: $('hudPresent'), presentDesktop: $('presentDesktop'), exitPresentation: $('exitPresentation'), hudSwapCamera: $('hudSwapCamera'), hudFit: $('hudFit'), hudRecord: $('hudRecord'),
    hudClip: $('hudClip'), hudAdvanced: $('hudAdvanced'), hudPower: $('hudPower'),
    closeAdvanced: $('closeAdvanced'), closeClip: $('closeClip'),
  };
  const fpsMin=12, fpsMax=60, fpsStep=0.5;
  const qualityValues=[8000000,20000000,40000000];
  function cleanFps(value){return Math.round(Math.min(fpsMax,Math.max(fpsMin,Number(value)||24))/fpsStep)*fpsStep;}
  function fpsLabel(v){return Number(v).toFixed(1).replace(/\.0$/,'');}
  function requestedFps(){return cleanFps(els.fpsSelect.value);}
  function setRequestedFps(v){
    const fps=cleanFps(v);
    els.fpsSelect.value=String(fps);
    els.fpsRange.value=String(fps);
    els.hudFpsRange.value=String(fps);
    els.fpsRangeValue.textContent=fpsLabel(fps)+' FPS';
    els.hudFpsLabel.textContent=fpsLabel(fps);
    els.hudValue.textContent=fpsLabel(fps)+' FPS';
    return fps;
  }
  function selectedQuality(){
    const v=Number(els.qualitySelect.value);
    return qualityValues.includes(v)?v:20000000;
  }
  let studioMode = false;
  let hudMode = 'fps';
  let fitFrame=true, isoFineMode=true, manualFocusDistance=false;
  let isoDebounceTimer=null,focusDebounceTimer=null,shutterDebounceTimer=null;
  let shutterSteps=[], presentationMode=false;
  function saveFraming(){try{localStorage.setItem('phonocam-framing',JSON.stringify({fitFrame}));}catch(_){}}
  function loadFraming(){try{const p=JSON.parse(localStorage.getItem('phonocam-framing')||'null');if(p&&typeof p.fitFrame==='boolean')fitFrame=p.fitFrame;}catch(_){}}
  function applyFraming(){
    document.body.classList.toggle('fit-frame',fitFrame);
    els.hudFit.textContent=fitFrame?'FIT':'FILL';
    els.hudFit.classList.toggle('is-active',fitFrame);
    els.hudFit.setAttribute('aria-label',fitFrame?'Cambiar a FILL':'Cambiar a FIT');
    els.hudFit.title=fitFrame?'Imagen completa':'Llenar visor con recorte visual';
  }
  // Distraction-free mode stays in the SAME page. No browser Fullscreen API,
  // no navigation, and no camera/recording restart.
  function setPresentation(active){
    presentationMode=active;
    document.body.classList.toggle('presentation-mode',active);
    els.exitPresentation.hidden=!active;
    els.exitPresentation.classList.toggle('is-visible',active);
    els.exitPresentation.setAttribute('aria-label', active ? 'Mostrar controles de cámara' : 'Controles visibles');
  }
  function leavePresentation(){
    setPresentation(false);
  }
  function presentLive(){
    if(!stream || presentationMode)return;
    closeAdvanced();
    document.body.classList.remove('clip-open');
    setPresentation(true);
  }
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
  function syncFpsControls(){
    setRequestedFps(els.fpsSelect.value);
    renderHud();
  }
  let stream = null, videoTrack = null, facingMode = 'environment';
  let recorder = null, parts = [], recordingStarted = 0, timerId = null, videoUrl = null;
  let recordedConfig=null;
  let busy = false, currentCapabilities = {};
  let syncRecommendation = 24, syncTheoretical=24, syncValid=true;
  let syncApplying=false, focusDistanceUnverified=false;
  const presets = [30,40,50,60,80,100,125,160,200,250,320,400,500,640,800,1000,1250,1600,2000,2500,3200,4000,5000,6400,8000];

  function status(message, mode = 'normal') {
    els.statusText.textContent = message;
    els.statusLine.classList.toggle('online', mode === 'online');
    els.statusLine.classList.toggle('error', mode === 'error');
  }

  function clamp(value, low, high) { return Math.min(high, Math.max(low, value)); }
  function round2(num) { return Math.round(num * 100) / 100; }
  function isNumberRange(obj) { return obj && Number.isFinite(obj.min) && Number.isFinite(obj.max); }


  // A narrow ISO working window makes adjustments practical for phonotropes.
  // Changing the slider's range alone never changes the camera exposure.
  function snapRange(value, range, step) {
    const min = Number(range.min), max = Number(range.max);
    const unit = Number(step) > 0 ? Number(step) : 1;
    return round2(clamp(min + Math.round((clamp(value, min, max) - min) / unit) * unit, min, max));
  }

  function configureHudIsoRange() {
    const cap = currentCapabilities.iso;
    const range = els.hudIsoRange;
    if (!isNumberRange(cap) || els.isoRange.disabled) {
      range.disabled = true;
      els.hudIsoRangeToggle.disabled = true;
      return;
    }
    const actual = videoTrack?.getSettings?.() || {};
    const current = Number.isFinite(actual.iso) ? actual.iso : Number(els.isoRange.value);
    const extent = cap.max - cap.min;
    let low = cap.min, high = cap.max;
    if (isoFineMode && extent > 300) {
      const preferredHigh = Math.min(cap.max, Math.max(400, cap.min + 300));
      if (current <= preferredHigh) {
        high = preferredHigh;
      } else {
        low = Math.max(cap.min, current - 150);
        high = Math.min(cap.max, low + 300);
        low = Math.max(cap.min, high - 300);
      }
    }
    range.min = String(low);
    range.max = String(high);
    range.step = els.isoRange.step;
    range.value = String(snapRange(current, range, Number(range.step)));
    range.disabled = false;
    els.hudIsoRangeToggle.disabled = false;
    els.hudIsoRangeToggle.textContent = isoFineMode ? 'FINO' : 'AMPLIO';
    els.hudIsoRangeToggle.title = `ISO visible: ${Math.round(low)}–${Math.round(high)}. Toca para ${isoFineMode ? 'ampliar' : 'reducir'} el rango.`;
    els.hudIsoRangeToggle.setAttribute('aria-label', els.hudIsoRangeToggle.title);
  }

  function applyIsoFromHud(value) {
    if (els.hudIsoRange.disabled || recorder?.state === 'recording') return;
    const rounded = snapRange(value, els.hudIsoRange, els.hudIsoRange.step);
    els.hudIsoRange.value = String(rounded);
    els.isoRange.value = String(rounded);
    els.isoRange.dispatchEvent(new Event('change'));
    els.hudValue.textContent = Math.round(rounded) + ' · solicitado';
  }

  function updateFocusDistanceReadout() {
    if (!manualFocusDistance) return;
    const current = videoTrack?.getSettings?.() || {};
    if (Number.isFinite(current.focusDistance)) {
      els.focusDistanceRange.value = String(current.focusDistance);
      els.focusDistanceValue.textContent = round2(current.focusDistance) + ' (real)';
    } else {
      els.focusDistanceValue.textContent = 'sin verificar';
    }
  }

  function applyFocusFromHud(value) {
    if (!manualFocusDistance || els.hudFocusRange.disabled || recorder?.state === 'recording') return;
    const rounded = snapRange(value, els.hudFocusRange, els.hudFocusRange.step);
    els.hudFocusRange.value = String(rounded);
    els.focusDistanceRange.value = String(rounded);
    els.hudValue.textContent = round2(rounded) + ' · solicitado';
    applyManual({focusMode:'manual',focusDistance:rounded}, 'focusDistance', rounded)
      .then((verified) => {
        if (!verified) {
          focusDistanceUnverified=true;
          manualFocusDistance=false;
          els.focusDistanceRow.hidden=true;
          els.focusDistanceRange.disabled=true;
          status('Enfoque manual no verificable. Slider desactivado; usa AUTO/LOCK si tu cámara lo admite.', 'error');
        } else {
          updateFocusDistanceReadout();
        }
        renderHud();
      });
  }


  // Exposure time is expressed in 100-microsecond units by the camera API.
  function updateShutterSlider() {
    const available = !els.exposureSelect.disabled && shutterSteps.length > 0;
    const locked = recorder?.state === 'recording';
    els.hudShutterRange.min = '0';
    els.hudShutterRange.max = String(Math.max(0, shutterSteps.length - 1));
    els.hudShutterRange.step = '1';
    const selected=Number(els.exposureSelect.value);
    const desired=selected>0?selected:500;
    const nearest = shutterSteps.reduce((best,denom,i)=>
      Math.abs(Math.log(denom/desired)) < Math.abs(Math.log(shutterSteps[best]/desired))?i:best,0);
    els.hudShutterRange.value=String(nearest);
    [els.hudShutterRange,els.hudShutterMinus,els.hudShutterPlus].forEach(el=>el.disabled=!available||locked);
  }
  function applyShutterIndex(index) {
    if (!videoTrack || els.exposureSelect.disabled || recorder?.state==='recording') return;
    const denom=shutterSteps[clamp(Math.round(Number(index)),0,shutterSteps.length-1)];
    if(!denom)return;
    els.hudValue.textContent='1/'+denom+' · solicitado';
    els.hudShutterLabel.textContent='1/'+denom;
    els.exposureSelect.value=String(denom);
    const units=10000/denom;
    applyManual({exposureMode:'manual',exposureTime:units},'exposureTime',units)
      .then(()=>renderHud());
  }
  // Overlay controls mirror the same native browser constraints as the full settings.
  // The HUD overlays the preview only; none of these elements are written to the video file.
  function mirrorOptions(source, destination) {
    destination.replaceChildren(...Array.from(source.options,
      (item) => new Option(item.text, item.value, item.defaultSelected, item.selected)));
    destination.value = source.value;
  }

  function renderHud() {
    const recording = recorder?.state === 'recording';
    const fps = requestedFps();
    els.hudFpsRange.value = String(fps);
    els.hudFpsRange.disabled = recording || !stream;
    els.hudFpsMinus.disabled = els.hudFpsRange.disabled;
    els.hudFpsPlus.disabled = els.hudFpsRange.disabled;
    els.hudFpsLabel.textContent = fpsLabel(fps);
    mirrorOptions(els.exposureSelect, els.hudShutterSelect);
    updateShutterSlider();
    mirrorOptions(els.focusSelect, els.hudFocusSelect);
    els.hudShutterSelect.disabled = recording || els.exposureSelect.disabled;
    els.hudFocusSelect.disabled = recording || els.focusSelect.disabled;
    configureHudIsoRange();
    els.hudIsoRange.disabled = recording || els.isoRange.disabled;
    els.hudIsoMinus.disabled = els.hudIsoRange.disabled;
    els.hudIsoPlus.disabled = els.hudIsoRange.disabled;
    els.hudIsoRangeToggle.disabled = recording || els.isoRange.disabled;
    els.hudFocusRange.min = els.focusDistanceRange.min;
    els.hudFocusRange.max = els.focusDistanceRange.max;
    els.hudFocusRange.step = els.focusDistanceRange.step;
    els.hudFocusRange.value = els.focusDistanceRange.value;
    els.hudFocusRange.disabled = recording || !manualFocusDistance;
    els.hudFocusRange.hidden = !manualFocusDistance;
    els.hudFocusMinus.hidden = !manualFocusDistance;
    els.hudFocusPlus.hidden = !manualFocusDistance;
    els.hudFocusMinus.disabled = els.hudFocusRange.disabled;
    els.hudFocusPlus.disabled = els.hudFocusRange.disabled;
    els.hudFocusSelect.hidden = manualFocusDistance;
    els.hudFocusAuto.disabled = recording || !stream || !Array.isArray(currentCapabilities.focusMode) || !currentCapabilities.focusMode.includes('continuous');
    els.hudShutterLabel.textContent = els.exposureSelect.disabled ? '—'
      : (els.exposureSelect.value ? '1/' + els.exposureSelect.value : 'SET');
    els.hudIsoLabel.textContent = els.isoRange.disabled ? '—'
      : (els.isoValue.textContent === 'sin verificar' ? '?' : els.isoRange.value);
    const focusLabels = { continuous: 'AUTO', 'single-shot': 'SINGLE', manual: 'MAN' };
    els.hudFocusLabel.textContent = manualFocusDistance
      ? (Number.isFinite(videoTrack?.getSettings?.()?.focusDistance)
          ? round2(videoTrack.getSettings().focusDistance) : 'MAN')
      : (els.focusSelect.disabled ? '—' : (focusLabels[els.focusSelect.value] || 'SET'));
    els.hudShutterTab.classList.toggle('is-unavailable', els.exposureSelect.disabled);
    els.hudIsoTab.classList.toggle('is-unavailable', els.isoRange.disabled);
    els.hudFocusTab.classList.toggle('is-unavailable', !manualFocusDistance && els.focusSelect.disabled);
    els.hudRecord.classList.toggle('is-recording', recording);
    els.hudRecord.disabled = !stream || els.recordButton.disabled;
    els.hudRecord.setAttribute('aria-label', recording ? 'Detener grabación' : 'Iniciar grabación');
    els.hudSwapCamera.disabled = recording || !stream;
    els.hudPresent.disabled = !stream;
    els.presentDesktop.disabled = !stream;
    els.hudPower.disabled = recording || !stream;
    els.hudAdvanced.disabled = recording;
    els.hudClip.hidden = !videoUrl || recording;
    els.hudSaveVideo.hidden = !videoUrl || recording;
    els.quickApply.disabled = recording || syncApplying || !syncValid;
    updateHudMode();
  }

  function updateHudMode() {
    const config = {
      fps: { tab: els.hudFpsTab, input: els.hudFpsControls, control: els.hudFpsRange, name: 'FRAME RATE', label: els.hudFpsLabel },
      shutter: { tab: els.hudShutterTab, input: els.hudShutterControls, control: els.hudShutterRange, name: 'SHUTTER · AJUSTE FINO', label: els.hudShutterLabel },
      iso: { tab: els.hudIsoTab, input: els.hudIsoControls, control: els.hudIsoRange, name: 'ISO · AJUSTE FINO', label: els.hudIsoLabel },
      focus: { tab: els.hudFocusTab, input: els.hudFocusControls, control: manualFocusDistance ? els.hudFocusRange : els.hudFocusSelect, name: manualFocusDistance ? 'FOCUS · DISTANCIA MANUAL' : 'FOCUS MODE', label: els.hudFocusLabel }
    };
    Object.entries(config).forEach(([key, item]) => {
      const active = key === hudMode;
      item.tab.classList.toggle('is-selected', active);
      item.tab.setAttribute('aria-pressed', String(active));
      item.input.hidden = !active;
    });
    const active = config[hudMode];
    els.hudTitle.textContent = active.name;
    const isUnavailable = (active.control || active.input).disabled;
    els.hudValue.textContent = isUnavailable ? 'NO DISPONIBLE'
      : hudMode === 'fps' ? active.label.textContent + ' FPS' : active.label.textContent;
    els.hudHint.textContent = recorder?.state === 'recording'
      ? 'Detén la grabación para cambiar estos parámetros.'
      : isUnavailable && hudMode !== 'fps'
        ? 'Tu navegador no permite ajustar este parámetro manualmente.'
        : hudMode === 'focus' && manualFocusDistance
          ? 'Mueve el slider con el disco DETENIDO y comprueba el enfoque. El valor depende del teléfono.'
        : hudMode === 'shutter'
          ? 'Exposición solicitada, no garantizada. Comprueba la confirmación de la cámara.'
        : hudMode === 'iso'
          ? 'Ajustes precisos. FINO/AMPLIO cambia solamente el rango visible, no el ISO de la cámara.'
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
    els.cameraHud.hidden = !enabled;
    applyFraming();
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
    shutterSteps=[];
    els.exposureSelect.replaceChildren(new Option('No disponible', ''));
    els.focusSelect.replaceChildren(new Option('No disponible', ''));
    els.exposureSelect.disabled = true;
    els.isoRange.disabled = true;
    els.focusSelect.disabled = true;
    manualFocusDistance = false;
    els.focusDistanceRow.hidden = true;
    els.focusDistanceRange.disabled = true;
    els.focusDistanceValue.textContent = '—';
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
        shutterSteps=available.slice();
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
      els.isoValue.textContent = Number.isFinite(settings.iso) ? String(settings.iso) : 'sin verificar';
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

    if (!focusDistanceUnverified && Array.isArray(cap.focusMode) && cap.focusMode.includes('manual') &&
        isNumberRange(cap.focusDistance) && cap.focusDistance.max > cap.focusDistance.min) {
      manualFocusDistance = true;
      const focus = els.focusDistanceRange;
      focus.min = String(cap.focusDistance.min);
      focus.max = String(cap.focusDistance.max);
      focus.step = String(cap.focusDistance.step > 0 ? cap.focusDistance.step : (cap.focusDistance.max - cap.focusDistance.min) / 100);
      const settings = videoTrack.getSettings?.() || {};
      focus.value = String(clamp(Number.isFinite(settings.focusDistance) ? settings.focusDistance
        : (cap.focusDistance.min + cap.focusDistance.max) / 2, cap.focusDistance.min, cap.focusDistance.max));
      focus.disabled = false;
      els.focusDistanceRow.hidden = false;
      updateFocusDistanceReadout();
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
    if (!videoTrack || recorder?.state === 'recording') return false;
    let verified=false;
    try {
      await videoTrack.applyConstraints({ advanced: [settings] });
      const actual = videoTrack.getSettings?.() || {};
      if (actual[field] === undefined) {
        status(`${field}: solicitado, pero el navegador no permite verificar su aplicación.`);
      } else if (typeof expected === 'number' && Math.abs(actual[field] - expected) > Math.max(0.01, expected * 0.03)) {
        status(`${field}: valor reportado ${round2(actual[field])}; se solicitó ${round2(expected)}.`, 'error');
      } else if (actual[field] !== expected && typeof expected !== 'number') {
        status(`${field}: el navegador reporta “${actual[field]}”, no “${expected}”.`, 'error');
      } else {
        verified=true;
        status(`${field}: valor confirmado por navegador (${actual[field]}). No garantiza enfoque óptico.`, 'online');
      }
      updateActualSettings();
    } catch (err) { status(`No se pudo aplicar ${field}: ${err.message}`, 'error'); }
    renderHud();
    return verified;
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
    const video={facingMode:{ideal:facingMode},width:{ideal:width},height:{ideal:height},frameRate:{ideal:requestedFps()}};
    try {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video, audio: false });
      } catch (firstError) {
        // Fallback for a device/browser that rejects requested capture settings.
        stream = await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:facingMode}},audio:false});
      }
      videoTrack = stream.getVideoTracks()[0];
      els.cameraPreview.srcObject = stream;
      await els.cameraPreview.play();
      setCameraUI(true);
      updateActualSettings();
      setupManualControls();
      status('Cámara activa. Revisa los FPS efectivos en el monitor.', 'online');
      return true;
    } catch (err) {
      cleanupStream();
      const msg = err.name === 'NotAllowedError'
        ? 'Permiso denegado. Autoriza la cámara en los ajustes del navegador.'
        : `No se pudo iniciar la cámara (${err.name || 'error'}). ${err.message || ''}`;
      status(msg, 'error');
      return false;
    } finally { busy = false; els.startCamera.disabled = false; }
  }

  function cleanupStream() {
    if(presentationMode)leavePresentation();
    focusDistanceUnverified=false; // reset only when switching camera/starting a new session
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
    if (!videoTrack || recorder?.state === 'recording') return {ok:false,reason:'sin cámara o grabando'};
    const [width, height] = els.resolutionSelect.value.split('x').map(Number);
    const frameRate = requestedFps();
    try {
      await videoTrack.applyConstraints({width:{ideal:width},height:{ideal:height},frameRate:{ideal:frameRate}});
      const actual=updateActualSettings()||{};
      const reported=Number.isFinite(actual.frameRate)?actual.frameRate:null;
      const accepted=reported!==null && Math.abs(reported-frameRate)<=0.15;
      status(`FPS solicitados ${fpsLabel(frameRate)}; cámara reporta ${reported===null?'desconocido':fpsLabel(reported)}. ${accepted?'Coinciden.':'No verificado o diferente.'}`,accepted?'online':'error');
      setupManualControls();
      return {ok:accepted,requested:frameRate,reported};
    }catch(err){
      status(`El teléfono no aceptó el cambio: ${err.message}`,'error');
      return {ok:false,requested:frameRate,reported:null,reason:err.message};
    }
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
      const quality=selectedQuality();
      recorder = new MediaRecorder(stream, requestedMime
        ? { mimeType: requestedMime, videoBitsPerSecond: quality }
        : { videoBitsPerSecond: quality });
      const actual=videoTrack?.getSettings?.()||{};
      recordedConfig={
        requestedMbps:quality/1000000, reportedMbps:Number.isFinite(recorder.videoBitsPerSecond)?recorder.videoBitsPerSecond/1000000:null,
        reportedWidth:actual.width,reportedHeight:actual.height,reportedFps:actual.frameRate,
        requestedFps:requestedFps(),codec:recorder.mimeType||requestedMime||'Navegador'
      };
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
      els.qualitySelect.disabled = true;
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
    els.qualitySelect.disabled = false;
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
    const cfg=recordedConfig||{};
    const elapsedSeconds=(Date.now()-recordingStarted)/1000;
    const measuredMbps=elapsedSeconds>0?blob.size*8/elapsedSeconds/1000000:0;
    const dimensions=cfg.reportedWidth&&cfg.reportedHeight?cfg.reportedWidth+'×'+cfg.reportedHeight:'No informado';
    const reportedFps=Number.isFinite(cfg.reportedFps)?fpsLabel(cfg.reportedFps):'No informado';
    const encoderMbps=Number.isFinite(cfg.reportedMbps)?cfg.reportedMbps.toFixed(1)+' Mbps':'No informado';
    els.recordDiagnostics.textContent=
      'Video: '+dimensions+' · FPS solicitados '+fpsLabel(cfg.requestedFps||requestedFps())+
      ' / reportados '+reportedFps+' · Bitrate solicitado '+(cfg.requestedMbps||8)+
      ' Mbps / encoder reporta '+encoderMbps+
      ' · Promedio del archivo '+measuredMbps.toFixed(1)+' Mbps · Códec/formato '+(cfg.codec||type)+
      '. Los valores reportados no garantizan los cuadros efectivos.';
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

  function syncQuickUi(){
    const speed=els.rpmSelect.value;
    [[els.quickRpm33,'33.3333333333'],[els.quickRpm45,'45'],[els.quickRpm78,'78']].forEach(([button,value])=>{
      const selected=speed===value;
      button.classList.toggle('is-selected',selected);
      button.setAttribute('aria-pressed',String(selected));
    });
    els.quickDrawings.value=els.drawingCount.value;
    els.quickStep.value=els.stepSelect.value;
    els.quickTarget.textContent=syncValid
      ? fpsLabel(syncRecommendation)+' FPS'
      : '— FPS';
    els.quickApply.disabled=!syncValid||syncApplying||recorder?.state==='recording';
  }

  function updateSync() {
    const isCustom=els.rpmSelect.value==='custom';
    els.customRpmRow.hidden=!isCustom;
    const rpm=Number(isCustom?els.customRpm.value:els.rpmSelect.value);
    const drawings=Number(els.drawingCount.value);
    const step=Number(els.stepSelect.value);
    const valid=Number.isFinite(rpm)&&rpm>0&&rpm<=300&&Number.isInteger(drawings)&&drawings>=2&&drawings<=200&&[1,2,3,4].includes(step);
    if(!valid){
      syncValid=false;
      els.idealFps.innerHTML='— <small>FPS</small>';
      els.syncExplain.textContent='Introduce RPM (1–300), dibujos (2–200) y un paso válido.';
      els.fpsSuggestion.textContent='Esperando datos válidos.';
      els.quickFeedback.textContent='Revisa el número de dibujos y el paso.';
      els.useSyncFps.disabled=true;
      syncQuickUi();return;
    }
    const theoretical=rpm*drawings/(60*step);
    syncTheoretical=theoretical;
    syncValid=theoretical>=fpsMin&&theoretical<=fpsMax;
    syncRecommendation=cleanFps(theoretical);
    const deviation=Math.abs(syncRecommendation-theoretical);
    els.idealFps.innerHTML=theoretical.toFixed(2)+' <small>FPS</small>';
    els.syncExplain.textContent=round2(rpm)+' RPM × '+drawings+' dibujos ÷ (60 × '+step+') = '+theoretical.toFixed(2)+' FPS.';
    if(!syncValid){
      els.fpsSuggestion.textContent='Fuera del rango de captura ('+fpsMin+'–'+fpsMax+' FPS). Cambia PASO ×1–×4 o los dibujos; no aplicaré un valor recortado.';
      els.quickFeedback.textContent='Teórico '+theoretical.toFixed(2)+' FPS, fuera de rango. Ajusta PASO.';
    }else{
      els.fpsSuggestion.textContent='Objetivo '+fpsLabel(syncRecommendation)+' FPS (teórico '+theoretical.toFixed(2)+', diferencia '+deviation.toFixed(2)+'). Pulsa Aplicar y revisa los FPS que reporta el teléfono.';
      els.quickFeedback.textContent='Teórico '+theoretical.toFixed(2)+' FPS · paso ×'+step+' · cámara aún sin verificar.';
      if(rpm===78&&step===1&&drawings===32)els.quickFeedback.textContent+=' Para una cadencia más baja, prueba PASO ×3 (~13.87 FPS).';
    }
    els.useSyncFps.disabled=!syncValid||syncApplying||recorder?.state==='recording';
    syncQuickUi();
    try{localStorage.setItem('phonocam-sync',JSON.stringify({rpmSelect:els.rpmSelect.value,customRpm:els.customRpm.value,drawings,step}));}catch(_){}
  }

  async function applySyncRecommendation() {
    if(!syncValid || syncApplying || recorder?.state==='recording')return;
    syncApplying=true;
    els.quickApply.disabled=true;
    els.useSyncFps.disabled=true;
    const target=syncRecommendation;
    setRequestedFps(target);
    const message='Solicitando '+fpsLabel(target)+' FPS (teórico '+syncTheoretical.toFixed(2)+')…';
    els.quickFeedback.textContent=message;
    els.syncApplyFeedback.textContent=message;
    let msg='';
    if(!videoTrack){
      msg='Preparados '+fpsLabel(target)+' FPS para cuando actives la cámara. Todavía no se aplicaron al hardware.';
    }else{
      const result=await applyCaptureSettings();
      const actual=result.reported;
      if(result.ok){
        msg='Cámara reporta '+fpsLabel(actual)+' FPS; solicitado '+fpsLabel(target)+' FPS. Coinciden, pero esto no certifica la cadencia efectiva del archivo.';
      }else{
        msg='No confirmado: solicitado '+fpsLabel(target)+' FPS; cámara reporta '+(actual===null?'sin dato':fpsLabel(actual)+' FPS')+'. Prueba otro PASO o velocidad. '+(result.reason||'');
      }
    }
    els.quickFeedback.textContent=msg;
    els.syncApplyFeedback.textContent=msg;
    status(msg,videoTrack&&msg.startsWith('Cámara reporta')?'online':'error');
    syncApplying=false;
    syncQuickUi();
    renderHud();
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
  els.captureTab.addEventListener('click', () => changeTab('capture'));
  els.syncTab.addEventListener('click', () => changeTab('sync'));
  els.fpsSelect.addEventListener('change',()=>{
    syncFpsControls();applyCaptureSettings();
  });
  els.fpsRange.addEventListener('input',()=>{
    els.fpsRangeValue.textContent=fpsLabel(els.fpsRange.value)+' FPS';
  });
  els.fpsRange.addEventListener('change',()=>{
    setRequestedFps(els.fpsRange.value);
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
  [els.rpmSelect, els.customRpm, els.drawingCount, els.stepSelect].forEach((elem)=>elem.addEventListener('input',updateSync));
  els.minusDrawings.addEventListener('click',()=>setDrawings(-1));
  els.plusDrawings.addEventListener('click',()=>setDrawings(1));
  [[els.quickRpm33,'33.3333333333',1],[els.quickRpm45,'45',1],[els.quickRpm78,'78',3]].forEach(([button,rpm,recommendedStep])=>{
    button.addEventListener('click',()=>{
      els.rpmSelect.value=rpm;
      els.stepSelect.value=String(recommendedStep); // explicit turntable preset, editable in PASO
      updateSync();
      els.syncApplyFeedback.textContent='RPM '+(rpm==='33.3333333333'?'33⅓':rpm)+' y PASO ×'+recommendedStep+' seleccionados; aún no aplicados a cámara.';
    });
  });
  els.quickDrawings.addEventListener('input',()=>{
    els.drawingCount.value=els.quickDrawings.value;
    updateSync();
  });
  els.quickStep.addEventListener('change',()=>{
    els.stepSelect.value=els.quickStep.value;
    updateSync();
  });
  els.quickApply.addEventListener('click',applySyncRecommendation);
  els.useSyncFps.addEventListener('click',applySyncRecommendation);

  // Touch controls live in the preview, but use the canonical capture settings.
  const hudModes = [
    [els.hudFpsTab, 'fps'], [els.hudShutterTab, 'shutter'],
    [els.hudIsoTab, 'iso'], [els.hudFocusTab, 'focus']
  ];
  hudModes.forEach(([button, mode]) => button.addEventListener('click', () => showHudMode(mode)));
  els.hudFpsRange.addEventListener('input',()=>{
    const fps=cleanFps(els.hudFpsRange.value);
    els.hudFpsLabel.textContent=fpsLabel(fps);
    els.hudValue.textContent=fpsLabel(fps)+' FPS · pendiente';
  });
  els.hudFpsRange.addEventListener('change',()=>{
    setRequestedFps(els.hudFpsRange.value);
    applyCaptureSettings();
  });
  [els.hudFpsMinus,els.hudFpsPlus].forEach((button,i)=>{
    button.addEventListener('click',()=>{
      if(els.hudFpsRange.disabled)return;
      const previous=requestedFps();
      const next=setRequestedFps(previous+(i===0?-fpsStep:fpsStep));
      if(next!==previous)applyCaptureSettings();
    });
  });
  els.hudShutterSelect.addEventListener('change', () => {
    els.exposureSelect.value = els.hudShutterSelect.value;
    els.exposureSelect.dispatchEvent(new Event('change'));
    renderHud();
  });
  els.hudShutterRange.addEventListener('input',()=>{
    const denominator=shutterSteps[Number(els.hudShutterRange.value)];
    if(!denominator)return;
    els.hudValue.textContent='1/'+denominator+' · pendiente';
    clearTimeout(shutterDebounceTimer);
    shutterDebounceTimer=setTimeout(()=>applyShutterIndex(els.hudShutterRange.value),150);
  });
  els.hudShutterRange.addEventListener('change',()=>{
    clearTimeout(shutterDebounceTimer);
    applyShutterIndex(els.hudShutterRange.value);
  });
  [els.hudShutterMinus,els.hudShutterPlus].forEach((btn,i)=>btn.addEventListener('click',()=>{
    if(els.hudShutterRange.disabled)return;
    clearTimeout(shutterDebounceTimer);
    applyShutterIndex(Number(els.hudShutterRange.value)+(i===0?-1:1));
  }));
  els.hudIsoRange.addEventListener('input', () => {
    els.hudValue.textContent = Math.round(Number(els.hudIsoRange.value)) + ' · pendiente';
    clearTimeout(isoDebounceTimer);
    isoDebounceTimer = setTimeout(() => applyIsoFromHud(Number(els.hudIsoRange.value)), 160);
  });
  els.hudIsoRange.addEventListener('change', () => {
    clearTimeout(isoDebounceTimer);
    applyIsoFromHud(Number(els.hudIsoRange.value));
  });
  [els.hudIsoMinus, els.hudIsoPlus].forEach((button, i) => button.addEventListener('click', () => {
    const delta = (i === 0 ? -1 : 1) * Math.max(10, Number(els.hudIsoRange.step) || 1);
    applyIsoFromHud(Number(els.hudIsoRange.value) + delta);
  }));
  els.hudIsoRangeToggle.addEventListener('click', () => {
    isoFineMode = !isoFineMode;
    configureHudIsoRange();
    renderHud();
    status(isoFineMode ? 'ISO: rango fino activo.' : 'ISO: rango completo activo.');
  });
  els.hudFocusRange.addEventListener('input', () => {
    els.hudValue.textContent = round2(Number(els.hudFocusRange.value)) + ' · pendiente';
    clearTimeout(focusDebounceTimer);
    focusDebounceTimer = setTimeout(() => applyFocusFromHud(Number(els.hudFocusRange.value)), 160);
  });
  els.hudFocusRange.addEventListener('change', () => {
    clearTimeout(focusDebounceTimer);
    applyFocusFromHud(Number(els.hudFocusRange.value));
  });
  [els.hudFocusMinus, els.hudFocusPlus].forEach((button, index) => {
    button.addEventListener('click', () => {
      if (!manualFocusDistance || els.hudFocusRange.disabled) return;
      clearTimeout(focusDebounceTimer);
      const range = els.hudFocusRange;
      const step = Number(range.step) > 0 ? Number(range.step) : (Number(range.max)-Number(range.min))/100;
      const nextValue = clamp(Number(range.value) + (index === 0 ? -step : step), Number(range.min), Number(range.max));
      if (Math.abs(nextValue-Number(range.value))<1e-9) return;
      applyFocusFromHud(nextValue);
    });
  });
  els.focusDistanceRange.addEventListener('change', () => {
    if (!manualFocusDistance) return;
    const requested = Number(els.focusDistanceRange.value);
    applyManual({focusMode:'manual',focusDistance:requested}, 'focusDistance', requested)
      .then(() => {updateFocusDistanceReadout();renderHud();});
  });
  els.hudFocusAuto.addEventListener('click',async()=>{
    if(!videoTrack||recorder?.state==='recording'||els.hudFocusAuto.disabled)return;
    const ok=await applyManual({focusMode:'continuous'},'focusMode','continuous');
    if(ok){
      els.focusSelect.value='continuous';
      els.hudFocusSelect.value='continuous';
      status('Enfoque automático continuo reportado por el navegador. No implica comprobación visual de nitidez.','online');
    }
    renderHud();
  });
  els.hudFocusSelect.addEventListener('change', () => {
    els.focusSelect.value = els.hudFocusSelect.value;
    els.focusSelect.dispatchEvent(new Event('change'));
    renderHud();
  });
  els.hudRecord.addEventListener('click', toggleRecording);
  els.hudSwapCamera.addEventListener('click', switchCamera);
  els.hudFit.addEventListener('click',()=>{
    fitFrame=!fitFrame;applyFraming();saveFraming();
    status(fitFrame?'FIT: encuadre completo.':'FILL: recorte solo de vista previa.','online');
  });
  els.hudPresent.addEventListener('click',presentLive);
  els.presentDesktop.addEventListener('click',presentLive);
  els.exitPresentation.addEventListener('click',(event)=>{event.stopPropagation?.();leavePresentation();});
  document.addEventListener('keydown',(event)=>{if(presentationMode&&event.key==='Escape')leavePresentation();});
  els.hudPower.addEventListener('click', stopCamera);
  els.hudAdvanced.addEventListener('click', toggleAdvanced);
  els.closeAdvanced.addEventListener('click', closeAdvanced);
  els.hudClip.addEventListener('click', openClip);
  els.hudSaveVideo.addEventListener('click', () => {
    if (!videoUrl || recorder?.state === 'recording') return;
    // A real user tap initiates the same file download as the clip-panel link.
    els.downloadVideo.click();
    status('Descarga solicitada. Revisa la carpeta Descargas del teléfono.', 'online');
  });
  els.closeClip.addEventListener('click', () => document.body.classList.remove('clip-open'));
  window.addEventListener('pagehide', () => {
    clearTimeout(isoDebounceTimer);clearTimeout(focusDebounceTimer);clearTimeout(shutterDebounceTimer);
    if (recorder?.state === 'recording') { try { recorder.stop(); } catch (_) {} }
    cleanupStream();
  });

  loadSync();
  loadFraming();
  updateSync();
  syncFpsControls();
  if (window.matchMedia('(max-width: 960px)').matches) setStudioMode(true);
  setCameraUI(false);
  resetManualControls();
  applyFraming();
  if ('serviceWorker' in navigator && window.isSecureContext) {
    navigator.serviceWorker.register('./service-worker.js').catch(() => {});
  }
})();
