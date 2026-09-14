import {modularAsset,createModularActor} from './modular-character.js';
import {applyModularRecipe,MODULAR_RECIPES,validateModularRecipe} from './modular-costume.js';
import {readCharacterRecipe,createAuthoredParts} from './character-authoring.js';
import {createSignatureParts} from './modular-signature-parts.js';
import {createTailoring} from './modular-tailoring.js';
import {createImagePlacements} from './modular-image-placements.js';
export async function createModularPresentation(def){
 const c=createModularActor(await modularAsset());let recipe=MODULAR_RECIPES['roster-'+def.id]||MODULAR_RECIPES.base;
 try{const saved=readCharacterRecipe(def.id);if(saved)recipe=validateModularRecipe(saved);}catch(error){console.warn('Saved presentation ignored',error.message);}
 applyModularRecipe(c.meshes,recipe);c.pose('Idle_Loop',0);
 const signature=createSignatureParts(c.actor),tailoring=createTailoring(c.actor),images=createImagePlacements(c.actor),parts=createAuthoredParts(c.actor);
 signature.set(recipe);tailoring.set(recipe);images.set(recipe);if(recipe.authoredAsset)parts.set(recipe.authoredAsset);
 const dispose=c.dispose.bind(c);c.dispose=()=>{signature.dispose();tailoring.dispose();images.dispose();parts.dispose();dispose();};
 c.animate=t=>{c.pose('Idle_Loop',(t/c.clips.get('Idle_Loop').duration)%1);signature.update(t);images.update(t);};return c;
}
