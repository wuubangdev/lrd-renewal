create table publishing.category (
  code varchar(40) primary key,
  name_vi varchar(80) not null,
  name_en varchar(80) not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
insert into publishing.category(code,name_vi,name_en,sort_order) values
 ('TIN_TUC','Tin bộ môn','Department news',10),
 ('DAO_TAO','Đào tạo','Education',20),
 ('NGHIEN_CUU','Nghiên cứu','Research',30),
 ('SINH_VIEN','Sinh viên','Students',40),
 ('TUYEN_SINH','Tuyển sinh','Admissions',50),
 ('SU_KIEN','Sự kiện','Events',60);
