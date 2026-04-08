-- ============================================================
-- CONFIGURATION GLOBALE (AVEC RÉPARATIONS INTÉGRÉES)
-- ============================================================

-- 1. CONFIGURATION DE LA GALERIE
-- ------------------------------
CREATE TABLE IF NOT EXISTS public.gallery (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    image_url TEXT NOT NULL,
    category TEXT NOT NULL,
    title TEXT
);

-- Sécurité pour la galerie
ALTER TABLE public.gallery ENABLE ROW LEVEL SECURITY;

-- Nettoyage et recréation des politiques (évite les doublons)
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.gallery;
DROP POLICY IF EXISTS "Authenticated users can insert" ON public.gallery;
DROP POLICY IF EXISTS "Authenticated users can update" ON public.gallery;
DROP POLICY IF EXISTS "Authenticated users can delete" ON public.gallery;

CREATE POLICY "Public profiles are viewable by everyone" ON public.gallery FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert" ON public.gallery FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update" ON public.gallery FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete" ON public.gallery FOR DELETE USING (auth.role() = 'authenticated');


-- 2. CONFIGURATION DU STOCKAGE (IMAGES)
-- -------------------------------------
INSERT INTO storage.buckets (id, name, public) VALUES ('images', 'images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Public Upload" ON storage.objects;
DROP POLICY IF EXISTS "Public Delete" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Delete" ON storage.objects;

CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING ( bucket_id = 'images' );
CREATE POLICY "Authenticated Upload" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'images' AND auth.role() = 'authenticated' );
CREATE POLICY "Authenticated Delete" ON storage.objects FOR DELETE USING ( bucket_id = 'images' AND auth.role() = 'authenticated' );


-- 3. CONFIGURATION DES MESSAGES (ET RÉPARATIONS)
-- ----------------------------------------------
-- Création de la table de base si elle n'existe pas
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    event_type TEXT,
    message TEXT
);

-- [FIX INTEGRÉ] Ajout des colonnes manquantes si la table existait déjà sans elles
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false;

ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS notified BOOLEAN DEFAULT false;

-- Sécurité pour les messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Nettoyage des anciennes politiques
DROP POLICY IF EXISTS "Public can insert messages" ON public.messages;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.messages;
DROP POLICY IF EXISTS "Enable update for all users" ON public.messages;
DROP POLICY IF EXISTS "Enable delete for all users" ON public.messages;
DROP POLICY IF EXISTS "Admins can view messages" ON public.messages;

-- Création des nouvelles politiques
-- 1. Tout le monde peut poster (formulaire contact)
CREATE POLICY "Public can insert messages" 
ON public.messages FOR INSERT 
WITH CHECK (true);

-- 2. Accès lecture/modif pour l'admin (protégé)
CREATE POLICY "Enable read access for all users" ON public.messages FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable update for all users" ON public.messages FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Enable delete for all users" ON public.messages FOR DELETE USING (auth.role() = 'authenticated');


-- 4. ACTIVATION DU TEMPS RÉEL (REALTIME)
-- --------------------------------------
-- Cette commande vérifie si la table est déjà écoutée pour éviter l'erreur
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
END
$$;
