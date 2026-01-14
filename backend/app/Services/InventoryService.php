<?php

namespace App\Services;

use App\Models\Product;
use App\Models\InventoryTransaction;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Inventory Service
 * 
 * Handles all inventory-related business logic
 * - Stock management
 * - Inventory transactions
 * - Low stock alerts
 */
class InventoryService
{
    protected NotificationService $notificationService;

    public function __construct(NotificationService $notificationService)
    {
        $this->notificationService = $notificationService;
    }

    /**
     * Deduct stock for a product
     * 
     * @param int $productId Product ID
     * @param int $quantity Quantity to deduct
     * @param string $transactionType Transaction type ('sale', 'adjustment', etc.)
     * @param int $referenceId Reference ID (order_id, etc.)
     * @param int $createdBy User ID who created the transaction
     * @param string|null $notes Additional notes
     * @return Product Updated product
     * @throws \Exception If insufficient stock
     */
    public function deductStock(
        int $productId,
        int $quantity,
        string $transactionType = 'sale',
        int $referenceId = null,
        int $createdBy = null,
        ?string $notes = null
    ): Product {
        return DB::transaction(function () use ($productId, $quantity, $transactionType, $referenceId, $createdBy, $notes) {
            $product = Product::where('id', $productId)->lockForUpdate()->first();

            if (!$product) {
                throw new \Exception("Product not found");
            }

            if ($product->stock_quantity < $quantity) {
                throw new \Exception("Insufficient stock for {$product->name}. Available: {$product->stock_quantity}, Required: {$quantity}");
            }

            // Deduct stock
            $product->decrement('stock_quantity', $quantity);

            // Log transaction
            InventoryTransaction::create([
                'product_id' => $productId,
                'transaction_type' => $transactionType,
                'quantity' => -$quantity,
                'reference_type' => 'order',
                'reference_id' => $referenceId,
                'created_by' => $createdBy,
                'notes' => $notes,
            ]);

            // Check for low stock alert
            $product->refresh();
            $this->checkLowStock($product, $createdBy);

            return $product;
        });
    }

    /**
     * Restore stock for a product (for cancellations/returns)
     * 
     * @param int $productId Product ID
     * @param int $quantity Quantity to restore
     * @param int $referenceId Reference ID (order_id, etc.)
     * @param int $createdBy User ID who created the transaction
     * @param string|null $notes Additional notes
     * @return Product Updated product
     */
    public function restoreStock(
        int $productId,
        int $quantity,
        int $referenceId = null,
        int $createdBy = null,
        ?string $notes = null
    ): Product {
        return DB::transaction(function () use ($productId, $quantity, $referenceId, $createdBy, $notes) {
            $product = Product::where('id', $productId)->lockForUpdate()->first();

            if (!$product) {
                throw new \Exception("Product not found");
            }

            // Restore stock
            $product->increment('stock_quantity', $quantity);

            // Log transaction
            InventoryTransaction::create([
                'product_id' => $productId,
                'transaction_type' => 'adjustment',
                'quantity' => $quantity,
                'reference_type' => 'order',
                'reference_id' => $referenceId,
                'created_by' => $createdBy,
                'notes' => $notes ?? 'Stock restored from cancelled/refunded order',
            ]);

            return $product->refresh();
        });
    }

    /**
     * Add stock manually (restock)
     * 
     * @param int $productId Product ID
     * @param int $quantity Quantity to add
     * @param int $createdBy User ID who created the transaction
     * @param string|null $notes Additional notes
     * @return Product Updated product
     */
    public function addStock(
        int $productId,
        int $quantity,
        int $createdBy,
        ?string $notes = null
    ): Product {
        return DB::transaction(function () use ($productId, $quantity, $createdBy, $notes) {
            $product = Product::where('id', $productId)->lockForUpdate()->first();

            if (!$product) {
                throw new \Exception("Product not found");
            }

            // Add stock
            $product->increment('stock_quantity', $quantity);

            // Log transaction
            InventoryTransaction::create([
                'product_id' => $productId,
                'transaction_type' => 'restock',
                'quantity' => $quantity,
                'reference_type' => 'manual',
                'reference_id' => null,
                'created_by' => $createdBy,
                'notes' => $notes ?? 'Manual stock addition',
            ]);

            return $product->refresh();
        });
    }

    /**
     * Adjust stock manually (for corrections)
     * 
     * @param int $productId Product ID
     * @param int $newQuantity New stock quantity
     * @param int $createdBy User ID who created the transaction
     * @param string|null $notes Additional notes
     * @return Product Updated product
     */
    public function adjustStock(
        int $productId,
        int $newQuantity,
        int $createdBy,
        ?string $notes = null
    ): Product {
        return DB::transaction(function () use ($productId, $newQuantity, $createdBy, $notes) {
            $product = Product::where('id', $productId)->lockForUpdate()->first();

            if (!$product) {
                throw new \Exception("Product not found");
            }

            $difference = $newQuantity - $product->stock_quantity;

            if ($difference == 0) {
                return $product; // No change needed
            }

            // Update stock
            $product->update(['stock_quantity' => $newQuantity]);

            // Log transaction
            InventoryTransaction::create([
                'product_id' => $productId,
                'transaction_type' => 'adjustment',
                'quantity' => $difference,
                'reference_type' => 'manual',
                'reference_id' => null,
                'created_by' => $createdBy,
                'notes' => $notes ?? 'Manual stock adjustment',
            ]);

            // Check for low stock alert
            $this->checkLowStock($product, $createdBy);

            return $product->refresh();
        });
    }

    /**
     * Check if product is low on stock and send alert
     * 
     * @param Product $product Product to check
     * @param int|null $userId User ID to notify (null = all admins)
     * @return void
     */
    public function checkLowStock(Product $product, ?int $userId = null): void
    {
        if ($product->stock_quantity <= $product->low_stock_threshold) {
            $this->notificationService->notifyLowStock($product, $userId);
        }
    }

    /**
     * Get low stock products
     * 
     * @return \Illuminate\Database\Eloquent\Collection
     */
    public function getLowStockProducts()
    {
        return Product::whereColumn('stock_quantity', '<=', 'low_stock_threshold')
            ->where('status', 'active')
            ->with('category')
            ->orderBy('stock_quantity', 'asc')
            ->get();
    }

    /**
     * Get out of stock products
     * 
     * @return \Illuminate\Database\Eloquent\Collection
     */
    public function getOutOfStockProducts()
    {
        return Product::where('stock_quantity', 0)
            ->where('status', 'active')
            ->with('category')
            ->get();
    }

    /**
     * Get inventory transactions for a product
     * 
     * @param int $productId Product ID
     * @param int $limit Number of records to retrieve
     * @return \Illuminate\Database\Eloquent\Collection
     */
    public function getProductTransactions(int $productId, int $limit = 50)
    {
        return InventoryTransaction::where('product_id', $productId)
            ->with('creator')
            ->latest()
            ->limit($limit)
            ->get();
    }

    /**
     * Get recent inventory transactions
     * 
     * @param int $days Number of days to look back
     * @param int $limit Number of records to retrieve
     * @return \Illuminate\Database\Eloquent\Collection
     */
    public function getRecentTransactions(int $days = 30, int $limit = 100)
    {
        return InventoryTransaction::with(['product', 'creator'])
            ->where('created_at', '>=', now()->subDays($days))
            ->latest()
            ->limit($limit)
            ->get();
    }

    /**
     * Calculate total inventory value
     * 
     * @return array ['cost_value' => float, 'selling_value' => float, 'potential_profit' => float]
     */
    public function calculateInventoryValue(): array
    {
        $result = Product::where('status', 'active')
            ->selectRaw('
                SUM(stock_quantity * cost_price) as cost_value,
                SUM(stock_quantity * price) as selling_value,
                COUNT(*) as total_products,
                SUM(stock_quantity) as total_units
            ')
            ->first();

        return [
            'cost_value' => (float) ($result->cost_value ?? 0),
            'selling_value' => (float) ($result->selling_value ?? 0),
            'potential_profit' => (float) (($result->selling_value ?? 0) - ($result->cost_value ?? 0)),
            'total_products' => $result->total_products ?? 0,
            'total_units' => $result->total_units ?? 0,
        ];
    }
}
