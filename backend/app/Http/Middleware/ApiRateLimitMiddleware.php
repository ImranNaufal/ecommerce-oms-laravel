<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Symfony\Component\HttpFoundation\Response;

/**
 * API Rate Limit Middleware
 * 
 * Protects API endpoints from abuse
 * Different limits for authenticated vs guest users
 */
class ApiRateLimitMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $key = $this->resolveRequestSignature($request);
        $maxAttempts = $this->getMaxAttempts($request);
        $decayMinutes = 1;

        if (RateLimiter::tooManyAttempts($key, $maxAttempts)) {
            $retryAfter = RateLimiter::availableIn($key);

            return response()->json([
                'success' => false,
                'message' => 'Too many requests. Please try again later.',
                'retry_after' => $retryAfter,
            ], 429);
        }

        RateLimiter::hit($key, $decayMinutes * 60);

        $response = $next($request);

        // Add rate limit headers
        $response->headers->add([
            'X-RateLimit-Limit' => $maxAttempts,
            'X-RateLimit-Remaining' => RateLimiter::remaining($key, $maxAttempts),
        ]);

        return $response;
    }

    /**
     * Resolve request signature for rate limiting
     *
     * @param  Request  $request
     * @return string
     */
    protected function resolveRequestSignature(Request $request): string
    {
        if ($user = $request->user()) {
            return 'api-limit:user:' . $user->id;
        }

        return 'api-limit:ip:' . $request->ip();
    }

    /**
     * Get maximum attempts based on user authentication
     *
     * @param  Request  $request
     * @return int
     */
    protected function getMaxAttempts(Request $request): int
    {
        // Authenticated users get higher limits
        if ($request->user()) {
            return 120; // 120 requests per minute
        }

        // Guest users get lower limits
        return 60; // 60 requests per minute
    }
}
