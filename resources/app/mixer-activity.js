'use strict';
function mountMixerActivity(frame){
 const rack=document.createElement('div');rack.id='mixerActivity';rack.className='mixer-activity';rack.setAttribute('aria-label','Atividade MIDI por canal');
 const details=document.createElement('details');details.id='mixerDetails';details.className='mixer-details';const summary=document.createElement('summary');summary.textContent='Timbres, volumes e mixagem';details.append(summary);
 const toolbar=document.querySelector('.remote-mix-toolbar');toolbar.after(rack,details);
 for(const node of [document.querySelector('.remote-mix-toolbar+p.hint'),document.querySelector('#panel>p.hint'),document.querySelector('#remoteChannels'),document.querySelector('#remotePrefs')])if(node)details.append(node);
 rack.innerHTML=frame.channels.map(c=>'<div class="midi-activity-row" data-channel="'+c.id+'"><span class="activity-channel">'+String(c.id+1).padStart(2,'0')+'</span><div class="activity-segments" role="meter" aria-label="Atividade do canal '+(c.id+1)+'" aria-valuemin="0" aria-valuemax="127" aria-valuenow="0">'+Array.from({length:20},(_,i)=>'<i class="'+(i<12?'green':i<17?'yellow':'red')+'"></i>').join('')+'</div><button class="activity-name" title="Abrir ajustes deste instrumento"></button><span class="activity-notes"></span><button class="activity-mute" title="Silenciar canal" aria-label="Silenciar canal '+(c.id+1)+'">M</button><button class="activity-solo" title="Solo" aria-label="Solo do canal '+(c.id+1)+'">S</button></div>').join('');
 for(const row of rack.querySelectorAll('.midi-activity-row')){const ch=Number(row.dataset.channel);row.querySelector('.activity-mute').onclick=()=>send('mute',ch);row.querySelector('.activity-solo').onclick=()=>send('solo',ch);row.querySelector('.activity-name').onclick=()=>{details.open=true;const select=document.querySelector('.remote-channel[data-id="'+ch+'"] .program');select?.focus();select?.scrollIntoView({block:'nearest'});};}
}
function updateMixerActivity(frame){
 const noteName=n=>['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'][n%12]+(Math.floor(n/12)-1);
 for(const channel of frame.channels){const row=document.querySelector('.midi-activity-row[data-channel="'+channel.id+'"]');if(!row)continue;const activity=frame.activity?.find(a=>a.ch===channel.id),notes=frame.notes.filter(n=>n.ch===channel.id&&Number.isInteger(n.note)),level=activity?.level??notes.reduce((peak,n)=>Math.max(peak,n.velocity),0),steps=Math.ceil(level/127*20),name=row.querySelector('.activity-name'),program=channel.program>=0?channel.program:activity?.program??channel.originalProgram;
  name.textContent=channel.id===9?'Bateria':MidiCore.GM[program]||channel.name||'Instrumento';name.title='Canal '+(channel.id+1)+' · '+name.textContent+' — clique para ajustar';
  const labels=(activity?.notes||notes.map(n=>n.note)).map(noteName);const text=labels.slice(0,3).join(' ');row.querySelector('.activity-notes').textContent=text;row.querySelector('.activity-notes').title=labels.join(' ');
  const meter=row.querySelector('.activity-segments');meter.setAttribute('aria-valuenow',String(level));meter.querySelectorAll('i').forEach((segment,i)=>segment.classList.toggle('lit',i<steps));row.classList.toggle('sounding',level>0);row.classList.toggle('channel-muted',!!channel.mute);
  const serial=String(activity?.serial??0);row.classList.toggle('attacking',serial!==row.dataset.serial&&level>0);row.dataset.serial=serial;
  row.querySelector('.activity-mute').classList.toggle('active',!!channel.mute);row.querySelector('.activity-mute').setAttribute('aria-pressed',String(!!channel.mute));row.querySelector('.activity-solo').classList.toggle('active',!!channel.solo);row.querySelector('.activity-solo').setAttribute('aria-pressed',String(!!channel.solo));
 }
}
