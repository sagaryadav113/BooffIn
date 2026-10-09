-- ============================================================================
-- BOOFFIN ADMIN PORTAL — ROBUST TEAM CREDENTIALS & AUTH MANAGEMENT RPC
-- ============================================================================

-- 1. Ensure pgcrypto extension is active
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Core RPC for Super Admin to provision, reset passwords, and update admin accounts
CREATE OR REPLACE FUNCTION public.admin_manage_team_credentials(
    p_action TEXT,                     -- 'CREATE', 'RESET_PASSWORD', 'UPDATE_DETAILS'
    p_target_user_id UUID DEFAULT NULL,
    p_email TEXT DEFAULT NULL,
    p_password TEXT DEFAULT NULL,
    p_full_name TEXT DEFAULT NULL,
    p_username TEXT DEFAULT NULL,
    p_role TEXT DEFAULT 'ADMIN'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
    v_caller_id UUID;
    v_is_super_admin BOOLEAN;
    v_target_id UUID;
    v_encrypted_pw TEXT;
    v_clean_email TEXT;
    v_clean_username TEXT;
    v_clean_fullname TEXT;
    v_identity_id UUID;
BEGIN
    -- 1. Identify Caller & Validate Authority
    v_caller_id := auth.uid();
    
    -- Check if caller is SUPER_ADMIN in admin_members or is service/postgres
    IF v_caller_id IS NOT NULL THEN
        SELECT EXISTS (
            SELECT 1 FROM public.admin_members 
            WHERE user_id = v_caller_id AND role = 'SUPER_ADMIN' AND status = 'ACTIVE'
        ) INTO v_is_super_admin;

        IF NOT v_is_super_admin THEN
            -- Allow if no super admins exist yet (initial setup safeguard)
            IF EXISTS (SELECT 1 FROM public.admin_members WHERE role = 'SUPER_ADMIN') THEN
                RAISE EXCEPTION 'Access Denied: Only active Super Administrators can manage team credentials.';
            END IF;
        END IF;
    END IF;

    -- Normalize inputs
    v_clean_email := LOWER(TRIM(COALESCE(p_email, '')));
    v_clean_fullname := TRIM(COALESCE(p_full_name, 'Administrator'));
    v_clean_username := LOWER(TRIM(COALESCE(p_username, SPLIT_PART(v_clean_email, '@', 1))));

    -- ========================================================================
    -- ACTION: CREATE NEW EMPLOYEE / ADMIN
    -- ========================================================================
    IF p_action = 'CREATE' THEN
        IF v_clean_email = '' OR p_password IS NULL OR LENGTH(p_password) < 6 THEN
            RAISE EXCEPTION 'Invalid parameters: Valid email and password (min 6 chars) required.';
        END IF;

        -- Check if user already exists in auth.users
        SELECT id INTO v_target_id FROM auth.users WHERE LOWER(email) = v_clean_email LIMIT 1;

        v_encrypted_pw := crypt(p_password, gen_salt('bf'));

        IF v_target_id IS NULL THEN
            v_target_id := gen_random_uuid();
            v_identity_id := gen_random_uuid();

            -- Create user in auth.users with pre-confirmed email & permanent password
            INSERT INTO auth.users (
                id,
                instance_id,
                aud,
                role,
                email,
                encrypted_password,
                email_confirmed_at,
                confirmed_at,
                last_sign_in_at,
                raw_app_meta_data,
                raw_user_meta_data,
                is_super_admin,
                created_at,
                updated_at
            ) VALUES (
                v_target_id,
                '00000000-0000-0000-0000-000000000000',
                'authenticated',
                'authenticated',
                v_clean_email,
                v_encrypted_pw,
                NOW(),
                NOW(),
                NULL,
                jsonb_build_object('provider', 'email', 'providers', array['email']),
                jsonb_build_object('full_name', v_clean_fullname, 'username', v_clean_username, 'is_admin', true, 'admin_role', p_role),
                false,
                NOW(),
                NOW()
            );

            -- Create corresponding auth identity
            INSERT INTO auth.identities (
                id,
                user_id,
                identity_data,
                provider,
                provider_id,
                last_sign_in_at,
                created_at,
                updated_at
            ) VALUES (
                v_identity_id,
                v_target_id,
                jsonb_build_object('sub', v_target_id::text, 'email', v_clean_email),
                'email',
                v_target_id::text,
                NULL,
                NOW(),
                NOW()
            );
        ELSE
            -- User existed in auth: update password and confirm email
            UPDATE auth.users SET 
                encrypted_password = v_encrypted_pw,
                email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
                confirmed_at = COALESCE(confirmed_at, NOW()),
                raw_user_meta_data = raw_user_meta_data || jsonb_build_object('full_name', v_clean_fullname, 'username', v_clean_username, 'is_admin', true, 'admin_role', p_role),
                updated_at = NOW()
            WHERE id = v_target_id;
        END IF;

        -- Upsert into public.profiles
        INSERT INTO public.profiles (
            id,
            username,
            full_name,
            academic_title,
            institution,
            updated_at
        ) VALUES (
            v_target_id,
            v_clean_username,
            v_clean_fullname,
            p_role || ' Officer',
            'BooffIn Platform Operations',
            NOW()
        )
        ON CONFLICT (id) DO UPDATE SET 
            full_name = EXCLUDED.full_name,
            updated_at = NOW();

        -- Upsert into public.admin_members
        INSERT INTO public.admin_members (
            user_id,
            role,
            status,
            full_name,
            email,
            invited_by,
            updated_at
        ) VALUES (
            v_target_id,
            p_role,
            'ACTIVE',
            v_clean_fullname,
            v_clean_email,
            COALESCE(v_caller_id, v_target_id),
            NOW()
        )
        ON CONFLICT (user_id) DO UPDATE SET 
            role = EXCLUDED.role,
            status = 'ACTIVE',
            full_name = EXCLUDED.full_name,
            email = EXCLUDED.email,
            updated_at = NOW();

        RETURN jsonb_build_object(
            'success', true,
            'user_id', v_target_id,
            'email', v_clean_email,
            'full_name', v_clean_fullname,
            'role', p_role,
            'message', 'Team member provisioned with confirmed credentials.'
        );

    -- ========================================================================
    -- ACTION: RESET PASSWORD PERMANENTLY
    -- ========================================================================
    ELSIF p_action = 'RESET_PASSWORD' THEN
        IF p_password IS NULL OR LENGTH(p_password) < 6 THEN
            RAISE EXCEPTION 'Password must be at least 6 characters.';
        END IF;

        IF p_target_user_id IS NULL AND v_clean_email = '' THEN
            RAISE EXCEPTION 'Target user ID or email required for password reset.';
        END IF;

        v_encrypted_pw := crypt(p_password, gen_salt('bf', 10));

        IF p_target_user_id IS NOT NULL THEN
            v_target_id := p_target_user_id;
        ELSE
            SELECT id INTO v_target_id FROM auth.users WHERE LOWER(email) = v_clean_email LIMIT 1;
        END IF;

        IF v_target_id IS NOT NULL THEN
            UPDATE auth.users SET 
                encrypted_password = v_encrypted_pw,
                email = CASE WHEN v_clean_email != '' THEN v_clean_email ELSE email END,
                email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
                confirmed_at = COALESCE(confirmed_at, NOW()),
                banned_until = NULL,
                raw_user_meta_data = raw_user_meta_data || jsonb_build_object('username', v_clean_username, 'full_name', v_clean_fullname),
                updated_at = NOW()
            WHERE id = v_target_id;

            -- Update or insert auth identity
            IF v_clean_email != '' THEN
                UPDATE auth.identities SET 
                    identity_data = jsonb_build_object('sub', v_target_id::text, 'email', v_clean_email),
                    updated_at = NOW()
                WHERE user_id = v_target_id AND provider = 'email';

                IF NOT FOUND THEN
                    INSERT INTO auth.identities (
                        id,
                        user_id,
                        identity_data,
                        provider,
                        provider_id,
                        last_sign_in_at,
                        created_at,
                        updated_at
                    ) VALUES (
                        gen_random_uuid(),
                        v_target_id,
                        jsonb_build_object('sub', v_target_id::text, 'email', v_clean_email),
                        'email',
                        v_target_id::text,
                        NULL,
                        NOW(),
                        NOW()
                    );
                END IF;
            END IF;
        ELSE
            -- Target user not in auth.users, create new user
            v_target_id := COALESCE(p_target_user_id, gen_random_uuid());
            v_identity_id := gen_random_uuid();

            INSERT INTO auth.users (
                id,
                instance_id,
                aud,
                role,
                email,
                encrypted_password,
                email_confirmed_at,
                confirmed_at,
                last_sign_in_at,
                raw_app_meta_data,
                raw_user_meta_data,
                is_super_admin,
                created_at,
                updated_at
            ) VALUES (
                v_target_id,
                '00000000-0000-0000-0000-000000000000',
                'authenticated',
                'authenticated',
                v_clean_email,
                v_encrypted_pw,
                NOW(),
                NOW(),
                NULL,
                jsonb_build_object('provider', 'email', 'providers', array['email']),
                jsonb_build_object('full_name', v_clean_fullname, 'username', v_clean_username, 'is_admin', true, 'admin_role', p_role),
                false,
                NOW(),
                NOW()
            );

            INSERT INTO auth.identities (
                id,
                user_id,
                identity_data,
                provider,
                provider_id,
                last_sign_in_at,
                created_at,
                updated_at
            ) VALUES (
                v_identity_id,
                v_target_id,
                jsonb_build_object('sub', v_target_id::text, 'email', v_clean_email),
                'email',
                v_target_id::text,
                NULL,
                NOW(),
                NOW()
            );
        END IF;

        -- Ensure public.admin_members matches
        IF v_clean_email != '' THEN
            UPDATE public.admin_members SET 
                email = v_clean_email,
                updated_at = NOW()
            WHERE user_id = v_target_id;
        END IF;

        RETURN jsonb_build_object(
            'success', true,
            'user_id', v_target_id,
            'email', v_clean_email,
            'message', 'Permanent password successfully configured in authentication system.'
        );

    -- ========================================================================
    -- ACTION: UPDATE DETAILS (NAME, EMAIL, ROLE)
    -- ========================================================================
    ELSIF p_action = 'UPDATE_DETAILS' THEN
        IF p_target_user_id IS NULL THEN
            RAISE EXCEPTION 'Target user ID required.';
        END IF;

        -- Update in auth.users
        IF v_clean_email != '' THEN
            UPDATE auth.users SET 
                email = v_clean_email,
                raw_user_meta_data = raw_user_meta_data || jsonb_build_object('full_name', v_clean_fullname, 'username', v_clean_username),
                updated_at = NOW()
            WHERE id = p_target_user_id;

            -- Update identity if exists
            UPDATE auth.identities SET 
                identity_data = jsonb_build_object('sub', p_target_user_id::text, 'email', v_clean_email),
                updated_at = NOW()
            WHERE user_id = p_target_user_id AND provider = 'email';
        END IF;

        -- Update in public.admin_members
        UPDATE public.admin_members SET 
            full_name = v_clean_fullname,
            email = CASE WHEN v_clean_email != '' THEN v_clean_email ELSE email END,
            role = COALESCE(p_role, role),
            updated_at = NOW()
        WHERE user_id = p_target_user_id;

        -- Update in public.profiles
        UPDATE public.profiles SET 
            full_name = v_clean_fullname,
            username = CASE WHEN v_clean_username != '' THEN v_clean_username ELSE username END,
            updated_at = NOW()
        WHERE id = p_target_user_id;

        RETURN jsonb_build_object(
            'success', true,
            'message', 'Member identity & credentials metadata updated.'
        );

    ELSE
        RAISE EXCEPTION 'Unknown action: %', p_action;
    END IF;
END;
$$;

-- 3. Grant execute to authenticated users (internal security checks handle authorization)
GRANT EXECUTE ON FUNCTION public.admin_manage_team_credentials TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_manage_team_credentials TO service_role;
