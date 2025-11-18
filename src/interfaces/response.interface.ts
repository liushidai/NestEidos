export interface ApiResponse<T = any> {
  code: number;
  message: string;
  data?: T;
  timestamp: string;
  path: string;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  data: T[];
  meta?: PaginationMeta;
}
