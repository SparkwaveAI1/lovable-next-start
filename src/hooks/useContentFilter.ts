import { useState, useMemo } from 'react';

interface FilterableItem {
  tags?: string[];
  [key: string]: any;
}

interface UseContentFilterOptions<T extends FilterableItem> {
  items: T[];
  searchFields: (keyof T)[];
  categoryField?: keyof T;
}

interface UseContentFilterResult<T> {
  filteredItems: T[];
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  categoryFilter: string;
  setCategoryFilter: (category: string) => void;
  tagFilter: string;
  setTagFilter: (tag: string) => void;
  availableTags: string[];
  totalCount: number;
  filteredCount: number;
}

export function useContentFilter<T extends FilterableItem>({
  items,
  searchFields,
  categoryField,
}: UseContentFilterOptions<T>): UseContentFilterResult<T> {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState("all");

  // Extract unique tags from all items
  const availableTags = useMemo(() => {
    const tags = new Set<string>();
    items.forEach(item => {
      item.tags?.forEach(tag => tags.add(tag));
    });
    return Array.from(tags).sort();
  }, [items]);

  // Filter items based on current filter state
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      // Search across specified fields
      const matchesSearch = !searchTerm || searchFields.some(field => {
        const value = item[field];
        if (typeof value === 'string') {
          return value.toLowerCase().includes(searchTerm.toLowerCase());
        }
        if (Array.isArray(value)) {
          return value.some(v =>
            typeof v === 'string' && v.toLowerCase().includes(searchTerm.toLowerCase())
          );
        }
        return false;
      });

      // Category filter (platform, type, etc.)
      const matchesCategory = !categoryField ||
        categoryFilter === 'all' ||
        item[categoryField] === categoryFilter;

      // Tag filter
      const matchesTag = tagFilter === 'all' || item.tags?.includes(tagFilter);

      return matchesSearch && matchesCategory && matchesTag;
    });
  }, [items, searchTerm, searchFields, categoryField, categoryFilter, tagFilter]);

  return {
    filteredItems,
    searchTerm,
    setSearchTerm,
    categoryFilter,
    setCategoryFilter,
    tagFilter,
    setTagFilter,
    availableTags,
    totalCount: items.length,
    filteredCount: filteredItems.length,
  };
}
