'use strict';
(window.panelDesktop||window.desktop)?.onTheme?.(theme=>document.documentElement.dataset.theme=theme);
if(!document.body.classList.contains('compact-player')){
 let compact=true;const button=document.createElement('button');button.id='windowCompact';button.className='button small';button.textContent='Expandir';button.title='Alternar tamanho compacto desta janela';
 const toolbar=document.querySelector('.remote-panel header,.remote-toolbar>div,.stage-top');toolbar?.append(button);
 function apply(value){compact=!!value;document.body.classList.toggle('panel-compact',compact);button.textContent=compact?'Expandir':'Compactar';}
 button.onclick=()=>{apply(!compact);(window.panelDesktop||window.desktop)?.setPanelCompact?.(compact);};(window.panelDesktop||window.desktop)?.onPanelLayout?.(s=>apply(s.compact));apply(true);
}

if(!document.body.classList.contains('compact-player'))window.addEventListener('keydown',e=>{if((e.code!=='Space'&&e.key!==' ')||e.ctrlKey||e.altKey||e.metaKey||(/^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName)&&e.target.type!=='range')||e.target.isContentEditable||e.target.closest?.('[contenteditable]')||document.querySelector('dialog[open]'))return;e.preventDefault();e.stopImmediatePropagation();if(!e.repeat)(window.panelDesktop||window.desktop)?.panelAction?.({kind:'play'});},true);
