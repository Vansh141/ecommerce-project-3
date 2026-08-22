import { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Check, MapPin, CreditCard, Banknote, Plus, ShoppingBag, Lock, ArrowLeft,
} from 'lucide-react';
import { userApi, orderApi, paymentApi } from '../api/endpoints';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useFetch, useDocumentMeta } from '../hooks';
import AddressForm from '../components/account/AddressForm';
import OrderSummary from '../components/product/OrderSummary';
import { Button, EmptyState, Alert, Spinner, Modal } from '../components/ui';
import { formatPriceExact } from '../utils/format';

const STEPS = [
  { key: 'address', label: 'Address' },
  { key: 'payment', label: 'Payment' },
  { key: 'review', label: 'Review' },
];

function Stepper({ current }) {
  const index = STEPS.findIndex((s) => s.key === current);

  return (
    <ol className="mb-10 flex items-center justify-center gap-2 sm:gap-4">
      {STEPS.map((step, i) => {
        const done = i < index;
        const active = i === index;
        return (
          <li key={step.key} className="flex items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-2.5">
              <span
                aria-current={active ? 'step' : undefined}
                className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs font-medium
                            transition-colors ${
                              done
                                ? 'border-ink bg-ink text-paper'
                                : active
                                  ? 'border-ink text-ink'
                                  : 'border-line text-ink-faint'
                            }`}
              >
                {done ? <Check size={14} aria-hidden="true" /> : i + 1}
              </span>
              <span
                className={`hidden text-xs font-medium uppercase tracking-wider2 sm:block ${
                  active ? 'text-ink' : 'text-ink-faint'
                }`}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && <span className="h-px w-6 bg-line sm:w-12" aria-hidden="true" />}
          </li>
        );
      })}
    </ol>
  );
}

/** Loads the Razorpay widget only when it is actually needed. */
function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function Checkout() {
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const { items, orderPayloadItems, pricing, couponCode, clearCart, hasStockIssue } = useCart();

  const [step, setStep] = useState('address');
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [addingAddress, setAddingAddress] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState(null);

  useDocumentMeta({ title: 'Checkout', noIndex: true });

  const { data: addressData, loading: addressesLoading, refetch: refetchAddresses } =
    useFetch(() => userApi.listAddresses(), []);
  const { data: payConfig, loading: payConfigLoading } = useFetch(() => paymentApi.config(), []);

  // Memoised so the fallback array is not a new reference on every render,
  // which would make the preselect effect below re-run in a loop.
  const addresses = useMemo(() => addressData?.addresses || [], [addressData]);

  // Preselect the default address so the common path is one tap.
  useEffect(() => {
    if (!selectedAddressId && addresses.length > 0) {
      setSelectedAddressId((addresses.find((a) => a.isDefault) || addresses[0])._id);
    }
  }, [addresses, selectedAddressId]);

  // Choose a sensible default payment method from what is actually enabled.
  useEffect(() => {
    if (paymentMethod || !payConfig) return;
    if (payConfig.razorpay?.enabled) setPaymentMethod('RAZORPAY');
    else if (payConfig.cod?.enabled) setPaymentMethod('COD');
  }, [payConfig, paymentMethod]);

  const selectedAddress = addresses.find((a) => a._id === selectedAddressId);

  const codAvailable = useMemo(() => {
    if (!payConfig?.cod?.enabled) return false;
    if (!pricing) return true;
    return pricing.grandTotal <= (payConfig.cod.maxOrderValue ?? Infinity);
  }, [payConfig, pricing]);

  useEffect(() => {
    // If the bag grows past the COD ceiling, fall back to online payment.
    if (paymentMethod === 'COD' && !codAvailable && payConfig?.razorpay?.enabled) {
      setPaymentMethod('RAZORPAY');
    }
  }, [codAvailable, paymentMethod, payConfig]);

  if (items.length === 0 && !placing) {
    return (
      <div className="shell">
        <EmptyState
          icon={ShoppingBag}
          title="Your bag is empty"
          description="Add something before checking out."
          action={<Button to="/shop">Browse the collection</Button>}
        />
      </div>
    );
  }

  const saveAddress = async (form) => {
    const data = await userApi.addAddress(form);
    await refetchAddresses();
    setSelectedAddressId(data.address._id);
    setAddingAddress(false);
    toast.success('Address saved.');
  };

  /**
   * Places the order.
   *
   * Only ids, sizes, quantities and a coupon *code* are sent. No price, no
   * discount, no total — the server derives every figure itself, so a tampered
   * request cannot change what is charged.
   */
  const placeOrder = async () => {
    setError(null);
    setPlacing(true);

    try {
      const { order, requiresPayment } = await orderApi.create({
        items: orderPayloadItems,
        addressId: selectedAddressId,
        paymentMethod,
        couponCode: couponCode || null,
      });

      if (!requiresPayment) {
        clearCart();
        navigate(`/order-confirmed/${order._id}`, { replace: true });
        return;
      }

      // ── Online payment ──
      const scriptOk = await loadRazorpayScript();
      if (!scriptOk) {
        throw new Error('Could not load the payment window. Please try again.');
      }

      const paymentOrder = await paymentApi.createOrder(order._id);

      const rzp = new window.Razorpay({
        key: paymentOrder.keyId,
        amount: paymentOrder.amount,
        currency: paymentOrder.currency,
        order_id: paymentOrder.razorpayOrderId,
        name: 'TOUCH',
        description: `Order ${paymentOrder.orderNumber}`,
        prefill: {
          name: selectedAddress?.fullName || user?.name,
          email: user?.email,
          contact: selectedAddress?.phone,
        },
        theme: { color: '#1C1917' },
        handler: async (response) => {
          try {
            // The browser's claim of success proves nothing. The server
            // recomputes the HMAC signature before marking anything paid.
            await paymentApi.verify(order._id, {
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
            });
            clearCart();
            navigate(`/order-confirmed/${order._id}`, { replace: true });
          } catch (err) {
            setPlacing(false);
            setError(
              err.friendlyMessage ||
                'We could not verify your payment. If money was debited it will be refunded automatically.'
            );
          }
        },
        modal: {
          ondismiss: () => {
            setPlacing(false);
            setError(
              'Payment was not completed. Your order is saved and stock is held for a short while — you can pay from your order history.'
            );
          },
        },
      });

      rzp.on('payment.failed', (resp) => {
        setPlacing(false);
        setError(resp?.error?.description || 'Payment failed. Please try another method.');
      });

      rzp.open();
    } catch (err) {
      setPlacing(false);
      setError(err.friendlyMessage || err.message || 'Could not place your order.');
    }
  };

  const canContinueAddress = Boolean(selectedAddressId);
  const canContinuePayment = Boolean(paymentMethod);

  return (
    <div className="shell py-10 sm:py-14">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-display-2">Checkout</h1>
        <Link
          to="/cart"
          className="inline-flex items-center gap-1.5 text-xs font-medium uppercase
                     tracking-wider2 text-ink-muted transition-colors hover:text-ink"
        >
          <ArrowLeft size={13} aria-hidden="true" /> Back to bag
        </Link>
      </div>

      <Stepper current={step} />

      {error && <Alert tone="error" className="mb-6" onDismiss={() => setError(null)}>{error}</Alert>}
      {hasStockIssue && (
        <Alert tone="warning" className="mb-6">
          Some items exceed available stock.{' '}
          <Link to="/cart" className="link">Review your bag</Link>.
        </Alert>
      )}

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-14">
        <div>
          {/* ── Step 1: address ── */}
          {step === 'address' && (
            <section aria-labelledby="step-address">
              <h2 id="step-address" className="mb-5 flex items-center gap-2 text-lg">
                <MapPin size={18} className="text-clay" aria-hidden="true" /> Delivery address
              </h2>

              {addressesLoading ? (
                <div className="py-10 text-center"><Spinner /></div>
              ) : addresses.length === 0 ? (
                <div className="card-pad">
                  <p className="mb-5 text-sm text-ink-muted">
                    Add an address so we know where to send your order.
                  </p>
                  <AddressForm onSubmit={saveAddress} submitLabel="Save and continue" />
                </div>
              ) : (
                <>
                  <ul className="space-y-3">
                    {addresses.map((a) => (
                      <li key={a._id}>
                        <label
                          className={`flex cursor-pointer gap-3.5 rounded-card border p-4 transition-colors sm:p-5 ${
                            selectedAddressId === a._id
                              ? 'border-ink bg-paper-raised'
                              : 'border-line bg-paper-raised hover:border-line-strong'
                          }`}
                        >
                          <input
                            type="radio"
                            name="address"
                            checked={selectedAddressId === a._id}
                            onChange={() => setSelectedAddressId(a._id)}
                            className="mt-1 h-4 w-4 shrink-0 accent-ink"
                          />
                          <div className="min-w-0 flex-1 text-sm">
                            <div className="mb-1 flex flex-wrap items-center gap-2">
                              <span className="font-medium text-ink">{a.fullName}</span>
                              {a.label && <span className="badge-neutral">{a.label}</span>}
                              {a.isDefault && <span className="badge-info">Default</span>}
                            </div>
                            <p className="leading-relaxed text-ink-muted">
                              {a.line1}{a.line2 ? `, ${a.line2}` : ''}<br />
                              {a.city}, {a.state} {a.postalCode}<br />
                              {a.phone}
                            </p>
                          </div>
                        </label>
                      </li>
                    ))}
                  </ul>

                  <Button
                    variant="ghost"
                    className="mt-4 w-full sm:w-auto"
                    onClick={() => setAddingAddress(true)}
                  >
                    <Plus size={14} aria-hidden="true" /> Add a new address
                  </Button>
                </>
              )}

              {addresses.length > 0 && (
                <Button
                  size="lg"
                  className="mt-7 w-full sm:w-auto"
                  disabled={!canContinueAddress}
                  onClick={() => setStep('payment')}
                >
                  Continue to payment
                </Button>
              )}
            </section>
          )}

          {/* ── Step 2: payment ── */}
          {step === 'payment' && (
            <section aria-labelledby="step-payment">
              <h2 id="step-payment" className="mb-5 flex items-center gap-2 text-lg">
                <CreditCard size={18} className="text-clay" aria-hidden="true" /> Payment method
              </h2>

              {payConfigLoading ? (
                <div className="py-10 text-center"><Spinner /></div>
              ) : (
                <div className="space-y-3">
                  {payConfig?.razorpay?.enabled && (
                    <label
                      className={`flex cursor-pointer items-start gap-3.5 rounded-card border p-4 transition-colors sm:p-5 ${
                        paymentMethod === 'RAZORPAY' ? 'border-ink' : 'border-line hover:border-line-strong'
                      }`}
                    >
                      <input
                        type="radio" name="payment" checked={paymentMethod === 'RAZORPAY'}
                        onChange={() => setPaymentMethod('RAZORPAY')}
                        className="mt-1 h-4 w-4 shrink-0 accent-ink"
                      />
                      <div className="flex-1">
                        <p className="flex items-center gap-2 text-sm font-medium text-ink">
                          <CreditCard size={15} aria-hidden="true" /> Pay online
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-ink-muted">
                          UPI, cards, net banking and wallets via Razorpay.
                        </p>
                      </div>
                    </label>
                  )}

                  {payConfig?.cod?.enabled && (
                    <label
                      className={`flex cursor-pointer items-start gap-3.5 rounded-card border p-4 transition-colors sm:p-5 ${
                        !codAvailable
                          ? 'cursor-not-allowed border-line opacity-55'
                          : paymentMethod === 'COD'
                            ? 'border-ink'
                            : 'border-line hover:border-line-strong'
                      }`}
                    >
                      <input
                        type="radio" name="payment" checked={paymentMethod === 'COD'}
                        disabled={!codAvailable}
                        onChange={() => setPaymentMethod('COD')}
                        className="mt-1 h-4 w-4 shrink-0 accent-ink"
                      />
                      <div className="flex-1">
                        <p className="flex items-center gap-2 text-sm font-medium text-ink">
                          <Banknote size={15} aria-hidden="true" /> Cash on delivery
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-ink-muted">
                          {codAvailable
                            ? 'Pay in cash when your order arrives.'
                            : `Not available above ${formatPriceExact(payConfig.cod.maxOrderValue)}.`}
                        </p>
                      </div>
                    </label>
                  )}

                  {/* Honest about capability rather than showing a button that
                      cannot work. */}
                  {!payConfig?.razorpay?.enabled && (
                    <Alert tone="info">
                      Online payment is currently unavailable. You can still order with
                      cash on delivery.
                    </Alert>
                  )}
                </div>
              )}

              <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row">
                <Button
                  variant="ghost"
                  size="lg"
                  className="sm:shrink-0"
                  onClick={() => setStep('address')}
                >
                  Back
                </Button>
                <Button
                  size="lg"
                  className="sm:flex-1"
                  disabled={!canContinuePayment}
                  onClick={() => setStep('review')}
                >
                  Review order
                </Button>
              </div>
            </section>
          )}

          {/* ── Step 3: review ── */}
          {step === 'review' && (
            <section aria-labelledby="step-review" className="space-y-6">
              <h2 id="step-review" className="text-lg">Review your order</h2>

              <div className="card-pad">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-medium">Delivering to</h3>
                  <button
                    type="button"
                    onClick={() => setStep('address')}
                    className="text-xs text-ink-muted underline underline-offset-4 hover:text-ink"
                  >
                    Change
                  </button>
                </div>
                {selectedAddress && (
                  <p className="text-sm leading-relaxed text-ink-muted">
                    <span className="font-medium text-ink">{selectedAddress.fullName}</span><br />
                    {selectedAddress.line1}{selectedAddress.line2 ? `, ${selectedAddress.line2}` : ''}<br />
                    {selectedAddress.city}, {selectedAddress.state} {selectedAddress.postalCode}<br />
                    {selectedAddress.phone}
                  </p>
                )}
              </div>

              <div className="card-pad">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-medium">Paying with</h3>
                  <button
                    type="button"
                    onClick={() => setStep('payment')}
                    className="text-xs text-ink-muted underline underline-offset-4 hover:text-ink"
                  >
                    Change
                  </button>
                </div>
                <p className="text-sm text-ink-muted">
                  {paymentMethod === 'COD' ? 'Cash on delivery' : 'Online payment via Razorpay'}
                </p>
              </div>

              <div className="card">
                <h3 className="border-b border-line px-5 py-4 text-sm font-medium sm:px-6">
                  {items.reduce((s, i) => s + i.qty, 0)} items
                </h3>
                <ul className="divide-y divide-line">
                  {items.map((item) => (
                    <li key={`${item.product}-${item.variantId}`} className="flex gap-4 p-4 sm:p-6">
                      <div className="aspect-[3/4] w-16 shrink-0 overflow-hidden bg-paper-sunken">
                        {item.image && (
                          <img src={item.image} alt="" loading="lazy" className="h-full w-full object-cover" />
                        )}
                      </div>
                      <div className="flex min-w-0 flex-1 flex-wrap justify-between gap-x-3 gap-y-1">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm leading-snug">{item.name}</p>
                          <p className="mt-1 text-xs text-ink-muted">
                            Size {item.size} · Qty {item.qty}
                          </p>
                        </div>
                        <p className="shrink-0 text-sm font-medium">
                          {formatPriceExact(item.price * item.qty)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex flex-col-reverse gap-3 sm:flex-row">
                <Button
                  variant="ghost"
                  size="lg"
                  className="sm:shrink-0"
                  onClick={() => setStep('payment')}
                >
                  Back
                </Button>
                <Button
                  size="lg"
                  fullWidth
                  loading={placing}
                  disabled={hasStockIssue || !pricing}
                  onClick={placeOrder}
                >
                  <Lock size={14} aria-hidden="true" />
                  {paymentMethod === 'COD'
                    ? 'Place order'
                    : `Pay ${pricing ? formatPriceExact(pricing.grandTotal) : ''}`}
                </Button>
              </div>

              <p className="text-center text-xs text-ink-faint">
                By placing this order you agree to our{' '}
                <Link to="/terms" className="link">terms</Link>.
              </p>
            </section>
          )}
        </div>

        <div>
          <OrderSummary showCoupon={step !== 'review'} />
        </div>
      </div>

      <Modal
        open={addingAddress}
        onClose={() => setAddingAddress(false)}
        title="Add a delivery address"
      >
        <AddressForm onSubmit={saveAddress} onCancel={() => setAddingAddress(false)} />
      </Modal>
    </div>
  );
}
