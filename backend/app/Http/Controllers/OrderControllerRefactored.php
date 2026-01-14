<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreOrderRequest;
use App\Http\Requests\UpdateOrderStatusRequest;
use App\Http\Resources\OrderResource;
use App\Models\Order;
use App\Services\OrderService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;

/**
 * Order Controller (Refactored)
 * 
 * IMPROVED VERSION following Laravel best practices:
 * ✅ Uses Eloquent models instead of DB facade
 * ✅ Uses Form Request validation
 * ✅ Uses API Resources for responses
 * ✅ Business logic extracted to Service layer
 * ✅ Proper error handling with specific messages
 * ✅ Clean, maintainable code
 * 
 * TO REPLACE: OrderController.php (after testing)
 */
class OrderControllerRefactored extends Controller
{
    protected OrderService $orderService;

    public function __construct(OrderService $orderService)
    {
        $this->orderService = $orderService;
    }

    /**
     * Get all orders with filters and pagination
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $user = auth()->user();
            $perPage = $request->input('limit', 20);
            
            $filters = $request->only([
                'status',
                'payment_status',
                'channel',
                'date_from',
                'date_to'
            ]);

            $orders = $this->orderService->getOrders($filters, $user, $perPage);

            return response()->json([
                'success' => true,
                'data' => OrderResource::collection($orders),
                'pagination' => [
                    'page' => $orders->currentPage(),
                    'limit' => $orders->perPage(),
                    'total' => $orders->total(),
                    'pages' => $orders->lastPage()
                ]
            ]);

        } catch (\Exception $e) {
            Log::error("Failed to fetch orders: {$e->getMessage()}", [
                'user_id' => auth()->id(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch orders. Please try again later.'
            ], 500);
        }
    }

    /**
     * Create new order
     * 
     * Uses OrderService for business logic
     * Validation handled by StoreOrderRequest
     * Response formatted by OrderResource
     * 
     * @param StoreOrderRequest $request Validated request
     * @return JsonResponse
     */
    public function store(StoreOrderRequest $request): JsonResponse
    {
        try {
            $user = auth()->user();
            $validatedData = $request->validated();

            $order = $this->orderService->createOrder($validatedData, $user);

            return response()->json([
                'success' => true,
                'message' => 'Order created successfully',
                'data' => new OrderResource($order)
            ], 201);

        } catch (\Exception $e) {
            Log::error("Failed to create order: {$e->getMessage()}", [
                'user_id' => auth()->id(),
                'request_data' => $request->validated(),
                'trace' => $e->getTraceAsString()
            ]);

            // User-friendly error message
            $message = str_contains($e->getMessage(), 'Insufficient stock')
                ? $e->getMessage()
                : 'Failed to create order. Please try again.';

            return response()->json([
                'success' => false,
                'message' => $message
            ], 400);
        }
    }

    /**
     * Get single order details
     * 
     * @param int $id Order ID
     * @return JsonResponse
     */
    public function show(int $id): JsonResponse
    {
        try {
            $user = auth()->user();
            
            $order = Order::with(['items.product', 'customer', 'channel', 'staff', 'affiliate'])
                ->findOrFail($id);

            // Check permissions
            if ($user->role === 'staff' && $order->assigned_staff_id != $user->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Access denied. This order is not assigned to you.'
                ], 403);
            }

            if ($user->role === 'affiliate' && $order->affiliate_id != $user->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Access denied. You did not refer this order.'
                ], 403);
            }

            return response()->json([
                'success' => true,
                'data' => new OrderResource($order)
            ]);

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Order not found'
            ], 404);
        } catch (\Exception $e) {
            Log::error("Failed to fetch order: {$e->getMessage()}", [
                'order_id' => $id,
                'user_id' => auth()->id()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch order details'
            ], 500);
        }
    }

    /**
     * Update order status
     * 
     * Validation and authorization handled by UpdateOrderStatusRequest
     * Business logic in OrderService
     * 
     * @param UpdateOrderStatusRequest $request Validated request
     * @param int $id Order ID
     * @return JsonResponse
     */
    public function updateStatus(UpdateOrderStatusRequest $request, int $id): JsonResponse
    {
        try {
            $user = auth()->user();
            $order = Order::findOrFail($id);

            $updatedOrder = $this->orderService->updateStatus(
                $order,
                $request->validated('status'),
                $request->only(['tracking_number', 'notes']),
                $user
            );

            return response()->json([
                'success' => true,
                'message' => "Order status updated to {$request->validated('status')}",
                'data' => new OrderResource($updatedOrder)
            ]);

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Order not found'
            ], 404);
        } catch (\Exception $e) {
            Log::error("Failed to update order status: {$e->getMessage()}", [
                'order_id' => $id,
                'user_id' => auth()->id(),
                'new_status' => $request->validated('status')
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to update order status'
            ], 500);
        }
    }

    /**
     * Update payment status
     * 
     * @param Request $request
     * @param int $id Order ID
     * @return JsonResponse
     */
    public function updatePayment(Request $request, int $id): JsonResponse
    {
        $request->validate([
            'payment_status' => 'required|in:pending,paid,failed,refunded'
        ]);

        try {
            $user = auth()->user();
            
            // Only admin and staff can update payment status
            if (!in_array($user->role, ['admin', 'staff'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized. Only admin and staff can update payment status.'
                ], 403);
            }

            $order = Order::findOrFail($id);

            $updatedOrder = $this->orderService->updatePaymentStatus(
                $order,
                $request->input('payment_status'),
                $user
            );

            return response()->json([
                'success' => true,
                'message' => 'Payment status updated successfully',
                'data' => new OrderResource($updatedOrder)
            ]);

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Order not found'
            ], 404);
        } catch (\Exception $e) {
            Log::error("Failed to update payment status: {$e->getMessage()}", [
                'order_id' => $id,
                'user_id' => auth()->id(),
                'payment_status' => $request->input('payment_status')
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to update payment status'
            ], 500);
        }
    }
}
