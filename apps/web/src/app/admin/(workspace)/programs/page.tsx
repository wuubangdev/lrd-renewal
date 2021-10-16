import { adminList, type Query } from "@/features/academics/server-pages";
export default async function Page({ searchParams }: { searchParams: Promise<Query> }) {
  return adminList("programs", await searchParams);
}
