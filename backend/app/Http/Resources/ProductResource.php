<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Product API Resource
 * 
 * Transforms Product model into structured JSON response
 */
class ProductResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @param  Request  $request
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'sku' => $this->sku,
            'name' => $this->name,
            'description' => $this->description,
            
            // Category information
            'category' => [
                'id' => $this->category_id,
                'name' => $this->whenLoaded('category', $this->category?->name),
                'slug' => $this->whenLoaded('category', $this->category?->slug),
            ],
            
            // Pricing
            'pricing' => [
                'price' => (float) $this->price,
                'cost_price' => (float) $this->cost_price,
                'profit_margin' => $this->calculateProfitMargin(),
            ],
            
            // Inventory
            'inventory' => [
                'stock_quantity' => $this->stock_quantity,
                'low_stock_threshold' => $this->low_stock_threshold,
                'is_low_stock' => $this->stock_quantity <= $this->low_stock_threshold,
                'is_out_of_stock' => $this->stock_quantity == 0,
            ],
            
            // Product details
            'image_url' => $this->image_url,
            'weight' => $this->weight ? (float) $this->weight : null,
            'dimensions' => $this->dimensions,
            
            // Status
            'status' => $this->status,
            'is_active' => $this->status === 'active',
            
            // Timestamps
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }

    /**
     * Calculate profit margin percentage
     * 
     * @return float|null
     */
    private function calculateProfitMargin(): ?float
    {
        if ($this->price && $this->cost_price && $this->price > 0) {
            $profit = $this->price - $this->cost_price;
            return round(($profit / $this->price) * 100, 2);
        }
        
        return null;
    }

    /**
     * Get additional data that should be returned with the resource array.
     *
     * @param  Request  $request
     * @return array<string, mixed>
     */
    public function with(Request $request): array
    {
        return [
            'success' => true,
        ];
    }
}
