'use client'

import React, { useState, useEffect } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { Loader2 } from 'lucide-react'
import { apiClient } from '@/lib/api'

// Avoid recreating the Stripe object
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_TYooMQauvdEDq54NiTphI7jx')

interface CheckoutFormProps {
  onSuccess: () => void
  buttonText?: string
}

function CheckoutForm({ onSuccess, buttonText = "Save Payment Method" }: CheckoutFormProps) {
  const stripe = useStripe()
  const elements = useElements()
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return

    setProcessing(true)
    setError(null)

    const { error: setupError, setupIntent } = await stripe.confirmSetup({
      elements,
      confirmParams: {
        // Return URL is required, but we will use redirect: 'if_required' to handle it within the SPA if possible
      },
      redirect: 'if_required'
    })

    if (setupError) {
      setError(setupError.message || "An error occurred")
      setProcessing(false)
    } else if (setupIntent && setupIntent.status === 'succeeded') {
      // It succeeded immediately. Wait a moment for webhook to process, or just call success immediately.
      // Usually webhook takes 1-2 seconds, we'll let onSuccess handle it.
      onSuccess()
    } else {
      setProcessing(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-white p-4 rounded-xl border border-gray-200">
        <PaymentElement />
      </div>
      {error && <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</div>}
      <button
        type="submit"
        disabled={!stripe || processing}
        className="w-full flex items-center justify-center gap-2 px-6 py-4 text-sm font-bold
                   text-white bg-accent rounded-lg shadow-button hover:shadow-button-hover
                   hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50"
      >
        {processing && <Loader2 className="w-5 h-5 animate-spin" />}
        {processing ? 'Processing...' : buttonText}
      </button>
    </form>
  )
}

export default function StripePaymentForm({ onSuccess, buttonText }: CheckoutFormProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchSecret() {
      try {
        const data = await apiClient('/payments/setup-intent', { method: 'POST' })
        setClientSecret(data.client_secret)
      } catch (err: any) {
        setError("Failed to initialize secure payment. " + err.message)
      }
    }
    fetchSecret()
  }, [])

  if (error) {
    return <div className="text-red-600 p-4 bg-red-50 rounded-lg text-sm">{error}</div>
  }

  if (!clientSecret) {
    return (
      <div className="flex items-center justify-center p-8 text-gray-400">
        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading secure payment gateway...
      </div>
    )
  }

  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <CheckoutForm onSuccess={onSuccess} buttonText={buttonText} />
    </Elements>
  )
}
