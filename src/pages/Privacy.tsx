import React from 'react';
import { Shield, FileText, Mail, ArrowLeft } from 'lucide-react';

export default function Privacy() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        <a 
          href="/" 
          className="inline-flex items-center text-purple-400 hover:text-purple-300 mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          �����
        </a>

        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-center mb-8 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            �������� ������������������
          </h1>

          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 border border-purple-500/20">
            <div className="prose prose-invert max-w-none">
              <h2 className="text-2xl font-semibold mb-4 text-purple-300">
                1. ����� ���������
              </h2>
              <p className="text-gray-300 mb-6">
                ��������� �������� ������������������ ���������� ������� �����, ��������, 
                ������������� � ��������������� ���������� �������������� ����� ������� �������������� (��/�����������) � ��� 20639063753.
              </p>

              <h2 className="text-2xl font-semibold mb-4 text-purple-300">
                2. ���������� ����������
              </h2>
              <p className="text-gray-300 mb-6">
                �� �������� ��������� ����������:
              </p>
              <ul className="list-disc list-inside text-gray-300 mb-6 space-y-2">
                <li>Email ����� ��� �����������</li>
                <li>IP-����� � HWID ��� ������ �� ���������</li>
                <li>������ �� ������������� ������������ �����������</li>
                <li>���������� � ��������</li>
              </ul>

              <h2 className="text-2xl font-semibold mb-4 text-purple-300">
                3. ������������� ����������
              </h2>
              <p className="text-gray-300 mb-6">
                ��������� ���������� ������������ ���:
              </p>
              <ul className="list-disc list-inside text-gray-300 mb-6 space-y-2">
                <li>�������������� ������� � ������������ �����������</li>
                <li>����������� ���������</li>
                <li>������ �� �������������������� �������������</li>
                <li>��������� �������� �����</li>
              </ul>

              <h2 className="text-2xl font-semibold mb-4 text-purple-300">
                4. ������ ����������
              </h2>
              <p className="text-gray-300 mb-6">
                �� ��������� ��� ����������� ���� ��� ������ ������������ ������ �������������. 
                ������ ��������� � �������� �� ���������� ��������.
              </p>
              <p className="text-gray-300 mb-6">
                �� ���������� ��������� ������ ������:
              </p>
              <ul className="list-disc list-inside text-gray-300 mb-6 space-y-2">
                <li>SSL-���������� ��� �������� ������</li>
                <li>����������� �������</li>
                <li>���������� ��������� �����������</li>
                <li>������������ ������ � ������ ���������</li>
              </ul>

              <h2 className="text-2xl font-semibold mb-4 text-purple-300">
                5. �������� ������ ������� �����
              </h2>
              <p className="text-gray-300 mb-6">
                �� �� �������� ������������ ������ ������������� ������� �����, �� ����������� 
                �������, ��������������� ����������������� ��.
              </p>
              <p className="text-gray-300 mb-6">
                ������ ����� ���� ��������:
              </p>
              <ul className="list-disc list-inside text-gray-300 mb-6 space-y-2">
                <li>��������� �������� ��� ��������� ��������</li>
                <li>������������������ ������� �� ������������ �������</li>
                <li>�������� �������������� �������������</li>
              </ul>

              <h2 className="text-2xl font-semibold mb-4 text-purple-300">
                6. ����� �������������
              </h2>
              <p className="text-gray-300 mb-6">
                ������������ ����� ����� ��:
              </p>
              <ul className="list-disc list-inside text-gray-300 mb-6 space-y-2">
                <li>������ � ����� ������������ ������</li>
                <li>��������� ����� ������������ ������</li>
                <li>�������� ������ ��������</li>
                <li>����� �������� �� ��������� ������</li>
                <li>��������� ���������� � ���, ����� ������ � ��� ��������</li>
              </ul>

              <h2 className="text-2xl font-semibold mb-4 text-purple-300">
                7. �������� ������
              </h2>
              <p className="text-gray-300 mb-6">
                ������������ ������ �������� � ������� ����� ������� ������������� �����. 
                ��� �������� �������� ��� ������ ������������ ��������� � ������� 30 ����.
              </p>

              <h2 className="text-2xl font-semibold mb-4 text-purple-300">
                8. ��������� ��������
              </h2>
              <p className="text-gray-300 mb-6">
                �� ��������� �� ����� ����� �������� ��������� �������� ������������������. 
                ��� ��������� �������� � ���� � ������� �� ���������� �� �����.
              </p>

              <h2 className="text-2xl font-semibold mb-4 text-purple-300">
                9. ��������
              </h2>
              <div className="bg-gray-900/50 rounded-lg p-4">
                <p className="text-gray-300 mb-2">
                  �� ���� ��������, ��������� � ��������� ������������������:
                </p>
                <p className="text-purple-400">
                  Email: sowingrim@mail.ru
                </p>
              </div>

              <p className="text-sm text-gray-400 mt-8 text-center">
                ��������� ����������: {new Date().toLocaleDateString('ru-RU')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
