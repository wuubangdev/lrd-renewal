export type Kind = "programs" | "admissions";
export type Level = "UNDERGRADUATE" | "MASTER" | "DOCTORATE";
export const levels: Record<Level, string> = {
  UNDERGRADUATE: "Đại học",
  MASTER: "Thạc sĩ",
  DOCTORATE: "Tiến sĩ",
};
export const englishLevels: Record<Level, string> = {
  UNDERGRADUATE: "Undergraduate",
  MASTER: "Master's",
  DOCTORATE: "Doctoral",
};
export const degrees = {
  BACHELOR: "Cử nhân",
  ENGINEER: "Kỹ sư",
  MASTER: "Thạc sĩ",
  DOCTOR: "Tiến sĩ",
};
export const admissionStatuses: Record<string, string> = {
  NOTICE: "Theo thông báo",
  UPCOMING: "Sắp mở đăng ký",
  OPEN: "Đang nhận hồ sơ",
  CLOSED: "Đã hết hạn",
  CLOSED_EARLY: "Đã đóng sớm",
  DRAFT: "Chưa công khai",
};
export const statuses: Record<string, string> = {
  DRAFT: "Bản nháp",
  PUBLISHED: "Đã công khai",
  CHANGED: "Có thay đổi mới",
  RETIRED: "Đã ngừng công khai",
};
export type Contact = { name: string; email: string; phone: string };
export type Course = {
  id: string;
  code: string;
  name: string;
  credits: number;
  semester: number;
  elective: boolean;
};
export type Curriculum = {
  id: string;
  name: string;
  cohort: string;
  current: boolean;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  documentUrl: string;
  courses: Course[];
};
export type Accreditation = {
  id: string;
  name: string;
  organization: string;
  issuedAt: string | null;
  expiresAt: string | null;
  evidenceUrl: string;
};
export type AcademicResource = { label: string; url: string };
export type SourceReference = { url: string; publishedOn: string | null; retrievedOn: string };
export type BaseDraft = {
  resources?: AcademicResource[];
  source?: SourceReference | null;
  title: string;
  slug: string;
  summary: string;
  description: string;
  contact: Contact;
  coverId: string | null;
  coverAlt: string;
};
export type ProgramDraft = BaseDraft & {
  degree: keyof typeof degrees;
  unit: string;
  durationMonths: number | null;
  credits: number | null;
  outcomes: string[];
  careers: string[];
  curricula: Curriculum[];
  accreditations: Accreditation[];
};
export type AdmissionDraft = BaseDraft & {
  year: number;
  programs: { programId: string; quota: number | null }[];
  opensAt: string | null;
  closesAt: string | null;
  applicationUrl: string;
  requirements: string;
  selectionMethod: string;
  schedule: { id: string; title: string; at: string | null; note: string }[];
};
export type AcademicView<T = ProgramDraft | AdmissionDraft> = {
  id: string;
  code: string;
  locale: string;
  level: Level;
  version: number;
  draftVersion: number;
  status: string;
  content: T;
  liveEditionId: string | null;
  publishedAt: string | null;
  updatedAt: string;
  admissionStatus: string | null;
  retirementReason: string;
  publicUrl: string | null;
};
export type Edition = {
  id: string;
  draftVersion: number | null;
  publishedAt: string;
  action: string;
  reason: string;
  content: ProgramDraft | AdmissionDraft;
};
export type EducationDocument = {
  id: string;
  kind: "PROGRAM" | "ADMISSION";
  code: string;
  locale: string;
  level: Level;
  slug: string;
  title: string;
  summary: string;
  coverId: string | null;
  year: number | null;
  opensAt: string | null;
  closesAt: string | null;
  closedAt: string | null;
  programIds: string[];
  publishedAt: string;
};
export type EducationResult = {
  items: EducationDocument[];
  total: number;
  page: number;
  size: number;
  asOf: string;
};
export type PublicProgram = {
  id: string;
  code: string;
  locale: string;
  level: Level;
  content: ProgramDraft;
  publishedAt: string | null;
  accreditations: Record<string, string>;
  admissions: EducationResult;
};
export type PublicAdmission = {
  id: string;
  code: string;
  locale: string;
  level: Level;
  content: AdmissionDraft;
  publishedAt: string | null;
  status: string;
  asOf: string;
  closedAt: string | null;
  closureReason: string;
  programs: {
    id: string;
    code: string;
    title: string;
    slug: string | null;
    quota: number | null;
  }[];
  deadlineChanges: { at: string; deadline: string; reason: string }[];
};
export const publicPath = (kind: Kind, locale: string, slug?: string) =>
  "/" + locale + (kind === "programs" ? "/dao-tao" : "/tuyen-sinh") + (slug ? "/" + slug : "");
export function admissionState(d: EducationDocument, now: string) {
  return d.closedAt
    ? "CLOSED_EARLY"
    : d.closesAt && new Date(now) >= new Date(d.closesAt)
      ? "CLOSED"
      : !d.opensAt || !d.closesAt
        ? "NOTICE"
        : new Date(now) < new Date(d.opensAt!)
          ? "UPCOMING"
          : new Date(now) < new Date(d.closesAt!)
            ? "OPEN"
            : "CLOSED";
}
export function timeLabel(value: string | null, locale = "vi") {
  return value
    ? new Intl.DateTimeFormat(locale === "vi" ? "vi-VN" : "en-GB", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Ho_Chi_Minh",
      }).format(new Date(value))
    : "—";
}
export function toLocalTime(value: string | null) {
  return value ? new Date(new Date(value).getTime() + 7 * 3600000).toISOString().slice(0, 16) : "";
}
export function fromLocalTime(value: string) {
  if (!value) return null;
  const date = new Date(value + ":00+07:00");
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
