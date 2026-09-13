import {PW_KB} from '../core/util.js';
// Shared by native fighter integration and read-only aimed-throw prediction.
export const fallingGravity=(f,g)=>60*(g.gravityZones?g.gravityZones.gravityFor(f):1);
export const thrownDrag=f=>f._chaseKb&&f.launchT>0?PW_KB.drag:1.3;
