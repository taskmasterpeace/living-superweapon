import {Weather} from './systems.js';

// Suspend the desert owner intact; commands issued in training belong to a
// separate native Weather instance and cannot leak into the operation.
export class TrainingWeatherScope {
  constructor(game) {
    this.g=game;this.saved=game.weather;this.visibility=[];
    this.flash=game.world.weatherFlash;
    const weather=this.saved;
    if(weather){
      const owners=[weather,...weather.layers.values()];
      weather._vortex?.voice?.stop();if(weather._vortex)weather._vortex.voice=null;
      for(const owner of owners){
        for(const mesh of [owner._mesh,owner.group,owner.rainField?.mesh,owner._vortex?.group,owner._lightning?.group,owner.lightning?.group]){
          if(mesh){this.visibility.push([mesh,mesh.visible]);mesh.visible=false;}
        }
        for(const key of ['_rainVoice','_thunderVoice','rainVoice','thunderVoice']){
          owner[key]?.stop();owner[key]=null;
        }
      }
    }
    this.training=new Weather(game);game.weather=this.training;
    game.world.weatherFlash=0;
  }
  close(){
    if(!this.training)return;
    this.training.dispose();this.g.weather=this.saved;
    this.g.world.weatherFlash=this.flash;
    for(const [mesh,visible] of this.visibility)mesh.visible=visible;
    this.visibility.length=0;this.training=null;
  }
}
