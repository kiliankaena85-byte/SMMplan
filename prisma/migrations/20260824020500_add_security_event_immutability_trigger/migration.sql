-- ВНИМАНИЕ: Данный триггер защищает записи SecurityEvent от удаления и изменения.
-- Это предотвращает компрометацию audit trail даже при уязвимостях в Prisma Client или при использовании deleteMany.
-- Retention policy (cleanup-pii.job.ts) может использовать bypass-сессию через SET LOCAL smmplan.allow_security_event_cleanup = 'true'.

CREATE OR REPLACE FUNCTION prevent_security_event_mutation()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        IF current_setting('smmplan.allow_security_event_cleanup', true) = 'true' THEN
            RETURN OLD;
        END IF;
        RAISE EXCEPTION 'SecurityEvent immutability violation: Deletes are prohibited. Use dedicated retention job with elevated bypass.';
    ELSIF TG_OP = 'UPDATE' THEN
        RAISE EXCEPTION 'SecurityEvent immutability violation: Updates are prohibited. SecurityEvent is append-only.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_security_event_mutation ON "SecurityEvent";

CREATE TRIGGER trg_prevent_security_event_mutation
BEFORE UPDATE OR DELETE ON "SecurityEvent"
FOR EACH ROW
EXECUTE FUNCTION prevent_security_event_mutation();
