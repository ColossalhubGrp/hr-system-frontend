import { NextRequest, NextResponse } from 'next/server';

// Resolved MinIO URL per sessionId, cached in-process. Saves a HEAD probe
// on every chunk request — without this, every Range request the browser
// fires (and there are dozens during scrubbing) would cost an extra round
// trip to MinIO just to figure out whether the file is .mp4 or .webm.
const resolvedUrlCache = new Map<string, string>();
const RESOLVE_CACHE_LIMIT = 500;

function rememberResolvedUrl(sessionId: string, url: string) {
    if (resolvedUrlCache.size >= RESOLVE_CACHE_LIMIT) {
        const firstKey = resolvedUrlCache.keys().next().value;
        if (firstKey) resolvedUrlCache.delete(firstKey);
    }
    resolvedUrlCache.set(sessionId, url);
}

async function resolveRecordingUrl(base: string, sessionId: string): Promise<string | null> {
    const cached = resolvedUrlCache.get(sessionId);
    if (cached) return cached;

    // Egress writes .mp4 (Room Composite default). Old client-side recordings
    // were .webm. Probe both with HEAD so we don't pull bodies we throw away.
    const candidates = [`${base}/recording.mp4`, `${base}/recording.webm`];
    for (const candidate of candidates) {
        try {
            const head = await fetch(candidate, { method: 'HEAD' });
            if (head.ok) {
                rememberResolvedUrl(sessionId, candidate);
                return candidate;
            }
        } catch {
            // Network blip — try the next candidate.
        }
    }
    return null;
}

const FORWARDED_RESPONSE_HEADERS = [
    'content-type',
    'content-length',
    'content-range',
    'accept-ranges',
    'last-modified',
    'etag',
];

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const sessionId = searchParams.get('sessionId');

        if (!sessionId) {
            return NextResponse.json(
                { error: 'Missing sessionId parameter' },
                { status: 400 }
            );
        }

        const minioEndpoint = process.env.MINIO_ENDPOINT || '38.242.235.41';
        const minioPort = process.env.MINIO_PORT || '9002';
        const minioBucket = process.env.MINIO_BUCKET || 'livekit-recordings';
        const useSSL = process.env.MINIO_USE_SSL === 'true';
        const protocol = useSSL ? 'https' : 'http';
        const base = `${protocol}://${minioEndpoint}:${minioPort}/${minioBucket}/interviews/${sessionId}`;

        const resolved = await resolveRecordingUrl(base, sessionId);
        if (!resolved) {
            return NextResponse.json({ error: 'Recording not found' }, { status: 404 });
        }

        // Forward the browser's Range header so MinIO returns 206 Partial
        // Content with just the requested byte range. This is what makes
        // <video> playback start within a few hundred ms instead of waiting
        // for the entire file to download.
        const range = request.headers.get('range');
        const upstreamHeaders: HeadersInit = {};
        if (range) upstreamHeaders['Range'] = range;

        const upstream = await fetch(resolved, { headers: upstreamHeaders });

        if (!upstream.ok && upstream.status !== 206) {
            // Cached URL might be stale (file deleted, bucket renamed). Drop
            // the cache so the next request re-probes.
            resolvedUrlCache.delete(sessionId);
            return NextResponse.json(
                { error: 'Recording not available' },
                { status: upstream.status }
            );
        }

        const headers = new Headers();
        for (const name of FORWARDED_RESPONSE_HEADERS) {
            const value = upstream.headers.get(name);
            if (value) headers.set(name, value);
        }
        if (!headers.has('content-type')) {
            headers.set(
                'content-type',
                resolved.endsWith('.mp4') ? 'video/mp4' : 'video/webm'
            );
        }
        if (!headers.has('accept-ranges')) {
            headers.set('accept-ranges', 'bytes');
        }
        // Recordings never mutate, so cache aggressively. Browsers will reuse
        // the same byte ranges across page visits.
        headers.set('cache-control', 'public, max-age=31536000, immutable');

        return new NextResponse(upstream.body, {
            status: upstream.status, // 206 when Range was satisfied, 200 otherwise
            headers,
        });
    } catch (error) {
        console.error('Error streaming recording:', error);
        return NextResponse.json(
            { error: 'Failed to stream recording' },
            { status: 500 }
        );
    }
}

// Some browsers (Safari, mobile Chrome) fire a HEAD before requesting the
// video to discover length + Accept-Ranges. Returning 405 from HEAD makes
// them fall back to less-efficient strategies. Mirror the GET resolution
// without the body.
export async function HEAD(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const sessionId = searchParams.get('sessionId');
        if (!sessionId) return new NextResponse(null, { status: 400 });

        const minioEndpoint = process.env.MINIO_ENDPOINT || '38.242.235.41';
        const minioPort = process.env.MINIO_PORT || '9002';
        const minioBucket = process.env.MINIO_BUCKET || 'livekit-recordings';
        const useSSL = process.env.MINIO_USE_SSL === 'true';
        const protocol = useSSL ? 'https' : 'http';
        const base = `${protocol}://${minioEndpoint}:${minioPort}/${minioBucket}/interviews/${sessionId}`;

        const resolved = await resolveRecordingUrl(base, sessionId);
        if (!resolved) return new NextResponse(null, { status: 404 });

        const upstream = await fetch(resolved, { method: 'HEAD' });
        const headers = new Headers();
        for (const name of FORWARDED_RESPONSE_HEADERS) {
            const value = upstream.headers.get(name);
            if (value) headers.set(name, value);
        }
        if (!headers.has('content-type')) {
            headers.set(
                'content-type',
                resolved.endsWith('.mp4') ? 'video/mp4' : 'video/webm'
            );
        }
        headers.set('accept-ranges', 'bytes');
        headers.set('cache-control', 'public, max-age=31536000, immutable');
        return new NextResponse(null, { status: upstream.status, headers });
    } catch {
        return new NextResponse(null, { status: 500 });
    }
}
