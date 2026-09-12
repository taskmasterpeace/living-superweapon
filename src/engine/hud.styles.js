// WAR WORLD: ASCENDANTS — the HUD stylesheet, extracted from hud.js (2026-07-24 review:
// a 72KB pure string was a quarter of the module). Injected once by hud's style build.
export const CSS = `
#hud .wrap{ position:absolute; inset:0; }
body.report-open #hud .wrap > :not(.endscr),body.report-open #pwInventory,body.report-open #pwInventoryMobile,body.report-open #plMood,body.report-open #frontlineObjective,body.report-open #zombieObjective,body.report-open #desertSecurity,body.report-open #comicLayer{display:none!important}
body:not(.playing) #frontlineObjective,body:not(.playing) #zombieObjective,body:not(.playing) #desertSecurity{display:none!important}
#hud .combat-dock{ display:contents; }
#hud .status-dock{ display:contents; }
#hud .vignette{ position:absolute; inset:0; pointer-events:none; background:radial-gradient(125% 105% at 50% 44%, transparent 52%, rgba(0,0,0,.28) 82%, rgba(0,0,0,.62) 100%); z-index:0; }
#hud .radar{ position:absolute; top:16px; right:18px; width:152px; height:152px; padding:0; border-radius:var(--r-3); overflow:hidden; }
#hud .radar canvas{ display:block; width:152px; height:152px; }
#hud .radar .rlab{ position:absolute; top:6px; left:9px; font-size:var(--t-tiny); letter-spacing:.2em; color:#9a9384; text-transform:uppercase; z-index:2; }
#hud .hitring{ position:absolute; inset:0; pointer-events:none; z-index:5; overflow:hidden; }
#hud .hitarc{ position:absolute; width:360px; height:360px; transform:translate(-50%,-50%); border-radius:50%; background:radial-gradient(circle, rgba(255,52,34,.5), rgba(255,52,34,.16) 45%, transparent 70%); opacity:.95; transition:opacity .55s ease-out; }
#hud .danger{ position:absolute; inset:0; pointer-events:none; z-index:1; opacity:0; background:radial-gradient(115% 100% at 50% 50%, transparent 56%, rgba(190,16,16,.44) 100%); transition:opacity .2s linear; }
#hud .kobanner{ position:absolute; left:50%; top:34%; transform:translateX(-50%) scale(.55); opacity:0; text-align:center; pointer-events:none; z-index:6; transition:opacity .12s ease, transform .2s cubic-bezier(.2,1.6,.4,1); }
#hud .kobanner .kob{ font-family:'Rajdhani','Inter',sans-serif; font-weight:800; font-size:118px; line-height:.82; letter-spacing:.05em; color:#fff; text-shadow:0 6px 0 #7a0d05, 0 0 44px rgba(255,90,40,.75); }
#hud .kobanner .kos{ font-size:16px; letter-spacing:.32em; text-transform:uppercase; color:var(--gold-pale); margin-top:6px; }
#hud .panel{ position:absolute; background:rgba(8,10,16,.55); border:1px solid rgba(255,255,255,.10); border-radius:var(--r-3); backdrop-filter:blur(4px); }
#hud .pl{ left:18px; bottom:18px; padding:12px 14px; min-width:240px; }
#hud .pl .nm{ font-weight:800; font-size:20px; letter-spacing:.04em; }
#hud .pl .rl{ font-size:var(--t-sm); text-transform:uppercase; letter-spacing:.16em; color:var(--text-4); margin-bottom:8px; }
#hud .bar{ height:12px; border-radius:var(--r-2); background:rgba(0,0,0,.5); overflow:hidden; margin-top:6px; box-shadow:inset 0 0 0 1px rgba(255,255,255,.08); }
#hud .bar > i{ display:block; height:100%; width:50%; border-radius:var(--r-2); transition:width .09s linear; }
#hud .hpF{ background:linear-gradient(90deg,var(--danger),#ff9a3a); }
#hud .kiF{ background:linear-gradient(90deg,#3aa0ff,var(--info)); }
#hud .kiF.low{ background:linear-gradient(90deg,#f5a21a,var(--gold-pale)); }
#hud .kiF.crit{ background:linear-gradient(90deg,var(--danger),#ff9a3a); animation:kipulse .45s infinite; }
@keyframes kipulse{ 50%{ filter:brightness(1.7); } }
#hud .bar.kiflash{ box-shadow:0 0 16px rgba(255,90,74,.95), inset 0 0 0 1px rgba(255,110,90,.95); }
#hud .kistate{ color:var(--danger-2); font-weight:800; letter-spacing:.14em; margin-left:8px; opacity:0; transition:opacity .15s; }
#hud .kistate.on{ opacity:1; animation:kipulse .45s infinite; }
#hud .kiover{ color:var(--info); font-weight:800; letter-spacing:.14em; margin-left:8px; opacity:0; transition:opacity .15s; }
#hud .kiover.on{ opacity:1; text-shadow:0 0 10px rgba(127,230,255,.8); }
#title .pvthreat{ display:inline-block; font-size:var(--t-label); font-weight:800; letter-spacing:.14em; text-transform:uppercase; padding:3px 10px; border-radius:var(--r-pill); margin-top:8px; border:1px solid; }
#title .sheet{ margin-top:12px; border-top:1px solid rgba(255,255,255,.1); padding-top:10px; }
#title .sheet .sh{ font-size:var(--t-tiny); letter-spacing:.22em; color:var(--text-5); text-transform:uppercase; margin-bottom:6px; }
#title .arow{ display:flex; align-items:center; gap:7px; font-size:var(--t-sm); margin-bottom:3px; }
#title .arow .an2{ width:70px; color:var(--text-4); letter-spacing:.06em; text-transform:uppercase; font-size:var(--t-label); }
#title .arow .av{ width:14px; text-align:right; font-weight:800; color:var(--text); }
#title .arow .arank{ font-size:var(--t-tiny); font-weight:800; letter-spacing:.08em; text-transform:uppercase; padding:1px 7px; border-radius:var(--r-2); border:1px solid; }
#title .arow .abar{ flex:1; height:5px; background:rgba(0,0,0,.45); border-radius:var(--r-1); overflow:hidden; }
#title .arow .abar i{ display:block; height:100%; border-radius:var(--r-1); }
#title .tals{ margin-top:8px; display:flex; flex-wrap:wrap; gap:5px; }
#title .tals span{ font-size:var(--t-label); padding:3px 9px; border-radius:var(--r-4); background:rgba(127,230,255,.1); color:#a8dcff; border:1px solid rgba(127,230,255,.28); }
#title .tals span b{ color:#e0f2ff; }
#title .gear{ margin-top:8px; font-size:var(--t-sm); color:var(--text-2); }
#title .gear b{ color:var(--gold); }
#hud .slot.deny{ animation:slotshake .32s; }
#hud .slot.deny{ border-color:var(--danger); box-shadow:0 0 12px rgba(255,90,74,.5); }
@keyframes slotshake{ 0%,100%{transform:translateX(0)} 22%{transform:translateX(-4px)} 55%{transform:translateX(3px)} 80%{transform:translateX(-2px)} }
#hud .slot .cost.nope{ color:#ff7a6a; font-weight:800; }
#hud .lab{ font-size:var(--t-label); letter-spacing:.14em; color:var(--text-5); text-transform:uppercase; margin-top:8px; }
#hud .slots{ left:50%; transform:translateX(-50%); bottom:16px; display:flex; gap:8px; padding:10px; }
#hud .slot{ width:66px; height:66px; border-radius:var(--r-3); background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.10); position:relative; overflow:hidden; display:flex; flex-direction:column; justify-content:flex-end; padding:6px; }
#hud .slot .key{ position:absolute; top:4px; left:6px; font-size:var(--t-sm); font-weight:800; color:var(--gold); letter-spacing:.06em; }
#hud .slot .cost{ position:absolute; top:4px; right:6px; font-size:var(--t-label); color:#7fbfff; }
#hud .slot .an{ font-size:var(--t-label); line-height:1.05; color:var(--text); font-weight:600; }
#hud .slot .cd{ position:absolute; left:0; right:0; bottom:0; background:rgba(0,0,0,.62); height:0%; transition:height .05s linear; }
#hud .slot .cdn{ position:absolute; inset:0; display:flex; align-items:center; justify-content:center;
  font-family:var(--f-mono); font-size:var(--t-lg); font-weight:700; color:var(--gold-pale); text-shadow:0 2px 6px #000; pointer-events:none; }
#hud .slot.ult{ border-color:rgba(245,178,26,.5); box-shadow:0 0 16px rgba(245,178,26,.25); }
#hud .slot.dim{ opacity:.4; }
#hud .slot.locked{opacity:.78;border-style:dashed;border-color:var(--gold);}
#hud .slot.locked .cdn{font-size:12px;background:rgba(20,17,11,.7);align-items:flex-start;padding-top:22px;}
#hud .slot.on{ border-color:var(--gold); box-shadow:0 0 16px rgba(255,210,74,.5); }
#hud .slot.sel{ outline:2px solid var(--info); outline-offset:2px; }   /* wheel-selected power */
/* ---- THE HANDS ROW — what your fists are wrapped around, directly above the powers.
   The two rows are one control block on purpose: "what am I holding" over "what can I throw",
   read in a single glance. It sits at 112 to clear the charge bar (96..106) so a charging power
   never covers it. Slots occupy 16..102. */
#hud .hands{ left:50%; transform:translateX(-50%); bottom:112px; padding:5px 10px 6px; display:none; flex-direction:column; align-items:center; gap:3px; }
#hud .hands .hhl{ font-size:var(--t-micro); letter-spacing:.22em; color:var(--text-5); text-transform:uppercase; }
#hud .hands .hrow{ display:flex; gap:6px; align-items:center; flex-wrap:wrap; justify-content:center; }
#hud .hchip{ display:inline-flex; align-items:center; gap:5px; font-size:var(--t-sm); font-weight:700; letter-spacing:.05em;
  padding:3px 9px; border-radius:var(--r-4); background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.10); color:var(--text-4); white-space:nowrap; }
#hud .hchip b{ font-family:var(--f-mono); font-size:var(--t-label); font-weight:700; color:var(--gold); opacity:.9; }
/* 2H is DATA, not decoration — geometry at 9px, never an emoji at the mercy of the platform font */
#hud .hchip u{ font-family:var(--f-mono); font-size:var(--t-micro); text-decoration:none; letter-spacing:.08em;
  padding:1px 4px; border-radius:var(--r-1); background:rgba(0,0,0,.35); color:var(--text-5); }
#hud .hchip.on{ font-weight:800; box-shadow:0 0 14px rgba(255,210,74,.18); }
#hud .hchip.on b{ color:inherit; opacity:1; }
#hud .hchip.on u{ color:inherit; opacity:.85; }
#hud .hchip.draw{ animation:handDraw .35s ease-out; }
#hud .hchip.scav{ border-color:rgba(255,210,74,.55); background:rgba(255,210,74,.10); color:var(--gold-pale); }
@keyframes handDraw{ 0%{ transform:translateY(4px) scale(.92); filter:brightness(1.9) } 100%{ transform:none; filter:none } }
#hud .hnote{ font-size:var(--t-micro); font-weight:700; letter-spacing:.14em; color:var(--text-5); text-transform:uppercase; }
#hud .hnote.draw{ color:var(--gold); }
#hud .hnote.bad{ color:var(--danger); }
#hud .foe{ left:50%; transform:translateX(-50%); top:16px; width:min(520px,60vw); padding:8px 12px; text-align:center; }
#hud .foe .fn{ font-weight:700; letter-spacing:.06em; font-size:var(--t-md); }
#hud .foe .bar{ height:9px; }
#hud .foe .fhpF{ background:linear-gradient(90deg,var(--danger),#ffb03a); }
#hud .hint{ right:18px; bottom:18px; padding:14px 16px; max-width:284px; font-size:var(--t-body); color:var(--text-3); line-height:1.6; transition:opacity .4s ease, transform .4s ease; }
#hud .hint b{ color:var(--gold); font-weight:700; }
#hud .hint .hgrp{ margin-bottom:12px; } #hud .hint .hgrp:last-child{ margin-bottom:0; }
#hud .hint .hgt{ font-family:var(--f-mono); font-size:var(--t-micro); letter-spacing:var(--tr-wider); color:var(--info);
  border-bottom:1px solid rgba(127,230,255,.22); padding-bottom:2px; margin-bottom:3px; }
#hud .hint .hgr{ display:flex; gap:10px; line-height:1.6; }
#hud .hint .hgr b{ flex:0 0 92px; text-align:right; font-size:var(--t-label); }
#hud .hint .hgr span{ color:var(--text-3); font-size:var(--t-label); }
/* the wall of text earns its place for ~18s, then gets out of the way (F1 brings it back) */
#hud .hint.mini{ max-width:none; padding:6px 11px; font-size:var(--t-label); letter-spacing:.14em; color:var(--text-5); }
#hud .hint.mini .hintbody{ display:none; }
#hud .hint .hintchip{ display:none; white-space:nowrap; }
#hud .hint.mini .hintchip{ display:block; }
#hud .hint .hintchip b{ color:var(--gold); }
/* off-screen target arrow — the fight can hide from you now, so point at it */
#hud .foearrow{ position:absolute; width:0; height:0; pointer-events:none; z-index:6; opacity:0; transition:opacity .2s; }
#hud .foearrow i{ position:absolute; left:-13px; top:-13px; width:26px; height:26px; border-radius:50%; background:rgba(255,90,74,.16); border:1.5px solid rgba(255,90,74,.85); box-shadow:0 0 14px rgba(255,90,74,.45); }
#hud .foearrow u{ position:absolute; left:-5px; top:-24px; width:0; height:0; border-left:6px solid transparent; border-right:6px solid transparent; border-bottom:11px solid var(--danger); transform-origin:5px 17px; }
#hud .foearrow span{ position:absolute; left:16px; top:-8px; font-size:var(--t-label); font-weight:800; letter-spacing:.1em; color:var(--danger-2); text-shadow:0 1px 3px #000; white-space:nowrap; }
#hud .foearrow.on{ opacity:.95; }
#hud .charge{ left:50%; transform:translateX(-50%); bottom:96px; width:280px; height:10px; display:none; }
#hud .charge > i{ background:linear-gradient(90deg,var(--gold),#ff5a2a); }
#hud .feed{ left:18px; top:16px; padding:6px 10px; font-size:var(--t-body); color:#cbb; display:flex; flex-direction:column; gap:2px; background:transparent; border:none; }
#hud .feed div{ opacity:.9; }
/* select screen additions */
#title .selwrap{ display:flex; gap:22px; align-items:stretch; max-width:1080px; width:100%; }
#title .preview{ flex:0 0 300px; text-align:left; border:1px solid rgba(255,255,255,.12); border-radius:var(--r-4); padding:18px; background:rgba(255,255,255,.03); display:flex; flex-direction:column; }
#title .preview .pvname{ font-size:30px; font-weight:800; letter-spacing:.03em; }
#title .preview .pvttl{ font-size:var(--t-body); letter-spacing:.2em; text-transform:uppercase; color:var(--gold-pale); margin:2px 0 12px; }
#title .preview .pvblurb{ font-size:var(--t-lg); color:var(--text-2); line-height:1.5; }
#title .preview .pvsig{ margin-top:12px; display:flex; flex-direction:column; gap:6px; }
#title .preview .pvsig span{ font-size:var(--t-body); color:var(--text); background:rgba(255,255,255,.05); border-radius:var(--r-2); padding:5px 8px; border-left:1px solid var(--pc,var(--gold)); }
#title .rcard.sel{ border-color:var(--pc); background:rgba(255,255,255,.09); box-shadow:0 0 22px -6px var(--pc); transform:translateY(-3px); }
#title .rcard .rl{ margin-top:2px; }
#title .rcard .cstat{ font-size:var(--t-label); color:var(--text-5); margin-top:4px; letter-spacing:.04em; }
#title .rcard .cstat b{ color:#e8c39a; }
#title .preview{ flex:0 0 350px; max-height:70vh; overflow-y:auto; }
#title .pvstats{ margin-top:14px; display:flex; flex-direction:column; gap:5px; }
#title .statrow{ display:flex; align-items:center; gap:8px; font-size:var(--t-sm); }
#title .statrow .sl{ width:78px; color:var(--text-4); letter-spacing:.1em; text-transform:uppercase; }
#title .statrow .sb{ flex:1; height:8px; background:rgba(0,0,0,.45); border-radius:var(--r-1); overflow:hidden; box-shadow:inset 0 0 0 1px rgba(255,255,255,.08); }
#title .statrow .sb > i{ display:block; height:100%; border-radius:var(--r-1); transition:width .25s ease; }
#title .statrow .sv{ width:20px; text-align:right; color:var(--text); font-weight:800; }
#title .pvtags{ margin-top:11px; display:flex; flex-wrap:wrap; gap:6px; }
#title .pvtags span{ font-size:var(--t-label); letter-spacing:.1em; text-transform:uppercase; padding:3px 9px; border-radius:var(--r-pill); background:rgba(255,210,74,.12); color:var(--gold-pale); border:1px solid rgba(255,210,74,.32); }
#title .pvabil{ margin-top:13px; border-top:1px solid rgba(255,255,255,.1); padding-top:11px; display:flex; flex-direction:column; gap:8px; }
#title .pvabil .ab b{ display:inline-block; min-width:38px; font-size:var(--t-sm); letter-spacing:.03em; }
#title .pvabil .ab .an{ font-weight:700; color:var(--text); font-size:var(--t-body); }
#title .pvabil .ab .ad{ display:block; color:#9c958a; font-size:var(--t-sm); line-height:1.3; margin-left:38px; }
#title .modes{ display:flex; gap:12px; justify-content:center; margin:4px 0; flex-wrap:wrap; }
#title .modecard{ cursor:pointer; width:158px; padding:12px 14px; border-radius:var(--r-3); border:1px solid rgba(255,255,255,.10); background:rgba(255,255,255,.03); text-align:left; transition:transform .12s, border-color .12s, background .12s; }
#title .modecard:hover{ transform:translateY(-2px); background:rgba(255,255,255,.06); }
#title .modecard.sel{ border-color:var(--mc,var(--gold)); box-shadow:0 0 22px -8px var(--mc,var(--gold)); background:rgba(255,255,255,.08); }
#title .modecard .mi{ font-size:22px; }
#title .modecard .mn{ font-weight:800; font-size:16px; letter-spacing:.03em; margin-top:2px; }
#title .modecard .mt{ font-size:var(--t-label); letter-spacing:.14em; text-transform:uppercase; color:var(--text-4); }
#title .ptabs{ display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
#title .ptabs .pt{ cursor:pointer; font-weight:800; font-size:var(--t-body); letter-spacing:.06em; padding:8px 14px; border-radius:var(--r-2); border:1px solid rgba(255,255,255,.12); background:rgba(255,255,255,.04); color:var(--text-3); }
#title .ptabs .pt.on{ background:linear-gradient(180deg,var(--gold),var(--gold-warm)); color:var(--on-gold); border:none; }
#title .ptabs .p2pick{ cursor:pointer; font-weight:700; font-size:var(--t-body); padding:8px 12px; border-radius:var(--r-2); border:1px solid rgba(255,255,255,.14); color:var(--text); }
#title .modehint{ font-size:var(--t-md); color:var(--text-3); line-height:1.5; }
#hud .gd{ height:7px; }
#hud .gdF{ background:linear-gradient(90deg,#9fd0ff,#e6f2ff); }
#hud .gdF.stagger{ background:linear-gradient(90deg,#ff6a4a,#ffb03a); }
#hud .dmgwrap{ position:absolute; inset:0; overflow:hidden; }
#hud .dmg{ position:absolute; font-weight:800; letter-spacing:.01em; transform:translate(-50%,-50%); text-shadow:0 2px 5px rgba(0,0,0,.85), 0 0 12px rgba(0,0,0,.5); will-change:transform,opacity; }
#hud .combo{ position:absolute; left:50%; top:88px; transform:translateX(-50%) scale(1); transform-origin:top center; text-align:center; opacity:0; transition:opacity .14s ease, transform .09s ease; }
#hud .combo .n{ font-weight:800; font-size:46px; line-height:.9; color:var(--gold); text-shadow:0 3px 0 var(--gold-shadow), 0 0 24px rgba(245,178,26,.55); }
#hud .combo .l{ font-size:var(--t-body); letter-spacing:.28em; color:var(--gold-pale); text-transform:uppercase; }
#hud .paused{ position:absolute; inset:0; display:none; align-items:center; justify-content:center; background:rgba(4,5,9,.5); backdrop-filter:blur(2px); }
#hud .paused .t{ font-size:40px; font-weight:800; letter-spacing:.14em; color:var(--gold); text-shadow:0 0 30px rgba(245,178,26,.4); }
#hud .hitflash{ position:absolute; inset:0; opacity:0; pointer-events:none; mix-blend-mode:screen; }
#hud .modebar{ left:50%; transform:translateX(-50%); top:12px; display:flex; align-items:center; gap:16px; padding:8px 20px; }
#hud .modebar .seg{ display:flex; flex-direction:column; align-items:center; min-width:52px; }
#hud .modebar .mv{ font-size:23px; font-weight:800; letter-spacing:.03em; line-height:1; }
#hud .modebar .ml{ font-size:var(--t-tiny); letter-spacing:.16em; color:var(--text-4); text-transform:uppercase; margin-top:3px; }
#hud .modebar .vs{ color:var(--text-5); font-weight:800; font-size:var(--t-md); }
#hud .announce{ position:absolute; left:50%; top:20%; transform:translateX(-50%) scale(1); transform-origin:top center; text-align:center; opacity:0; transition:opacity .18s ease, transform .12s ease; pointer-events:none; }
#hud .announce .at{ font-size:54px; font-weight:800; letter-spacing:.05em; text-shadow:0 4px 0 rgba(0,0,0,.5), 0 0 34px rgba(0,0,0,.5); }
#hud .announce .as{ font-size:var(--t-lg); letter-spacing:.22em; text-transform:uppercase; color:var(--text); margin-top:2px; }
#hud .xpwrap{ margin-top:9px; display:flex; align-items:center; gap:8px; }
#hud .pl{ transition:min-width .5s cubic-bezier(.19,1,.22,1); }
#hud .tierb{ display:inline-flex; align-items:center; justify-content:center; height:26px; padding:0 9px; border-radius:var(--r-2); font-weight:800; font-size:var(--t-body); letter-spacing:.08em; flex:0 0 auto; background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.14); color:var(--text-3); }
#hud .tierb.t2{ background:linear-gradient(180deg,var(--gold),var(--gold-warm)); color:var(--on-gold); border:none; box-shadow:0 0 12px rgba(245,178,26,.5); }
#hud .tierb.t3{ background:linear-gradient(180deg,#ffedb0,var(--gold)); color:var(--on-gold); border:none; box-shadow:0 0 16px rgba(255,224,138,.7); }
#hud .tierb.t4{ background:linear-gradient(180deg,#ffffff,#ffedb0); color:var(--on-gold); border:none; box-shadow:0 0 22px rgba(255,255,255,.8); animation:kipulse .6s infinite; }
#hud .lvl{ display:inline-flex; align-items:center; justify-content:center; width:26px; height:26px; border-radius:var(--r-2); background:linear-gradient(180deg,var(--gold),var(--gold-warm)); color:var(--on-gold); font-weight:800; font-size:var(--t-lg); box-shadow:0 2px 0 var(--gold-shadow); flex:0 0 auto; }
#hud .xp{ flex:1; height:6px; border-radius:var(--r-1); background:rgba(0,0,0,.5); overflow:hidden; box-shadow:inset 0 0 0 1px rgba(255,255,255,.08); }
#hud .xp > i{ display:block; height:100%; background:linear-gradient(90deg,var(--gold),#ffe89a); border-radius:var(--r-1); transition:width .2s; }
#hud .kit{ left:18px; bottom:212px; padding:9px 13px; min-width:210px; }   /* docked to the player panel, not floating */
#hud .kit .kh{ font-size:var(--t-label); letter-spacing:.16em; color:var(--text-5); text-transform:uppercase; margin-bottom:5px; }
#hud .kit .chips{ display:flex; flex-wrap:wrap; gap:5px; }
#hud .kit .chip{ font-size:var(--t-sm); font-weight:700; padding:3px 9px; border-radius:var(--r-4); background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.10); color:var(--text-3); }
#hud .kit .chip.on{ color:var(--on-gold); }
#hud .endscr{ position:absolute; inset:0; display:none; flex-direction:column; align-items:center; justify-content:center; gap:14px; background:radial-gradient(120% 90% at 50% 40%, rgba(14,10,6,.72), rgba(4,5,9,.94)); pointer-events:auto; z-index:40; }
#hud .endscr .et{ font-size:76px; font-weight:800; letter-spacing:.04em; }
#hud .endscr .el{ font-size:16px; color:var(--text-2); text-align:center; line-height:1.6; }
#hud .endscr .stats{ display:flex; gap:28px; margin:10px 0 6px; }
#hud .endscr .stat .sv{ font-size:32px; font-weight:800; color:var(--gold); text-align:center; }
#hud .endscr .stat .sl{ font-size:var(--t-sm); letter-spacing:.14em; color:var(--text-4); text-transform:uppercase; text-align:center; }
#hud .endscr .btns{ display:flex; gap:12px; margin-top:6px; }
#hud .endscr button{ pointer-events:auto; cursor:pointer; font-family:inherit; font-weight:800; letter-spacing:.12em; font-size:var(--t-lg); color:var(--on-gold); padding:13px 24px; border:none; border-radius:var(--r-3); background:linear-gradient(180deg,var(--gold),var(--gold-warm)); box-shadow:0 5px 0 var(--gold-shadow); text-transform:uppercase; }
#hud .endscr button.ghost{ background:rgba(255,255,255,.08); color:var(--text); box-shadow:none; border:1px solid rgba(255,255,255,.15); }
/* ORIGIN — forge card + custom-hero affordances */
#title .rcard{ position:relative; }
#title .rcard .cchip{ position:absolute; top:8px; right:8px; font-size:var(--t-micro); font-weight:800; letter-spacing:.14em; padding:2px 7px; border-radius:var(--r-2); background:rgba(255,210,74,.14); border:1px solid rgba(255,210,74,.4); color:var(--gold-pale); }
#title .rcard .cedit{ position:absolute; bottom:8px; right:8px; font-size:var(--t-md); opacity:0; transition:opacity .12s; color:var(--gold); }
#title .rcard:hover .cedit{ opacity:.95; }
#title .rcard.forge{ border-style:dashed; border-color:rgba(255,210,74,.4); background:rgba(255,210,74,.04); display:flex; flex-direction:column; align-items:center; justify-content:center; gap:2px; min-height:96px; text-align:center; }
#title .rcard.forge .fplus{ font-size:26px; font-weight:800; color:var(--gold); line-height:1; }
#title .rcard.forge:hover{ box-shadow:0 0 22px -6px var(--gold); }
/* interactive tutorial banner */
#hud .tut{ left:50%; transform:translateX(-50%); top:64px; width:min(560px,82vw); padding:13px 18px 12px; text-align:center; z-index:8; }
#hud .tut .tact{ font-family:var(--f-mono); font-size:var(--t-micro); letter-spacing:var(--tr-wider); color:var(--gold); margin-bottom:3px; }
#hud .tut .tdist{ font-family:var(--f-mono); font-size:var(--t-sm); color:var(--info); margin-top:3px; min-height:1.1em; }
#hud .tut .tstep{ font-size:var(--t-tiny); letter-spacing:.24em; color:var(--text-5); text-transform:uppercase; }
#hud .tut .tobj{ font-family:'Rajdhani','Inter',sans-serif; font-weight:800; font-size:27px; color:var(--gold); letter-spacing:.04em; line-height:1.1; margin:2px 0; }
#hud .tut .tkeys{ display:inline-block; font-weight:800; font-size:var(--t-md); color:var(--on-gold); background:linear-gradient(180deg,var(--gold),var(--gold-warm)); padding:4px 13px; border-radius:var(--r-2); margin:4px 0 2px; box-shadow:0 2px 0 var(--gold-shadow); }
#hud .tut .ttip{ font-size:var(--t-body); color:var(--text-3); margin-top:4px; }
#hud .tut .tdots{ display:flex; gap:5px; justify-content:center; margin-top:9px; }
#hud .tut .tdots i{ width:8px; height:8px; border-radius:50%; background:rgba(255,255,255,.14); }
#hud .tut .tdots i.on{ background:var(--gold); box-shadow:0 0 8px rgba(255,210,74,.6); }
#hud .tut .tskip{ position:absolute; top:9px; right:12px; cursor:pointer; font-size:var(--t-label); letter-spacing:.12em; color:var(--text-5); text-transform:uppercase; pointer-events:auto; }
#hud .tut .tskip:hover{ color:var(--gold); }
@keyframes tutpop{ 0%{ transform:translateX(-50%) scale(.92);} 60%{ transform:translateX(-50%) scale(1.05);} 100%{ transform:translateX(-50%) scale(1);} }
#hud .tut.pop{ animation:tutpop .3s ease; }
/* pause menu */
#hud .paused{ flex-direction:column; pointer-events:auto; z-index:45; }
#hud .paused .pwrap{ display:flex; flex-direction:column; gap:10px; align-items:center; background:rgba(8,10,16,.78); border:1px solid rgba(255,255,255,.12); border-radius:var(--r-4); padding:26px 34px; backdrop-filter:blur(6px); }
#hud .paused button{ cursor:pointer; font-family:inherit; font-weight:800; letter-spacing:.12em; font-size:var(--t-lg); color:var(--on-gold); padding:12px 26px; min-width:240px; border:none; border-radius:var(--r-3); background:linear-gradient(180deg,var(--gold),var(--gold-warm)); box-shadow:0 4px 0 var(--gold-shadow); text-transform:uppercase; }
#hud .paused button.ghost{ background:rgba(255,255,255,.08); color:var(--text); box-shadow:none; border:1px solid rgba(255,255,255,.15); }
/* full-screen overlays (options / how-to-play) — live on <body> so they stack over the title */
.lswovl .roomcode{ text-align:center; font-size:var(--t-lg); letter-spacing:.2em; color:var(--text-4); margin-bottom:12px; }
.lswovl .roomcode b{ font-size:34px; letter-spacing:.34em; color:var(--gold); text-shadow:0 0 18px rgba(245,178,26,.4); margin-left:8px; }
.lswovl .netvs{ display:flex; align-items:center; gap:14px; justify-content:center; margin-bottom:14px; }
.lswovl .netp{ flex:1; text-align:center; border:1px solid rgba(255,255,255,.12); border-radius:var(--r-3); padding:14px 10px; background:rgba(255,255,255,.03); }
.lswovl .netp b{ display:block; font-size:16px; color:var(--text); }
.lswovl .netp span{ display:block; font-size:var(--t-body); color:var(--info); margin-top:2px; }
.lswovl .netp em{ display:block; font-style:normal; font-size:var(--t-tiny); letter-spacing:.2em; color:var(--text-5); margin-top:5px; }
.lswovl .netp.wait b{ color:var(--text-5); font-size:var(--t-md); }
.lswovl .vs2{ font-weight:800; color:var(--gold); }
.lswovl .hsec{ margin-bottom:13px; }
/* ---- THE COLD OPEN: the home page as a news hour ---- */
#title .colddesk{ display:flex; gap:18px; align-items:stretch; max-width:60rem; margin:64px auto 4px; margin-top:max(64px, 0px);
  padding:12px; background:var(--surface); border:1px solid var(--line); border-radius:var(--r-3); }
#title .cdmon{ position:relative; flex:0 0 auto; width:288px; aspect-ratio:16/9; border-radius:var(--r-2);
  overflow:hidden; background:#05070a; border:1px solid var(--line-2); box-shadow:inset 0 0 40px rgba(0,0,0,.9); }
#title .cdmon canvas{ width:100%; height:100%; display:block; image-rendering:auto; }
#title .cdscan{ position:absolute; inset:0; pointer-events:none;
  background:repeating-linear-gradient(0deg, rgba(0,0,0,.22) 0 1px, transparent 1px 3px); }
#title .cdbug{ position:absolute; top:7px; left:8px; font-family:var(--f-display); font-weight:700;
  font-size:13px; letter-spacing:-.02em; color:#fff; text-shadow:0 2px 6px #000; }
#title .cdbug b{ color:var(--broadcast); }
#title .cdlive{ position:absolute; top:7px; right:8px; display:flex; align-items:center; gap:4px;
  font-family:var(--f-mono); font-size:var(--t-micro); letter-spacing:var(--tr-wide); color:#fff; text-shadow:0 2px 6px #000; }
#title .cdlive i{ width:6px; height:6px; border-radius:50%; background:var(--broadcast); animation:cdBlink 1.1s steps(1,end) infinite; }
@keyframes cdBlink{ 50%{ opacity:.15 } }
#title .cdclock{ position:absolute; bottom:26px; right:8px; font-family:var(--f-mono); font-size:var(--t-micro);
  color:#fff; text-shadow:0 2px 6px #000; }
#title .cdlower{ position:absolute; left:0; right:0; bottom:0; padding:4px 8px; background:linear-gradient(90deg,var(--broadcast),rgba(160,32,32,0));
  font-family:var(--f-mono); font-size:var(--t-micro); letter-spacing:var(--tr-wide); color:#fff; white-space:nowrap; overflow:hidden; }
#title .cdside{ flex:1 1 auto; min-width:0; display:flex; flex-direction:column; justify-content:center; text-align:left; gap:6px; }
#title .cdkick{ font-family:var(--f-mono); font-size:var(--t-micro); letter-spacing:var(--tr-wider); color:var(--broadcast); }
#title .cdhead{ font-family:var(--f-display); font-weight:700; font-size:clamp(1.1rem,2.4vw,1.7rem);
  line-height:1.08; color:var(--text); animation:cdIn .5s ease both; }
@keyframes cdIn{ from{ opacity:0; transform:translateY(6px) } }
#title .cdsub{ font-size:var(--t-sm); color:var(--text-3); line-height:1.5; }
#title .cdstats{ display:flex; flex-wrap:wrap; gap:6px 18px; margin-top:6px; padding-top:8px; border-top:1px dashed var(--line-gold); }
#title .cdstats div{ display:flex; flex-direction:column; }
#title .cdstats b{ font-family:var(--f-mono); font-size:var(--t-micro); letter-spacing:var(--tr-wide); color:var(--text-5); font-weight:400; }
#title .cdstats span{ font-family:var(--f-display); font-size:var(--t-body); color:var(--gold); }
@media (max-width:760px){
  #title .colddesk{ flex-direction:column; align-items:center; margin-top:96px; }
  #title .cdmon{ width:100%; max-width:340px; }
  #title .cdside{ text-align:center; } #title .cdstats{ justify-content:center; }
}
/* ---- THE ESTABLISHING SHOT: the city announces itself, then gets out of the way ---- */
#hEstablish{ position:fixed; inset:0; z-index:64; display:none; align-items:center; justify-content:center;
  pointer-events:none; background:var(--ink);
  transition:background 1.5s cubic-bezier(.4,0,.2,1), opacity .9s ease; }
#hEstablish.lift{ background:rgba(13,15,20,0); }
#hEstablish.lift .estinner{ transform:translateY(-14px); opacity:0; }
#hEstablish.gone{ opacity:0; }
#hEstablish .estinner{ text-align:center; max-width:44rem; padding:0 2rem;
  transition:transform 1.5s cubic-bezier(.4,0,.2,1), opacity 1.3s ease;
  animation:estIn 1.1s cubic-bezier(.2,.7,.3,1) both; }
@keyframes estIn{ from{ opacity:0; transform:translateY(16px) } to{ opacity:1; transform:none } }
#hEstablish .estkick{ font-family:var(--f-mono); font-size:var(--t-micro); letter-spacing:var(--tr-wider);
  color:var(--text-5); margin-bottom:14px; }
#hEstablish .esttitle{ font-family:var(--f-display); font-weight:700; font-size:clamp(2.6rem,7vw,5.2rem);
  line-height:1; letter-spacing:-.02em; color:var(--text); text-shadow:0 6px 40px rgba(0,0,0,.9); }
#hEstablish .estsub{ font-family:var(--f-display); font-size:var(--t-lg); letter-spacing:var(--tr-wider);
  text-transform:uppercase; color:var(--gold); margin-top:8px; }
#hEstablish .eststats{ display:grid; grid-template-columns:repeat(auto-fit,minmax(9.5rem,1fr)); gap:12px 22px;
  margin-top:26px; padding-top:18px; border-top:1px dashed var(--line-gold); }
#hEstablish .eststat{ text-align:left; }
#hEstablish .eststat b{ display:block; font-family:var(--f-mono); font-size:var(--t-micro);
  letter-spacing:var(--tr-wide); color:var(--text-5); font-weight:400; margin-bottom:3px; }
#hEstablish .eststat span{ font-family:var(--f-display); font-size:var(--t-body); color:var(--text-2); }
#hEstablish .eststat span.estbad{ color:var(--danger); }
#hEstablish .estbarline{ height:3px; background:var(--line); border-radius:2px; margin-top:5px; overflow:hidden; }
#hEstablish .estbarline i{ display:block; height:100%; animation:estBar 1.4s cubic-bezier(.2,.7,.3,1) both .4s; }
@keyframes estBar{ from{ width:0 !important } }
/* the simulation boots instead of arriving */
#hEstablish.sim{ background:#04191c; }
#hEstablish.sim.lift{ background:rgba(4,25,28,0); }
#hEstablish.sim .esttitle{ color:#7fe6d0; text-shadow:0 0 30px rgba(127,230,208,.4); }
#hEstablish.sim .estsub{ color:#4ad8c0; }
#hEstablish .estboot{ display:grid; gap:5px; margin-top:24px; font-family:var(--f-mono);
  font-size:var(--t-micro); letter-spacing:var(--tr-wide); text-align:left; }
#hEstablish .estboot div{ display:flex; justify-content:space-between; gap:2rem; color:#4ad8c0;
  border-bottom:1px solid rgba(74,216,192,.18); padding-bottom:4px;
  animation:estIn .5s ease both; }
#hEstablish .estboot div:nth-child(2){ animation-delay:.18s } #hEstablish .estboot div:nth-child(3){ animation-delay:.36s }
#hEstablish .estboot div:nth-child(4){ animation-delay:.54s }
#hEstablish .estboot b{ color:rgba(127,230,208,.55); font-weight:400; }
#hEstablish .estbar{ height:2px; background:rgba(74,216,192,.2); margin-top:20px; overflow:hidden; }
#hEstablish .estbar i{ display:block; height:100%; background:#4ad8c0; width:0; animation:estBoot 1.4s ease both; }
@keyframes estBoot{ to{ width:100% } }
@media (max-width:640px){ #hEstablish .eststats{ grid-template-columns:1fr 1fr } }
/* --- THE DAMAGE CODEX --- */
.lswovl .dgbox{ max-width:64rem; }
#hDamage{ z-index:65; }
.lswovl .dgsub{ font-size:var(--t-sm); color:var(--text-3); line-height:1.62; margin-bottom:14px; }
.lswovl .dgsec{ font-family:var(--f-mono); font-size:var(--t-micro); letter-spacing:var(--tr-wider); color:var(--text-5);
  border-top:1px dashed var(--line-gold); padding-top:10px; margin:16px 0 8px; }
.lswovl .dgrow{ display:flex; gap:12px; padding:10px 0; border-bottom:1px solid var(--line); }
.lswovl .dgtag{ flex:0 0 92px; font-family:var(--f-mono); font-size:var(--t-micro); letter-spacing:var(--tr-wider);
  color:var(--dc); border:1px solid var(--dc); border-radius:var(--r-1); padding:5px 0; text-align:center; align-self:flex-start; }
.lswovl .dgbody{ flex:1 1 auto; min-width:0; }
.lswovl .dgnote{ font-size:var(--t-sm); color:var(--text-2); margin-bottom:6px; line-height:1.5; }
.lswovl .dgline{ display:flex; gap:8px; font-family:var(--f-mono); font-size:var(--t-micro); line-height:1.75; }
.lswovl .dgline b{ flex:0 0 62px; color:var(--text-5); letter-spacing:var(--tr-wide); font-weight:400; }
.lswovl .dgline span{ color:var(--text-3); min-width:0; overflow-wrap:anywhere; }
.lswovl .dgline.dgw span{ color:var(--danger); }
@media (max-width:680px){ .lswovl .dgrow{ flex-direction:column; gap:6px; } .lswovl .dgtag{ flex:0 0 auto; align-self:flex-start; padding:7px 10px; } }
.lswovl .hsec .ht{ font-size:var(--t-sm); letter-spacing:.18em; color:var(--gold-pale); text-transform:uppercase; margin-bottom:5px; }
.lswovl .hsec .hb{ font-size:var(--t-md); color:var(--text-2); line-height:1.65; }
.lswovl .hsec .hb b{ color:var(--gold); }
.lswovl .hsec .hb em{ color:var(--info); font-style:normal; font-weight:700; }
/* title top bar + roster filters */
#title .topbar{ position:absolute; top:16px; right:18px; display:flex; gap:8px; }
#title .topbar button{ cursor:pointer; font-family:inherit; font-weight:800; font-size:var(--t-body); letter-spacing:.08em; color:var(--text); padding:9px 14px; border-radius:var(--r-2); border:1px solid rgba(255,255,255,.14); background:rgba(255,255,255,.05); text-transform:uppercase; }
#title .topbar button:hover{ border-color:var(--gold); color:var(--gold); }
#title .filters{ display:flex; gap:6px; flex-wrap:wrap; align-items:center; }
#title .filters .fc{ cursor:pointer; font-size:var(--t-label); font-weight:800; letter-spacing:.08em; padding:5px 10px; border-radius:var(--r-3); border:1px solid rgba(255,255,255,.12); background:rgba(255,255,255,.04); color:var(--text-3); text-transform:uppercase; }
#title .filters .fc.on{ background:rgba(255,210,74,.16); border-color:rgba(255,210,74,.5); color:var(--gold-pale); }
#title .filters select{ font-family:inherit; font-size:var(--t-sm); font-weight:700; color:var(--text); background:rgba(0,0,0,.5); border:1px solid rgba(255,255,255,.14); border-radius:var(--r-2); padding:5px 8px; }
#title .filters input{ font-family:inherit; font-size:var(--t-body); color:var(--text); background:rgba(0,0,0,.4); border:1px solid rgba(255,255,255,.14); border-radius:var(--r-2); padding:5px 10px; width:120px; outline:none; }
#title .filters input:focus{ border-color:var(--gold); }
#title .filters .cnt{ font-size:var(--t-label); color:var(--text-5); letter-spacing:.1em; margin-left:auto; }
/* the cast layer: identity, at-a-glance, rank ladder, sheet flipping */
#title .preview{ position:relative; }
#title .pvflip{ position:absolute; top:14px; right:14px; display:flex; gap:6px; z-index:2; }
#title .pvflip span{ cursor:pointer; width:26px; height:26px; display:inline-flex; align-items:center; justify-content:center; border-radius:var(--r-2); border:1px solid rgba(255,255,255,.16); background:rgba(255,255,255,.05); color:var(--gold); font-size:16px; font-weight:800; user-select:none; }
#title .pvflip span:hover{ border-color:var(--gold); box-shadow:0 0 10px rgba(255,210,74,.3); }
#title .pvident{ display:flex; flex-direction:column; gap:3px; margin:7px 0 9px; font-size:var(--t-body); color:var(--text); }
#title .pvident svg{ color:var(--gold-pale); }
#title .glance{ display:flex; flex-wrap:wrap; gap:5px; margin-top:10px; }
#title .glance span{ font-size:var(--t-label); padding:4px 9px; border-radius:var(--r-3); background:rgba(127,230,255,.08); color:#cfe8f2; border:1px solid rgba(127,230,255,.2); }
#title .glance span svg{ color:var(--info); }
#title .glance span.lead{ background:rgba(255,210,74,.12); color:var(--gold-pale); border-color:rgba(255,210,74,.35); font-weight:700; }
#title .glance span.lead svg{ color:var(--gold); }
#title .ladder{ display:flex; align-items:center; gap:2px; margin:2px 0 7px; }
#title .ladder i{ width:12px; height:5px; border-radius:var(--r-1); display:inline-block; }
#title .ladder span{ font-size:var(--t-micro); color:var(--text-5); letter-spacing:.1em; text-transform:uppercase; margin-left:6px; }
#title .statrow .sl svg{ color:var(--text-4); }
#title .arow .an2 svg{ color:var(--text-4); }
#title .rcard .cflag{ font-size:var(--t-sm); font-weight:400; }
/* ---- KMK 9 ACTION NEWS: the live field monitor (PiP) ---- */
#hud .pip{ position:absolute; top:184px; right:18px; width:186px; padding:6px; z-index:7; }
#hud .pip canvas{ display:block; width:100%; border-radius:var(--r-2); }
#hud .pip .pipcap{ display:flex; align-items:center; gap:6px; font-size:var(--t-tiny); font-weight:800; letter-spacing:.16em; color:var(--danger-2); text-transform:uppercase; padding:0 2px 4px; }
#hud .pip .pipdot{ width:7px; height:7px; border-radius:50%; background:#ff2f2f; box-shadow:0 0 9px rgba(255,47,47,.95); animation:pipblink 1.1s steps(2,start) infinite; }
@keyframes pipblink{ 50%{ opacity:.2; } }
/* ---- the broadcast end screen: a TV set playing the crew's actual footage ---- */
#hud .endscr.news{ justify-content:flex-start; gap:0; padding:24px 20px 46px; overflow:hidden; background:radial-gradient(130% 100% at 50% 0%, rgba(18,14,9,.95), rgba(4,5,9,.99)); }
#hud .endscr.news .nwrap{ width:min(1180px,96vw); display:flex; flex-direction:column; gap:13px; max-height:100%; min-height:0; }
#hud .nmast{ display:flex; align-items:center; gap:12px; }
#hud .nmast .n9{ width:38px; height:38px; border-radius:50%; background:var(--broadcast); color:#fff; display:flex; align-items:center; justify-content:center; font-weight:900; font-size:24px; font-family:'Rajdhani','Inter',sans-serif; box-shadow:0 3px 0 #5a0a0d, 0 0 24px rgba(216,31,38,.45); flex:0 0 auto; }
#hud .nmast .nb b{ display:block; font-size:19px; font-weight:800; letter-spacing:.12em; color:var(--text); line-height:1.05; }
#hud .nmast .nb span{ font-size:var(--t-tiny); letter-spacing:.3em; color:var(--gold-deep); text-transform:uppercase; }
#hud .nmast .nlive{ margin-left:auto; display:flex; align-items:center; gap:8px; font-size:var(--t-sm); font-weight:800; letter-spacing:.14em; color:var(--text-2); }
#hud .nmast .nlive i{ width:8px; height:8px; border-radius:50%; background:#ff2f2f; box-shadow:0 0 8px rgba(255,47,47,.9); animation:pipblink 1.1s steps(2,start) infinite; }
#hud .nbody{ display:flex; gap:20px; min-height:0; }
#hud .ncl{ flex:0 0 460px; display:flex; flex-direction:column; gap:8px; }
#hud .ncr{ flex:1; min-width:0; display:flex; flex-direction:column; gap:11px; overflow-y:auto; padding-right:6px; }
#hud .tvset{ background:linear-gradient(178deg,#262a31,#0e1013 78%); border:1px solid rgba(255,255,255,.09); border-radius:var(--r-4); padding:13px 13px 7px; box-shadow:0 24px 60px -18px rgba(0,0,0,.92), inset 0 1px 0 rgba(255,255,255,.09); }
#hud .tvscreen{ position:relative; border-radius:var(--r-2); overflow:hidden; background:#000; box-shadow:inset 0 0 40px rgba(0,0,0,.85); }
#hud .tvscreen canvas{ display:block; width:100%; aspect-ratio:16/9; }
#hud .tvscan{ position:absolute; inset:0; pointer-events:none; background:repeating-linear-gradient(0deg, rgba(0,0,0,.17) 0 1px, transparent 1px 3px); }
#hud .tvglare{ position:absolute; inset:0; pointer-events:none; background:linear-gradient(112deg, rgba(255,255,255,.10), rgba(255,255,255,.02) 26%, transparent 42%); }
#hud .tvtag{ position:absolute; top:9px; right:9px; font-size:var(--t-label); font-weight:800; letter-spacing:.1em; color:#fff; background:rgba(216,31,38,.92); border-radius:var(--r-1); padding:3px 8px; transition:background .15s, color .15s; }
#hud .tvtag.slow{ background:rgba(245,178,26,.95); color:var(--on-gold); box-shadow:0 0 16px rgba(245,178,26,.5); }
#hud .tvchin{ display:flex; align-items:center; justify-content:space-between; padding:8px 3px 3px; }
#hud .tvchin .tvbrand{ font-size:var(--t-tiny); letter-spacing:.3em; color:#6b7078; font-weight:700; }
#hud .tvchin .tvgrill{ flex:1; height:8px; margin:0 12px; background:repeating-linear-gradient(90deg, rgba(255,255,255,.09) 0 2px, transparent 2px 6px); border-radius:var(--r-1); }
#hud .tvchin .tvled{ width:6px; height:6px; border-radius:50%; background:var(--good); box-shadow:0 0 7px rgba(143,224,138,.9); }
#hud .tvcap{ font-size:var(--t-sm); color:var(--text-3); padding:2px 4px 0; min-height:17px; }
#hud .tvprog{ display:flex; gap:3px; padding:6px 2px 2px; }
#hud .tvprog i{ flex:1; height:3px; background:rgba(255,255,255,.13); border-radius:var(--r-1); position:relative; overflow:hidden; }
#hud .tvprog i b{ position:absolute; left:0; top:0; bottom:0; width:0%; background:var(--gold-deep); box-shadow:0 0 6px rgba(245,178,26,.6); }
#hud .tvprog i.slow b{ background:var(--gold-pale); }
#hud .tvcap b{ color:var(--gold); }
#hud .ncrew{ font-size:var(--t-tiny); letter-spacing:.18em; color:var(--text-5); text-transform:uppercase; padding:0 4px; }
#hud .nkickrow{ display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
#hud .nkick{ display:inline-block; font-size:var(--t-label); font-weight:900; letter-spacing:.22em; color:#fff; background:var(--broadcast); padding:4px 11px; border-radius:var(--r-1); text-transform:uppercase; }
#hud .nhead{ font-family:'Rajdhani','Inter',sans-serif; font-weight:800; font-size:33px; line-height:1.03; letter-spacing:.02em; color:var(--text); text-shadow:0 3px 0 rgba(0,0,0,.5); }
#hud .nsub{ font-size:var(--t-sm); letter-spacing:.2em; color:var(--gold-deep); text-transform:uppercase; }
#hud .nsub b{ color:var(--text); }
#hud .nscript{ display:flex; flex-direction:column; gap:8px; border-left:1px solid rgba(245,178,26,.5); padding:2px 0 2px 12px; min-height:60px; }
#hud .sline{ font-size:var(--t-md); color:var(--text-2); line-height:1.55; }
#hud .sline .swho{ display:inline-block; font-size:var(--t-tiny); font-weight:900; letter-spacing:.16em; color:#0d0e12; background:var(--gold-deep); border-radius:var(--r-1); padding:2px 7px; margin-right:8px; transform:translateY(-1px); text-transform:uppercase; }
#hud .sline.field .swho{ background:var(--broadcast); color:#fff; }
#hud .sline .cursor{ display:inline-block; width:7px; height:13px; background:var(--gold-deep); margin-left:2px; animation:pipblink .7s steps(2,start) infinite; vertical-align:-2px; }
#hud .nboards{ display:flex; gap:12px; flex-wrap:wrap; }
#hud .board{ flex:1; min-width:250px; background:rgba(10,12,18,.72); border:1px solid rgba(255,255,255,.09); border-radius:var(--r-3); padding:11px 13px; }
#hud .board .bh{ font-size:var(--t-tiny); font-weight:800; letter-spacing:.24em; color:var(--gold-deep); text-transform:uppercase; padding-bottom:7px; border-bottom:1px solid rgba(245,178,26,.25); margin-bottom:8px; display:flex; justify-content:space-between; }
#hud .board .bh em{ font-style:normal; color:var(--text-5); letter-spacing:.1em; }
#hud table.tape{ width:100%; border-collapse:collapse; }
#hud table.tape th{ font-size:var(--t-sm); font-weight:800; letter-spacing:.06em; padding:2px 4px 6px; text-align:center; }
#hud table.tape td{ font-size:var(--t-body); padding:3.5px 4px; text-align:center; color:var(--text); font-weight:700; border-top:1px solid rgba(255,255,255,.05); }
#hud table.tape td.lb{ font-size:var(--t-tiny); letter-spacing:.13em; color:var(--text-5); text-align:left; text-transform:uppercase; font-weight:600; }
#hud table.tape td.win{ color:var(--gold); }
#hud .cityrow{ display:flex; justify-content:space-between; font-size:var(--t-body); color:var(--text-2); padding:3.5px 0; border-top:1px solid rgba(255,255,255,.05); }
#hud .cityrow:first-of-type{ border-top:none; }
#hud .cityrow b{ color:var(--text); }
#hud .citysum{ margin-top:8px; padding-top:8px; border-top:1px dashed rgba(245,178,26,.35); display:flex; justify-content:space-between; align-items:baseline; }
#hud .citysum .cl{ font-size:var(--t-tiny); letter-spacing:.18em; color:var(--text-5); text-transform:uppercase; }
#hud .citysum .cv{ font-family:'Rajdhani','Inter',sans-serif; font-size:26px; font-weight:800; color:var(--gold); text-shadow:0 0 18px rgba(245,178,26,.35); }
#hud .wcard{ background:rgba(216,31,38,.08); border:1px solid rgba(216,31,38,.3); border-radius:var(--r-3); padding:9px 13px; font-size:var(--t-md); color:var(--text-2); font-style:italic; line-height:1.5; }
#hud .wcard b{ font-style:normal; font-size:var(--t-label); letter-spacing:.14em; color:var(--danger-2); display:block; margin-top:3px; text-transform:uppercase; }
#hud .sat{ display:none; align-items:center; gap:8px; font-size:var(--t-label); font-weight:800; letter-spacing:.18em; color:var(--info); text-transform:uppercase; }
#hud .sat i{ width:7px; height:7px; border-radius:50%; background:var(--info); box-shadow:0 0 8px rgba(127,230,255,.9); animation:pipblink .9s steps(2,start) infinite; }
#hud .nticker{ position:absolute; left:0; right:0; bottom:0; height:36px; background:var(--ink); border-top:2px solid var(--gold-deep); display:flex; align-items:stretch; overflow:hidden; }
#hud .nticker .tkbrand{ flex:0 0 auto; display:flex; align-items:center; gap:7px; background:var(--broadcast); color:#fff; font-weight:900; letter-spacing:.12em; font-size:var(--t-body); padding:0 14px; z-index:1; }
#hud .nticker .tkwrap{ flex:1; position:relative; overflow:hidden; }
#hud .nticker .tkx{ position:absolute; white-space:nowrap; font-size:var(--t-body); font-weight:700; letter-spacing:.1em; color:var(--text-2); line-height:36px; animation:tick 38s linear infinite; }
#hud .nticker .tkx b{ color:var(--gold-deep); margin:0 16px; font-weight:900; }
@keyframes tick{ 0%{ transform:translateX(0); } 100%{ transform:translateX(-50%); } }
#hud .endscr.news .btns{ margin:2px 0 4px; }
@media (max-width:1020px){ #hud .ncl{ flex-basis:380px; } #hud .nhead{ font-size:26px; } }
/* ================= THRESHOLD REGISTRY — the superweapon intelligence database ================= */
#title{ --mono:'Cascadia Mono','Consolas',ui-monospace,'SF Mono',monospace; }
#title .clsbar{ display:flex; align-items:center; gap:10px; width:min(1080px,94vw); }
#title .clsbar .clschip{ flex:0 0 auto; font-family:var(--mono); font-size:var(--t-tiny); font-weight:700; letter-spacing:.18em; color:#fff; background:#a8161d; padding:3px 9px; border-radius:var(--r-1); }
#title .clsbar .clsline{ flex:1; font-family:var(--mono); font-size:var(--t-tiny); letter-spacing:.24em; color:var(--text-5); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; border-top:1px solid rgba(245,178,26,.28); border-bottom:1px solid rgba(245,178,26,.28); padding:3px 0; }
#title .term{ font-family:var(--mono); font-size:var(--t-sm); letter-spacing:.08em; color:#8fbf8a; }
#title .term b{ color:#c8e8c0; font-weight:700; }
#title .term .tcur{ display:inline-block; margin-left:3px; color:var(--good); animation:pipblink 1s steps(2,start) infinite; }
#title .filters .flab{ font-family:var(--mono); font-size:var(--t-tiny); letter-spacing:.2em; color:var(--text-5); margin-right:2px; }
/* file cards */
#title .rcard{ border-left:1px solid var(--tc,var(--text-6)); }
#title .rcard .fhead{ display:flex; justify-content:space-between; align-items:center; margin-bottom:2px; }
#title .rcard .fno{ font-family:var(--mono); font-size:var(--t-micro); letter-spacing:.08em; color:var(--text-5); }
#title .rcard .fst{ font-family:var(--mono); font-size:var(--t-micro); letter-spacing:.12em; color:var(--good); }
#title .rcard .fst.op{ color:var(--info); }
#title .rcard .frow{ display:flex; justify-content:space-between; align-items:flex-end; margin-top:5px; }
#title .rcard .felo{ font-family:var(--mono); font-size:var(--t-tiny); color:var(--gold-pale); letter-spacing:.06em; }
#title .rcard .felo b{ color:var(--gold); font-weight:700; }
#title .rcard .fbar{ width:34px; height:9px; opacity:.5; background:repeating-linear-gradient(90deg,var(--text-2) 0 1px,transparent 1px 3px,var(--text-2) 3px 5px,transparent 5px 6px); }
/* the dossier */
#title .preview{ overflow:hidden; }
#title .preview::before{ content:''; position:absolute; inset:0; pointer-events:none; z-index:3; background:repeating-linear-gradient(0deg, rgba(255,255,255,.022) 0 1px, transparent 1px 3px); }
#title .preview::after{ content:'THRESHOLD REGISTRY // EYES ONLY'; position:absolute; left:50%; top:46%; transform:translate(-50%,-50%) rotate(-24deg); font-family:var(--mono); font-weight:700; font-size:30px; letter-spacing:.2em; white-space:nowrap; color:#f4efe6; opacity:.05; pointer-events:none; z-index:-1; }
#title h1{ font-size:clamp(28px,4.6vw,54px); margin-top:26px; display:flex; flex-direction:column; align-items:center; gap:0; line-height:.92; }
/* WAR WORLD sits heavy; ASCENDANTS is the spaced sub-line under it — a title card, not a word. */
#title h1 .t1{ font-weight:700; letter-spacing:-.015em; color:var(--text);
  text-shadow:0 4px 26px rgba(0,0,0,.85), 0 0 60px rgba(255,210,74,.10); }
#title h1 .t2{ font-size:.44em; font-weight:500; letter-spacing:.42em; color:var(--gold);
  text-indent:.42em; margin-top:.18em; }
#title .dsh{ display:flex; align-items:center; justify-content:space-between; gap:8px; font-family:var(--mono); font-size:var(--t-tiny); letter-spacing:.14em; color:var(--text-5); border-bottom:1px dashed rgba(245,178,26,.35); padding-bottom:6px; margin-bottom:8px; }
#title .dsh b{ color:var(--gold-pale); font-weight:700; }
#title .stamp{ position:absolute !important; top:44px; right:-18px; z-index:4 !important; transform:rotate(9deg); font-family:var(--mono); font-weight:700; font-size:var(--t-md); letter-spacing:.3em; color:var(--stamp); border:2.5px solid var(--stamp); border-radius:var(--r-1); padding:3px 12px 3px 15px; opacity:.8; pointer-events:none; mix-blend-mode:screen; }
#title .idrows{ font-family:var(--mono); font-size:var(--t-label); display:flex; flex-direction:column; gap:2.5px; margin:7px 0 4px; }
#title .idrows .ir{ display:flex; gap:8px; }
#title .idrows .ik{ flex:0 0 96px; color:var(--text-5); letter-spacing:.06em; }
#title .idrows .iv{ color:var(--text); }
#title .idrows .iv.act{ color:var(--good); }
#title .idrows .iv.opn{ color:var(--info); }
#title .frec{ display:flex; gap:6px; flex-wrap:wrap; margin-top:6px; }
#title .frec span{ font-family:var(--mono); font-size:var(--t-label); padding:3px 8px; border-radius:var(--r-1); background:rgba(245,178,26,.08); border:1px solid rgba(245,178,26,.25); color:var(--gold-pale); }
#title .frec span b{ color:var(--gold); font-weight:700; }
#title .incid{ margin-top:6px; display:flex; flex-direction:column; gap:2px; font-family:var(--mono); font-size:var(--t-label); color:var(--text-4); }
#title .incid .iw{ color:var(--good); } #title .incid .il{ color:var(--danger-2); }
#title .sheet .sh, #title .pvsig-h{ font-family:var(--mono); letter-spacing:.2em; }
@keyframes regsweep{ 0%{ top:-8%; } 100%{ top:108%; } }
#title .preview .sweep{ position:absolute; left:0; right:0; height:34px; z-index:2; pointer-events:none; background:linear-gradient(180deg, transparent, rgba(245,178,26,.045), transparent); animation:regsweep 7s linear infinite; }
/* the sports-desk power board */
.lswovl table.rk{ width:100%; border-collapse:collapse; }
.lswovl table.rk th{ font-size:var(--t-tiny); letter-spacing:.2em; color:var(--text-5); text-transform:uppercase; text-align:left; padding:7px 8px 5px; border-bottom:1px solid rgba(245,178,26,.3); }
.lswovl table.rk td{ font-size:var(--t-md); padding:5.5px 8px; border-bottom:1px solid rgba(255,255,255,.05); color:var(--text-2); }
.lswovl table.rk td.rkn{ font-family:'Cascadia Mono',Consolas,monospace; color:var(--text-5); width:40px; }
.lswovl table.rk tr:nth-child(-n+3) td.rkn{ color:var(--gold); font-weight:700; }
.lswovl table.rk td.mv{ width:38px; font-size:var(--t-sm); font-weight:800; }
.lswovl table.rk td.mv.up{ color:var(--good); } .lswovl table.rk td.mv.dn{ color:var(--danger-2); } .lswovl table.rk td.mv.fl{ color:var(--text-6); }
.lswovl table.rk td.who{ font-weight:700; color:var(--text); }
.lswovl table.rk td.who i{ display:inline-block; width:9px; height:9px; border-radius:50%; margin-right:8px; background:var(--hc); box-shadow:0 0 8px var(--hc); }
.lswovl table.rk td.who .crown{ margin-left:7px; }
.lswovl table.rk td.elo{ font-family:'Cascadia Mono',Consolas,monospace; color:var(--gold); font-weight:700; }
.lswovl table.rk td.rec{ font-family:'Cascadia Mono',Consolas,monospace; font-size:var(--t-sm); color:var(--text-4); }
.lswovl table.rk td.thr{ font-size:var(--t-label); letter-spacing:.08em; }
.lswovl .rkfoot{ margin-top:9px; font-family:'Cascadia Mono',Consolas,monospace; font-size:var(--t-tiny); letter-spacing:.14em; color:var(--text-6); }
/* ---- THE INVITATIONAL bracket ---- */
.lswovl .brsub{ font-family:'Cascadia Mono',Consolas,monospace; font-size:var(--t-label); letter-spacing:.16em; color:var(--text-5); margin:-6px 0 4px; }
.lswovl .brsub b{ color:var(--gold); }
.lswovl .brwrap{ display:flex; gap:16px; align-items:stretch; margin:12px 0 6px; }
.lswovl .brcol{ flex:1.15; display:flex; flex-direction:column; justify-content:space-around; gap:10px; min-width:0; }
.lswovl .brcol.champ{ flex:0.9; justify-content:center; }
.lswovl .brh{ text-align:center; font-size:var(--t-tiny); font-weight:800; letter-spacing:.26em; color:var(--text-5); text-transform:uppercase; margin-bottom:-4px; }
.lswovl .bm{ position:relative; border:1px solid rgba(255,255,255,.10); border-radius:var(--r-3); background:rgba(255,255,255,.03); padding:7px 10px; }
.lswovl .bm::after{ content:''; position:absolute; right:-16px; top:50%; width:16px; height:1px; background:rgba(245,178,26,.35); }
.lswovl .brcol:last-child .bm::after, .lswovl .brcol.champ .bm::after{ display:none; }
.lswovl .bm.live{ border-color:var(--gold); animation:brpulse 1.6s ease infinite; }
@keyframes brpulse{ 0%,100%{ box-shadow:0 0 10px -4px var(--gold); } 50%{ box-shadow:0 0 24px -2px var(--gold); } }
.lswovl .bm .bs{ display:flex; align-items:center; gap:7px; padding:3px 0; font-size:var(--t-body); font-weight:700; color:var(--text-2); min-width:0; }
.lswovl .bm .bs .seed{ font-family:'Cascadia Mono',Consolas,monospace; font-size:var(--t-tiny); color:var(--text-5); width:17px; flex:0 0 auto; }
.lswovl .bm .bs i{ width:8px; height:8px; border-radius:50%; background:var(--hc,var(--text-5)); box-shadow:0 0 7px var(--hc,transparent); flex:0 0 auto; }
.lswovl .bm .bs .bn{ overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.lswovl .bm .bs .belo{ margin-left:auto; font-family:'Cascadia Mono',Consolas,monospace; font-size:var(--t-tiny); color:var(--text-5); flex:0 0 auto; }
.lswovl .bm .bs.win{ color:var(--gold); }
.lswovl .bm .bs.win .belo{ color:var(--gold-pale); }
.lswovl .bm .bs.lose{ opacity:.42; }
.lswovl .bm .bs.lose .bn{ text-decoration:line-through; }
.lswovl .ychip{ font-size:var(--t-micro); font-weight:900; letter-spacing:.1em; background:var(--broadcast); color:#fff; padding:1.5px 5px; border-radius:var(--r-1); flex:0 0 auto; }
.lswovl .bscore{ font-family:'Cascadia Mono',Consolas,monospace; font-size:var(--t-label); font-weight:700; color:var(--gold); background:rgba(245,178,26,.12); border:1px solid rgba(245,178,26,.35); border-radius:var(--r-1); padding:1px 6px; flex:0 0 auto; }
.lswovl .bsim{ font-size:var(--t-micro); letter-spacing:.14em; color:#7fb0d0; border:1px solid rgba(127,176,208,.4); border-radius:var(--r-1); padding:1px 4px; flex:0 0 auto; }
.lswovl .btbd{ color:var(--text-6); font-style:italic; font-weight:600; }
.lswovl .bchamp{ text-align:center; padding:18px 10px; border:1px dashed rgba(245,178,26,.55); border-radius:var(--r-3); background:rgba(245,178,26,.05); }
.lswovl .bchamp .tro{ font-size:36px; filter:drop-shadow(0 0 14px rgba(245,178,26,.8)); animation:brpulse 2s ease infinite; }
.lswovl .bchamp .cn{ font-size:17px; font-weight:800; letter-spacing:.06em; color:var(--gold); margin-top:4px; }
.lswovl .bchamp .cl{ font-size:var(--t-micro); letter-spacing:.3em; color:var(--text-5); text-transform:uppercase; margin-top:3px; }
.lswovl .bchamp.tbd{ opacity:.55; }
/* ---- the THEATER: in-match city nameplate + the CITY ATLAS ---- */
/* THE SUNDIAL — hangs from the TOP EDGE, which is the whole idea: the gnomon is inverted and the
   hours swing below it. Pointer-events off; it is a readout, never a control. The numerals use
   BANGERS (public/fonts, bundled offline with the comic layer) because Robert asked for "our new
   font we liked" — the labels stay on the HUD's own mono so the widget still belongs to the HUD. */
/* ⚠ THE TOP CENTRE IS ALREADY OCCUPIED. The score/mode bar lives here too, and the dial landed
   straight on top of it. The bar yields — the dial is anchored to the very top edge by design and
   cannot move down without stopping being a hanging dial. */
#hud.hassun .modebar, #hud.hassun #hMode{ top:126px; }
/* THE VISUAL LANGUAGE screen — same document furniture as the damage codex it sits beside. */
#hVisual .vlaxis{ border:1px solid var(--line); border-radius:var(--r-2); padding:9px 12px; margin:7px 0; background:var(--surface-raised); }
#hVisual .vlname{ font-family:var(--f-mono); font-size:var(--t-label); letter-spacing:.2em; color:var(--gold); }
#hVisual .vlwhy{ font-size:var(--t-sm); color:var(--text-3); margin:2px 0 6px; }
#hVisual .vlchips{ display:flex; flex-wrap:wrap; gap:4px; }
#hVisual .vlchip{ font-family:var(--f-mono); font-size:var(--t-micro); letter-spacing:.1em; text-transform:uppercase;
  border:1px solid var(--line-2); border-radius:var(--r-1); padding:2px 6px; color:var(--text-2); }
#hVisual .vlchip i{ font-style:normal; color:var(--gold); margin-left:5px; }
/* a vocabulary word nothing in the game uses is a GAP, and it should look like one */
#hVisual .vlchip.vlz{ opacity:.34; border-style:dashed; }
#hVisual .vlmean{ font-size:var(--t-sm); color:var(--text-4); margin-top:3px; }
#hVisual .vlmean b{ display:inline-block; min-width:66px; color:var(--text-2); font-family:var(--f-mono); font-size:var(--t-micro); letter-spacing:.12em; text-transform:uppercase; }
#hVisual .vlhero{ margin:9px 0; border:1px solid var(--line); border-radius:var(--r-2); overflow:hidden; }
#hVisual .vlh{ display:flex; align-items:center; gap:8px; padding:6px 11px; background:var(--surface-hi);
  font-family:var(--f-display); letter-spacing:.06em; }
#hVisual .vlh i{ width:9px; height:9px; border-radius:50%; display:inline-block; }
#hVisual .vlh span{ margin-left:auto; font-family:var(--f-mono); font-size:var(--t-micro); color:var(--text-5); letter-spacing:.14em; }
#hVisual .vlrow, #hud .vlkey, #hVisual .vlkey{ display:grid; grid-template-columns:46px 1.5fr repeat(6, 1fr) 1.2fr; gap:6px; align-items:center;
  padding:3px 11px; border-top:1px dashed var(--line); font-family:var(--f-mono); font-size:var(--t-micro); }
#hVisual .vlkey{ border-top:none; color:var(--text-5); letter-spacing:.14em; text-transform:uppercase; padding-top:8px; }
#hVisual .vlrow b{ color:var(--gold); }
#hVisual .vlab{ font-family:var(--f-display); font-size:var(--t-sm); color:var(--text-2); letter-spacing:.02em; }
#hVisual .vlt{ color:var(--text-3); text-transform:uppercase; letter-spacing:.08em; }
#hVisual .vlt.vlz{ opacity:.3; }
#hVisual .vlt.vlbeam{ color:var(--gold-pale); }
#hVisual .vlgap{ font-size:var(--t-sm); color:var(--text-2); padding:4px 0; }
#hVisual .vlgap b{ color:var(--danger-2); font-family:var(--f-mono); }
#hVisual .vlz2{ color:var(--text-5); font-family:var(--f-mono); font-size:var(--t-micro); }
@media (max-width:900px){ #hVisual .vlrow, #hVisual .vlkey{ grid-template-columns:40px 1.2fr repeat(3,1fr); }
  #hVisual .vlrow span:nth-child(n+6){ display:none; } }
#hud .sundial{ position:absolute; left:50%; top:0; transform:translateX(-50%); width:246px;
  pointer-events:none; text-align:center; filter:drop-shadow(0 2px 6px rgba(0,0,0,.55)); }
#hud .sundial svg{ display:block; overflow:visible; }
#hud .sundial .sdlab{ font-family:'Cascadia Mono',Consolas,monospace; font-size:7.5px;
  letter-spacing:.18em; fill:var(--text-5); }
#hud .sundial .sdread{ margin-top:-2px; line-height:1; }
/* ⚠ THE FAMILY IS 'ComicSFX', NOT 'Bangers'. comic.css declares the @font-face under a ROLE name
   (ComicLetter / ComicSFX / ComicHeavy) rather than the foundry name, so asking for 'Bangers'
   silently fell back to Rajdhani and looked almost right — which is the worst kind of wrong. */
#hud .sundial .sdread b{ display:block; font-family:'ComicSFX','Rajdhani',sans-serif;
  font-size:19px; letter-spacing:.05em; color:var(--gold); text-shadow:0 1px 0 var(--gold-shadow); }
#hud .sundial .sdread span{ display:block; font-family:'Cascadia Mono',Consolas,monospace;
  font-size:8px; letter-spacing:.2em; color:var(--text-5); margin-top:1px; }
#hud .cityplate{ position:absolute; left:50%; transform:translateX(-50%); bottom:108px; font-family:'Cascadia Mono',Consolas,monospace; font-size:var(--t-label); letter-spacing:.14em; color:var(--text-4); background:rgba(8,10,16,.5); border:1px solid rgba(255,255,255,.08); border-radius:var(--r-2); padding:4px 12px; pointer-events:none; }
#hud .cityplate b{ color:var(--gold-pale); font-weight:700; }
/* WHAT THE DISTRICT MEANS — the second line of the plate. Gold because it is the one part of the
   nameplate that is about THIS FIGHT rather than about the map. */
#hud .cityplate .cpdist{ display:block; margin-top:2px; color:var(--gold); letter-spacing:.16em; font-size:var(--t-micro); }
/* ===== THE DANGER ROOM — a simulated environment + the engine's test harness =====
   Everything but your character should read as PROJECTED: scanned grid, corner brackets,
   a sweeping holo line, and a live telemetry column. This is how we test the engine. */
#hud .simfx{ position:absolute; inset:0; pointer-events:none; z-index:2; display:none; }
#hud.sim .simfx{ display:block; }
#hud .simfx .simgrid{ position:absolute; inset:0; opacity:.15;
  background-image:linear-gradient(var(--info) 1px, transparent 1px), linear-gradient(90deg, var(--info) 1px, transparent 1px);
  background-size:44px 44px; -webkit-mask-image:radial-gradient(120% 90% at 50% 50%, #000 30%, transparent 76%);
  mask-image:radial-gradient(120% 90% at 50% 50%, #000 30%, transparent 76%); }
#hud .simfx .simscan{ position:absolute; inset:0; opacity:.4;
  background:repeating-linear-gradient(0deg, rgba(127,230,255,.055) 0 1px, transparent 1px 4px); }
#hud .simfx .simsweep{ position:absolute; left:0; right:0; height:130px; opacity:.55;
  background:linear-gradient(180deg, transparent, rgba(127,230,255,.11), transparent); animation:simsweep 6s linear infinite; }
@keyframes simsweep{ 0%{ top:-16%; } 100%{ top:104%; } }
#hud .simfx .simc{ position:absolute; width:26px; height:26px; border:2px solid var(--info); opacity:.5; }
#hud .simfx .c1{ left:10px; top:10px; border-right:0; border-bottom:0; }
#hud .simfx .c2{ right:10px; top:10px; border-left:0; border-bottom:0; }
#hud .simfx .c3{ left:10px; bottom:10px; border-right:0; border-top:0; }
#hud .simfx .c4{ right:10px; bottom:10px; border-left:0; border-top:0; }
#hud .simfx .simtag{ position:absolute; left:50%; top:12px; transform:translateX(-50%);
  font-family:var(--f-mono); font-size:var(--t-tiny); letter-spacing:var(--tr-wider); color:var(--info); opacity:.8; }
#hud .simfx .simtag i{ display:inline-block; width:7px; height:7px; border-radius:50%; background:var(--info);
  margin-right:7px; animation:pipblink 1.4s steps(2,start) infinite; }
#hud .telem{ position:absolute; left:14px; top:14px; width:236px; padding:9px 11px; z-index:8;
  font-family:var(--f-mono); font-size:var(--t-micro); line-height:1.5; color:var(--text-4);
  background:rgba(6,10,16,.8); border:1px solid rgba(127,230,255,.28); border-radius:var(--r-2); display:none; }
#hud.sim .telem{ display:block; }
#hud .telem h4{ font-size:var(--t-tiny); letter-spacing:var(--tr-wide); color:var(--info); font-weight:700;
  border-bottom:1px solid rgba(127,230,255,.25); padding-bottom:4px; margin-bottom:5px; display:flex; justify-content:space-between; }
#hud .telem .tg{ margin-top:6px; padding-top:5px; border-top:1px dashed rgba(255,255,255,.09); }
#hud .telem .tr2{ display:flex; justify-content:space-between; gap:8px; }
#hud .telem .tk{ color:var(--text-5); } #hud .telem .tv{ color:var(--text-2); }
#hud .telem .tv.hot{ color:var(--gold); } #hud .telem .tv.bad{ color:var(--danger); } #hud .telem .tv.ok{ color:var(--good); }
#hud .telem .subj{ color:var(--info); font-weight:700; }
/* ---- ALTITUDE LADDER: which of the four bands you're in, and which way you're moving ---- */
#hud .wantedrow{ font-size:var(--t-sm); font-weight:800; letter-spacing:.16em; color:var(--police); margin:1px 0 2px; text-shadow:0 0 10px rgba(90,160,255,.6); animation:pipblink 1.2s steps(2,start) infinite; }
#hud .wantedrow.lvlup{ animation:wantedPop .55s cubic-bezier(.2,1.6,.4,1), pipblink 1.2s steps(2,start) infinite; }
@keyframes wantedPop{ 0%{ transform:scale(1.7); filter:brightness(2) } 100%{ transform:scale(1); filter:none } }
#title .term .thchip{ cursor:pointer; color:#7fb0d0; border-bottom:1px dashed rgba(127,176,208,.5); pointer-events:auto; }
#title .term .thchip:hover{ color:#a8d8f0; }
/* ================= THE CODEX — a Planetary-grade CASE FILE per superweapon ================= */
.lswovl.codex{ align-items:flex-start; padding:3vh 0; overflow-y:auto; }
.lswovl .cfbox{ position:relative; width:100vw; min-height:100vh; margin:0; background:linear-gradient(178deg, rgba(20,21,26,.99), rgba(13,14,18,.99)); border:1px solid rgba(245,178,26,.3); border-radius:var(--r-1); padding:0 0 18px; font-family:'Rajdhani','Inter',sans-serif; color:var(--text-2); overflow:hidden; }
.lswovl .cfbox::before{ content:''; position:absolute; inset:0; pointer-events:none; z-index:5; background:repeating-linear-gradient(0deg, rgba(255,255,255,.016) 0 1px, transparent 1px 3px); }
.lswovl .cfbox::after{ content:'THRESHOLD TREATY OFFICE — UNAUTHORIZED DISCLOSURE IS A TREATY OFFENSE'; position:absolute; left:50%; top:50%; transform:translate(-50%,-50%) rotate(-28deg); font-family:'Cascadia Mono',Consolas,monospace; font-weight:700; font-size:26px; letter-spacing:.24em; white-space:nowrap; color:#f4efe6; opacity:.035; pointer-events:none; }
.lswovl .cftop{ display:flex; align-items:center; gap:12px; background:var(--ink); border-bottom:2px solid var(--gold-deep); padding:11px 18px; }
.lswovl .cftop .clschip{ font-family:'Cascadia Mono',Consolas,monospace; font-size:var(--t-tiny); font-weight:700; letter-spacing:.18em; color:#fff; background:#a8161d; padding:3px 9px; border-radius:var(--r-1); flex:0 0 auto; }
.lswovl .cftop .cft{ font-family:'Cascadia Mono',Consolas,monospace; font-size:var(--t-sm); letter-spacing:.22em; color:var(--text-2); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.lswovl .cftop .cfnav{ margin-left:auto; display:flex; gap:6px; flex:0 0 auto; }
.lswovl .cftop .cfnav span{ cursor:pointer; width:28px; height:28px; display:inline-flex; align-items:center; justify-content:center; border:1px solid rgba(255,255,255,.18); border-radius:var(--r-1); color:var(--gold); font-size:17px; font-weight:800; background:rgba(255,255,255,.04); user-select:none; }
.lswovl .cftop .cfnav span:hover{ border-color:var(--gold); }
.lswovl .cfhead{ display:flex; align-items:flex-start; gap:18px; padding:16px 22px 6px; position:relative; }
.lswovl .cfhead .cfportrait{ flex:0 0 92px; height:92px; border-radius:var(--r-2); border:2px solid var(--cfa,var(--gold-deep)); display:flex; align-items:center; justify-content:center; font-size:44px; font-weight:900; color:var(--cfa,var(--gold-deep)); background:radial-gradient(80% 80% at 50% 35%, rgba(255,255,255,.07), rgba(0,0,0,.35)); text-shadow:0 0 24px var(--cfa); }
.lswovl .cfhead .cfid .cfalias{ font-size:36px; font-weight:800; letter-spacing:.04em; line-height:1; color:var(--cfa,var(--gold)); }
.lswovl .cfhead .cfid .cfrole{ font-size:var(--t-sm); letter-spacing:.26em; text-transform:uppercase; color:var(--gold-pale); margin:3px 0 8px; }
.lswovl .cfhead .cfid .cfmeta{ font-family:'Cascadia Mono',Consolas,monospace; font-size:var(--t-label); letter-spacing:.1em; color:var(--text-5); }
.lswovl .cfstamp{ position:absolute; right:26px; top:14px; transform:rotate(7deg); font-family:'Cascadia Mono',Consolas,monospace; font-weight:700; font-size:var(--t-lg); letter-spacing:.3em; color:var(--stamp); border:3px solid var(--stamp); border-radius:var(--r-1); padding:5px 14px 5px 17px; opacity:.85; mix-blend-mode:screen; text-align:center; line-height:1.5; }
.lswovl .cfstamp small{ display:block; font-size:var(--t-micro); letter-spacing:.2em; color:var(--stamp); }
.lswovl .cfgrid{ display:grid; grid-template-columns:1fr 1fr; gap:0 26px; padding:8px 22px 4px; }
/* THE SHEET (2026-07-24): full-viewport FASERIP-style layout — attribute rail left, dossier right */
.lswovl .cfbody{ display:grid; grid-template-columns:minmax(300px,380px) 1fr; gap:0 34px; padding:10px 28px 8px; align-items:start; }
.lswovl .cfrail{ border-right:1px solid var(--line-2); padding-right:26px; }
.lswovl .cfmain .cfcols{ display:grid; grid-template-columns:repeat(auto-fit,minmax(300px,1fr)); gap:0 26px; }
.lswovl .atline{ display:grid; grid-template-columns:86px 104px 1fr 22px; gap:8px; align-items:center; padding:4.5px 0; border-bottom:1px dotted rgba(255,255,255,.05); }
.lswovl .atline .atn{ font-family:var(--f-mono); font-size:var(--t-micro); letter-spacing:.14em; color:var(--text-5); }
.lswovl .atline .atr{ font-family:var(--f-mono); font-size:var(--t-sm); font-weight:700; letter-spacing:.05em; }
.lswovl .atline .atb{ height:7px; background:rgba(255,255,255,.07); border-radius:3px; overflow:hidden; }
.lswovl .atline .atb i{ display:block; height:100%; border-radius:3px; }
.lswovl .atline .atv{ font-family:var(--f-mono); font-size:var(--t-sm); color:var(--text-3); text-align:right; }
.lswovl .cfres{ display:flex; flex-wrap:wrap; gap:6px; padding:6px 0; }
.lswovl .rchip{ font-family:var(--f-mono); font-size:var(--t-micro); letter-spacing:.08em; padding:3px 9px; border-radius:var(--r-1); border:1px solid var(--line-2); color:var(--text-3); }
.lswovl .rchip.imm{ color:var(--info); border-color:rgba(127,230,255,.4); }
.lswovl .rchip.res{ color:var(--good); border-color:rgba(125,255,158,.35); }
.lswovl .rchip.weak{ color:var(--danger-2); border-color:rgba(255,138,106,.4); }
@media (max-width: 900px){ .lswovl .cfbody{ grid-template-columns:1fr; } .lswovl .cfrail{ border-right:none; padding-right:0; } }
/* ---- THE TABBED CHARACTER SHEET (2026-07-25) -------------------------------------------------
   Robert: "make better character sheets, ensure we have country flag and hometown... I like a
   tabbed approach." The reference's signature is a LABEL THAT SITS ON THE PANEL EDGE rather than
   inside it, so the tab reads as a physical file divider. Translated into our palette: the active
   tab is filled gold and JOINS the pane below it by killing its own bottom border, which is the
   one detail that makes a tab strip read as tabs instead of a row of buttons.
   ⚠ The left spine (identity + attributes) never tabs away. It is the part you compare BETWEEN
   fighters, so hiding it behind a tab would make paging with the arrows useless. */
.lswovl .cfhome{ display:flex; align-items:baseline; gap:8px; flex-wrap:wrap; margin:3px 0 2px; }
.lswovl .cfhome .cfflag{ font-size:19px; line-height:1; filter:saturate(1.1); }
.lswovl .cfhome b{ font-family:var(--f-mono); font-size:var(--t-sm); color:var(--text); font-weight:700; letter-spacing:.02em; }
.lswovl .cfhome i{ font-style:normal; font-family:var(--f-mono); font-size:var(--t-tiny); color:var(--gold-pale); letter-spacing:.08em; text-transform:uppercase; }
.lswovl .cfhome i::before{ content:'◆ '; color:var(--gold-deep); }

.lswovl .cftabs{ display:flex; gap:4px; align-items:flex-end; margin:0 0 -1px; padding:0 2px;
  border-bottom:1px solid var(--line-gold); position:relative; z-index:1; flex-wrap:wrap; }
.lswovl .cftab{ font-family:var(--f-mono); font-size:var(--t-label); font-weight:700;
  letter-spacing:.2em; color:var(--text-4); background:transparent;
  border:1px solid var(--line-2); border-bottom-color:var(--line-gold);
  border-radius:var(--r-1) var(--r-1) 0 0; padding:6px 15px 7px; cursor:pointer;
  transition:color .16s, background .16s, border-color .16s; }
.lswovl .cftab:hover{ color:var(--gold-pale); border-color:var(--gold-deep); }
.lswovl .cftab:focus-visible{ outline:2px solid var(--gold); outline-offset:2px; }
.lswovl .cftab.on{ background:var(--grad-gold,var(--gold)); color:var(--on-gold);
  border-color:var(--gold); border-bottom-color:transparent; }
.lswovl .cfpane{ display:none; padding-top:12px; }
.lswovl .cfpane.on{ display:block; }
@media (max-width: 640px){
  .lswovl .cftab{ padding:7px 11px; letter-spacing:.12em; flex:1 1 auto; }
}
.lswovl .cfsec{ margin-bottom:13px; min-width:0; }
.lswovl .cfsec.wide{ grid-column:1 / -1; }
.lswovl .cfsec .cfsh{ font-family:'Cascadia Mono',Consolas,monospace; font-size:var(--t-label); font-weight:700; letter-spacing:.26em; color:var(--gold-deep); border-bottom:1px dashed rgba(245,178,26,.4); padding-bottom:4px; margin-bottom:7px; }
.lswovl .cfrow{ display:flex; gap:10px; font-family:'Cascadia Mono',Consolas,monospace; font-size:var(--t-sm); padding:2px 0; }
.lswovl .cfrow .k{ flex:0 0 148px; color:var(--text-5); letter-spacing:.05em; }
.lswovl .cfrow .v{ color:var(--text); min-width:0; }
.lswovl .cfrow .v.hot{ color:var(--gold); } .lswovl .cfrow .v.ok{ color:var(--good); } .lswovl .cfrow .v.syn{ color:var(--info); }
.lswovl .redact{ display:inline-block; background:#0c0d11; color:transparent; border-radius:var(--r-1); box-shadow:inset 0 0 0 1px rgba(255,255,255,.05); user-select:none; }
.lswovl table.cfarm{ width:100%; border-collapse:collapse; font-family:'Cascadia Mono',Consolas,monospace; }
.lswovl table.cfarm th{ font-size:var(--t-micro); letter-spacing:.2em; color:var(--text-5); text-transform:uppercase; text-align:left; padding:4px 7px; border-bottom:1px solid rgba(245,178,26,.35); }
.lswovl table.cfarm td{ font-size:var(--t-label); padding:4.5px 7px; border-bottom:1px solid rgba(255,255,255,.05); color:var(--text-2); vertical-align:top; }
.lswovl table.cfarm td.sl2{ color:var(--gold); font-weight:700; width:40px; }
.lswovl table.cfarm td.an3{ color:var(--text); font-weight:700; white-space:nowrap; }
.lswovl table.cfarm td.dm{ color:#ff9a6a; }
.lswovl table.cfarm tr.ult td{ background:rgba(245,178,26,.05); }
.lswovl .cfcounter{ display:flex; flex-direction:column; gap:5px; }
.lswovl .cfcounter .cn{ display:flex; gap:8px; font-size:var(--t-body); line-height:1.45; color:var(--text-2); }
.lswovl .cfcounter .cn i{ flex:0 0 auto; font-style:normal; color:var(--danger-2); font-family:'Cascadia Mono',Consolas,monospace; font-size:var(--t-label); padding-top:2px; }
.lswovl .cfquote{ border-left:1px solid rgba(216,31,38,.6); padding:6px 12px; font-style:italic; font-size:var(--t-md); color:var(--text-2); background:rgba(216,31,38,.05); border-radius:0 6px 6px 0; }
.lswovl .cfquote b{ display:block; font-style:normal; font-family:'Cascadia Mono',Consolas,monospace; font-size:var(--t-tiny); letter-spacing:.16em; color:var(--danger-2); margin-top:4px; }
.lswovl .cffoot{ display:flex; justify-content:space-between; align-items:center; font-family:'Cascadia Mono',Consolas,monospace; font-size:var(--t-tiny); letter-spacing:.18em; color:var(--text-6); padding:10px 22px 0; border-top:1px dashed rgba(255,255,255,.1); margin:4px 22px 0; }
.lswovl .cfbtnrow{ display:flex; gap:9px; padding:12px 22px 0; }
.lswovl .cfbtnrow .odone{ margin-top:0; flex:1; }
#title .pvcodex{ cursor:pointer; margin-top:11px; text-align:center; font-family:var(--mono); font-size:var(--t-label); font-weight:700; letter-spacing:.22em; color:#0d0e12; background:linear-gradient(180deg,var(--gold),var(--gold-warm)); border-radius:var(--r-2); padding:9px 8px; box-shadow:0 3px 0 var(--gold-shadow); user-select:none; }
#title .pvcodex:hover{ filter:brightness(1.08); }
.lswovl table.rk tr{ cursor:pointer; }
  /* ================= RESPONSIVE: phones & tablets =================
     Every screen must be reachable and readable on an iPhone. Multi-column layouts
     collapse to one scrollable column; tap targets grow; the HUD compacts. */
  @media (max-width: 900px){
    /* the title screen is a SCROLLING PAGE on a phone — pan-y so iOS never swallows the gesture,
       and bottom padding so nothing hides under the fixed ENTER bar */
    #title{ gap:10px; justify-content:flex-start; overflow-y:auto; -webkit-overflow-scrolling:touch;
      touch-action:pan-y; padding:12px 10px calc(96px + env(safe-area-inset-bottom)); }
    #title h1{ font-size:clamp(22px,7vw,38px); margin-top:2px; }
    #title h1 .t2{ letter-spacing:.3em; text-indent:.3em; }
    #title .topbar{ position:static; order:-1; width:100%; display:grid; grid-template-columns:repeat(3,1fr); gap:6px; margin-bottom:2px; }
    #title .topbar button{ padding:10px 6px; font-size:11px; }
    #title .clsbar{ width:100%; }
    #title .clsbar .clsline{ font-size:8px; letter-spacing:.1em; }
    #title .selwrap{ flex-direction:column; gap:12px; }
    #title .preview{ flex:0 0 auto; max-height:none; width:100%; }
    #title .modes{ gap:8px; }
    #title .modecard{ width:calc(50% - 8px); padding:9px 10px; }
    .roster{ grid-template-columns:repeat(2,1fr); max-height:none; }
    /* ENTER THE ARENA is FIXED to the bottom of the viewport: you can always reach it, at any
       scroll position. (Sticky inside a nested flex column did not survive on iOS.) */
    .startbtn{ position:fixed; left:10px; right:10px; bottom:calc(10px + env(safe-area-inset-bottom));
      width:auto; margin:0; padding:16px 20px; font-size:16px; z-index:40; }
    #title .roster{ padding-bottom:4px; }
    #title .modehint{ margin-bottom:2px; }
    /* overlays: full-bleed sheets */
    .lswovl{ align-items:stretch; }
    .lswovl.codex{ overflow-y:auto; -webkit-overflow-scrolling:touch; }
    .lswovl.codex .cfbox{ max-height:none; }   /* the OVERLAY scrolls the case file, not the box */
    .lswovl .cftop{ flex-wrap:wrap; gap:6px; }
    .lswovl .cftop .cft{ font-size:var(--t-micro); letter-spacing:var(--tr); flex:1 1 100%; order:3; white-space:normal; }
    .lswovl .cffoot{ flex-direction:column; gap:4px; text-align:center; }
    .lswovl .cfhead{ padding:12px 14px 4px; }
    .lswovl .cfgrid{ padding:8px 14px 4px; }
    .lswovl .obox, .lswovl .cfbox{ width:100% !important; max-height:100vh; border-radius:0; margin:0;
      padding-top:calc(14px + env(safe-area-inset-top)); padding-bottom:calc(14px + env(safe-area-inset-bottom)); }
    .lswovl .atwrap, .lswovl .brwrap{ flex-direction:column; }
    .lswovl .atrows{ max-height:38vh; }
    .lswovl .brcol{ gap:7px; }
    .lswovl .bm::after{ display:none; }
    .lswovl .rkmeta{ display:none; }
    .lswovl table.rk td, .lswovl table.rk th{ padding:5px 4px; }
    .lswovl .odone{ padding:15px 18px; }
    /* the case file stacks to one column */
    .lswovl .cfgrid{ grid-template-columns:1fr; }
    .lswovl .cfrow{ flex-wrap:wrap; }
    .lswovl .cfrow .k{ flex:0 0 110px; }
    .lswovl .cfrow .v{ flex:1 1 100%; padding-left:110px; margin-top:-14px; }
    /* wide data tables scroll sideways instead of blowing out the page */
    .lswovl table.rk{ display:block; overflow-x:auto; white-space:nowrap; }
    .lswovl table.rk td.rec:last-of-type, .lswovl table.rk th:nth-child(6){ display:none; }  /* KO col: least useful on a phone */
    .lswovl .cfhead{ flex-wrap:wrap; }
    .lswovl .cfstamp{ position:static; transform:none; margin-top:8px; }
    .lswovl table.cfarm{ display:block; overflow-x:auto; white-space:nowrap; }
    /* the news broadcast stacks: TV first, then the script */
    #hud .nbody{ flex-direction:column; }
    #hud .ncl{ flex:0 0 auto; }
    #hud .nhead{ font-size:22px; }
    #hud .endscr.news{ padding:10px 8px 42px; }
    #hud .nboards{ flex-direction:column; }
    /* HUD compaction so the play area survives */
    #hud .hint{ display:none; }
    #hud .radar{ width:104px; height:104px; top:calc(8px + env(safe-area-inset-top)); right:8px; }
    #hud .radar canvas{ width:104px; height:104px; }
    #hud .pip{ display:none; }
    #hud .pl{ left:8px; bottom:calc(8px + env(safe-area-inset-bottom)); min-width:150px; padding:8px 10px; transform:scale(.9); transform-origin:bottom left; }
    #hud .kit{ left:8px; bottom:calc(150px + env(safe-area-inset-bottom)); transform:scale(.85); transform-origin:bottom left; }
    #hud .slots{ display:none; }              /* the touch rail replaces them */
    #hud .cityplate{ bottom:auto; top:calc(8px + env(safe-area-inset-top)); left:8px; transform:none; font-size:8.5px; max-width:52vw; }
    /* the top edge belongs to the fight on a phone */
    #hud .sundial{ display:none !important; }
    #hud .modebar{ top:calc(4px + env(safe-area-inset-top)); transform:translateX(-50%) scale(.85); }
    #hud .endscr .btns{ flex-direction:column; width:100%; }
    #hud .endscr button{ width:100%; }
  }
  /* NO ORIENTATION GATE. The game is perfectly playable in portrait (you just see less of the
     street), and a full-screen "rotate your device" wall is one more thing standing between the
     player and the fight. Landscape is a suggestion, not a requirement. */
  /* rotate nudge — the arena reads far better in landscape on a phone */
  #hud .rotate{ position:absolute; inset:0; z-index:30; display:none; align-items:center; justify-content:center;
    background:rgba(4,5,9,.92); pointer-events:auto; text-align:center; padding:24px; }
  #hud .rotate div{ font-family:var(--f-display); }
  #hud .rotate .ri{ font-size:44px; margin-bottom:10px; animation:rot 2.2s ease-in-out infinite; }
  @keyframes rot{ 0%,100%{ transform:rotate(0); } 50%{ transform:rotate(90deg); } }
  /* ⚠ the gate was display:none with NO activating rule — dead markup. It fires ONLY for a
     LIVE match on a phone in portrait; menus and the end-screen report scroll fine upright. */
  #hud .riphone{ width:26px; height:44px; border:3px solid var(--gold); border-radius:6px; margin:0 auto 10px; position:relative; }
  #hud .riphone::after{ content:''; position:absolute; left:50%; bottom:3px; transform:translateX(-50%); width:8px; height:2.5px; border-radius:2px; background:var(--gold); }
  @media (orientation: portrait){
    body.phone.playing #hud .rotate, body.tablet.playing #hud .rotate{ display:flex; }
    body.phone.playing #touch, body.tablet.playing #touch{ display:none !important; }   /* thumbs are useless under the gate */
  }

/* ---- THE FRONT PAGE, DE-DENSIFIED (2026-07-26) ------------------------------------------------
   Robert: "it's too dense and I have to scroll down, and it's hard to find the type of characters
   I want." Measured before the change: 1393px of content in a 900px viewport — 493px of forced
   scroll — with the roster not starting until y=734, so you saw ONE half-row of characters.
   ⚠ The fix is not smaller type. It is that the title, the classification bar, the query line and
   the KMK 9 desk were FOUR full-width blocks stacked vertically. They are one two-column band now,
   which is ~150px back, and every one of them is still on screen. */
#title .thead{ display:grid; grid-template-columns:minmax(0,1fr) minmax(0,460px); gap:16px 26px;
  align-items:center; width:100%; margin-bottom:6px; }
#title .thead .tleft{ min-width:0; display:flex; flex-direction:column; gap:4px; }
#title .thead h1{ margin:0 0 2px; }
#title .thead .colddesk{ margin:0; }
/* ⚠ MOVING THE DESK WAS NOT ENOUGH. Measured after the two-column change the band was still 276px
   tall, because the band takes the HEIGHT OF ITS TALLEST CHILD and the KMK monitor is a 384x216
   canvas. Scaling the monitor is what actually gives the roster its room back — the desk is
   atmosphere and the roster is the product. */
#title .thead .colddesk .cdmon{ width:268px; }
#title .thead .colddesk canvas{ width:268px !important; height:151px !important; display:block; }
#title .thead .colddesk .cdhead{ font-size:var(--t-lg); line-height:1.15; }
#title .thead .colddesk .cdsub{ font-size:var(--t-tiny); }
#title .thead{ grid-template-columns:minmax(0,1fr) minmax(0,400px); }

/* the mode cards were 130px of mostly empty space */
#title .modes{ gap:8px; }
/* the class is .modecard, not .mode — the first attempt styled a selector that does not exist */
#title .modecard{ padding:9px 13px; }
#title .modecard .mi{ font-size:17px; margin-bottom:1px; }
#title .modecard .mn{ font-size:var(--t-md); }
#title .modecard .mt{ font-size:var(--t-micro); }
/* cap the header band: the desk is atmosphere, the roster is the product */
#title .thead{ max-height:186px; }
#title .thead .colddesk .cdstats{ display:none; }
#title .filters{ gap:4px; }
#title .filters .fc{ padding:3px 8px; }
#title h1{ font-size:clamp(30px,4.4vw,46px); }

/* ⚠ THE PAGE MUST NOT SCROLL — THE ROSTER SHOULD. That is the actual answer to "I have to scroll
   down". Trimming blocks only ever bought pixels back; the roster still began at y=724 because
   the mode cards, the tabs and two filter rows all sit above it inside selwrap. Making the title
   a fixed-height column and giving the ROSTER the leftover space with its own scrollbar means the
   characters are always on screen and always the biggest thing on it — and the page itself never
   moves, so nothing you were looking at slides away.
   ⚠ The desktop rule only: the phone/tablet branch further down deliberately scrolls the page,
   because at 500px there is no leftover height to give anybody. */
@media (min-width: 1081px) and (min-height: 620px){
  #title{ height:100vh; overflow:hidden; justify-content:flex-start; }
  #title .selwrap{ flex:1; min-height:0; }
  #title .selwrap > div:last-child{ min-height:0; }
  #title .roster{ flex:1; min-height:0; overflow-y:auto; overflow-x:hidden;
    align-content:start; padding-right:6px; scrollbar-width:thin; }
  #title .preview{ overflow-y:auto; min-height:0; }
}
@media (max-width: 1080px){
  #title .thead{ grid-template-columns:1fr; }
  #title .thead .colddesk{ display:none; }   /* the desk is atmosphere; the roster is the product */
}

/* the filters are TWO rows now: what they DO, then how dangerous they are */
#title .filters{ flex-direction:column; align-items:stretch; gap:6px; }
#title .filters .frow1, #title .filters .frow2{ display:flex; flex-wrap:wrap; align-items:center; gap:6px; }
#title .filters .fc.rc{ border-color:var(--line-2); }
#title .filters .fc.rc i{ font-style:normal; font-size:var(--t-micro); color:var(--text-5); margin-left:3px; }
#title .filters .fc.rc.on i{ color:var(--on-gold); opacity:.8; }
`;

export const CODEX_MOBILE = `
    @media (max-width: 640px) {
      .lswovl .cfbox{ width: 100vw; border-left: 0; border-right: 0; border-radius: 0; }
      .lswovl .cfrow{ display: block; padding: 5px 0; border-bottom: 1px dashed rgba(255,255,255,.05); }
      .lswovl .cfrow .k{ display: block; margin-bottom: 2px; }
      .lswovl .cfrow .v{ display: block; }
      .lswovl .cftop .cft{ font-size: var(--t-micro); letter-spacing: .08em; }
      .lswovl .cftop .cfnav span{ width: 40px; height: 40px; font-size: 20px; }
      .lswovl .cfarmwrap{ overflow-x: auto; }
      .lswovl table.cfarm{ min-width: 520px; }
    }`;


export const PHONE_CSS = `
/* ============ PHONE MODE — body.phone (coarse pointer + short edge ≤ 500px) ============
   The law: the FIGHT and the THUMBS own the screen. Anything informational folds away;
   the pause menu still carries the full HUD/how-to for when the player wants to read. */
body.phone #hud .hint{ display:none !important; }              /* the controls list is the touch layer itself */
body.phone #hud .radar{ display:none !important; }             /* the foe arrow + edge markers carry direction */
body.phone #hud .kit{ display:none !important; }               /* kit chips are select-screen reading */
body.phone #hud .pip{ display:none !important; }               /* no room for the news monitor */
body.phone #hud .cityplate{ display:none !important; }
body.phone #hud .modebar{ top:4px; font-size:var(--t-micro); padding:3px 8px; }
body.phone #hud .feed{ max-width:38vw; font-size:var(--t-micro); line-height:1.35; opacity:.85; }
body.phone #hud .feed div:nth-child(n+3){ display:none; }      /* two lines of feed, no more */
/* the player panel becomes a compact strip pinned TOP-left — the bottom-left corner is the stick */
body.phone #hud .pl{ left:10px; top:52px; bottom:auto; width:150px; padding:7px 9px; }
body.phone #hud .pl .nm{ font-size:var(--t-sm); }
body.phone #hud .pl .rl{ display:none; }
body.phone #hud .pl .lab{ display:none; }                      /* the bars speak for themselves */
body.phone #hud .pl .bar{ height:6px; margin:3px 0; }
body.phone #hud .pl .xpwrap{ transform:scale(.8); transform-origin:left center; }
body.phone #hud .slots{ display:none !important; }             /* the touch buttons ARE the slots */
/* ⚠ THE HANDS ROW IS THE ONE THING ADDED BACK. Everything else in the bottom band is hidden on a
   phone because the thumbs own it — but what you are holding is not chrome, it is the answer to
   "why did my punch do nothing". It moves out of the centre (that is the fire thumb) and rides the
   top-right, which is the only quiet corner left once the stick and the buttons are placed. */
body.phone #hud .hands{ left:auto; right:8px; top:calc(6px + env(safe-area-inset-top)); bottom:auto;
  transform:scale(.8); transform-origin:top right; max-width:56vw; }
body.phone #hud .hands .hhl{ display:none; }                   /* the chips say what they are */
body.phone #hud .hnote{ display:none; }                        /* no room for the consequence line */
body.phone #hud .foe{ top:6px; width:min(300px,44vw); padding:4px 8px; }
body.phone #hud .foe .fn{ font-size:var(--t-sm); }
body.phone #hud .charge{ bottom:44vh; }
body.phone #hud .wantedrow{ font-size:var(--t-micro); }
body.phone #hud .announce{ transform:scale(.72); }
body.phone #hTut{ max-width:46vw; font-size:var(--t-sm); }
`;


export const TABLET_CSS = `
/* ============ TABLET MODE — body.tablet (coarse pointer, short edge 501-1100px) ============
   An iPad has ROOM: keep the radar, the kit chips and the feed — but everything touch-sized,
   the desktop slots row gone (the touch buttons are the slots), the hint wall gone, and the
   player panel lifted clear of the left stick zone. */
body.tablet #hud .hint{ display:none !important; }
body.tablet #hud .slots{ display:none !important; }
/* an iPad has room: keep the row where it is, lifted clear of the touch buttons and thumb-sized */
body.tablet #hud .hands{ bottom:180px; transform:translateX(-50%) scale(1.1); }
body.tablet #hud .radar{ transform:scale(.82); transform-origin:top right; }
body.tablet #hud .pl{ bottom:190px; }                       /* the stick owns the corner below */
body.tablet #hud .kit{ bottom:150px; transform:scale(.92); transform-origin:bottom left; }
body.tablet #hud .feed div:nth-child(n+4){ display:none; }
/* touch controls grow into iPad hands: bigger targets, inset from the bezel */
body.tablet #touch .tbtn{ transform:scale(1.18); }
body.tablet #touch .tstick{ transform:scale(1.15); }
body.tablet #touch .tzone-l{ left:24px; bottom:24px; }
body.tablet #touch .tzone-r{ right:24px; bottom:24px; }
body.tablet .obox button, body.tablet .odone{ min-height:42px; }   /* menu taps, not mouse clicks */
`;


export const DECK_CSS = `
/* ============ STEAM DECK — body.deck (Valve UA, or 1280x800 + a pad) ============
   A 7-inch panel read at arm's length: the TYPE RAMP steps up ~15% wholesale (token override —
   every surface follows), focus targets grow for stick-driven menus (UINav), pad glyphs are
   already the hint language. The HUD layout itself stays desktop — the Deck has the room. */
body.deck{ --t-micro:10px; --t-tiny:11px; --t-label:12px; --t-sm:13px; --t-body:14.5px; --t-md:15.5px; --t-lg:17px; }
body.deck .obox button, body.deck .odone{ min-height:42px; }
body.deck #hud .hint{ max-width:320px; }
body.deck .rcard, body.deck .mcard{ outline-offset:3px; }   /* stick-focus reads at couch distance */
/* ⚠ THE SLOT NOW CARRIES A GLYPH AND A RANGE WORD. Tiny, mono, dim — it must never compete with the
   ability NAME, which is still the thing you read first. The glyph is geometry so it renders at 9px
   on every platform; an emoji here would be a colour image at the mercy of the system font. */
.slot .sfx{ font-family:var(--f-mono,"Cascadia Code",monospace); font-size:var(--t-micro,8.5px);
  letter-spacing:.14em; color:var(--text-5,#7d776b); margin-top:1px; white-space:nowrap; }
.slot .sfx b{ color:var(--gold-pale,#e8cf92); font-weight:400; margin-right:4px; font-size:11px; }
`;

/* ============ POWERWORLD — the chrome that is only true in a city ============
   ⚠ The tokens, the fonts, the gold accent and every hero colour are IDENTICAL here. Sameness in the
   chrome is what keeps two dimensions one game; what changes is that a few readouts stop being TRUE.
   The city nameplate names a city. The wanted stars need a state with police in it. The KMK 9 monitor
   needs a press. None of those exist in PowerWorld, so they go — and a surface that cannot be true
   should never be on screen, which is the same rule the armory keeps when it says NOT YET ISSUED. */
export const POWERWORLD_CSS = `
body.powerworld #hFieldRec{position:absolute;top:16px;left:64px;display:flex;align-items:center;gap:8px;padding:8px 11px;border-radius:.625rem;background:oklch(.18 .02 70 / .80);border:1px solid oklch(.65 .04 70 / .24);color:oklch(.92 .02 80);font:600 11px Inter,system-ui,sans-serif;letter-spacing:.09em;pointer-events:none;}
#hFieldRec[hidden]{display:none!important;}
#hFieldRec i{width:8px;height:8px;border-radius:50%;background:oklch(.70 .11 80);}
#hFieldRec[data-state="recording"] i{background:oklch(.65 .22 28);box-shadow:0 0 8px oklch(.65 .22 28 / .32);}
#hFieldRec[data-state="paused"] i{background:oklch(.62 .02 70);}
body.powerworld #hud .cityplate{ display:none !important; }   /* names a city; there isn't one */
body.powerworld #hud .wantedrow{ display:none !important; }    /* no police to be wanted by */
body.powerworld #hud .pip{ display:none !important; }          /* compact real recording indicator above; full footage at match end */
body.powerworld #hud .radar .rlab{ color:var(--text-5); }

/* Live kit content flows above the meters; no guessed pixel height of a name,
   wound row or status chip can move it into another panel. */
body.combat-chase:not(.phone):not(.tablet) #hud .status-dock{
  position:absolute; left:18px; bottom:18px; display:flex; flex-direction:column-reverse;
  gap:2px; width:min(calc(260px + var(--tier-spread,0px)),calc(50vw - 140px));
  background:oklch(.18 .02 70 / .82); border:1px solid oklch(.65 .04 70 / .28); border-radius:.625rem;
}
body.combat-chase:not(.phone):not(.tablet) #hud .status-dock > .panel{
  position:relative; inset:auto; transform:none; width:100%; min-width:0 !important;
  overflow-wrap:anywhere;
  background:none; border:0; backdrop-filter:none;
}
body.combat-chase:not(.phone):not(.tablet) #hud .kit .chip{ max-width:100%; }
/* Combat owns the viewport. Identity details remain in the case file; these
   labeled meters are the glanceable state, not a second character sheet. */
body.combat-chase:not(.phone):not(.tablet) #hud .pl{
  padding:8px 10px; display:grid; grid-template-columns:74px minmax(0,1fr); gap:6px 8px; align-items:center;
}
body.combat-chase:not(.phone):not(.tablet) #hud .pl .nm,
body.combat-chase:not(.phone):not(.tablet) #hud .pl .wantedrow,
body.combat-chase:not(.phone):not(.tablet) #hud .pl .xpwrap{ grid-column:1/-1; }
body.combat-chase:not(.phone):not(.tablet) #hud .pl .nm{ font-size:16px; line-height:20px; }
body.combat-chase:not(.phone):not(.tablet) #hud .pl .rl{ display:none; }
body.combat-chase:not(.phone):not(.tablet) #hud .pl .lab{ margin:0; line-height:14px; color:var(--text-2); letter-spacing:.02em; }
body.combat-chase:not(.phone):not(.tablet) #hud .pl .bar{ height:8px; margin:0; }
body.combat-chase:not(.phone):not(.tablet) #hud .pl .bar.gd{ height:4px; }
body.combat-chase:not(.phone):not(.tablet) #hud .pl .xpwrap{ margin-top:0; gap:8px; }
body.combat-chase:not(.phone):not(.tablet) #hud .pl .lvl,
body.combat-chase:not(.phone):not(.tablet) #hud .pl .tierb{ height:20px; font-size:12px; }
body.combat-chase:not(.phone):not(.tablet) #hud .pl .lvl{ width:20px; }
body.combat-chase:not(.phone):not(.tablet) #hud .pl .kistate:not(.on),
body.combat-chase:not(.phone):not(.tablet) #hud .pl .kiover:not(.on){ display:none; }
body.combat-chase:not(.phone):not(.tablet) #hud .pl .kistate.on,
body.combat-chase:not(.phone):not(.tablet) #hud .pl .kiover.on{ display:block; margin-left:0; letter-spacing:.04em; }
body.combat-chase:not(.phone):not(.tablet) #hud .kit{ padding:3px 10px; }
body.combat-chase:not(.phone):not(.tablet) #hud .kit .kh{ display:none; }
body.combat-chase:not(.phone):not(.tablet) #plMood{
  position:relative !important; inset:auto !important; padding:5px 10px 0 !important;
  background:none !important; border:0 !important;
  width:100%; overflow-wrap:anywhere;
}
body.combat-chase:not(.phone):not(.tablet) #plMood .mood-label{ display:inline; margin-right:8px; }
body.combat-chase:not(.phone):not(.tablet) #plMood .mood-shade{ display:inline; }
body.combat-chase:not(.phone):not(.tablet) #plMood .mood-effect{ margin-top:2px; }
/* City identity stays real, at the edge rather than across the fighter's boots. */
body.combat-chase:not(.phone):not(.tablet) #hud .cityplate{
  left:18px; top:52px; bottom:auto; transform:none; width:min(260px,30vw);
  font-size:10px; line-height:1.4; letter-spacing:.03em; overflow-wrap:anywhere; padding:7px 10px;
}
body.combat-chase:not(.phone):not(.tablet) #hud .feed{ top:160px; max-width:260px; }
body.scanner-active.combat-chase #hud .feed{top:300px;max-width:260px}
body.transport-passenger #hud .slots,body.transport-passenger #hInteract{display:none!important}

/* The rear-view fighter owns the bottom center. Readouts form one right-hand dock;
   optional hands/charge rows participate in flow instead of covering the power row.
   City and touch layouts keep their own absolute-positioned controls. */
body.combat-chase:not(.phone):not(.tablet) #hud .combat-dock{
  position:absolute; right:16px; bottom:16px; width:min(352px,calc(50vw - 80px));
  display:flex; flex-direction:column; gap:8px; max-height:calc(100% - 200px);
}
body.combat-chase:not(.phone):not(.tablet) #hud .combat-dock > .panel{
  position:relative; inset:auto; transform:none; width:100%; margin:0; flex-shrink:0;
}
body.combat-chase:not(.phone):not(.tablet) #hud .combat-dock .slots{
  display:grid; grid-template-columns:repeat(8,minmax(0,1fr)); gap:5px; padding:8px;
}
/* The selected pair owns full names/status. The remaining native slots are a
   hotkey/cooldown rail; their existing title/help keeps the full inventory. */
body.combat-chase:not(.phone):not(.tablet) #hud .combat-dock .slots .slot{
  width:auto; min-width:0; min-height:44px; height:44px; padding:16px 2px 3px;
}
body.combat-chase:not(.phone):not(.tablet) #hud .combat-dock .slot .an,
body.combat-chase:not(.phone):not(.tablet) #hud .combat-dock .slot .sfx,
body.combat-chase:not(.phone):not(.tablet) #hud .combat-dock .slot .cost{ display:none; }
body.combat-chase:not(.phone):not(.tablet) #hud .combat-dock .slot .attack-icon{ width:20px; height:20px; margin:0 auto; }
body.combat-chase:not(.phone):not(.tablet) #hud .combat-dock .slot .key{ left:3px; font-size:9px; }
body.combat-chase:not(.phone):not(.tablet) #hud .combat-dock .slot .cdn{ font-size:12px; }
body.combat-chase:not(.phone):not(.tablet) #hud .charge{ overflow:hidden; }
body.combat-chase:not(.phone):not(.tablet) #hud .charge > i{ display:block; height:100%; }
body.combat-chase:not(.phone):not(.tablet) #hud .hands{ align-items:flex-start; }
body.combat-chase:not(.phone):not(.tablet) #hud .hands .hrow{ justify-content:flex-start; }
body.combat-chase:not(.phone):not(.tablet) #hud .combat-dock > .hint{
  max-width:none; min-height:0; flex-shrink:1; overflow-y:auto; pointer-events:auto; scrollbar-width:thin;
}
body.combat-chase:not(.phone):not(.tablet) #hud .hint:focus-visible{ outline:2px solid var(--gold); outline-offset:2px; }
@media (max-width:800px){
  body.combat-chase:not(.phone):not(.tablet) #hud .combat-dock .slots{ grid-template-columns:repeat(4,minmax(0,1fr)); }
}

/* THE CROSSHAIR — four ticks around a gap, which is what a reticle is: the GAP is the aiming point,
   and a solid dot in the middle hides the one pixel you are trying to look at. Hidden everywhere
   except PowerWorld, because an isometric camera does not aim at its own centre. */
#hCross{ display:none; }
body.combat-chase #hCross{
  display:block; position:fixed; left:50%; top:50%; width:0; height:0;
  pointer-events:none; z-index:18;
}
body.combat-chase #hCross i{
  position:absolute; background:var(--gold); opacity:.85;
  box-shadow:0 0 0 1px rgba(0,0,0,.55);
}
body.combat-chase #hCross i:nth-child(1){ left:-1px; top:-15px; width:2px; height:8px; }
body.combat-chase #hCross i:nth-child(2){ left:-1px; top:7px;   width:2px; height:8px; }
body.combat-chase #hCross i:nth-child(3){ left:-15px; top:-1px; width:8px; height:2px; }
body.combat-chase #hCross i:nth-child(4){ left:7px;   top:-1px; width:8px; height:2px; }
body.combat-chase #hCross b{
  position:absolute; left:-1.5px; top:-1.5px; width:3px; height:3px; border-radius:50%;
  background:var(--gold); opacity:.5;
}
/* A small bore marker replaces personal aim while piloting; it is projected
   after camera movement and never implies mouse-aim or target acquisition. */
body.combat-chase #hCross[data-aim-mode="aircraft"]::after{
  content:attr(data-label);position:absolute;left:0;top:21px;transform:translateX(-50%);
  white-space:nowrap;color:var(--gold);font:600 10px/1.2 Inter,system-ui,sans-serif;
  letter-spacing:.08em;text-shadow:0 1px 3px #000,0 0 3px #000;
}
/* LOCKED — the crosshair says so, in the one colour that already means "hostile" everywhere else. */
/* Locked aim brackets the shot point. Shape distinguishes lock even without
   color; its open center leaves the opponent's face/torso readable. */
body.combat-chase.pw-locked #hCross i{
  width:7px; height:7px; background:none; border:solid var(--danger); opacity:1;
  box-shadow:none; filter:drop-shadow(0 1px 1px #000);
}
body.combat-chase.pw-locked #hCross i:nth-child(1){ left:-13px; top:-13px; border-width:2px 0 0 2px; }
body.combat-chase.pw-locked #hCross i:nth-child(2){ left:6px; top:-13px; border-width:2px 2px 0 0; }
body.combat-chase.pw-locked #hCross i:nth-child(3){ left:-13px; top:6px; border-width:0 0 2px 2px; }
body.combat-chase.pw-locked #hCross i:nth-child(4){ left:6px; top:6px; border-width:0 2px 2px 0; }
body.combat-chase.pw-locked #hCross b{ display:none; }
body.combat-chase #hCross[data-aim-mode="free-look-edge"] i,
body.combat-chase #hCross[data-aim-mode="free-look-edge"] b{display:none;}
body.combat-chase #hCross[data-aim-mode="free-look-edge"]::before{
  content:'';position:absolute;left:-7px;top:-7px;width:0;height:0;
  border-top:7px solid transparent;border-bottom:7px solid transparent;border-left:12px solid var(--gold);
  transform:rotate(var(--aim-bearing));transform-origin:7px 7px;filter:drop-shadow(0 1px 2px #000);
}
body.combat-chase #hCross[data-aim-mode="free-look-edge"]::after{
  content:attr(data-label);position:absolute;top:var(--aim-label-y);left:0;transform:translateX(var(--aim-label-x));
  white-space:nowrap;color:var(--gold);font:600 10px/1.2 Inter,system-ui,sans-serif;
  letter-spacing:.08em;text-shadow:0 1px 3px #000,0 0 3px #000;
}
/* Combat outcomes stay readable without occupying the target or player. */
#hud .announce.compact-notice,#hud .kobanner.compact-notice{
  top:64px; width:max-content; max-width:min(420px,calc(100vw - 32px));
  box-sizing:border-box; padding:7px 14px; border-radius:10px;
  background:oklch(.18 .02 70 / .92); text-align:center;
  transition:opacity .18s ease-out; overflow-wrap:anywhere;
}
#hud .kobanner.compact-notice{ top:132px; }
#hud:has(.compact-notice[data-active="true"]) .combo{ visibility:hidden; }
#hud .announce.compact-notice .at,#hud .kobanner.compact-notice .kob{
  font-family:Inter,system-ui,sans-serif; font-size:20px; line-height:1.2;
  font-weight:700; letter-spacing:-.025em; text-shadow:none;
}
#hud .announce.compact-notice .as,#hud .kobanner.compact-notice .kos{
  margin-top:3px; font-size:11px; line-height:1.4; letter-spacing:.025em;
  color:oklch(.9 .025 80); text-transform:none;
}
`;
