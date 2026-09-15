// Dimensions are game units (.19 metres each). Skins stay inside these bounds;
// authored placements supply the same solid volumes to rendering, LOS and routing.
export const HIGHWALL_MODULES=Object.freeze({
 wall:{depth:8,cap:3,plinth:5,panelInset:.32},
 pier:{width:10,depth:10},
 tower:{width:24,depth:24,shaft:45,opening:11,roof:3},
 palette:{concrete:0xbab29b,cap:0x343b37,steel:0x697064,dark:0x272e2a,gold:0xb69b56,blue:0x4b7181,red:0x975347,floor:0x6e7266,paint:0xcac5ad},
});
