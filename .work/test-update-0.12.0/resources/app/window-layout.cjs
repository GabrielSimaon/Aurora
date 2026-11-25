'use strict';
const sizes={player:[560,285],playlist:[490,365],controls:[200,340],mixer:[550,330],piano:[700,175],karaoke:[600,290],chords:[530,320],livekeyboard:[720,640]};
const full={player:[1280,850],playlist:[850,650],controls:[300,540],mixer:[960,740],piano:[1100,340],karaoke:[1000,700],chords:[740,650],livekeyboard:[900,750]};
function fit(bounds,area){const width=Math.min(Math.max(180,bounds.width),area.width),height=Math.min(Math.max(140,bounds.height),area.height);return {width,height,x:Math.max(area.x,Math.min(bounds.x,area.x+area.width-width)),y:Math.max(area.y,Math.min(bounds.y,area.y+area.height-height))};}
function initial(type,area){const gap=12,left=area.x+gap,top=area.y+gap;const playerW=Math.min(560,Math.max(520,Math.floor(area.width*.4))),controlW=200,mixerW=Math.min(550,Math.max(360,area.width-playerW-controlW-4*gap));const playlistH=Math.min(365,Math.floor((area.height-3*gap)/2),Math.max(220,area.height-340-3*gap)),karaokeH=Math.min(290,Math.max(180,area.height-340-3*gap));let [width,height]=sizes[type],x=left,y=top;
 if(type==='playlist'){height=playlistH;x=area.x+area.width-width-gap;}
 if(type==='karaoke'){width=Math.min(600,area.width-sizes.playlist[0]-3*gap);height=karaokeH;}
 if(type==='player'){width=playerW;y=area.y+area.height-height-gap;}
 if(type==='controls'){x=left+playerW+gap;y=area.y+area.height-height-gap;}
 if(type==='mixer'){width=mixerW;height=Math.min(330,area.height-playlistH-3*gap);x=area.x+area.width-width-gap;y=top+playlistH+gap;}
 if(type==='chords'){x=left+30;y=top+30;}
 if(type==='piano')y=top+karaokeH+gap;
 return fit({x,y,width,height},area);}
module.exports={sizes,full,fit,initial};
