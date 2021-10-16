"""Optional offline seed preparation. Product runtime does not depend on Python/model weights."""
import json,re,unicodedata,time,os,sys
from pathlib import Path
import ctranslate2,sentencepiece as spm
root=Path('data/english'); directory=Path('.runtime/envit5-model')
strings=json.loads((root/'strings.json').read_text(encoding='utf-8'))
overrides=json.loads((root/'overrides.json').read_text(encoding='utf-8'))
cache_path=root/'translations.json'
cache=json.loads(cache_path.read_text(encoding='utf-8')) if cache_path.exists() and '--rebuild' not in sys.argv else {}
cache.update(overrides)
source=json.loads((root/'source.json').read_text(encoding='utf-8'))
names=set()
for r in source['records']:
 d=r['data']
 if r['kind']=='STAFF':
  names.add(d['name'])
  cache[d['summary']]=f"Academic profile, teaching and publications of {d['name']} at the Department of Land Resources."
  cache[d['portraitAlt']]=overrides.get(d.get('academicTitle',''),d.get('academicTitle',''))+' '+d['name']
 for c in d.get('contributors',[]):
  if 2<=len(c['name'].split())<=6:names.add(c['name'])
def ascii_name(s):
 return ''.join(c for c in unicodedata.normalize('NFD',s.replace('Đ','D').replace('đ','d')) if unicodedata.category(c)!='Mn')
name_pairs=sorted([(ascii_name(n),n) for n in names if ascii_name(n)!=n],key=lambda x:-len(x[0]))
sp=spm.SentencePieceProcessor(model_file=str(directory/'spiece.model'))
model=ctranslate2.Translator(str(directory),device='cpu',compute_type='int8',intra_threads=4,inter_threads=1)
def segments(text):
 # Keep every source span; never silently truncate the model's 512-token context.
 parts=re.split(r'(\n+|(?<=[.!?;])\s+(?=[A-ZÀ-ỸĐ]))',text)
 result=[]
 for part in parts:
  if not part:continue
  if not part.strip():result.append((part,False));continue
  words=part.split(' '); chunk=[]
  for word in words:
   candidate=' '.join(chunk+[word])
   if chunk and len(sp.encode('vi: '+candidate))+1>400:
    result.append((' '.join(chunk),True));result.append((' ',False));chunk=[]
   chunk.append(word)
  if chunk:result.append((' '.join(chunk),True))
 return result
pending=[s for s in strings if s not in cache]
# Retain original English fragments and proper names; translate Vietnamese spans only.
segments_by_text={s:segments(s) for s in pending}
unique=[]; seen=set(); vi=re.compile('[À-ỹĐđ]')
for parts in segments_by_text.values():
 for text,translate in parts:
  if translate and vi.search(text) and text not in overrides and text not in seen:
   unique.append(text);seen.add(text)
translated=dict(overrides)
checkpoint=Path('.runtime/english-segments.json')
if checkpoint.exists():translated.update(json.loads(checkpoint.read_text(encoding='utf-8')))
translated.update(overrides)
if '--refresh-uppercase' in sys.argv:
 translated={s:t for s,t in translated.items() if not (s.isupper() and len(s)>30 and s not in overrides)}
unique=[s for s in unique if s not in translated]
def model_input(text):
 if text.isupper() and len(text)>30:
  text=text[0]+text[1:].lower()
  for term in ['GIS','GPS','MODIS','Landsat','Sentinel','UAV','AUN-QA','NPK','UREA','WRB','FCC','CLUMondo','Vensim','SCIAMACHY','ENVISAT','CO2','CRF-UREA']:
   text=re.sub(r'(?<!\w)'+re.escape(term)+r'(?!\w)',term,text,flags=re.I)
  text=re.sub('đbscl','Đồng bằng sông Cửu Long',text,flags=re.I)
 return 'vi: '+text
start=time.time()
for offset in range(0,len(unique),16):
 batch=unique[offset:offset+16]
 tokens=[sp.encode(model_input(s),out_type=str)+['</s>'] for s in batch]
 outputs=model.translate_batch(tokens,beam_size=1,max_decoding_length=512,max_input_length=0,repetition_penalty=1.05)
 for text,result in zip(batch,outputs):
  value=sp.decode(result.hypotheses[0])
  value=re.sub(r'^(?:\S{1,3}\s+)?(?:en|vi)\s*:\s*','',value).strip()
  for plain,name in name_pairs:value=re.sub(re.escape(plain),lambda m:name,value,flags=re.I)
  value=value.replace('Mekong River delta','Mekong Delta').replace('Nine Dragon River','Mekong River')
  if not value:raise RuntimeError('Translation unexpectedly empty')
  translated[text]=value
 if offset%160==0 or offset+16>=len(unique):
  checkpoint.write_text(json.dumps(translated,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
  print(f'{min(offset+16,len(unique))}/{len(unique)} segments; {round(time.time()-start)}s',flush=True)
for text,parts in segments_by_text.items():
 cache[text]=''.join(translated.get(part,part) if translate else part for part,translate in parts)
cache.update(overrides)
cache_path.write_text(json.dumps(cache,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(f'Complete: {len(cache)} cached strings',flush=True)
