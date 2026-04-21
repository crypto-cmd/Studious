CREATE OR REPLACE FUNCTION check_sync_status(p_student_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    v_is_stale BOOLEAN;
BEGIN
    -- 1. Update the checked_at timestamp. 
    -- If the student doesn't have a sync record yet, this creates one.
    INSERT INTO syncs (student_id, checked_at)
    VALUES (p_student_id, NOW())
    ON CONFLICT (student_id) 
    DO UPDATE SET checked_at = NOW();

    -- 2. Query the view we made earlier to see if it is stale
    SELECT stale INTO v_is_stale
    FROM syncs_view
    WHERE student_id = p_student_id;

    -- 3. Return the result to the frontend
    RETURN COALESCE(v_is_stale, TRUE); 
END;
$$;