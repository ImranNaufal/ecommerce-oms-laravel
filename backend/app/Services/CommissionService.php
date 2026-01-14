<?php

namespace App\Services;

use App\Models\CommissionTransaction;
use App\Models\CommissionConfig;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Commission Service
 * 
 * Handles all commission-related business logic
 * - Commission calculation based on user config
 * - Commission transaction management
 * - Approval workflow
 */
class CommissionService
{
    /**
     * Calculate commission amount based on user configuration
     * 
     * @param int $userId User ID (staff or affiliate)
     * @param float $orderTotal Order total amount
     * @return float Commission amount
     */
    public function calculateCommissionAmount(int $userId, float $orderTotal): float
    {
        try {
            $config = CommissionConfig::where('user_id', $userId)
                ->where('is_active', true)
                ->where('effective_from', '<=', now())
                ->where(function ($query) {
                    $query->whereNull('effective_until')
                          ->orWhere('effective_until', '>=', now());
                })
                ->first();

            if (!$config) {
                Log::info("No active commission config found for user {$userId}");
                return 0;
            }

            // Calculate based on type
            if ($config->commission_type === 'percentage') {
                return ($orderTotal * $config->commission_value) / 100;
            }

            return $config->commission_value;

        } catch (\Exception $e) {
            Log::error("Commission calculation error: {$e->getMessage()}");
            return 0;
        }
    }

    /**
     * Calculate and create commission transaction
     * 
     * @param int $orderId Order ID
     * @param int $userId User ID
     * @param string $commissionType 'staff' or 'affiliate'
     * @param float $orderTotal Order total amount
     * @return float Commission amount created
     */
    public function calculateAndCreate(
        int $orderId,
        int $userId,
        string $commissionType,
        float $orderTotal
    ): float {
        $amount = $this->calculateCommissionAmount($userId, $orderTotal);

        if ($amount > 0) {
            $config = CommissionConfig::where('user_id', $userId)
                ->where('is_active', true)
                ->first();

            CommissionTransaction::create([
                'user_id' => $userId,
                'order_id' => $orderId,
                'commission_type' => $commissionType,
                'amount' => $amount,
                'percentage' => $config ? $config->commission_value : 0,
                'order_total' => $orderTotal,
                'status' => 'pending',
            ]);
        }

        return $amount;
    }

    /**
     * Approve commissions for an order
     * 
     * @param int $orderId Order ID
     * @param int $approvedBy User ID who approved
     * @return int Number of commissions approved
     */
    public function approveCommissionsForOrder(int $orderId, int $approvedBy): int
    {
        return CommissionTransaction::where('order_id', $orderId)
            ->where('status', 'pending')
            ->update([
                'status' => 'approved',
                'approved_by' => $approvedBy,
                'approved_at' => now(),
            ]);
    }

    /**
     * Reject commissions for an order
     * 
     * @param int $orderId Order ID
     * @return int Number of commissions rejected
     */
    public function rejectCommissionsForOrder(int $orderId): int
    {
        return CommissionTransaction::where('order_id', $orderId)
            ->whereIn('status', ['pending', 'approved'])
            ->update([
                'status' => 'rejected',
                'updated_at' => now(),
            ]);
    }

    /**
     * Approve a specific commission
     * 
     * @param int $commissionId Commission transaction ID
     * @param int $approvedBy User ID who approved
     * @return CommissionTransaction Updated commission
     */
    public function approveCommission(int $commissionId, int $approvedBy): CommissionTransaction
    {
        $commission = CommissionTransaction::findOrFail($commissionId);
        
        $commission->update([
            'status' => 'approved',
            'approved_by' => $approvedBy,
            'approved_at' => now(),
        ]);

        return $commission;
    }

    /**
     * Mark commission as paid
     * 
     * @param int $commissionId Commission transaction ID
     * @param int $paidBy User ID who marked as paid
     * @return CommissionTransaction Updated commission
     */
    public function markAsPaid(int $commissionId, int $paidBy): CommissionTransaction
    {
        $commission = CommissionTransaction::findOrFail($commissionId);
        
        $commission->update([
            'status' => 'paid',
            'paid_by' => $paidBy,
            'paid_at' => now(),
        ]);

        return $commission;
    }

    /**
     * Get commission summary for user
     * 
     * @param int|null $userId User ID (null for all users - admin view)
     * @return array Summary statistics
     */
    public function getSummary(?int $userId = null): array
    {
        $query = CommissionTransaction::query();

        if ($userId) {
            $query->where('user_id', $userId);
        }

        $summary = $query->selectRaw('
                status,
                COUNT(*) as count,
                SUM(amount) as total_amount
            ')
            ->groupBy('status')
            ->get()
            ->keyBy('status')
            ->toArray();

        return [
            'pending' => $summary['pending'] ?? ['count' => 0, 'total_amount' => 0],
            'approved' => $summary['approved'] ?? ['count' => 0, 'total_amount' => 0],
            'paid' => $summary['paid'] ?? ['count' => 0, 'total_amount' => 0],
            'rejected' => $summary['rejected'] ?? ['count' => 0, 'total_amount' => 0],
        ];
    }

    /**
     * Get monthly commission earnings
     * 
     * @param int|null $userId User ID (null for all users)
     * @param int $months Number of months to retrieve
     * @return \Illuminate\Support\Collection
     */
    public function getMonthlyEarnings(?int $userId = null, int $months = 6)
    {
        $query = CommissionTransaction::query();

        if ($userId) {
            $query->where('user_id', $userId);
        }

        return $query->selectRaw("
                DATE_FORMAT(created_at, '%Y-%m') as month,
                SUM(amount) as total_amount,
                COUNT(*) as count
            ")
            ->where('created_at', '>=', now()->subMonths($months))
            ->groupBy(DB::raw("DATE_FORMAT(created_at, '%Y-%m')"))
            ->orderBy('month', 'desc')
            ->get();
    }
}
