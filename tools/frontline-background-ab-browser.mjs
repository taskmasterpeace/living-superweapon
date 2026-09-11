process.env.LSW_ART_AB_OUT='artifacts/frontline-background-native-ab';
process.env.LSW_ART_AB_SNAPSHOT='frontline-background-study';
process.env.LSW_ART_AB_MODULES='frontline-ground.js,frontline-terrain.js,frontline-layout.js';
await import('./frontline-escarpment-ab-browser.mjs');
