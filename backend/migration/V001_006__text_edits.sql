-- An original text from a source that we edited (removed a call for
-- information, fixed a typo): it stays the original, marked as edited by
-- whom, when and why. The verbatim text stays in the source record.
ALTER TABLE timestrolls.text
    ADD COLUMN edited_by uuid REFERENCES timestrolls.account (id),
    ADD COLUMN edited_at timestamptz,
    ADD COLUMN edit_note text,
    ADD CONSTRAINT text_edited_check
        CHECK ((edited_by IS NULL) = (edited_at IS NULL)),
    ADD CONSTRAINT text_edited_original_check
        CHECK (edited_by IS NULL OR method = 'original');

-- t.* was expanded when the view was created: add the new columns
CREATE OR REPLACE VIEW timestrolls.public_text AS
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
