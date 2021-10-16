import { FooterContent } from "./public-footer";
import { HeaderContent } from "./public-header";
import { optionalPublicHome, publicMenu } from "@/features/site/server";
export async function PublicHeader({ locale = "vi" }: { locale?: string }) {
  const menu = await publicMenu(locale);
  return <HeaderContent data={menu} />;
}
export async function PublicFooter({ locale = "vi" }: { locale?: string }) {
  const home = await optionalPublicHome(locale);
  const isVi = locale === "vi";
  const footer = home?.content.footer ?? {
    description: isVi
      ? "Bộ môn Tài nguyên Đất đai · Khoa Môi trường và Tài nguyên thiên nhiên · Đại học Cần Thơ."
      : "Land Resources Department · College of Environment and Natural Resources · Can Tho University.",
    address: isVi
      ? "Khu II, đường 3/2, phường Ninh Kiều, thành phố Cần Thơ"
      : "Campus II, 3/2 Street, Ninh Kieu Ward, Can Tho City",
    email: "ptvu@ctu.edu.vn",
  };
  return <FooterContent locale={locale} footer={footer} />;
}
