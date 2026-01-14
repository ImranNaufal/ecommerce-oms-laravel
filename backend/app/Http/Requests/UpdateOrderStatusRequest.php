<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Http\Exceptions\HttpResponseException;

/**
 * Update Order Status Request
 * 
 * Validates order status updates
 * Only allows valid status transitions
 */
class UpdateOrderStatusRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     * 
     * Only admin and staff can update order status
     * 
     * @return bool
     */
    public function authorize(): bool
    {
        $user = auth()->user();
        return $user && in_array($user->role, ['admin', 'staff']);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'status' => [
                'required',
                'string',
                'in:pending,confirmed,processing,packed,shipped,delivered,cancelled,refunded'
            ],
            'tracking_number' => [
                'nullable',
                'string',
                'max:100',
                'required_if:status,shipped'
            ],
            'notes' => [
                'nullable',
                'string',
                'max:500'
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
            'status.required' => 'Order status is required',
            'status.in' => 'Invalid order status provided',
            'tracking_number.required_if' => 'Tracking number is required when marking order as shipped',
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

    /**
     * Handle a failed authorization attempt.
     *
     * @return void
     *
     * @throws \Illuminate\Http\Exceptions\HttpResponseException
     */
    protected function failedAuthorization()
    {
        throw new HttpResponseException(
            response()->json([
                'success' => false,
                'message' => 'Unauthorized. Only admin and staff can update order status.'
            ], 403)
        );
    }
}
