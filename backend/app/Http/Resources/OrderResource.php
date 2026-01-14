<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Order API Resource
 * 
 * Transforms Order model into structured JSON response
 * Includes related data (customer, items, commissions)
 */
class OrderResource extends JsonResource
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
            'order_number' => $this->order_number,
            
            // Customer information
            'customer' => [
                'id' => $this->customer_id,
                'name' => $this->whenLoaded('customer', $this->customer->full_name),
                'email' => $this->whenLoaded('customer', $this->customer->email),
            ],
            
            // Sales channel
            'channel' => [
                'id' => $this->channel_id,
                'name' => $this->whenLoaded('channel', $this->channel->name),
                'type' => $this->whenLoaded('channel', $this->channel->type),
            ],
            
            // Staff assignment
            'assigned_staff' => $this->when($this->assigned_staff_id, [
                'id' => $this->assigned_staff_id,
                'name' => $this->whenLoaded('staff', $this->staff?->full_name),
            ]),
            
            // Affiliate information
            'affiliate' => $this->when($this->affiliate_id, [
                'id' => $this->affiliate_id,
                'name' => $this->whenLoaded('affiliate', $this->affiliate?->full_name),
            ]),
            
            // Financial details
            'pricing' => [
                'subtotal' => (float) $this->subtotal,
                'discount' => (float) $this->discount,
                'shipping_fee' => (float) $this->shipping_fee,
                'tax' => (float) $this->tax,
                'total' => (float) $this->total,
            ],
            
            // Commission information
            'commissions' => [
                'staff' => (float) ($this->staff_commission ?? 0),
                'affiliate' => (float) ($this->affiliate_commission ?? 0),
            ],
            
            // Status information
            'status' => $this->status,
            'payment_status' => $this->payment_status,
            'payment_method' => $this->payment_method,
            
            // Shipping details
            'shipping' => [
                'address' => $this->shipping_address,
                'city' => $this->shipping_city,
                'state' => $this->shipping_state,
                'postal_code' => $this->shipping_postal_code,
                'tracking_number' => $this->tracking_number,
            ],
            
            // Order items (only when loaded)
            'items' => OrderItemResource::collection($this->whenLoaded('items')),
            
            // Additional information
            'notes' => $this->notes,
            
            // Timestamps
            'timestamps' => [
                'created_at' => $this->created_at?->toISOString(),
                'updated_at' => $this->updated_at?->toISOString(),
                'confirmed_at' => $this->confirmed_at?->toISOString(),
                'packed_at' => $this->packed_at?->toISOString(),
                'shipped_at' => $this->shipped_at?->toISOString(),
                'delivered_at' => $this->delivered_at?->toISOString(),
            ],
        ];
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
