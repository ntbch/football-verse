ALTER TABLE career_saves ADD COLUMN tactical_setup JSONB;
ALTER TABLE players ADD COLUMN secondary_positions TEXT[] NOT NULL DEFAULT '{}';

UPDATE players SET secondary_positions = CASE primary_position
    WHEN 'LB' THEN ARRAY['LWB'] WHEN 'RB' THEN ARRAY['RWB']
    WHEN 'LWB' THEN ARRAY['LB','LM'] WHEN 'RWB' THEN ARRAY['RB','RM']
    WHEN 'DM' THEN ARRAY['CM'] WHEN 'CM' THEN ARRAY['DM','AM'] WHEN 'AM' THEN ARRAY['CM']
    WHEN 'LM' THEN ARRAY['LW'] WHEN 'RM' THEN ARRAY['RW']
    WHEN 'LW' THEN ARRAY['LM','ST'] WHEN 'RW' THEN ARRAY['RM','ST']
    ELSE '{}' END;
