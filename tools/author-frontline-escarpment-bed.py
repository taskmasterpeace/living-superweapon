"""Source-only native bed study supporting the tiered escarpment layout.

Keeps exact accepted ground in protected gameplay regions. Elsewhere intentional
broken ledges replace one continuous bank ramp. No runtime output is written.
"""
import bpy,numpy as np,os,json,math,hashlib
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)));OUT=os.path.join(ROOT,'assets-src/frontline-escarpment-study')
old=np.fromfile(os.path.join(ROOT,'assets-src/frontline-heightfield-candidate/native-after.f32'),dtype='<f4').reshape(257,257)
axis=np.linspace(-1028,1028,257);x,z=np.meshgrid(axis,axis);step=2056/256
def smooth(a,b,v):
 t=np.clip((v-a)/(b-a),0,1);return t*t*(3-2*t)
def photo(name):
 image=bpy.data.images.load(os.path.join(ROOT,'assets-src/polyhaven',name));image.colorspace_settings.name='Non-Color'
 return np.array(image.pixels[:],dtype=np.float32).reshape(image.size[1],image.size[0],4)[:,:,0]
rock=photo('rock_face/rock_face_disp_2k.jpg');ground=photo('aerial_ground_rock/aerial_ground_rock_disp_2k.jpg')
def sample(image,size,angle,offset):
 c=math.cos(angle);s=math.sin(angle);u=((x*c+z*s)/size+offset)%1;v=((-x*s+z*c)/size+offset*.7)%1
 return image[(v*(image.shape[0]-1)).astype(int),(u*(image.shape[1]-1)).astype(int)]-.5
def sd(points):
 inside=np.zeros(x.shape,dtype=bool);dist=np.full(x.shape,1e8)
 for (ax,az),(bx,bz) in zip(points,points[1:]+points[:1]):
  dx=bx-ax;dz=bz-az;t=np.clip(((x-ax)*dx+(z-az)*dz)/(dx*dx+dz*dz),0,1)
  dist=np.minimum(dist,np.hypot(x-ax-t*dx,z-az-t*dz))
  inside^=((az>z)!=(bz>z))&(x<(bx-ax)*(z-az)/(bz-az+1e-30)+ax)
 return np.where(inside,-dist,dist)

# One low bed joins all outcrops, leaving space between broken shelf fingers.
zone=smooth(145,225,np.abs(x))*(1-smooth(720,970,np.maximum(np.abs(x),np.abs(z))))
height=old*(1-zone*.54)
SHELVES=[
 ([(152,-115),(233,-157),(385,-136),(434,-44),(391,29),(235,60),(166,17)],28),
 ([(199,-117),(341,-119),(391,-57),(348,-1),(252,17),(209,-27)],52),
 ([(256,-98),(341,-105),(367,-62),(313,-28),(260,-33)],74),
 ([(151,155),(192,116),(299,99),(412,173),(381,221),(299,238),(226,211),(176,222)],31),
 ([(214,153),(282,126),(353,159),(332,203),(257,194),(216,208)],53),
 ([(151,323),(219,282),(306,284),(417,340),(409,416),(349,453),(265,416),(185,441),(148,387)],35),
 ([(218,324),(273,307),(368,339),(357,394),(293,398),(233,374)],62),
 ([(282,337),(334,336),(343,371),(302,381),(278,359)],85),
 ([(155,566),(252,520),(375,553),(440,629),(387,704),(297,708),(222,672),(164,696)],39),
 ([(236,579),(322,563),(378,609),(357,660),(282,666),(242,634)],64),
 ([(-152,-136),(-243,-169),(-389,-139),(-459,-32),(-406,37),(-296,63),(-174,3)],32),
 ([(-214,-103),(-327,-116),(-401,-49),(-349,9),(-269,15),(-224,-29)],59),
 ([(-276,-86),(-350,-76),(-361,-44),(-314,-20),(-274,-35)],83),
 ([(-335,155),(-435,119),(-536,176),(-535,277),(-446,313),(-346,271)],45),
 ([(-391,178),(-466,164),(-498,215),(-475,254),(-405,266),(-382,226)],69),
 ([(-316,362),(-390,326),(-509,357),(-533,442),(-441,496),(-341,469)],42),
 ([(-368,374),(-439,352),(-489,391),(-469,443),(-390,449),(-365,418)],65),
 ([(-153,609),(-220,562),(-331,557),(-431,609),(-455,712),(-359,778),(-250,736),(-164,738)],34),
 ([(-229,626),(-312,594),(-388,630),(-386,692),(-299,720),(-231,692)],61),
 ([(-277,640),(-322,625),(-353,651),(-338,688),(-280,682)],86)
]
exposure=np.zeros(x.shape)
for i,(polygon,elevation) in enumerate(SHELVES):
 measured=sample(rock,80+i%3*17,i*.41,i*.137)
 edge=sd(polygon)+measured*13
 weight=1-smooth(-7,12,edge)
 plate=elevation+measured*3.5+sample(ground,120,i*.27,i*.219)*1.1
 height=np.maximum(height,plate*weight);exposure=np.maximum(exposure,weight)

# Measured short-scale joint relief is strongest on the scarp, not a noisy floor.
height+=sample(rock,72,.64,.31)*6.5*zone*(.4+.6*exposure)
# Deliberate broad cross-bank gaps follow established drains between ledge fingers.
for line,width,depth in [([(125,265),(247,257),(336,256),(471,281)],25,19), ([(130,468),(252,475),(331,475),(460,496)],29,22), ([(-127,113),(-306,100),(-410,90),(-500,50)],25,20), ([(-127,524),(-305,540),(-442,526),(-537,492)],26,18)]:
 distance=np.full(x.shape,1e8)
 for (ax,az),(bx,bz) in zip(line[:-1],line[1:]):
  dx=bx-ax;dz=bz-az;t=np.clip(((x-ax)*dx+(z-az)*dz)/(dx*dx+dz*dz),0,1)
  distance=np.minimum(distance,np.hypot(x-ax-t*dx,z-az-t*dz))
 height-=depth*(1-smooth(8,width,distance))*smooth(130,195,np.abs(x))

# Two broad measured fans, with low coarse-fragment relief, feed the valley.
for polygon,level in [([(140,70),(182,20),(275,36),(291,88),(208,130),(154,148)],24),([(-325,528),(-378,505),(-448,536),(-411,599),(-328,626),(-285,583)],30)]:
 edge=sd(polygon);weight=1-smooth(-8,22,edge);height=np.maximum(height,(level+sample(ground,95,.73,.11)*8)*weight)

# Cap only excessive cell jumps, not every cliff to a uniform 1:1 ramp.
for _ in range(4):
 neighbour=np.minimum.reduce([np.roll(height,(dr,dc),(0,1)) for dr,dc in [(1,0),(-1,0),(0,1),(0,-1)]])
 height=np.minimum(height,neighbour+step*2.15)
protected=(np.hypot(x,z)<=130)|(np.abs(x)<=110)|(np.maximum(np.abs(x),np.abs(z))>=980)|((x>=-300)&(x<=-160)&(z>=150)&(z<=550))
weight=smooth(130,180,np.hypot(x,z))*smooth(110,145,np.abs(x))*(1-smooth(930,980,np.maximum(np.abs(x),np.abs(z))))
# Smooth return outside convoy reservation; the reservation itself stays bit exact.
track=np.maximum.reduce([-300-x,x+160,150-z,z-550,np.zeros(x.shape)])
weight*=smooth(0,32,track)
height=np.maximum(0,old+(height-old)*weight).astype('<f4');height[protected]=old[protected]
# Enforce the existing native bank-slope contract after protected-region blends.
# Lowering alone cannot solve a fixed high convoy edge: allow neighbouring low
# samples to rise too, while every protected sample remains bit exact.
for _ in range(60):
 neighbours=[np.roll(height,(dr,dc),(0,1)) for dr,dc in [(1,0),(-1,0),(0,1),(0,-1)]]
 lower=np.maximum.reduce(neighbours)-step*1.42;upper=np.minimum.reduce(neighbours)+step*1.42
 height=np.maximum(np.minimum(height,upper),lower);height[protected]=old[protected]
height=height.astype('<f4')
height.tofile(os.path.join(OUT,'native-bed.f32'))
with open(os.path.join(OUT,'bed-metadata.json'),'w') as f:json.dump({'sourceOnly':True,'segments':256,'halfSpan':1028,'baselineSHA256':hashlib.sha256(old.tobytes()).hexdigest(),'candidateSHA256':hashlib.sha256(height.tobytes()).hexdigest(),'changedOver2u':int(np.count_nonzero(np.abs(height-old)>2)),'shelves':SHELVES,'peak':float(height.max())},f,indent=2)
print('Native source bed written, peak',height.max(),'changed',np.count_nonzero(np.abs(height-old)>2))
