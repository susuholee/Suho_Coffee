-- Preserve existing MIME types and allow XLSX in the private document bucket.
UPDATE storage.buckets
SET allowed_mime_types = CASE WHEN allowed_mime_types IS NULL THEN NULL
  ELSE ARRAY(SELECT DISTINCT unnest(allowed_mime_types || ARRAY[
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ])) END
WHERE id = 'documents';
