<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

/**
 * Role-Based Authorization Middleware
 * 
 * Usage: ->middleware('role:admin')
 *        ->middleware('role:admin,staff')
 * 
 * Blocks access if user role doesn't match required roles
 */
class RoleMiddleware
{
    /**
     * Handle incoming request
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure  $next
     * @param  string  ...$roles
     * @return mixed
     */
    public function handle(Request $request, Closure $next, ...$roles)
    {
        // Check if user is authenticated
        if (!auth()->check()) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthenticated'
            ], 401);
        }

        $user = auth()->user();

        // Check if user's role is in allowed roles
        if (!in_array($user->role, $roles)) {
            return response()->json([
                'success' => false,
                'message' => 'Access denied. Insufficient permissions.'
            ], 403);
        }

        return $next($request);
    }
}
