-- Slugs made before #60 dropped letters with other accents than the ones
-- slugify listed (Czech č, ř, š, ž, ě, ů, ...): "kaplička" became
-- kapli-ka-n48-614-e14-104. Renames those slugs to the current rule
-- (helpers/slug.py: the accent is dropped, the letter kept) and keeps the old
-- slug as an alias, so links keep working. Only slugs the old rule made from
-- the primary name are touched; a name edited since then is left alone.

CREATE FUNCTION pg_temp.slug_old(name text) RETURNS text LANGUAGE sql AS $$
    SELECT trim(BOTH '-' FROM regexp_replace(regexp_replace(
        translate(
            replace(replace(replace(replace(lower(name),
                'ä', 'ae'), 'ö', 'oe'), 'ü', 'ue'), 'ß', 'ss'),
            'àáâãåèéêëìíîïòóôõùúûñç', 'aaaaaeeeeiiiioooouuunc'),
        '[''"]', '', 'g'), '[^a-z0-9]+', '-', 'g'))
$$;

CREATE FUNCTION pg_temp.slug_new(name text) RETURNS text LANGUAGE sql AS $$
    SELECT trim(BOTH '-' FROM regexp_replace(regexp_replace(
        translate(
            replace(replace(replace(replace(lower(name),
                'ä', 'ae'), 'ö', 'oe'), 'ü', 'ue'), 'ß', 'ss'),
            'àáâãåèéêëìíîïòóôõùúûñç' || 'čďěňřšťůýžľĺŕąęńśźżőűćășțÿāēīōū',
            'aaaaaeeeeiiiioooouuunc' || 'cdenrstuyzllraenszzoucastyaeiou'),
        '[''"]', '', 'g'), '[^a-z0-9]+', '-', 'g'))
$$;

CREATE TEMP TABLE slug_fix ON COMMIT DROP AS
SELECT r.id, r.type, r.old_slug,
       pg_temp.slug_new(r.name) || substr(r.old_slug, length(pg_temp.slug_old(r.name)) + 1)
           AS new_slug
FROM (
    SELECT p.id, 'place' AS type, p.slug AS old_slug, t.body AS name
    FROM timestrolls.place p
    JOIN timestrolls.text t ON t.resource_id = p.id AND t.field = 'name' AND t.is_primary
    UNION ALL
    SELECT o.id, 'tour', o.slug, t.body
    FROM timestrolls.tour o
    JOIN timestrolls.text t ON t.resource_id = o.id AND t.field = 'name' AND t.is_primary
) r
WHERE pg_temp.slug_old(r.name) <> pg_temp.slug_new(r.name)
  AND (r.old_slug = pg_temp.slug_old(r.name)
       OR r.old_slug LIKE pg_temp.slug_old(r.name) || '-%');

-- a new slug that is taken stays as it was
DELETE FROM slug_fix f
WHERE EXISTS (SELECT 1 FROM timestrolls.place WHERE slug = f.new_slug)
   OR EXISTS (SELECT 1 FROM timestrolls.tour WHERE slug = f.new_slug)
   OR EXISTS (SELECT 1 FROM timestrolls.slug_alias WHERE slug = f.new_slug)
   OR f.new_slug IN (SELECT new_slug FROM slug_fix GROUP BY new_slug HAVING count(*) > 1);

INSERT INTO timestrolls.slug_alias (slug, resource_id)
SELECT old_slug, id FROM slug_fix;

UPDATE timestrolls.place p SET slug = f.new_slug FROM slug_fix f WHERE p.id = f.id;
UPDATE timestrolls.tour o SET slug = f.new_slug FROM slug_fix f WHERE o.id = f.id;

INSERT INTO timestrolls.change_log (account_id, resource_id, table_name, row_id, action, diff, run)
SELECT a.id, f.id, f.type, f.id::text, 'update',
       jsonb_build_object('slug', jsonb_build_array(f.old_slug, f.new_slug)),
       '{"migration": "V001_010__czech_slugs"}'
FROM slug_fix f, timestrolls.account a
WHERE a.kind = 'system' AND a.name = 'admin';
