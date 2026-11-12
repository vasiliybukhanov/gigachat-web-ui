type TokenResponse = {
  access_token: string;
  expires_in: number;
};

let cached: { value: string; expiresAt: number } | null = null;

export const getToken = async (): Promise<string> => {
  if (cached && Date.now() < cached.expiresAt - 2 * 60_0000)
    return cached.value;

  const config = useRuntimeConfig();

  const res = await $fetch<TokenResponse>(
    "https://ngw.devices.sberbank.ru:9443/api/v2/oauth",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
        RqUID: crypto.randomUUID(),
        Authorization: `Basic ${config.apiKey}`,
      },
      body: new URLSearchParams({ scope: config.scope }),
    },
  );

  cached = { value: res.access_token, expiresAt: res.expires_in };

  return cached.value;
};
