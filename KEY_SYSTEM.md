# AURA Key System

Система лицензионных ключей для активации подписок.

## Формат ключа

Ключи имеют формат: `XXXX-XXXX-XXXX-XXXX`
- 16 символов (без дефисов)
- Заглавные буквы A-Z (кроме I, O)
- Цифры 2-9 (кроме 0, 1)
- Пример: `A3BC-D4EF-G5HI-J6KL`

## Страницы

- `/activate` - Активация ключа пользователем
- `/admin/keys` - Генерация ключей (admin, youtuber и youtube)

## API Endpoints

### Проверка ключа
```
POST /api/keys/validate
Body: { "key": "A3BC-D4EF-G5HI-J6KL" }

Response:
{
  "ok": true,
  "valid": true,
  "tier": "lifetime",
  "remainingActivations": 3
}
```

### Активация ключа
```
POST /api/keys/activate
Headers: Authorization: Bearer <id_token>
Body: { "key": "A3BC-D4EF-G5HI-J6KL" }

Response:
{
  "ok": true,
  "tier": "lifetime",
  "expiresAt": null,
  "message": "Key activated successfully"
}
```

### Генерация ключей (admin / youtuber / youtube)
```
POST /api/admin/generate-keys
Headers: Authorization: Bearer <id_token>
Body: {
  "count": 10,
  "tier": "lifetime",
  "durationDays": 365,  // null для lifetime
  "maxActivations": 1
}

Response:
{
  "ok": true,
  "generated": 10,
  "keys": [
    { "key": "A3BC-D4EF-G5HI-J6KL", "tier": "lifetime", ... }
  ]
}
```

## CLI Tool

Генерация ключей через командную строку:

```bash
# 10 lifetime ключей
node scripts/generate-keys.mjs --count 10 --tier lifetime

# 5 ключей на 1 месяц с 2 активациями каждый
node scripts/generate-keys.mjs -n 5 -t 1_month -d 30 -a 2

# С сохранением в файл
node scripts/generate-keys.mjs -n 3 -t 12_month -o keys.txt
```

## Структура данных Firebase

```json
{
  "keys": {
    "A3BC-D4EF-G5HI-J6KL": {
      "keyId": "A3BC-D4EF-G5HI-J6KL",
      "raw": "A3BCD4EFG5HIJ6KL",
      "tier": "lifetime",
      "status": "active",
      "maxActivations": 1,
      "currentActivations": 0,
      "createdAt": 1715000000000,
      "expiresAt": null,
      "metadata": {
        "generatedBy": "admin_uid",
        "generatedByEmail": "admin@example.com"
      }
    }
  },
  "keyActivations": {
    "A3BC-D4EF-G5HI-J6KL": {
      "activation_1": {
        "uid": "user_uid",
        "hwidHash": "sha256_hash",
        "ip": "127.0.0.1",
        "activatedAt": 1715000000000
      }
    }
  }
}
```

## Права доступа

Для генерации ключей пользователь должен иметь `role: admin`, `role: youtuber` или `role: youtube` в `/users/{uid}`.

## Тарифы

- `1_month` - 1 месяц
- `3_month` - 3 месяца
- `6_month` - 6 месяцев
- `12_month` - 12 месяцев
- `lifetime` - Навсегда
- `beta` - Бета доступ
