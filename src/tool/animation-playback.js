// Preview-only motion. Never apply these offsets to a gameplay Fighter.
export function advancePreview(time,delta,duration,loop){
 const next=time+delta;
 return loop?{time:next%duration,ended:false}:{time:Math.min(duration,next),ended:next>=duration};
}
export function previewOffset(context,phase){
 if(!context)return 0;
 const height=context.height||0,u=Math.max(0,Math.min(1,phase));
 return context.motion==='fall'?height*(1-u*u):height;
}
export const STUDY_CONTEXT={
 'Flailing fall':{motion:'fall',height:14},'Curled backward fall':{motion:'fall',height:14},
 'Air stunned':{motion:'fall',height:14},'Air stagger':{motion:'hover',height:7},
 'Blind flight':{motion:'hover',height:7},'Flying pickup':{motion:'hover',height:7},
 'Grappling hook deploy and hang':{motion:'hover',height:5},
};
