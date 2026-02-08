import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ImportRequest {
  listName: string
  listDescription?: string
  businessId?: string  // sparkwave, personaai, fight-flow, charx
  csv: string  // CSV content: email,first_name,last_name,company (header optional)
}

// Map business names to UUIDs
const businessMap: Record<string, string> = {
  'sparkwave': '5a9bbfcf-fae5-4063-9780-bcbe366bae88',
  'personaai': '18d0dbb1-a82d-4477-a9f8-816a1fa2ee08',
  'fight-flow': '456dc53b-d9d9-41b0-bc33-4f4c4a791eff',
  'charx': '350b8fcb-9bfe-4b53-9548-c6ffdb1d3cb5'
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const body: ImportRequest = await req.json()
    const { listName, listDescription, businessId, csv } = body

    if (!listName || !csv) {
      return new Response(
        JSON.stringify({ success: false, error: 'listName and csv are required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    const resolvedBusinessId = businessMap[businessId?.toLowerCase()] || businessId || businessMap['sparkwave']

    // Parse CSV
    const lines = csv.trim().split('\n')
    const hasHeader = lines[0].toLowerCase().includes('email')
    const dataLines = hasHeader ? lines.slice(1) : lines

    // Create or get list
    let listId: string
    const { data: existingList } = await supabase
      .from('email_lists')
      .select('id')
      .eq('name', listName)
      .eq('business_id', resolvedBusinessId)
      .single()

    if (existingList) {
      listId = existingList.id
    } else {
      const { data: newList, error: listError } = await supabase
        .from('email_lists')
        .insert({ name: listName, description: listDescription, business_id: resolvedBusinessId })
        .select('id')
        .single()

      if (listError) throw listError
      listId = newList.id
    }

    // Get existing subscribers for this business
    const { data: existingSubscribers } = await supabase
      .from('email_subscribers')
      .select('id, email')
      .eq('business_id', resolvedBusinessId)

    const emailToSubscriberId = new Map<string, string>()
    for (const sub of existingSubscribers || []) {
      emailToSubscriberId.set(sub.email.toLowerCase(), sub.id)
    }

    // Get existing list members
    const { data: existingMembers } = await supabase
      .from('email_list_members')
      .select('subscriber_id')
      .eq('list_id', listId)

    const existingMemberIds = new Set((existingMembers || []).map(m => m.subscriber_id))

    // Process CSV rows
    const newSubscribers: any[] = []
    const newMembers: any[] = []
    const errors: string[] = []
    let skipped = 0
    let imported = 0

    for (const line of dataLines) {
      if (!line.trim()) continue

      const parts = line.split(',').map(p => p.trim().replace(/^"|"$/g, ''))
      const email = parts[0]?.toLowerCase()
      const firstName = parts[1] || null
      const lastName = parts[2] || null
      const company = parts[3] || null

      // Validate email
      if (!email || !email.includes('@')) {
        errors.push(`Invalid email: ${parts[0]}`)
        continue
      }

      let subscriberId = emailToSubscriberId.get(email)

      // Create subscriber if doesn't exist
      if (!subscriberId) {
        const { data: newSub, error: subError } = await supabase
          .from('email_subscribers')
          .insert({
            business_id: resolvedBusinessId,
            email,
            first_name: firstName,
            last_name: lastName,
            status: 'active',
            source: 'import',
            metadata: company ? { company } : null
          })
          .select('id')
          .single()

        if (subError) {
          errors.push(`Error adding ${email}: ${subError.message}`)
          continue
        }
        subscriberId = newSub.id
        emailToSubscriberId.set(email, subscriberId)
      }

      // Add to list if not already a member
      if (!existingMemberIds.has(subscriberId)) {
        newMembers.push({
          list_id: listId,
          subscriber_id: subscriberId
        })
        existingMemberIds.add(subscriberId)
        imported++
      } else {
        skipped++
      }
    }

    // Batch insert list members
    if (newMembers.length > 0) {
      const { error: memberError } = await supabase
        .from('email_list_members')
        .insert(newMembers)

      if (memberError) throw memberError
    }

    return new Response(
      JSON.stringify({
        success: true,
        listId,
        listName,
        imported,
        skipped,
        errors: errors.slice(0, 10)
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Import error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
