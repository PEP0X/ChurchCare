-- =============================================================================
-- ChurchCare Desktop - Supabase Licensing System & Activation RPC
-- =============================================================================

-- 1. التأكد من وجود إضافة التشفير pgcrypto
create extension if not exists pgcrypto;

-- 2. دالة التفعيل الآمنة (RPC)
create or replace function activate_license(
    p_serial text,
    p_hwid text,
    p_device_name text default ''
) returns jsonb as $$
declare
    v_lic record;
    v_issued_at timestamptz := now();
    v_secret_sig text;
    v_master_secret text := 'zkVv79AOxNrjyFVm/VtKToJJfrY1SnwXCYfjvgYb7jU=';
begin
    -- أ. البحث عن السيريال المطلوب
    select * into v_lic from public.licenses where serial_key = trim(p_serial);
    
    if not found then
        insert into public.activation_logs (serial_key, attempted_hwid, success, message)
        values (trim(p_serial), trim(p_hwid), false, 'Serial key not found');
        return jsonb_build_object(
            'success', false,
            'error_code', 'INVALID_SERIAL',
            'message', 'السيريال المدخل غير صحيح. يرجى التأكد من كتابته بدقة.'
        );
    end if;

    -- ب. التحقق إذا كان الترخيص ملغياً (Revoked)
    if v_lic.status = 'revoked' then
        insert into public.activation_logs (serial_key, attempted_hwid, success, message)
        values (trim(p_serial), trim(p_hwid), false, 'License revoked by admin');
        return jsonb_build_object(
            'success', false,
            'error_code', 'LICENSE_REVOKED',
            'message', 'تم إلغاء هذا الترخيص من قبل إدارة النظام.'
        );
    end if;

    -- ج. التحقق إذا كان السيريال مفعلاً بالفعل على جهاز آخر مختلف (HWID Mismatch)
    if v_lic.hwid is not null and v_lic.hwid <> trim(p_hwid) then
        insert into public.activation_logs (serial_key, attempted_hwid, success, message)
        values (trim(p_serial), trim(p_hwid), false, 'Hardware mismatch: bound to ' || v_lic.hwid);
        return jsonb_build_object(
            'success', false,
            'error_code', 'HARDWARE_MISMATCH',
            'message', 'هذا السيريال مفعل بالفعل على جهاز كمبيوتر آخر ولا يمكن استخدامه هنا.'
        );
    end if;

    -- د. تفعيل الترخيص لأول مرة أو تأكيده لنفس الجهاز
    update public.licenses
    set hwid = trim(p_hwid),
        status = 'active',
        activated_at = coalesce(activated_at, v_issued_at),
        notes = coalesce(notes, '') || case when notes is null or notes = '' then '' else ' | ' end || 'Activated on ' || coalesce(p_device_name, 'PC') || ' at ' || v_issued_at::text
    where id = v_lic.id;

    insert into public.activation_logs (serial_key, attempted_hwid, success, message)
    values (trim(p_serial), trim(p_hwid), true, 'Successfully activated for ' || v_lic.client_name);

    -- هـ. توليد توقيع مشفر للرخصة (HMAC-SHA256 Cryptographic Signature)
    v_secret_sig := encode(
        hmac(
            (v_lic.serial_key || '|' || trim(p_hwid) || '|' || v_lic.client_name)::bytea,
            v_master_secret::bytea,
            'sha256'
        ),
        'hex'
    );

    -- و. إرجاع بيانات الترخيص الموثقة
    return jsonb_build_object(
        'success', true,
        'serial_key', v_lic.serial_key,
        'client_name', v_lic.client_name,
        'hwid', trim(p_hwid),
        'activated_at', v_issued_at,
        'license_type', 'LIFETIME',
        'signature', v_secret_sig
    );
end;
$$ language plpgsql security definer;

-- 3. منح صلاحية الاستدعاء للـ Anon Key بأمان تام
grant execute on function activate_license(text, text, text) to anon, authenticated;

-- 4. دالة التحقق اللحظي والفحص الدوري (Live Realtime Heartbeat)
create or replace function validate_license(
    p_serial text,
    p_hwid text
) returns jsonb as $$
declare
    v_lic record;
begin
    select * into v_lic from public.licenses where serial_key = trim(p_serial);
    
    -- إذا لم يتم العثور على السيريال (تم حذفه)
    if not found then
        return jsonb_build_object('valid', false, 'reason', 'NOT_FOUND', 'message', 'تم حذف الترخيص من قاعدة البيانات.');
    end if;

    -- إذا كان ملغياً (Revoked) أو غير مفعل
    if v_lic.status <> 'active' then
        return jsonb_build_object('valid', false, 'reason', 'NOT_ACTIVE', 'message', 'الترخيص غير نشط أو تم إلغاؤه.');
    end if;

    -- إذا تم فك ربط الجهاز (أصبح NULL) أو تغير لعتاد آخر
    if v_lic.hwid is null or v_lic.hwid <> trim(p_hwid) then
        return jsonb_build_object('valid', false, 'reason', 'HWID_RESET', 'message', 'تم فك ربط هذا الجهاز من قبل المسؤول.');
    end if;

    return jsonb_build_object('valid', true, 'client_name', v_lic.client_name);
end;
$$ language plpgsql security definer;

grant execute on function validate_license(text, text) to anon, authenticated;
