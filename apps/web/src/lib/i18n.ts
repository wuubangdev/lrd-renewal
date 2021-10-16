export type Locale = "vi" | "en";

const messages = {
  vi: {
    home: "Trang chủ",
    faculty: "Đội ngũ cán bộ",
    profile: "Hồ sơ cán bộ",
    department: "Bộ môn Tài nguyên Đất đai",
    scientificBiography: "Lý lịch khoa học",
    education: "Quá trình đào tạo",
    languages: "Ngoại ngữ",
    career: "Quá trình công tác",
    projects: "Đề tài và dự án nghiên cứu",
    publications: "Công trình khoa học",
    books: "Sách và giáo trình",
    supervisions: "Hướng dẫn học viên",
    training: "Tập huấn và đào tạo",
    awards: "Giải thưởng và khen thưởng",
    memberships: "Tổ chức khoa học",
    otherActivities: "Hoạt động chuyên môn khác",
    contents: "Nội dung hồ sơ",
    contact: "Thông tin & liên hệ",
    toc: "Mục lục hồ sơ",
    backFaculty: "Xem đội ngũ cán bộ",
    emailContact: "Liên hệ qua email",
    pageContents: "Trong bài viết",
    sourceArticle: "Xem bài viết tại nguồn",
  },
  en: {
    home: "Home",
    faculty: "Faculty",
    profile: "Faculty profile",
    department: "Land Resources Department",
    scientificBiography: "Academic profile",
    education: "Education",
    languages: "Languages",
    career: "Career history",
    projects: "Research projects",
    publications: "Publications",
    books: "Books and textbooks",
    supervisions: "Student supervision",
    training: "Training and courses",
    awards: "Awards and recognition",
    memberships: "Academic organizations",
    otherActivities: "Other professional activities",
    contents: "Profile sections",
    contact: "Contact information",
    toc: "Profile contents",
    backFaculty: "View all faculty",
    emailContact: "Contact by email",
    pageContents: "On this page",
    sourceArticle: "View original article",
  },
} as const;

export function localeOf(value: string): Locale {
  return value === "en" ? "en" : "vi";
}

export function t(locale: string, key: keyof typeof messages.vi): string {
  return messages[localeOf(locale)][key];
}
