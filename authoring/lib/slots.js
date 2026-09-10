// The production humanoid pose bridge (src/engine/authored-pose.js) consumes a 45-float frame:
//   [0..23]  eight unit segment directions: armL upper/fore, armR upper/fore, legL upper/lower, legR upper/lower
//   [24..43] five quaternions: hip, chest, head, footL, footR
//   [44]     source foot suspension divided by leg length
// These are the seventeen anatomical slots a source skeleton must be mapped onto to feed it.
export const HUMANOID_SLOTS=['hip','chest','head','shoulderL','elbowL','handL','shoulderR','elbowR','handR','hipL','kneeL','footL','toeL','hipR','kneeR','footR','toeR'];
export const POSE_BRIDGE={skeleton:'pw-pose-bridge@1',frameLength:45,layout:'8x3 unit segment directions, 5x4 quaternions (hip,chest,head,footL,footR), 1 support ratio',engineModule:'src/engine/authored-pose.js'};
export const KINDS=['humanoid-motion','humanoid-body','equipment','creature','prop'];
export const OUTPUT_ROLES=['pose-bank','glb','body','preview','report','recipe-copy'];
export const EVENT_TYPES=['footstep','contact','recovery','mag-out','mag-in','bolt','grenade-release','loop','custom'];
// Body posture at a clip's first and last frame, measured from the retargeted anatomy:
//   standing  torso up, hips at rest height          crouch    torso up, hips well below rest
//   prone     chest faces the ground, hips on it     supine    chest faces the sky, hips on the ground
//   airborne  hips above rest height                 transition anything between
export const POSTURES=['standing','crouch','prone','supine','airborne','transition'];
// What a clip IS, derived from its start/end posture and loop flag; never authored by hand.
export const CLIP_CATEGORIES=['cycle','action','get-up','fall','knockdown','crouch-cycle','crouch-action','prone-cycle','prone-action','supine-hold','prone-hold'];
export const VISUAL_STATUS=['approved','unapproved','unapproved-placeholder'];
