// API client with JWT authentication
export const api = async (path, opts = {}) => {
  const token = localStorage.token || '';
  const r = await fetch('/api' + path, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      Authorization: token ? 'Bearer ' + token : '',
      ...(opts.headers || {}),
    },
    body: opts.body && JSON.stringify(opts.body),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) {
    if (r.status === 401 && !path.startsWith('/auth')) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.dispatchEvent(new Event('auth:logout'));
    }
    throw new Error(d.error || 'Request failed');
  }
  return d;
};

