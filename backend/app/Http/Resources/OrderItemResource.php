<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Order Item API Resource
 * 
 * Transforms OrderItem model into structured JSON response
 */
class OrderItemResource extends JsonResource
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
            'product_id' => $this->product_id,
            'product_name' => $this->product_name,
            'sku' => $this->sku,
            'quantity' => $this->quantity,
            'price' => (float) $this->price,
            'cost_price' => (float) $this->cost_price,
            'subtotal' => (float) $this->subtotal,
            'profit' => (float) $this->profit,
            
            // Product details (when loaded)
            'product' => $this->whenLoaded('product', function () {
                return [
                    'id' => $this->product->id,
                    'name' => $this->product->name,
                    'image_url' => $this->product->image_url,
                    'current_stock' => $this->product->stock_quantity,
                ];
            }),
        ];
    }
}
