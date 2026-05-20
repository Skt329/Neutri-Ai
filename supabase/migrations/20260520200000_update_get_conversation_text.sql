-- Update get_conversation_text function to order by ordinal and aggregate all text parts
CREATE OR REPLACE FUNCTION get_conversation_text(p_conversation_id UUID)
RETURNS TEXT AS $$
DECLARE
  result TEXT := '';
  msg RECORD;
  part_text TEXT;
BEGIN
  FOR msg IN
    SELECT m.role, m.parts, m.ordinal
    FROM messages m
    WHERE m.conversation_id = p_conversation_id
    ORDER BY m.ordinal ASC
  LOOP
    result := result || msg.role || ': ';
    IF msg.parts IS NOT NULL AND jsonb_array_length(msg.parts) > 0 THEN
      SELECT string_agg(part->>'text', E'\n')
      INTO part_text
      FROM jsonb_array_elements(msg.parts) AS part
      WHERE part->>'type' = 'text' AND part->>'text' IS NOT NULL;
      
      result := result || COALESCE(part_text, '[non-text]');
    ELSE
      result := result || '[empty]';
    END IF;
    result := result || E'\n';
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
