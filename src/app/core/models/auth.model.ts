export interface LoginFormData {
  email: string;
  password: string;
}

export interface RegisterFormData {
  email: string;
  username: string;
  password: string;
}

export interface AuthResult {
  success: boolean;
  error?: string;
}

export type SocialProvider = 'Google' | 'GitHub';
