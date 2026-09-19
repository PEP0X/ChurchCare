export interface License {
  id: string;
  serial_key: string;
  client_name: string;
  hwid: string | null;
  status: 'unactivated' | 'active' | 'revoked';
  max_activations: number;
  activated_at: string | null;
  created_at: string | null;
  notes: string | null;
}

export interface ChurchServiceItem {
  id: string;
  name: string;
  icon: string;
  description: string;
  badgeClass: string;
}

export interface CreateLicensePayload {
  client_name: string;
  notes?: string;
  church_name?: string;
  user_name?: string;
  services?: string[];
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}
