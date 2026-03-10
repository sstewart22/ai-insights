import api from "@/services/api";

export async function changeMyPassword(payload: {
  currentPassword: string;
  newPassword: string;
}) {
  const { data } = await api.patch("/uiapi/auth/password", payload);
  return data;
}

export async function getTwoFactorStatus() {
  const { data } = await api.get("/uiapi/auth/2fa/status");
  return data;
}

export async function beginTwoFactorSetup() {
  const { data } = await api.post("/uiapi/auth/2fa/setup");
  return data;
}

export async function confirmTwoFactor(code: string) {
  const { data } = await api.post("/uiapi/auth/2fa/confirm", { code });
  return data;
}

export async function disableTwoFactor(code: string) {
  const { data } = await api.post("/uiapi/auth/2fa/disable", { code });
  return data;
}

export async function resetTwoFactor(code: string) {
  const { data } = await api.post("/uiapi/auth/2fa/reset", { code });
  return data;
}
