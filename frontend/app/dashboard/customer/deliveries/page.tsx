'use client'

import { apiClient } from '@/lib/api'
import { useEffect, useState } from 'react'
import { Truck, CheckCircle, Clock, XCircle, AlertTriangle, Package, Calendar, MapPin, X, FileText, ChevronRight } from 'lucide-react'

interface Delivery {
  id: string
  subscription_id: string
  product_id: string
  scheduled_date: string
  actual_delivery_date: string | null
  status: string
  quantity: number
  unit_price_applied: number
  tracking_number: string | null
  delivery_address: any
  notes: string | null
  product?: {
    id: string
    name: string
    image_url: string | null
    unit_price_wholesale: number
  }
}

interface SubstitutionEvent {
  id: string
  lifetime_subscription_id: string
  original_product_name: string
  substituted_product_name: string
  substitution_type: string
  reason: string
}

export default function DeliveriesPage() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [substitutions, setSubstitutions] = useState<SubstitutionEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active')
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const [deliveriesData, subsData] = await Promise.all([
          apiClient(`/scheduling/deliveries`).catch(() => []),
          apiClient(`/price-protection/substitutions/me`).catch(() => [])
        ])
        setDeliveries(Array.isArray(deliveriesData) ? deliveriesData : [])
        setSubstitutions(Array.isArray(subsData) ? subsData : [])
      } catch {} finally { setLoading(false) }
    }
    load()
  }, [])

  const statusIcon = (status: string) => {
    switch (status) {
      case 'delivered': return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'pending': return <Clock className="w-5 h-5 text-amber-500" />
      case 'partially_filled': return <AlertTriangle className="w-5 h-5 text-orange-500" />
      case 'in_transit': return <Truck className="w-5 h-5 text-blue-500" />
      case 'out_for_delivery': return <Truck className="w-5 h-5 text-purple-500" />
      case 'failed': return <XCircle className="w-5 h-5 text-red-500" />
      case 'returned': return <XCircle className="w-5 h-5 text-gray-500" />
      default: return <Package className="w-5 h-5 text-gray-300" />
    }
  }

  const activeStatuses = ['pending', 'partially_filled', 'in_transit', 'out_for_delivery']
  const historyStatuses = ['delivered', 'returned', 'failed']

  const filteredDeliveries = deliveries.filter(d => {
    if (activeTab === 'active') return activeStatuses.includes(d.status)
    return historyStatuses.includes(d.status) || (!activeStatuses.includes(d.status) && !historyStatuses.includes(d.status))
  })

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-48" />
        {[1,2,3].map(i => <div key={i} className="h-20 bg-gray-100 rounded-2xl" />)}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-3xl md:text-4xl font-display font-extrabold uppercase tracking-tighter">Deliveries</h1>
        
        <div className="flex items-center bg-gray-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('active')}
            className={`px-6 py-2 rounded-lg text-sm font-bold uppercase transition-all ${
              activeTab === 'active' ? 'bg-white shadow-sm text-accent' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Active Tracking
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-6 py-2 rounded-lg text-sm font-bold uppercase transition-all ${
              activeTab === 'history' ? 'bg-white shadow-sm text-accent' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Delivery History
          </button>
        </div>
      </div>

      {filteredDeliveries.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 shadow-card text-center">
          <Truck className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 font-bold uppercase tracking-wider">No deliveries found</p>
          <p className="text-sm text-gray-400 mt-1">
            {activeTab === 'active' ? 'You have no active deliveries right now.' : 'Your delivery history is empty.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredDeliveries.map((d) => (
            <button
              key={d.id}
              onClick={() => setSelectedDelivery(d)}
              className="w-full text-left bg-white rounded-2xl p-5 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4 group hover:-translate-y-0.5 hover:shadow-card-hover transition-all duration-200 cursor-pointer border border-transparent hover:border-gray-200"
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                  d.status === 'delivered' ? 'bg-green-50' :
                  d.status === 'pending' || d.status === 'partially_filled' ? 'bg-amber-50' :
                  d.status === 'in_transit' || d.status === 'out_for_delivery' ? 'bg-blue-50' :
                  d.status === 'failed' || d.status === 'returned' ? 'bg-red-50' :
                  'bg-gray-100'
                }`}>
                  {statusIcon(d.status)}
                </div>
                <div>
                  <p className="text-sm font-semibold">{d.product?.name || d.product_id?.slice(0, 8)}</p>
                  <p className="text-xs text-gray-400">
                    {Math.ceil(d.quantity)} units · ₹{Number(d.product?.unit_price_wholesale || d.unit_price_applied).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/unit
                  </p>
                  
                  {substitutions.find(s => s.lifetime_subscription_id === d.subscription_id && s.substitution_type === 'TEMPORARY') && (
                    <div className="mt-2 bg-blue-50 border border-blue-200 rounded-lg p-2 max-w-sm">
                      <p className="text-xs text-blue-800 font-medium">
                        <AlertTriangle className="w-3 h-3 inline mr-1 text-blue-600 -mt-0.5" />
                        {substitutions.find(s => s.lifetime_subscription_id === d.subscription_id && s.substitution_type === 'TEMPORARY')?.original_product_name} is temporarily out of stock this month. We sent {substitutions.find(s => s.lifetime_subscription_id === d.subscription_id && s.substitution_type === 'TEMPORARY')?.substituted_product_name} so you don’t miss a delivery.
                      </p>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between w-full md:w-auto md:justify-end gap-4 text-left md:text-right">
                <div>
                  <p className="text-xs text-gray-400">
                    <Calendar className="w-3 h-3 inline mr-1" />
                    Scheduled for: {new Date(d.scheduled_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                  <span className={`text-xs font-bold uppercase ${
                    d.status === 'delivered' ? 'text-green-600' :
                    d.status === 'pending' || d.status === 'partially_filled' ? 'text-amber-600' :
                    d.status === 'failed' || d.status === 'returned' ? 'text-red-500' :
                    'text-gray-500'
                  }`}>
                    {d.status.replace(/_/g, ' ')}
                  </span>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-accent transition-colors" />
              </div>
            </button>
          ))}
        </div>
      )}

      {selectedDelivery && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-surface-border flex items-start justify-between bg-gray-50">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center bg-white shadow-sm ${
                  selectedDelivery.status === 'delivered' ? 'text-green-500' :
                  selectedDelivery.status === 'pending' || selectedDelivery.status === 'partially_filled' ? 'text-amber-500' :
                  selectedDelivery.status === 'in_transit' || selectedDelivery.status === 'out_for_delivery' ? 'text-blue-500' :
                  selectedDelivery.status === 'failed' || selectedDelivery.status === 'returned' ? 'text-red-500' :
                  'text-gray-500'
                }`}>
                  {statusIcon(selectedDelivery.status)}
                </div>
                <div>
                  <h3 className="text-xl font-display font-bold uppercase tracking-tight">{selectedDelivery.product?.name || 'Product'}</h3>
                  <p className="text-sm text-gray-500">{Math.ceil(selectedDelivery.quantity)} units scheduled for {new Date(selectedDelivery.scheduled_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedDelivery(null)}
                className="p-2 bg-white hover:bg-gray-100 rounded-full transition-colors text-gray-500 shadow-sm border border-gray-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-8 flex-1">
              
              {/* STATUS TIMELINE */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-6">Tracking Timeline</h4>
                <div className="relative pl-6 space-y-6 before:absolute before:inset-0 before:left-8 before:h-full before:w-0.5 before:bg-gray-200">
                  
                  {/* TICKET GENERATED */}
                  <div className="relative flex items-start group">
                    <div className="absolute -left-2 top-0.5 flex items-center justify-center w-5 h-5 rounded-full bg-green-500 text-white z-10 shadow-sm ring-4 ring-white">
                      <CheckCircle className="w-3 h-3" />
                    </div>
                    <div className="ml-8 w-full">
                      <div className="font-bold text-gray-900 text-sm">Ticket Generated</div>
                      <div className="text-xs text-gray-500">Warehouse accepted order for processing.</div>
                    </div>
                  </div>

                  {/* PACKED */}
                  <div className="relative flex items-start group">
                    <div className={`absolute -left-2 top-0.5 flex items-center justify-center w-5 h-5 rounded-full z-10 ring-4 ring-white ${
                      ['in_transit', 'out_for_delivery', 'delivered'].includes(selectedDelivery.status) 
                        ? 'bg-green-500 text-white' 
                        : 'bg-gray-200 text-gray-400'
                    }`}>
                      <Package className="w-3 h-3" />
                    </div>
                    <div className="ml-8 w-full">
                      <div className={`font-bold text-sm ${['in_transit', 'out_for_delivery', 'delivered'].includes(selectedDelivery.status) ? 'text-gray-900' : 'text-gray-400'}`}>Packed</div>
                      {['in_transit', 'out_for_delivery', 'delivered'].includes(selectedDelivery.status) && (
                         <div className="text-xs text-gray-500">Package has been boxed and labeled.</div>
                      )}
                    </div>
                  </div>

                  {/* SHIPPED */}
                  <div className="relative flex items-start group">
                    <div className={`absolute -left-2 top-0.5 flex items-center justify-center w-5 h-5 rounded-full z-10 ring-4 ring-white ${
                      ['out_for_delivery', 'delivered'].includes(selectedDelivery.status) 
                        ? 'bg-green-500 text-white' 
                        : 'bg-gray-200 text-gray-400'
                    }`}>
                      <Truck className="w-3 h-3" />
                    </div>
                    <div className="ml-8 w-full">
                      <div className={`font-bold text-sm ${['out_for_delivery', 'delivered'].includes(selectedDelivery.status) ? 'text-gray-900' : 'text-gray-400'}`}>Shipped</div>
                      {['out_for_delivery', 'delivered'].includes(selectedDelivery.status) && (
                         <div className="text-xs text-gray-500">Handed over to final mile logistics partner.</div>
                      )}
                    </div>
                  </div>

                  {/* DELIVERED */}
                  <div className="relative flex items-start group">
                    <div className={`absolute -left-2 top-0.5 flex items-center justify-center w-5 h-5 rounded-full z-10 ring-4 ring-white ${
                      selectedDelivery.status === 'delivered' 
                        ? 'bg-green-500 text-white' 
                        : 'bg-gray-200 text-gray-400'
                    }`}>
                      <MapPin className="w-3 h-3" />
                    </div>
                    <div className="ml-8 w-full">
                      <div className={`font-bold text-sm ${selectedDelivery.status === 'delivered' ? 'text-gray-900' : 'text-gray-400'}`}>Delivered</div>
                      {selectedDelivery.status === 'delivered' && selectedDelivery.actual_delivery_date && (
                         <div className="text-xs text-green-600 font-semibold">Delivered on {new Date(selectedDelivery.actual_delivery_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                      )}
                    </div>
                  </div>

                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* ADDRESS */}
                <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
                  <div className="flex items-center gap-2 mb-3">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <h4 className="text-xs font-bold uppercase tracking-widest text-gray-500">Shipping Address</h4>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {selectedDelivery.delivery_address?.street || 'No street provided'},<br/>
                    {selectedDelivery.delivery_address?.city || 'No city'}, {selectedDelivery.delivery_address?.state} {selectedDelivery.delivery_address?.zip_code}
                  </p>
                </div>

                {/* LOGISTICS */}
                <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
                  <div className="flex items-center gap-2 mb-3">
                    <Truck className="w-4 h-4 text-gray-400" />
                    <h4 className="text-xs font-bold uppercase tracking-widest text-gray-500">Logistics Details</h4>
                  </div>
                  {selectedDelivery.tracking_number ? (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Tracking Number</p>
                      <p className="text-sm font-mono font-bold text-gray-900 bg-white border border-gray-200 rounded px-2 py-1 inline-block">
                        {selectedDelivery.tracking_number}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">Tracking information will be available once the order is shipped.</p>
                  )}
                </div>
              </div>

              {/* NOTES / FAILED ALERTS */}
              {selectedDelivery.notes && (
                <div className="bg-amber-50 rounded-2xl p-5 border border-amber-100 flex items-start gap-3">
                  <FileText className="w-5 h-5 text-amber-500 shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-widest text-amber-600 mb-1">Delivery Notes</h4>
                    <p className="text-sm text-amber-800 leading-relaxed">{selectedDelivery.notes}</p>
                  </div>
                </div>
              )}

              {['failed', 'returned', 'partially_filled'].includes(selectedDelivery.status) && !selectedDelivery.notes && (
                <div className="bg-red-50 rounded-2xl p-5 border border-red-100 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-widest text-red-600 mb-1">Issue Detected</h4>
                    <p className="text-sm text-red-800 leading-relaxed">
                      {selectedDelivery.status === 'failed' ? 'This delivery failed to process correctly.' :
                       selectedDelivery.status === 'returned' ? 'This delivery was returned to the warehouse.' :
                       'This delivery was only partially fulfilled due to sudden inventory shortages.'}
                    </p>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

    </div>
  )
}