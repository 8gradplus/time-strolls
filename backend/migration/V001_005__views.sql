-- Read views. *_view: every row with what the API shows (admin);
-- public_*: only what may be distributed. The public REST routes and the
-- public MCP tools read only public_*.

-- May a media be distributed? Our own media (no creator, owner or source)
-- always; others with a permission that is not revoked, from one of its
-- sources or from its creator or owner. Names and coordinates of places need
-- no permission.
CREATE VIEW timestrolls.media_rights AS
WITH m AS (
    SELECT
        media.id,
        media.creator_id,
        media.rights_holder_id,
        ARRAY(
            SELECT sr.source_id
            FROM timestrolls.resource_source rs
            JOIN timestrolls.source_record sr ON sr.id = rs.source_record_id
            WHERE rs.resource_id = media.id
        ) AS source_ids
    FROM timestrolls.media
),
granted AS (
    SELECT
        m.id,
        bool_or(p.show) AS show,
        bool_or(p.copy) AS copy
    FROM m
    JOIN timestrolls.permission p
        ON p.revoked_at IS NULL
        AND (p.source_id = ANY (m.source_ids)
            OR p.party_id IN (m.creator_id, m.rights_holder_id))
    GROUP BY m.id
)
SELECT
    m.id,
    (m.creator_id IS NULL AND m.rights_holder_id IS NULL
        AND cardinality(m.source_ids) = 0) AS own,
    coalesce(g.show, false) AS show_granted,
    coalesce(g.copy, false) AS copy_granted
FROM m
LEFT JOIN granted g ON g.id = m.id;

CREATE VIEW timestrolls.place_view AS
SELECT
    p.id,
    p.slug,
    (SELECT t.body FROM timestrolls.text t
        WHERE t.resource_id = p.id AND t.field = 'name' AND t.is_primary) AS name,
    p.kind,
    k.map_visible,
    ST_Y(ST_PointOnSurface(p.geom)) AS lat,
    ST_X(ST_PointOnSurface(p.geom)) AS lon,
    p.attributes,
    r.status,
    r.status_reason,
    r.created_by,
    r.created_at,
    r.updated_at,
    r.published_at
FROM timestrolls.place p
JOIN timestrolls.resource r ON r.id = p.id
JOIN timestrolls.place_kind k ON k.code = p.kind;

CREATE VIEW timestrolls.media_view AS
SELECT
    m.id,
    m.kind,
    m.date_text,
    m.date_from,
    m.date_to,
    creator.name AS creator,
    holder.name AS rights_holder,
    mr.own OR mr.show_granted AS may_show,
    mr.own OR mr.copy_granted AS may_copy,
    -- our CDN copy only where we may copy, else the source's file
    (SELECT f.url FROM timestrolls.file f
        WHERE f.media_id = m.id AND f.role = 'original'
            AND (f.storage = 'external' OR mr.own OR mr.copy_granted)
        ORDER BY f.storage = 'cdn' DESC, f.created_at
        LIMIT 1) AS url,
    (SELECT sr.url FROM timestrolls.resource_source rs
        JOIN timestrolls.source_record sr ON sr.id = rs.source_record_id
        WHERE rs.resource_id = m.id
        ORDER BY sr.created_at
        LIMIT 1) AS source_url,
    m.attributes,
    r.status,
    r.status_reason,
    r.created_by,
    r.created_at,
    r.updated_at,
    r.published_at
FROM timestrolls.media m
JOIN timestrolls.resource r ON r.id = m.id
JOIN timestrolls.media_rights mr ON mr.id = m.id
LEFT JOIN timestrolls.party creator ON creator.id = m.creator_id
LEFT JOIN timestrolls.party holder ON holder.id = m.rights_holder_id;

CREATE VIEW timestrolls.tour_view AS
SELECT
    t.id,
    t.slug,
    (SELECT x.body FROM timestrolls.text x
        WHERE x.resource_id = t.id AND x.field = 'name' AND x.is_primary) AS name,
    t.length,
    t.geom,
    t.attributes,
    r.status,
    r.status_reason,
    r.created_by,
    r.created_at,
    r.updated_at,
    r.published_at
FROM timestrolls.tour t
JOIN timestrolls.resource r ON r.id = t.id;

CREATE VIEW timestrolls.public_place AS
SELECT * FROM timestrolls.place_view WHERE status = 'published';

CREATE VIEW timestrolls.public_media AS
SELECT * FROM timestrolls.media_view WHERE status = 'published' AND may_show;

CREATE VIEW timestrolls.public_tour AS
SELECT * FROM timestrolls.tour_view WHERE status = 'published';

CREATE VIEW timestrolls.public_resource AS
SELECT id, 'place' AS type FROM timestrolls.public_place
UNION ALL
SELECT id, 'media' FROM timestrolls.public_media
UNION ALL
SELECT id, 'tour' FROM timestrolls.public_tour;

-- Texts of public resources. A text from a source (also a translation of
-- one) needs that source's permission, unless it belongs to a media we may
-- show (a photo's caption goes with the photo).
CREATE VIEW timestrolls.public_text AS
SELECT t.*
FROM timestrolls.text t
JOIN timestrolls.public_resource pr ON pr.id = t.resource_id
WHERE t.source_record_id IS NULL
    OR pr.type = 'media'
    OR EXISTS (
        SELECT 1
        FROM timestrolls.source_record sr
        JOIN timestrolls.permission p
            ON p.source_id = sr.source_id AND p.show AND p.revoked_at IS NULL
        WHERE sr.id = t.source_record_id
    );

-- Links between two public resources
CREATE VIEW timestrolls.public_relation AS
SELECT rel.*
FROM timestrolls.relation rel
WHERE rel.subject_id IN (SELECT id FROM timestrolls.public_resource)
    AND rel.object_id IN (SELECT id FROM timestrolls.public_resource);
