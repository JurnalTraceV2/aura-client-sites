# Интеграция YooKassa

## Что нужно для подключения

1. **Аккаунт YooKassa** - зарегистрируйтесь на [yookassa.ru](https://yookassa.ru)
2. **Shop ID** - ID вашего магазина в YooKassa
3. **Secret Key** - секретный ключ для API
4. **Webhook URL** - URL для получения уведомлений о платежах

## Настройка

### 1. Получение ключей YooKassa

1. Войдите в личный кабинет YooKassa
2. Перейдите в настройки → Интеграция → API ключи
3. Скопируйте **Shop ID** и **Secret Key**

### 2. Настройка переменных окружения

Добавьте в файл `.env.local` следующие переменные:

```bash
# YooKassa настройки
YOOKASSA_SHOP_ID="YOUR_SHOP_ID"
YOOKASSA_SECRET_KEY="YOUR_SECRET_KEY"
YOOKASSA_WEBHOOK_SECRET="YOUR_WEBHOOK_SECRET"
YOOKASSA_API_URL="https://api.yookassa.ru/v3"
```

### 3. Настройка Webhook

1. В личном кабинете YooKassa перейдите в настройки → Интеграция → Webhook
2. Добавьте URL: `https://your-domain.com/api/payments/webhook`
3. Установите секретный ключ для webhook
4. Выберите события для уведомлений:
   - `payment.succeeded` - успешный платеж
   - `payment.canceled` - отмененный платеж
   - `payment.waiting_for_capture` - ожидание подтверждения

### 4. Тестирование

Для тестирования используйте тестовые карты:
- Номер карты: `5555 5555 5555 5555`
- Срок действия: любой будущий месяц/год
- CVV: `123`

## Тарифы

Система поддерживает следующие тарифы:

### Beta доступ - 99₽
- Доступ к beta версии
- Все базовые функции
- Поддержка

### Premium - 299₽/месяц
- Полный доступ ко всем функциям
- Приоритетная поддержка
- Обновления

### Lifetime - 1999₽
- Пожизненный доступ
- Все будущие обновления
- VIP поддержка

### Сброс HWID - 49₽
- Сброс привязки к устройству
- Изменение HWID

## API эндпоинты

### Создание платежа
```
POST /api/payments/create
Content-Type: application/json

{
  "tier": "1_month",
  "returnUrl": "https://your-site.com/payment/success",
  "userId": "user_123"
}
```

**Ответ:**
```json
{
  "ok": true,
  "paymentId": "payment_id",
  "confirmationUrl": "https://yookassa.app/pay/payment_id",
  "expiresAt": 1640995200000,
  "amount": 299,
  "currency": "RUB",
  "description": "Aura Client - 1 месяц"
}
```

### Проверка статуса платежа
```
POST /api/payments/check
Content-Type: application/json

{
  "paymentId": "payment_id"
}
```

**Ответ:**
```json
{
  "ok": true,
  "status": "succeeded",
  "paymentId": "payment_id",
  "paid": true,
  "subscription": "premium",
  "amount": 299,
  "currency": "RUB",
  "description": "Aura Client - 1 месяц"
}
```

### Webhook
```
POST /api/payments/webhook
Content-Type: application/json
X-Need-Signature: SHA256 signature

{
  "event": "payment.succeeded",
  "object": {
    "id": "payment_id",
    "status": "succeeded",
    "amount": {
      "value": "299.00",
      "currency": "RUB"
    },
    "metadata": {
      "tier": "1_month",
      "userId": "user_123"
    }
  }
}
```

## Безопасность

1. **Никогда не храните ключи в коде** - используйте переменные окружения
2. **Проверяйте подписи webhook** - YooKassa отправляет подпись в заголовке `X-Need-Signature`
3. **Используйте HTTPS** - все запросы к API должны быть по HTTPS
4. **Валидируйте данные** - проверяйте все входящие данные

## Обработка ошибок

### Частые ошибки

1. **Недостаточно средств** - предложите пользователю другую карту
2. **Неверный CVV** - попросите проверить данные карты
3. **Превышен лимит** - лимит банка или YooKassa
4. **Техническая ошибка** - повторите попытку позже

### Коды ошибок API

- `400` - Неверные параметры запроса
- `401` - Неверные ключи API
- `403` - Доступ запрещен
- `404` - Платеж не найден
- `429` - Слишком много запросов
- `500` - Внутренняя ошибка сервера

## Мониторинг

Следите за метриками:
- Количество успешных платежей
- Процент отказов
- Средний чек
- Время обработки платежа

## Поддержка

Если возникли проблемы:
1. Проверьте логи сервера
2. Проверьте настройки в личном кабинете YooKassa
3. Обратитесь в поддержку YooKassa
4. Проверьте статус платежа в API YooKassa
