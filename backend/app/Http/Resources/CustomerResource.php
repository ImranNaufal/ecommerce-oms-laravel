<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Customer API Resource
 * 
 * Transforms Customer model into structured JSON response
 */
class CustomerResource extends JsonResource
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
            'email' => $this->email,
            'full_name' => $this->full_name,
            'phone' => $this->phone,
            
            // Address information
            'address' => [
                'street' => $this->address,
                'city' => $this->city,
                'state' => $this->state,
                'postal_code' => $this->postal_code,
            ],
            
            // Customer classification
            'customer_type' => $this->customer_type,
            
            // Statistics
            'statistics' => [
                'total_orders' => $this->total_orders ?? 0,
                'total_spent' => (float) ($this->total_spent ?? 0),
                'average_order_value' => $this->calculateAverageOrderValue(),
            ],
            
            // Loyalty tier
            'loyalty_tier' => $this->determineLoyaltyTier(),
            
            // Timestamps
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
            
            // Recent orders (only when requested)
            'recent_orders' => $this->when($request->input('include_orders'), function () {
                return OrderResource::collection($this->whenLoaded('orders'));
            }),
        ];
    }

    /**
     * Calculate average order value
     * 
     * @return float
     */
    private function calculateAverageOrderValue(): float
    {
        if ($this->total_orders && $this->total_orders > 0) {
            return round($this->total_spent / $this->total_orders, 2);
        }
        
        return 0;
    }

    /**
     * Determine customer loyalty tier
     * 
     * @return string
     */
    private function determineLoyaltyTier(): string
    {
        $totalSpent = $this->total_spent ?? 0;
        
        if ($totalSpent >= 50000) {
            return 'platinum';
        } elseif ($totalSpent >= 20000) {
            return 'gold';
        } elseif ($totalSpent >= 5000) {
            return 'silver';
        } elseif ($totalSpent > 0) {
            return 'bronze';
        }
        
        return 'new';
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
