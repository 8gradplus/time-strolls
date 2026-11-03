-- Hard delete (decided 2026-11-03): muting stays the rule, but what never
-- belonged here (a logo harvested as a photo) can be deleted by an admin.
-- The app user still has no DELETE on content: one function does it, with
-- the rights of its owner, and refuses a place that others are part of.

-- The history outlives what it describes: no foreign key to resource
ALTER TABLE timestrolls.change_log
    DROP CONSTRAINT change_log_resource_id_fkey;

-- A record whose resource was deleted stays, marked, so that harvesting or
-- importing it again doesn't bring the resource back
ALTER TABLE timestrolls.source_record
    ADD COLUMN deleted_at timestamptz,
    ADD COLUMN deleted_by uuid REFERENCES timestrolls.account (id);

-- Deletes a resource with its texts, links, sources, slugs and type row;
-- returns the paths of its files on our CDN (the caller removes them).
-- The service layer checks the scope and writes the change log.
CREATE FUNCTION timestrolls.delete_resource(target uuid, actor uuid)
RETURNS text[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = timestrolls, pg_temp
AS $$
DECLARE
    paths text[];
BEGIN
    IF NOT EXISTS (SELECT 1 FROM resource WHERE id = target) THEN
        RAISE EXCEPTION 'no resource %', target USING ERRCODE = 'no_data_found';
    END IF;
    IF EXISTS (
        SELECT 1 FROM relation
        WHERE object_id = target AND predicate = 'part_of'
    ) THEN
        RAISE EXCEPTION 'other places are part of it' USING ERRCODE = 'foreign_key_violation';
    END IF;
    IF EXISTS (SELECT 1 FROM account_role WHERE area = target) THEN
        RAISE EXCEPTION 'it is the area of a role' USING ERRCODE = 'foreign_key_violation';
    END IF;

    UPDATE source_record sr SET deleted_at = now(), deleted_by = actor
    FROM resource_source rs
    WHERE rs.resource_id = target AND rs.source_record_id = sr.id;

    SELECT coalesce(array_agg(cdn_path), '{}') INTO paths
    FROM file WHERE media_id = target AND storage = 'cdn' AND cdn_path IS NOT NULL;

    DELETE FROM text WHERE resource_id = target;
    DELETE FROM relation WHERE subject_id = target OR object_id = target;
    DELETE FROM resource_source WHERE resource_id = target;
    DELETE FROM slug_alias WHERE resource_id = target;
    DELETE FROM file WHERE media_id = target;
    DELETE FROM place WHERE id = target;
    DELETE FROM media WHERE id = target;
    DELETE FROM tour WHERE id = target;
    DELETE FROM resource WHERE id = target;
    RETURN paths;
END;
$$;

REVOKE ALL ON FUNCTION timestrolls.delete_resource(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION timestrolls.delete_resource(uuid, uuid) TO "${user}";
