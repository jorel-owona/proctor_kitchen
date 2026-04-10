-- 1. CRÉATION DE LA TABLE DES ÉVÉNEMENTS (PROJECTS)
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    event_date DATE NOT NULL DEFAULT CURRENT_DATE,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL -- 'apero', 'cocktails', 'mariage', 'evenement'
);

-- 2. LIEN AVEC LA TABLE GALERIE
-- On ajoute une colonne project_id à la table gallery existante
ALTER TABLE public.gallery ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;

-- 3. ACTIVATION DE LA SÉCURITÉ (RLS)
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- 4. POLITIQUES D'ACCÈS
-- Tout le monde peut voir les projets
DROP POLICY IF EXISTS "Public projects are viewable by everyone" ON public.projects;
CREATE POLICY "Public projects are viewable by everyone" ON public.projects FOR SELECT USING (true);

-- Seul l'admin (authentifié) peut tout faire
DROP POLICY IF EXISTS "Authenticated users can manage projects" ON public.projects;
CREATE POLICY "Authenticated users can manage projects" ON public.projects FOR ALL USING (auth.role() = 'authenticated');

-- 5. ACTIVATION DU TEMPS RÉEL
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'projects'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.projects;
  END IF;
END
$$;
