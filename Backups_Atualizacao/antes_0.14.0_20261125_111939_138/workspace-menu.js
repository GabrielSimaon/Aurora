'use strict';
(function(){
 const toolbar=document.querySelector('#dockToolbar');
 const button=document.createElement('button');button.id='workspaceOptionsButton';button.className='button';button.textContent='☰ Opções';button.setAttribute('aria-haspopup','menu');button.setAttribute('aria-expanded','false');
 toolbar.querySelector('strong').after(button);
 const menu=document.createElement('div');menu.id='workspaceOptions';menu.setAttribute('popover','auto');menu.setAttribute('aria-label','Opções do Aurora MIDI');
 menu.innerHTML='<div class="workspace-menu-title">FERRAMENTAS</div><button data-action="library">Biblioteca e pastas…</button><button data-action="inspector">Detalhes e marcadores do MIDI…</button><details><summary>Estudo e trechos</summary><button data-action="piano">Piano: filtros e rolo de notas…</button><button data-action="chords">Acordes e modo estudo…</button><div id="workspaceLoopStatus"></div><button data-click="setA">Marcar início A</button><button data-click="setB">Marcar fim B</button><button data-click="loopAB">Ativar / desativar trecho A–B</button><button data-click="clearAB">Limpar trecho</button></details><div class="workspace-menu-title">TECLADO CONECTADO</div><div id="workspaceKeyboardOptions"></div><div class="workspace-menu-title">PROGRAMA</div><button data-action="settings">Configurações…</button><div id="workspaceAppearanceOptions"></div><details id="workspaceLayoutOptions"><summary>Organizar painéis</summary><div id="workspacePanelOptions"></div></details><button data-click="helpBtn">Ajuda e atalhos…</button><div class="workspace-author">Feito por Gabriel Simão</div>';
 document.body.append(menu);
 const move=(id,parent)=>{const node=document.getElementById(id);if(node)parent.append(node);};
 move('dockPanels',menu.querySelector('#workspacePanelOptions'));
 for(const id of ['openLiveKeyboard','openLeftHand'])move(id,menu.querySelector('#workspaceKeyboardOptions'));
 move('openCifraDog',menu.querySelector('#workspaceAppearanceOptions'));document.getElementById('themeToggle')?.remove();
 for(const id of ['dockLock','dockSave','dockReset'])move(id,menu.querySelector('#workspaceLayoutOptions'));
 for(const id of ['openStudio','compactMode','dockExit','dockToggle'])document.getElementById(id)?.remove();
 button.onclick=()=>{menu.querySelector('#workspaceLoopStatus').textContent='A: '+(player.loopA==null?'—':time(player.loopA))+' · B: '+(player.loopB==null?'—':time(player.loopB))+' · '+(player.loop?'Ativada':'Desativada');const rect=button.getBoundingClientRect();menu.style.left=Math.min(rect.left,Math.max(8,innerWidth-320))+'px';menu.style.top=rect.bottom+5+'px';menu.togglePopover();};
 menu.addEventListener('toggle',()=>button.setAttribute('aria-expanded',String(menu.matches(':popover-open'))));
 let contentWindow=null,restore=null;
 function openView(kind){
  if(kind==='settings'){openSettings();return;}
  const node=document.getElementById(kind+'View');if(!node)return;
  if(contentWindow?.open){contentWindow.close();restore?.();}
  const dialog=document.createElement('dialog');dialog.className='workspace-window';dialog.setAttribute('aria-label',({library:'Biblioteca e pastas',inspector:'Detalhes do MIDI',chords:'Acordes e violão',piano:'Piano e notas'})[kind]);
  const header=document.createElement('div');header.className='workspace-window-header';const title=document.createElement('h2');title.textContent=dialog.getAttribute('aria-label');const close=document.createElement('button');close.className='button small';close.textContent='Fechar';close.onclick=()=>dialog.close();header.append(title,close);
  const anchor=document.createComment('workspace-view-home');node.before(anchor);const hidden=node.classList.contains('hidden'),previousView=view;if(['chords','piano'].includes(kind))view=kind;node.classList.remove('hidden');
  let restored=false;restore=()=>{if(restored)return;restored=true;if(['chords','piano'].includes(kind))view=previousView;node.classList.toggle('hidden',hidden);anchor.replaceWith(node);dialog.remove();if(contentWindow===dialog)contentWindow=null;};dialog.addEventListener('close',restore,{once:true});dialog.append(header,node);document.body.append(dialog);contentWindow=dialog;dialog.showModal();
 }
 menu.addEventListener('click',event=>{const item=event.target.closest('button');if(!item)return;menu.hidePopover();if(item.dataset.action)openView(item.dataset.action);else if(item.dataset.click)document.getElementById(item.dataset.click)?.click();});
 const oldShowView=showView;showView=function(kind){if(window.dockWorkspace?.active){if(['library','inspector','chords','piano'].includes(kind))openView(kind);else if(DockLayout.ids.includes(kind)&&!DockLayout.leaves(dockWorkspace.getLayout()).includes(kind))dockWorkspace.toggle(kind);return;}oldShowView(kind);};
 // These legacy entry points now reveal their panel inside the same workspace.
 for(const [id,kind]of [['detachStage','karaoke'],['detachMixer','mixer'],['detachPiano','piano'],['chordWindow','chords']]){const node=document.getElementById(id);if(node){node.title='Mostrar painel de '+kind;node.onclick=()=>{if(!DockLayout.leaves(dockWorkspace.getLayout()).includes(kind))dockWorkspace.toggle(kind);};}}
 window.workspaceMenu={openView,close:()=>menu.hidePopover()};
})();
