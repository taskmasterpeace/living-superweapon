// Runtime costs are ki, not ORIGIN point-buy prices. All three share directional
// blink mechanics; the longer escape buys distance with energy and recovery.
export const TELEPORT_TIERS = Object.freeze({
  'blink-short': Object.freeze({kind:'blink',name:'Snap Step',range:12,cost:6,cd:0.7,iframes:0.18}),
  blink: Object.freeze({kind:'blink',name:'Blink',range:22,cost:8,cd:1,iframes:0.3}),
  'blink-long': Object.freeze({kind:'blink',name:'Rift Step',range:36,cost:14,cd:1.5,iframes:0.3}),
});
