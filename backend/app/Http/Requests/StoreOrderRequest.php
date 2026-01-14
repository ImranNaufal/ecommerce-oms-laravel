<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Http\Exceptions\HttpResponseException;

/**
 * Store Order Request
 * 
 * Validates incoming request data for creating new orders
 * Ensures all required fields are present and valid
 */
class StoreOrderRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     * 
     * @return bool
     */
    public function authorize(): bool
    {
        // All authenticated users can create orders
        return auth()->check();
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'customer_id' => [
                'required',
                'integer',
                'exists:customers,id'
            ],
            'channel_id' => [
                'required',
                'integer',
                'exists:sales_channels,id'
            ],
            'items' => [
                'required',
                'array',
                'min:1'
            ],
            'items.*.product_id' => [
                'required',
                'integer',
                'exists:products,id'
            ],
            'items.*.quantity' => [
                'required',
                'integer',
                'min:1',
                'max:10000'
            ],
            'shipping_address' => [
                'required',
                'string',
                'max:500'
            ],
            'shipping_city' => [
                'nullable',
                'string',
                'max:100'
            ],
            'shipping_state' => [
                'nullable',
                'string',
                'max:100'
            ],
            'shipping_postal_code' => [
                'nullable',
                'string',
                'max:20'
            ],
            'payment_method' => [
                'required',
                'in:cod,online_banking,credit_card,ewallet,bank_transfer'
            ],
            'affiliate_id' => [
                'nullable',
                'integer',
                'exists:users,id'
            ],
            'discount' => [
                'nullable',
                'numeric',
                'min:0',
                'max:999999.99'
            ],
            'shipping_fee' => [
                'nullable',
                'numeric',
                'min:0',
                'max:99999.99'
            ],
            'notes' => [
                'nullable',
                'string',
                'max:1000'
            ]
        ];
    }

    /**
     * Get custom validation messages
     * 
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'customer_id.required' => 'Customer is required',
            'customer_id.exists' => 'Selected customer does not exist',
            'channel_id.required' => 'Sales channel is required',
            'channel_id.exists' => 'Selected sales channel does not exist',
            'items.required' => 'At least one item is required',
            'items.min' => 'Order must contain at least one item',
            'items.*.product_id.required' => 'Product ID is required for all items',
            'items.*.product_id.exists' => 'One or more selected products do not exist',
            'items.*.quantity.required' => 'Quantity is required for all items',
            'items.*.quantity.min' => 'Quantity must be at least 1',
            'items.*.quantity.max' => 'Quantity cannot exceed 10,000',
            'shipping_address.required' => 'Shipping address is required',
            'shipping_address.max' => 'Shipping address cannot exceed 500 characters',
            'payment_method.required' => 'Payment method is required',
            'payment_method.in' => 'Invalid payment method selected',
        ];
    }

    /**
     * Get custom attributes for validator errors
     * 
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'customer_id' => 'customer',
            'channel_id' => 'sales channel',
            'items' => 'order items',
            'items.*.product_id' => 'product',
            'items.*.quantity' => 'quantity',
            'shipping_address' => 'shipping address',
            'payment_method' => 'payment method',
        ];
    }

    /**
     * Handle a failed validation attempt.
     *
     * @param  \Illuminate\Contracts\Validation\Validator  $validator
     * @return void
     *
     * @throws \Illuminate\Http\Exceptions\HttpResponseException
     */
    protected function failedValidation(Validator $validator)
    {
        throw new HttpResponseException(
            response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422)
        );
    }
}
