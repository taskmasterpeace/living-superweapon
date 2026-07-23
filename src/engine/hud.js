// Living Superweapon — DOM HUD + character-select screen.
import { ROSTER, SLOT_ORDER } from '../data/characters.js';
import { MODES } from '../data/modes.js';
import { clamp, TAU } from '../core/util.js';
import { ATTR_DEFS, TALENTS, deriveAttrs, heroTalents, rankName, rankColor, RANKS } from '../data/ranks.js';
import { SETTINGS, saveSettings, applySettings } from '../core/settings.js';
import { identityOf } from '../data/identities.js';
import { icon, ATTR_ICON, ICON_MEANING } from './icons.js';

const CSS = `
#hud .wrap{ position:absolute; inset:0; }
#hud .vignette{ position:absolute; inset:0; pointer-events:none; background:radial-gradient(125% 105% at 50% 44%, transparent 52%, rgba(0,0,0,.28) 82%, rgba(0,0,0,.62) 100%); z-index:0; }
#hud .radar{ position:absolute; top:16px; right:18px; width:152px; height:152px; padding:0; border-radius:12px; overflow:hidden; }
#hud .radar canvas{ display:block; width:152px; height:152px; }
#hud .radar .rlab{ position:absolute; top:6px; left:9px; font-size:9px; letter-spacing:.2em; color:#9a9384; text-transform:uppercase; z-index:2; }
#hud .hitring{ position:absolute; inset:0; pointer-events:none; z-index:5; overflow:hidden; }
#hud .hitarc{ position:absolute; width:360px; height:360px; transform:translate(-50%,-50%); border-radius:50%; background:radial-gradient(circle, rgba(255,52,34,.5), rgba(255,52,34,.16) 45%, transparent 70%); opacity:.95; transition:opacity .55s ease-out; }
#hud .danger{ position:absolute; inset:0; pointer-events:none; z-index:1; opacity:0; background:radial-gradient(115% 100% at 50% 50%, transparent 56%, rgba(190,16,16,.44) 100%); transition:opacity .2s linear; }
#hud .kobanner{ position:absolute; left:50%; top:34%; transform:translateX(-50%) scale(.55); opacity:0; text-align:center; pointer-events:none; z-index:6; transition:opacity .12s ease, transform .2s cubic-bezier(.2,1.6,.4,1); }
#hud .kobanner .kob{ font-family:'Rajdhani','Inter',sans-serif; font-weight:800; font-size:118px; line-height:.82; letter-spacing:.05em; color:#fff; text-shadow:0 6px 0 #7a0d05, 0 0 44px rgba(255,90,40,.75); }
#hud .kobanner .kos{ font-size:16px; letter-spacing:.32em; text-transform:uppercase; color:#ffcf7a; margin-top:6px; }
#hud .panel{ position:absolute; background:rgba(8,10,16,.55); border:1px solid rgba(255,255,255,.10); border-radius:12px; backdrop-filter:blur(4px); }
#hud .pl{ left:18px; bottom:18px; padding:12px 14px; min-width:240px; }
#hud .pl .nm{ font-weight:800; font-size:20px; letter-spacing:.04em; }
#hud .pl .rl{ font-size:11px; text-transform:uppercase; letter-spacing:.16em; color:#a49c8c; margin-bottom:8px; }
#hud .bar{ height:12px; border-radius:6px; background:rgba(0,0,0,.5); overflow:hidden; margin-top:6px; box-shadow:inset 0 0 0 1px rgba(255,255,255,.08); }
#hud .bar > i{ display:block; height:100%; width:50%; border-radius:6px; transition:width .09s linear; }
#hud .hpF{ background:linear-gradient(90deg,#ff5a4a,#ff9a3a); }
#hud .kiF{ background:linear-gradient(90deg,#3aa0ff,#7fe6ff); }
#hud .kiF.low{ background:linear-gradient(90deg,#f5a21a,#ffd97a); }
#hud .kiF.crit{ background:linear-gradient(90deg,#ff5a4a,#ff9a3a); animation:kipulse .45s infinite; }
@keyframes kipulse{ 50%{ filter:brightness(1.7); } }
#hud .bar.kiflash{ box-shadow:0 0 16px rgba(255,90,74,.95), inset 0 0 0 1px rgba(255,110,90,.95); }
#hud .kistate{ color:#ff8a6a; font-weight:800; letter-spacing:.14em; margin-left:8px; opacity:0; transition:opacity .15s; }
#hud .kistate.on{ opacity:1; animation:kipulse .45s infinite; }
#hud .kiover{ color:#7fe6ff; font-weight:800; letter-spacing:.14em; margin-left:8px; opacity:0; transition:opacity .15s; }
#hud .kiover.on{ opacity:1; text-shadow:0 0 10px rgba(127,230,255,.8); }
#title .pvthreat{ display:inline-block; font-size:10px; font-weight:800; letter-spacing:.14em; text-transform:uppercase; padding:3px 10px; border-radius:20px; margin-top:8px; border:1px solid; }
#title .sheet{ margin-top:12px; border-top:1px solid rgba(255,255,255,.1); padding-top:10px; }
#title .sheet .sh{ font-size:9px; letter-spacing:.22em; color:#8b8577; text-transform:uppercase; margin-bottom:6px; }
#title .arow{ display:flex; align-items:center; gap:7px; font-size:11px; margin-bottom:3px; }
#title .arow .an2{ width:70px; color:#a49c8c; letter-spacing:.06em; text-transform:uppercase; font-size:10px; }
#title .arow .av{ width:14px; text-align:right; font-weight:800; color:#e8e2d6; }
#title .arow .arank{ font-size:9px; font-weight:800; letter-spacing:.08em; text-transform:uppercase; padding:1px 7px; border-radius:9px; border:1px solid; }
#title .arow .abar{ flex:1; height:5px; background:rgba(0,0,0,.45); border-radius:3px; overflow:hidden; }
#title .arow .abar i{ display:block; height:100%; border-radius:3px; }
#title .tals{ margin-top:8px; display:flex; flex-wrap:wrap; gap:5px; }
#title .tals span{ font-size:10px; padding:3px 9px; border-radius:14px; background:rgba(127,230,255,.1); color:#a8dcff; border:1px solid rgba(127,230,255,.28); }
#title .tals span b{ color:#e0f2ff; }
#title .gear{ margin-top:8px; font-size:11px; color:#c9c2b4; }
#title .gear b{ color:#ffd24a; }
#hud .slot.deny{ animation:slotshake .32s; }
#hud .slot.deny{ border-color:#ff5a4a; box-shadow:0 0 12px rgba(255,90,74,.5); }
@keyframes slotshake{ 0%,100%{transform:translateX(0)} 22%{transform:translateX(-4px)} 55%{transform:translateX(3px)} 80%{transform:translateX(-2px)} }
#hud .slot .cost.nope{ color:#ff7a6a; font-weight:800; }
#hud .lab{ font-size:10px; letter-spacing:.14em; color:#8b8577; text-transform:uppercase; margin-top:8px; }
#hud .slots{ left:50%; transform:translateX(-50%); bottom:16px; display:flex; gap:8px; padding:10px; }
#hud .slot{ width:66px; height:66px; border-radius:10px; background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.10); position:relative; overflow:hidden; display:flex; flex-direction:column; justify-content:flex-end; padding:6px; }
#hud .slot .key{ position:absolute; top:4px; left:6px; font-size:11px; font-weight:800; color:#ffd24a; letter-spacing:.06em; }
#hud .slot .cost{ position:absolute; top:4px; right:6px; font-size:10px; color:#7fbfff; }
#hud .slot .an{ font-size:10px; line-height:1.05; color:#e8e2d6; font-weight:600; }
#hud .slot .cd{ position:absolute; left:0; right:0; bottom:0; background:rgba(0,0,0,.62); height:0%; transition:height .05s linear; }
#hud .slot.ult{ border-color:rgba(245,178,26,.5); box-shadow:0 0 16px rgba(245,178,26,.25); }
#hud .slot.dim{ opacity:.4; }
#hud .slot.on{ border-color:#ffd24a; box-shadow:0 0 16px rgba(255,210,74,.5); }
#hud .foe{ left:50%; transform:translateX(-50%); top:16px; width:min(520px,60vw); padding:8px 12px; text-align:center; }
#hud .foe .fn{ font-weight:700; letter-spacing:.06em; font-size:13px; }
#hud .foe .bar{ height:9px; }
#hud .foe .fhpF{ background:linear-gradient(90deg,#ff4a4a,#ffb03a); }
#hud .hint{ right:18px; bottom:18px; padding:10px 12px; max-width:260px; font-size:12px; color:#b7b0a2; line-height:1.6; }
#hud .hint b{ color:#ffd24a; font-weight:700; }
#hud .charge{ left:50%; transform:translateX(-50%); bottom:96px; width:280px; height:10px; display:none; }
#hud .charge > i{ background:linear-gradient(90deg,#ffd24a,#ff5a2a); }
#hud .feed{ left:18px; top:16px; padding:6px 10px; font-size:12px; color:#cbb; display:flex; flex-direction:column; gap:2px; background:transparent; border:none; }
#hud .feed div{ opacity:.9; }
/* select screen additions */
#title .selwrap{ display:flex; gap:22px; align-items:stretch; max-width:1080px; width:100%; }
#title .preview{ flex:0 0 300px; text-align:left; border:1px solid rgba(255,255,255,.12); border-radius:14px; padding:18px; background:rgba(255,255,255,.03); display:flex; flex-direction:column; }
#title .preview .pvname{ font-size:30px; font-weight:800; letter-spacing:.03em; }
#title .preview .pvttl{ font-size:12px; letter-spacing:.2em; text-transform:uppercase; color:#ffcf7a; margin:2px 0 12px; }
#title .preview .pvblurb{ font-size:14px; color:#c9c2b4; line-height:1.5; }
#title .preview .pvsig{ margin-top:12px; display:flex; flex-direction:column; gap:6px; }
#title .preview .pvsig span{ font-size:12px; color:#e8e2d6; background:rgba(255,255,255,.05); border-radius:8px; padding:5px 8px; border-left:3px solid var(--pc,#ffd24a); }
#title .rcard.sel{ border-color:var(--pc); background:rgba(255,255,255,.09); box-shadow:0 0 22px -6px var(--pc); transform:translateY(-3px); }
#title .rcard .rl{ margin-top:2px; }
#title .rcard .cstat{ font-size:10px; color:#8b8577; margin-top:4px; letter-spacing:.04em; }
#title .rcard .cstat b{ color:#e8c39a; }
#title .preview{ flex:0 0 350px; max-height:70vh; overflow-y:auto; }
#title .pvstats{ margin-top:14px; display:flex; flex-direction:column; gap:5px; }
#title .statrow{ display:flex; align-items:center; gap:8px; font-size:11px; }
#title .statrow .sl{ width:78px; color:#a49c8c; letter-spacing:.1em; text-transform:uppercase; }
#title .statrow .sb{ flex:1; height:8px; background:rgba(0,0,0,.45); border-radius:4px; overflow:hidden; box-shadow:inset 0 0 0 1px rgba(255,255,255,.08); }
#title .statrow .sb > i{ display:block; height:100%; border-radius:4px; transition:width .25s ease; }
#title .statrow .sv{ width:20px; text-align:right; color:#e8e2d6; font-weight:800; }
#title .pvtags{ margin-top:11px; display:flex; flex-wrap:wrap; gap:6px; }
#title .pvtags span{ font-size:10px; letter-spacing:.1em; text-transform:uppercase; padding:3px 9px; border-radius:20px; background:rgba(255,210,74,.12); color:#ffcf7a; border:1px solid rgba(255,210,74,.32); }
#title .pvabil{ margin-top:13px; border-top:1px solid rgba(255,255,255,.1); padding-top:11px; display:flex; flex-direction:column; gap:8px; }
#title .pvabil .ab b{ display:inline-block; min-width:38px; font-size:11px; letter-spacing:.03em; }
#title .pvabil .ab .an{ font-weight:700; color:#e8e2d6; font-size:12px; }
#title .pvabil .ab .ad{ display:block; color:#9c958a; font-size:11px; line-height:1.3; margin-left:38px; }
#title .modes{ display:flex; gap:12px; justify-content:center; margin:4px 0; flex-wrap:wrap; }
#title .modecard{ cursor:pointer; width:158px; padding:12px 14px; border-radius:12px; border:1px solid rgba(255,255,255,.10); background:rgba(255,255,255,.03); text-align:left; transition:transform .12s, border-color .12s, background .12s; }
#title .modecard:hover{ transform:translateY(-2px); background:rgba(255,255,255,.06); }
#title .modecard.sel{ border-color:var(--mc,#ffd24a); box-shadow:0 0 22px -8px var(--mc,#ffd24a); background:rgba(255,255,255,.08); }
#title .modecard .mi{ font-size:22px; }
#title .modecard .mn{ font-weight:800; font-size:16px; letter-spacing:.03em; margin-top:2px; }
#title .modecard .mt{ font-size:10px; letter-spacing:.14em; text-transform:uppercase; color:#a49c8c; }
#title .ptabs{ display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
#title .ptabs .pt{ cursor:pointer; font-weight:800; font-size:12px; letter-spacing:.06em; padding:8px 14px; border-radius:9px; border:1px solid rgba(255,255,255,.12); background:rgba(255,255,255,.04); color:#b7b0a2; }
#title .ptabs .pt.on{ background:linear-gradient(180deg,#ffd15a,#f5921a); color:#160d02; border:none; }
#title .ptabs .p2pick{ cursor:pointer; font-weight:700; font-size:12px; padding:8px 12px; border-radius:9px; border:1px solid rgba(255,255,255,.14); color:#e8e2d6; }
#title .modehint{ font-size:13px; color:#b7b0a2; line-height:1.5; }
#hud .gd{ height:7px; }
#hud .gdF{ background:linear-gradient(90deg,#9fd0ff,#e6f2ff); }
#hud .gdF.stagger{ background:linear-gradient(90deg,#ff6a4a,#ffb03a); }
#hud .dmgwrap{ position:absolute; inset:0; overflow:hidden; }
#hud .dmg{ position:absolute; font-weight:800; letter-spacing:.01em; transform:translate(-50%,-50%); text-shadow:0 2px 5px rgba(0,0,0,.85), 0 0 12px rgba(0,0,0,.5); will-change:transform,opacity; }
#hud .combo{ position:absolute; left:50%; top:88px; transform:translateX(-50%) scale(1); transform-origin:top center; text-align:center; opacity:0; transition:opacity .14s ease, transform .09s ease; }
#hud .combo .n{ font-weight:800; font-size:46px; line-height:.9; color:#ffd24a; text-shadow:0 3px 0 #7a3d05, 0 0 24px rgba(245,178,26,.55); }
#hud .combo .l{ font-size:12px; letter-spacing:.28em; color:#ffcf7a; text-transform:uppercase; }
#hud .paused{ position:absolute; inset:0; display:none; align-items:center; justify-content:center; background:rgba(4,5,9,.5); backdrop-filter:blur(2px); }
#hud .paused .t{ font-size:40px; font-weight:800; letter-spacing:.14em; color:#ffd24a; text-shadow:0 0 30px rgba(245,178,26,.4); }
#hud .hitflash{ position:absolute; inset:0; opacity:0; pointer-events:none; mix-blend-mode:screen; }
#hud .modebar{ left:50%; transform:translateX(-50%); top:12px; display:flex; align-items:center; gap:16px; padding:8px 20px; }
#hud .modebar .seg{ display:flex; flex-direction:column; align-items:center; min-width:52px; }
#hud .modebar .mv{ font-size:23px; font-weight:800; letter-spacing:.03em; line-height:1; }
#hud .modebar .ml{ font-size:9px; letter-spacing:.16em; color:#a49c8c; text-transform:uppercase; margin-top:3px; }
#hud .modebar .vs{ color:#8b8577; font-weight:800; font-size:13px; }
#hud .announce{ position:absolute; left:50%; top:20%; transform:translateX(-50%) scale(1); transform-origin:top center; text-align:center; opacity:0; transition:opacity .18s ease, transform .12s ease; pointer-events:none; }
#hud .announce .at{ font-size:54px; font-weight:800; letter-spacing:.05em; text-shadow:0 4px 0 rgba(0,0,0,.5), 0 0 34px rgba(0,0,0,.5); }
#hud .announce .as{ font-size:14px; letter-spacing:.22em; text-transform:uppercase; color:#e8e2d6; margin-top:2px; }
#hud .xpwrap{ margin-top:9px; display:flex; align-items:center; gap:8px; }
#hud .pl{ transition:min-width .5s cubic-bezier(.2,1.4,.4,1); }
#hud .tierb{ display:inline-flex; align-items:center; justify-content:center; height:26px; padding:0 9px; border-radius:7px; font-weight:800; font-size:12px; letter-spacing:.08em; flex:0 0 auto; background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.14); color:#b7b0a2; }
#hud .tierb.t2{ background:linear-gradient(180deg,#ffd15a,#f5921a); color:#160d02; border:none; box-shadow:0 0 12px rgba(245,178,26,.5); }
#hud .tierb.t3{ background:linear-gradient(180deg,#ffedb0,#ffd15a); color:#160d02; border:none; box-shadow:0 0 16px rgba(255,224,138,.7); }
#hud .tierb.t4{ background:linear-gradient(180deg,#ffffff,#ffedb0); color:#160d02; border:none; box-shadow:0 0 22px rgba(255,255,255,.8); animation:kipulse .6s infinite; }
#hud .lvl{ display:inline-flex; align-items:center; justify-content:center; width:26px; height:26px; border-radius:7px; background:linear-gradient(180deg,#ffd15a,#f5921a); color:#160d02; font-weight:800; font-size:14px; box-shadow:0 2px 0 #7a3d05; flex:0 0 auto; }
#hud .xp{ flex:1; height:6px; border-radius:3px; background:rgba(0,0,0,.5); overflow:hidden; box-shadow:inset 0 0 0 1px rgba(255,255,255,.08); }
#hud .xp > i{ display:block; height:100%; background:linear-gradient(90deg,#ffd15a,#ffe89a); border-radius:3px; transition:width .2s; }
#hud .kit{ left:18px; bottom:250px; padding:9px 13px; min-width:210px; }
#hud .kit .kh{ font-size:10px; letter-spacing:.16em; color:#8b8577; text-transform:uppercase; margin-bottom:5px; }
#hud .kit .chips{ display:flex; flex-wrap:wrap; gap:5px; }
#hud .kit .chip{ font-size:11px; font-weight:700; padding:3px 9px; border-radius:14px; background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.10); color:#b7b0a2; }
#hud .kit .chip.on{ color:#160d02; }
#hud .endscr{ position:absolute; inset:0; display:none; flex-direction:column; align-items:center; justify-content:center; gap:14px; background:radial-gradient(120% 90% at 50% 40%, rgba(14,10,6,.72), rgba(4,5,9,.94)); pointer-events:auto; z-index:40; }
#hud .endscr .et{ font-size:76px; font-weight:800; letter-spacing:.04em; }
#hud .endscr .el{ font-size:16px; color:#c9c2b4; text-align:center; line-height:1.6; }
#hud .endscr .stats{ display:flex; gap:28px; margin:10px 0 6px; }
#hud .endscr .stat .sv{ font-size:32px; font-weight:800; color:#ffd24a; text-align:center; }
#hud .endscr .stat .sl{ font-size:11px; letter-spacing:.14em; color:#a49c8c; text-transform:uppercase; text-align:center; }
#hud .endscr .btns{ display:flex; gap:12px; margin-top:6px; }
#hud .endscr button{ pointer-events:auto; cursor:pointer; font-family:inherit; font-weight:800; letter-spacing:.12em; font-size:14px; color:#160d02; padding:13px 24px; border:none; border-radius:10px; background:linear-gradient(180deg,#ffd15a,#f5921a); box-shadow:0 5px 0 #7a3d05; text-transform:uppercase; }
#hud .endscr button.ghost{ background:rgba(255,255,255,.08); color:#e8e2d6; box-shadow:none; border:1px solid rgba(255,255,255,.15); }
/* ORIGIN — forge card + custom-hero affordances */
#title .rcard{ position:relative; }
#title .rcard .cchip{ position:absolute; top:8px; right:8px; font-size:8px; font-weight:800; letter-spacing:.14em; padding:2px 7px; border-radius:9px; background:rgba(255,210,74,.14); border:1px solid rgba(255,210,74,.4); color:#ffd97a; }
#title .rcard .cedit{ position:absolute; bottom:8px; right:8px; font-size:13px; opacity:0; transition:opacity .12s; color:#ffd24a; }
#title .rcard:hover .cedit{ opacity:.95; }
#title .rcard.forge{ border-style:dashed; border-color:rgba(255,210,74,.4); background:rgba(255,210,74,.04); display:flex; flex-direction:column; align-items:center; justify-content:center; gap:2px; min-height:96px; text-align:center; }
#title .rcard.forge .fplus{ font-size:26px; font-weight:800; color:#ffd24a; line-height:1; }
#title .rcard.forge:hover{ box-shadow:0 0 22px -6px #ffd24a; }
/* interactive tutorial banner */
#hud .tut{ left:50%; transform:translateX(-50%); top:64px; width:min(560px,82vw); padding:13px 18px 12px; text-align:center; z-index:8; }
#hud .tut .tstep{ font-size:9.5px; letter-spacing:.24em; color:#8b8577; text-transform:uppercase; }
#hud .tut .tobj{ font-family:'Rajdhani','Inter',sans-serif; font-weight:800; font-size:27px; color:#ffd24a; letter-spacing:.04em; line-height:1.1; margin:2px 0; }
#hud .tut .tkeys{ display:inline-block; font-weight:800; font-size:13px; color:#160d02; background:linear-gradient(180deg,#ffd15a,#f5921a); padding:4px 13px; border-radius:8px; margin:4px 0 2px; box-shadow:0 2px 0 #7a3d05; }
#hud .tut .ttip{ font-size:12px; color:#b7b0a2; margin-top:4px; }
#hud .tut .tdots{ display:flex; gap:5px; justify-content:center; margin-top:9px; }
#hud .tut .tdots i{ width:8px; height:8px; border-radius:50%; background:rgba(255,255,255,.14); }
#hud .tut .tdots i.on{ background:#ffd24a; box-shadow:0 0 8px rgba(255,210,74,.6); }
#hud .tut .tskip{ position:absolute; top:9px; right:12px; cursor:pointer; font-size:10px; letter-spacing:.12em; color:#8b8577; text-transform:uppercase; pointer-events:auto; }
#hud .tut .tskip:hover{ color:#ffd24a; }
@keyframes tutpop{ 0%{ transform:translateX(-50%) scale(.92);} 60%{ transform:translateX(-50%) scale(1.05);} 100%{ transform:translateX(-50%) scale(1);} }
#hud .tut.pop{ animation:tutpop .3s ease; }
/* pause menu */
#hud .paused{ flex-direction:column; pointer-events:auto; z-index:45; }
#hud .paused .pwrap{ display:flex; flex-direction:column; gap:10px; align-items:center; background:rgba(8,10,16,.78); border:1px solid rgba(255,255,255,.12); border-radius:16px; padding:26px 34px; backdrop-filter:blur(6px); }
#hud .paused button{ cursor:pointer; font-family:inherit; font-weight:800; letter-spacing:.12em; font-size:14px; color:#160d02; padding:12px 26px; min-width:240px; border:none; border-radius:10px; background:linear-gradient(180deg,#ffd15a,#f5921a); box-shadow:0 4px 0 #7a3d05; text-transform:uppercase; }
#hud .paused button.ghost{ background:rgba(255,255,255,.08); color:#e8e2d6; box-shadow:none; border:1px solid rgba(255,255,255,.15); }
/* full-screen overlays (options / how-to-play) — live on <body> so they stack over the title */
.lswovl{ position:fixed; inset:0; z-index:62; display:none; align-items:center; justify-content:center; background:rgba(4,5,9,.8); backdrop-filter:blur(3px); pointer-events:auto; color:#e8e2d6; }
.lswovl .obox{ width:min(700px,94vw); max-height:88vh; overflow-y:auto; background:rgba(14,16,24,.97); border:1px solid rgba(255,255,255,.14); border-radius:16px; padding:22px 26px; font-family:"Rajdhani","Inter",system-ui,sans-serif; }
.lswovl .oh{ font-weight:800; font-size:26px; letter-spacing:.1em; color:#ffd24a; margin-bottom:14px; text-transform:uppercase; }
.lswovl .orow{ display:flex; align-items:center; gap:12px; margin-bottom:12px; }
.lswovl .orow .ol{ width:200px; font-size:11px; letter-spacing:.12em; text-transform:uppercase; color:#a49c8c; }
.lswovl .orow input[type=range]{ flex:1; accent-color:#f5b21a; }
.lswovl .orow .ov{ width:48px; text-align:right; font-weight:800; font-size:13px; }
.lswovl .chips3{ display:flex; gap:6px; flex-wrap:wrap; flex:1; }
.lswovl .c3{ cursor:pointer; font-size:11px; font-weight:800; padding:6px 12px; border-radius:9px; border:1px solid rgba(255,255,255,.12); background:rgba(255,255,255,.04); color:#b7b0a2; }
.lswovl .c3.on{ background:linear-gradient(180deg,#ffd15a,#f5921a); color:#160d02; border-color:transparent; }
.lswovl .odone{ cursor:pointer; margin-top:10px; font-family:inherit; font-weight:800; letter-spacing:.12em; font-size:14px; color:#160d02; padding:12px 26px; border:none; border-radius:10px; background:linear-gradient(180deg,#ffd15a,#f5921a); box-shadow:0 4px 0 #7a3d05; text-transform:uppercase; width:100%; }
.lswovl .odone.oghost{ background:rgba(255,255,255,.08); color:#e8e2d6; box-shadow:none; border:1px solid rgba(255,255,255,.15); }
.lswovl .hsec{ margin-bottom:13px; }
.lswovl .hsec .ht{ font-size:11px; letter-spacing:.18em; color:#ffcf7a; text-transform:uppercase; margin-bottom:5px; }
.lswovl .hsec .hb{ font-size:13.5px; color:#c9c2b4; line-height:1.65; }
.lswovl .hsec .hb b{ color:#ffd24a; }
.lswovl .hsec .hb em{ color:#7fe6ff; font-style:normal; font-weight:700; }
/* title top bar + roster filters */
#title .topbar{ position:absolute; top:16px; right:18px; display:flex; gap:8px; }
#title .topbar button{ cursor:pointer; font-family:inherit; font-weight:800; font-size:12px; letter-spacing:.08em; color:#e8e2d6; padding:9px 14px; border-radius:9px; border:1px solid rgba(255,255,255,.14); background:rgba(255,255,255,.05); text-transform:uppercase; }
#title .topbar button:hover{ border-color:#ffd24a; color:#ffd24a; }
#title .filters{ display:flex; gap:6px; flex-wrap:wrap; align-items:center; }
#title .filters .fc{ cursor:pointer; font-size:10px; font-weight:800; letter-spacing:.08em; padding:5px 10px; border-radius:12px; border:1px solid rgba(255,255,255,.12); background:rgba(255,255,255,.04); color:#b7b0a2; text-transform:uppercase; }
#title .filters .fc.on{ background:rgba(255,210,74,.16); border-color:rgba(255,210,74,.5); color:#ffd97a; }
#title .filters select{ font-family:inherit; font-size:11px; font-weight:700; color:#e8e2d6; background:rgba(0,0,0,.5); border:1px solid rgba(255,255,255,.14); border-radius:8px; padding:5px 8px; }
#title .filters input{ font-family:inherit; font-size:12px; color:#e8e2d6; background:rgba(0,0,0,.4); border:1px solid rgba(255,255,255,.14); border-radius:8px; padding:5px 10px; width:120px; outline:none; }
#title .filters input:focus{ border-color:#ffd24a; }
#title .filters .cnt{ font-size:10px; color:#8b8577; letter-spacing:.1em; margin-left:auto; }
/* the cast layer: identity, at-a-glance, rank ladder, sheet flipping */
#title .preview{ position:relative; }
#title .pvflip{ position:absolute; top:14px; right:14px; display:flex; gap:6px; z-index:2; }
#title .pvflip span{ cursor:pointer; width:26px; height:26px; display:inline-flex; align-items:center; justify-content:center; border-radius:8px; border:1px solid rgba(255,255,255,.16); background:rgba(255,255,255,.05); color:#ffd24a; font-size:16px; font-weight:800; user-select:none; }
#title .pvflip span:hover{ border-color:#ffd24a; box-shadow:0 0 10px rgba(255,210,74,.3); }
#title .pvident{ display:flex; flex-direction:column; gap:3px; margin:7px 0 9px; font-size:12.5px; color:#e8e2d6; }
#title .pvident svg{ color:#ffcf7a; }
#title .glance{ display:flex; flex-wrap:wrap; gap:5px; margin-top:10px; }
#title .glance span{ font-size:10.5px; padding:4px 9px; border-radius:12px; background:rgba(127,230,255,.08); color:#cfe8f2; border:1px solid rgba(127,230,255,.2); }
#title .glance span svg{ color:#7fe6ff; }
#title .glance span.lead{ background:rgba(255,210,74,.12); color:#ffd97a; border-color:rgba(255,210,74,.35); font-weight:700; }
#title .glance span.lead svg{ color:#ffd24a; }
#title .ladder{ display:flex; align-items:center; gap:2px; margin:2px 0 7px; }
#title .ladder i{ width:12px; height:5px; border-radius:2px; display:inline-block; }
#title .ladder span{ font-size:8.5px; color:#8b8577; letter-spacing:.1em; text-transform:uppercase; margin-left:6px; }
#title .statrow .sl svg{ color:#a49c8c; }
#title .arow .an2 svg{ color:#a49c8c; }
#title .rcard .cflag{ font-size:11px; font-weight:400; }
`;

// Derive a 0–10 stat profile + trait tags from a character's raw data.
export function heroStats(d) {
  const A = Object.values(d.abilities || {});
  const maxOf = (fn) => A.reduce((m, a) => Math.max(m, fn(a) || 0), 0);
  const maxDmg = maxOf(a => a.dmgMax || a.damage || a.finisher || (a.dps ? a.dps * 0.5 : 0));
  const maxRange = maxOf(a => a.maxLen || (a.speed ? a.speed * 0.4 : 0) || a.range);
  const hasBlink = A.some(a => a.type === 'teleport') || d.teleEscape;
  const hasDash = A.some(a => a.type === 'dash');
  const n = (v, mx) => Math.max(1, Math.min(10, Math.round(v / mx * 10)));
  const tags = [];
  if (d.beamMight >= 1.2) tags.push('Beam Master');
  if (A.some(a => a.type === 'construct')) tags.push('Constructs');
  if (A.some(a => a.type === 'summon')) tags.push('Summoner');
  if (A.some(a => a.type === 'meteor')) tags.push('Artillery');
  if (A.some(a => a.type === 'charge')) tags.push('Charge');
  if (d.thorns) tags.push('Thorns');
  if (d.phase) tags.push('Phase');
  if (d.grabHeal) tags.push('Absorb');
  if (d.tentacles) tags.push('Tentacles');
  if (A.some(a => a.type === 'portal')) tags.push('Portals');
  if (A.some(a => a.type === 'rifle')) tags.push('Gunner');
  if (d.metal) tags.push('Armored');
  if (d.guardStrong) tags.push('Shield');
  if (d.energyInfinite) tags.push('∞ Core');
  if (d.flightTier === 0) tags.push('Grounded');
  else if (d.flightTier === 1) tags.push('Clumsy Flier');
  else if (d.flightTier === 2) tags.push('Levitator');
  if (d.flyStyle === 'ice') tags.push('Rider');
  if (d.flyStyle === 'fire') tags.push('Fire Wake');
  if ((d.items || []).length) tags.push('Gadgeteer');
  if (hasBlink) tags.push('Blink');
  if (A.some(a => a.fly) || d.speed >= 40) tags.push('Aerial');
  return {
    power: n(maxDmg, 90), range: n(maxRange, 170),
    mobility: Math.min(10, Math.round(d.speed / 45 * 6) + (hasBlink ? 3 : 0) + (hasDash ? 1 : 0)),
    defense: Math.min(10, Math.round(d.hp / 150 * 7) + (d.phase ? 2 : 0) + (d.thorns ? 1 : 0)),
    health: n(d.hp, 150), energy: n(d.ki, 130), speed: n(d.speed, 45),
    strength: d.strength ?? 5,
    tags: tags.slice(0, 7),
  };
}

// LeFevre Threat Level scale (Living Superweapon Threshold Treaty)
export const THREAT_COLORS = { 'Low': '#8fe08a', 'Moderate': '#ffd24a', 'High': '#ff9a3a', 'Very High': '#ff5a4a', 'Extreme': '#ff2f2f' };

// "What am I getting into?" — a mechanical AT-A-GLANCE derived from the ACTUAL kit, so it can
// never drift from the data. Returns [iconName, text, lead?] chips.
export function kitFacts(def) {
  const A = Object.values(def.abilities || {});
  const st = heroStats(def);
  const has = (t) => A.some(a => a.type === t);
  const STYLE = {
    rusher: ['mobility', 'RUSHDOWN — closes fast, fights in your face'],
    beamer: ['energy', 'BEAM PRESSURE — sustained energy at range'],
    artillery: ['power', 'ARTILLERY — big shells from a distance'],
    zoner: ['range', 'ZONER — controls space, punishes approach'],
    bruiser: ['strength', 'BRUISER — mid-range brawling'],
    trickster: ['mobility', 'TRICKSTER — teleports & mixups'],
    grappler: ['might', 'GRAPPLER — seizes you and slams you'],
    summoner: ['person', 'COMMANDER — minions do the fighting'],
  };
  const out = [];
  const s = STYLE[def.ai && def.ai.style] || ['strength', 'BRAWLER'];
  out.push([s[0], s[1], true]);
  out.push(['range', st.range >= 7 ? 'LONG range' : st.range >= 4 ? 'MID range' : 'CLOSE range']);
  const str = def.strength ?? 5;
  out.push(['fighting', str >= 7 ? 'HEAVY fists' : str >= 4 ? 'solid fists' : 'light fists']);
  const ft = def.flightTier ?? 3;
  out.push(['flight', ft === 0 ? 'grounded' : ft === 1 ? 'clumsy flier' : ft === 2 ? 'levitates' : 'full flight']);
  if (def.guardType === 'deflect') out.push(['defense', 'DEFLECT guard — bullets bounce back']);
  else if (def.guardType === 'barrier') out.push(['defense', 'BARRIER guard — blocks 360°, costs ki']);
  // what they actually carry
  const nBeams = A.filter(a => a.type === 'beam').length;
  if (nBeams) out.push(['energy', nBeams > 1 ? nBeams + ' beams' : 'a beam']);
  if (has('rifle')) out.push(['range', 'guns']);
  if (has('bow')) out.push(['range', 'a payload bow']);
  if (has('charge')) out.push(['power', 'a charge bomb — hold to grow it']);
  if (has('spiritbomb')) out.push(['power', 'a giant channeled orb']);
  if (has('meteor')) out.push(['power', 'an airstrike ult']);
  if (has('summon')) out.push(['person', 'summons']);
  if (has('construct')) out.push(['might', 'solid-light constructs']);
  if (has('tentacle')) out.push(['might', 'a grab-chain — drag & slam']);
  if (has('portal')) out.push(['mobility', 'portals']);
  if (A.some(a => a.type === 'cone' && a.cold)) out.push(['defense', 'a FREEZE cone']);
  else if (has('cone')) out.push(['strength', 'a force cone']);
  if (has('mine')) out.push(['threat', 'proximity mines']);
  if (has('lifedrain')) out.push(['health', 'a life siphon']);
  if (has('rush')) out.push(['fighting', 'a multi-hit rush']);
  if (has('teleport')) out.push(['mobility', 'a teleport']);
  if (has('phase')) out.push(['defense', 'intangibility']);
  if (has('facebomb')) out.push(['threat', 'a homing seeker bomb']);
  if ((def.items || []).length) out.push(['intellect', 'gadgets: ' + def.items.map(i => i.name).join(', ')]);
  return out;
}

function describeEvade(ev) {
  switch (ev.kind) {
    case 'blink': return 'short teleport in the tapped direction (i-frames)';
    case 'sprint': return 'speed surge for ~' + (ev.dur || 1.5) + 's';
    case 'slide': return 'long frictionless slide (i-frames)';
    case 'phase': return 'slip through attacks while dashing (long i-frames)';
    case 'leap': return 'huge parabolic jump — clears buildings';
    default: return 'burst dash with i-frames';
  }
}

function describeAbility(a) {
  switch (a.type) {
    case 'beam': return (a.charge ? 'Chargeable ' : '') + 'steerable energy beam' + (a.radius > 2 ? ' (wide)' : ' (thin)');
    case 'projectile': return (a.homing ? 'Homing ' : '') + (a.grav ? 'lobbed ' : '') + 'blast' + (a.shock ? ', cracks the ground' : '');
    case 'volley': return 'rapid alternating-hand blast volley';
    case 'cone': return a.cold ? 'wide freezing breath — slows on hit' : 'wide force cone — knockback';
    case 'charge': return 'hold to charge a size-scaling blast + ground shockwave';
    case 'spiritbomb': return 'channel a giant orb overhead, then hurl it';
    case 'melee': return (a.fly ? 'flying ' : '') + 'melee strike that launches';
    case 'rush': return 'teleporting multi-hit rush combo';
    case 'teleport': return 'blink to your aim (breaks grabs)';
    case 'dash': return 'quick i-frame dash';
    case 'summon': return 'summon seeker drones that fight for you';
    case 'construct': return 'cursor-steered ' + (a.construct || 'solid-light') + ' construct';
    case 'buff': return 'power-up' + (a.invuln ? ' + invincibility' : '') + (a.heal ? ' + heal' : '') + (a.spendAll ? ' (spends all ki)' : '');
    case 'meteor': return 'call down a meteor storm at your aim';
    case 'phase': return 'hold to go intangible — spends energy';
    case 'tentacle': return 'tentacles seize a foe, drag them in, and SLAM them into the nearest wall';
    case 'portal': return 'place a door, then its exit — anything that touches one comes out the other';
    case 'rifle': return (a.interval > 0.2 ? 'heavy sidearm — hard-hitting shots' : 'full-auto tracer fire') + ' (ammo = ki)';
    case 'bow': return 'hold to draw — arrow speed & damage scale; payload from your quiver';
    case 'facebomb': return 'charge her up — she drifts to the target, lingers a heartbeat, then DETONATES';
    case 'mine': return 'plant proximity mines at your aim (up to 3) — they arm, blink, and erase';
    case 'lifedrain': return 'hold to siphon — their health flows into yours';
    case 'quiver': return 'switch broadheads: ' + (a.payloads || ['explosive', 'flame', 'poison']).join(' / ');
    default: return a.type;
  }
}

export class HUD {
  constructor(game) {
    this.game = game;
    const s = document.createElement('style'); s.textContent = CSS; document.head.appendChild(s);
    this.root = document.getElementById('hud');
    this.title = document.getElementById('title');
    this.feedLines = [];
    this._build();
  }

  _build() {
    this.root.innerHTML = `
    <div class="wrap">
      <div class="vignette"></div>
      <div class="panel feed" id="hFeed"></div>
      <div class="panel foe" id="hFoe" style="display:none">
        <div class="fn" id="foeName">RIVAL</div>
        <div class="bar"><i class="fhpF" id="foeHp" style="width:100%"></i></div>
      </div>
      <div class="panel pl">
        <div class="nm" id="plName">—</div>
        <div class="rl" id="plRole">—</div>
        <div class="lab">HEALTH</div><div class="bar"><i class="hpF" id="plHp"></i></div>
        <div class="lab">KI / ENERGY<span class="kistate" id="kiState">DRAINED</span><span class="kiover" id="kiOver">⚡ OVERDRIVE — FISTS REFILL</span></div><div class="bar" id="kiBar"><i class="kiF" id="plKi"></i></div>
        <div class="lab">GUARD</div><div class="bar gd"><i class="gdF" id="plGd"></i></div>
        <div class="xpwrap"><span class="lvl" id="plLvl">1</span><span class="tierb" id="plTier">TIER I</span><span class="xp"><i id="plXp" style="width:0%"></i></span></div>
      </div>
      <div class="panel modebar" id="hMode" style="display:none"></div>
      <div class="announce" id="hAnn"><div class="at" id="hAnnT"></div><div class="as" id="hAnnS"></div></div>
      <div class="panel kit" id="hKit" style="display:none"><div class="kh" id="hKitH">KIT</div><div class="chips" id="hKitChips"></div></div>
      <div class="endscr" id="hEnd"></div>
      <div class="panel charge" id="hCharge"><i style="width:0%"></i></div>
      <div class="combo" id="hCombo"><div class="n" id="hComboN">0</div><div class="l">Hits</div></div>
      <div class="dmgwrap" id="hDmg"></div>
      <div class="panel slots" id="hSlots"></div>
      <div class="panel hint" id="hHint">
        <b>WASD</b> move · <b>Mouse</b> aim · <b>Click a foe</b> to lock/face · <b>T</b> unlock<br/>
        <b>LMB/RMB</b> powers · <b>Q E H</b> skills · <b>R</b> ultimate<br/>
        <b>V</b> tap jab / <b>HOLD</b> haymaker (crushes guards) · <b>G</b> grab<br/>
        <b>C / Mouse4</b> guard · <b>X</b> item (beacon) · <b>SHIFT</b> dash · <b>2×TAP</b> move = evade<br/>
        <b>F</b> flight ON/OFF · <b>SPACE</b> rise · release = hover · <b>Z</b> descend · <b>WHEEL</b> swap hero<br/>
        <b>1–0</b>/<b>TAB</b> heroes · <b>B</b> rival · <b>ESC</b> pause<br/>
        🎮 <b>Pad</b>: sticks move/aim · R2/L2 powers · ▢○ melee · L1 guard
      </div>
      <div class="panel tut" id="hTut" style="display:none">
        <span class="tskip" id="hTutSkip">skip ✕</span>
        <div class="tstep" id="hTutStep"></div>
        <div class="tobj" id="hTutObj"></div>
        <div><span class="tkeys" id="hTutKeys"></span></div>
        <div class="ttip" id="hTutTip"></div>
        <div class="tdots" id="hTutDots"></div>
      </div>
      <div class="paused" id="hPaused"><div class="pwrap">
        <div class="t">PAUSED</div>
        <button data-p="resume">▶ Resume</button>
        <button data-p="options" class="ghost">⚙ Options</button>
        <button data-p="howto" class="ghost">❓ How to Play</button>
        <button data-p="menu" class="ghost">Main Menu</button>
      </div></div>
      <div class="hitflash" id="hFlash"></div>
      <div class="danger" id="hDanger"></div>
      <div class="hitring" id="hHits"></div>
      <div class="panel radar" id="hRadar"><div class="rlab">Radar</div><canvas id="hRadarC" width="152" height="152"></canvas></div>
      <div class="kobanner" id="hKO"><div class="kob" id="hKOt">K.O.</div><div class="kos" id="hKOs"></div></div>
    </div>`;
    this.el = {
      feed: this.root.querySelector('#hFeed'),
      foe: this.root.querySelector('#hFoe'), foeName: this.root.querySelector('#foeName'), foeHp: this.root.querySelector('#foeHp'),
      name: this.root.querySelector('#plName'), role: this.root.querySelector('#plRole'),
      hp: this.root.querySelector('#plHp'), ki: this.root.querySelector('#plKi'), gd: this.root.querySelector('#plGd'),
      kiBar: this.root.querySelector('#kiBar'), kiState: this.root.querySelector('#kiState'), kiOver: this.root.querySelector('#kiOver'),
      charge: this.root.querySelector('#hCharge'), chargeI: this.root.querySelector('#hCharge > i'),
      slots: this.root.querySelector('#hSlots'),
      combo: this.root.querySelector('#hCombo'), comboN: this.root.querySelector('#hComboN'),
      dmg: this.root.querySelector('#hDmg'), paused: this.root.querySelector('#hPaused'),
      flash: this.root.querySelector('#hFlash'),
      lvl: this.root.querySelector('#plLvl'), xp: this.root.querySelector('#plXp'), tier: this.root.querySelector('#plTier'),
      plPanel: this.root.querySelector('.pl'),
      mode: this.root.querySelector('#hMode'), ann: this.root.querySelector('#hAnn'), annT: this.root.querySelector('#hAnnT'), annS: this.root.querySelector('#hAnnS'),
      kit: this.root.querySelector('#hKit'), kitChips: this.root.querySelector('#hKitChips'), end: this.root.querySelector('#hEnd'),
      radar: this.root.querySelector('#hRadar'), radarC: this.root.querySelector('#hRadarC'),
      hits: this.root.querySelector('#hHits'), danger: this.root.querySelector('#hDanger'),
      ko: this.root.querySelector('#hKO'), koT: this.root.querySelector('#hKOt'), koS: this.root.querySelector('#hKOs'),
      hint: this.root.querySelector('#hHint'),
      tut: this.root.querySelector('#hTut'), tutStep: this.root.querySelector('#hTutStep'), tutObj: this.root.querySelector('#hTutObj'),
      tutKeys: this.root.querySelector('#hTutKeys'), tutTip: this.root.querySelector('#hTutTip'), tutDots: this.root.querySelector('#hTutDots'),
    };
    this.root.querySelector('#hTutSkip').onclick = () => { this.hideTutorial(); this.onTutorialSkip && this.onTutorialSkip(); };
    this._radarCtx = this.el.radarC.getContext('2d');
    // pause menu actions
    this.el.paused.querySelectorAll('button').forEach(b => b.onclick = () => {
      const a = b.dataset.p;
      if (a === 'resume') { this.setPaused(false); this.onResume && this.onResume(); }
      else if (a === 'options') this.showOptions();
      else if (a === 'howto') this.showHowto();
      else if (a === 'menu') { this.setPaused(false); this.onMenu && this.onMenu(); }
    });
    this._buildOverlays();
  }

  // ---- options + how-to-play overlays (on <body> so they stack above the title screen) ----
  _buildOverlays() {
    const mk = (id) => { const d = document.createElement('div'); d.id = id; d.className = 'lswovl'; document.body.appendChild(d); return d; };
    this.optionsEl = mk('hOptions'); this.howtoEl = mk('hHowto');
  }
  setHintVisible(v) { if (this.el.hint) this.el.hint.style.display = v ? 'block' : 'none'; }

  // ---- interactive tutorial banner ----
  showTutorial(st, i, n) {
    const t = this.el.tut; t.style.display = 'block';
    t.classList.remove('pop'); void t.offsetWidth; t.classList.add('pop');
    this.el.tutStep.textContent = `LEARN TO PLAY — ${i + 1} / ${n}`;
    this.el.tutObj.textContent = st.obj;
    this.el.tutKeys.textContent = st.keys;
    this.el.tutTip.textContent = st.tip;
    this.el.tutDots.innerHTML = Array.from({ length: n }, (_, k) => `<i class="${k < i ? 'on' : ''}"></i>`).join('');
  }
  tutorialStepDone() { this.flashScreen('#ffd24a', 0.08); }
  completeTutorial() { this.hideTutorial(); }
  hideTutorial() { if (this.el.tut) this.el.tut.style.display = 'none'; }
  overlayOpen() { return this.optionsEl.style.display === 'flex' || this.howtoEl.style.display === 'flex'; }
  closeOverlays() { this.optionsEl.style.display = 'none'; this.howtoEl.style.display = 'none'; }

  showOptions() {
    const S = SETTINGS;
    const slider = (key, label, max, step) => `<div class="orow"><span class="ol">${label}</span><input type="range" data-k="${key}" min="0" max="${max}" step="${step}" value="${S[key]}"><span class="ov" data-v="${key}">${Math.round(S[key] * 100)}%</span></div>`;
    const toggle = (key, label) => `<div class="orow"><span class="ol">${label}</span><div class="chips3"><span class="c3${S[key] ? ' on' : ''}" data-t="${key}" data-on="1">ON</span><span class="c3${!S[key] ? ' on' : ''}" data-t="${key}" data-on="0">OFF</span></div></div>`;
    this.optionsEl.innerHTML = `<div class="obox">
      <div class="oh">Options</div>
      ${slider('master', 'Master Volume', 1, 0.05)}
      ${slider('voice', 'Voice · Battle Cries', 1, 0.05)}
      ${slider('shake', 'Screen Shake', 1.5, 0.05)}
      ${toggle('dmgNumbers', 'Damage Numbers')}
      ${toggle('hints', 'Controls Hint Panel')}
      <div class="orow"><span class="ol">Render Quality</span><div class="chips3">
        ${[['auto', 'AUTO'], ['2', 'HIGH'], ['1', 'BALANCED'], ['0', 'LOW']].map(([v, n]) => `<span class="c3${String(S.quality) === v ? ' on' : ''}" data-q="${v}">${n}</span>`).join('')}
      </div></div>
      <button class="odone">Done</button>
    </div>`;
    const apply = () => { applySettings(this.game); saveSettings(); };
    this.optionsEl.querySelectorAll('input[type=range]').forEach(r => r.oninput = () => {
      S[r.dataset.k] = parseFloat(r.value);
      this.optionsEl.querySelector(`[data-v="${r.dataset.k}"]`).textContent = Math.round(S[r.dataset.k] * 100) + '%';
      apply();
      if (r.dataset.k === 'master' || r.dataset.k === 'voice') this.game.audio.zap(700);   // audible feedback
    });
    this.optionsEl.querySelectorAll('[data-t]').forEach(c => c.onclick = () => { S[c.dataset.t] = c.dataset.on === '1'; apply(); this.showOptions(); });
    this.optionsEl.querySelectorAll('[data-q]').forEach(c => c.onclick = () => { S.quality = c.dataset.q === 'auto' ? 'auto' : c.dataset.q; apply(); this.showOptions(); });
    this.optionsEl.querySelector('.odone').onclick = () => { apply(); this.optionsEl.style.display = 'none'; };
    this.optionsEl.style.display = 'flex';
  }

  showHowto() {
    this.howtoEl.innerHTML = `<div class="obox">
      <div class="oh">How to Play</div>
      <div class="hsec"><div class="ht">Move & Aim</div><div class="hb"><b>WASD</b> move · <b>Mouse</b> aims everything · hover a foe to target them · <b>Click</b> a foe = hard lock (<b>T</b> clears) · <b>SHIFT</b> dash · <b>2×TAP</b> a direction = your evade</div></div>
      <div class="hsec"><div class="ht">Powers</div><div class="hb"><b>LMB / RMB / Q / E / H</b> fire your powers · <b>R</b> is your ULTIMATE · many powers <em>charge</em> — hold to grow them, release to fire · everything spends <em>KI</em>: run dry and you fizzle, so watch the blue bar</div></div>
      <div class="hsec"><div class="ht">The Melee Triangle</div><div class="hb"><b>V</b> strike (tap = jab combo · <em>hold</em> = HAYMAKER) · <b>G</b> grab · <b>C / Mouse4</b> guard — <em>Strike beats Grab · Grab beats Guard · Guard beats Strike</em> · a HAYMAKER crushes a guard wide open · back-grabs can't be escaped</div></div>
      <div class="hsec"><div class="ht">Flight</div><div class="hb"><b>F</b> toggles flight on/off · hold <b>SPACE</b> to rise · release to hover · <b>Z</b> to descend and land · not everyone flies the same — some heroes only leap, some wobble, some cruise</div></div>
      <div class="hsec"><div class="ht">Gadgets & The Meter</div><div class="hb"><b>X</b> uses your carried gadget (beacon, medkit, flashbang…) · low ki opens <em>OVERDRIVE</em> — your fists refill the tank · leveling up climbs <em>TIERS</em>: your aura and your meter literally grow</div></div>
      <div class="hsec"><div class="ht">Swapping & The Rest</div><div class="hb"><b>MOUSE WHEEL</b> or <b>1–0</b> swap hero mid-match · <b>TAB</b> roster · <b>B</b> spawns a rival · <b>ESC</b> pause · <b>M</b> mute · 🎮 pad: sticks move/aim · R2/L2 powers · ▢ ○ melee · L1 guard · ✕ fly</div></div>
      <div class="hsec"><div class="ht">The Golden Rule</div><div class="hb">The LeFevre threat scale is real — a Street-tier human <em>should</em> lose to a Cosmic superweapon. Lopsided is honest. Pick your fights, or forge your own weapon in <b>ORIGIN</b>.</div></div>
      <button class="odone" id="howtoTut">🎓 Play the Tutorial — learn by doing</button>
      <button class="odone oghost">Got It — Let's Fight</button>
    </div>`;
    const seen = () => { try { localStorage.setItem('threshold_howto_seen', '1'); } catch {} this.howtoEl.style.display = 'none'; };
    this.howtoEl.querySelector('.oghost').onclick = seen;
    this.howtoEl.querySelector('#howtoTut').onclick = () => { seen(); this.onTutorial && this.onTutorial(); };
    this.howtoEl.style.display = 'flex';
  }

  // ---- combat UI: radar, hit direction, KO banner ----
  updateRadar(g) {
    const ctx = this._radarCtx; if (!ctx || this.el.radar.style.display === 'none') return;
    const now = performance.now();                                   // ~25 Hz is plenty for a minimap
    if (this._radarLast && now - this._radarLast < 40) return;
    this._radarLast = now;
    const W = 152, R = W / 2, cx = R, cy = R, A = (g.world && g.world.ARENA) || 175, sc = (R - 9) / A;
    const toXY = (wx, wz) => [cx + wx * sc, cy + wz * sc];
    ctx.clearRect(0, 0, W, W);
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R - 3, 0, TAU); ctx.clip();
    ctx.fillStyle = 'rgba(16,20,30,.82)'; ctx.fillRect(0, 0, W, W);
    // cover blocks
    ctx.fillStyle = 'rgba(120,132,155,.55)';
    for (const c of (g.world && g.world.cover) || []) { const [x, y] = toXY(c.x, c.z); const w = (c.hx ?? c.r) * sc, h = (c.hz ?? c.r) * sc; ctx.fillRect(x - w, y - h, Math.max(2, w * 2), Math.max(2, h * 2)); }
    const P = g.player;
    // player vision wedge
    if (P) {
      const [px, py] = toXY(P.pos.x, P.pos.z), aang = Math.atan2(P.aim.z, P.aim.x);
      if (g.fov) { ctx.fillStyle = 'rgba(245,178,26,.14)'; ctx.beginPath(); ctx.moveTo(px, py); ctx.arc(px, py, 34, aang - 0.62, aang + 0.62); ctx.closePath(); ctx.fill(); }
    }
    // enemies: solid red if seen, faded "?" at last-known if not
    for (const e of g.entities) {
      if (e === P || !e.def || e.isDummy || !e.alive) continue;
      const vis = g.fov ? (e._vis || 0) : 1;
      if (vis > 0.4) { const [ex, ey] = toXY(e.pos.x, e.pos.z); ctx.fillStyle = '#ff5a4a'; ctx.beginPath(); ctx.arc(ex, ey, 3.4, 0, TAU); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 1; ctx.stroke(); }
      else if (e._lastKnown) { const [lx, ly] = toXY(e._lastKnown.x, e._lastKnown.z); ctx.fillStyle = 'rgba(255,90,74,.6)'; ctx.font = 'bold 11px Inter,sans-serif'; ctx.fillText('?', lx - 3, ly + 4); }
    }
    // deployed beacon — gold diamond so she always knows where home is
    if (P && P.items) for (const it of P.items) if (it.state === 'deployed' && it.pos) {
      const [bx, by] = toXY(it.pos.x, it.pos.z);
      ctx.save(); ctx.translate(bx, by); ctx.rotate(Math.PI / 4);
      ctx.fillStyle = P.def.colors.accent; ctx.fillRect(-3, -3, 6, 6);
      ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.lineWidth = 1; ctx.strokeRect(-3, -3, 6, 6); ctx.restore();
    }
    // player marker + facing tick
    if (P) { const [px, py] = toXY(P.pos.x, P.pos.z); ctx.strokeStyle = 'rgba(255,210,74,.9)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + P.aim.x * 13, py + P.aim.z * 13); ctx.stroke(); ctx.fillStyle = '#ffd24a'; ctx.beginPath(); ctx.arc(px, py, 3.8, 0, TAU); ctx.fill(); ctx.strokeStyle = '#160d02'; ctx.lineWidth = 1.2; ctx.stroke(); }
    ctx.restore();
    ctx.strokeStyle = 'rgba(245,178,26,.32)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(cx, cy, R - 3, 0, TAU); ctx.stroke();
  }

  // red glow at the screen edge in the direction damage came from
  hitDirection(worldPos) {
    if (!this.game.world) return;
    const sp = this.game.world.screenPosOf(worldPos.x, (worldPos.y || 0) + 4, worldPos.z);
    const cxp = innerWidth / 2, cyp = innerHeight / 2;
    let ang = Math.atan2((sp.y || cyp) - cyp, (sp.x || cxp) - cxp);
    if (sp.behind) ang += Math.PI;                       // source behind camera → opposite edge
    const rad = Math.min(innerWidth, innerHeight) * 0.5;
    const el = document.createElement('div'); el.className = 'hitarc';
    el.style.left = (cxp + Math.cos(ang) * rad) + 'px';
    el.style.top = (cyp + Math.sin(ang) * rad) + 'px';
    this.el.hits.appendChild(el);
    requestAnimationFrame(() => { el.style.opacity = '0'; });
    setTimeout(() => el.remove(), 600);
    while (this.el.hits.children.length > 6) this.el.hits.firstChild.remove();
  }

  showKO(text = 'K.O.', sub = '', color = '#fff') {
    this.el.koT.textContent = text; this.el.koT.style.color = color; this.el.koS.textContent = sub;
    this.el.ko.style.opacity = '1'; this.el.ko.style.transform = 'translateX(-50%) scale(1)';
    clearTimeout(this._koT1); clearTimeout(this._koT2);
    this._koT1 = setTimeout(() => { this.el.ko.style.transform = 'translateX(-50%) scale(1.09)'; }, 480);
    this._koT2 = setTimeout(() => { this.el.ko.style.opacity = '0'; }, 1350);
  }
  setCombatUI(on) { this.el.radar.style.display = on ? 'block' : 'none'; }

  // ---- energy feedback ----
  kiWarn() {                                            // ki ran dry mid-ability — flash the bar
    this.el.kiBar.classList.add('kiflash');
    clearTimeout(this._kiT); this._kiT = setTimeout(() => this.el.kiBar.classList.remove('kiflash'), 650);
  }
  kiDenied(key) {                                       // pressed something you can't afford
    this.kiWarn();
    const se = this.slotEls?.[key];
    if (se) { se.root.classList.remove('deny'); void se.root.offsetWidth; se.root.classList.add('deny'); }
  }
  overdriveFlash() {                                    // a fist just converted into ki
    this.el.kiBar.style.boxShadow = '0 0 18px rgba(127,230,255,.95)';
    clearTimeout(this._odT); this._odT = setTimeout(() => { this.el.kiBar.style.boxShadow = ''; }, 350);
  }

  announce(text, sub = '', color = '#ffd24a') {
    this.el.annT.textContent = text; this.el.annT.style.color = color; this.el.annS.textContent = sub;
    this.el.ann.style.opacity = '1'; this.el.ann.style.transform = 'translateX(-50%) scale(1.12)';
    clearTimeout(this._annT1); clearTimeout(this._annT2);
    this._annT1 = setTimeout(() => { this.el.ann.style.transform = 'translateX(-50%) scale(1)'; }, 110);
    this._annT2 = setTimeout(() => { this.el.ann.style.opacity = '0'; }, 1800);
    try { this.game.audio.zap(760); this.game.audio.blast(220, 0.12); } catch (e) {}
  }
  scorePopup(worldPos, amount) { this.damageNumber({ x: worldPos.x, y: worldPos.y + 4, z: worldPos.z }, '+' + amount, '#ffe08a', true); }

  updateModeBar(g) {
    const el = this.el.mode; if (!g.mode) { el.style.display = 'none'; return; }
    const h = g.mode.hud(g);
    if (h.type === 'training') { el.style.display = 'none'; return; }
    el.style.display = 'flex';
    let html = '';
    if (h.type === 'duel') html = `<div class="seg"><div class="mv" style="color:#8fe08a">${h.a}</div><div class="ml">${h.aName}</div></div><div class="vs">${h.a}–${h.b} · first to ${h.target}</div><div class="seg"><div class="mv" style="color:#ff6a5a">${h.b}</div><div class="ml">${h.bName}</div></div>`;
    else if (h.type === 'survival') html = `<div class="seg"><div class="mv" style="color:#ffb03a">${h.wave}</div><div class="ml">Wave</div></div><div class="seg"><div class="mv">${h.score}</div><div class="ml">Score</div></div><div class="seg"><div class="mv" style="color:#ff6a5a">${'♥'.repeat(h.lives) || '—'}</div><div class="ml">Lives</div></div>`;
    else if (h.type === 'rumble') html = `<div class="seg"><div class="mv" style="color:#7fe6ff">${h.frags}</div><div class="ml">Frags / ${h.target}</div></div><div class="seg"><div class="mv">${h.timer}</div><div class="ml">Seconds</div></div>`;
    if (html !== this._modeHtml) { this._modeHtml = html; el.innerHTML = html; }   // dirty-check — no per-frame DOM rebuild
  }

  updateKitWidget(p) {
    const el = this.el.kit; if (!p) { el.style.display = 'none'; return; }
    const chips = []; const d = p.def, acc = d.colors.accent;
    if (p.buffT > 0 && p.buffName) chips.push({ t: p.buffName + ' ' + Math.ceil(p.buffT) + 's', on: true });
    if (p.invuln > 0.15) chips.push({ t: 'INVINCIBLE', on: true });
    if (p.phase) chips.push({ t: 'INTANGIBLE', on: true });
    if (p.frozenT > 0) chips.push({ t: '❄ FROZEN', on: true });
    const bowA = Object.values(d.abilities).find(a => a.type === 'bow');
    if (bowA) { const pls = bowA.payloads || ['explosive', 'flame', 'poison']; chips.push({ t: '➶ ' + pls[p._quiverIdx % pls.length].toUpperCase(), on: true }); }
    if (d.guardType === 'deflect') chips.push({ t: 'DEFLECT GUARD', on: p.guarding });
    if (d.guardType === 'barrier') chips.push({ t: 'BARRIER GUARD', on: p.guarding });
    for (const it of p.items || []) {
      const label = it.def.kind === 'beacon'
        ? (it.state === 'ready' ? 'X TO PLANT' : it.state === 'deployed' ? 'X TO RECALL' : 'RECHARGING ' + Math.ceil(it.cd) + 's')
        : (it.state === 'ready' ? 'X · ×' + (it.charges ?? it.def.charges ?? 1) : it.state === 'spent' ? 'SPENT' : 'CD ' + Math.ceil(it.cd) + 's');
      chips.push({ t: '◈ ' + (it.def.name || it.def.kind).toUpperCase() + ' — ' + label, on: it.state === 'deployed' });
    }
    if (p._shieldHp > 0) chips.push({ t: '🛡 SHIELD ' + Math.round(p._shieldHp), on: true });
    if (p._jetT > 0) chips.push({ t: '🔥 JETS ' + Math.ceil(p._jetT) + 's', on: true });
    if (p._revealT > 0) chips.push({ t: '👁 THE RING SEES ' + Math.ceil(p._revealT) + 's', on: true });
    const mine = this.game.minions.filter(m => m.owner === p).length; const maxD = Math.max(...Object.values(d.abilities).map(a => a.type === 'summon' ? (a.max || 6) : 0), 0);
    if (maxD) chips.push({ t: '◈ DRONES ' + mine + '/' + maxD, on: mine > 0 });
    const cons = this.game.constructs.filter(c => c.owner === p);
    if (Object.values(d.abilities).some(a => a.type === 'construct')) chips.push({ t: cons.length ? 'CONSTRUCT: ' + cons[0].kind.toUpperCase() : 'CONSTRUCTS', on: cons.length > 0 });
    if (d.beamMight >= 1.2) chips.push({ t: 'BEAM MASTER', on: false });
    if (d.grabHeal) chips.push({ t: 'ABSORB', on: false });
    if (d.thorns) chips.push({ t: 'THORNS', on: false });
    if (!chips.length) { el.style.display = 'none'; return; }
    el.style.display = 'block';
    const html = chips.map(c => `<span class="chip${c.on ? ' on' : ''}" style="${c.on ? `background:${acc}22;border-color:${acc}88;color:${acc}` : ''}">${c.t}</span>`).join('');
    if (html !== this._kitHtml) { this._kitHtml = html; this.el.kitChips.innerHTML = html; }   // dirty-check
  }

  showEndScreen(result, g) {
    const p = g.player;
    const stats = [['Score', p.score], ['KOs', p.kills], ['Level', p.level]];
    if (result.wave != null) stats.unshift(['Wave', result.wave]);
    this.el.end.innerHTML = `
      <div class="et" style="color:${result.win ? '#8fe08a' : '#ff6a5a'}">${result.title}</div>
      <div class="el">${(result.lines || []).join('<br/>')}</div>
      <div class="stats">${stats.map(s => `<div class="stat"><div class="sv">${s[1]}</div><div class="sl">${s[0]}</div></div>`).join('')}</div>
      <div class="btns"><button id="eRematch">Rematch</button><button class="ghost" id="eMenu">Main Menu</button></div>`;
    this.el.end.style.display = 'flex';
    this.el.end.querySelector('#eRematch').onclick = () => { this.hideEndScreen(); if (this.onRematch) this.onRematch(); };
    this.el.end.querySelector('#eMenu').onclick = () => { this.hideEndScreen(); if (this.onMenu) this.onMenu(); };
  }
  hideEndScreen() { this.el.end.style.display = 'none'; }

  flashScreen(color = '#ffffff', dur = 0.15) {
    const el = this.el.flash; if (!el) return;
    el.style.transition = 'none'; el.style.background = color; el.style.opacity = '0.5';
    requestAnimationFrame(() => { el.style.transition = `opacity ${dur}s ease-out`; el.style.opacity = '0'; });
  }

  // floating combat number at a world position. slash=true kicks OUTWARD-DOWN (offense reads
  // differently from the defensive popups, which float up).
  damageNumber(worldPos, text, color = '#fff', tag = false, slash = false) {
    if (this.dmgNumbersOff) return;
    if (!this.game.world) return;
    const sp = this.game.world.screenPosOf(worldPos.x, worldPos.y + 7, worldPos.z);
    if (sp.behind) return;
    const el = document.createElement('div'); el.className = 'dmg'; el.textContent = text;
    el.style.color = color; el.style.left = sp.x + 'px'; el.style.top = sp.y + 'px';
    const num = +text || parseInt(String(text).replace(/[^0-9]/g, ''), 10) || 0;   // "SLAM 18" sizes by the 18
    el.style.fontSize = (tag ? 16 : Math.min(38, 18 + num * 0.45)) + 'px';
    if (slash) { el.style.fontStyle = 'italic'; el.style.textShadow = '0 2px 5px rgba(0,0,0,.85), 0 0 12px rgba(255,90,74,.7)'; }
    this.el.dmg.appendChild(el);
    const dx = slash ? (36 + Math.random() * 26) * (Math.random() < 0.5 ? -1 : 1) : (Math.random() * 2 - 1) * 32;
    const dy = slash ? 30 : -46;
    const t0 = performance.now();
    const anim = (now) => { const k = (now - t0) / 720; if (k >= 1) { el.remove(); return; } el.style.transform = `translate(-50%,-50%) translate(${dx * k}px, ${dy * k}px)${slash ? ' rotate(-8deg)' : ''}`; el.style.opacity = String(1 - k * k); requestAnimationFrame(anim); };
    requestAnimationFrame(anim);
    while (this.el.dmg.children.length > 48) this.el.dmg.firstChild.remove();
  }

  // ---- Danger Room: live DPS meters floating over training dummies ----
  updateDpsMeters(g) {
    const on = g.modeId === 'training' && g.running;
    this._dpsEls = this._dpsEls || {};
    if (!on) { for (const id in this._dpsEls) { this._dpsEls[id].remove(); delete this._dpsEls[id]; } return; }
    for (const e of g.entities) {
      if (!e.isDummy) continue;
      let el = this._dpsEls[e.id];
      if (!el) {
        el = document.createElement('div'); el.className = 'dmg'; el.style.fontSize = '12px'; el.style.color = '#7fe6ff';
        el.style.textAlign = 'center'; this.el.dmg.appendChild(el); this._dpsEls[e.id] = el;
      }
      const log = e._dmgLog || [];
      while (log.length && log[0].t < g.time - 3) log.shift();
      const dps = log.reduce((s, x) => s + x.a, 0) / 3;
      const sp = g.world.screenPosOf(e.pos.x, e.pos.y + 16, e.pos.z);
      el.style.left = sp.x + 'px'; el.style.top = sp.y + 'px';
      el.style.transform = 'translate(-50%,-50%)';
      el.style.display = sp.behind ? 'none' : 'block';
      el.textContent = dps > 0.5 ? `DPS ${dps.toFixed(0)} · Σ ${Math.round(e._dmgTotal || 0)}` : (e._dmgTotal ? `Σ ${Math.round(e._dmgTotal)}` : 'DPS —');
    }
  }

  combo(n) {
    const c = this.el.combo;
    if (n >= 2) { this.el.comboN.textContent = n; c.style.opacity = '1'; c.style.transform = 'translateX(-50%) scale(1.15)'; clearTimeout(this._ct); this._ct = setTimeout(() => { c.style.transform = 'translateX(-50%) scale(1)'; }, 90); }
    else c.style.opacity = '0';
  }

  setPaused(on) { this.el.paused.style.display = on ? 'flex' : 'none'; }

  buildSlots(def) {
    this.el.slots.innerHTML = '';
    this.slotEls = {};
    for (const { k, label } of SLOT_ORDER) {
      const a = def.abilities[k]; if (!a) continue;
      const d = document.createElement('div');
      d.className = 'slot' + (k === 'r' ? ' ult' : '');
      d.innerHTML = `<div class="key">${label}</div><div class="cost">${a.cost ? a.cost : a.kiPerSec ? a.kiPerSec + '/s' : ''}</div><div class="an">${a.name}</div><div class="cd" style="height:0%"></div>`;
      this.el.slots.appendChild(d);
      this.slotEls[k] = { root: d, cd: d.querySelector('.cd'), cost: d.querySelector('.cost') };
    }
  }

  setPlayer(def) {
    this.el.name.textContent = def.name;
    this.el.role.textContent = def.title + ' · ' + def.role;
    this.buildSlots(def);
  }

  feed(text, color = '#ffd24a') {
    const d = document.createElement('div'); d.textContent = text; d.style.color = color;
    this.el.feed.prepend(d); this.feedLines.push(d);
    setTimeout(() => { d.style.transition = 'opacity .5s'; d.style.opacity = '0'; setTimeout(() => d.remove(), 500); }, 2600);
    while (this.el.feed.children.length > 5) this.el.feed.lastChild.remove();
  }

  update() {
    const g = this.game, p = g.player; if (!p) return;
    this.el.hp.style.width = clamp(p.hp / p.maxHp * 100, 0, 100) + '%';
    this.el.ki.style.width = clamp(p.ki / p.maxKi * 100, 0, 100) + '%';
    // energy readability: amber when low, red pulse when critical, DRAINED tag after an all-in fizzle
    const kiFrac = p.ki / p.maxKi, drained = p.drainedT > 0;
    if (p.energyInfinite) {   // android core — the tank literally cannot move
      this.el.ki.classList.remove('crit', 'low'); this.el.kiState.classList.remove('on'); this.el.kiOver.classList.remove('on');
      if (this._infML !== p.id) { this._infML = p.id; this.el.kiState.textContent = '∞ CORE'; this.el.kiState.classList.add('on'); this.el.kiState.style.color = '#7fe6ff'; }
    } else {
      if (this._infML) { this._infML = 0; this.el.kiState.textContent = 'DRAINED'; this.el.kiState.style.color = ''; }
      this.el.ki.classList.toggle('crit', drained || kiFrac < 0.15);
      this.el.ki.classList.toggle('low', !drained && kiFrac >= 0.15 && kiFrac < 0.38);
      this.el.kiState.classList.toggle('on', drained);
      // OVERDRIVE window: low tank + a real overdrive attribute → your fists are batteries right now
      this.el.kiOver.classList.toggle('on', !drained && (p.def.overdrive ?? 1) >= 0.7 && kiFrac < 0.25);
    }
    this.el.gd.style.width = clamp(p.guardMeter * 100, 0, 100) + '%';
    this.el.gd.classList.toggle('stagger', p.staggerT > 0);
    this.el.lvl.textContent = p.level;
    this.el.xp.style.width = clamp(p.level >= 10 ? 100 : p.xp / p.xpNext * 100, 0, 100) + '%';
    // power tier: badge changes + the whole meter panel physically WIDENS — a tier-3 bar is visibly bigger than tier-1
    if (this._tier !== p.tier) {
      this._tier = p.tier;
      this.el.tier.textContent = p.tier >= 4 ? 'MAX TIER' : 'TIER ' + ['', 'I', 'II', 'III'][p.tier];
      this.el.tier.className = 'tierb' + (p.tier > 1 ? ' t' + p.tier : '');
      this.el.plPanel.style.minWidth = (240 + (p.tier - 1) * 44) + 'px';
    }

    // ability cooldowns / states
    let charging = 0, maxCharge = 1;
    for (const { k } of SLOT_ORDER) {
      const se = this.slotEls?.[k]; if (!se) continue; const st = p.slots[k]; const def = st.def;
      const cdPct = def.cd ? clamp(st.cd / def.cd, 0, 1) * 100 : 0;
      se.cd.style.height = cdPct + '%';
      const broke = !!(def.cost && p.ki < def.cost);
      const dim = broke || st.cd > 0.01;
      se.root.classList.toggle('dim', !!dim);
      if (se.cost) se.cost.classList.toggle('nope', broke);   // cost turns red when unaffordable
      se.root.classList.toggle('on', !!(st.charging || st.active));
      if (st.charging) { charging = st.chargeT; maxCharge = def.maxCharge || 1.6; }
      if (st.active && st.active.charge01 != null) { charging = st.active.charge01; maxCharge = 1; }
    }
    if (charging > 0) { this.el.charge.style.display = 'block'; this.el.chargeI.style.width = clamp(charging / maxCharge * 100, 0, 100) + '%'; }
    else this.el.charge.style.display = 'none';

    // target health bar — the foe you're locked on / aiming at, only while visible
    let foe = null;
    if (g.hardLock && g.hardLock.alive && (!g.fov || (g.hardLock._vis || 1) > 0.35)) foe = g.hardLock;
    else if (g.lockTarget && g.lockTarget.alive) foe = g.lockTarget;
    if (foe && !foe.isDummy) {
      this.el.foe.style.display = 'block';
      this.el.foeName.textContent = foe.name + '  ·  Lv' + foe.level + '  ·  ' + (foe.def.title || '');
      this.el.foeHp.style.width = clamp(foe.hp / foe.maxHp * 100, 0, 100) + '%';
    } else this.el.foe.style.display = 'none';
    this.updateModeBar(g);
    this.updateKitWidget(p);
    this.updateDpsMeters(g);
    // radar (hidden at the title / while paused) + low-HP danger pulse
    const inMatch = !!(g.mode && g.running);
    this.el.radar.style.display = inMatch ? 'block' : 'none';
    this.updateRadar(g);
    const hpFrac = p.hp / p.maxHp;
    this.el.danger.style.opacity = (inMatch && p.alive && hpFrac < 0.28) ? String(clamp(0.32 + Math.sin(performance.now() * 0.006) * 0.3, 0, 0.8)) : '0';
  }

  // ---------- Title / select ----------
  buildTitle(onStart) {
    let selMode = 'duel', selP1 = ROSTER[0], selP2 = ROSTER[2], two = false;
    this.title.innerHTML = `
      <div class="topbar"><button id="tTut">🎓 Tutorial</button><button id="tOpt">⚙ Options</button><button id="tHow">❓ How to Play</button></div>
      <div class="tag">Machine King Labs · Living Superweapon</div>
      <h1>LIVING SUPERWEAPON</h1>
      <div class="modes" id="modes"></div>
      <div class="selwrap">
        <div class="preview" id="pv"></div>
        <div style="flex:1; display:flex; flex-direction:column; gap:12px;">
          <div class="ptabs" id="ptabs"></div>
          <div class="filters" id="filters"></div>
          <div class="roster" id="roster"></div>
          <button class="startbtn" id="startBtn">ENTER THE ARENA ▶</button>
          <div class="modehint" id="modehint"></div>
        </div>
      </div>`;
    const modesEl = this.title.querySelector('#modes'), roster = this.title.querySelector('#roster'), pv = this.title.querySelector('#pv'), ptabs = this.title.querySelector('#ptabs'), hintEl = this.title.querySelector('#modehint');
    const bar = (label, v, col, tip, ic) => `<div class="statrow"${tip ? ` title="${tip}"` : ''}><span class="sl">${ic ? icon(ic, 11) + ' ' : ''}${label}</span><span class="sb"><i style="width:${v * 10}%;background:${col}"></i></span><span class="sv">${v}</span></div>`;
    const renderPv = (c) => {
      const st = heroStats(c);
      pv.style.setProperty('--pc', c.colors.accent);
      const tc = THREAT_COLORS[c.threat] || '#a49c8c';
      const idn = identityOf(c);
      const facts = kitFacts(c);
      pv.innerHTML = `<div class="pvflip"><span id="pvPrev" title="Previous weapon (←)">‹</span><span id="pvNext" title="Next weapon (→)">›</span></div>
        <div class="pvname" style="color:${c.colors.accent}">${c.name}</div>
        <div class="pvttl">${c.title} · ${c.role}</div>
        <div class="pvident">
          <span title="${ICON_MEANING.person}">${icon('person', 12)} ${idn.n}</span>
          <span title="${ICON_MEANING.pin}">${icon('pin', 12)} ${idn.c} · ${idn.co} ${idn.f}</span>
        </div>
        <div class="pvblurb">${c.blurb}</div>
        <div class="glance">${facts.map(([ic, t, lead]) => `<span${lead ? ' class="lead"' : ''}>${icon(ic, 11)} ${t}</span>`).join('')}</div>
        ${c.threat ? `<div class="pvthreat" title="The LeFevre Threat Scale — the Treaty's official danger rating, Low → Extreme. Mixed matches are SUPPOSED to be lopsided; skill steals rounds, not physics." style="color:${tc};border-color:${tc}66;background:${tc}18">${icon('threat', 11)} LeFevre Threat · ${c.threat}</div>` : ''}
        <div class="pvstats" title="Hover any bar for what it means">
          ${bar('Power', st.power, '#ff6a4a', 'Heaviest single hit in the kit', 'power')}${bar('Strength', st.strength, '#e8a24a', 'Physical muscle — melee damage up, knockback given & resisted, faster ice break-outs', 'strength')}${bar('Range', st.range, '#ffd24a', 'How far the kit reaches', 'range')}${bar('Mobility', st.mobility, '#7fe6ff', 'Run speed + dashes + teleports', 'mobility')}
          ${bar('Defense', st.defense, '#8fe08a', 'How hard this hero is to put down — HP, phasing, thorns', 'defense')}${bar('Health', st.health, '#ff8a5a', 'Raw hit points', 'health')}${bar('Energy', st.energy, '#7fb0ff', 'Ki pool — every power spends it; run dry and you fizzle', 'energy')}
        </div>
        ${st.tags.length ? `<div class="pvtags">${st.tags.map(t => `<span>${t}</span>`).join('')}</div>` : ''}
        ${(() => {
          const at = deriveAttrs(c), tl = heroTalents(c);
          const rows = ATTR_DEFS.map(a => { const v = at[a.k], rc = rankColor(v); return `<div class="arow" title="${a.name} — ${a.does}. Rank ${v}/10 on the ladder (Civilian → Cosmic)."><span class="an2">${icon(ATTR_ICON[a.k], 11)} ${a.name}</span><span class="abar"><i style="width:${v * 10}%;background:${rc}"></i></span><span class="av">${v}</span><span class="arank" style="color:${rc};border-color:${rc}55;background:${rc}14">${rankName(v)}</span></div>`; }).join('');
          const ladder = `<div class="ladder" title="The rank ladder — every attribute sits on this one scale. Colors = rank tier.">${RANKS.slice(1).map((r, i) => `<i style="background:${r.c}" title="${i + 1} — ${r.n}"></i>`).join('')}<span>Civilian → Cosmic</span></div>`;
          const tals = tl.map(k => { const t = TALENTS[k]; return t ? `<span><b>${t.name}</b> — ${t.does}</span>` : ''; }).join('');
          const gear = (c.items || []).map(it => `<b>${it.name}</b>${it.charges ? ` ×${it.charges}` : ''}`).join(' · ');
          return `<div class="sheet"><div class="sh">Attributes</div>${ladder}${rows}</div>
            ${tals ? `<div class="sheet"><div class="sh">Talents</div><div class="tals">${tals}</div></div>` : ''}
            ${gear ? `<div class="gear">⛭ Gear: ${gear} <span style="color:#8b8577">(X)</span></div>` : ''}`;
        })()}
        <div class="pvabil">${SLOT_ORDER.filter(s => c.abilities[s.k]).map(s => { const a = c.abilities[s.k]; return `<div class="ab"><b style="color:${c.colors.accent}">${s.label}</b><span class="an">${a.name}</span><span class="ad">${describeAbility(a)}</span></div>`; }).join('')}
        ${c.evade ? `<div class="ab"><b style="color:${c.colors.accent}">2×TAP</b><span class="an">${c.evade.name || 'Evade'}</span><span class="ad">${describeEvade(c.evade)}</span></div>` : ''}
        ${(c.items || []).map(it => `<div class="ab"><b style="color:${c.colors.accent}">X</b><span class="an">${it.name}</span><span class="ad">carried gadget — no ki cost, cooldown only</span></div>`).join('')}</div>`;
      const pp = pv.querySelector('#pvPrev'), pn = pv.querySelector('#pvNext');
      if (pp) pp.onclick = () => flip(-1);
      if (pn) pn.onclick = () => flip(1);
    };
    const renderTabs = () => {
      const allow2 = selMode === 'duel' || selMode === 'rumble';
      if (!allow2) two = false;
      ptabs.innerHTML = `<span class="pt${!two ? ' on' : ''}" data-two="0">1 PLAYER</span>`
        + (allow2 ? `<span class="pt${two ? ' on' : ''}" data-two="1">2 PLAYERS</span>` : '')
        + (two ? `<span class="p2pick" id="p2pick">P2 ▸ <b style="color:${selP2.colors.accent}">${selP2.name}</b> ⟳</span><span style="font-size:11px;color:#8b8577">P1 keyboard+mouse · P2 gamepad</span>` : '');
      ptabs.querySelectorAll('.pt').forEach(el => el.onclick = () => { two = el.dataset.two === '1'; renderTabs(); });
      const p2 = ptabs.querySelector('#p2pick'); if (p2) p2.onclick = () => { selP2 = ROSTER[(ROSTER.indexOf(selP2) + 1) % ROSTER.length]; renderTabs(); };
    };
    const renderModes = () => {
      modesEl.innerHTML = MODES.map(m => `<div class="modecard${m.id === selMode ? ' sel' : ''}" data-m="${m.id}" style="--mc:${m.accent}"><div class="mi">${m.icon}</div><div class="mn" style="color:${m.accent}">${m.name}</div><div class="mt">${m.tag}</div></div>`).join('');
      modesEl.querySelectorAll('.modecard').forEach(el => el.onclick = () => { selMode = el.dataset.m; renderModes(); hintEl.textContent = MODES.find(x => x.id === selMode).desc; renderTabs(); });
      hintEl.textContent = MODES.find(x => x.id === selMode).desc;
    };
    // ---- roster with filters / sort / search (52+ heroes need navigation) ----
    const filtersEl = this.title.querySelector('#filters');
    const fState = this._fState || (this._fState = { threat: 'ALL', flight: 'ANY', custom: false, q: '', sort: 'default' });
    const THREATS = ['ALL', 'Low', 'Moderate', 'High', 'Very High', 'Extreme'];
    const stCache = new Map(); const stOf = (c) => { if (!stCache.has(c.id)) stCache.set(c.id, heroStats(c)); return stCache.get(c.id); };
    const listNow = () => {
      let L = ROSTER.slice();
      if (fState.threat !== 'ALL') L = L.filter(c => c.threat === fState.threat);
      if (fState.flight === 'FLIERS') L = L.filter(c => (c.flightTier ?? 3) > 0);
      if (fState.flight === 'GROUNDED') L = L.filter(c => (c.flightTier ?? 3) === 0);
      if (fState.custom) L = L.filter(c => c.isCustom);
      if (fState.q) { const q = fState.q.toLowerCase(); L = L.filter(c => (c.name + ' ' + (c.title || '') + ' ' + (c.role || '')).toLowerCase().includes(q)); }
      const T = { Low: 0, Moderate: 1, High: 2, 'Very High': 3, Extreme: 4 };
      if (fState.sort === 'name') L.sort((a, b) => a.name.localeCompare(b.name));
      else if (fState.sort === 'threat') L.sort((a, b) => (T[b.threat] ?? -1) - (T[a.threat] ?? -1));
      else if (fState.sort === 'power') L.sort((a, b) => stOf(b).power - stOf(a).power);
      else if (fState.sort === 'hp') L.sort((a, b) => b.hp - a.hp);
      else if (fState.sort === 'spd') L.sort((a, b) => b.speed - a.speed);
      return L;
    };
    let cards = [], list = [];
    const select = (c, cardEl) => {
      selP1 = c;
      roster.querySelectorAll('.rcard').forEach(e => e.classList.remove('sel'));
      if (cardEl) cardEl.classList.add('sel');
      renderPv(c);
    };
    const flip = (d) => {
      if (!list.length) return;
      const i = Math.max(0, list.indexOf(selP1)), n = (i + d + list.length) % list.length;
      select(list[n], cards[n]);
      if (cards[n]) cards[n].scrollIntoView({ block: 'nearest' });
    };
    const mkCard = (c) => {
      const card = document.createElement('div');
      card.className = 'rcard';
      card.style.setProperty('--pc', c.colors.accent);
      const cs = stOf(c), tc = THREAT_COLORS[c.threat] || '#a49c8c';
      card.innerHTML = `<span class="dot"></span><div class="nm">${c.name} <span class="cflag">${identityOf(c).f || ''}</span></div><div class="rl">${c.role}</div><div class="cstat">HP <b>${c.hp}</b> · PWR <b>${cs.power}</b> · <span style="color:${tc}">${c.threat || '—'}</span></div>`
        + (c.isCustom ? `<span class="cchip">CUSTOM</span><span class="cedit" title="Edit in ORIGIN">✎</span>` : '');
      card.onmouseenter = () => renderPv(c);
      card.onclick = () => select(c, card);
      card.ondblclick = () => onStart({ mode: selMode, p1: selP1.id, p2: selP2.id, twoPlayer: two });
      const ed = card.querySelector('.cedit');
      if (ed) ed.onclick = (ev) => { ev.stopPropagation(); this.onEditCustom && this.onEditCustom(c); };
      return card;
    };
    const renderFilters = () => {
      filtersEl.innerHTML = THREATS.map(t => `<span class="fc${fState.threat === t ? ' on' : ''}" data-th="${t}">${t}</span>`).join('')
        + ['ANY', 'FLIERS', 'GROUNDED'].map(fl => `<span class="fc${fState.flight === fl ? ' on' : ''}" data-fl="${fl}">${fl === 'ANY' ? '✈ ANY' : fl}</span>`).join('')
        + `<span class="fc${fState.custom ? ' on' : ''}" data-cu="1">CUSTOM</span>`
        + `<select id="fSort"><option value="default">SORT: ROSTER</option><option value="name">NAME</option><option value="threat">THREAT</option><option value="power">POWER</option><option value="hp">HP</option><option value="spd">SPEED</option></select>`
        + `<input id="fQ" placeholder="Search…" value="${fState.q}"><span class="cnt" id="fCnt"></span>`;
      filtersEl.querySelector('#fSort').value = fState.sort;
      filtersEl.querySelectorAll('[data-th]').forEach(c => c.onclick = () => { fState.threat = c.dataset.th; renderFilters(); renderRoster(); });
      filtersEl.querySelectorAll('[data-fl]').forEach(c => c.onclick = () => { fState.flight = c.dataset.fl; renderFilters(); renderRoster(); });
      filtersEl.querySelector('[data-cu]').onclick = () => { fState.custom = !fState.custom; renderFilters(); renderRoster(); };
      filtersEl.querySelector('#fSort').onchange = (e) => { fState.sort = e.target.value; renderRoster(); };
      const q = filtersEl.querySelector('#fQ'); q.oninput = () => { fState.q = q.value; renderRoster(); };
    };
    const renderRoster = () => {
      list = listNow();
      roster.innerHTML = '';
      cards = list.map(c => { const el = mkCard(c); roster.appendChild(el); return el; });
      // the forge card — ORIGIN entry point
      const forge = document.createElement('div');
      forge.className = 'rcard forge';
      forge.innerHTML = `<div class="fplus">＋</div><div class="nm">FORGE NEW</div><div class="rl">ORIGIN</div><div class="cstat">Point-buy your own superweapon</div>`;
      forge.onclick = () => this.onForge && this.onForge();
      roster.appendChild(forge);
      const cnt = filtersEl.querySelector('#fCnt'); if (cnt) cnt.textContent = list.length + ' / ' + ROSTER.length + ' weapons';
      if (!list.includes(selP1)) selP1 = list[0] || ROSTER[0];
      const idx = list.indexOf(selP1);
      if (idx >= 0) cards[idx].classList.add('sel');
      renderPv(selP1);
    };
    // keyboard: arrows move the highlight, Enter enters the arena
    if (this._titleNavBound) removeEventListener('keydown', this._titleNavBound);
    this._titleNavBound = (e) => {
      if (!this.titleOpen || this.overlayOpen()) return;
      const ae = document.activeElement; if (ae && (ae.tagName === 'INPUT' || ae.tagName === 'SELECT')) return;
      const idx = Math.max(0, list.indexOf(selP1));
      let n = null;
      if (e.code === 'ArrowRight') n = idx + 1; else if (e.code === 'ArrowLeft') n = idx - 1;
      else if (e.code === 'ArrowDown') n = idx + 5; else if (e.code === 'ArrowUp') n = idx - 5;
      else if (e.code === 'Enter') { onStart({ mode: selMode, p1: selP1.id, p2: selP2.id, twoPlayer: two }); return; }
      else return;
      e.preventDefault();
      if (list.length) { n = Math.max(0, Math.min(list.length - 1, n)); select(list[n], cards[n]); cards[n].scrollIntoView({ block: 'nearest' }); }
    };
    addEventListener('keydown', this._titleNavBound);
    // top bar
    this.title.querySelector('#tOpt').onclick = () => this.showOptions();
    this.title.querySelector('#tHow').onclick = () => this.showHowto();
    this.title.querySelector('#tTut').onclick = () => this.onTutorial && this.onTutorial();
    renderFilters(); renderRoster(); renderModes(); renderTabs();
    this.title.querySelector('#startBtn').onclick = () => onStart({ mode: selMode, p1: selP1.id, p2: selP2.id, twoPlayer: two });
  }

  showTitle() { this.titleOpen = true; this.title.style.display = 'flex'; this.title.style.visibility = 'visible'; this.title.style.opacity = '1'; }
  hideTitle() { this.titleOpen = false; this.title.style.opacity = '0'; setTimeout(() => { this.title.style.display = 'none'; }, 250); this.title.style.transition = 'opacity .25s'; }
}
