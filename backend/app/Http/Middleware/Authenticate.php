<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

/**
 * JWT Authentication Middleware (Simplified)
 * 
 * Verifies JWT token without cache dependencies
 */
class Authenticate
{
    public function handle(Request $request, Closure $next, $guard = 'api')
    {
        try {
            // Check if Authorization header exists
            $header = $request->header('Authorization');
            
            if (!$header || !str_starts_with($header, 'Bearer ')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Access denied. No token provided.'
                ], 401);
            }
            
            // Extract token
            $token = substr($header, 7);
            
            // Set token for auth guard
            auth($guard)->setToken($token);
            
            // Authenticate user
            $user = auth($guard)->authenticate();
            
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid or expired token'
                ], 401);
            }
            
            return $next($request);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Authentication failed'
            ], 401);
        }
    }
}

