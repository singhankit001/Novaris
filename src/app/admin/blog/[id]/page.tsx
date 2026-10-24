import BlogEditor from "@/components/admin/BlogEditor";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";

export default async function EditBlogPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  // Try to find by ID first (internal prisma ID)
  const post = await prisma.blogPost.findUnique({
    where: { id }
  });

  if (!post) {
    notFound();
  }

  return <BlogEditor initialPost={post} />;
}
