"""Stage purchased sources outside the web root; never execute package content.

python tools/stage-purchased-animations.py DOWNLOADS PRIVATE_OUTPUT
Preserves Unity asset paths and importer metadata. Existing differing files fail closed.
"""
import hashlib
import json
import pathlib
import sys
import tarfile
import zipfile

PACKS = {
    'kg.zip': 'knockdown-getup',
    'gt.zip': 'grab-throw',
    'grab_hostage.zip': 'grab-hostage',
    'interaction_villain.zip': 'aerial-interaction',
    'fbx.zip': 'pickup-carry',
    'unity_unleashedboxer_animset_2022_3_62f3.unitypackage': 'unleashed-boxer',
}


def digest(data):
    return hashlib.sha256(data).hexdigest()


def store(root, name, data):
    relative = pathlib.PurePosixPath(name.replace('\\', '/'))
    if relative.is_absolute() or '..' in relative.parts or ':' in name:
        raise ValueError(f'Unsafe package path: {name}')
    target = root.joinpath(*relative.parts).resolve()
    if not target.is_relative_to(root.resolve()):
        raise ValueError(f'Escaping package path: {name}')
    if target.exists():
        if digest(target.read_bytes()) != digest(data):
            raise ValueError(f'Existing different file: {target}')
    else:
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
    return {'path': str(target), 'bytes': len(data), 'sha256': digest(data)}


def stage(downloads, output):
    output.mkdir(parents=True, exist_ok=True)
    report = {'status': 'staged-source-only', 'gameplayAssigned': False,
              'license': 'Purchased source; retain entitlement separately; not CC0', 'packs': []}
    for filename, pack_id in PACKS.items():
        archive = downloads / filename
        if not archive.exists():
            report['packs'].append({'id': pack_id, 'status': 'missing', 'archive': str(archive)})
            continue
        pack = {'id': pack_id, 'archive': str(archive), 'archiveSha256': digest(archive.read_bytes()), 'files': []}
        destination = output / pack_id
        if archive.suffix == '.zip':
            with zipfile.ZipFile(archive) as package:
                for member in package.infolist():
                    if not member.is_dir():
                        pack['files'].append(store(destination, member.filename, package.read(member)))
        else:
            # One forward pass avoids repeatedly decompressing a large Unity package.
            assets = {}
            with tarfile.open(archive, 'r|gz') as package:
                for member in package:
                    if not member.isfile() or '/' not in member.name:
                        continue
                    prefix, kind = member.name.rsplit('/', 1)
                    if kind not in ('pathname', 'asset', 'asset.meta'):
                        continue
                    entry = assets.setdefault(prefix, {})
                    data = package.extractfile(member).read()
                    if kind == 'pathname':
                        entry['path'] = data.decode('utf-8-sig').strip('\0\r\n')
                    else:
                        entry[kind] = data
                    if 'path' in entry:
                        for suffix, tail in [('asset', ''), ('asset.meta', '.meta')]:
                            if suffix in entry:
                                pack['files'].append(store(destination, entry['path'] + tail, entry.pop(suffix)))
            if any('asset' in entry or 'asset.meta' in entry for entry in assets.values()):
                raise ValueError('Unity package contains asset data without a pathname')
        pack['fbxFiles'] = sum(pathlib.Path(f['path']).suffix.lower() == '.fbx' for f in pack['files'])
        pack['status'] = 'staged-source-only'
        report['packs'].append(pack)
    report['fbxFiles'] = sum(pack.get('fbxFiles', 0) for pack in report['packs'])
    (output / 'source-manifest.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
    print(json.dumps({'output': str(output), 'fbxFiles': report['fbxFiles'],
                      'packs': [{k: p[k] for k in ['id', 'status', 'fbxFiles'] if k in p} for p in report['packs']]}, indent=2))


if __name__ == '__main__':
    stage(pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2]))
