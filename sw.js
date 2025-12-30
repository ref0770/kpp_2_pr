const CACHE_NAME = 'coffee-v2';
const DYNAMIC_CACHE = 'coffee-dynamic-v1';
const STATIC_FILES = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/coffee.jpg',
  '/manifest.json',
  '/offline.html',
  '/api/menu.json'
];

self.addEventListener('install', event => {
  console.log('SW: install подія - версія', CACHE_NAME);
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Кешую статичні файли');
        return cache.addAll(STATIC_FILES);
      })
      .then(() => {
        console.log('Всі файли закешовані');
        return self.skipWaiting();
      })
      .catch(err => console.log('Помилка кешування:', err))
  );
});

self.addEventListener('activate', event => {
  console.log('SW: activate подія');
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        console.log('Наявні кеші:', cacheNames);
        return Promise.all(
          cacheNames
            .filter(cacheName => {
              return cacheName !== CACHE_NAME && cacheName !== DYNAMIC_CACHE;
            })
            .map(cacheName => {
              console.log('Видаляю старий кеш:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        console.log('Активовано кеш:', CACHE_NAME);
        return self.clients.claim();
      })
  );
});

// Обробка запитів
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Network First для API
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstStrategy(event.request));
    return;
  }
  
  // Cache First для статичних файлів
  event.respondWith(cacheFirstStrategy(event.request));
});

// Стратегія Network First (для API)
function networkFirstStrategy(request) {
  return fetch(request)
    .then(networkResponse => {
      // Клонуємо для кешування
      const responseToCache = networkResponse.clone();
      
      caches.open(DYNAMIC_CACHE)
        .then(cache => {
          console.log('Кешую API відповідь:', request.url);
          cache.put(request, responseToCache);
        });
      
      return networkResponse;
    })
    .catch(async () => {
      console.log('Мережа недоступна, шукаю в кеші:', request.url);
      const cachedResponse = await caches.match(request);
      
      if (cachedResponse) {
        console.log('Знайдено в кеші:', request.url);
        return cachedResponse;
      }
      
      // Для menu.json повертаємо пустий масив
      if (request.url.includes('menu.json')) {
        return new Response(JSON.stringify([]), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      return new Response(JSON.stringify({
        error: 'Офлайн режим',
        message: 'Немає підключення до мережі та даних в кеші'
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    });
}

// Стратегія Cache First (для статики)
function cacheFirstStrategy(request) {
  return caches.match(request)
    .then(cachedResponse => {
      if (cachedResponse) {
        console.log('З кешу (статичний):', request.url);
        return cachedResponse;
      }
      
      return fetch(request)
        .then(networkResponse => {
          if (!networkResponse || networkResponse.status !== 200) {
            return networkResponse;
          }
          
          const responseToCache = networkResponse.clone();
          
          caches.open(DYNAMIC_CACHE)
            .then(cache => {
              cache.put(request, responseToCache);
            });
          
          return networkResponse;
        })
        .catch(() => {
          // Для HTML запитів - offline сторінка
          if (request.headers.get('accept').includes('text/html')) {
            return caches.match('/offline.html');
          }
          
          return new Response('Офлайн ресурс', {
            headers: { 'Content-Type': 'text/plain' }
          });
        });
    });
}

// Background Sync
self.addEventListener('sync', event => {
  console.log('Background Sync:', event.tag);
  
  if (event.tag === 'send-orders') {
    event.waitUntil(sendPendingOrders());
  }
});

// Функція для відправки замовлень
async function sendPendingOrders() {
  console.log('Синхронізація замовлень...');
  
  try {
    // Отримуємо дані з клієнта
    const clients = await self.clients.matchAll();
    
    // Імітація відправки на сервер
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    console.log('Замовлення успішно відправлені');
    
    // Повідомляємо всіх клієнтів
    clients.forEach(client => {
      client.postMessage({
        type: 'ORDER_SENT',
        message: 'Ваші замовлення успішно синхронізовані!',
        orderId: Date.now()
      });
    });
    
  } catch (error) {
    console.log('Помилка синхронізації:', error);
  }
}

// Обробка повідомлень
self.addEventListener('message', event => {
  console.log('SW отримав повідомлення:', event.data);
  
  if (event.data && event.data.action === 'skipWaiting') {
    console.log('Виконую skipWaiting');
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'ORDERS_SENT') {
    console.log('Замовлення відправлені з клієнта:', event.data.count);
  }
});