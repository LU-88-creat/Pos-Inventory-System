export function apiFetch(input, options = {}) {
  const savedAuth = sessionStorage.getItem("retailflow_auth");
  const auth = savedAuth ? JSON.parse(savedAuth) : null;
  const headers = new Headers(options.headers);

  if (auth?.token) {
    headers.set("Authorization", `Bearer ${auth.token}`);
  }

  return fetch(input, { ...options, headers });
}
