-- Run after `prisma migrate dev`. Keeps Hazard.location in sync with lat/lng
-- and adds a spatial index for fast "hazards within N metres" queries.

CREATE EXTENSION IF NOT EXISTS postgis;

CREATE OR REPLACE FUNCTION hazard_set_location() RETURNS trigger AS $$
BEGIN
  NEW.location := ST_SetSRID(ST_MakePoint(NEW.lng, NEW.lat), 4326)::geography;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS hazard_location_trg ON "Hazard";
CREATE TRIGGER hazard_location_trg
  BEFORE INSERT OR UPDATE OF lat, lng ON "Hazard"
  FOR EACH ROW EXECUTE FUNCTION hazard_set_location();

CREATE INDEX IF NOT EXISTS hazard_location_gix ON "Hazard" USING GIST (location);

-- Example: hazards within 500 m of a point, nearest first
-- SELECT id, title, ST_Distance(location, ST_MakePoint($lng, $lat)::geography) AS metres
-- FROM "Hazard"
-- WHERE status <> 'resolved'
--   AND ST_DWithin(location, ST_MakePoint($lng, $lat)::geography, 500)
-- ORDER BY metres;
