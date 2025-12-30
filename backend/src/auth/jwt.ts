import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const JWT_EXPIRES_IN = '7d';
const JWT_REFRESH_EXPIRES_IN = '30d'; // Refresh tokens last longer

export interface JWTPayload {
  userId: string;
  walletAddress: string;
  type?: 'access' | 'refresh';
}

export const signToken = (payload: JWTPayload, isRefreshToken = false): string => {
  const expiresIn = isRefreshToken ? JWT_REFRESH_EXPIRES_IN : JWT_EXPIRES_IN;
  return jwt.sign({ ...payload, type: isRefreshToken ? 'refresh' : 'access' }, JWT_SECRET, {
    expiresIn,
  });
};

export const verifyToken = (token: string): JWTPayload | null => {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
};

/**
 * Refresh an access token using a refresh token
 */
export const refreshAccessToken = (refreshToken: string): string | null => {
  const payload = verifyToken(refreshToken);
  if (!payload || payload.type !== 'refresh') {
    return null;
  }

  // Generate new access token
  return signToken(
    {
      userId: payload.userId,
      walletAddress: payload.walletAddress,
    },
    false
  );
};
