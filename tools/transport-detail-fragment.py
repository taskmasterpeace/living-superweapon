# Additional reusable armor and cabin details; dimensions preserve the established aisle.
def pod(n,x,y):
 rings=[]
 for z,w,d in [(5,2.6,4),(7,4,6),(19,4,6),(23,2.8,4)]:
  rings.extend([(x-w*.65,y-d,z),(x+w*.65,y-d,z),(x+w,y-d*.65,z),(x+w,y+d*.65,z),(x+w*.65,y+d,z),(x-w*.65,y+d,z),(x-w,y+d*.65,z),(x-w,y-d*.65,z)])
 faces=[tuple(reversed(range(8))),tuple(range(24,32))]
 for row in range(3):
  for k in range(8):faces.append((row*8+k,row*8+(k+1)%8,(row+1)*8+(k+1)%8,(row+1)*8+k))
 return mesh(n,rings,faces,ivory)
for side in [-1,1]:
 for n in ['nacelle_'+str(side),'nacelle_armor_'+str(side),'intake_'+str(side),'marker_'+str(side)]:
  o=bpy.data.objects.get(n)
  if o:bpy.data.objects.remove(o,do_unlink=True)
 pod('armored_lift_pod_'+str(side),side*27,-3)
 box('pod_red_cap',(side*27,-3,22),(5.7,8,.6),red)
 box('pod_recess',(side*27,-9.05,13),(4.6,.2,8),dark)
 box('pod_beacon',(side*27,-9.2,13),(2,.2,.65),gold)
 for y in [-6,-3,0]:box('pod_top_vent',(side*27,y,23.1),(3.6,.7,.16),dark)
 for y in [-13,0,13]:
  # Broken-up armor panels create recessed joints without noisy texture maps.
  box('side_shell_panel',(side*11.15,y,12.5),(.5,11.8,10.6),ivory)
  box('side_shell_lower_rail',(side*11.5,y,6.8),(.7,11.5,1.8),dark)
  box('side_shell_upper_bevel',(side*10.4,y,21.5),(2,11.8,1.5),ivory).rotation_euler.y=side*.3
 for y in [-14,0,14]:
  box('cabin_roof_rib',(0,y,21),(18,.8,.8),dark)
  box('cabin_roof_light',(0,y,20.5),(3.2,1.2,.16),gold)
  box('side_shell_interior_rib',(side*9.7,y,14),(.6,.8,12),dark)
 for y in [-13,12]:
  box('gear_piston',(side*8,y,3.7),(.6,.6,4.4),ivory)
  bpy.ops.mesh.primitive_cylinder_add(vertices=12,radius=1.15,depth=1.72,location=(side*8,y,2.3),rotation=(0,math.pi/2,0));bpy.context.object.name='gear_hub';bpy.context.object.data.materials.append(ivory)
# Broad angled glazing and frames replace the tiny opaque cockpit block.
o=bpy.data.objects.get('cockpit_canopy');bpy.data.objects.remove(o,do_unlink=True)
for side in [-1,1]:
 x0=.35*side;x1=8.5*side
 mesh('cockpit_windscreen',[(x0,21,21.5),(x1,21,21.5),(x1*.8,30,14.5),(x0,31,14.5)],[(0,1,2,3)],glass)
 mesh('cockpit_side_glass',[(side*8.8,20.5,21),(side*10.8,20.5,16),(side*7.5,30,14),(side*8.5,29,15)],[(0,1,2,3)],glass)
 box('cockpit_frame',(side*8.7,25,18),(.5,11,.5),dark).rotation_euler.x=-.6
box('cockpit_center_frame',(0,26,18),(.6,13,.5),ivory).rotation_euler.x=-.6
box('nose_lower_armor',(0,29,8),(15,8,2.2),dark)
for side in [-1,1]:box('landing_lamp',(side*7,30,10),(2,.5,.7),gold)
# Cabin floor runners, entry lights and ramp borders share the source recipe.
for side in [-1,1]:
 box('floor_runner',(side*3.8,0,5.76),(.3,38,.06),ivory)
 box('entry_light',(side*7.3,-20.7,12),(.35,.25,3),gold)
 for y in [-34,-25]:
  o=box('ramp_edge_light',(side*6.2,y,.5+(y+38)*5.2/18+.15),(.4,1.4,.12),gold)
  world_matrix=o.matrix_world.copy();o.parent=hinge;o.matrix_world=world_matrix
# Additional linked seat components stay outside the center aisle.
for idx,(x,y) in enumerate([(x,y) for x in [-6.8,6.8] for y in [-12,0,12]]):
 for side in [-1,1]:box('seat_armrest',(x+side*2.1,y,9.7),(.5,3.5,.55),ivory)
 box('seat_headrest',(x,y-1.9,13.7),(2.6,.9,1.5),dark)
 for side in [-1,1]:box('seat_harness',(x+side*.75,y-1.15,10.7),(.24,.12,3.2),dark)
