export interface DiscoverableStudent {
  id: string;
  name: string;
  username: string;
  avatarUrl: string;
  headline: string;
  course: string;
  interests: string[];
  institution: string;
  level: string;
  isActive: boolean;
  lastActiveAt?: string;
  isVerified: boolean;
  relationshipState?:
    | 'none'
    | 'outgoing_pending'
    | 'incoming_pending'
    | 'connected'
    | 'self'
    | 'blocked';
  connectionId?: string;
}

export interface PaginatedStudentsResponse {
  data: DiscoverableStudent[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
}

export interface NetworkFiltersResponse {
  courses: string[];
  interests: string[];
  institutions: string[];
  levels: string[];
}
