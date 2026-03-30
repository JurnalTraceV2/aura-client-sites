# YooKassa Интеграция - Готово к использованию

## Что было создано

### Backend
- **API эндпоинты** (`/api/yookassa.js`) - обработка платежей YooKassa
- **Интеграция с основным API** - платежные эндпоинты подключены к `api.js`
- **Поддержка всех тарифов** - Beta, Premium, Lifetime, HWID Reset

### Frontend  
- **PaymentForm** - компонент формы оплаты с выбором тарифов
- **PaymentSuccess** - страница успешной оплаты
- **PaymentDemo** - демонстрационная страница для тестирования

### Документация
- **YOOKASSA_SETUP.md** - полная инструкция по настройке
- **README_YOOKASSA.md** - эта инструкция

## Быстрый старт

### 1. Настройте YooKassa

```bash
# Добавьте в .env.local
YOOKASSA_SHOP_ID="YOUR_SHOP_ID"
YOOKASSA_SECRET_KEY="YOUR_SECRET_KEY" 
YOOKASSA_WEBHOOK_SECRET="YOUR_WEBHOOK_SECRET"
```

### 2. Запустите сервер

```bash
cd сайт
npm install
node api.js
```

### 3. Откройте в браузере

```
http://localhost:3000
```

## Тестирование платежей

### Тестовые карты YooKassa:
- **Номер:** `5555 5555 5555 5555`
- **Срок:** любой будущий месяц/год  
- **CVV:** `123`

### Демо страница:
Перейдите на `http://localhost:3000` и нажмите "Обновить до Premium"

## API эндпоинты

### Создать платеж
```bash
POST /api/payments/create
{
  "tier": "1_month",
  "returnUrl": "http://localhost:3000/payment/success",
  "userId": "user123"
}
```

### Проверить статус
```bash
POST /api/payments/check
{
  "paymentId": "payment_id"
}
```

### Webhook
```bash
POST /api/payments/webhook
# YooKassa отправляет уведомления сюда
```

## Тарифы

| Тариф | Цена | Описание |
|-------|------|----------|
| Beta | 99₽ | Доступ к beta версии |
| Premium | 299₽/мес | Полный доступ |
| Lifetime | 1999₽ | Навсегда |
| HWID Reset | 49₽ | Сброс привязки |

## Структура файлов

```
сайт/
├── api/
│   └── yookassa.js          # API YooKassa
├── src/
│   ├── components/
│   │   └── PaymentForm.tsx  # Форма оплаты
│   └── pages/
│       ├── PaymentDemo.tsx   # Демо страница
│       └── PaymentSuccess.tsx # Страница успеха
├── api.js                    # Основной API (обновлен)
├── .env.example              # Пример переменных
└── YOOKASSA_SETUP.md         # Детальная инструкция
```

## Безопасность

✅ **Переменные окружения** - ключи не в коде  
✅ **CORS настройки** - для кросс-доменных запросов  
✅ **Webhook валидация** - проверка подписей YooKassa  
✅ **HTTPS поддержка** - для production

## Следующие шаги

1. **Получите реальные ключи YooKassa**
2. **Настройте webhook URL** в личном кабинете  
3. **Протестируйте** с тестовыми картами
4. **Разверните** на Vercel или другой платформе

## Поддержка

Если возникнут проблемы:
1. Проверьте логи сервера
2. Убедитесь что ключи правильные
3. Проверьте настройки webhook в YooKassa
4. Смотрите `YOOKASSA_SETUP.md` для детальной информации

---

**Готово!** Ваш сайт теперь полностью интегрирован с YooKassa. 🚀
