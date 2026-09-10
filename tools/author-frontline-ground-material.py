"""Bake geological material data from accepted terrain and existing CC0 scans.

CPU only. Never edits native height, collision, camera or light data.
"""
import bpy,numpy as np,os,json,hashlib,ast,zlib,struct,sys
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BANK='--convoy-bank-study' in sys.argv
STUDY='--escarpment-study' in sys.argv or BANK
STUDY_FOLDER='frontline-convoy-bank-study' if BANK else 'frontline-escarpment-study'
OUT=os.path.join(ROOT,'assets-src',STUDY_FOLDER,'material') if STUDY else os.path.join(ROOT,'assets-src','frontline-ground-material');os.makedirs(OUT,exist_ok=True)
SOURCE=os.path.join(ROOT,'assets-src',STUDY_FOLDER if STUDY else 'frontline-heightfield-candidate')
height=np.fromfile(os.path.join(SOURCE,'native-bed.f32' if STUDY else 'native-after.f32'),dtype='<f4').reshape(257,257).astype(float)
axis=np.linspace(-1028,1028,257);x,z=np.meshgrid(axis,axis);spacing=2056/256
def smooth(a,b,t):
    t=np.clip((t-a)/(b-a),0,1);return t*t*(3-2*t)
def blur(image,radius):
    result=np.zeros_like(image)
    # Circular shifts are appropriate for the tileable photographed surface.
    for dy,dx in [(0,0),(radius,0),(-radius,0),(0,radius),(0,-radius),(radius,radius),(-radius,radius),(radius,-radius),(-radius,-radius)]:result+=np.roll(image,(dy,dx),(0,1))/9
    return result
def polygon_mask(points):
    inside=np.zeros(x.shape,dtype=bool);distance=np.full(x.shape,1e8)
    for i,(ax,az) in enumerate(points):
        bx,bz=points[(i+1)%len(points)];dx=bx-ax;dz=bz-az;t=np.clip(((x-ax)*dx+(z-az)*dz)/(dx*dx+dz*dz),0,1)
        distance=np.minimum(distance,np.hypot(x-ax-t*dx,z-az-t*dz))
        inside^=((az>z)!=(bz>z))&(x<(bx-ax)*(z-az)/(bz-az+1e-30)+ax)
    return 1-smooth(-12,20,np.where(inside,-distance,distance))
if STUDY:
    with open(os.path.join(SOURCE,'bed-metadata.json')) as f:shelves=json.load(f)['shelves']
else:
    with open(os.path.join(ROOT,'tools','author-frontline-heightfield.py')) as f:tree=ast.parse(f.read())
    shelves=next(ast.literal_eval(node.value) for node in tree.body if isinstance(node,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='SHELVES' for t in node.targets))
shelf=np.maximum.reduce([polygon_mask(polygon) for polygon,elevation in shelves])
slope=np.hypot(*np.gradient(height,spacing));concavity=np.maximum(0,blur(height,1)-height)
sediment=(1-smooth(.12,.46,slope))*(.65+.35*smooth(.2,1.4,concavity))
exposure=np.maximum(smooth(.14,.58,slope),shelf*.88)*(1-sediment*.38)
envelope=smooth(130,190,np.hypot(x,z))*(1-smooth(925,1028,np.maximum(abs(x),abs(z))))
exposure*=envelope;sediment=1-(1-sediment)*envelope
cavity=1-np.clip(concavity*.075,0,.22)*envelope
mask=np.stack([exposure,cavity,sediment,np.ones_like(height)],axis=-1)
if BANK:
    # This is an isolated local bank study, not a global material restyle.
    prior=np.fromfile(os.path.join(ROOT,'assets-src/frontline-escarpment-study/material/geology-mask.rgba'),dtype='uint8').reshape(257,257,4)/255
    edited=(x>-355)&(x<-110)&(z>170)&(z<585);mask[~edited]=prior[~edited]

def photo(path):
    image=bpy.data.images.load(os.path.join(ROOT,path));image.colorspace_settings.name='Non-Color'
    p=np.array(image.pixels[:],dtype=float).reshape(image.size[1],image.size[0],4)[:,:,0]
    return p.reshape(1024,2,1024,2).mean(axis=(1,3))
rough=photo('assets-src/polyhaven/rock_face/rock_face_rough_2k.jpg')
relief=photo('assets-src/polyhaven/rock_face/rock_face_disp_2k.jpg')
joint=np.maximum(0,blur(relief,12)-relief)
ao=1-np.clip(joint*4,0,.42)
pbr=np.stack([rough,ao,relief,np.ones_like(relief)],axis=-1)

def png(path,rgba):
    h,w,_=rgba.shape
    def chunk(kind,data):return struct.pack('>I',len(data))+kind+data+struct.pack('>I',zlib.crc32(kind+data)&0xffffffff)
    # Arrays start at negative world Z / bottom UV. PNG rows start at the top.
    pixels=b''.join(b'\0'+row.tobytes() for row in rgba[::-1])
    with open(path,'wb') as f:f.write(b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',w,h,8,6,0,0,0))+chunk(b'IDAT',zlib.compress(pixels,9))+chunk(b'IEND',b''))
for name,data in [('geology-mask',mask),('rock-pbr',pbr)]:
    data=np.rint(np.clip(data,0,1)*255).astype('uint8');data.tofile(os.path.join(OUT,name+'.rgba'));png(os.path.join(OUT,name+'.png'),data)
meta={'maskSize':257,'pbrSize':1024,'worldHalfSpan':1028,'maskChannels':['exposed bedrock','macro cavity AO','retained sediment','opaque'],
 'pbrChannels':['measured roughness','measured joint AO','measured displacement','opaque'],'groundSHA256':hashlib.sha256(height.astype('<f4').tobytes()).hexdigest(),
 'source':'Poly Haven Rock Face, CC0 — Greg Zaal / Dario Barresi; accepted authored native landform'}
with open(os.path.join(OUT,'metadata.json'),'w') as f:json.dump(meta,f,indent=2)
print(json.dumps({'mask':list(mask.shape),'pbr':list(pbr.shape),'minAO':float(ao.min()),'roughRange':[float(rough.min()),float(rough.max())]}))
