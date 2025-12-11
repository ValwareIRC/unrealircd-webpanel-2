import api from './api';

export interface TLSStats {
  total_users: number;
  tls_users: number;
  plain_users: number;
  tls_percentage: number;
  cipher_usage: Record<string, number>;
  unique_fingerprints: number;
}

export interface TLSUserInfo {
  nick: string;
  ident: string;
  hostname: string;
  real_host?: string;
  cipher?: string;
  certfp?: string;
  has_tls: boolean;
  server?: string;
}

export interface CertFPGroup {
  fingerprint: string;
  users: TLSUserInfo[];
  count: number;
}

export interface CipherInfo {
  cipher: string;
  count: number;
  users?: string[];
}

export const tlsService = {
  getStats: async (): Promise<TLSStats> => {
    const response = await api.get<TLSStats>('/tls/stats');
    return response.data;
  },

  getUsers: async (options?: { tlsOnly?: boolean; plainOnly?: boolean }): Promise<TLSUserInfo[]> => {
    const params = new URLSearchParams();
    if (options?.tlsOnly) params.set('tls_only', 'true');
    if (options?.plainOnly) params.set('plain_only', 'true');
    
    const response = await api.get<TLSUserInfo[]>(`/tls/users?${params.toString()}`);
    return response.data;
  },

  getFingerprints: async (): Promise<CertFPGroup[]> => {
    const response = await api.get<CertFPGroup[]>('/tls/fingerprints');
    return response.data;
  },

  getCiphers: async (): Promise<CipherInfo[]> => {
    const response = await api.get<CipherInfo[]>('/tls/ciphers');
    return response.data;
  },
};

export default tlsService;
