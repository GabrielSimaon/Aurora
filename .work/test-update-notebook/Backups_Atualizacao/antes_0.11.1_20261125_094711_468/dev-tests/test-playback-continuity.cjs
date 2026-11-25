const fs=require('fs'),path=require('path'),http=require('http'),assert=require('node:assert/strict');
const {chromium}=require('playwright');const root=path.resolve(__dirname,'..');
(async()=>{
 const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}try{res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.html')?'text/html':'text/css');res.end(fs.readFileSync(file));}catch{res.writeHead(404).end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
 browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});const context=await browser.newContext(),errors=[];
 await context.addInitScript(()=>{window.__resets=0;window.__messages=[];window.desktop={getState:async()=>({ready:true,devices:[],status:'Test'}),onStatus(){},reset(){window.__resets++;},send(m){window.__messages.push(...m);},sendLong(){},setCompact(){},setTheme(){},setDocked(){},onTheme(){},onPanelLayout(){},onPanelsReady(){},onWindowState(){},onPanelAction(){},onShutdown(){},onChordAction(){},panelFrame(){},karaokeFrame(){},chordFrame(){}};});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:'+server.address().port+'/index.html');await page.waitForFunction(()=>window.auroraSessionReady);
 const result=await page.evaluate(async()=>{
 const check=(ok,message)=>{if(!ok)throw Error(message);};
 const base=songs[0];base.title='Origin';base.demo=false;songs.push({...base,name:'Second.mid',title:'Second',prefs:{}});captureList();
 // A library with 200 independent ~60 KB MIDI files. Padding is a legal sequencer-specific event.
 const demo=base.bytes;const track=Array.from(demo.subarray(22,-4));const padding=Array(58000).fill(32),length=padding.length;
 const vlq=n=>{const a=[n&127];while(n>>=7)a.unshift((n&127)|128);return a;};track.push(0,255,127,...vlq(length),...padding,0,255,47,0);
 const size=track.length;const bytes=Uint8Array.from([...demo.subarray(0,18),size>>>24,(size>>>16)&255,(size>>>8)&255,size&255,...track]);
 libraryLists.push({id:'large',name:'Large',sortMode:'custom',songs:Array.from({length:200},(_,i)=>({name:'Track '+i+'.mid',title:'Track '+i,bytes:bytes.slice(),prefs:{}}))},{id:'empty',name:'Empty',songs:[]});
 await player.play();player.seek(1);const song=player.song,voices=player.activeNotes,initialResets=window.__resets,initialIndex=player.index;const start=performance.now();
 await switchList('large');const firstSwitchMs=performance.now()-start;
 check(player.song===song&&player.playing,'browsing changed playing song');check(window.__resets===initialResets,'browsing reset MIDI');check(player.activeNotes===voices,'browsing replaced voices');check(selected===-1,'browsing highlighted unrelated row');
 player.setGain(1.2);await saveSongMix(true);check(playbackEntry.title==='Origin'&&playbackEntry.savedMix.gain===1.2,'mix saved to browsed song');check(!songs[0].savedMix,'browsing song overwritten');
 const beforeTheme=window.__messages.length;config.theme='light';applyConfig();check(window.__messages.length===beforeTheme,'visual setting resent MIDI controllers');
 const beforeEncoding=player.index,events=player.song.events;document.querySelector('#encoding').value='windows-1252';await document.querySelector('#encoding').onchange({target:document.querySelector('#encoding')});check(player.song===song&&player.song.events===events,'encoding replaced event stream');check(player.index>=beforeEncoding,'encoding rewound event cursor');check(window.__resets===initialResets,'settings reset transport');
 await switchList('empty');check(player.song===song&&player.playing,'empty playlist stopped music');
 const cachedStart=performance.now();await switchList('large');const cachedSwitchMs=performance.now()-cachedStart;check(window.__resets===initialResets,'cached switch reset output');
 // A later selection wins even when the first playlist is still being parsed.
 libraryLists.push({id:'slow',name:'Slow',songs:[{name:'Slow.mid',bytes:bytes.slice(),prefs:{}}]});const pending=switchList('slow');await switchList('large');await pending;check(activeListId==='large','stale worker result replaced newer playlist');
 // Changing the open list must preserve a scheduled fill and its exact successor.
 await switchList('default');playlistPlaying=true;queueNext(1);startFill();const target=transitionTarget();await switchList('large');check(fillConfirmation.scheduled&&transitionTarget()===target,'browsing changed scheduled fill');cancelFillConfirmation();nextQueue=[];
 // Steady-state saves must contain small metadata records and no embedded MIDI byte arrays.
 await saveSessionNow();const session=await dbGet('session');check(session.lists.every(l=>l.songs.every(s=>!s.bytes&&!s.parsed)),'session duplicates raw or parsed MIDI');check(session.lists.find(l=>l.id==='large').songs.every(s=>s.bytesKey),'MIDI references missing');
 const saveStart=performance.now();config.fontSize=40;await saveSessionNow();const saveMs=performance.now()-saveStart;
 // Natural advance still follows the source playlist after browsing another one.
 nextSong(1,true);check(currentSongEntry().title==='Second'&&player.playing,'advance used browsed playlist');
 selectSong(0);await switchList('large');queueNext(0);nextSong(1,true);check(currentSongEntry().title==='Track 0','queued song from another list did not play');check(transitionTarget()?.title==='Second','fill target failed to return to source list');nextSong(1,true);check(currentSongEntry().title==='Second','queue failed to return to source list');
 await switchList('large');const playingBefore=player.song;await playPlaylist();check(player.playing&&player.song!==playingBefore&&currentSongEntry()===songs[0],'play playlist paused the unrelated source');
 player.pause();return {firstSwitchMs,cachedSwitchMs,saveMs,librarySize:bytes.length*200,initialIndex};
 });
 console.log('PASS playback survives uncached/cached/empty playlist browsing, settings, correct mix owner and source-list advance',result);
 await page.reload();await page.waitForFunction(()=>window.auroraSessionReady);assert(await page.evaluate(()=>libraryLists.find(l=>l.id==='large').songs.every(s=>s.bytes?.length>58000)));assert.deepEqual(errors,[]);console.log('PASS split MIDI storage survives restart');
 }finally{await browser?.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
