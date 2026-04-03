import React, { useState } from 'react';
import PaymentForm from '../components/PaymentForm';
import { CreditCard, Settings, LogOut } from 'lucide-react';

const PaymentDemo: React.FC = () => {
  const [showPayment, setShowPayment] = useState(false);
  const [subscription, setSubscription] = useState<string>('free');

  const handlePaymentSuccess = (newSubscription: string) => {
    setSubscription(newSubscription);
    setShowPayment(false);
  };

  const handlePaymentCancel = () => {
    setShowPayment(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">Aura Client</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  subscription === 'premium' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {subscription === 'premium' ? 'Premium' : 'Free'}
                </span>
              </div>
              
              <button className="p-2 text-gray-500 hover:text-gray-700">
                <Settings className="w-5 h-5" />
              </button>
              
              <button className="p-2 text-gray-500 hover:text-gray-700">
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        {showPayment ? (
          <PaymentForm 
            onSuccess={handlePaymentSuccess}
            onCancel={handlePaymentCancel}
          />
        ) : (
          <div className="text-center">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                ����� ���������� � Aura Client
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                ������ ������ ��� Minecraft � ������������ �������������. 
                �������� ������ � ������� �������� ��� ������� �������� �����.
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-8 max-w-md mx-auto mb-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">��� ������</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">������� ��������:</span>
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                    subscription === 'premium' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {subscription === 'premium' ? 'Premium' : 'Free'}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">��������� �������:</span>
                  <span className="text-sm text-gray-500">
                    {subscription === 'premium' ? '���' : '�������'}
                  </span>
                </div>
              </div>

              {subscription === 'free' && (
                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800 mb-3">
                    ? ������������� ��� ����������� � Premium ���������
                  </p>
                  <ul className="text-sm text-blue-700 space-y-1 text-left">
                    <li>� ��� ���� � ����</li>
                    <li>� ������������ ���������</li>
                    <li>� ���������� ����������</li>
                    <li>� ������ � beta �������</li>
                  </ul>
                </div>
              )}
            </div>

            <div className="space-y-4">
              {subscription === 'free' ? (
                <button
                  onClick={() => setShowPayment(true)}
                  className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                >
                  <CreditCard className="w-5 h-5 mr-2" />
                  �������� �� Premium
                </button>
              ) : (
                <div className="space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="text-green-800 font-semibold mb-2">Premium �����������!</h4>
                    <p className="text-green-700 text-sm">
                      ������� �� �������! ������������� ����� ������������� Aura Client.
                    </p>
                  </div>
                  
                  <button
                    onClick={() => setShowPayment(true)}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                  >
                    ���������� ���������
                  </button>
                </div>
              )}
            </div>

            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">?</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">������ �������</h3>
                <p className="text-gray-600 text-sm">
                  ������ � ������ ����� � ����� ��� Minecraft
                </p>
              </div>

              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">??</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">������������</h3>
                <p className="text-gray-600 text-sm">
                  ������ �� ����� � ����-��� ������
                </p>
              </div>

              <div className="text-center">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">?</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">������������������</h3>
                <p className="text-gray-600 text-sm">
                  ���������������� ��� ��� ������������� FPS
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default PaymentDemo;
