import unreal,json,os,collections
OUT=r'C:/Users/taskm/Documents/PowerWorldAssets/animations/2026-09-15-suplex-pilot'
r=unreal.AssetRegistryHelpers.get_asset_registry();r.search_all_assets(True)
rows={}
for a in r.get_assets_by_path('/Game',recursive=True):
 path=str(a.package_name); folder=path.split('/')[2] if len(path.split('/'))>2 else '(root)'
 cls=str(a.asset_class_path.asset_name)
 row=rows.setdefault(folder,{'classes':{},'animation_names':[]})
 row['classes'][cls]=row['classes'].get(cls,0)+1
 if cls=='AnimSequence':row['animation_names'].append(str(a.asset_name))
json.dump({'method':'AssetRegistry classes; metadata enumeration only; not motion or package-load approval','folders':rows},open(os.path.join(OUT,'registry-audit.json'),'w'),indent=2)
