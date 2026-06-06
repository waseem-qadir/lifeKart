'use client'

import { apiClient } from '@/lib/api'
import { useEffect, useState } from 'react'
import { ShoppingBag, Pause, Play, X, Loader2, CreditCard } from 'lucide-react'
import StripePaymentForm from '@/components/StripePaymentForm'

interface Subscription {
  id: string
  product_id: string
  quantity_per_delivery: number
  frequency_days: number
  start_date: string
  end_date: string
  status: string
  locked_unit_price: number
  source: string
  pause_after_next_delivery?: boolean
  product?: { name: string; unit_size: string }
}

interface SubstitutionEvent {
  id: string
  lifetime_subscription_id: string
  original_product_name: string
  substituted_product_name: string
  substitution_type: string
  reason: string
}

export default function SubscriptionsPage() {
  const [subs, setSubs] = useState<Subscription[]>([])
  const [substitutions, setSubstitutions] = useState<SubstitutionEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [confirmSub, setConfirmSub] = useState<Subscription | null>(null)
  const [pauseSub, setPauseSub] = useState<Subscription | null>(null)
  const [hasPaymentMethod, setHasPaymentMethod] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const [subsData, methodsData, substitutionsData] = await Promise.all([
        apiClient('/subscriptions/').catch(() => []),
        apiClient('/payments/methods').catch(() => []),
        apiClient('/price-protection/substitutions/me').catch(() => [])
      ])
      setSubs(Array.isArray(subsData) ? subsData : [])
      setHasPaymentMethod(methodsData && methodsData.length > 0)
      setSubstitutions(Array.isArray(substitutionsData) ? substitutionsData : [])
    } catch { } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  async function toggleStatus(sub: Subscription) {
    setActionLoading(sub.id)
    try {
      let updatedSub: Subscription | null = null;
      if (sub.status === 'active') {
        updatedSub = await apiClient(`/subscriptions/${sub.id}/pause`, { method: 'POST' })
      } else if (sub.status === 'paused') {
        updatedSub = await apiClient(`/subscriptions/${sub.id}/resume`, { method: 'POST' })
      } else if (sub.status !== 'cancelled' && sub.status !== 'completed') {
        await apiClient(`/subscriptions/${sub.id}`, { method: 'DELETE' })
      }

      setSubs(prev => prev.map(s => {
        if (s.id === sub.id) {
          if (updatedSub) return updatedSub;
          return { ...s, status: 'cancelled' };
        }
        return s;
      }))
    } catch (err) {
      console.error(err)
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-48" />
        {[1, 2, 3].map(i => <div key={i} className="h-24 bg-gray-100 rounded-2xl" />)}
      </div>
    )
  }

  const aiSuggested = subs.filter(s => s.source === 'ai_generated')
  const directSubs = subs.filter(s => s.source !== 'ai_generated')

  return (
    <div className="space-y-6">
      <h1 className="text-3xl md:text-4xl font-display font-extrabold uppercase tracking-tighter">My Subscriptions</h1>

      {subs.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl shadow-card">
          <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 font-bold uppercase tracking-wider">No subscriptions yet</p>
          <p className="text-sm text-gray-400 mt-1">Sign an agreement or create a household to get started</p>
        </div>
      ) : (
        <div className="space-y-4">
          {subs.map((sub) => (
            <div key={sub.id} className="flex flex-col">
              <div className="bg-white rounded-2xl p-5 shadow-card flex items-center justify-between z-10">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-surface-muted rounded-xl flex items-center justify-center">
                    <ShoppingBag className="w-5 h-5 text-gray-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{sub.product?.name || sub.product_id?.slice(0, 8)}</p>
                    <p className="text-xs text-gray-400">
                      {Math.ceil(sub.quantity_per_delivery)} units × every {sub.frequency_days}d · ₹{Number(sub.locked_unit_price).toLocaleString('en-IN')}/unit
                      {sub.source === 'ai_generated' && (
                        <span className="ml-2 text-accent font-semibold">· Suggested</span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-bold uppercase px-2.5 py-1 rounded-full ${sub.status === 'active' && sub.pause_after_next_delivery ? 'bg-amber-100 text-amber-800' :
                      sub.status === 'active' ? 'bg-green-50 text-green-700' :
                        sub.status === 'paused' ? 'bg-amber-50 text-amber-700' :
                          'bg-gray-100 text-gray-500'
                    }`}>
                    {sub.source === 'ai_generated' && sub.status !== 'active' ? 'Suggested' :
                      sub.pause_after_next_delivery ? 'Pause Pending' :
                        sub.status === 'paused' ? 'ACTIVE (Deliveries Paused)' :
                          substitutions.find(s => s.lifetime_subscription_id === sub.id && s.substitution_type === 'PERMANENT') ? 'MODIFIED' :
                            sub.status}
                  </span>
                  {(sub.status === 'active' || sub.status === 'paused') && (
                    <button
                      onClick={() => {
                        if (sub.status === 'paused') {
                          setConfirmSub(sub)
                        } else if (sub.status === 'active' && !sub.pause_after_next_delivery) {
                          setPauseSub(sub)
                        }
                      }}
                      disabled={actionLoading === sub.id || Boolean(sub.pause_after_next_delivery)}
                      className={`p-2 rounded-lg transition-all ${sub.status === 'active'
                          ? 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                          : 'bg-green-50 text-green-600 hover:bg-green-100'
                        }`}
                    >
                      {actionLoading === sub.id ? <Loader2 className="w-4 h-4 animate-spin" /> :
                        sub.status === 'active' ? <Pause className="w-4 h-4" /> :
                          <Play className="w-4 h-4" />}
                    </button>
                  )}
                </div>
              </div>

              {/* Permanent Substitution Alert */}
              {substitutions.find(s => s.lifetime_subscription_id === sub.id && s.substitution_type === 'PERMANENT') && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 mt-2 mb-4 mx-2">
                  <div>
                    <p className="text-sm text-red-800 font-medium">
                      <span className="font-bold">{substitutions.find(s => s.lifetime_subscription_id === sub.id && s.substitution_type === 'PERMANENT')?.original_product_name}</span> is permanently discontinued.
                      Your contract is now fulfilled with <span className="font-bold">{substitutions.find(s => s.lifetime_subscription_id === sub.id && s.substitution_type === 'PERMANENT')?.substituted_product_name} (Equal Grade)</span> at your original locked price.
                    </p>
                  </div>
                  <button
                    onClick={() => setConfirmSub(sub)} // Reusing the modal logic just to demonstrate action
                    className="shrink-0 px-4 py-2 text-xs font-bold uppercase tracking-wider text-red-700 bg-red-100 hover:bg-red-200 rounded-lg transition-colors"
                  >
                    Change Brand or Cancel
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {confirmSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 shadow-2xl max-w-md w-full">
            {!hasPaymentMethod ? (
              <>
                <div className="flex items-center gap-2 mb-4">
                  <CreditCard className="w-6 h-6 text-accent" />
                  <h3 className="text-xl font-display font-bold uppercase tracking-tight">Secure Billing</h3>
                </div>
                <p className="text-gray-600 mb-6 text-sm">
                  To activate this price lock for <strong>{confirmSub.product?.name || confirmSub.product_id.slice(0, 8)}</strong>, please link a default billing method.
                </p>
                <StripePaymentForm
                  onSuccess={() => {
                    setHasPaymentMethod(true)
                    toggleStatus(confirmSub)
                    setConfirmSub(null)
                  }}
                  buttonText="Save & Activate"
                />
                <button
                  onClick={() => setConfirmSub(null)}
                  className="w-full mt-4 px-4 py-3 text-sm font-bold text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <h3 className="text-xl font-display font-bold uppercase tracking-tight mb-2">Activate Subscription</h3>
                <p className="text-gray-600 mb-6">
                  You are about to activate <strong>{confirmSub.product?.name || confirmSub.product_id.slice(0, 8)}</strong>. This will generate a new Lifetime Wholesale Agreement locking in your price at ₹{Number(confirmSub.locked_unit_price).toLocaleString('en-IN')}/unit. Do you accept?
                </p>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setConfirmSub(null)}
                    className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    disabled={actionLoading === confirmSub.id}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      toggleStatus(confirmSub)
                      setConfirmSub(null)
                    }}
                    className="px-4 py-2 text-sm font-bold text-white bg-accent hover:bg-accent/90 rounded-lg shadow-button transition-colors flex items-center gap-2"
                    disabled={actionLoading === confirmSub.id}
                  >
                    {actionLoading === confirmSub.id ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Yes, Activate
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {pauseSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 shadow-2xl max-w-md w-full">
            <h3 className="text-xl font-display font-bold uppercase tracking-tight mb-2">Pause Subscription</h3>
            <p className="text-gray-600 mb-6">
              Deliveries scheduled within the manufacturer's lead time cannot be stopped due to logistics lock-in. Your pause will take effect after the upcoming delivery. Do you still want to pause?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setPauseSub(null)}
                className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                disabled={actionLoading === pauseSub.id}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  toggleStatus(pauseSub)
                  setPauseSub(null)
                }}
                className="px-4 py-2 text-sm font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-lg shadow-button transition-colors flex items-center gap-2"
                disabled={actionLoading === pauseSub.id}
              >
                {actionLoading === pauseSub.id ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Yes, Pause
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}