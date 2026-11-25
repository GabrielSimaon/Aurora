const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
(async()=>{
 const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}try{res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.html')?'text/html':'text/css');res.end(fs.readFileSync(file));}catch{res.writeHead(404).end();}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
 try{
  browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
  const context=await browser.newContext(),errors=[];
  await context.addInitScript(()=>{window.__resets=0;window.__commands=[];window.__dockCalls=[];window.__messages=[];window.desktop={getState:async()=>({ready:true,devices:[],status:'Test'}),onStatus(){},reset(){__resets++;},send(m){__messages.push(...m);},sendLong(){},timeline(request){__commands.push({kind:request.kind,position:request.position,speed:request.speed});},setCompact(){},setTheme(){},setDocked(value){__dockCalls.push(value);},onTheme(){},onPanelLayout(){},onPanelsReady(){},onWindowState(){},onPanelAction(){},onShutdown(){},onChordAction(){},panelFrame(){},karaokeFrame(){},chordFrame(){}};});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.setViewportSize({width:1366,height:768});await page.goto('http://127.0.0.1:'+server.address().port+'/index.html');await page.waitForFunction(()=>window.auroraSessionReady&&dockWorkspace.active);
  await page.evaluate(()=>{config.scan=false;config.autoplay=false;window.__player=player;window.__song=player.song;window.__frames=[...document.querySelectorAll('#dockCanvas iframe')];});
  await page.locator('#play').focus();await page.keyboard.press('Space');await page.waitForFunction(()=>player.playing&&player.nativeTimelineRunning);await page.keyboard.press('Space');await page.waitForFunction(()=>!player.playing);await page.keyboard.press('Space');await page.waitForFunction(()=>player.playing);
  for(const id of ['controls','mixer','playlist','piano','karaoke','chords']){
   await page.evaluate(id=>{if(!DockLayout.leaves(dockWorkspace.getLayout()).includes(id))dockWorkspace.toggle(id);},id);
   const frameLocator=page.frameLocator('.dock-tile[data-panel="'+id+'"] iframe');await frameLocator.locator('body').waitFor();
   const frame=page.frames().find(f=>id==='karaoke'?new URL(f.url()).pathname.endsWith('/stage.html'):id==='chords'?new URL(f.url()).pathname.endsWith('/chord-stage.html'):f.url().includes('type='+id));
   await frame.evaluate(()=>document.body.focus());await frameLocator.locator('body').press('Space');await page.waitForFunction(()=>!player.playing);await frameLocator.locator('body').press('Space');await page.waitForFunction(()=>player.playing);
   await frame.evaluate(()=>window.dispatchEvent(new KeyboardEvent('keydown',{key:' ',code:'Space',repeat:true,bubbles:true})));assert(await page.evaluate(()=>player.playing),'holding Space in '+id+' toggles only once');
  }
  const before=await page.evaluate(()=>({resets:__resets,commands:__commands.length,position:player.position,layout:JSON.stringify(dockWorkspace.getLayout()),dockCalls:__dockCalls.length}));
  await page.locator('#compactPrefs').click();assert(await page.locator('#settings').evaluate(e=>e.open&&e.matches(':modal')),'settings must be a foreground dialog');
  const box=await page.locator('#settings').boundingBox();assert(box.x>=0&&box.y>=0&&box.x+box.width<=1366&&box.y+box.height<=768,'settings must fit the dock');
  await page.locator('#fontSize').fill('44');await page.locator('#fontSize').dispatchEvent('input');await page.locator('#themeSelect').selectOption('light');await page.locator('#encoding').selectOption('windows-1252');
  assert(await page.evaluate(()=>player===__player&&player.song===__song&&player.playing&&player.nativeTimelineRunning),'settings must preserve the same running transport');
  assert.equal(await page.evaluate(()=>__resets),before.resets,'settings and visual changes must not reset MIDI');assert.equal(await page.evaluate(()=>__commands.length),before.commands,'visual settings must not restart the native timeline');
  assert.equal(await page.evaluate(()=>JSON.stringify(dockWorkspace.getLayout())),before.layout);assert.equal(await page.evaluate(()=>__dockCalls.length),before.dockCalls,'settings must never detach panels');
  await page.locator('#fontSize').focus();await page.keyboard.press('Space');await page.waitForFunction(()=>!player.playing);await page.keyboard.press('Space');await page.waitForFunction(()=>player.playing);
  await page.keyboard.press('Escape');assert(!await page.locator('#settings').evaluate(e=>e.open));assert(await page.evaluate(()=>dockWorkspace.active&&player.playing),'closing settings keeps dock and music');
  // A long renderer stall advances the display to the native clock and never
  // bursts its already queued attacks into the output a second time.
  const stall=await page.evaluate(()=>{const sent=__messages.length,position=player.position;const until=performance.now()+1300;while(performance.now()<until){}player.tick();return {advance:player.position-position,sent:__messages.length-sent,running:player.nativeTimelineRunning};});
  assert(stall.advance>1.25&&stall.running);assert.equal(stall.sent,0);assert.deepEqual(errors,[]);await page.evaluate(()=>player.stop());
  console.log('PASS Space from main player, all six embedded panels and settings, held-key debounce, dock-preserving foreground settings, no audio resets for visual/encoding changes, and no duplicate notes after a 1.3-second renderer stall');
 }finally{await browser?.close();server.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
