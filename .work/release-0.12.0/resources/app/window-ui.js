'use strict';
(window.panelDesktop||window.desktop)?.onTheme?.(theme=>document.documentElement.dataset.theme=theme);
if(!document.body.classList.contains('compact-player')){
 let compact=true;const button=document.createElement('button');button.id='windowCompact';button.className='button small';button.textContent='Expandir';button.title='Alternar tamanho compacto desta janela';
 const toolbar=document.querySelector('.remote-panel header,.remote-toolbar>div,.stage-top');toolbar?.append(button);
 function apply(value){compact=!!value;document.body.classList.toggle('panel-compact',compact);button.textContent=compact?'Expandir':'Compactar';}
 button.onclick=()=>{apply(!compact);(window.panelDesktop||window.desktop)?.setPanelCompact?.(compact);};(window.panelDesktop||window.desktop)?.onPanelLayout?.(s=>apply(s.compact));apply(true);
}

