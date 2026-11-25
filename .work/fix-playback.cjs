const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'../resources/app');
function edit(name,fn){const p=path.join(root,name);fs.writeFileSync(p,fn(fs.readFileSync(p,'utf8')));}
function replace(s,a,b){if(!s.includes(a))throw Error('Missing replacement: '+a.slice(0,100));return s.replace(a,b);}
edit('ui.js',s=>{
 s=replace(s,'const session=await dbGet(\'session\');restoreLibraryMetadata(session);',"const session=await dbGet('session');if(session)await restoreMidiBytes(session);restoreLibraryMetadata(session);");
 s=replace(s,'selected=i;selectedRow=i;const s=songs[i];player.load','selected=i;selectedRow=i;const s=songs[i];playbackEntry=s;playbackListId=activeListId;player.load');
 s=replace(s,'function renderSong(){let s=songs[selected],p=s?.parsed;', 'function renderSong(){let s=currentSongEntry(),p=player.song;');
 s=replace(s,'player.setVolume(config.volume);lastLyric=',"if(player.volume!==config.volume)player.setVolume(config.volume);lastLyric=");
 return s;
});
edit('playlist-ui.js',s=>{
 s=replace(s,'songs:songs.map(serializeSong),sortMode,vplFilePath','songs:songs.slice(),sortMode,vplFilePath');
 const start=s.indexOf('function switchList(id)'),end=s.indexOf('\nfunction askName',start);
 if(start<0||end<0)throw Error('switchList not found');
 s=s.slice(0,start)+`// Browsing a playlist does not alter the transport, active voices or pending fill.
let listSwitchGeneration=0;
function showList(list){activeListId=list.id;playlistName=list.name;sortMode=list.sortMode||'custom';vplFilePath=list.vplFilePath||null;songs=list.songs;selected=songs.indexOf(currentSongEntry());selectedRow=-1;shuffleDeck=[];renderQueue();renderLibrary();sendPanelFrame(true);persist();}
function switchList(id){if(id===activeListId)return Promise.resolve();const list=libraryLists.find(l=>l.id===id);if(!list)return Promise.resolve();const generation=++listSwitchGeneration;captureList();if(list.songs.every(s=>s.parsed||!s.bytes)){showList(list);return Promise.resolve();}return (async()=>{for(const song of list.songs){if(song.bytes&&!song.parsed){try{song.bytes=new Uint8Array(song.bytes);song.parsed=await parseMidiAsync(song.bytes,config.encoding);song.prefs=safePrefs(song.prefs);}catch{song.parsed=null;song.bytes=null;}}if(generation!==listSwitchGeneration)return;}if(generation===listSwitchGeneration)showList(list);})();}
`+s.slice(end);
 s=s.replaceAll('!!songs[selected]?.savedMix','!!currentSongEntry()?.savedMix').replaceAll('songs[selected].savedMix','currentSongEntry().savedMix');
 // Stop/clear only affect transport if it belongs to the playlist being edited.
 s=replace(s,'playlistPlaying=false;player.stop();songs=[];selected=-1;player.song=null;renderSong();',"if(playbackListId===activeListId){playlistPlaying=false;player.stop();player.song=null;playbackEntry=null;}songs=[];selected=-1;renderSong();");
 return s;
});
edit('mixer-ui.js',s=>{
 s=s.replaceAll('const song=songs[selected]', 'const song=currentSongEntry()').replaceAll('const saved=songs[selected]?.savedMix','const saved=currentSongEntry()?.savedMix');
 const start=s.indexOf("$('#encoding').onchange=" );
 if(start<0)throw Error('encoding handler');
 s=s.slice(0,start)+`let encodingGeneration=0;
$('#encoding').onchange=async e=>{const previous=config.encoding,encoding=e.target.value,generation=++encodingGeneration;const entry=currentSongEntry();try{const parsed=entry?.bytes?await parseMidiAsync(entry.bytes,encoding):null;if(generation!==encodingGeneration)return;config.encoding=encoding;
 // Encoding affects text only. Keep event identity, index, clock and all sounding notes.
 for(const list of libraryLists)for(const song of list.songs)if(song!==entry){song.parsedEncoding=null;}
 for(const song of songs)if(song!==entry)song.parsedEncoding=null;
 if(parsed&&currentSongEntry()===entry){for(const key of ['lines','metadata','markers'])entry.parsed[key]=parsed[key];entry.parsedEncoding=encoding;lastLyric='';renderSong();renderInspector();paint(true);}sendPanelFrame(true);persist();}catch(error){if(generation!==encodingGeneration)return;config.encoding=previous;e.target.value=previous;toast(error.message);}};
`;
 return s;
});
edit('performance-ui.js',s=>{
 s=replace(s,'function cleanQueue(){nextQueue=nextQueue.filter(q=>q.list===activeListId&&songs.includes(q.song)&&q.song.parsed);}',"function cleanQueue(){nextQueue=nextQueue.filter(q=>q.song.parsed&&(q.list===activeListId?songs:libraryLists.find(l=>l.id===q.list)?.songs||[]).includes(q.song));}");
 s=replace(s,'return nextQueue.map(q=>({index:songs.indexOf(q.song),title:q.song.title||q.song.name}));','return nextQueue.filter(q=>q.list===activeListId).map(q=>({index:songs.indexOf(q.song),title:q.song.title||q.song.name}));');
 s=replace(s,'const entry=nextQueue.shift();if(!queueAnchor)', 'const entry=nextQueue.shift();if(entry.list!==activeListId)switchList(entry.list);if(!queueAnchor)');
 s=replace(s,'return nextInPlaylist(direction,auto,playOptions);',"if(playbackListId&&playbackListId!==activeListId&&libraryLists.some(l=>l.id===playbackListId))switchList(playbackListId);return nextInPlaylist(direction,auto,playOptions);");
 // Target detection must follow the playing list even while another list is open.
 s=replace(s,'function transitionTarget(){cleanQueue();', 'function transitionTarget(){return inPlaybackContext(transitionTargetInList);}\nfunction inPlaybackContext(fn){if(!playbackListId||activeListId===playbackListId)return fn();const list=libraryLists.find(l=>l.id===playbackListId);if(!list)return fn();const saved={songs,selected,activeListId,sortMode};try{songs=list.songs;selected=songs.indexOf(playbackEntry);activeListId=list.id;sortMode=list.sortMode||\'custom\';return fn();}finally{({songs,selected,activeListId,sortMode}=saved);}}\nfunction transitionTargetInList(){cleanQueue();');
 return s;
});
edit('player.js',s=>replace(s,'setSpeed(s){this.speed=Math.max(.25,Math.min(2,s));this.last=performance.now();', 'setSpeed(s){if(this.playing&&!this.fill)this.tick();this.speed=Math.max(.25,Math.min(2,s));this.last=performance.now();'));
edit('index.html',s=>replace(s,'<script src="ui.js"></script>','<script src="midi-parser-client.js"></script><script src="ui.js"></script>'));
