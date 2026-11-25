/* Pure layout operations shared by the application and its tests. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.DockLayout=factory();})(typeof window!=='undefined'?window:globalThis,()=>{
 const ids=['player','playlist','controls','karaoke','mixer','piano','chords'];
 const leaf=id=>({id}),split=(axis,ratio,a,b)=>({axis,ratio,a,b});
 function defaults(){return split('row',.64,split('column',.5,leaf('karaoke'),split('row',.73,leaf('player'),leaf('controls'))),split('column',.48,leaf('playlist'),leaf('mixer')));}
 function leaves(node){return node?.id?[node.id]:node?[...leaves(node.a),...leaves(node.b)]:[];}
 function sanitize(raw){const seen=new Set();let count=0;function parse(n,depth){if(!n||typeof n!=='object'||depth>12||++count>30)return null;if(ids.includes(n.id)){if(seen.has(n.id))return null;seen.add(n.id);return leaf(n.id);}if(!['row','column'].includes(n.axis))return null;const a=parse(n.a,depth+1),b=parse(n.b,depth+1);if(!a)return b;if(!b)return a;return split(n.axis,Math.max(.12,Math.min(.88,Number.isFinite(n.ratio)?n.ratio:.5)),a,b);}const tree=parse(raw,0);return tree&&leaves(tree).includes('player')?tree:defaults();}
 function remove(node,id){if(!node)return null;if(node.id)return node.id===id?null:node;const a=remove(node.a,id),b=remove(node.b,id);return a&&b?{...node,a,b}:a||b;}
 function insert(node,id,target,edge='right'){if(node.id){if(node.id!==target)return node;const before=['left','top'].includes(edge),axis=['left','right'].includes(edge)?'row':'column';return split(axis,.5,before?leaf(id):node,before?node:leaf(id));}return {...node,a:insert(node.a,id,target,edge),b:insert(node.b,id,target,edge)};}
 function move(tree,id,target,edge){if(id===target||!ids.includes(id)||!leaves(tree).includes(target))return tree;if(edge==='center'&&leaves(tree).includes(id)){const swap=n=>n.id?leaf(n.id===id?target:n.id===target?id:n.id):{...n,a:swap(n.a),b:swap(n.b)};return swap(tree);}return insert(remove(tree,id),id,target,edge);}
 function toggle(tree,id){if(id==='player'||!ids.includes(id))return tree;if(leaves(tree).includes(id))return remove(tree,id);return id==='piano'?split('column',.81,tree,leaf(id)):split('row',id==='controls'?.8:.74,tree,leaf(id));}
 function minimum(node){if(node.id)return ({player:[380,250],playlist:[280,230],controls:[150,250],karaoke:[220,150],mixer:[300,210],piano:[240,140],chords:[240,200]})[node.id]||[100,100];const a=minimum(node.a),b=minimum(node.b);return node.axis==='row'?[a[0]+b[0]+5,Math.max(a[1],b[1])]:[Math.max(a[0],b[0]),a[1]+b[1]+5];}
 return {ids,defaults,leaves,sanitize,remove,move,toggle,minimum};
});
