export interface DecodedToken {
  upn?: string;
  last_login?: number;
  groups?: string[];
}

export interface UserProfile {
  username: string;
  userRoles: string[];
  lastLogin: Date | null;
}
