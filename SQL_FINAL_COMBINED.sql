-- ============================================================
-- SETUP GLOBAL PROCTOR KITCHEN (SÉCURITÉ + ÉVÉNEMENTS)
-- ============================================================

-- 1. CONFIGURATION DES ÉVÉNEMENTS (PROJECTS)
-- ------------------------------------------
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    event_date DATE NOT NULL DEFAULT CURRENT_DATE,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL -- 'apero', 'cocktails', 'mariage', 'evenement'
);

-- Sécurité pour les projets
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public projects are viewable by everyone" ON public.projects;
DROP POLICY IF EXISTS "Authenticated users can manage projects" ON public.projects;

CREATE POLICY "Public projects are viewable by everyone" ON public.projects FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage projects" ON public.projects FOR ALL USING (auth.role() = 'authenticated');


-- 2. CONFIGURATION DE LA GALERIE
-- ------------------------------
CREATE TABLE IF NOT EXISTS public.gallery (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    image_url TEXT NOT NULL,
    category TEXT NOT NULL,
    title TEXT,
    project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL -- Lien vers l'événement
);

-- [IMPORTANT] Si la table existe déjà, on s'assure que project_id est présent
ALTER TABLE public.gallery ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;

-- Sécurité pour la galerie
ALTER TABLE public.gallery ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.gallery;
DROP POLICY IF EXISTS "Authenticated users can insert" ON public.gallery;
DROP POLICY IF EXISTS "Authenticated users can update" ON public.gallery;
DROP POLICY IF EXISTS "Authenticated users can delete" ON public.gallery;

CREATE POLICY "Public profiles are viewable by everyone" ON public.gallery FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert" ON public.gallery FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update" ON public.gallery FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete" ON public.gallery FOR DELETE USING (auth.role() = 'authenticated');


-- 3. CONFIGURATION DU STOCKAGE (IMAGES)
-- -------------------------------------
INSERT INTO storage.buckets (id, name, public) VALUES ('images', 'images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Delete" ON storage.objects;

CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING ( bucket_id = 'images' );
CREATE POLICY "Authenticated Upload" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'images' AND auth.role() = 'authenticated' );
CREATE POLICY "Authenticated Delete" ON storage.objects FOR DELETE USING ( bucket_id = 'images' AND auth.role() = 'authenticated' );


-- 4. CONFIGURATION DES MESSAGES
-- ------------------------------
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    event_type TEXT,
    message TEXT,
    is_read BOOLEAN DEFAULT false,
    notified BOOLEAN DEFAULT false
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can insert messages" ON public.messages;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.messages;
DROP POLICY IF EXISTS "Enable update for all users" ON public.messages;
DROP POLICY IF EXISTS "Enable delete for all users" ON public.messages;

CREATE POLICY "Public can insert messages" ON public.messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable read access for all users" ON public.messages FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable update for all users" ON public.messages FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Enable delete for all users" ON public.messages FOR DELETE USING (auth.role() = 'authenticated');


-- 5. ACTIVATION DU TEMPS RÉEL (REALTIME)
-- --------------------------------------
DO $$
BEGIN
  -- Activation pour messages
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'messages') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
  
  -- Activation pour gallery
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'gallery') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.gallery;
  END IF;

  -- Activation pour projects
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'projects') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.projects;
  END IF;
END
$$;
