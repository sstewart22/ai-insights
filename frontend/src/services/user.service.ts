import api from "@/services/api";

export async function createUser(payload: {
  email: string;
  displayName: string;
  password: string;
}) {
  const { data } = await api.post("/uiapi/users/create", payload);
  return data;
}
