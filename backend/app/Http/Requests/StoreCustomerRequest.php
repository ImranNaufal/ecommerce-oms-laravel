<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Http\Exceptions\HttpResponseException;

/**
 * Store Customer Request
 * 
 * Validates incoming request data for creating new customers
 */
class StoreCustomerRequest extends FormRequest
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
            'email' => [
                'required',
                'email',
                'max:100',
                'unique:customers,email'
            ],
            'full_name' => [
                'required',
                'string',
                'max:100',
                'min:2'
            ],
            'phone' => [
                'required',
                'string',
                'max:20',
                'regex:/^[\d\s\-\+\(\)]+$/' // Allow numbers, spaces, hyphens, plus, parentheses
            ],
            'address' => [
                'required',
                'string',
                'max:500'
            ],
            'city' => [
                'nullable',
                'string',
                'max:100'
            ],
            'state' => [
                'nullable',
                'string',
                'max:100'
            ],
            'postal_code' => [
                'nullable',
                'string',
                'max:20'
            ],
            'customer_type' => [
                'nullable',
                'in:retail,wholesale,vip'
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
            'email.required' => 'Email address is required',
            'email.email' => 'Please provide a valid email address',
            'email.unique' => 'A customer with this email already exists',
            'full_name.required' => 'Customer name is required',
            'full_name.min' => 'Name must be at least 2 characters',
            'phone.required' => 'Phone number is required',
            'phone.regex' => 'Invalid phone number format',
            'address.required' => 'Address is required',
            'customer_type.in' => 'Invalid customer type',
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
