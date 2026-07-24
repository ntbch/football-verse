ALTER TABLE clubs ADD COLUMN preferred_tactic VARCHAR(30) NOT NULL DEFAULT 'BALANCED';

UPDATE clubs SET preferred_tactic = CASE name
    WHEN 'Aurora FC' THEN 'TIKI_TAKA'
    WHEN 'Riverside United' THEN 'COUNTER_ATTACK'
    WHEN 'Northbridge City' THEN 'GEGENPRESS'
    WHEN 'Harbor Athletic' THEN 'PARK_THE_BUS'
    ELSE preferred_tactic
END;
