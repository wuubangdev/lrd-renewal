import { adminList, type Query } from "@/features/academics/server-pages";
export default async function Page({ searchParams }: { searchParams: Promise<Query> }) {
  return adminList("admissions", await searchParams);
}
