/**
 * Per-run link checker.
 *
 * Inside `inspectPage` we extract every internal anchor (`a[href]` whose
 * hostname matches the QA target) and ask this checker for its HTTP
 * status. The checker:
 *
 *  - dedupes across pages (the same nav/footer link shows up on every
 *    page, no point checking it 600 times)
 *  - prefers HEAD; falls back to GET if the server returns 405 / 5xx
 *  - bounds parallelism so a slow upstream can't pin all sockets
 *  - bounds wall-clock per request via AbortController
 *
 * A "broken" link is any 4xx/5xx response or a network/timeout error.
 * 3xx redirects are followed (fetch handles them), so chains resolve to
 * their final status.
 */
export type LinkCheckResult = {
  url: string;
  status: number | null;
  ok: boolean;
  reason?: string;
};

const REQUEST_TIMEOUT_MS = 5_000;
const MAX_CONCURRENCY = 6;
const USER_AGENT =
  "FlowtestQA/1.0 (+monitoring; broken-link checker; contact: qa-monitor@zeni.ai)";

export class LinkChecker {
  private cache = new Map<string, LinkCheckResult>();
  private inflight = new Map<string, Promise<LinkCheckResult>>();
  private active = 0;
  private waiters: Array<() => void> = [];

  constructor(private readonly origin: string) {}

  /**
   * Returns true if the URL belongs to the same origin as this checker —
   * i.e. it's an internal link worth validating. We skip cross-origin
   * links to keep CRM/marketing-page noise out of the report.
   */
  isInternal(rawHref: string): boolean {
    try {
      const url = new URL(rawHref, this.origin);
      const me = new URL(this.origin);
      return url.host === me.host && (url.protocol === "http:" || url.protocol === "https:");
    } catch {
      return false;
    }
  }

  /**
   * Check a list of URLs and return only the broken ones. Same URL
   * across calls is checked at most once per run.
   */
  async checkMany(urls: string[]): Promise<LinkCheckResult[]> {
    const unique = Array.from(new Set(urls.map((u) => normalizeUrl(u, this.origin)).filter(Boolean) as string[]));
    const results = await Promise.all(unique.map((u) => this.checkOne(u)));
    return results.filter((r) => !r.ok);
  }

  private async checkOne(url: string): Promise<LinkCheckResult> {
    const cached = this.cache.get(url);
    if (cached) return cached;
    const inflight = this.inflight.get(url);
    if (inflight) return inflight;

    const promise = (async (): Promise<LinkCheckResult> => {
      await this.acquireSlot();
      try {
        let result = await this.fetchOnce(url, "HEAD");
        // Some servers return 405 on HEAD or refuse it altogether; retry
        // with GET so we don't false-positive every site behind that
        // policy.
        if (
          !result.ok &&
          (result.status === 405 || result.status === 403 || result.status === null)
        ) {
          const fallback = await this.fetchOnce(url, "GET");
          if (fallback.ok || (fallback.status && fallback.status < 500)) {
            result = fallback;
          }
        }
        this.cache.set(url, result);
        return result;
      } finally {
        this.releaseSlot();
        this.inflight.delete(url);
      }
    })();

    this.inflight.set(url, promise);
    return promise;
  }

  private async fetchOnce(url: string, method: "HEAD" | "GET"): Promise<LinkCheckResult> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        method,
        redirect: "follow",
        signal: controller.signal,
        headers: { "user-agent": USER_AGENT, accept: "*/*" }
      });
      const ok = response.status >= 200 && response.status < 400;
      return {
        url,
        status: response.status,
        ok,
        reason: ok ? undefined : `HTTP ${response.status}`
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const isTimeout = /aborted|timeout/i.test(message);
      return {
        url,
        status: null,
        ok: false,
        reason: isTimeout ? "Request timed out" : message.slice(0, 120)
      };
    } finally {
      clearTimeout(timer);
    }
  }

  private async acquireSlot() {
    if (this.active < MAX_CONCURRENCY) {
      this.active += 1;
      return;
    }
    await new Promise<void>((resolve) => this.waiters.push(resolve));
    this.active += 1;
  }

  private releaseSlot() {
    this.active -= 1;
    const next = this.waiters.shift();
    if (next) next();
  }
}

function normalizeUrl(raw: string, origin: string): string | null {
  try {
    const url = new URL(raw, origin);
    // Strip fragments — `#section` doesn't change the HTTP response.
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}
