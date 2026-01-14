<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Http\Exceptions\HttpResponseException;

/**
 * Update Product Request
 * 
 * Validates incoming request data for updating products
 * All fields are optional for partial updates
 */
class UpdateProductRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     * 
     * @return bool
     */
    public function authorize(): bool
    {
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
                'sometimes',
                'integer',
                'exists:categories,id'
            ],
            'name' => [
                'sometimes',
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
                'sometimes',
                'numeric',
                'min:0',
                'max:999999.99'
            ],
            'cost_price' => [
                'nullable',
                'numeric',
                'min:0',
                'max:999999.99'
            ],
            'stock_quantity' => [
                'sometimes',
                'integer',
                'min:0',
                'max:1000000'
            ],
            'low_stock_threshold' => [
                'nullable',
                'integer',
                'min:0',
                'max:1000'
            ],
            'image_url' => [
                'nullable',
                'url',
                'max:500'
            ],
            'status' => [
                'sometimes',
                'in:active,inactive,out_of_stock'
            ],
            'weight' => [
                'nullable',
                'numeric',
                'min:0',
                'max:99999.99'
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
            'category_id.exists' => 'Selected category does not exist',
            'name.min' => 'Product name must be at least 3 characters',
            'name.max' => 'Product name cannot exceed 200 characters',
            'price.min' => 'Price must be greater than or equal to 0',
            'status.in' => 'Invalid product status',
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
