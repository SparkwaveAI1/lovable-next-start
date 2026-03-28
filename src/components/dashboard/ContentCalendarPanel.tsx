import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, CalendarDays } from 'lucide-react';
import { format, parseISO } from 'date-fns';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ContentItem {
  id: string;
  title: string;
  brand: string | null;
  platform: string | null;
  status: string;
  abby_status: string | null;
  publish_date: string | null;
  published_at: string | null;
  created_at: string;
  campaign: string | null;
  target_keyword: string | null;
}

type DateRange = 'last7' | 'last30' | 'next14';

// ─── Brand badge ──────────────────────────────────────────────────────────────

const BRAND_COLORS: Record<string, string> = {
  sparkwave:  'bg-blue-100 text-blue-700',
  personaai:  'bg-purple-100 text-purple-700',
  charx:      'bg-orange-100 text-orange-700',
  fightflow:  'bg-red-100 text-red-700',
  dogoodNow:  'bg-green-100 text-green-700',
  dogoonow:   'bg-green-100 text-green-700',
};

function BrandBadge({ brand }: { brand: string | null }) {
  const key = (brand ?? '').toLowerCase().replace(/[-_ ]/g, '');
  const cls = BRAND_COLORS[key] ?? 'bg-gray-100 text-gray-600';
  return (
    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${cls}`}>
      {brand ?? 'unknown'}
    </span>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  published: 'bg-green-100 text-green-700 border-green-200',
  scheduled: 'bg-blue-100 text-blue-700 border-blue-200',
  ready:     'bg-amber-100 text-amber-700 border-amber-200',
  draft:     'bg-gray-100 text-gray-600 border-gray-200',
  archived:  'bg-gray-50 text-gray-400 border-gray-100',
};

function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-600 border-gray-200';
  return (
    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${cls}`}>
      {status.toUpperCase()}
    </span>
  );
}

// ─── Platform icon ────────────────────────────────────────────────────────────

const PLATFORM_ICON: Record<string, string> = {
  twitter:  '🐦',
  linkedin: '💼',
  blog:     '📝',
  tiktok:   '🎵',
};

function platformIcon(platform: string | null): string {
  return PLATFORM_ICON[(platform ?? '').toLowerCase()] ?? '📄';
}

// ─── Date display ─────────────────────────────────────────────────────────────

function displayDate(item: ContentItem): string {
  const raw =
    item.status === 'published' ? item.published_at :
    item.status === 'scheduled' ? item.publish_date :
    item.created_at;
  if (!raw) return '—';
  try {
    return format(parseISO(raw), 'MMM d, yyyy');
  } catch {
    return raw;
  }
}

// ─── Single card ──────────────────────────────────────────────────────────────

function ContentCard({ item }: { item: ContentItem }) {
  const title = item.title.length > 60 ? item.title.slice(0, 57) + '…' : item.title;
  return (
    <div className="flex items-start gap-2 px-3 py-2 rounded-lg border border-gray-100 bg-white hover:bg-gray-50 transition-colors">
      <span className="text-base mt-0.5">{platformIcon(item.platform)}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
          <BrandBadge brand={item.brand} />
          <StatusBadge status={item.status} />
        </div>
        <p className="text-sm font-medium text-gray-800 leading-snug truncate">{title}</p>
        <p className="text-xs text-gray-400 mt-0.5">{displayDate(item)}</p>
      </div>
    </div>
  );
}

// ─── Group section ────────────────────────────────────────────────────────────

interface GroupProps {
  label: string;
  status: string;
  items: ContentItem[];
  defaultExpanded: boolean;
}

function StatusGroup({ label, items, defaultExpanded }: GroupProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className="mb-3">
      <button
        className="w-full flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-700">{label}</span>
          <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full font-medium">
            {items.length}
          </span>
        </div>
        {expanded
          ? <ChevronUp className="h-3.5 w-3.5 text-gray-400" />
          : <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
        }
      </button>
      {expanded && (
        <div className="mt-1.5 flex flex-col gap-1.5 pl-1">
          {items.length === 0 ? (
            <p className="text-xs text-gray-400 px-2 py-1">No items</p>
          ) : (
            items.map(item => <ContentCard key={item.id} item={item} />)
          )}
        </div>
      )}
    </div>
  );
}

// ─── Summary row ──────────────────────────────────────────────────────────────

interface SummaryProps {
  items: ContentItem[];
}

function SummaryRow({ items }: SummaryProps) {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
  const today = new Date(now.toDateString());

  const weekItems = items.filter(i => {
    const createdAt = i.created_at ? new Date(i.created_at) : null;
    const publishDate = i.publish_date ? new Date(i.publish_date) : null;
    return (createdAt && createdAt >= weekAgo) || (publishDate && publishDate >= today);
  });

  const published = weekItems.filter(i => i.status === 'published').length;
  const scheduled = weekItems.filter(i => i.status === 'scheduled').length;
  const pendingReview = weekItems.filter(i => i.abby_status === 'pending').length;

  return (
    <div className="flex items-center gap-3 flex-wrap text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2 mb-4">
      <span className="font-medium text-gray-500">This week:</span>
      <span>
        <span className="font-semibold text-green-700">{published}</span> published
      </span>
      <span className="text-gray-300">|</span>
      <span>
        <span className="font-semibold text-blue-700">{scheduled}</span> scheduled
      </span>
      <span className="text-gray-300">|</span>
      <span>
        <span className="font-semibold text-amber-600">{pendingReview}</span> pending review
      </span>
    </div>
  );
}

// ─── Filters ──────────────────────────────────────────────────────────────────

const BRANDS = ['sparkwave', 'personaai', 'charx', 'fightflow', 'dogoodNow'];
const PLATFORMS = ['Twitter', 'LinkedIn', 'Blog', 'TikTok'];

interface FiltersProps {
  brand: string;
  platform: string;
  dateRange: DateRange;
  onBrand: (v: string) => void;
  onPlatform: (v: string) => void;
  onDateRange: (v: DateRange) => void;
}

function Filters({ brand, platform, dateRange, onBrand, onPlatform, onDateRange }: FiltersProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap mb-4">
      <select
        value={brand}
        onChange={e => onBrand(e.target.value)}
        className="text-xs border border-gray-200 rounded px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-300"
      >
        <option value="">All Brands</option>
        {BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
      </select>
      <select
        value={platform}
        onChange={e => onPlatform(e.target.value)}
        className="text-xs border border-gray-200 rounded px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-300"
      >
        <option value="">All Platforms</option>
        {PLATFORMS.map(p => <option key={p} value={p.toLowerCase()}>{p}</option>)}
      </select>
      <select
        value={dateRange}
        onChange={e => onDateRange(e.target.value as DateRange)}
        className="text-xs border border-gray-200 rounded px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-300"
      >
        <option value="last7">Last 7d</option>
        <option value="last30">Last 30d</option>
        <option value="next14">Next 14d</option>
      </select>
    </div>
  );
}

// ─── Date range filter logic ──────────────────────────────────────────────────

function applyDateRange(items: ContentItem[], range: DateRange): ContentItem[] {
  const now = new Date();
  if (range === 'last7') {
    const cutoff = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
    return items.filter(i => i.published_at && new Date(i.published_at) >= cutoff);
  }
  if (range === 'last30') {
    const cutoff = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
    return items.filter(i => i.published_at && new Date(i.published_at) >= cutoff);
  }
  if (range === 'next14') {
    const today = new Date(now.toDateString());
    const end = new Date(today.getTime() + 14 * 24 * 3600 * 1000);
    return items.filter(i => {
      if (!i.publish_date) return false;
      const d = new Date(i.publish_date);
      return d >= today && d <= end;
    });
  }
  return items;
}

// ─── Main component ───────────────────────────────────────────────────────────

const STATUS_GROUPS = [
  { status: 'published', label: 'Published', defaultExpanded: true },
  { status: 'scheduled', label: 'Scheduled', defaultExpanded: true },
  { status: 'ready',     label: 'Ready',     defaultExpanded: false },
  { status: 'draft',     label: 'Draft',     defaultExpanded: false },
];

export function ContentCalendarPanel() {
  const [allItems, setAllItems] = useState<ContentItem[]>([]);
  const [loadState, setLoadState] = useState<'loading' | 'loaded' | 'error'>('loading');

  // Filters
  const [brandFilter, setBrandFilter] = useState('');
  const [platformFilter, setPlatformFilter] = useState('');
  const [dateRange, setDateRange] = useState<DateRange>('last30');

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('content_calendar')
      .select('id,title,brand,platform,status,abby_status,publish_date,published_at,created_at,campaign,target_keyword')
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) {
      console.error('[ContentCalendarPanel] load error', error);
      setLoadState('error');
      return;
    }
    setAllItems((data as ContentItem[]) ?? []);
    setLoadState('loaded');
  }, []);

  useEffect(() => {
    load();

    // Realtime subscription
    const channel = supabase
      .channel('content_calendar_changes')
      .on(
        'postgres_changes' as any,
        { event: '*', schema: 'public', table: 'content_calendar' },
        () => { load(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [load]);

  // Apply filters
  const filtered = (() => {
    let items = [...allItems];

    if (brandFilter) {
      items = items.filter(i =>
        (i.brand ?? '').toLowerCase().replace(/[-_ ]/g, '') ===
        brandFilter.toLowerCase().replace(/[-_ ]/g, '')
      );
    }
    if (platformFilter) {
      items = items.filter(i => (i.platform ?? '').toLowerCase() === platformFilter);
    }

    // For date range: apply to non-draft items; drafts always shown unless brand/platform filtered
    const rangeFiltered = applyDateRange(items, dateRange);
    const drafts = items.filter(i => i.status === 'draft' && !rangeFiltered.includes(i));

    // Merge: rangeFiltered + drafts that weren't included
    return rangeFiltered;
  })();

  const grouped = STATUS_GROUPS.map(g => ({
    ...g,
    items: filtered.filter(i => i.status === g.status),
  }));

  return (
    <Card className="border border-gray-200 shadow-sm">
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-indigo-50 rounded-md">
            <CalendarDays className="h-4 w-4 text-indigo-600" />
          </div>
          <CardTitle className="text-base font-semibold text-gray-900">
            Content Calendar
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {/* Summary row */}
        <SummaryRow items={allItems} />

        {/* Filters */}
        <Filters
          brand={brandFilter}
          platform={platformFilter}
          dateRange={dateRange}
          onBrand={setBrandFilter}
          onPlatform={setPlatformFilter}
          onDateRange={setDateRange}
        />

        {/* Status groups */}
        {loadState === 'loading' && (
          <div className="flex items-center justify-center py-8 text-sm text-gray-400">
            Loading content calendar…
          </div>
        )}
        {loadState === 'error' && (
          <div className="flex items-center justify-center py-8 text-sm text-red-400">
            Failed to load content calendar. Table may not exist yet.
          </div>
        )}
        {loadState === 'loaded' && (
          <div>
            {grouped.map(g => (
              <StatusGroup
                key={g.status}
                label={g.label}
                status={g.status}
                items={g.items}
                defaultExpanded={g.defaultExpanded}
              />
            ))}
            {filtered.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">No content items match the current filters.</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
