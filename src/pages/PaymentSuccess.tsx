import React, { useEffect, useState } from 'react';
import { CheckCircle, Loader2, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PaymentSuccess: React.FC = () => {
  const [isVerifying, setIsVerifying] = useState(true);
  const [subscription, setSubscription] = useState<string>('');
  const [error, setError] = useState<string>('');
  const navigate = useNavigate();

  useEffect(() => {
    const verifyPayment = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const paymentId = urlParams.get('payment_id');

      if (!paymentId) {
        setError('����������� ID �������');
        setIsVerifying(false);
        return;
      }

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
          setSubscription(data.subscription);
          
          // ���������� ������ ������������ � localStorage ��� ���������
          localStorage.setItem('subscription', data.subscription);
          localStorage.setItem('subscriptionExpiry', 
            new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()); // 30 ����
        } else {
          setError('������ �� ������ ��� �� �������');
        }
      } catch (err) {
        setError('������ �������� �������');
      } finally {
        setIsVerifying(false);
      }
    };

    verifyPayment();
  }, []);

  const handleGoHome = () => {
    navigate('/');
  };

  if (isVerifying) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">�������� �������...</h2>
          <p className="text-gray-600">��������� �������, �� ��������� ������ ����� ������</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">?</span>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">������</h3>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={handleGoHome}
            className="w-full bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors"
          >
            ��������� �� �������
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        
        <h3 className="text-2xl font-bold text-gray-900 mb-2">������ ������� ���������!</h3>
        
        <div className="mb-6">
          <p className="text-gray-600 mb-2">���� �������� ������������</p>
          <div className="inline-block bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">
            {subscription === 'premium' ? 'Premium' : 'Beta'}
          </div>
        </div>

        <div className="space-y-3 mb-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold text-gray-900 mb-2">��� ������ ��������:</h4>
            <ul className="text-left text-sm text-gray-600 space-y-1">
              <li>? ��� ������� Aura Client</li>
              <li>? ������������ ���������</li>
              <li>? ���������� ����������</li>
              <li>? ������ � �������� beta ������</li>
            </ul>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleGoHome}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
          >
            <span>������� � ����������</span>
          </button>
          
          <button
            onClick={() => window.location.href = 'https://discord.gg/your-server'}
            className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-200 transition-colors"
          >
            �������������� � Discord
          </button>
        </div>

        <div className="mt-6 text-xs text-gray-500">
          <p>������� �� �������! ���� � ��� �������� �������, ���������� � ���������.</p>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;
