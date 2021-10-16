from pathlib import Path
from urllib.request import urlopen
import hashlib,json
repo='luigi000/envit5-translation-ct2-int8'; rev='f68ae0e2639dacde555fe91a36b74d662848d681'
p=Path('.runtime/envit5-model');p.mkdir(exist_ok=True)
files=['README.md','config.json','model.bin','shared_vocabulary.json','spiece.model']
meta={'repository':repo,'revision':rev,'files':{}}
for name in files:
 f=p/name
 if not f.exists():
  with urlopen(f'https://huggingface.co/{repo}/resolve/{rev}/{name}',timeout=120) as r, open(f,'wb') as out:
   while b:=r.read(1024*1024):out.write(b)
 meta['files'][name]=hashlib.sha256(f.read_bytes()).hexdigest()
 print(name,f.stat().st_size,flush=True)
Path('data/english/model.json').write_text(json.dumps(meta,indent=2)+'\n')
