export function consumeOneTimeToken(queryToken: unknown, routeHash = ''): string {
  const fragmentToken = new URLSearchParams(routeHash.replace(/^#/, '')).get('token');
  const token = fragmentToken ?? (typeof queryToken === 'string' ? queryToken : '');

  if (token && typeof window !== 'undefined') {
    const current = new URL(window.location.href);
    current.searchParams.delete('token');
    current.hash = '';
    const safeUrl = `${current.pathname}${current.search}` || '/';
    window.history.replaceState(window.history.state, '', safeUrl);
  }

  return token;
}
