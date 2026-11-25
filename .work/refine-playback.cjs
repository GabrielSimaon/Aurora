const fs=require('fs'),path=require('path'),root=path.resolve(__dirname,'../resources/app');
function edit(file,fn){const p=path.join(root,file);fs.writeFileSync(p,fn(fs.readFileSync(p,'utf8')));}
function sub(s,a,b){if(!s.includes(a))throw Error(a);return s.replace(a,b);}
edit('ui.js',s=>{
 s=sub(s,"const lists=snapshotLists();const encode=", "const lists=snapshotLists(),metadata={selected,config:structuredClone(config),repeat,shuffle,activeListId,playlistName,sortMode,vplFilePath};const encode=");
 s=sub(s,"const active=savedLists.find(l=>l.id===activeListId);await dbSet('session',{songs:active?.songs||[],selected,config,repeat,shuffle,lists:savedLists,activeListId,playlistName,sortMode,vplFilePath});", "const active=savedLists.find(l=>l.id===metadata.activeListId);await dbSet('session',{...metadata,songs:active?.songs||[],lists:savedLists});");
 s=sub(s,'if(selected<0||songs[selected]?.demo)selectSong(first);','if((selected<0&&!player.song)||songs[selected]?.demo)selectSong(first);');
 s=sub(s,'if(shouldPlay)player.play({fast:playlistPlaying&&config.fastTransitions,...playOptions});lastLyric=', 'if(shouldPlay)player.play({fast:playlistPlaying&&config.fastTransitions,...playOptions});if(s.parsedEncoding===null)refreshSongText(s);lastLyric=');
 return s;
});
edit('playlist-ui.js',s=>{
 s=sub(s,'songs:songs.slice(),sortMode,vplFilePath','songs:songs.slice(),sortMode,vplFilePath,shuffleDeck:shuffleDeck.slice()');
 s=sub(s,"selectedRow=-1;shuffleDeck=[];renderQueue();", "selectedRow=-1;shuffleDeck=list.shuffleDeck||[];renderQueue();");
 s=sub(s,'function switchList(id){if(id===activeListId)return Promise.resolve();const list=libraryLists.find(l=>l.id===id);if(!list)return Promise.resolve();const generation=++listSwitchGeneration;', 'function switchList(id){const generation=++listSwitchGeneration;if(id===activeListId)return Promise.resolve();const list=libraryLists.find(l=>l.id===id);if(!list)return Promise.resolve();');
 s=sub(s,'song.bytes=new Uint8Array(song.bytes);song.parsed=await parseMidiAsync(song.bytes,config.encoding);song.prefs=', 'if(!(song.bytes instanceof Uint8Array))song.bytes=new Uint8Array(song.bytes);const encoding=config.encoding;song.parsed=await parseMidiAsync(song.bytes,encoding);song.parsedEncoding=encoding===config.encoding?encoding:null;song.prefs=');
 s=sub(s,'const playing=playlistPlaying&&player.playing;', 'const playing=playlistPlaying&&playbackListId===activeListId&&player.playing;');
 s=sub(s,"(playing?'Pausar playlist':playlistPlaying?'Continuar playlist':'Tocar playlist')", "(playing?'Pausar playlist':playlistPlaying&&playbackListId===activeListId?'Continuar playlist':'Tocar playlist')");
 s=sub(s,'if(playlistPlaying&&player.playing){player.pause();','if(playlistPlaying&&playbackListId===activeListId&&player.playing){player.pause();');
 s=sub(s,'const resuming=playlistPlaying;', 'const resuming=playlistPlaying&&playbackListId===activeListId;');
 s=sub(s,'selected,playing:playlistPlaying,sortMode,', 'selected,playing:playlistPlaying&&playbackListId===activeListId,sortMode,');
 s=sub(s,"activeListId='removed';switchList(rest[0].id);", "activeListId='removed';await switchList(rest[0].id);");
 return s;
});
edit('performance-ui.js',s=>{
 s=sub(s,'let nextQueue=[],queueAnchor=null,fromQueue=false;', 'let nextQueue=[],queueAnchor=null,queueAnchorListId=null,fromQueue=false;');
 s=sub(s,'if(!queueAnchor)queueAnchor=songs[selected];', 'if(!queueAnchor){queueAnchor=playbackEntry;queueAnchorListId=playbackListId;}');
 s=sub(s,'if(direction>0&&queueAnchor){const order=', 'if(direction>0&&queueAnchor){if(queueAnchorListId&&queueAnchorListId!==activeListId)switchList(queueAnchorListId);const order=');
 s=sub(s,'const saved={songs,selected,activeListId,sortMode};', 'const saved={songs,selected,activeListId,sortMode,shuffleDeck};');
 s=sub(s,"sortMode=list.sortMode||'custom';return fn();}finally{({songs,selected,activeListId,sortMode}=saved);", "sortMode=list.sortMode||'custom';shuffleDeck=list.shuffleDeck||(list.shuffleDeck=[]);return fn();}finally{({songs,selected,activeListId,sortMode,shuffleDeck}=saved);");
 return s;
});
edit('mixer-ui.js',s=>{
 s=sub(s,"$('#audioOutput').onchange=async e=>{const position=player.position;", "$('#audioOutput').onchange=async e=>{if(config.output===e.target.value)return;const position=player.position;");
 s+='\nasync function refreshSongText(entry){const encoding=config.encoding;try{const parsed=await parseMidiAsync(entry.bytes,encoding);if(config.encoding!==encoding)return;for(const key of [\'lines\',\'metadata\',\'markers\'])entry.parsed[key]=parsed[key];entry.parsedEncoding=encoding;if(currentSongEntry()===entry){lastLyric=\'\';renderSong();renderInspector();paint(true);}}catch(error){toast(error.message);}}\n';
 return s;
});
edit('midi-parser-client.js',s=>sub(s,'new Promise(resolve=>setTimeout(()=>resolve(MidiCore.parse(bytes,encoding)),0))', 'new Promise((resolve,reject)=>setTimeout(()=>{try{resolve(MidiCore.parse(bytes,encoding));}catch(error){reject(error);}},0))'));
