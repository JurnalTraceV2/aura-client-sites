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
          Назад
        </a>

        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-center mb-8 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Политика конфиденциальности
          </h1>

          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 border border-purple-500/20">
            <div className="prose prose-invert max-w-none">
              <h2 className="text-2xl font-semibold mb-4 text-purple-300">
                1. Общие положения
              </h2>
              <p className="text-gray-300 mb-6">
                Настоящая Политика конфиденциальности определяет порядок сбора, хранения, 
                использования и распространения информации пользователями Игоря Глебова Александровича (ИП/самозанятый) с ИНН 20639063753.
              </p>

              <h2 className="text-2xl font-semibold mb-4 text-purple-300">
                2. Собираемая информация
              </h2>
              <p className="text-gray-300 mb-6">
                Мы собираем следующую информацию:
              </p>
              <ul className="list-disc list-inside text-gray-300 mb-6 space-y-2">
                <li>Email адрес при регистрации</li>
                <li>IP-адрес и HWID для защиты от пиратства</li>
                <li>Данные об использовании программного обеспечения</li>
                <li>Информация о платежах</li>
              </ul>

              <h2 className="text-2xl font-semibold mb-4 text-purple-300">
                3. Использование информации
              </h2>
              <p className="text-gray-300 mb-6">
                Собранная информация используется для:
              </p>
              <ul className="list-disc list-inside text-gray-300 mb-6 space-y-2">
                <li>Предоставления доступа к программному обеспечению</li>
                <li>Технической поддержки</li>
                <li>Защиты от несанкционированного использования</li>
                <li>Улучшения качества услуг</li>
              </ul>

              <h2 className="text-2xl font-semibold mb-4 text-purple-300">
                4. Защита информации
              </h2>
              <p className="text-gray-300 mb-6">
                Мы принимаем все необходимые меры для защиты персональных данных пользователей. 
                Данные шифруются и хранятся на защищенных серверах.
              </p>
              <p className="text-gray-300 mb-6">
                Мы используем следующие методы защиты:
              </p>
              <ul className="list-disc list-inside text-gray-300 mb-6 space-y-2">
                <li>SSL-шифрование при передаче данных</li>
                <li>Хеширование паролей</li>
                <li>Регулярное резервное копирование</li>
                <li>Ограниченный доступ к данным персонала</li>
              </ul>

              <h2 className="text-2xl font-semibold mb-4 text-purple-300">
                5. Передача данных третьим лицам
              </h2>
              <p className="text-gray-300 mb-6">
                Мы не передаем персональные данные пользователей третьим лицам, за исключением 
                случаев, предусмотренных законодательством РФ.
              </p>
              <p className="text-gray-300 mb-6">
                Данные могут быть переданы:
              </p>
              <ul className="list-disc list-inside text-gray-300 mb-6 space-y-2">
                <li>Платежным системам для обработки платежей</li>
                <li>Правоохранительным органам по официальному запросу</li>
                <li>Законным представителям пользователей</li>
              </ul>

              <h2 className="text-2xl font-semibold mb-4 text-purple-300">
                6. Права пользователей
              </h2>
              <p className="text-gray-300 mb-6">
                Пользователи имеют право на:
              </p>
              <ul className="list-disc list-inside text-gray-300 mb-6 space-y-2">
                <li>Доступ к своим персональным данным</li>
                <li>Изменение своих персональных данных</li>
                <li>Удаление своего аккаунта</li>
                <li>Отзыв согласия на обработку данных</li>
                <li>Получение информации о том, какие данные о них хранятся</li>
              </ul>

              <h2 className="text-2xl font-semibold mb-4 text-purple-300">
                7. Хранение данных
              </h2>
              <p className="text-gray-300 mb-6">
                Персональные данные хранятся в течение всего периода использования услуг. 
                При удалении аккаунта все данные пользователя удаляются в течение 30 дней.
              </p>

              <h2 className="text-2xl font-semibold mb-4 text-purple-300">
                8. Изменения политики
              </h2>
              <p className="text-gray-300 mb-6">
                Мы оставляем за собой право изменять настоящую Политику конфиденциальности. 
                Все изменения вступают в силу с момента их публикации на сайте.
              </p>

              <h2 className="text-2xl font-semibold mb-4 text-purple-300">
                9. Контакты
              </h2>
              <div className="bg-gray-900/50 rounded-lg p-4">
                <p className="text-gray-300 mb-2">
                  По всем вопросам, связанным с политикой конфиденциальности:
                </p>
                <p className="text-purple-400">
                  Email: sowingrim@mail.ru
                </p>
              </div>

              <p className="text-sm text-gray-400 mt-8 text-center">
                Последнее обновление: {new Date().toLocaleDateString('ru-RU')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
