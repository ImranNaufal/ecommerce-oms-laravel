<?php

namespace App\Http\Controllers;

use App\Models\SalesChannel;
use Illuminate\Http\Request;

class SalesChannelController extends Controller
{
    public function index()
    {
        try {
            return response()->json([
                'success' => true,
                'data' => SalesChannel::all()
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ], 500);
        }
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|unique:sales_channels,name',
            'type' => 'required|string',
            'api_key' => 'nullable|string',
        ]);

        $channel = SalesChannel::create($validated);
        return response()->json($channel, 201);
    }

    public function show($id)
    {
        return SalesChannel::findOrFail($id);
    }

    public function update(Request $request, $id)
    {
        $channel = SalesChannel::findOrFail($id);
        $channel->update($request->all());
        return response()->json($channel);
    }

    public function destroy($id)
    {
        SalesChannel::findOrFail($id)->delete();
        return response()->json(null, 204);
    }
}
