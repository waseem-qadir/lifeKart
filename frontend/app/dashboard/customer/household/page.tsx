'use client'

import { apiClient } from '@/lib/api'
import { useEffect, useState } from 'react'
import { Users, Plus, Trash2, Loader2, CreditCard, Pencil, X } from 'lucide-react'
import CreateHouseholdForm from './CreateHouseholdForm'
import MemberModal from './MemberModal'
import StripePaymentForm from '@/components/StripePaymentForm'

interface Member {
  id: string
  full_name: string
  family_relation: string
  date_of_birth: string
  gender: string
  dietary_preference: string
  is_active: boolean
}

interface Household {
  id: string
  address_line1: string
  city: string
  state: string
  pincode: string
  monthly_grocery_budget: number
  members: Member[]
}

interface PaymentMethod {
  id: string
  stripe_payment_method_id: string
  type: string
  brand: string | null
  last_four: string | null
  exp_month: number | null
  exp_year: number | null
  is_default: boolean
}

const relations = ['spouse', 'child', 'parent', 'sibling', 'grandparent']
const genders = ['male', 'female', 'other']
const diets = ['', 'vegetarian', 'non_veg', 'vegan', 'jain', 'keto', 'diabetic']

export default function HouseholdPage() {
  const [household, setHousehold] = useState<Household | null>(null)
  const [loading, setLoading] = useState(true)
  const [modalMemberId, setModalMemberId] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'profile' | 'billing'>('profile')

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [loadingPayments, setLoadingPayments] = useState(false)
  const [showAddCard, setShowAddCard] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const data = await apiClient('/profiling/households/me').catch(() => null)
      if (data) setHousehold(data)
    } catch {} finally { setLoading(false) }
  }

  async function loadPayments() {
    setLoadingPayments(true)
    try {
      const data = await apiClient('/payments/methods').catch(() => [])
      setPaymentMethods(data)
    } catch {} finally { setLoadingPayments(false) }
  }

  useEffect(() => { load() }, [])
  useEffect(() => {
    if (activeTab === 'billing' && household) {
      loadPayments()
    }
  }, [activeTab, household])

  async function deactivateMember(memberId: string) {
    try {
      await apiClient(`/profiling/members/${memberId}`, { method: 'DELETE' })
      await load()
    } catch (err: any) { alert(err.message) }
  }

  async function deletePaymentMethod(methodId: string) {
    try {
      await apiClient(`/payments/methods/${methodId}`, { method: 'DELETE' })
      await loadPayments()
    } catch (err: any) { alert(err.message) }
  }

  async function setAsDefault(methodId: string) {
    try {
      await apiClient(`/payments/methods/${methodId}/default`, { method: 'POST' })
      await loadPayments()
    } catch (err: any) { alert(err.message) }
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-48" />
        <div className="h-40 bg-gray-100 rounded-2xl" />
      </div>
    )
  }

  if (!household) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl md:text-4xl font-display font-extrabold uppercase tracking-tighter">Set Up Household</h1>
        <CreateHouseholdForm onCreated={load} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-3xl md:text-4xl font-display font-extrabold uppercase tracking-tighter">Settings</h1>
        
        <div className="flex items-center bg-gray-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-6 py-2 rounded-lg text-sm font-bold uppercase transition-all ${
              activeTab === 'profile' ? 'bg-white shadow-sm text-accent' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Household Profile
          </button>
          <button
            onClick={() => setActiveTab('billing')}
            className={`px-6 py-2 rounded-lg text-sm font-bold uppercase transition-all ${
              activeTab === 'billing' ? 'bg-white shadow-sm text-accent' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Billing & Payments
          </button>
        </div>
      </div>

      {activeTab === 'profile' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-card">
            <div className="flex items-center gap-3 mb-4">
              <Users className="w-5 h-5 text-accent" />
              <h3 className="text-lg font-display font-bold uppercase tracking-tight">Household Details</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider">Address</p>
                <p className="font-semibold">{household.address_line1}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider">City</p>
                <p className="font-semibold">{household.city}, {household.state}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider">Pincode</p>
                <p className="font-semibold">{household.pincode}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider">Monthly Budget</p>
                <p className="font-semibold">₹{Number(household.monthly_grocery_budget || 0).toLocaleString('en-IN')}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-accent" />
                <h3 className="text-lg font-display font-bold uppercase tracking-tight">
                  Members ({household.members.length})
                </h3>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              {household.members.filter(m => m.is_active).map((member) => (
                <div key={member.id} className="flex items-center justify-between py-3 border-b border-surface-border last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-surface-muted rounded-full flex items-center justify-center">
                      <span className="text-sm font-bold text-gray-500">
                        {member.full_name?.charAt(0)?.toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold">
                        {member.full_name}
                        {member.family_relation === 'self' && (
                          <span className="ml-2 text-xs bg-accent/10 text-accent px-2 py-0.5 rounded-full">You</span>
                        )}
                      </p>
                      <p className="text-xs text-gray-400">
                        {member.family_relation} · {member.gender} · {new Date(member.date_of_birth).toLocaleDateString('en-IN')}
                        {member.dietary_preference && ` · ${member.dietary_preference}`}
                      </p>
                    </div>
                  </div>
                  {member.is_active && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => { setModalMemberId(member.id); setIsModalOpen(true) }}
                        className="p-2 text-gray-400 hover:text-accent rounded-lg hover:bg-orange-50 transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      {member.family_relation !== 'self' && (
                        <button
                          onClick={() => deactivateMember(member.id)}
                          className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="border-t border-surface-border pt-4 mt-4">
              <button
                onClick={() => { setModalMemberId(null); setIsModalOpen(true) }}
                className="w-full py-4 border-2 border-dashed border-gray-300 rounded-lg text-sm font-bold text-gray-500 hover:border-accent hover:text-accent hover:bg-orange-50 transition-all flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Add Family Member
              </button>
            </div>

            {isModalOpen && (
              <MemberModal 
                memberId={modalMemberId || undefined} 
                onClose={() => { setIsModalOpen(false); setModalMemberId(null) }} 
                onSaved={load} 
              />
            )}
          </div>
        </div>
      )}

      {activeTab === 'billing' && (
        <div className="bg-white rounded-2xl p-6 shadow-card">
          <div className="flex items-center gap-3 mb-6">
            <CreditCard className="w-5 h-5 text-accent" />
            <h3 className="text-lg font-display font-bold uppercase tracking-tight">Payment Methods</h3>
          </div>

          {loadingPayments ? (
            <div className="flex items-center justify-center py-12 text-gray-400">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : (
            <>
              {paymentMethods.length === 0 ? (
                <div className="text-center py-8">
                  <CreditCard className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500 font-medium">No payment methods saved.</p>
                </div>
              ) : (
                <div className="space-y-4 mb-8">
                  {paymentMethods.map(pm => (
                    <div key={pm.id} className="flex items-center justify-between p-4 border border-gray-100 bg-gray-50 rounded-xl">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-9 bg-white border border-gray-200 rounded flex items-center justify-center overflow-hidden">
                          {pm.brand === 'visa' ? (
                            <span className="text-[#1434CB] font-bold text-xs italic tracking-tighter uppercase">VISA</span>
                          ) : pm.brand === 'mastercard' ? (
                            <div className="flex items-center -space-x-1.5 opacity-90">
                              <div className="w-4 h-4 rounded-full bg-[#EB001B]"></div>
                              <div className="w-4 h-4 rounded-full bg-[#F79E1B]"></div>
                            </div>
                          ) : pm.brand === 'amex' ? (
                            <span className="text-[#002663] font-bold text-[10px] uppercase">AMEX</span>
                          ) : (
                            <CreditCard className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-3">
                            <p className="font-semibold text-sm tracking-widest text-gray-800">
                              •••• •••• •••• {pm.last_four || '****'}
                            </p>
                            {pm.is_default && (
                              <span className="text-[10px] font-bold uppercase text-green-700 bg-green-100 border border-green-200 px-2 py-0.5 rounded-sm tracking-wider">
                                Default
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            {pm.exp_month && pm.exp_year && (
                              <p className="text-xs text-gray-500 font-medium">
                                Expires {pm.exp_month.toString().padStart(2, '0')}/{pm.exp_year}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {!pm.is_default && (
                          <button 
                            onClick={() => setAsDefault(pm.id)}
                            className="text-xs font-bold text-gray-500 hover:text-accent uppercase tracking-wider px-3 py-2"
                          >
                            Set Default
                          </button>
                        )}
                        <button 
                          onClick={() => deletePaymentMethod(pm.id)}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {showAddCard ? (
                <div className="border-t border-gray-100 pt-6 mt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-bold text-sm uppercase tracking-wider text-gray-700">Add New Card</h4>
                    <button onClick={() => setShowAddCard(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5"/></button>
                  </div>
                  <StripePaymentForm 
                    onSuccess={() => {
                      setShowAddCard(false)
                      loadPayments()
                    }} 
                    buttonText="Save Securely" 
                  />
                </div>
              ) : (
                <button
                  onClick={() => setShowAddCard(true)}
                  className="w-full py-4 border-2 border-dashed border-gray-300 rounded-xl text-sm font-bold text-gray-500 hover:border-accent hover:text-accent hover:bg-orange-50 transition-all flex items-center justify-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Add Backup Card
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}