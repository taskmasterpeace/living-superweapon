import unreal,json,os
OUT=r'C:/Users/taskm/Documents/PowerWorldAssets/animations/2026-09-15-suplex-pilot'
p=os.path.join(OUT,'export-report.json'); report=json.load(open(p))
for row in report['results']:
 a=unreal.load_asset(row['asset'])
 try: row['num_frames']=unreal.AnimationLibrary.get_num_frames(a)
 except Exception as e: row['frames_error']=str(e)
 try:
  rate=a.get_editor_property('sampling_frame_rate'); row['sampling_frame_rate']={'numerator':rate.numerator,'denominator':rate.denominator}
 except Exception as e: row['sampling_frame_rate_error']=str(e)
json.dump(report,open(p,'w'),indent=2)
