import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Import Email List - CSV to email_lists + email_subscribers
 * 
 * Accepts CSV data (inline or URL), creates/finds list, adds subscribers.
 * Deduplicates by email within the business.
 * 
 * Usage:
 *   POST /import-email-list
 *   {
 *     "business_id": "uuid",
 *     "listName": "Sparkwave Prospects",
 *     "listDescription": "Optional description",
 *     "csv": "email,name,company\njohn@example.com,John Smith,Acme Corp",
 *     // OR
 *     "csvUrl": "https://..."
 *   }
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ImportRequest {
  business_id: string;
  listName: string;
  listDescription?: string;
  csv?: string;
  csvUrl?: string;
  source?: string; // For tracking where imports came from
}

interface ParsedRow {
  email: string;
  first_name?: string;
  last_name?: string;
  name?: string;
  company?: string;
  [key: string]: string | undefined;
}

function parseCSV(csvText: string): ParsedRow[] {
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  // Parse header row
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  
  const rows: ParsedRow[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Handle quoted values in CSV
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    
    const row: ParsedRow = { email: '' };
    headers.forEach((header, idx) => {
      if (values[idx]) {
        row[header] = values[idx];
      }
    });
    
    // Normalize email field variations
    const email = row.email || row['e-mail'] || row['email_address'] || row['emailaddress'];
    if (email && email.includes('@')) {
      row.email = email.toLowerCase().trim();
      
      // Handle name splitting if only "name" provided
      if (row.name && !row.first_name) {
        const nameParts = row.name.trim().split(/\s+/);
        row.first_name = nameParts[0];
        if (nameParts.length > 1) {
          row.last_name = nameParts.slice(1).join(' ');
        }
      }
      
      rows.push(row);
    }
  }
  
  return rows;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase configuration missing');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const body: ImportRequest = await req.json();
    
    const { business_id, listName, listDescription, csv, csvUrl, source = 'csv_import' } = body;

    if (!business_id) {
      throw new Error('business_id required');
    }
    
    if (!listName) {
      throw new Error('listName required');
    }
    
    if (!csv && !csvUrl) {
      throw new Error('Either csv or csvUrl required');
    }

    // Get CSV content
    let csvContent = csv;
    if (csvUrl) {
      console.log(`Fetching CSV from: ${csvUrl}`);
      const response = await fetch(csvUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch CSV: ${response.status}`);
      }
      csvContent = await response.text();
    }

    // Parse CSV
    const rows = parseCSV(csvContent!);
    console.log(`Parsed ${rows.length} rows from CSV`);

    if (rows.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'No valid rows found in CSV',
        results: { imported: 0, skipped: 0, duplicates: 0 }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Create or find the list
    let listId: string;
    
    const { data: existingList } = await supabase
      .from('email_lists')
      .select('id')
      .eq('business_id', business_id)
      .eq('name', listName)
      .single();

    if (existingList) {
      listId = existingList.id;
      console.log(`Using existing list: ${listId}`);
    } else {
      const { data: newList, error: listError } = await supabase
        .from('email_lists')
        .insert({
          business_id,
          name: listName,
          description: listDescription || `Imported from CSV on ${new Date().toISOString().split('T')[0]}`,
        })
        .select('id')
        .single();

      if (listError) {
        throw new Error(`Failed to create list: ${listError.message}`);
      }
      
      listId = newList.id;
      console.log(`Created new list: ${listId}`);
    }

    // Get existing subscribers for this business (for deduplication)
    const emails = rows.map(r => r.email);
    const { data: existingSubscribers } = await supabase
      .from('email_subscribers')
      .select('id, email')
      .eq('business_id', business_id)
      .in('email', emails);

    const existingEmailMap = new Map(
      (existingSubscribers || []).map(s => [s.email, s.id])
    );

    // Get existing list members (to avoid duplicate links)
    const { data: existingMembers } = await supabase
      .from('email_list_members')
      .select('subscriber_id')
      .eq('list_id', listId);

    const existingMemberIds = new Set(
      (existingMembers || []).map(m => m.subscriber_id)
    );

    const results = {
      imported: 0,
      skipped: 0,
      duplicates: 0,
      errors: [] as string[]
    };

    const subscribersToCreate: any[] = [];
    const membersToLink: { subscriber_id: string }[] = [];

    // Process each row
    for (const row of rows) {
      const existingId = existingEmailMap.get(row.email);
      
      if (existingId) {
        // Subscriber already exists
        if (existingMemberIds.has(existingId)) {
          // Already in this list
          results.duplicates++;
        } else {
          // Add to list
          membersToLink.push({ subscriber_id: existingId });
          results.imported++;
        }
      } else {
        // Need to create new subscriber
        subscribersToCreate.push({
          business_id,
          email: row.email,
          first_name: row.first_name || null,
          last_name: row.last_name || null,
          source,
          metadata: row.company ? { company: row.company } : {},
        });
      }
    }

    // Batch insert new subscribers
    if (subscribersToCreate.length > 0) {
      const { data: newSubscribers, error: subError } = await supabase
        .from('email_subscribers')
        .insert(subscribersToCreate)
        .select('id');

      if (subError) {
        console.error('Error inserting subscribers:', subError);
        results.errors.push(`Failed to insert some subscribers: ${subError.message}`);
      } else if (newSubscribers) {
        // Add all new subscribers to the members list
        for (const sub of newSubscribers) {
          membersToLink.push({ subscriber_id: sub.id });
        }
        results.imported += newSubscribers.length;
      }
    }

    // Batch insert list memberships
    if (membersToLink.length > 0) {
      const memberInserts = membersToLink.map(m => ({
        list_id: listId,
        subscriber_id: m.subscriber_id,
      }));

      const { error: memberError } = await supabase
        .from('email_list_members')
        .insert(memberInserts);

      if (memberError) {
        console.error('Error inserting members:', memberError);
        results.errors.push(`Failed to link some members: ${memberError.message}`);
      }
    }

    console.log(`Import complete: ${results.imported} imported, ${results.duplicates} duplicates, ${results.skipped} skipped`);

    // Log the import
    try {
      await supabase.from('automation_logs').insert({
        business_id,
        automation_type: 'email_list_import',
        status: results.errors.length === 0 ? 'success' : 'partial',
        source_data: { listName, source, row_count: rows.length },
        processed_data: results,
      });
    } catch (logErr) {
      console.error('Failed to log import:', logErr);
    }

    return new Response(JSON.stringify({
      success: true,
      listId,
      listName,
      results: {
        total_rows: rows.length,
        imported: results.imported,
        duplicates: results.duplicates,
        skipped: results.skipped,
        errors: results.errors.length > 0 ? results.errors : undefined,
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Import error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
