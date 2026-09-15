import json,zipfile,xml.etree.ElementTree as E
from pathlib import Path
root=Path(__file__).resolve().parents[2]
z=zipfile.ZipFile(root/'outputs/flight-combat-20260914/PowerWorld-Combat-Production.xlsx')
n={'s':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
styles=E.fromstring(z.read('xl/styles.xml')).find('s:cellXfs',n)
results=[]
for i in range(1,7):
    sh=E.fromstring(z.read(f'xl/worksheets/sheet{i}.xml'))
    pane=sh.find('.//s:pane',n)
    table=E.fromstring(z.read(f'xl/tables/table{i}.xml'))
    assert pane is not None and pane.attrib.get('ySplit')=='6'
    assert table.find('s:autoFilter',n) is not None
    assert sh.find('.//s:dataValidation',n) is not None
    results.append({'sheet':i,'pane':pane.attrib,'table':table.attrib})
sh=E.fromstring(z.read('xl/worksheets/sheet5.xml'))
c=next(c for c in sh.findall('.//s:c',n) if c.attrib['r']=='F10')
results.append({'audioEventStyle':E.tostring(styles[int(c.attrib['s'])]).decode()})
for sheet_no,cell in [(2,'H7'),(2,'J7'),(3,'F7'),(6,'G7'),(6,'I7'),(6,'O7'),(6,'P7')]:
    sh=E.fromstring(z.read(f'xl/worksheets/sheet{sheet_no}.xml'))
    c=next(c for c in sh.findall('.//s:c',n) if c.attrib['r']==cell)
    assert c.attrib.get('t','n')=='n',(sheet_no,cell,c.attrib)
print(json.dumps(results,indent=2))
