import type { UserResource } from '@clerk/types';

const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

interface ResolveOptions {
  clerkUser?: Pick<UserResource, 'publicMetadata' | 'privateMetadata' | 'id'> | null;
}

/**
 * Translate Clerk user IDs to the legacy Supabase UUID format.
 * Returns `null` when no compatible ID is available so callers can gracefully skip Supabase queries.
 */
export function mapClerkIdToLegacyUserId(
  externalUserId: string | null | undefined,
  options?: ResolveOptions
): string | null {
  if (!externalUserId) {
    return null;
  }

  if (UUID_REGEX.test(externalUserId)) {
    return externalUserId;
  }

  const metadataSource = options?.clerkUser;
  const metadataSupabaseId =
    (metadataSource?.publicMetadata as Record<string, unknown> | undefined)?.supabaseId ??
    (metadataSource?.privateMetadata as Record<string, unknown> | undefined)?.supabaseId;

  if (typeof metadataSupabaseId === 'string' && UUID_REGEX.test(metadataSupabaseId)) {
    return metadataSupabaseId;
  }

  console.warn('Supabase data unavailable: user ID is not a UUID', externalUserId);
  return null;
}
