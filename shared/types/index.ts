// ============================================================
//  MMT Care Connect — Shared Types
// ============================================================

export type UserRole = 'admin';
export type FacilityType = 'SIL' | 'SDA' | 'STA';
export type VacancyStatus = 'available' | 'reserved' | 'occupied';
export type UrgencyLevel = 'low' | 'medium' | 'high' | 'immediate';
export type ReferralSource = 'hospital' | 'coordinator' | 'family' | 'self';
export type ReferralStatus = 'new' | 'reviewing' | 'matched' | 'placed' | 'rejected';
export type EntityType = 'referral' | 'facility' | 'vacancy' | 'user' | 'placement';

export interface CareNeeds {
  personal_care?: boolean;
  nursing?: boolean;
  behavioural_support?: boolean;
  complex_medical?: boolean;
  overnight_support?: boolean;
  '24h_support'?: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  organisation?: string;
  phone?: string;
  is_active: boolean;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Facility {
  id: string;
  name: string;
  type: FacilityType;
  address: string;
  suburb: string;
  state: string;
  postcode?: string;
  latitude?: number;
  longitude?: number;
  description?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  image_url?: string;
  image_urls?: string[];
  capacity: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  vacancies?: Vacancy[];
}

export interface Vacancy {
  id: string;
  facility_id: string;
  facility?: Facility;
  status: VacancyStatus;
  label?: string;
  care_level_supported: CareNeeds;
  start_date: string;
  end_date?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Referral {
  id: string;
  client_name: string;
  client_age: number;
  care_needs: CareNeeds;
  urgency: UrgencyLevel;
  location_preference?: string;
  source_type: ReferralSource;
  source_contact?: string;
  notes?: string;
  status: ReferralStatus;
  assigned_facility_id?: string;
  assigned_facility?: Facility;
  assigned_vacancy_id?: string;
  submitted_by: string;
  submitted_by_user?: User;
  reviewed_by?: string;
  placed_at?: string;
  rejected_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface MatchResult {
  vacancy: Vacancy;
  facility: Facility;
  score: number;
  reasons: string[];
  distance_km?: number;
}

export interface ActivityLog {
  id: string;
  entity_type: EntityType;
  entity_id: string;
  action: string;
  metadata: Record<string, unknown>;
  performed_by?: string;
  performed_by_user?: User;
  ip_address?: string;
  created_at: string;
}

export interface AnalyticsSummary {
  total_referrals: number;
  active_referrals: number;
  placement_rate: number;
  avg_time_to_placement_days: number;
  urgent_referrals: number;
  occupancy_rate: number;
  available_beds: number;
  referrals_by_source: Record<ReferralSource, number>;
  referrals_by_status: Record<ReferralStatus, number>;
  placements_by_week: { week: string; count: number; referrals: number }[];
}

// API response wrappers
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  has_next: boolean;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: User;
}

export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
  details?: unknown;
}
