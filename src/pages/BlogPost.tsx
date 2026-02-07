import { useParams, Navigate } from 'react-router-dom';
import { getPostBySlug } from '@/lib/blog';
import { BlogLayout } from '@/components/blog/BlogLayout';
import { MDXProvider } from '@mdx-js/react';

// Custom MDX components for styling
const mdxComponents = {
  h1: (props: any) => <h1 className="text-3xl font-bold mt-8 mb-4" {...props} />,
  h2: (props: any) => <h2 className="text-2xl font-semibold mt-6 mb-3" {...props} />,
  h3: (props: any) => <h3 className="text-xl font-medium mt-4 mb-2" {...props} />,
  p: (props: any) => <p className="my-4 leading-7" {...props} />,
  ul: (props: any) => <ul className="my-4 ml-6 list-disc" {...props} />,
  ol: (props: any) => <ol className="my-4 ml-6 list-decimal" {...props} />,
  li: (props: any) => <li className="my-2" {...props} />,
  a: (props: any) => (
    <a className="text-primary underline hover:text-primary/80" {...props} />
  ),
  blockquote: (props: any) => (
    <blockquote
      className="border-l-4 border-primary pl-4 italic my-4"
      {...props}
    />
  ),
  code: (props: any) => (
    <code
      className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono"
      {...props}
    />
  ),
  pre: (props: any) => (
    <pre
      className="bg-muted p-4 rounded-lg overflow-x-auto my-4"
      {...props}
    />
  ),
  hr: () => <hr className="my-8 border-border" />,
  strong: (props: any) => <strong className="font-semibold" {...props} />,
};

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  
  if (!slug) {
    return <Navigate to="/blog" replace />;
  }

  const post = getPostBySlug(slug);

  if (!post) {
    return <Navigate to="/blog" replace />;
  }

  const { Component, meta } = post;

  return (
    <MDXProvider components={mdxComponents}>
      <BlogLayout meta={meta}>
        <Component />
      </BlogLayout>
    </MDXProvider>
  );
}
