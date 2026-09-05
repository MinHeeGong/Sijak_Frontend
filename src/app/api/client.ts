// src/api/client.ts
// 백엔드가 항상 { success: true, data } 또는 { success: false, error } 형태로 응답하므로
// (개발 가이드라인 2번 규칙), 여기서 한 번에 풀어서 각 리소스 파일은 얇게 유지합니다.

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api';

interface ApiSuccess<T> {
  success: true;
  data: T;
}
interface ApiFailure {
  success: false;
  error: string;
}
type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export class ApiError extends Error {}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include', // 로그인 쿠키(sijak_token)를 매 요청에 실어 보내기 위해 필수
    ...options,
  });

  const json: ApiResponse<T> = await res.json();

  if (!json.success) {
    throw new ApiError(json.error);
  }

  return json.data;
}

export const apiGet = <T>(path: string) => request<T>(path, { method: 'GET' });

export const apiPost = <T>(path: string, body: unknown) =>
  request<T>(path, { method: 'POST', body: JSON.stringify(body) });

export const apiPut = <T>(path: string, body: unknown) =>
  request<T>(path, { method: 'PUT', body: JSON.stringify(body) });

export const apiPatch = <T>(path: string, body: unknown) =>
  request<T>(path, { method: 'PATCH', body: JSON.stringify(body) });

export const apiDelete = <T>(path: string) => request<T>(path, { method: 'DELETE' });
