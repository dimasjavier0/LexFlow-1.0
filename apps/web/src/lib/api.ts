import type { Session } from "@supabase/supabase-js";

const apiUrl = import.meta.env.VITE_API_URL;

if (!apiUrl) {
  throw new Error("Missing VITE_API_URL");
}

export type ApiUser = {
  id: string;
  email: string;
  role: "USER" | "ADMIN";
  createdAt: string;
  updatedAt: string;
};

export async function getCurrentUser(session: Session): Promise<ApiUser> {
  const response = await fetch(`${apiUrl}/me`, {
    headers: { Authorization: `Bearer ${session.access_token}` },
  });

  if (!response.ok) {
    throw new Error("No se pudo sincronizar el usuario con la API.");
  }

  const body = (await response.json()) as { user: ApiUser };
  return body.user;
}