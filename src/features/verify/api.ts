import { db, readableError } from '@/lib/supabase';
import type { FoundCertificate, VerifiedCertificate } from '@/lib/db.types';

export type VerifyOutcome =
  | { state: 'valid'; record: VerifiedCertificate }
  | { state: 'revoked'; record: VerifiedCertificate }
  | { state: 'not-found' }
  | { state: 'error'; message: string };

/**
 * Look up a certificate by the token carried in its QR code.
 *
 * Calls the `verify_certificate` SECURITY DEFINER function rather than reading
 * the table. Anonymous callers have no table privileges whatsoever, so the
 * function's fixed column list is the only thing the public can ever see —
 * there is no client-side filtering to bypass.
 */
export async function verifyByToken(token: string): Promise<VerifyOutcome> {
  try {
    const { data, error } = await db().rpc('verify_certificate', { p_token: token });
    if (error) return { state: 'error', message: readableError(error) };

    const record = (data as VerifiedCertificate[] | null)?.[0];
    if (!record) return { state: 'not-found' };

    return { state: record.status === 'revoked' ? 'revoked' : 'valid', record };
  } catch (err) {
    return { state: 'error', message: readableError(err) };
  }
}

/**
 * Look up a certificate by its printed number.
 *
 * Requires the surname as well. Certificate numbers are sequential, so number
 * alone would let anyone walk the entire register; requiring a second field the
 * holder already knows makes the search useful to an employer with the
 * certificate in hand and useless to someone guessing.
 *
 * Returns strictly less than the token path — no photo, no student number,
 * no grade.
 */
export async function findByNumber(
  certificateNo: string,
  surname: string,
): Promise<
  | { state: 'valid' | 'revoked'; record: FoundCertificate }
  | { state: 'not-found' }
  | { state: 'error'; message: string }
> {
  try {
    const { data, error } = await db().rpc('find_certificate', {
      p_certificate_no: certificateNo,
      p_surname: surname,
    });
    if (error) return { state: 'error', message: readableError(error) };

    const record = (data as FoundCertificate[] | null)?.[0];
    if (!record) return { state: 'not-found' };

    return { state: record.status === 'revoked' ? 'revoked' : 'valid', record };
  } catch (err) {
    return { state: 'error', message: readableError(err) };
  }
}
