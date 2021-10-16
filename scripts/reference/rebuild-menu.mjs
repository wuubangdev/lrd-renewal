import { randomUUID } from "node:crypto";
const base = process.env.SEED_BASE_URL ?? "http://localhost:8088";
if (!process.env.LRD_ADMIN_EMAIL || !process.env.LRD_ADMIN_PASSWORD) throw new Error("Thiếu tài khoản quản trị.");
const cookies = new Map();
async function request(path, { method = "GET", body, version } = {}) {
  const headers = new Headers({ Origin: base });
  if (version !== undefined) headers.set("If-Match", `"${version}"`);
  if (body !== undefined) headers.set("Content-Type", "application/json");
  if (!["GET", "HEAD"].includes(method)) { const csrf = await request("/auth/csrf"); headers.set(csrf.headerName, csrf.token); }
  if (cookies.size) headers.set("Cookie", [...cookies].map(([k,v])=>`${k}=${v}`).join("; "));
  const response = await fetch(`${base}/api/v1${path}`, {method,headers,body:body===undefined?undefined:JSON.stringify(body),redirect:"error",signal:AbortSignal.timeout(60000)});
  for (const cookie of response.headers.getSetCookie()) {const pair=cookie.split(";")[0], at=pair.indexOf("="); if(at>0)cookies.set(pair.slice(0,at),pair.slice(at+1));}
  const raw=await response.text(); let value; try {value=raw?JSON.parse(raw):null;} catch {throw new Error(`${path}: ${response.status} ${raw.slice(0,120)}`)}
  if(!response.ok)throw new Error(`${path}: ${response.status} ${value?.detail??raw.slice(0,120)}`); return value;
}
await request("/auth/login",{method:"POST",body:{email:process.env.LRD_ADMIN_EMAIL,password:process.env.LRD_ADMIN_PASSWORD}});
let menu=await request("/admin/site/menu?locale=vi");
const old=menu.content.items;
const all=old.flatMap((x)=>[x,...(x.children??[])]);
const by=(kind,target="")=>all.find((x)=>x.link.kind===kind&&x.link.target===target);
function item(label,kind,target="",children=[]) {
  const prior=all.find((x)=>x.label===label&&x.link.kind===kind&&x.link.target===target)
    ?? (kind==="GROUP" ? null : by(kind,target));
  return {id:prior?.id??randomUUID(),label,link:{kind,target},children};
}
const oldGroup=(name)=>old.find((x)=>x.label===name);
const original=(name)=>{const x=all.find((n)=>n.label===name); if(!x)throw new Error(`Thiếu menu gốc: ${name}`);return x;};
const programItems=(oldGroup("Đào tạo")?.children??[]).filter((x)=>x.link.kind==="PROGRAM");
const items=[
  item("Bộ môn","GROUP","",[
    original("Giới thiệu"),item("Đội ngũ cán bộ","PEOPLE"),
    original("Phòng GIS & Viễn thám"),original("Phòng Tài nguyên đất"),original("Liên hệ"),
  ]),
  item("Đào tạo","PROGRAMS","",programItems),
  item("Tuyển sinh","ADMISSIONS"),
  item("Nghiên cứu","RESEARCH","",[
    item("Đề tài nghiên cứu","PROJECTS"),item("Công bố khoa học","PUBLICATIONS"),
    item("Giáo trình & sách","TEXTBOOKS"),item("Tài liệu","DOCUMENTS"),
    item("Hội thảo & sự kiện","EVENTS"),original("Hợp tác quốc tế"),
  ]),
  item("Chất lượng","GROUP","",oldGroup("Chất lượng")?.children??[]),
  item("Sinh viên","CATEGORY","SINH_VIEN",oldGroup("Sinh viên")?.children??[]),
  item("Tin & cơ hội","NEWS","",[
    item("Tuyển dụng","JOBS"),original("Học bổng"),
  ]),
];
const count=items.reduce((n,x)=>n+1+x.children.length,0);
if(count>40)throw new Error(`Menu có ${count} mục, vượt giới hạn 40.`);
if(JSON.stringify(menu.content.items)===JSON.stringify(items)){console.log("Menu đã đúng cấu trúc mới.");process.exit(0);}
menu=await request("/admin/site/menu?locale=vi",{method:"PATCH",version:menu.version,body:{items}});
menu=await request("/admin/site/menu/publish?locale=vi",{method:"POST",version:menu.version,body:{draftVersion:menu.draftVersion}});
console.log(`Đã công khai ${items.length} nhóm, ${count} liên kết.`);
