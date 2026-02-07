// Blog post loading utility
// Uses Vite's glob import to load all MDX files

import { ComponentType } from 'react';

export interface BlogPostMeta {
  title: string;
  date: string;
  author: string;
  excerpt: string;
  tags: string[];
  slug: string;
  image?: string;
}

export interface BlogPost {
  meta: BlogPostMeta;
  Component: ComponentType;
}

// Import all MDX files from content/blog
const blogModules = import.meta.glob('../content/blog/*.mdx', { eager: true }) as Record<
  string,
  { default: ComponentType; frontmatter: Omit<BlogPostMeta, 'slug'> & { slug?: string } }
>;

// Process and sort blog posts
export function getAllPosts(): BlogPost[] {
  const posts: BlogPost[] = [];

  for (const [path, module] of Object.entries(blogModules)) {
    // Extract slug from filename if not in frontmatter
    const filename = path.split('/').pop()?.replace('.mdx', '') || '';
    const slug = module.frontmatter.slug || filename;

    posts.push({
      meta: {
        ...module.frontmatter,
        slug,
      },
      Component: module.default,
    });
  }

  // Sort by date descending (newest first)
  return posts.sort((a, b) => 
    new Date(b.meta.date).getTime() - new Date(a.meta.date).getTime()
  );
}

// Get a single post by slug
export function getPostBySlug(slug: string): BlogPost | undefined {
  const posts = getAllPosts();
  return posts.find((post) => post.meta.slug === slug);
}

// Get posts by tag
export function getPostsByTag(tag: string): BlogPost[] {
  const posts = getAllPosts();
  return posts.filter((post) => post.meta.tags.includes(tag));
}

// Get all unique tags
export function getAllTags(): string[] {
  const posts = getAllPosts();
  const tagSet = new Set<string>();
  posts.forEach((post) => post.meta.tags.forEach((tag) => tagSet.add(tag)));
  return Array.from(tagSet).sort();
}
