-- Run AFTER verifying skills(id UUID,name TEXT,category TEXT), interests(id UUID,name TEXT).
-- Safe to repeat; sample catalogs contain NO student/user data.
INSERT INTO public.skills(id,name,category)
SELECT gen_random_uuid(),x.name,x.category FROM (VALUES
 ('UI/UX Design','Design'),('Figma','Design'),('Graphic Design','Design'),
 ('Frontend Development','Software'),('Backend Development','Software'),
 ('Python','Software'),('JavaScript','Software'),('React','Software'),
 ('Database Design','Software'),('Data Analysis','Data'),
 ('Research','Academic'),('Presentation','Communication'),('Public Speaking','Communication'),
 ('Project Management','Management'),('Content Writing','Media'),
 ('Video Editing','Media'),('Marketing','Business')) AS x(name,category)
WHERE NOT EXISTS(SELECT 1 FROM public.skills s WHERE lower(s.name)=lower(x.name));
INSERT INTO public.interests(id,name)
SELECT gen_random_uuid(),x.name FROM (VALUES
 ('Technology'),('Innovation'),('Hackathon'),('Web Development'),
 ('AI & Data'),('Sustainability'),('Entrepreneurship'),('Education'),
 ('Community Service'),('Design'),('Business'),('Research')) AS x(name)
WHERE NOT EXISTS(SELECT 1 FROM public.interests s WHERE lower(s.name)=lower(x.name));
