"""Offline native bank authoring from licensed measured displacement.

Exports a synchronous quantized delta at the existing native lattice density.
This is source geometry, not shader-only displacement or a late physics swap.
"""
import bpy,numpy as np,os,json,base64,hashlib,math
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT=os.path.join(ROOT,'assets-src','frontline-heightfield-candidate')
with open(os.path.join(OUT,'source.json')) as f:meta=json.load(f)
n=meta['segments']+1;half=meta['halfSpan'];spacing=half*2/(n-1)
before=np.fromfile(os.path.join(OUT,'native-before.f32'),dtype='<f4').reshape(n,n).astype(float)
axis=np.linspace(-half,half,n);x,z=np.meshgrid(axis,axis);radius=np.hypot(x,z)
def smooth(a,b,v):
    t=np.clip((v-a)/(b-a),0,1);return t*t*(3-2*t)
def photo(path):
    image=bpy.data.images.load(os.path.join(ROOT,path));image.colorspace_settings.name='Non-Color'
    return np.array(image.pixels[:],dtype=float).reshape(image.size[1],image.size[0],4)[:,:,0]
rock=photo('assets-src/polyhaven/rock_face/rock_face_disp_2k.jpg')
ground=photo('assets-src/polyhaven/aerial_ground_rock/aerial_ground_rock_disp_2k.jpg')
def sample(image,wx,wz,size,angle=0,offset=(0,0)):
    c=math.cos(angle);s=math.sin(angle)
    u=((wx*c+wz*s)/size+offset[0])%1;v=((-wx*s+wz*c)/size+offset[1])%1
    a=(u*(image.shape[1]-1)).astype(int);b=(v*(image.shape[0]-1)).astype(int)
    return image[b,a]-.5
def distance_polygon(points):
    inside=np.zeros(x.shape,dtype=bool);distance=np.full(x.shape,1e8)
    for j,(ax,az) in enumerate(points):
        bx,bz=points[(j+1)%len(points)];dx=bx-ax;dz=bz-az
        t=np.clip(((x-ax)*dx+(z-az)*dz)/(dx*dx+dz*dz),0,1)
        distance=np.minimum(distance,np.hypot(x-ax-t*dx,z-az-t*dz))
        inside^=((az>z)!=(bz>z))&(x<(bx-ax)*(z-az)/(bz-az+1e-30)+ax)
    return np.where(inside,-distance,distance)

# Unequal, offset exposed shelves. These are composed polygons, not repeated
# concentric terrace rings, and their edges are broken by measured rock relief.
SHELVES=[
 ([(145,-180),(345,-235),(460,-115),(435,30),(290,70),(165,10)],67),
 ([(155,110),(255,58),(380,90),(450,210),(320,267),(145,215)],61),
 ([(170,300),(305,246),(470,300),(470,450),(340,520),(150,450)],83),
 ([(165,575),(290,518),(480,555),(475,720),(310,740),(145,665)],69),
 ([(-150,-205),(-335,-240),(-485,-120),(-440,40),(-285,65),(-155,-25)],75),
 ([(-145,175),(-255,110),(-380,165),(-420,282),(-280,310),(-150,260)],52),
 ([(-155,365),(-285,300),(-465,360),(-430,515),(-290,555),(-150,465)],74),
 ([(-155,635),(-290,560),(-450,610),(-450,770),(-280,805),(-140,730)],66),
]
height=before.copy();rock_mask=np.zeros(x.shape)
for i,(polygon,elevation) in enumerate(SHELVES):
    measured=sample(rock,x,z,94,angle=i*.47,offset=(i*.231,i*.137))
    edge=distance_polygon(polygon)+measured*31
    weight=1-smooth(-18,36,edge)
    # Local plateau variation has geometric scale; image albedo is not used
    # as a fake height map. Edge retreats are deliberately stronger than tops.
    target=elevation+measured*8+sample(ground,x,z,140,angle=i*.19)*2
    height=height*(1-weight)+target*weight;rock_mask=np.maximum(rock_mask,weight)

# Connected drainage trunks and tributaries cut through the authored shelves.
# Two trunk witnesses also preserve the existing native ravine contract.
RAVINES=[([(520,375),(420,340),(320,310),(220,337),(128,350)],22,31),
 ([(500,110),(390,135),(310,178),(210,232),(120,240)],15,25),
 ([(-520,20),(-425,60),(-320,80),(-225,120),(-125,142)],23,32),
 ([(-480,440),(-385,445),(-290,467),(-205,515),(-124,522)],17,27),
 ([(405,480),(350,435),(320,310)],9,18),
 ([(-435,220),(-380,152),(-320,80)],10,18)]
for points,depth,width in RAVINES:
    distance=np.full(x.shape,1e8)
    for (ax,az),(bx,bz) in zip(points[:-1],points[1:]):
        dx=bx-ax;dz=bz-az;t=np.clip(((x-ax)*dx+(z-az)*dz)/(dx*dx+dz*dz),0,1)
        distance=np.minimum(distance,np.hypot(x-ax-t*dx,z-az-t*dz))
    height-=depth*(1-smooth(width*.25,width,distance))*smooth(115,190,np.abs(x))

# Bank-scale photographed joint relief away from the selected broad plateaus.
bank=smooth(140,250,np.abs(x))*(1-smooth(580,850,np.abs(x)))
height+=sample(rock,x,z,73,angle=.68,offset=(.17,.39))*11*bank*(1-rock_mask*.6)

# Offline drainage accumulation: water follows the steepest lower neighbour,
# cutting soft seams instead of adding another analytic sine/noise layer.
for iteration in range(3):
    neighbours=np.stack([np.roll(height,(dr,dc),(0,1)) for dr,dc in [(-1,0),(1,0),(0,-1),(0,1)]])
    choice=np.argmin(neighbours,axis=0);lower=neighbours.min(axis=0)<height-.01
    flow=np.ones(n*n);directions=[n,-n,1,-1]
    for i in np.argsort(height.ravel())[::-1]:
        row=i//n;col=i%n
        if row<1 or row>=n-1 or col<1 or col>=n-1 or not lower.ravel()[i]:continue
        target=i+directions[int(choice.ravel()[i])];flow[target]+=flow[i]
    incision=np.minimum(2.0,np.log2(1+flow.reshape(n,n))*.18)*bank
    height-=incision

# Authoring guard rails are baked, not per-frame clamps. Preserve the existing
# pad, low battle corridor and entire distant seam; bound native cell slopes.
mask=smooth(130,235,radius)*smooth(110,150,np.abs(x))*(1-smooth(930,1010,np.maximum(np.abs(x),np.abs(z))))
height=before+(height-before)*mask
for iteration in range(40):
    neighbours=np.minimum.reduce([np.roll(height,(dr,dc),(0,1)) for dr,dc in [(-1,0),(1,0),(0,-1),(0,1)]])
    height=np.minimum(height,neighbours+spacing*1.30)
    height=before+(height-before)*mask
height=np.maximum(0,height)
delta=np.maximum(np.rint((height-before)*128),np.ceil(-before*128)).astype('<i2');delta[mask==0]=0
data={'segments':n-1,'halfSpan':half,'step':1/128,'encoded':base64.b64encode(delta.tobytes()).decode('ascii'),
 'sources':['Poly Haven CC0 Rock Face: Greg Zaal / Dario Barresi','Poly Haven CC0 Aerial Ground Rock: Rob Tuytel'],
 'baselineSHA256':hashlib.sha256(before.astype('<f4').tobytes()).hexdigest()}
with open(os.path.join(OUT,'relief-delta.json'),'w') as f:json.dump(data,f,separators=(',',':'))
(before+delta/128).astype('<f4').tofile(os.path.join(OUT,'native-after.f32'))
# Source-authored scatter favours broken bank transitions, not a uniform ring.
# Coordinates are baked; runtime only aligns these short chips to heightAt.
rng=np.random.default_rng(7319);places=[];gradient=np.hypot(*np.gradient(height,spacing))
while len(places)<3600:
    px,pz=rng.uniform(-875,875,2)
    if not 142<math.hypot(px,pz)<890:continue
    if -300<px<-160 and 150<pz<550:continue # keep the convoy track readable
    if any(abs(px-c['x'])<c['hx']*.80 and abs(pz-c['z'])<c['hz']*.80 for c in meta['cover']):continue
    col=int(np.clip(round((px+half)/spacing),0,n-1));row=int(np.clip(round((pz+half)/spacing),0,n-1))
    weight=.12+.35*float(height[row,col]>12)+.5*float(.16<gradient[row,col]<1.1)+.2*rock_mask[row,col]
    if rng.random()>weight:continue
    size=.25+rng.random()**2*2.15
    places.append([round(px,4),round(pz,4),round(size,4),round(float(rng.random()*math.tau),5),round(float(.7+rng.random()*.3),4)])
with open(os.path.join(OUT,'chip-placements.json'),'w') as f:json.dump(places,f,separators=(',',':'))
print(json.dumps({'samples':int(delta.size),'changed':int(np.count_nonzero(delta)),'minDelta':float(delta.min()/128),'maxDelta':float(delta.max()/128),'peak':float(height.max())}))
