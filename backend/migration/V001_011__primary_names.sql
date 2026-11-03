-- set_texts replaced a name and dropped its primary flag (fixed with this
-- migration): on 2026-11-03 about 100 renamed houses ("Ottenschlag 5",
-- "Reith 2", ...) lost their primary name, so lists showed them without one.
-- A resource whose names have no primary gets one back: its original, German
-- first, else the oldest.

UPDATE timestrolls.text t
SET is_primary = true
FROM (
    SELECT DISTINCT ON (x.resource_id) x.id
    FROM timestrolls.text x
    WHERE x.field = 'name'
      AND x.method = 'original'
      AND NOT EXISTS (
          SELECT 1 FROM timestrolls.text p
          WHERE p.resource_id = x.resource_id AND p.field = 'name' AND p.is_primary
      )
    ORDER BY x.resource_id, (x.lang = 'de') DESC, x.created_at
) fix
WHERE t.id = fix.id;
