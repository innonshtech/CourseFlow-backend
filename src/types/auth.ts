import { Role, CreatorVerificationStatus } from "@prisma/client";

export { Role, CreatorVerificationStatus };

export interface JwtPayload {
  id: string;
  email: string;
  role: Role;
  iat?: number;
  exp?: number;
}

export interface UserResponseDto {
  id: string;
  name: string;
  email: string;
  role: Role;
  profileImage?: string | null;
  avatar?: string | null;
  bio?: string | null;
  verificationStatus?: CreatorVerificationStatus | null;
  rejectionReason?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthSuccessData {
  user: UserResponseDto;
  token?: string;
}
