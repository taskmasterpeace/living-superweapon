"""Fault-block sandstone source, sampled at explicit bed/undercut edges.

This is original continuous geometry, with photographed secondary displacement.
The apron and lower shoulders are part of the closed formation, not wall panels.
"""
import math
import numpy as np

def sculpt(v, pixels):
    count=192;theta=np.arange(count)*math.tau/count;phase=v['phase']
    def smooth(a,b,x):
        t=np.clip((x-a)/(b-a),0,1);return t*t*(3-2*t)
    # The wide ledge returns occupy meaningful fractions of the footprint.
    # Upper crown and lower shoulders have different outlines, not a fluted
    # perimeter extruded unchanged through the entire height.
    levels=np.array([0,.035,.085,.105,.17,.20,.255,.278,.365,.39,.475,.505,.59,.63,.72,.76,.845,.875,.95,1.0])
    radii=np.array([1.0,.985,.94,.90,.895,.875,.86,.81,.80,.755,.75,.70,.70,.535,.53,.535,.525,.53,.51,.51])
    # A height slice just above each hard bed captures its undercut and lip.
    heights=sorted(set(np.linspace(0,1,91).tolist()+levels.tolist()+[float(z+.007) for z in levels[2:-1]]))
    rings=[]
    for height in heights:
        # Two major fault blocks shoulder outwards below staggered elevations.
        # Offset each bed angularly only a little: bedding remains horizontal.
        warp=(.010*np.sin(theta*2+phase)+.005*np.sin(theta*5-phase))*float(smooth(.02,.10,height))
        z=np.clip(height+warp,0,1)
        profile=np.interp(z,levels,radii)
        # Six unequal fracture planes, with broad broken corners.
        sector=(theta+phase*.12+math.pi/6)%(math.tau/6)-math.pi/6
        polygon=math.cos(math.pi/6)/np.cos(sector)
        outline=polygon*(1+.055*np.sin(theta*3+phase)+.025*np.sin(theta*7-phase))
        r=profile*outline
        for angle,shoulder,extent,width in [(phase*.4,.47,.13,.74),(phase*.4+2.3,.75,.20,.63),(phase*.4+4.1,.31,.14,.70)]:
            angular=np.arctan2(np.sin(theta-angle),np.cos(theta-angle))
            lobe=np.exp(-(angular/width)**4)
            r+=lobe*extent*(1-smooth(shoulder-.035,shoulder+.012,z))*smooth(.035,.15,z)
        # Bed-local fractures change direction and stop at weak sediment seams.
        # No full-height angular sinusoid cuts the same vertical channel.
        band=np.searchsorted(levels,z,side='right')
        joint=np.maximum(0,np.sin(theta*(11+int(height*7)%3)+band*2.31+phase))**18
        r-=joint*.012*smooth(.02,.12,z)
        # Thin sediment lips interrupt broad block faces without replacing the
        # mass hierarchy with a staircase. Their surviving lengths vary.
        for j,bed in enumerate([.13,.225,.32,.425,.55,.68,.80,.91]):
            surviving=smooth(-.30,.55,np.sin(theta*(2+j%3)+phase+j*1.71))
            r+=np.exp(-((z-bed)/.008)**2)*(.017+.004*(j%3))*surviving
        # Real measured stone relief is sampled along circumferential distance
        # and height; anisotropy does not create tall synthetic vertical flutes.
        u=((theta/math.tau*3.7+phase*.23)%1*(pixels.shape[1]-1)).astype(int)
        w=((z*6.3+phase*.17)%1*(pixels.shape[0]-1)).astype(int)
        r+=(pixels[w,u]-.5)*.026*smooth(.012,.045,z)
        # Apron consists of broad buried fallen-block lobes, with stepped low
        # crowns; this only affects the bottom third, not the upper silhouette.
        for j in range(9):
            angle=j*math.tau/9+phase*.19
            angular=np.arctan2(np.sin(theta-angle),np.cos(theta-angle))
            apron=np.exp(-(angular/(.11+.02*(j%3)))**4)
            h=.08+.022*((j*7+int(phase*10))%6)
            r+=apron*(.045+.018*(j%3))*(1-smooth(h,h+.016,z))*smooth(0,.025,z)
        # The central crown is precisely level. Low and middle rings maintain
        # horizontal bedding; small warp is removed at the top and base.
        # Fault throws offset whole local beds. Broad faces remain horizontal,
        # but their courses stop and restart across narrow fractured seams.
        fault=.070*np.tanh(np.sin(theta*2+phase)*7)+.025*np.tanh(np.sin(theta*3-phase)*8)
        rim_drop=.065+.028*np.sin(theta*3+phase)+.017*np.sin(theta*7-phase)
        zz=height+warp*(1-smooth(.92,1,height))+fault*smooth(.02,.12,height)*(1-smooth(.78,1,height))-rim_drop*smooth(.65,1,height)
        shift=smooth(.28,.40,height)
        x=r*np.cos(theta)*v['stretch'][0]+shift*.105*math.cos(phase)
        y=r*np.sin(theta)*v['stretch'][1]+shift*.105*math.sin(phase)
        rings.append(np.column_stack((x,y,zz)))
    edge=rings[-1]
    # Continuous weathered lip returns to one broad truly landable plane.
    # No duplicate crown lid; all crown rings share the sidewall boundary.
    for j in range(1,9):
        t=1-j/9
        rings.append(np.column_stack((edge[:,0]*t,edge[:,1]*t,1-(1-edge[:,2])*smooth(.40,1,t))))
    vertices=np.concatenate(rings).tolist();faces=[];total=len(rings)
    for k in range(total-1):
        for j in range(count):
            a=k*count+j;b=k*count+(j+1)%count;c=b+count;d=a+count
            faces.extend([(a,b,c),(a,c,d)])
    bottom=len(vertices);vertices.append((0,0,0));top=len(vertices);vertices.append((0,0,1))
    for j in range(count):
        faces.append((bottom,(j+1)%count,j));faces.append((top,(total-1)*count+j,(total-1)*count+(j+1)%count))
    return vertices,faces
