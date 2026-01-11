<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

/**
 * Product Controller
 * 
 * Manages product catalog with automated SKU generation
 * SKU Format: {CATEGORY_PREFIX}-{NUMBER}
 * Example: ELEC-001, FASH-002
 */
class ProductController extends Controller
{
    /**
     * Generate Next Available SKU for Category
     * 
     * Automatically generates unique SKU based on category
     * Does NOT rearrange on delete (prevents broken references)
     * 
     * @param int $categoryId
     * @return string|null
     */
    private function generateNextSKU($categoryId)
    {
        try {
            // Get category slug
            $category = DB::table('categories')->where('id', $categoryId)->first();
            
            if (!$category) {
                return null;
            }

            // Get prefix (first 4 characters of slug, uppercase)
            $prefix = strtoupper(substr($category->slug, 0, 4));

            // Find highest existing SKU with this prefix
            $lastSKU = DB::table('products')
                ->where('sku', 'LIKE', "{$prefix}-%")
                ->orderBy('sku', 'desc')
                ->value('sku');

            $nextNumber = 1;
            if ($lastSKU) {
                $parts = explode('-', $lastSKU);
                $lastNumber = isset($parts[1]) ? intval($parts[1]) : 0;
                $nextNumber = $lastNumber + 1;
            }

            // Format: PREFIX-001
            return $prefix . '-' . str_pad($nextNumber, 3, '0', STR_PAD_LEFT);

        } catch (\Exception $e) {
            \Log::error('Generate SKU error: ' . $e->getMessage());
            return null;
        }
    }

    /**
     * Get All Products (with search and pagination)
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function index(Request $request)
    {
        try {
            $perPage = $request->input('limit', 20);
            
            $query = DB::table('products as p')
                ->leftJoin('categories as c', 'p.category_id', '=', 'c.id')
                ->select('p.*', 'c.name as category_name');

            // Search filter
            if ($request->filled('search')) {
                $search = $request->search;
                $query->where(function($q) use ($search) {
                    $q->where('p.name', 'LIKE', "%{$search}%")
                      ->orWhere('p.sku', 'LIKE', "%{$search}%")
                      ->orWhere('p.description', 'LIKE', "%{$search}%");
                });
            }

            // Category filter
            if ($request->filled('category')) {
                $query->where('p.category_id', $request->category);
            }

            // Status filter
            if ($request->filled('status')) {
                $query->where('p.status', $request->status);
            } else {
                // By default, hide inactive (archived) products
                $query->whereIn('p.status', ['active', 'out_of_stock']);
            }

            $products = $query->orderBy('p.created_at', 'desc')->paginate($perPage);

            return response()->json([
                'success' => true,
                'data' => $products->items(),
                'pagination' => [
                    'page' => $products->currentPage(),
                    'limit' => $products->perPage(),
                    'total' => $products->total(),
                    'pages' => $products->lastPage()
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Server error'
            ], 500);
        }
    }

    /**
     * Create New Product with Auto-Generated SKU
     * 
     * SKU is automatically generated based on category
     * User does not need to provide SKU manually
     * 
     * @param Request $request
     * @return JsonResponse
     */
    
    public function show($id)
    {
        try {
            $product = DB::table('products as p')
                ->leftJoin('categories as c', 'p.category_id', '=', 'c.id')
                ->select('p.*', 'c.name as category_name')
                ->where('p.id', $id)
                ->first();

            if (!$product) {
                return response()->json(['success' => false, 'message' => 'Product not found'], 404);
            }

            return response()->json(['success' => true, 'data' => $product]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => 'Server error'], 500);
        }
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'category_id' => 'required|integer|exists:categories,id',
            'name' => 'required|string|max:200',
            'price' => 'required|numeric|min:0',
            'stock_quantity' => 'required|integer|min:0',
            'cost_price' => 'nullable|numeric|min:0',
            'image_url' => 'nullable|url'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 400);
        }

        try {
            // Auto-generate SKU
            $sku = $this->generateNextSKU($request->category_id);
            
            if (!$sku) {
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to generate SKU'
                ], 400);
            }

            $productId = DB::table('products')->insertGetId([
                'category_id' => $request->category_id,
                'sku' => $sku,
                'name' => $request->name,
                'description' => $request->input('description'),
                'price' => $request->price,
                'cost_price' => $request->input('cost_price', 0),
                'stock_quantity' => $request->stock_quantity,
                'low_stock_threshold' => $request->input('low_stock_threshold', 10),
                'image_url' => $request->input('image_url'),
                'status' => 'active',
                'created_at' => now()
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Product created successfully',
                'productId' => $productId,
                'sku' => $sku
            ], 201);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Server error'
            ], 500);
        }
    }

    /**
     * Update Product
     * 
     * Note: SKU cannot be changed after creation
     * 
     * @param Request $request
     * @param int $id
     * @return JsonResponse
     */
    public function update(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'category_id' => 'integer|exists:categories,id',
            'name' => 'string|max:200',
            'price' => 'numeric|min:0',
            'stock_quantity' => 'integer|min:0',
            'cost_price' => 'nullable|numeric|min:0',
            'image_url' => 'nullable|url',
            'status' => 'in:active,out_of_stock,inactive'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 400);
        }

        try {
            $allowedFields = [
                'category_id', 'name', 'description', 'price', 
                'cost_price', 'stock_quantity', 'low_stock_threshold', 
                'image_url', 'status'
            ];

            $updates = [];
            foreach ($allowedFields as $field) {
                if ($request->has($field)) {
                    $updates[$field] = $request->input($field);
                }
            }

            if (empty($updates)) {
                return response()->json([
                    'success' => false,
                    'message' => 'No valid fields to update'
                ], 400);
            }

            DB::table('products')
                ->where('id', $id)
                ->update($updates);

            return response()->json([
                'success' => true,
                'message' => 'Product updated successfully'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Server error'
            ], 500);
        }
    }

    /**
     * Delete Product (with safety check)
     * 
     * Prevents deletion if product has order history
     * Maintains referential integrity
     * 
     * @param int $id
     * @return JsonResponse
     */
    public function destroy(Request $request, $id)
    {
        // Only Admin can delete products
        if (auth()->user()->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized. Only admins can delete products.'
            ], 403);
        }

        try {
            // Check if force delete is requested
            $force = $request->query('force') === 'true';

            if (!$force) {
                // Check if product has orders
                $orderCount = DB::table('order_items')
                    ->where('product_id', $id)
                    ->count();

                if ($orderCount > 0) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Cannot delete product with existing orders. Set status to inactive instead.'
                    ], 400);
                }
            } else {
                // Clean up related records for force delete
                DB::table('order_items')->where('product_id', $id)->delete();
                DB::table('inventory_transactions')->where('product_id', $id)->delete();
            }

            DB::table('products')->where('id', $id)->delete();

            return response()->json([
                'success' => true,
                'message' => 'Product deleted successfully'
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
     * Get All Categories
     * 
     * @return JsonResponse
     */
    public function categories()
    {
        try {
            $categories = DB::table('categories')
                ->where('is_active', true)
                ->orderBy('name')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $categories
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Server error'
            ], 500);
        }
    }

    /**
     * Get Next Available SKU for Category
     * 
     * Helper endpoint untuk preview SKU sebelum create product
     * 
     * @param int $categoryId
     * @return JsonResponse
     */
    public function nextSKU($categoryId)
    {
        try {
            $sku = $this->generateNextSKU($categoryId);
            
            if (!$sku) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid category'
                ], 400);
            }

            return response()->json([
                'success' => true,
                'sku' => $sku
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Server error'
            ], 500);
        }
    }
}

