import { db as prisma } from "@/lib/db";
import { Metadata } from "next";
import { LegalPageContent } from "@/components/legal/LegalPageContent";

export const revalidate = 3600; // Ревалидация раз в час

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const post = await prisma.contentItem.findUnique({
    where: { slug: resolvedParams.slug },
    select: { title: true, metaTitle: true, metaDescription: true },
  });

  if (!post) return { title: "Документ не найден" };

  return {
    title: post.metaTitle || post.title,
    description: post.metaDescription || "",
  };
}

export default async function LegalPage({ params }: PageProps) {
  const resolvedParams = await params;
  return <LegalPageContent slug={resolvedParams.slug} />;
}
