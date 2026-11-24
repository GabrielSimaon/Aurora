'use strict';
// Embedded compact panels talk only to their containing player; they own no audio engine.
if(window.parent!==window){
 document.documentElement.classList.add('embedded-panel');const listeners=new Map();
 function on(kind,fn){if(!listeners.has(kind))listeners.set(kind,[]);listeners.get(kind).push(fn);}
 function send(kind,value){window.parent.postMessage({source:'aurora-panel',kind,value},'*');}
 window.addEventListener('message',e=>{if(e.source!==window.parent||e.data?.source!=='aurora-workspace')return;for(const fn of listeners.get(e.data.kind)||[])fn(e.data.value);});
 window.panelDesktop={onPanelFrame:f=>on('panel-frame',f),onKaraoke:f=>on('karaoke-frame',f),onChordFrame:f=>on('chord-frame',f),onTheme:f=>on('theme-state',f),onPanelLayout:f=>on('panel-layout',f),panelAction:a=>send('panel-action',a),chordAction:a=>send('chord-action',a),alwaysTop:()=>{},setPanelCompact:()=>{},toggleKaraokeFullscreen:()=>send('maximize')};
 window.addEventListener('DOMContentLoaded',()=>send('ready'),{once:true});
 window.addEventListener('keydown',e=>{if(e.ctrlKey&&e.shiftKey&&e.key.toLowerCase()==='d'){e.preventDefault();send('toggle-dock');return;}if(e.key==='Escape'){e.preventDefault();send('escape');}});
}
