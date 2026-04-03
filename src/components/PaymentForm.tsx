import React, { useState } from 'react';
import { CreditCard, Loader2, CheckCircle } from 'lucide-react';

interface PaymentFormProps {
  onSuccess?: (subscription: string) => void;
  onCancel?: () => void;
}

const PaymentForm: React.FC<PaymentFormProps> = ({ onSuccess, onCancel }) => {
  const [selectedTier, setSelectedTier] = useState<string>('1_month');
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<boolean>(false);

  const tiers = [
    {
      id: 'beta',
      name: 'Beta ������',
      price: 99,
      period: '������',
      features: ['������ � beta ������', '��� ������� �������', '���������'],
      popular: false
    },
    {
      id: '1_month',
      name: 'Premium',
      price: 299,
      period: '1 �����',
      features: ['������ ������ �� ���� ��������', '������������ ���������', '����������'],
      popular: true
    },
    {
      id: 'lifetime',
      name: 'Lifetime',
      price: 1999,
      period: '��������',
      features: ['����������� ������', '��� ������� ����������', 'VIP ���������'],
      popular: false
    },
    {
      id: 'hwid_reset',
      name: '����� HWID',
      price: 49,
      period: '������',
      features: ['����� �������� � ����������', '��������� HWID'],
      popular: false
    }
  ];

  const handlePayment = async () => {
    setIsLoading(true);
    setError('');

    try {
      // �������� �������
      const response = await fetch('/api/payments/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tier: selectedTier,
          returnUrl: window.location.origin + '/payment/success',
          userId: 'user_' + Date.now() // � �������� ���������� ����� ����� ID ������������
        })
      });

      const data = await response.json();

      if (!data.ok) {
        throw new Error(data.error || '������ �������� �������');
      }

      setIsProcessing(true);
      
      // ��������������� �� �������� ������ YooKassa
      window.location.href = data.confirmationUrl;

    } catch (err) {
      setError(err instanceof Error ? err.message : '��������� ������');
      setIsLoading(false);
    }
  };

  const checkPaymentStatus = async (paymentId: string) => {
    try {
      const response = await fetch('/api/payments/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ paymentId })
      });

      const data = await response.json();

      if (data.ok && data.paid) {
        setSuccess(true);
        setIsProcessing(false);
        onSuccess?.(data.subscription);
      }
    } catch (err) {
      console.error('Error checking payment status:', err);
    }
  };

  // �������� ������� ������� ��� �������� �� �������� ������
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentId = urlParams.get('payment_id');
    
    if (paymentId && !success) {
      setIsProcessing(true);
      checkPaymentStatus(paymentId);
    }
  }, []);

  if (success) {
    return (
      <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">������ ������� ���������!</h3>
        <p className="text-gray-600 mb-6">���� �������� ������������</p>
        <button
          onClick={() => onSuccess?.('premium')}
          className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors"
        >
          ����������
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">�������� �����</h2>
        <p className="text-gray-600">�������� ������ ������ �� ���� �������� Aura Client</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {tiers.map((tier) => (
          <div
            key={tier.id}
            className={`relative p-6 rounded-lg border-2 cursor-pointer transition-all ${
              selectedTier === tier.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            } ${tier.popular ? 'ring-2 ring-blue-500' : ''}`}
            onClick={() => setSelectedTier(tier.id)}
          >
            {tier.popular && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
                  ����������
                </span>
              </div>
            )}

            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{tier.name}</h3>
              <div className="mb-4">
                <span className="text-3xl font-bold text-gray-900">{tier.price}?</span>
                <span className="text-gray-600 text-sm">/{tier.period}</span>
              </div>
              
              <ul className="text-left space-y-2 mb-6">
                {tier.features.map((feature, index) => (
                  <li key={index} className="flex items-center text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>

              <div className="flex items-center justify-center">
                <input
                  type="radio"
                  name="tier"
                  value={tier.id}
                  checked={selectedTier === tier.id}
                  onChange={() => setSelectedTier(tier.id)}
                  className="w-4 h-4 text-blue-600"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-center space-x-4">
        <button
          onClick={onCancel}
          className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          disabled={isLoading || isProcessing}
        >
          ������
        </button>
        
        <button
          onClick={handlePayment}
          disabled={isLoading || isProcessing}
          className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading || isProcessing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>{isProcessing ? '��������� ������...' : '�������� �������...'}</span>
            </>
          ) : (
            <>
              <CreditCard className="w-5 h-5" />
              <span>��������</span>
            </>
          )}
        </button>
      </div>

      <div className="mt-8 text-center text-sm text-gray-500">
        <p>������ ���������� ����� ���������� ���� YooKassa</p>
        <p>��� ���������� �������� � ������������� ���������� PCI DSS</p>
      </div>
    </div>
  );
};

export default PaymentForm;
