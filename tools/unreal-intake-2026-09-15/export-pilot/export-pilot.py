import unreal, json, os, traceback
OUT = r'C:/Users/taskm/Documents/PowerWorldAssets/animations/2026-09-15-suplex-pilot'
NAMES = ['a_suplex_single_p00','a_suplex_single_p01','a_liedown_getup_prone','a_LiedownGetup_Supine']
results=[]
for name in NAMES:
    row={'name':name,'asset':'/Game/SuplexAnimations/AnimSequence/'+name}
    try:
        asset=unreal.load_asset(row['asset'])
        if not isinstance(asset, unreal.AnimSequence): raise RuntimeError('Not AnimSequence: '+str(asset))
        row['class']=asset.get_class().get_name()
        sk=asset.get_editor_property('skeleton')
        if not sk: raise RuntimeError('Missing skeleton')
        row['skeleton']=sk.get_path_name()
        row['duration']=asset.get_editor_property('sequence_length')
        try:
            rate=asset.get_editor_property('target_frame_rate'); row['rate']={'numerator':rate.numerator,'denominator':rate.denominator}
        except Exception as e: row['rate_error']=str(e)
        for method,key in [('get_number_of_sampled_keys','sampled_keys'),('get_number_of_sampled_frames','sampled_frames')]:
            try: row[key]=getattr(asset,method)()
            except Exception as e: row[key+'_error']=str(e)
        filename=os.path.join(OUT,name+'.fbx')
        if os.path.exists(filename): raise RuntimeError('Refuse overwrite '+filename)
        task=unreal.AssetExportTask(); task.object=asset; task.filename=filename; task.automated=True; task.prompt=False; task.replace_identical=False
        task.exporter=unreal.AnimSequenceExporterFBX(); task.options=unreal.FbxExportOption()
        row['export_success']=bool(unreal.Exporter.run_asset_export_task(task)); row['export_errors']=list(task.errors)
        row['bytes']=os.path.getsize(filename) if os.path.exists(filename) else 0
    except Exception as e: row['error']=str(e); row['traceback']=traceback.format_exc()
    results.append(row)
    with open(os.path.join(OUT,'export-report.json'),'w') as f: json.dump({'source_saved':False,'results':results},f,indent=2)
unreal.log('LSW_PILOT_COMPLETE '+json.dumps(results))
