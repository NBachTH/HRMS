// lib/fetcher.ts
export async function fetchWithCookies(input: RequestInfo, init: RequestInit = {}) {
    const opts: RequestInit = {
        ...init,
        credentials: 'include' // important to send/receive cookies
    };
    const res = await fetch(input, opts);
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw { status: res.status, body };
    return body;
}
