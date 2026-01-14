<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Http\Exceptions\HttpResponseException;

/**
 * Store Product Request
 * 
 * Validates incoming request data for creating new products
 */
class StoreProductRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     * 
     * @return bool
     */
    public function authorize(): bool
    {
        // All authenticated users can create products
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
            'category_id' => [
                'required',
                'integer',
                'exists:categories,id'
            ],
            'name' => [
                'required',
                'string',
                'max:200',
                'min:3'
            ],
            'description' => [
                'nullable',
                'string',
                'max:2000'
            ],
            'price' => [
                'required',
                'numeric',
                'min:0',
                'max:999999.99'
            ],
            'cost_price' => [
                'nullable',
                'numeric',
                'min:0',
                'max:999999.99',
                'lte:price' // Cost should not exceed selling price
            ],
            'stock_quantity' => [
                'required',
                'integer',
                'min:0',
                'max:1000000'
            ],
            'low_stock_threshold' => [
                'nullable',
                'integer',
                'min:0',
                'max:1000',
                'lte:stock_quantity'
            ],
            'image_url' => [
                'nullable',
                'url',
                'max:500'
            ],
            'weight' => [
                'nullable',
                'numeric',
                'min:0',
                'max:99999.99'
            ],
            'dimensions' => [
                'nullable',
                'string',
                'max:100'
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
            'category_id.required' => 'Product category is required',
            'category_id.exists' => 'Selected category does not exist',
            'name.required' => 'Product name is required',
            'name.min' => 'Product name must be at least 3 characters',
            'name.max' => 'Product name cannot exceed 200 characters',
            'price.required' => 'Product price is required',
            'price.min' => 'Price must be greater than or equal to 0',
            'price.max' => 'Price is too high',
            'cost_price.lte' => 'Cost price cannot exceed selling price',
            'stock_quantity.required' => 'Stock quantity is required',
            'stock_quantity.min' => 'Stock quantity cannot be negative',
            'low_stock_threshold.lte' => 'Low stock threshold cannot exceed current stock',
            'image_url.url' => 'Image URL must be a valid URL',
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
