-- Drop the ambiguous old function signature (9 parameters)
DROP FUNCTION IF EXISTS fatura_olustur(uuid, text, timestamp, timestamp, text, text, decimal, text, jsonb);
