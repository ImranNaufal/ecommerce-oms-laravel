<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Auth;

/**
 * Authentication Controller
 * 
 * Handles user authentication, registration, and session management
 * Uses JWT for stateless authentication
 */
class AuthController extends Controller
{
    /**
     * User Login
     * 
     * @param Request $request (email, password)
     * @return JsonResponse
     */
    public function login(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email',
            'password' => 'required|string|min:6',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 400);
        }

        try {
            // Find user by email
            $user = User::where('email', $request->email)->first();

            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid credentials'
                ], 401);
            }

            // Verify password using native password_verify() 
            // Compatible with both $2a$ (bcrypt from Node.js) and $2y$ (Laravel)
            if (!password_verify($request->password, $user->password)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid credentials'
                ], 401);
            }

            // Check if user is active
            if ($user->status !== 'active') {
                return response()->json([
                    'success' => false,
                    'message' => 'Account is inactive'
                ], 403);
            }

            // Generate JWT token using auth guard
            $token = auth('api')->login($user);

            return response()->json([
                'success' => true,
                'token' => $token,
                'user' => [
                    'id' => $user->id,
                    'username' => $user->username,
                    'email' => $user->email,
                    'full_name' => $user->full_name,
                    'role' => $user->role,
                    'status' => $user->status
                ]
            ]);

        } catch (\Exception $e) {
            \Log::error('Login error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Login failed: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * User Registration
     * 
     * Creates new user account dengan default role 'staff'
     * Admin users must be created manually in database
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function register(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'username' => 'required|string|min:3|max:50|unique:users',
            'email' => 'required|email|unique:users',
            'password' => 'required|string|min:6',
            'full_name' => 'required|string|max:100',
            'role' => 'in:staff,affiliate'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 400);
        }

        try {
            $user = User::create([
                'username' => $request->username,
                'email' => $request->email,
                'password' => Hash::make($request->password),
                'full_name' => $request->full_name,
                'role' => $request->role ?? 'staff',
                'status' => 'active'
            ]);

            // Create default commission config for affiliates
            if ($user->role === 'affiliate') {
                \DB::table('commission_configs')->insert([
                    'user_id' => $user->id,
                    'commission_type' => 'percentage',
                    'commission_value' => 5.00,
                    'tier' => 'bronze',
                    'effective_from' => now(),
                    'is_active' => true,
                    'created_at' => now()
                ]);
            }

            return response()->json([
                'success' => true,
                'message' => 'User registered successfully',
                'userId' => $user->id
            ], 201);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Registration failed'
            ], 500);
        }
    }

    /**
     * Get Current User Profile
     * 
     * Returns authenticated user details dengan commission config
     * 
     * @return JsonResponse
     */
    public function me()
    {
        try {
            $user = auth('api')->user();
            
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'User not authenticated'
                ], 401);
            }
            
            // Try to get commission config (skip if causes error)
            $commissionConfig = null;
            try {
                $commissionConfig = \DB::table('commission_configs')
                    ->where('user_id', $user->id)
                    ->where('is_active', true)
                    ->first();
            } catch (\Exception $e) {
                \Log::warning('Could not fetch commission config: ' . $e->getMessage());
            }

            return response()->json([
                'success' => true,
                'user' => [
                    'id' => $user->id,
                    'username' => $user->username,
                    'email' => $user->email,
                    'full_name' => $user->full_name,
                    'role' => $user->role,
                    'status' => $user->status,
                    'commission_type' => $commissionConfig->commission_type ?? null,
                    'commission_value' => $commissionConfig->commission_value ?? null,
                    'tier' => $commissionConfig->tier ?? null
                ]
            ]);

        } catch (\Exception $e) {
            \Log::error('Get profile error: ' . $e->getMessage() . "\nStack: " . $e->getTraceAsString());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch user profile',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Logout User
     * 
     * Invalidates current JWT token
     * 
     * @return JsonResponse
     */
    public function logout()
    {
        try {
            auth('api')->logout();
            
            return response()->json([
                'success' => true,
                'message' => 'Successfully logged out'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Logout failed'
            ], 500);
        }
    }
}
