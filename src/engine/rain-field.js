import * as THREE from 'three';

// One camera-local draw, fixed storage. Surface queries use the gameplay
// heightfield and shelter proxies, never scene-graph triangle raycasts.
const COUNT=1400,RADIUS=128,BELOW=55,ABOVE=100;
export class RainField {
  constructor(world){
    this.world=world;this.covers=[];this.seeded=false;
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(COUNT*6),3).setUsage(THREE.DynamicDrawUsage));
    this.mesh=new THREE.LineSegments(geometry,new THREE.LineBasicMaterial({color:'#a8c4d8',transparent:true,opacity:.35,depthWrite:false}));
    this.mesh.name='weather-rain';this.mesh.frustumCulled=false;
  }
  surface(x,z){
    const ground=this.world.heightAt?.(x,z),base=Number.isFinite(ground)?ground:0;
    let height=base;
    for(const c of this.covers){
      if(c.destroyed||c.weatherTransparent)continue;
      if(Math.abs(x-c.x)<=(c.hx??c.r??0)&&Math.abs(z-c.z)<=(c.hz??c.r??0))height=Math.max(height,c.top);
    }
    return height;
  }
  update(dt,rain,wind,windDir){
    const cam=this.world.camera.position,arr=this.mesh.geometry.attributes.position.array;
    if(!Number.isFinite(cam.x+cam.y+cam.z))return;
    this.covers.length=0;
    for(const list of [this.world.cover,this.world.interiors])for(const c of list||[]){
      if(!c.destroyed&&Number.isFinite(c.top)&&Math.abs(c.x-cam.x)<=RADIUS+(c.hx??c.r??0)&&Math.abs(c.z-cam.z)<=RADIUS+(c.hz??c.r??0))this.covers.push(c);
    }
    const step=Math.max(0,Math.min(.1,dt)),fall=(90+rain*120)*step;
    const wx=Math.cos(windDir)*wind*40*step,wz=Math.sin(windDir)*wind*40*step;
    const bottom=cam.y-BELOW,top=cam.y+ABOVE;
    for(let i=0;i<arr.length;i+=6){
      let x=arr[i]+wx,y=arr[i+1]-fall,z=arr[i+2]+wz;
      const outside=!this.seeded||!Number.isFinite(x+y+z)||Math.abs(x-cam.x)>RADIUS||Math.abs(z-cam.z)>RADIUS||y<bottom||y>top;
      if(outside){x=cam.x+(Math.random()*2-1)*RADIUS;z=cam.z+(Math.random()*2-1)*RADIUS;y=bottom+Math.random()*(ABOVE+BELOW);}
      const length=1.2+rain,tx=x-Math.cos(windDir)*wind*40/(90+rain*120)*length,tz=z-Math.sin(windDir)*wind*40/(90+rain*120)*length;
      // Clip the entire short streak above both sampled endpoints on a slope.
      const floor=Math.max(this.surface(x,z),this.surface(tx,tz))+.04;
      if(y<floor)y=floor+Math.random()*Math.max(0,top-floor);
      // Mountains/roofs above the entire volume leave this column empty.
      // Degenerate line rather than underground rain or an unbounded high spawn.
      if(floor>top){arr[i]=arr[i+3]=x;arr[i+1]=arr[i+4]=top;arr[i+2]=arr[i+5]=z;continue;}
      arr[i]=x;arr[i+3]=tx;arr[i+1]=y;arr[i+4]=Math.min(top,y+length);arr[i+2]=z;arr[i+5]=tz;
    }
    this.seeded=true;this.mesh.visible=true;this.mesh.material.opacity=.12+rain*.32;
    this.mesh.geometry.attributes.position.needsUpdate=true;
  }
  dispose(){this.mesh.removeFromParent();this.mesh.geometry.dispose();this.mesh.material.dispose();this.covers.length=0;}
}
