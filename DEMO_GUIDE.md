# 🎯 SportArena - Quickstart for Demo

## Быстрый старт за 2 минуты

### 1️⃣ Запуск сервера
```bash
npm start
```
Сервер запустится на `http://localhost:3000`

### 2️⃣ Откройте в браузере
```
http://localhost:3000
```

---

## 📋 Демонстрация Функций

### ✅ Функция 1: Real-time Notifications (Уведомления)

**Где видеть:**
1. Откройте DevTools → **Console** (F12)
2. Посмотрите логи `[Notification]` - там видно что polling запущен
3. В правом нижнем углу страницы вы видите **green toast** с сообщением

**Что показывает:**
```
✅ SportArena proxy server is running at http://localhost:3000
📡 API Proxy: https://api.football-data.org/v4
🔑 API Key configured: ✓

[Notification] ✅ Polling started for PL LIVE
[Notification] 📡 Updates every 90s (active) / 300s (hidden)
```

**Command для тестирования:**
В консоли выполните:
```javascript
window.showTestNotification('Test Match', 'Liverpool 2:1 Manchester United')
```
Вы видите уведомление в углу!

---

### ✅ Функция 2: Advanced Search (Поиск и Фильтрация)

**Где найти:**
- На странице ниже голубого информационного блока
- Видна панель "SEARCH PANEL" с полями

**Полей в форме:**
1. 🔍 **Search by City or Team** - введите `"London"` или `"Madrid"`
2. 🏟️ **Search by Team** - введите `"Real Madrid"` или `"Liverpool"`
3. 📅 **Match Status** - выберите `"SCHEDULED"`, `"LIVE"` или `"FINISHED"`

**Как использовать:**
```
Шаг 1: Введите "Liverpool" в поле "Search by Team"
Шаг 2: Нажмите "Apply Filters"
Шаг 3: Видите panel с результатами внизу
       - Каждый матч в красивой карточке
       - Показаны логотипы команд
       - Видна дата, статус, счет
```

**Результат в консоли:**
```
[SearchManager] Displayed 3 results
```

---

### ✅ Функция 3: Data Display Panel (Панель Результатов)

**Где видеть:**
При нажатии "Apply Filters" ниже появляется блок "Search Results"

**Что отображается:**
- ✓ Количество найденных матчей: `"Found X matches"`
- ✓ Карточки для каждого матча с:
  - Логотип лиги
  - **Статус матча** (цветовой код):
    - 🔵 SCHEDULED (синий)
    - 🔴 LIVE (красный, мигает)
    - 🟢 FINISHED (зеленый)
  - Логотипы команд
  - Счет матча (если доступен)
  - Дата проведения
  - Этап соревнования

**Пример карточки:**
```
┌─────────────────────────────┐
│ Premier League    SCHEDULED │
├─────────────────────────────┤
│   [Logo] Real Madrid        │
│                 VS          │
│            Barcelona [Logo] │
│           Score: 0 : 0       │
│                             │
│ Date: May 28, 2026          │
│ Stage: Matchday 30          │
└─────────────────────────────┘
```

---

### ✅ Функция 4: API Integration

**Где проверить:**
1. **Console** (F12) → вкладка **Network**
2. Ищите запросы к `thesportsdb.com`
3. Начните поиск → видите GET запрос

**API Sources:**
- **TheSportsDB** - основной источник (браузер безопасно)
- **Proxy Server** (Node.js) - для дополнительных запросов

**Кэширование:**
1. Console → Local Storage
2. Ключи вроде `sportarena:cache:PL:SCHEDULED`
3. Данные сохраняются на 5 минут

**Тест кэша:**
В консоли:
```javascript
// Очистить кэш
window.clearAllCache()  // Нажимается кнопка 🗑 Clear Cache
```

---

### ✅ Функция 5: Переключение Лиг

**Где видеть:**
- На странице после голубого блока
- Три кнопки:
  - 🏴󠁧󠁢󠁥󠁮󠁧󠁿 Premier League
  - 🏆 Champions League
  - ✅ Results

**Что происходит:**
```
Нажимаете кнопку → Панель матчей обновляется
                 → Видите уведомление (green toast)
                 → Таблица лиги обновляется
                 → Новые логи в консоли
```

**Пример в консоли:**
```
[App] Switched to Champions League - SCHEDULED
[Notification] In-app: "Competition Switched"
```

---

## 🔍 Техническое Тестирование

### Console Commands

**Тестирование Search:**
```javascript
// Запустить поиск
window.switchCompetition('CL', 'SCHEDULED')

// Показать тестовое уведомление
window.showTestNotification('Goal!', 'Manchester United 1:0')

// Показать статус polling
window.showPollingStatus()
```

**Проверить API Key:**
```javascript
// В консоли браузера вы видите в Network:
// GET https://www.thesportsdb.com/api/v1/json/123/eventslast.php?id=133602
// ✓ Статус 200 OK - API работает!
```

---

## 📊 Что Показать на Презентации

### Сценарий 1: "Search & Filter" (1 мин)
```
1. Запустите приложение
2. Введите в поле "Search by Team": "Liverpool"
3. Нажмите "Apply Filters"
4. Покажите результаты в красивых карточках
5. Скажите: "Вот поиск по команде, теперь попробую по городу"
6. Очистите и введите "London"
7. Видны все матчи в Лондоне
```

### Сценарий 2: "Real-time Notifications" (1 мин)
```
1. Откройте Console (F12)
2. Покажите [Notification] логи
3. В консоли вычислите: window.showTestNotification()
4. Покажите зеленое уведомление в углу
5. Скажите: "Система следит за матчами в реальном времени каждые 90 секунд"
```

### Сценарий 3: "League Switching" (30 сек)
```
1. Нажмите на "Champions League"
2. Видите как обновились матчи
3. Видите уведомление "Competition Switched"
4. Скажите: "Динамическое переключение между лигами с API"
```

---

## ❓ Возможные Вопросы Преподавателя

**В: Как вы передаете данные из API?**
А: "Используем TheSportsDB API через браузер (CORS safe). Данные кэшируются в LocalStorage на 5 минут для оптимизации."

**В: Как работают уведомления?**
А: "Service использует polling каждые 90 секунд для проверки изменений. Если счет поменялся или матч завершился - показываем notification в углу и в консоли логируем."

**В: Почему SearchManager отдельно?**
А: "Это отдельный компонент для Search & Filter функциональности. Он извлекает матчи из DOM, применяет фильтры и отображает результаты в красивых карточках."

**В: Где хранятся настройки кэша?**
А: "В config.js. LIVE матчи кэшируются 60 сек, SCHEDULED 300 сек, FINISHED 900 сек."

---

## 🎯 Итоговый Чеклист

- ✅ Сервер запущен (`npm start`)
- ✅ API работает (Network tab показывает 200 OK)
- ✅ Search панель видна и работает
- ✅ Результаты отображаются в карточках
- ✅ Notifications видны в углу
- ✅ Console показывает логи
- ✅ Кнопки переключения лиг работают
- ✅ LocalStorage кэширует данные

**Если что-то не работает:**
1. Откройте Console (F12)
2. Посмотрите ошибки
3. Проверьте что сервер запущен `npm start`
4. Перезагрузите страницу Ctrl+R или Cmd+R

---

## 📝 Файлы для Демонстрации Преподавателю

Показать эти файлы студенте:
1. **js/components/SearchManager.js** - логика поиска
2. **js/services/notificationService.js** - логика уведомлений
3. **css/search-panel.css** - стили поиска
4. **index.html** - элементы поиска в HTML
5. **js/script.js** - инициализация компонентов

**Команда для быстрого просмотра:**
```bash
code js/components/SearchManager.js
code js/services/notificationService.js
```

---

## ✨ Готово!

Все функции работают и готовы к демонстрации. Любые вопросы - смотрите логи в Console! 🚀
