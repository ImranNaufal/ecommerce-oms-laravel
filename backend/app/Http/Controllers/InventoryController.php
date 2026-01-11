<?php

namespace App\Http\Controllers;

use App\Models\InventoryTransaction;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;

class InventoryController extends Controller
{
    public function index(Request $request)
    {
        $query = InventoryTransaction::with(['product', 'creator']);

        if ($request->has('product_id')) {
            $query->where('product_id', $request->product_id);
        }

        return response()->json($query->paginate(20));
    }

    public function adjust(Request $request)
    {
        $validated = $request->validate([
            'product_id' => 'required|exists:products,id',
            'quantity' => 'required|integer', // Positive for add, negative for remove
            'reason' => 'required|string',
            'type' => 'required|in:adjustment,return,purchase,sale',
        ]);

        try {
            DB::beginTransaction();

            $product = Product::lockForUpdate()->findOrFail($validated['product_id']);
            
            // Create transaction record
            $transaction = InventoryTransaction::create([
                'product_id' => $product->id,
                'transaction_type' => $validated['type'],
                'quantity' => $validated['quantity'],
                'reference_type' => 'manual',
                'notes' => $validated['reason'],
                'created_by' => Auth::id() ?? 1,
            ]);

            // Update product stock
            $product->increment('stock_quantity', $validated['quantity']);

            DB::commit();

            return response()->json($transaction, 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }
}
