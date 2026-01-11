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
            $channel = DB::table('sales_channels')->where('id', $id)->first();

            // Log sync
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

            return response()->json(['success' => true, 'message' => 'Channel synced successfully']);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => 'Server error'], 500);
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
