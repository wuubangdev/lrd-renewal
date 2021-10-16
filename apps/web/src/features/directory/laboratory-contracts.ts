import type { StaffSection, StaffDetails } from "./contracts";

export type LabEquipment = {
  name: string;
  quantity: string;
  description: string;
  imageId: string | null;
  imageAlt: string;
};
export type LabCourse = {
  name: string;
  code: string;
  level: "UNDERGRADUATE" | "POSTGRADUATE";
  description: string;
};
export type LabPublication = { citation: string; year: string; url: string };
export type LabContent = {
  overview: string;
  functions: string;
  duties: string;
  researchDescription: string;
  researchAreas: string[];
  equipment: LabEquipment[];
  courses: LabCourse[];
  publications: LabPublication[];
  additionalNotes: string;
};

export type LaboratoryDetails = {
  name: string;
  slug: string;
  shortName: string;
  lead: string;
  location: string;
  email: string;
  phone: string;
  summary: string;
  coverId: string | null;
  coverAlt: string;
  template: StaffDetails["template"];
  sections: StaffSection[];
  sourceArticleId: string | null;
  content: LabContent;
};
export type LaboratoryProfile = {
  id: string;
  locale: string;
  draft: LaboratoryDetails;
  live: LaboratoryDetails | null;
  version: number;
  draftVersion: number;
  publishedDraftVersion: number | null;
  publishedAt: string | null;
};
export type PublicLaboratory = {
  id: string;
  locale: string;
  details: LaboratoryDetails;
  publishedAt: string;
};
