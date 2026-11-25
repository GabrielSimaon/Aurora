'use strict';
// One capture handler per document, shared by the player and every panel.
window.addEventListener('keydown',event=>{
 if((event.code!=='Space'&&event.key!==' ')||event.ctrlKey||event.altKey||event.metaKey||event.isComposing)return;
 const target=event.target;
 if(target?.isContentEditable||target?.closest?.('[contenteditable]:not([contenteditable="false"])')||target?.tagName==='TEXTAREA'||target?.tagName==='SELECT'||target?.tagName==='INPUT'&&!['range','checkbox','radio','button','submit','reset'].includes(target.type)||document.querySelector('dialog[open]:not(#settings)'))return;
 event.preventDefault();event.stopImmediatePropagation();if(event.repeat)return;
 if(window.player){if(window.player.playing)window.player.pause();else window.player.play();}
 else (window.panelDesktop||window.desktop)?.panelAction?.({kind:'play'});
},true);
