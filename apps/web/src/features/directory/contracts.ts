export type StaffBlock = {
  kind: "TEXT" | "FACT" | "LIST" | "TABLE" | "IMAGE";
  text: string;
  value: string;
  items: string[];
  rows: string[][];
  assetId: string | null;
  alt: string;
};
export type StaffSection = { title: string; blocks: StaffBlock[] };
export type StaffEducation = {
  degree: string;
  period: string;
  institution: string;
  major: string;
  graduationYear: string;
  thesis: string;
  mode: string;
};
export type StaffCareer = {
  period: string;
  institution: string;
  role: string;
  description: string;
};
export type StaffActivity = {
  title: string;
  period: string;
  organization: string;
  role: string;
  description: string;
  url: string;
};
export type StaffLanguage = { language: string; proficiency: string; certificate: string };
export type StaffAcademicInfo = {
  highestDegreeYear: string;
  academicRank: string;
  academicRankYear: string;
  birthDate: string;
  birthPlace: string;
  researchInterests: string;
  undergraduate: StaffEducation[];
  postgraduate: StaffEducation[];
  workHistory: StaffCareer[];
  researchProjects: StaffActivity[];
  publications: StaffActivity[];
  books: StaffActivity[];
  supervisions: StaffActivity[];
  trainingCourses: StaffActivity[];
  awards: StaffActivity[];
  memberships: StaffActivity[];
  otherActivities: StaffActivity[];
  languages: StaffLanguage[];
};
export type StaffDetails = {
  name: string;
  slug: string;
  academicTitle: string;
  degree: string;
  position: string;
  unit: string;
  email: string;
  phone: string;
  office: string;
  website: string;
  summary: string;
  specialties: string[];
  portraitId: string | null;
  portraitAlt: string;
  template: "EDITORIAL" | "ACADEMIC" | "COMPACT" | "PORTRAIT" | "DOSSIER";
  sections: StaffSection[];
  sourceArticleId: string | null;
  privateFacts: { label: string; value: string }[];
  privateNotes: string;
  academic: StaffAcademicInfo;
};
export type StaffProfile = {
  id: string;
  locale: string;
  draft: StaffDetails;
  live: StaffDetails | null;
  version: number;
  draftVersion: number;
  publishedDraftVersion: number | null;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
};
export type PublicStaff = {
  id: string;
  locale: string;
  details: StaffDetails;
  publishedAt: string;
};
export function staffStatus(profile: StaffProfile) {
  return !profile.live
    ? "DRAFT"
    : profile.draftVersion === profile.publishedDraftVersion
      ? "PUBLISHED"
      : "CHANGED";
}
export const staffTemplateLabels = {
  EDITORIAL: "Hồ sơ biên tập",
  ACADEMIC: "Lý lịch học thuật",
  COMPACT: "Gọn",
  PORTRAIT: "Chân dung",
  DOSSIER: "Hồ sơ khoa học",
};
