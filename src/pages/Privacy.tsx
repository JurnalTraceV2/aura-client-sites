import React from 'react';
import { ArrowLeft } from 'lucide-react';

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
              <h2 className="text-2xl font-semibold mb-4 text-purple-300">1. Общие положения</h2>
              <p className="text-gray-300 mb-6">
                Настоящая политика описывает порядок обработки и защиты персональных данных пользователей
                сервиса Aura Client. Оператор данных: Игорь Глебов Александрович (самозанятый), ИНН 20639063753.
              </p>

              <h2 className="text-2xl font-semibold mb-4 text-purple-300">2. Какие данные мы собираем</h2>
              <ul className="list-disc list-inside text-gray-300 mb-6 space-y-2">
                <li>Email для связи и идентификации аккаунта.</li>
                <li>Технические данные: IP-адрес, HWID и сведения о входах.</li>
                <li>Информацию о платежах (без хранения данных банковских карт).</li>
                <li>Обращения в поддержку.</li>
              </ul>

              <h2 className="text-2xl font-semibold mb-4 text-purple-300">3. Цели обработки данных</h2>
              <ul className="list-disc list-inside text-gray-300 mb-6 space-y-2">
                <li>Предоставление доступа к продукту и поддержка пользователей.</li>
                <li>Выполнение обязательств по оплате и учету лицензий.</li>
                <li>Защита сервиса от мошенничества и злоупотреблений.</li>
                <li>Улучшение качества работы сервиса.</li>
              </ul>

              <h2 className="text-2xl font-semibold mb-4 text-purple-300">4. Хранение и защита данных</h2>
              <p className="text-gray-300 mb-6">
                Мы принимаем разумные организационные и технические меры для защиты данных от
                несанкционированного доступа, изменения, раскрытия или уничтожения.
              </p>

              <h2 className="text-2xl font-semibold mb-4 text-purple-300">5. Передача третьим лицам</h2>
              <p className="text-gray-300 mb-6">
                Данные могут передаваться только в случаях, предусмотренных законодательством,
                или партнерам, необходимым для работы сервиса (например, платежным провайдерам).
              </p>

              <h2 className="text-2xl font-semibold mb-4 text-purple-300">6. Права пользователя</h2>
              <ul className="list-disc list-inside text-gray-300 mb-6 space-y-2">
                <li>Запросить информацию о своих персональных данных.</li>
                <li>Потребовать исправления или удаления данных.</li>
                <li>Отозвать согласие на обработку персональных данных.</li>
              </ul>

              <h2 className="text-2xl font-semibold mb-4 text-purple-300">7. Обратная связь</h2>
              <div className="bg-gray-900/50 rounded-lg p-4">
                <p className="text-gray-300 mb-2">По вопросам обработки персональных данных:</p>
                <p className="text-purple-400">Email: sowingrim@mail.ru</p>
              </div>

              <p className="text-sm text-gray-400 mt-8 text-center">
                Дата последнего обновления: {new Date().toLocaleDateString('ru-RU')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
