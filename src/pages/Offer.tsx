import React from 'react';
import { Shield, FileText, Mail, ArrowLeft } from 'lucide-react';

export default function Offer() {
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
            Публичная оферта
          </h1>

          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 border border-purple-500/20">
            <div className="prose prose-invert max-w-none">
              <p className="text-sm text-gray-500 mb-8">
                Настоящий документ является официальным предложением (офертой) ИП/самозанятого. 
                Дата публикации: {new Date().toLocaleDateString('ru-RU')}
              </p>
              
              <h2 className="text-2xl font-semibold mb-4 text-purple-300">
                1. Термины и определения
              </h2>
              <p className="text-gray-300 mb-6">
                1.1. «Продавец» — Игорь Глебов Александрович (ИП/самозанятый) с ИНН 20639063753, предоставляющий доступ к программному обеспечению Aura Client.
              </p>
              <p className="text-gray-300 mb-6">
                1.2. «Покупатель» — физическое лицо, осуществившее оплату и регистрацию на Сайте.
              </p>
              <p className="text-gray-300 mb-6">
                1.3. «Товар» — программное обеспечение Aura Client для Minecraft 1.16.5, предоставляемое на условиях простой неисключительной лицензии.
              </p>
              <p className="text-gray-300 mb-6">
                1.4. «Лицензионный ключ» — уникальный код, активирующий доступ к Товару.
              </p>
              
              <h2 className="text-2xl font-semibold mb-4 text-purple-300">
                2. Предмет договора
              </h2>
              <p className="text-gray-300 mb-6">
                2.1. Продавец обязуется предоставить Покупателю доступ к программному обеспечению Aura Client, а Покупатель обязуется оплатить этот доступ в порядке и на условиях, предусмотренных настоящей Офертой.
              </p>
              <p className="text-gray-300 mb-6">
                2.2. Доступ предоставляется на срок, соответствующий выбранному тарифу: 1 месяц, навсегда или beta.
              </p>
              <p className="text-gray-300 mb-6">
                2.3. Тариф «Навсегда» означает доступ к актуальной версии клиента на момент покупки и все последующие обновления в течение всего срока существования продукта.
              </p>
              
              <h2 className="text-2xl font-semibold mb-4 text-purple-300">
                3. Порядок оплаты
              </h2>
              <p className="text-gray-300 mb-6">
                3.1. Оплата производится через платежную систему YooKassa с использованием банковских карт, СБП или иных доступных методов оплаты.
              </p>
              <p className="text-gray-300 mb-6">
                3.2. Моментом оплаты считается поступление денежных средств на счет Продавца.
              </p>
              <p className="text-gray-300 mb-6">
                3.3. Цены на Товар указаны в рублях Российской Федерации и включают все налоги.
              </p>
              <p className="text-gray-300 mb-6">
                3.4. Продавец оставляет за собой право изменять цены в одностороннем порядке, но стоимость уже оплаченных заказов не пересматривается.
              </p>
              
              <h2 className="text-2xl font-semibold mb-4 text-purple-300">
                4. Порядок передачи Товара
              </h2>
              <p className="text-gray-300 mb-6">
                4.1. После подтверждения оплаты Покупатель получает доступ к Личному кабинету на Сайте, где отображается Лицензионный ключ.
              </p>
              <p className="text-gray-300 mb-6">
                4.2. Лицензионный ключ предоставляется в электронном виде и привязывается к HWID компьютера Покупателя.
              </p>
              <p className="text-gray-300 mb-6">
                4.3. Продавец не несет ответственности за утерю Покупателем Лицензионного ключа.
              </p>
              
              <h2 className="text-2xl font-semibold mb-4 text-purple-300">
                5. Права и обязанности сторон
              </h2>
              <p className="text-gray-300 mb-6">
                5.1. Покупатель обязуется не распространять, не копировать и не модифицировать полученное программное обеспечение.
              </p>
              <p className="text-gray-300 mb-6">
                5.2. Покупатель обязуется не использовать программное обеспечение для создания конкурирующих продуктов.
              </p>
              <p className="text-gray-300 mb-6">
                5.3. Продавец обязуется предоставлять качественную техническую поддержку и обновления.
              </p>
              
              <h2 className="text-2xl font-semibold mb-4 text-purple-300">
                6. Ответственность
              </h2>
              <p className="text-gray-300 mb-6">
                6.1. Продавец не несет ответственности за возможные блокировки аккаунтов в игре, связанные с использованием модификаций.
              </p>
              <p className="text-gray-300 mb-6">
                6.2. Использование на свой страх и риск. Продавец не гарантирует отсутствия багов в программном обеспечении.
              </p>
              <p className="text-gray-300 mb-6">
                6.3. Максимальная сумма ответственности Продавца ограничена стоимостью оплаченного Товара.
              </p>
              
              <h2 className="text-2xl font-semibold mb-4 text-purple-300">
                7. Срок действия и порядок расторжения
              </h2>
              <p className="text-gray-300 mb-6">
                7.1. Оферта действует до момента ее отзыва Продавцом.
              </p>
              <p className="text-gray-300 mb-6">
                7.2. Пользователь вправе отказаться от Услуг в любой момент.
              </p>
              <p className="text-gray-300 mb-6">
                7.3. При расторжении договора денежные средства не возвращаются, за исключением случаев, предусмотренных законодательством РФ.
              </p>
              
              <h2 className="text-2xl font-semibold mb-4 text-purple-300">
                8. Реквизиты и контакты
              </h2>
              <div className="bg-gray-900/50 rounded-lg p-4 font-mono text-sm">
                <p className="text-gray-300 mb-2">
                  <strong>Продавец:</strong> Игорь Глебов Александрович (ИП/самозанятый)
                </p>
                <p className="text-gray-300 mb-2">
                  <strong>ИНН:</strong> 20639063753
                </p>
                <p className="text-gray-300 mb-2">
                  <strong>Email:</strong> sowingrim@mail.ru
                </p>
                <p className="text-gray-300">
                  <strong>Сайт:</strong> https://aura-client-sites.vercel.app
                </p>
              </div>

              <p className="text-sm text-gray-400 mt-8 text-center">
                Актуальная версия оферты всегда доступна на сайте Продавца.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
