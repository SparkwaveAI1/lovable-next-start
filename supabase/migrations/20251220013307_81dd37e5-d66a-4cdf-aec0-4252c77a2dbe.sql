-- ============================================
-- TIGHTEN RLS POLICIES FOR BUSINESS ISOLATION
-- ============================================

-- STAGED_CONTENT: Replace permissive policies with business-scoped access
DROP POLICY IF EXISTS "Authenticated users can view staged content" ON public.staged_content;
DROP POLICY IF EXISTS "Authenticated users can manage staged content" ON public.staged_content;

CREATE POLICY "Users can view staged content for accessible businesses"
ON public.staged_content FOR SELECT
TO authenticated
USING (public.can_access_business(business_id));

CREATE POLICY "Users can insert staged content for accessible businesses"
ON public.staged_content FOR INSERT
TO authenticated
WITH CHECK (public.can_access_business(business_id));

CREATE POLICY "Users can update staged content for accessible businesses"
ON public.staged_content FOR UPDATE
TO authenticated
USING (public.can_access_business(business_id))
WITH CHECK (public.can_access_business(business_id));

CREATE POLICY "Users can delete staged content for accessible businesses"
ON public.staged_content FOR DELETE
TO authenticated
USING (public.can_access_business(business_id));


-- STAGING_MEDIA: Replace permissive policies with business-scoped access
DROP POLICY IF EXISTS "Authenticated users can view staging media" ON public.staging_media;
DROP POLICY IF EXISTS "Authenticated users can manage staging media" ON public.staging_media;

CREATE POLICY "Users can view staging media for accessible businesses"
ON public.staging_media FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.staged_content sc
    WHERE sc.id = staging_media.staged_content_id
    AND public.can_access_business(sc.business_id)
  )
);

CREATE POLICY "Users can insert staging media for accessible businesses"
ON public.staging_media FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.staged_content sc
    WHERE sc.id = staged_content_id
    AND public.can_access_business(sc.business_id)
  )
);

CREATE POLICY "Users can update staging media for accessible businesses"
ON public.staging_media FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.staged_content sc
    WHERE sc.id = staging_media.staged_content_id
    AND public.can_access_business(sc.business_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.staged_content sc
    WHERE sc.id = staged_content_id
    AND public.can_access_business(sc.business_id)
  )
);

CREATE POLICY "Users can delete staging media for accessible businesses"
ON public.staging_media FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.staged_content sc
    WHERE sc.id = staging_media.staged_content_id
    AND public.can_access_business(sc.business_id)
  )
);


-- SCHEDULED_CONTENT: Ensure business-scoped access
DROP POLICY IF EXISTS "Authenticated users can view scheduled content" ON public.scheduled_content;
DROP POLICY IF EXISTS "Authenticated users can manage scheduled content" ON public.scheduled_content;
DROP POLICY IF EXISTS "Users can view scheduled content for accessible businesses" ON public.scheduled_content;
DROP POLICY IF EXISTS "Users can manage scheduled content for accessible businesses" ON public.scheduled_content;

CREATE POLICY "Users can view scheduled content for accessible businesses"
ON public.scheduled_content FOR SELECT
TO authenticated
USING (public.can_access_business(business_id));

CREATE POLICY "Users can insert scheduled content for accessible businesses"
ON public.scheduled_content FOR INSERT
TO authenticated
WITH CHECK (public.can_access_business(business_id));

CREATE POLICY "Users can update scheduled content for accessible businesses"
ON public.scheduled_content FOR UPDATE
TO authenticated
USING (public.can_access_business(business_id))
WITH CHECK (public.can_access_business(business_id));

CREATE POLICY "Users can delete scheduled content for accessible businesses"
ON public.scheduled_content FOR DELETE
TO authenticated
USING (public.can_access_business(business_id));


-- MEDIA_ASSETS: Ensure business-scoped access
DROP POLICY IF EXISTS "Authenticated users can view media assets" ON public.media_assets;
DROP POLICY IF EXISTS "Authenticated users can manage media assets" ON public.media_assets;
DROP POLICY IF EXISTS "Users can view media assets for accessible businesses" ON public.media_assets;
DROP POLICY IF EXISTS "Users can manage media assets for accessible businesses" ON public.media_assets;

CREATE POLICY "Users can view media assets for accessible businesses"
ON public.media_assets FOR SELECT
TO authenticated
USING (public.can_access_business(business_id));

CREATE POLICY "Users can insert media assets for accessible businesses"
ON public.media_assets FOR INSERT
TO authenticated
WITH CHECK (public.can_access_business(business_id));

CREATE POLICY "Users can update media assets for accessible businesses"
ON public.media_assets FOR UPDATE
TO authenticated
USING (public.can_access_business(business_id))
WITH CHECK (public.can_access_business(business_id));

CREATE POLICY "Users can delete media assets for accessible businesses"
ON public.media_assets FOR DELETE
TO authenticated
USING (public.can_access_business(business_id));