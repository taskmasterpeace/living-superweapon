"""Source-only broken convoy shoulder with exact native parking stencils."""
import bpy,numpy as np,os,json,math,hashlib
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)));OUT=os.path.join(ROOT,'assets-src/frontline-convoy-bank-study')
old=np.fromfile(os.path.join(ROOT,'assets-src/frontline-escarpment-study/native-bed.f32'),dtype='<f4').reshape(257,257)
with open(os.path.join(OUT,'convoy-parking-witnesses.json')) as f:parking=json.load(f)
axis=np.linspace(-1028,1028,257);x,z=np.meshgrid(axis,axis);step=2056/256
def smooth(a,b,v):
 t=np.clip((v-a)/(b-a),0,1);return t*t*(3-2*t)
def distance(line):
 d=np.full(x.shape,1e8)
 for (ax,az),(bx,bz) in zip(line[:-1],line[1:]):
  dx=bx-ax;dz=bz-az;t=np.clip(((x-ax)*dx+(z-az)*dz)/(dx*dx+dz*dz),0,1);d=np.minimum(d,np.hypot(x-ax-t*dx,z-az-t*dz))
 return d
def sd(points):
 inside=np.zeros(x.shape,dtype=bool);d=np.full(x.shape,1e8)
 for a,b in zip(points,points[1:]+points[:1]):
  d=np.minimum(d,distance([a,b]));ax,az=a;bx,bz=b;inside^=((az>z)!=(bz>z))&(x<(bx-ax)*(z-az)/(bz-az+1e-30)+ax)
 return np.where(inside,-d,d)
image=bpy.data.images.load(os.path.join(ROOT,'assets-src/polyhaven/rock_face/rock_face_disp_2k.jpg'));image.colorspace_settings.name='Non-Color';photo=np.array(image.pixels[:]).reshape(image.size[1],image.size[0],4)[:,:,0]
def measured(offset,scale=83):
 u=((x+z*.32)/scale+offset)%1;v=((z-x*.18)/scale+offset*.61)%1
 return photo[(v*(photo.shape[0]-1)).astype(int),(u*(photo.shape[1]-1)).astype(int)]-.5
# Broad fractured fingers project out from the preserved road rather than
# following its continuous straight scarp. Gaps below each are actual ravines.
SHELVES=[
 ([(-129,194),(-157,181),(-188,207),(-179,237),(-150,245),(-125,224)],18),
 ([(-151,206),(-176,202),(-181,225),(-159,232),(-142,220)],34),
 ([(-136,290),(-169,269),(-212,287),(-226,329),(-212,351),(-174,345),(-145,330)],23),
 ([(-169,290),(-202,281),(-216,308),(-203,329),(-178,322),(-161,310)],41),
 ([(-136,401),(-181,373),(-239,392),(-246,430),(-233,454),(-185,449),(-147,428)],26),
 ([(-176,397),(-216,387),(-232,415),(-217,437),(-185,429),(-166,414)],47),
 ([(-150,504),(-190,480),(-250,488),(-291,529),(-282,565),(-224,563),(-178,546)],25),
 ([(-196,501),(-238,493),(-267,521),(-253,540),(-218,536),(-191,520)],46),
 ([(-293,229),(-327,210),(-349,245),(-327,276),(-294,263)],37),
 ([(-281,355),(-316,334),(-351,369),(-343,409),(-304,400),(-275,378)],39)
]
# Intermediate rock aprons support the high preserved road. Without these broad
# lateral benches, exact parking pads atop a lowered bed become a knife-edged
# causeway. Their level changes are authored landform, not a smoothing knob.
SHELVES.extend([
 ([(-116,196),(-143,190),(-178,230),(-162,273),(-127,263),(-111,233)],18),
 ([(-140,211),(-166,222),(-177,247),(-148,262),(-125,246)],31),
 ([(-157,294),(-189,276),(-227,289),(-247,322),(-232,361),(-197,363),(-154,337)],43),
 ([(-196,307),(-224,299),(-249,325),(-240,356),(-217,364),(-195,341)],58),
 ([(-196,384),(-229,367),(-257,389),(-268,433),(-246,458),(-215,445),(-191,416)],59),
 ([(-245,203),(-299,195),(-349,228),(-345,291),(-305,316),(-260,282)],43),
 ([(-259,232),(-297,214),(-324,244),(-310,279),(-277,290),(-250,264)],57),
 ([(-271,328),(-312,315),(-351,352),(-342,420),(-306,434),(-271,407)],52)
])
height=old*.48
for i,(poly,level) in enumerate(SHELVES):
 relief=measured(i*.17);edge=sd(poly)+relief*9;weight=1-smooth(-3,9,edge)
 height=np.maximum(height,(level+relief*4)*weight)
for line,width,depth in [([(-120,265),(-163,257),(-191,266),(-214,269)],20,15),([(-120,368),(-162,353),(-195,358),(-216,374)],19,17),([(-126,474),(-172,461),(-213,470),(-243,487)],20,16)]:
 height-=depth*(1-smooth(6,width,distance(line)))
height=np.maximum(0,height)
route=np.array([[p['x'],p['z']] for p in parking['parks']]);a=route[0]+(route[0]-route[1])/np.linalg.norm(route[0]-route[1])*25;b=route[-1]+(route[-1]-route[-2])/np.linalg.norm(route[-1]-route[-2])*25;route=np.vstack((a,route,b));road=distance(route.tolist())
protected=(x<=-355)|(x>=-110)|(z<=170)|(z>=585)|(np.hypot(x,z)<=130)|((x>=-270)&(x<=-120)&(z<=190))|(road<=18)
weight=smooth(-355,-335,x)*(1-smooth(-132,-110,x))*smooth(170,194,z)*(1-smooth(561,585,z))*smooth(18,34,road)
for p in parking['parks']:
 dx=np.maximum(0,np.abs(x-p['x'])-p['hx']-2*step);dz=np.maximum(0,np.abs(z-p['z'])-p['hz']-2*step);d=np.hypot(dx,dz);protected|=d==0;weight*=smooth(0,16,d)
# Four corners of every height query's native cell, including rejected parking
# candidates. Preserve a gentle one-cell shoulder around these exact samples.
search=np.full(x.shape,1e8)
for i in parking['protectedNativeIndices']:
 r=i//257;c=i%257;protected[r,c]=True;search=np.minimum(search,np.hypot(x-axis[c],z-axis[r]))
weight*=smooth(0,step,search)
height=(old+(height-old)*weight).astype('<f4');height[protected]=old[protected]
for _ in range(80):
 neighbours=[np.roll(height,(dr,dc),(0,1)) for dr,dc in [(1,0),(-1,0),(0,1),(0,-1)]]
 low=np.maximum.reduce(neighbours)-step*1.42;high=np.minimum.reduce(neighbours)+step*1.42
 height=np.maximum(np.minimum(height,high),low);height[protected]=old[protected]
height=height.astype('<f4');height.tofile(os.path.join(OUT,'native-bed.f32'));protected.astype('uint8').tofile(os.path.join(OUT,'protected-mask.u8'))
report={'sourceOnly':True,'baselineSHA256':hashlib.sha256(old.tobytes()).hexdigest(),'candidateSHA256':hashlib.sha256(height.tobytes()).hexdigest(),'changedOver6u':int(np.count_nonzero(np.abs(height-old)>6)),'maxDelta':float(np.max(np.abs(height-old))),'shelves':SHELVES,'route':route.tolist(),'searchSamples':len(parking['sampledHeightQueries']),'searchVertices':len(parking['protectedNativeIndices']),'protectedUnchanged':bool(np.array_equal(height[protected],old[protected]))}
with open(os.path.join(OUT,'bed-metadata.json'),'w') as f:json.dump(report,f,indent=2)
print(json.dumps({k:v for k,v in report.items() if k not in ['shelves','route']}))
