<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ChannelController extends Controller
{
    public function index()
    {
        try {
            $channels = \App\Models\SalesChannel::withCount('orders as total_orders')->get();

            // Check connection status for each channel
            $channels = $channels->map(function($channel) {
                $channel->connection_status = $this->testConnection($channel);
                return $channel;
            });

            return response()->json([
                'success' => true,
                'data' => $channels
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false, 
                'message' => 'Server error',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Test actual API connection
     * Returns: 'connected', 'disconnected', or 'not_configured'
     */
    private function testConnection($channel)
    {
        // Don't test internal website channel - always connected
        if ($channel->type === 'website') {
            return 'connected';
        }

        // For external channels, check if API credentials configured
        if (empty($channel->api_key) || empty($channel->api_endpoint)) {
            return 'not_configured';
        }

        try {
            // Test connection to external API
            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $channel->api_endpoint);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_TIMEOUT, 5); // 5 second timeout
            curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 5);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); // For testing
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'Authorization: Bearer ' . $channel->api_key,
                'Content-Type: application/json'
            ]);

            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $error = curl_error($ch);
            curl_close($ch);

            // Consider 200-299 as successful connection
            // Some APIs return 401 unauthorized but that means they're reachable
            if ($httpCode >= 200 && $httpCode < 500) {
                return 'connected';
            }

            // API not reachable
            \Log::warning("Channel {$channel->name} connection failed: HTTP {$httpCode}, Error: {$error}");
            return 'disconnected';

        } catch (\Exception $e) {
            \Log::error("Channel {$channel->name} connection test error: " . $e->getMessage());
            return 'disconnected';
        }
    }

    public function update(Request $request, $id)
    {
        try {
            $allowedFields = ['name', 'api_endpoint', 'api_key', 'is_active', 'sync_frequency'];
            $updates = [];

            foreach ($allowedFields as $field) {
                if ($request->has($field)) {
                    $updates[$field] = $request->input($field);
                }
            }

            if (empty($updates)) {
                return response()->json(['success' => false, 'message' => 'No valid fields'], 400);
            }

            DB::table('sales_channels')->where('id', $id)->update($updates);

            return response()->json(['success' => true, 'message' => 'Channel updated']);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => 'Server error'], 500);
        }
    }

    public function sync($id)
    {
        try {
            $channel = \App\Models\SalesChannel::find($id);
            
            if (!$channel) {
                return response()->json(['success' => false, 'message' => 'Channel not found'], 404);
            }

            // Test actual connection
            $connectionStatus = $this->testConnection($channel);
            
            if ($connectionStatus === 'not_configured') {
                return response()->json([
                    'success' => false, 
                    'message' => 'API credentials not configured. Please configure API endpoint and key first.'
                ], 400);
            }

            if ($connectionStatus === 'disconnected') {
                // Log failed sync attempt
                DB::table('api_logs')->insert([
                    'channel_id' => $id,
                    'endpoint' => $channel->api_endpoint ?? 'manual_sync',
                    'method' => 'GET',
                    'request_payload' => json_encode(['action' => 'manual_sync', 'channel_id' => $id]),
                    'response_payload' => json_encode(['success' => false, 'error' => 'Connection failed']),
                    'success' => false,
                    'created_at' => now()
                ]);

                return response()->json([
                    'success' => false, 
                    'message' => 'Failed to connect to ' . $channel->name . ' API. Please check your credentials and network connection.'
                ], 503);
            }

            // Connection successful - log sync
            DB::table('api_logs')->insert([
                'channel_id' => $id,
                'endpoint' => $channel->api_endpoint ?? 'manual_sync',
                'method' => 'GET',
                'request_payload' => json_encode(['action' => 'manual_sync', 'channel_id' => $id]),
                'response_payload' => json_encode(['success' => true, 'synced_at' => now()]),
                'success' => true,
                'created_at' => now()
            ]);

            DB::table('sales_channels')->where('id', $id)->update(['last_sync_at' => now()]);

            return response()->json([
                'success' => true, 
                'message' => $channel->name . ' synced successfully!'
            ]);

        } catch (\Exception $e) {
            \Log::error("Sync error for channel {$id}: " . $e->getMessage());
            return response()->json([
                'success' => false, 
                'message' => 'Sync failed: ' . $e->getMessage()
            ], 500);
        }
    }

    public function logs()
    {
        try {
            $logs = DB::table('api_logs as al')
                ->leftJoin('sales_channels as sc', 'al.channel_id', '=', 'sc.id')
                ->select('al.*', 'sc.name as channel_name')
                ->orderBy('al.created_at', 'desc')
                ->limit(50)
                ->get();

            return response()->json(['success' => true, 'data' => $logs]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => 'Server error'], 500);
        }
    }
}
