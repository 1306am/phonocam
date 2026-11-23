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
    focusDistanceRow: $('focusDistanceRow'), focusDistanceRange: $('focusDistanceRange'),
    focusDistanceValue: $('focusDistanceValue'),
    focusSelect: $('focusSelect'), manualBadge: $('manualBadge'), manualNote: $('manualNote'),
    captureTab: $('captureTab'), syncTab: $('syncTab'), capturePanel: $('capturePanel'), syncPanel: $('syncPanel'),
    rpmSelect: $('rpmSelect'), customRpm: $('customRpm'), customRpmRow: $('customRpmRow'),
    drawingCount: $('drawingCount'), minusDrawings: $('minusDrawings'), plusDrawings: $('plusDrawings'),
    stepSelect: $('stepSelect'), idealFps: $('idealFps'), syncExplain: $('syncExplain'),
    fpsSuggestion: $('fpsSuggestion'), useSyncFps: $('useSyncFps'),
    fpsRange: $('fpsRange'), fpsRangeValue: $('fpsRangeValue'), focusModeButton: $('focusModeButton'),
    cameraHud: $('cameraHud'), hudTitle: $('hudTitle'), hudValue: $('hudValue'),
    hudHint: $('hudHint'), hudFpsRange: $('hudFpsRange'), hudShutterSelect: $('hudShutterSelect'),
    hudShutterControls: $('hudShutterControls'), hudShutterRange: $('hudShutterRange'),
    hudShutterMinus: $('hudShutterMinus'), hudShutterPlus: $('hudShutterPlus'),
    lensTool: $('lensTool'), lensButton: $('lensButton'), lensMenu: $('lensMenu'),
    lensSelect: $('lensSelect'), lensHint: $('lensHint'), lensZoomGroup: $('lensZoomGroup'),
    lensZoomRange: $('lensZoomRange'), lensZoomValue: $('lensZoomValue'), lensZoomHint: $('lensZoomHint'),
    fullDiscButton: $('fullDiscButton'), fullDiscMenu: $('fullDiscMenu'),
    safeMarginSelect: $('safeMarginSelect'), safeDiscNotice: $('safeDiscNotice'),
    safeDiscGuide: $('safeDiscGuide'), safeDiscCircle: $('safeDiscCircle'),
    hudFpsControls: $('hudFpsControls'), hudFpsMinus: $('hudFpsMinus'), hudFpsPlus: $('hudFpsPlus'),
    hudFocusMinus: $('hudFocusMinus'), hudFocusPlus: $('hudFocusPlus'),
    hudSaveVideo: $('hudSaveVideo'),
    hudIsoRange: $('hudIsoRange'), hudIsoControls: $('hudIsoControls'),
    hudIsoMinus: $('hudIsoMinus'), hudIsoPlus: $('hudIsoPlus'), hudIsoRangeToggle: $('hudIsoRangeToggle'),
    hudFocusSelect: $('hudFocusSelect'), hudFocusControls: $('hudFocusControls'), hudFocusRange: $('hudFocusRange'),
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
  let fitFrame = true;
  let fullDiscMode = false;
  let safeMargin = 8;
  let isoFineMode = true;
  let manualFocusDistance = false;
  let isoDebounceTimer = null, focusDebounceTimer = null, shutterDebounceTimer = null, lensZoomTimer = null;
  let selectedCameraId = null, knownCameras = [], shutterSteps = [];

  function saveFraming() {
    try {
      localStorage.setItem('phonocam-framing', JSON.stringify({
        fitFrame, fullDiscMode, safeMargin
      }));
    } catch (_) { /* storage is optional */ }
  }

  function loadFraming() {
    try {
      const prefs = JSON.parse(localStorage.getItem('phonocam-framing') || 'null');
      if (prefs) {
        fitFrame = prefs.fitFrame !== false;
        fullDiscMode = prefs.fullDiscMode === true;
        if ([5,8,12].includes(Number(prefs.safeMargin))) safeMargin=Number(prefs.safeMargin);
      }
    } catch (_) { /* ignore unavailable or invalid preferences */ }
    if (fullDiscMode) fitFrame=true;
  }

  function updateGuideGeometry() {
    if (!fullDiscMode || !stream || !studioMode) return;
    const finder = document.getElementById('viewfinder');
    const v = els.cameraPreview;
    const width = finder?.clientWidth || 0, height = finder?.clientHeight || 0;
    const vw = v.videoWidth || 0, vh = v.videoHeight || 0;
    if (!width || !height) return;
    // In FIT mode, locate the real video rectangle within the letterboxed preview.
    const scale = vw > 0 && vh > 0 ? Math.min(width / vw, height / vh) : 1;
    const pictureW = vw > 0 ? vw * scale : width;
    const pictureH = vh > 0 ? vh * scale : height;
    const diameter = Math.max(0,Math.min(pictureW,pictureH)*(1-safeMargin/100*2));
    els.safeDiscCircle.style.width = diameter + 'px';
    els.safeDiscCircle.style.height = diameter + 'px';
    els.safeDiscCircle.style.left = (width-diameter)/2+'px';
    els.safeDiscCircle.style.top = (height-diameter)/2+'px';
  }

  function applyFraming() {
    if (fullDiscMode) fitFrame = true;
    document.body.classList.toggle('fit-frame',fitFrame);
    els.hudFit.textContent = fitFrame ? 'FIT' : 'FILL';
    els.hudFit.classList.toggle('is-active',fitFrame);
    els.hudFit.setAttribute('aria-label',fitFrame?'Cambiar a FILL (recorta vista previa)':'Cambiar a FIT (sin recorte)');
    els.hudFit.title = fitFrame?'Vista completa sin recorte':'Llenar la pantalla recortando la vista previa';
    els.fullDiscButton.classList.toggle('is-active',fullDiscMode);
    els.fullDiscButton.setAttribute('aria-pressed',String(fullDiscMode));
    els.fullDiscMenu.hidden = !fullDiscMode || !stream;
    els.safeDiscGuide.hidden = !fullDiscMode || !stream || !studioMode;
    els.safeMarginSelect.value=String(safeMargin);
    els.safeDiscNotice.textContent='Margen '+safeMargin+'% · Guía manual, no detección automática. Centra todo el disco dentro del círculo, incluidos los dibujos exteriores.';
    updateGuideGeometry();
  }

  function setFullDisc(enabled) {
    fullDiscMode=enabled;
    if (enabled) {
      fitFrame=true;
      guideEnabled=false;
      els.toggleGuide.classList.remove('active');
      els.guideLayer.hidden=true;
      els.hudGuides.classList.remove('is-active');
    }
    applyFraming();
    saveFraming();
    status(enabled
      ? 'FULL DISC: FIT activo. Centra el disco dentro de la guía; no detectamos bordes automáticamente.'
      : 'FULL DISC desactivado. El modo de encuadre elegido sigue activo.',
      'online');
  }

  function setStudioMode(enabled) {
    studioMode = enabled;
    document.body.classList.toggle('studio-mode', enabled);
    if (els.safeDiscGuide) els.safeDiscGuide.hidden=!enabled||!fullDiscMode||!stream;
    if (enabled) requestAnimationFrame(updateGuideGeometry);
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
      .then(() => { updateFocusDistanceReadout(); renderHud(); });
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
  function lensLabel(device,idx){
    const name=(device.label||'').trim()||'Cámara '+(idx+1)+' (sin nombre)';
    return /ultra.?wide|ultra.?gran|0[.,]5\s?[x×]|super.?wide/i.test(device.label||'')
      ? 'ULTRA WIDE · '+name : name;
  }
  async function refreshCameraList(){
    if(!navigator.mediaDevices?.enumerateDevices||!stream)return;
    try{
      knownCameras=(await navigator.mediaDevices.enumerateDevices())
        .filter(c=>c.kind==='videoinput'&&c.deviceId);
      const list=[new Option('Trasera (automática)','auto-rear'),
        new Option('Frontal (automática)','auto-front')];
      knownCameras.forEach((c,i)=>list.push(new Option(lensLabel(c,i),c.deviceId)));
      els.lensSelect.replaceChildren(...list);
      els.lensSelect.value=selectedCameraId||(facingMode==='user'?'auto-front':'auto-rear');
      const wide=knownCameras.filter(c=>/ultra.?wide|ultra.?gran|0[.,]5\s?[x×]|super.?wide/i.test(c.label||''));
      const rear=(knownCameras||[]).filter(c=>/rear|back|trasera|posterior/i.test(c.label||''));
      const fronts=(knownCameras||[]).filter(c=>/front|frontal|user/i.test(c.label||''));
      els.lensHint.textContent=wide.length
        ? 'Se encontró un lente llamado «ultra wide». Selecciónalo y verifica el campo visual.'
        : knownCameras.length <= 2 && (fronts.length||rear.length)
          ? 'Chrome solo expone '+knownCameras.length+' cámara(s) identificables. El ultra gran angular no aparece por separado. No se puede habilitar con un selector web.'
          : knownCameras.length>1
            ? knownCameras.length+' cámaras disponibles, algunas sin nombre específico. Compara sus encuadres; puede que Chrome agrupe varios lentes en una sola trasera.'
            : 'Chrome expone '+knownCameras.length+' cámara(s). No es posible forzar la ultra gran angular si el navegador no la ofrece.';
      const id=videoTrack?.getSettings?.()?.deviceId;
      const current=knownCameras.find(c=>c.deviceId===id);
      if(current&&!selectedCameraId)els.lensHint.textContent+=' Actual: '+(current.label||'predeterminada')+'.';
    }catch(e){els.lensHint.textContent='No fue posible listar las cámaras: '+(e.message||e.name||'error')+'.';}
  }
  function setupZoomControl(){
    const cap=currentCapabilities.zoom;
    const available=isNumberRange(cap)&&cap.max>cap.min;
    els.lensZoomGroup.hidden=!available;
    els.lensZoomRange.disabled=!available||recorder?.state==='recording';
    if(!available)return;
    els.lensZoomRange.min=String(cap.min);
    els.lensZoomRange.max=String(cap.max);
    els.lensZoomRange.step=String(cap.step>0?cap.step:0.1);
    const z=videoTrack?.getSettings?.()?.zoom;
    els.lensZoomRange.value=String(clamp(Number.isFinite(z)?z:1,cap.min,cap.max));
    els.lensZoomValue.textContent=round2(Number(els.lensZoomRange.value))+'×';
    els.lensZoomHint.textContent=cap.min<1
      ? 'La cámara permite bajar de 1×; comprueba si realmente amplía el encuadre.'
      : 'El zoom parte de '+round2(cap.min)+'×: no equivale al lente ultra gran angular.';
  }
  async function selectCameraFromMenu(choice){
    if(busy||recorder?.state==='recording'||!stream)return;
    const previousId=selectedCameraId, previousFacing=facingMode;
    if(choice==='auto-rear'){selectedCameraId=null;facingMode='environment';}
    else if(choice==='auto-front'){selectedCameraId=null;facingMode='user';}
    else selectedCameraId=choice;
    els.lensSelect.disabled=true;
    cleanupStream();
    const success=await startCamera();
    if(!success){
      selectedCameraId=previousId;facingMode=previousFacing;
      await startCamera();
      status('No se pudo seleccionar ese lente; se intentó restaurar el anterior.','error');
    }else{
      const chosen=knownCameras.find(c=>c.deviceId===selectedCameraId);
      status('Cámara: '+(chosen?.label||(selectedCameraId?'seleccionada':'automática'))+'. Comprueba el encuadre.','online');
    }
    els.lensSelect.disabled=false;
    els.lensMenu.hidden=true;
    els.lensButton.setAttribute('aria-expanded','false');
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
    const fps = Number(els.fpsSelect.value);
    const i = supportedFps.indexOf(fps);
    if (i >= 0) els.hudFpsRange.value = String(i);
    els.hudFpsRange.disabled = recording || !stream;
    els.hudFpsMinus.disabled = els.hudFpsRange.disabled;
    els.hudFpsPlus.disabled = els.hudFpsRange.disabled;
    els.hudFpsLabel.textContent = String(fps);
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
    els.hudShutterLabel.textContent = els.exposureSelect.disabled ? '—'
      : (els.exposureSelect.value ? '1/' + els.exposureSelect.value : 'SET');
    els.hudIsoLabel.textContent = els.isoRange.disabled ? '—'
      : (els.isoValue.textContent === 'sin verificar' ? '?' : els.isoRange.value);
    const focusLabels = { continuous: 'AUTO', 'single-shot': 'SINGLE', manual: 'LOCK' };
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
    els.hudPower.disabled = recording || !stream;
    els.lensButton.disabled=recording||!stream;
    els.lensSelect.disabled=recording||!stream;
    if(!els.lensZoomGroup.hidden)els.lensZoomRange.disabled=recording||!stream;
    els.hudAdvanced.disabled = recording;
    els.hudGuides.classList.toggle('is-active', guideEnabled);
    els.hudClip.hidden = !videoUrl || recording;
    els.hudSaveVideo.hidden = !videoUrl || recording;
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
    els.guideLayer.hidden = !enabled || !guideEnabled;
    els.cameraHud.hidden = !enabled;
    els.lensTool.hidden=!enabled;
    applyFraming();
    if(!enabled){els.lensMenu.hidden=true;els.lensButton.setAttribute('aria-expanded','false');}
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
    els.lensZoomGroup.hidden=true;
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

    if (Array.isArray(cap.focusMode) && cap.focusMode.includes('manual') &&
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
    setupZoomControl();
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
    const video = { ...(selectedCameraId?{deviceId:{exact:selectedCameraId}}:{facingMode:{ideal:facingMode}}),
      width:{ideal:width},height:{ideal:height},frameRate:{ideal:Number(els.fpsSelect.value)} };
    try {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video, audio: false });
      } catch (firstError) {
        // Fallback for a device/browser that rejects requested capture settings.
        stream = await navigator.mediaDevices.getUserMedia({ video: selectedCameraId?{deviceId:{exact:selectedCameraId}}:{facingMode:{ideal:facingMode}}, audio: false });
      }
      videoTrack = stream.getVideoTracks()[0];
      els.cameraPreview.srcObject = stream;
      await els.cameraPreview.play();
      setCameraUI(true);
      updateActualSettings();
      setupManualControls();
      await refreshCameraList();
      requestAnimationFrame(updateGuideGeometry);
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
      els.lensButton.disabled=true;els.lensSelect.disabled=true;els.lensZoomRange.disabled=true;
      els.lensMenu.hidden=true;
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
    selectedCameraId=null;
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
  [els.hudFpsMinus, els.hudFpsPlus].forEach((button, index) => {
    button.addEventListener('click', () => {
      if (els.hudFpsRange.disabled) return;
      const oldIndex = Number(els.hudFpsRange.value);
      const nextIndex = clamp(oldIndex + (index === 0 ? -1 : 1), 0, supportedFps.length - 1);
      if (nextIndex === oldIndex) return;
      const fps = supportedFps[nextIndex];
      els.hudFpsRange.value = String(nextIndex);
      els.hudFpsLabel.textContent = String(fps);
      els.fpsSelect.value = String(fps);
      syncFpsControls();
      applyCaptureSettings();
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
  els.lensButton.addEventListener('click',()=>{
    if(!stream||recorder?.state==='recording')return;
    els.lensMenu.hidden=!els.lensMenu.hidden;
    els.lensButton.setAttribute('aria-expanded',String(!els.lensMenu.hidden));
  });
  els.lensSelect.addEventListener('change',()=>selectCameraFromMenu(els.lensSelect.value));
  function applyLensZoom(){
    if(els.lensZoomRange.disabled)return;
    const val=Number(els.lensZoomRange.value);
    applyManual({zoom:val},'zoom',val).then(()=>{
      const real=videoTrack?.getSettings?.()?.zoom;
      els.lensZoomValue.textContent=Number.isFinite(real)?round2(real)+'×':'sin verificar';
    });
  }
  els.lensZoomRange.addEventListener('input',()=>{
    els.lensZoomValue.textContent=round2(Number(els.lensZoomRange.value))+'× · pendiente';
    clearTimeout(lensZoomTimer);
    lensZoomTimer=setTimeout(applyLensZoom,160);
  });
  els.lensZoomRange.addEventListener('change',()=>{
    clearTimeout(lensZoomTimer);applyLensZoom();
  });
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
  els.hudFocusSelect.addEventListener('change', () => {
    els.focusSelect.value = els.hudFocusSelect.value;
    els.focusSelect.dispatchEvent(new Event('change'));
    renderHud();
  });
  els.hudRecord.addEventListener('click', toggleRecording);
  els.hudSwapCamera.addEventListener('click', switchCamera);
  els.hudFit.addEventListener('click', () => {
    fitFrame = !fitFrame;
    if (!fitFrame) fullDiscMode=false;
    applyFraming();
    saveFraming();
    status(fitFrame
      ? 'FIT: se muestra toda la imagen sin recorte visual.'
      : 'FILL: se recorta SOLO la vista previa. Para proteger los bordes, usa FIT o FULL DISC.',
      'online');
  });
  els.fullDiscButton.addEventListener('click', () => setFullDisc(!fullDiscMode));
  els.safeMarginSelect.addEventListener('change', () => {
    const margin = Number(els.safeMarginSelect.value);
    if (![5,8,12].includes(margin))return;
    safeMargin=margin;
    applyFraming();
    saveFraming();
  });
  els.cameraPreview.addEventListener('loadedmetadata', () => requestAnimationFrame(updateGuideGeometry));
  window.addEventListener('resize', () => requestAnimationFrame(updateGuideGeometry));
  if (typeof ResizeObserver !== 'undefined') {
    const ro = new ResizeObserver(() => updateGuideGeometry());
    ro.observe(document.getElementById('viewfinder'));
  }
  els.hudGuides.addEventListener('click', () => els.toggleGuide.click());
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
    clearTimeout(isoDebounceTimer); clearTimeout(focusDebounceTimer); clearTimeout(shutterDebounceTimer);clearTimeout(lensZoomTimer);
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
