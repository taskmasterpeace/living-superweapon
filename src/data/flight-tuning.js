// Adapted engine values, NOT BFP model animation or Quake units.
// BFP reconstruction: 90° horizontal at its 4:3 viewport (73.74° vertical), centered orbit,
// 110 range / +60 view-up. Provenance: docs/reference/BFP_CAMERA_AND_POSE_SOURCES.md.
// Preserve that vertical field on widescreen (Hor+), not a cropped 90° horizontal lens.
// The boom is calibrated against the 2:44 reference's hair/boot screen landmarks.
// boostFov / boostRange are additive increments over the base lens and range.
export const CAMERA_DEFAULTS = Object.freeze({
  fov: 73.74, range: 25.5, height: 9, shoulder: 0, boostFov: 0, boostRange: 0, cutaway: .9,
});
export const MOTION_DEFAULTS = Object.freeze({ acceleration: 9, braking: 5.5, boostAcceleration: 7.5, groundSprint:1.65 });
export const WAKE_DEFAULTS = Object.freeze({life:.62,width:.58,intensity:.92});
export const SURFACE_WAKE_DEFAULTS=Object.freeze({intensity:.85,minSpeed:55,maxHeight:26,life:2.2});
export const CRUISE_STYLE_LABELS=Object.freeze({'cruise-sides':'Cruise: arms at sides','cruise-fists':'Cruise: both fists forward','cruise-palms':'Cruise: both open hands forward','cruise-one':'Cruise: one fist forward','cruise-bent':'Cruise: fists near shoulders'});
export const FLIGHT_STYLES = Object.freeze(['hero','twin','martial','thruster','hammer','glider',...Object.keys(CRUISE_STYLE_LABELS)]);

// Procedural authored targets informed by BFP's separate idle/forward/back clips and the
// visible airborne silhouettes. Angles are radians in this rig, not recovered BFP joint data.
export const POSE_DEFAULTS = Object.freeze({
  // Arms extend down local -Y: negative LEFT roll / positive RIGHT roll opens
  // the elbow lanes. The former signs folded forearms into the ribs on recovery.
  hover: Object.freeze({armLx:-.12,armRx:-.18,armLz:-.22,armRz:.22,elbowL:.75,elbowR:.7,hipL:-.16,hipR:.12,kneeL:.5,kneeR:.3,headPitch:0}),
  forward: Object.freeze({armLx:.28,armRx:.28,armLz:-.18,armRz:.18,elbowL:.32,elbowR:.32,hipL:.04,hipR:-.08,kneeL:.24,kneeR:.16,headPitch:-.8}),
  backward: Object.freeze({armLx:-.55,armRx:-.62,armLz:-.3,armRz:.3,elbowL:1.12,elbowR:1.18,hipL:-.78,hipR:-.4,kneeL:1.2,kneeR:.8,headPitch:.08}),
  strafeLeft: Object.freeze({armLx:-.32,armRx:-.48,armLz:-.35,armRz:.3,elbowL:.9,elbowR:1.1,hipL:-.28,hipR:.02,kneeL:.72,kneeR:.45,headPitch:.02}),
  strafeRight: Object.freeze({armLx:-.48,armRx:-.32,armLz:-.3,armRz:.35,elbowL:1.1,elbowR:.9,hipL:.02,hipR:-.28,kneeL:.45,kneeR:.72,headPitch:.02}),
  brake: Object.freeze({armLx:-.55,armRx:-.62,armLz:-.44,armRz:.44,elbowL:1.2,elbowR:1.15,hipL:-.55,hipR:-.38,kneeL:1.05,kneeR:.8,headPitch:.08}),
  boost: Object.freeze({armLx:.3,armRx:.3,armLz:-.22,armRz:.22,elbowL:.26,elbowR:.26,hipL:.02,hipR:-.06,kneeL:.22,kneeR:.14,headPitch:-.85}),
});

const HERO_POSES = Object.freeze({
  ...POSE_DEFAULTS,
  // Confident rest: fists beside the hips, one tucked leg and one long leg.
  // Keep the martial family's raised forearms separate; saved joint overrides win.
  hover: Object.freeze({...POSE_DEFAULTS.hover,armLx:-.08,armRx:-.06,armLz:-.42,armRz:.3,elbowL:.2,elbowR:.32,hipL:.12,hipR:-.1,kneeL:.95,kneeR:.18}),
  forward: Object.freeze({...POSE_DEFAULTS.forward, armRx:-2.94, elbowR:.1}),
  boost: Object.freeze({...POSE_DEFAULTS.boost, armRx:-2.94, elbowR:.1}),
});

const family=(changes)=>Object.freeze(Object.fromEntries(Object.entries(POSE_DEFAULTS).map(([state,pose])=>[state,Object.freeze({...pose,...changes[state]})])));
const TWIN_POSES=family({
 hover:{armLx:-.25,armRx:-.3,elbowL:.6,elbowR:.7},
 forward:{armLx:-2.88,armRx:-2.98,armLz:.12,armRz:-.12,elbowL:.14,elbowR:.1},
 boost:{armLx:-3.04,armRx:-3.04,armLz:.1,armRz:-.1,elbowL:.08,elbowR:.08,kneeL:.12,kneeR:.1},
});
const THRUSTER_POSES=family({
 hover:{armLx:.08,armRx:.08,armLz:-.2,armRz:.2,elbowL:.08,elbowR:.08,hipL:.02,hipR:.02,kneeL:.12,kneeR:.12},
 forward:{armLx:.1,armRx:.1,armLz:-.18,armRz:.18,elbowL:.08,elbowR:.08,kneeL:.12,kneeR:.12,headPitch:-1.1},
 boost:{armLx:.08,armRx:.08,armLz:-.08,armRz:.08,elbowL:.05,elbowR:.05,kneeL:.08,kneeR:.08,headPitch:-1.2},
 brake:{armLx:-.65,armRx:-.65,armLz:-.4,armRz:.4,elbowL:.25,elbowR:.25,kneeL:.75,kneeR:.75},
});
const HAMMER_POSES=family({
 hover:{armRx:-2.35,armRz:.55,elbowR:.6,armLz:-.35,hipL:-.3,kneeL:.8,kneeR:.24},
 forward:{armRx:-2.6,armRz:.25,elbowR:.4,armLx:.45,armLz:-.35,elbowL:.2,hipL:-.18,kneeL:.6,kneeR:.18},
 boost:{armRx:-2.9,armRz:.15,elbowR:.16,armLx:.4,armLz:-.25,elbowL:.15,kneeL:.4,kneeR:.12},
});
const GLIDER_POSES=family({
 hover:{armLx:.12,armRx:.16,armLz:.16,armRz:-.16,elbowL:.16,elbowR:.12,kneeL:.36,kneeR:.16},
 forward:{armLx:.36,armRx:.36,armLz:.09,armRz:-.09,elbowL:.06,elbowR:.06,kneeL:.14,kneeR:.1,headPitch:-1.2},
 boost:{armLx:-2.8,armRx:.25,elbowL:.12,elbowR:.12,armLz:.1,armRz:-.14,kneeL:.2,kneeR:.12,headPitch:-1.2},
});
const cruise=(arms)=>family({forward:arms,boost:arms});
const CRUISE_POSES={
 'cruise-sides':cruise({armLx:0,armRx:0,armLz:-.12,armRz:.12,elbowL:.08,elbowR:.08}),
 'cruise-fists':cruise({armLx:-2.94,armRx:-2.94,armLz:-.1,armRz:.1,elbowL:.1,elbowR:.1}),
 'cruise-palms':cruise({armLx:-2.94,armRx:-2.94,armLz:-.1,armRz:.1,elbowL:.1,elbowR:.1}),
 'cruise-one':cruise({armLx:0,armRx:-2.94,armLz:-.12,armRz:.1,elbowL:.12,elbowR:.1}),
 'cruise-bent':cruise({armLx:-1.45,armRx:-1.45,armLz:-.22,armRz:.22,elbowL:1.65,elbowR:1.65}),
};
// Distinct procedural motion families, never a claim of recovered film/game animation.
export function poseDefaultsForStyle(style = 'martial') {
  return CRUISE_POSES[style]||({hero:HERO_POSES,twin:TWIN_POSES,thruster:THRUSTER_POSES,hammer:HAMMER_POSES,glider:GLIDER_POSES})[style]||POSE_DEFAULTS;
}
