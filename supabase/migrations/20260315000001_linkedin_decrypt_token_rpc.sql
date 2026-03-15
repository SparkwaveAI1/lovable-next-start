-- LinkedIn Phase 2A: Token Decryption RPC
-- Used by linkedin-publish-text edge function to decrypt stored tokens

CREATE OR REPLACE FUNCTION decrypt_linkedin_token(
  p_encrypted TEXT,
  p_encryption_key TEXT
)
RETURNS TEXT
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $func$
BEGIN
  RETURN pgp_sym_decrypt(p_encrypted::bytea, p_encryption_key)::TEXT;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'decrypt_linkedin_token error: %', SQLERRM;
  RETURN NULL;
END;
$func$;

GRANT EXECUTE ON FUNCTION decrypt_linkedin_token TO service_role;
GRANT EXECUTE ON FUNCTION decrypt_linkedin_token TO authenticated;
