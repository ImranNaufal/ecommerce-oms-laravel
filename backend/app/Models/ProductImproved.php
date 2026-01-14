<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Builder;

/**
 * Product Model (Improved)
 * 
 * IMPROVEMENTS:
 * ✅ Added query scopes
 * ✅ Added accessors for computed values
 * ✅ Added fillable fields
 * ✅ Better relationship definitions
 * 
 * TO REPLACE: Product.php (after testing)
 */
class ProductImproved extends Model
{
    use HasFactory;

    protected $table = 'products';

    protected $fillable = [
        'category_id',
        'sku',
        'name',
        'description',
        'price',
        'cost_price',
        'stock_quantity',
        'low_stock_threshold',
        'image_url',
        'weight',
        'dimensions',
        'status',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'cost_price' => 'decimal:2',
        'weight' => 'decimal:2',
        'stock_quantity' => 'integer',
        'low_stock_threshold' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /*
    |--------------------------------------------------------------------------
    | Query Scopes
    |--------------------------------------------------------------------------
    */

    /**
     * Scope: Filter active products
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('status', 'active');
    }

    /**
     * Scope: Filter by status
     */
    public function scopeStatus(Builder $query, string $status): Builder
    {
        return $query->where('status', $status);
    }

    /**
     * Scope: Filter low stock products
     */
    public function scopeLowStock(Builder $query): Builder
    {
        return $query->whereColumn('stock_quantity', '<=', 'low_stock_threshold');
    }

    /**
     * Scope: Filter out of stock products
     */
    public function scopeOutOfStock(Builder $query): Builder
    {
        return $query->where('stock_quantity', 0);
    }

    /**
     * Scope: Filter in stock products
     */
    public function scopeInStock(Builder $query): Builder
    {
        return $query->where('stock_quantity', '>', 0);
    }

    /**
     * Scope: Filter by category
     */
    public function scopeCategory(Builder $query, int $categoryId): Builder
    {
        return $query->where('category_id', $categoryId);
    }

    /**
     * Scope: Search by name or SKU
     */
    public function scopeSearch(Builder $query, string $term): Builder
    {
        return $query->where(function ($q) use ($term) {
            $q->where('name', 'LIKE', "%{$term}%")
              ->orWhere('sku', 'LIKE', "%{$term}%")
              ->orWhere('description', 'LIKE', "%{$term}%");
        });
    }

    /**
     * Scope: Filter by price range
     */
    public function scopePriceRange(Builder $query, float $min, float $max): Builder
    {
        return $query->whereBetween('price', [$min, $max]);
    }

    /**
     * Scope: Popular products (most ordered)
     */
    public function scopePopular(Builder $query, int $limit = 10): Builder
    {
        return $query->withCount('orderItems')
            ->orderBy('order_items_count', 'desc')
            ->limit($limit);
    }

    /*
    |--------------------------------------------------------------------------
    | Accessors & Mutators
    |--------------------------------------------------------------------------
    */

    /**
     * Get profit per unit
     */
    public function getUnitProfitAttribute(): float
    {
        return max(0, $this->price - $this->cost_price);
    }

    /**
     * Get profit margin percentage
     */
    public function getProfitMarginAttribute(): ?float
    {
        if ($this->price > 0) {
            $profit = $this->price - $this->cost_price;
            return round(($profit / $this->price) * 100, 2);
        }
        return null;
    }

    /**
     * Check if product is low on stock
     */
    public function getIsLowStockAttribute(): bool
    {
        return $this->stock_quantity <= $this->low_stock_threshold;
    }

    /**
     * Check if product is out of stock
     */
    public function getIsOutOfStockAttribute(): bool
    {
        return $this->stock_quantity == 0;
    }

    /**
     * Get stock status label
     */
    public function getStockStatusAttribute(): string
    {
        if ($this->stock_quantity == 0) {
            return 'out_of_stock';
        } elseif ($this->stock_quantity <= $this->low_stock_threshold) {
            return 'low_stock';
        } else {
            return 'in_stock';
        }
    }

    /**
     * Get stock status color for UI
     */
    public function getStockColorAttribute(): string
    {
        return match ($this->stock_status) {
            'out_of_stock' => 'red',
            'low_stock' => 'yellow',
            'in_stock' => 'green',
            default => 'gray',
        };
    }

    /**
     * Get total inventory value (at cost)
     */
    public function getCostValueAttribute(): float
    {
        return $this->stock_quantity * $this->cost_price;
    }

    /**
     * Get total inventory value (at selling price)
     */
    public function getSellingValueAttribute(): float
    {
        return $this->stock_quantity * $this->price;
    }

    /**
     * Get potential profit from current inventory
     */
    public function getPotentialProfitAttribute(): float
    {
        return $this->selling_value - $this->cost_value;
    }

    /**
     * Format price with currency
     */
    public function getFormattedPriceAttribute(): string
    {
        return 'RM ' . number_format($this->price, 2);
    }

    /*
    |--------------------------------------------------------------------------
    | Relationships
    |--------------------------------------------------------------------------
    */

    public function category()
    {
        return $this->belongsTo(Category::class);
    }

    public function orderItems()
    {
        return $this->hasMany(OrderItem::class);
    }

    public function inventoryTransactions()
    {
        return $this->hasMany(InventoryTransaction::class);
    }

    /*
    |--------------------------------------------------------------------------
    | Helper Methods
    |--------------------------------------------------------------------------
    */

    /**
     * Check if product has sufficient stock
     */
    public function hasSufficientStock(int $quantity): bool
    {
        return $this->stock_quantity >= $quantity;
    }

    /**
     * Calculate total profit if sold at quantity
     */
    public function calculateProfit(int $quantity): float
    {
        return $this->unit_profit * $quantity;
    }

    /**
     * Get days until out of stock (based on average daily sales)
     */
    public function getDaysUntilOutOfStock(): ?int
    {
        $averageDailySales = $this->getAverageDailySales();
        
        if ($averageDailySales > 0) {
            return (int) ceil($this->stock_quantity / $averageDailySales);
        }
        
        return null;
    }

    /**
     * Get average daily sales (last 30 days)
     */
    public function getAverageDailySales(): float
    {
        $totalSold = $this->orderItems()
            ->whereHas('order', function ($query) {
                $query->where('created_at', '>=', now()->subDays(30))
                      ->where('payment_status', 'paid');
            })
            ->sum('quantity');

        return $totalSold / 30;
    }

    /**
     * Get total units sold
     */
    public function getTotalSold(): int
    {
        return $this->orderItems()
            ->whereHas('order', function ($query) {
                $query->where('payment_status', 'paid');
            })
            ->sum('quantity');
    }
}
