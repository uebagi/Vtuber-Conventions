function findMapLocation(locations, session) {
  return locations.find(l => l.stages?.includes(session.stage) || (session.booth && l.booths?.includes(session.booth))) ||
    locations.flatMap(l => (l.stage_prefixes || []).filter(p => session.stage.startsWith(p)).map(p => ({l, length:p.length}))).sort((a,b) => b.length-a.length)[0]?.l;
}

/* Optional image floor plan. All location coordinates belong to the convention. */
(async () => {
  const trigger = document.querySelector('#open-map');
  if (!config.map || !trigger) return;
  try {
    const response = await fetch(config.map);
    if (!response.ok) throw new Error('Floor plan unavailable');
    const data = await response.json();
    if (!data.image || !Array.isArray(data.locations) || data.locations.some(l => !l.id || !l.label || l.bounds?.length !== 4 || l.bounds.some(n => !Number.isFinite(n) || n < 0 || n > 100))) throw new Error('Invalid map data');
    const imageURL = new URL(data.image, new URL(config.map, location.href));
    if (!['http:', 'https:'].includes(imageURL.protocol)) throw new Error('Invalid map image');
    const dialog = el('dialog', 'floor-dialog');
    dialog.setAttribute('aria-labelledby', 'floor-title');
    const outside = event => {
      const rect = dialog.getBoundingClientRect();
      return event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom;
    };
    let backdropPress = false;
    dialog.addEventListener('pointerdown', event => { backdropPress = event.target === dialog && outside(event); });
    dialog.addEventListener('click', event => {
      if (backdropPress && event.target === dialog && outside(event)) dialog.close();
      backdropPress = false;
    });
    const header = el('div', 'floor-header');
    const title = el('h2', '', 'Floor plan'); title.id = 'floor-title';
    const close = el('button', '', 'Close'); close.type = 'button'; close.addEventListener('click', () => dialog.close());
    header.append(title, close);
    const layout = el('div', 'floor-layout'), mapPane = el('div', 'floor-pane');
    const tools = el('div', 'floor-tools');
    const picker = el('select'); picker.setAttribute('aria-label', 'Map location');
    picker.append(new Option('All locations', ''));
    data.locations.forEach(l => picker.append(new Option(l.label, l.id)));
    const zoomOut = el('button', '', '−'), zoomIn = el('button', '', '+'), fit = el('button', '', 'Fit');
    zoomOut.setAttribute('aria-label', 'Zoom out'); zoomIn.setAttribute('aria-label', 'Zoom in');
    const zoomLabel = el('span', 'floor-zoom', '100%');
    const reset = el('button', '', 'Reset'); reset.type = 'button';
    reset.setAttribute('aria-label', 'Reset map filters and zoom');
    tools.append(picker, zoomOut, zoomIn, fit, reset, zoomLabel);
    const viewport = el('div', 'floor-viewport'); viewport.tabIndex = 0;
    viewport.setAttribute('aria-label', 'Floor plan. Drag to pan, pinch or use plus and minus to zoom. Arrow keys pan.');
    const canvas = el('div', 'floor-canvas'), picture = el('img');
    picture.alt = 'Convention floor plan'; picture.draggable = false;
    picture.decoding = 'async';
    const responsiveImage = imageURL.hostname === 'images.squarespace-cdn.com' && Array.isArray(data.image_widths);
    if (responsiveImage) {
      picture.sizes = '(max-width: 760px) 94vw, 62vw';
      picture.srcset = [...new Set(data.image_widths)].filter(w => Number.isInteger(w) && w >= 100 && w <= 2500).sort((a,b)=>a-b).map(w => {
        const variant = new URL(imageURL); variant.searchParams.set('format', `${w}w`);
        return `${variant.href} ${w}w`;
      }).join(', ');
    }
    picture.src = imageURL.href;
    canvas.append(picture); viewport.append(canvas);
    const hint = el('p', 'muted floor-hint', 'Drag to pan · Pinch or + / − to zoom · Tap a marked area');
    const source = el('a', '', 'Original floor plan ↗');
    const sourceURL = new URL(data.source_url, location.href);
    if (['http:', 'https:'].includes(sourceURL.protocol)) source.href = sourceURL.href;
    source.target = '_blank'; source.rel = 'noopener noreferrer'; hint.append(' · ', source);
    const aside = el('section', 'floor-sessions'); aside.setAttribute('aria-label', 'Location sessions');
    const heading = el('h3', '', 'All locations'), note = el('p', 'muted');
    const day = el('select'); day.setAttribute('aria-label', 'Map schedule day');
    const list = el('div', 'floor-event-list');
    aside.append(heading, note, day, list);
    mapPane.append(tools, viewport, hint); layout.append(mapPane, aside); dialog.append(header, layout); document.body.append(dialog);
    let selected = null, scale = 1, x = 0, y = 0, baseW = 1, baseH = 1;
    const hotspots = new Map();
    // Prefer exact location/booth matches, then the most specific stage prefix.
    function locationFor(session) {
      return findMapLocation(data.locations, session);
    }
    function paint() {
      // Allow dragging even at Fit, while keeping a portion of the image visible.
      const visibleX = Math.min(baseW * scale, viewport.clientWidth) * .2;
      const visibleY = Math.min(baseH * scale, viewport.clientHeight) * .2;
      x = Math.max(visibleX - baseW * scale, Math.min(viewport.clientWidth - visibleX, x));
      y = Math.max(visibleY - baseH * scale, Math.min(viewport.clientHeight - visibleY, y));
      canvas.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
      if (responsiveImage && baseW > 1) picture.sizes = `${Math.ceil(baseW * scale)}px`;
      zoomLabel.textContent = `${Math.round(scale * 100)}%`;
      zoomOut.disabled = scale <= 1; zoomIn.disabled = scale >= 6;
    }
    function fitMap() {
      if (!picture.naturalWidth || !viewport.clientWidth) return;
      const ratio = picture.naturalHeight / picture.naturalWidth;
      baseW = Math.min(viewport.clientWidth, viewport.clientHeight / ratio); baseH = baseW * ratio;
      canvas.style.width = `${baseW}px`; canvas.style.height = `${baseH}px`;
      scale = 1; x = (viewport.clientWidth-baseW)/2; y = (viewport.clientHeight-baseH)/2; paint();
    }
    function zoom(value, cx=viewport.clientWidth/2, cy=viewport.clientHeight/2) {
      const next = Math.max(1, Math.min(6, value)), factor = next/scale;
      x = cx-(cx-x)*factor; y = cy-(cy-y)*factor; scale = next; paint();
    }
    const cardCache = new WeakMap();
    let renderVersion = 0, renderTimer;
    dialog.addEventListener('close', () => {
      renderVersion++; clearTimeout(renderTimer);
      list.setAttribute('aria-busy', 'false');
    });
    function showSessions() {
      const version = ++renderVersion;
      clearTimeout(renderTimer);
      list.replaceChildren();
      list.classList.toggle('floor-location-selected', Boolean(selected));
      heading.textContent = selected?.label || 'All locations';
      note.textContent = selected?.note || (selected ? 'Sessions at this location. Schedule-page filters do not apply here.' : 'All sessions. Use the day or location selector to narrow the list.');
      const matches = sessions.filter(s => (!selected || locationFor(s)?.id === selected.id) && (day.value === 'all' || s.date === day.value));
      if (!matches.length) {
        list.setAttribute('aria-busy', 'false');
        list.append(el('p', 'muted', 'No sessions listed for this location and day.')); return;
      }
      list.setAttribute('aria-busy', 'true');
      let date = null, index = 0;
      function batch() {
        if (version !== renderVersion || !dialog.open) return;
        const fragment = document.createDocumentFragment(), deadline = performance.now() + 8;
        let count = 0;
        while (index < matches.length && count < 6 && (count === 0 || performance.now() < deadline)) {
          const session = matches[index++];
          if (date !== session.date) { date = session.date; fragment.append(el('h4', '', date ? displayDate(date) : 'Day unconfirmed')); }
          let item = cardCache.get(session);
          if (!item) { item = card(session); cardCache.set(session, item); }
          fragment.append(item); count++;
        }
        list.append(fragment);
        if (index < matches.length) renderTimer = setTimeout(batch, 16);
        else list.setAttribute('aria-busy', 'false');
      }
      // Yield before card creation so the dialog and selected map area paint first.
      renderTimer = setTimeout(batch, 16);
    }
    let focusSelection = false;
    function focusLocation() {
      if (!selected || selected.overview) { fitMap(); return; }
      const [left,top,w,h] = selected.bounds; scale = 2.5;
      x = viewport.clientWidth/2 - baseW*(left+w/2)/100*scale;
      y = viewport.clientHeight/2 - baseH*(top+h/2)/100*scale; paint();
    }
    function refreshViewport() {
      fitMap();
      if (focusSelection) focusLocation();
    }
    function choose(id, focusMap=true) {
      focusSelection = focusMap;
      selected = data.locations.find(l => l.id === id) || null; picker.value = selected?.id || '';
      hotspots.forEach((b,key) => b.setAttribute('aria-pressed', String(key === id)));
      showSessions();
      if (!selected || selected.overview) fitMap();
      else if (focusMap) focusLocation();
    }
    for (const l of data.locations) {
      if (l.overview) continue;
      const button = el('button', 'floor-hotspot'); button.type='button'; button.title=l.label;
      button.setAttribute('aria-label', l.label); button.setAttribute('aria-pressed', 'false');
      const [left,top,width,height] = l.bounds;
      Object.assign(button.style, {left:`${left}%`,top:`${top}%`,width:`${width}%`,height:`${height}%`});
      if (Array.isArray(l.polygon) && l.polygon.length >= 3 && l.polygon.every(p => Array.isArray(p) && p.length === 2 && p.every(n => Number.isFinite(n) && n >= 0 && n <= 100))) {
        button.classList.add('floor-polygon');
        button.style.clipPath = `polygon(${l.polygon.map(([x,y]) => `${x}% ${y}%`).join(',')})`;
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 100 100'); svg.setAttribute('preserveAspectRatio', 'none'); svg.setAttribute('aria-hidden', 'true');
        const shape = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        shape.setAttribute('points', l.polygon.map(p => p.join(',')).join(' '));
        shape.setAttribute('vector-effect', 'non-scaling-stroke');
        svg.append(shape); button.append(svg);
      }
      button.addEventListener('click', () => { if (!dragged) choose(l.id, true); });
      canvas.append(button); hotspots.set(l.id,button);
    }
    let dragged=false, previous=null, dragStart=null; const pointers=new Map();
    function gesture() {
      const values=[...pointers.values()];
      return {cx:values.reduce((n,p)=>n+p.x,0)/values.length,cy:values.reduce((n,p)=>n+p.y,0)/values.length,distance:values.length>1 ? Math.hypot(values[0].x-values[1].x,values[0].y-values[1].y) : 0};
    }
    viewport.addEventListener('pointerdown', e => {
      if (e.button !== 0) return;
      e.preventDefault();
      if (!pointers.size) { dragged=false; dragStart={x:e.clientX,y:e.clientY}; }
      pointers.set(e.pointerId,{x:e.clientX,y:e.clientY}); previous=gesture();
      // Capture on the original target so an unmoved hotspot still receives its click.
      e.target.setPointerCapture(e.pointerId);
    });
    viewport.addEventListener('pointermove', e => {
      if (!pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId,{x:e.clientX,y:e.clientY}); const now=gesture();
      if (Math.hypot(e.clientX-dragStart.x,e.clientY-dragStart.y)>4 || pointers.size>1) dragged=true;
      x+=now.cx-previous.cx; y+=now.cy-previous.cy;
      if (now.distance && previous.distance) { const rect=viewport.getBoundingClientRect(); zoom(scale*now.distance/previous.distance,now.cx-rect.left,now.cy-rect.top); }
      else paint();
      previous=now;
    });
    for (const type of ['pointerup','pointercancel','lostpointercapture']) viewport.addEventListener(type,e=>{pointers.delete(e.pointerId);previous=pointers.size?gesture():null;});
    viewport.addEventListener('wheel',e=>{e.preventDefault();const rect=viewport.getBoundingClientRect();zoom(scale*Math.exp(-e.deltaY*.002),e.clientX-rect.left,e.clientY-rect.top);},{passive:false});
    viewport.addEventListener('keydown',e=>{
      if (['+','=','-','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home'].includes(e.key)) e.preventDefault();
      if (e.key==='+' || e.key==='=') zoom(scale*1.4);
      else if(e.key==='-') zoom(scale/1.4);
      else if(e.key==='Home') {focusSelection=false;fitMap();}
      else { if(e.key==='ArrowLeft')x+=50;if(e.key==='ArrowRight')x-=50;if(e.key==='ArrowUp')y+=50;if(e.key==='ArrowDown')y-=50;paint(); }
    });
    zoomIn.addEventListener('click',()=>zoom(scale*1.4));zoomOut.addEventListener('click',()=>zoom(scale/1.4));fit.addEventListener('click',()=>{focusSelection=false;fitMap();});
    reset.addEventListener('click',()=>{day.value='all';choose('');});
    picker.addEventListener('change',()=>choose(picker.value));day.addEventListener('change',showSessions);
    let imageReady = false;
    picture.addEventListener('load',()=>{
      // A higher-resolution srcset download must not reset the current pan/zoom.
      if (!imageReady) { imageReady = true; refreshViewport(); }
    });
    picture.addEventListener('error',()=>{hint.textContent='The floor plan image could not be loaded. You can still use the location list.';});
    new ResizeObserver(()=>{if(dialog.open)refreshViewport();}).observe(viewport);
    function open(id) {
      day.replaceChildren(new Option('All days','all'));
      [...new Set(sessions.map(s=>s.date).filter(Boolean))].sort().forEach(d=>day.append(new Option(displayDate(d),d)));
      if (!dialog.open) dialog.showModal();
      requestAnimationFrame(()=>{fitMap();choose(id || '',Boolean(id));});
    }
    globalThis.conventionMap={locationFor,open};
    trigger.disabled=false;trigger.addEventListener('click',()=>open());
    // The optional map can finish loading before or after the schedule.
    if (sessions.length) render();
  } catch(error) {
    trigger.disabled=true; trigger.textContent='Floor plan unavailable'; console.error(error);
  }
})();
