const isProduction = process.env.NODE_ENV === 'production';
const useLocalDb = process.env.USE_LOCAL_DB === 'true';

export function shouldUseLocalDb(): boolean {
  if (isProduction && !useLocalDb) {
    return false;
  }
  return true;
}

export function shouldUseSupabaseDb(): boolean {
  return isProduction && !useLocalDb;
}

export function getDbMode(): 'local' | 'supabase' {
  return shouldUseLocalDb() ? 'local' : 'supabase';
}

export function calculateAgeBand(birthDate: Date | null): 'child' | 'teen' | 'adult' {
  if (!birthDate) return 'adult';
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  if (age < 13) return 'child';
  if (age < 18) return 'teen';
  return 'adult';
}

export function calculateBirthYear(birthDate: Date | null): number | null {
  if (!birthDate) return null;
  return birthDate.getFullYear();
}

export function deriveIsMinor(birthDate: Date | null): boolean {
  const ageBand = calculateAgeBand(birthDate);
  return ageBand === 'child' || ageBand === 'teen';
}

export function sanitizeProfileForPublic<T extends Record<string, any>>(profile: T): Omit<T, 'birthDate' | 'password' | 'email' | 'parentEmail'> & { ageBand: string } {
  const { birthDate, password, email, parentEmail, ...publicFields } = profile;
  return {
    ...publicFields,
    ageBand: profile.ageBand || calculateAgeBand(birthDate ? new Date(birthDate) : null),
  };
}

export function canViewFullProfile(viewerId: string | undefined, profileOwnerId: string, approvedParentId?: string): boolean {
  if (!viewerId) return false;
  if (viewerId === profileOwnerId) return true;
  if (approvedParentId && viewerId === approvedParentId) return true;
  return false;
}

console.log(`[DB Adapter] Mode: ${getDbMode()}, Production: ${isProduction}, UseLocalDb: ${useLocalDb}`);
