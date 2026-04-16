-- Create storage buckets for logos and reward images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('rewards', 'rewards', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for logos bucket
CREATE POLICY "Anyone can view logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'logos');

CREATE POLICY "Owners can upload logos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'logos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Owners can update their logos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'logos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Owners can delete their logos"
ON storage.objects FOR DELETE
USING (bucket_id = 'logos' AND auth.uid() IS NOT NULL);

-- RLS policies for rewards bucket
CREATE POLICY "Anyone can view reward images"
ON storage.objects FOR SELECT
USING (bucket_id = 'rewards');

CREATE POLICY "Owners can upload reward images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'rewards' AND auth.uid() IS NOT NULL);

CREATE POLICY "Owners can update reward images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'rewards' AND auth.uid() IS NOT NULL);

CREATE POLICY "Owners can delete reward images"
ON storage.objects FOR DELETE
USING (bucket_id = 'rewards' AND auth.uid() IS NOT NULL);