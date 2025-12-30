// Реєстрація та управління Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('SW зареєстровано!', registration);
      
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('Нова версія SW доступна!');
            showUpdateNotification();
          }
        });
      });
      
      // Ініціалізація замовлень з LocalStorage
      initOrders();
      
    } catch (error) {
      console.log('Помилка реєстрації SW:', error);
    }
    
    // Завантаження меню
    loadMenu();
  });
}

// Відстеження стану мережі
function updateNetworkStatus() {
  const offlineDiv = document.getElementById('offline');
  if (!navigator.onLine) {
    console.log('Офлайн');
    offlineDiv.style.display = 'block';
  } else {
    console.log('Онлайн');
    offlineDiv.style.display = 'none';
  }
}

window.addEventListener('online', updateNetworkStatus);
window.addEventListener('offline', updateNetworkStatus);
updateNetworkStatus();

// Функція для оновлення SW
async function updateSW() {
  const registration = await navigator.serviceWorker.getRegistration();
  
  if (!registration) {
    alert('Service Worker не знайдено');
    return;
  }
  
  try {
    await registration.update();
    console.log('Перевірка оновлень...');
    alert('Перевірка оновлень завершена');
  } catch (error) {
    console.log('Помилка оновлення:', error);
    alert('Помилка оновлення: ' + error.message);
  }
}

// Обробка змін контролера
navigator.serviceWorker.addEventListener('controllerchange', () => {
  console.log('Контролер змінився - перезавантаження сторінки');
  window.location.reload();
});

// Слухач повідомлень від SW
navigator.serviceWorker.addEventListener('message', event => {
  console.log('Повідомлення від SW:', event.data);
  
  if (event.data && event.data.type === 'ORDER_SENT') {
    showNotification('✅ ' + event.data.message);
    
    // Оновлюємо список замовлень
    const orders = getOrders();
    const orderIndex = orders.findIndex(o => o.id === event.data.orderId);
    if (orderIndex > -1) {
      orders[orderIndex].synced = true;
      orders[orderIndex].syncedAt = new Date().toISOString();
      saveOrders(orders);
      updateOrderList();
    }
  }
  
  if (event.data && event.data.type === 'SYNC_COMPLETED') {
    console.log('Синхронізація завершена:', event.data);
  }
});

// Показ сповіщення про оновлення
function showUpdateNotification() {
  if (confirm('Доступна нова версія сайту! Оновити зараз?')) {
    const registration = navigator.serviceWorker.controller;
    if (registration) {
      registration.postMessage({ action: 'skipWaiting' });
    }
  }
}

// Завантаження меню з API
async function loadMenu() {
  const mainElement = document.querySelector('main');
  const existingMenu = document.querySelector('#menu-list');
  if (existingMenu) {
    existingMenu.remove();
  }
  
  try {
    console.log('Завантаження меню...');
    const response = await fetch('/api/menu.json');
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const menu = await response.json();
    console.log('Меню завантажено:', menu.length, 'позицій');
    
    // Створення списку меню
    const menuContainer = document.createElement('div');
    menuContainer.id = 'menu-list';
    menuContainer.style.cssText = 'margin: 30px 0;';
    
    const title = document.createElement('h2');
    title.textContent = '☕ Наше меню';
    menuContainer.appendChild(title);
    
    const list = document.createElement('ul');
    list.style.cssText = 'list-style: none; padding: 0; max-width: 500px; margin: 0 auto;';
    
    menu.forEach(item => {
      const listItem = document.createElement('li');
      listItem.style.cssText = 'background: white; margin: 10px 0; padding: 15px; border-radius: 10px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);';
      listItem.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <strong style="font-size: 1.2em;">${item.name}</strong><br>
            <small style="color: #666;">${item.description}</small>
          </div>
          <div style="text-align: right;">
            <span style="font-size: 1.3em; color: #8b4513;">${item.price} ₴</span><br>
            <button onclick="addToOrder(${item.id}, '${item.name}', ${item.price})" style="margin-top: 5px; padding: 5px 15px; font-size: 14px;">Додати</button>
          </div>
        </div>
      `;
      list.appendChild(listItem);
    });
    
    menuContainer.appendChild(list);
    
    // Вставляємо меню
    const img = document.querySelector('img');
    img.parentNode.insertBefore(menuContainer, img.nextSibling);
    
  } catch (error) {
    console.log('Помилка завантаження меню:', error);
    
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = 'background: #ffebee; color: #c62828; padding: 15px; border-radius: 8px; margin: 20px;';
    errorDiv.innerHTML = `
      <h3>⚠️ Не вдалося завантажити меню</h3>
      <p>${error.message}</p>
      <p><small>Перевірте підключення до інтернету</small></p>
    `;
    
    const main = document.querySelector('main');
    main.appendChild(errorDiv);
  }
}

// Управління замовленнями
let orders = [];

function initOrders() {
  orders = getOrders();
  updateOrderList();
}

function getOrders() {
  const saved = localStorage.getItem('coffee_shop_orders');
  return saved ? JSON.parse(saved) : [];
}

function saveOrders(ordersArray) {
  localStorage.setItem('coffee_shop_orders', JSON.stringify(ordersArray));
  orders = ordersArray;
}

function addToOrder(id, name, price) {
  const order = {
    id: Date.now(),
    productId: id,
    name: name,
    price: price,
    quantity: 1,
    date: new Date().toISOString(),
    synced: false
  };
  
  orders.push(order);
  saveOrders(orders);
  updateOrderList();
  
  showNotification(`✅ ${name} додано до замовлення`);
}

function updateOrderList() {
  let orderList = document.querySelector('#order-list');
  
  if (!orderList) {
    orderList = document.createElement('div');
    orderList.id = 'order-list';
    orderList.style.cssText = 'margin: 30px 0; padding: 20px; background: white; border-radius: 10px; max-width: 500px; margin-left: auto; margin-right: auto;';
    
    const main = document.querySelector('main');
    const buttons = document.querySelectorAll('button')[0];
    main.insertBefore(orderList, buttons.nextSibling);
  }
  
  const pendingOrders = orders.filter(o => !o.synced);
  const syncedOrders = orders.filter(o => o.synced);
  
  orderList.innerHTML = '';
  
  if (pendingOrders.length === 0 && syncedOrders.length === 0) {
    orderList.innerHTML = '<p style="text-align: center; color: #666;">Немає активних замовлень</p>';
    return;
  }
  
  if (pendingOrders.length > 0) {
    const title = document.createElement('h3');
    title.textContent = '🕒 Очікуючі замовлення';
    orderList.appendChild(title);
    
    const list = document.createElement('ul');
    list.style.cssText = 'list-style: none; padding: 0;';
    
    pendingOrders.forEach(order => {
      const item = document.createElement('li');
      item.style.cssText = 'padding: 10px; border-bottom: 1px solid #eee;';
      item.innerHTML = `
        ${order.name} - ${order.price} ₴
        <button onclick="removeOrder(${order.id})" style="float: right; padding: 2px 10px; font-size: 12px;">Видалити</button>
      `;
      list.appendChild(item);
    });
    
    orderList.appendChild(list);
    
    const syncButton = document.createElement('button');
    syncButton.textContent = '🔄 Синхронізувати замовлення';
    syncButton.onclick = syncOrders;
    syncButton.style.cssText = 'margin-top: 15px; width: 100%; padding: 10px;';
    orderList.appendChild(syncButton);
  }
  
  if (syncedOrders.length > 0) {
    const title = document.createElement('h3');
    title.textContent = '✅ Відправлені замовлення';
    title.style.marginTop = '30px';
    orderList.appendChild(title);
    
    const list = document.createElement('ul');
    list.style.cssText = 'list-style: none; padding: 0; color: #666;';
    
    syncedOrders.slice(-5).forEach(order => {
      const item = document.createElement('li');
      item.style.cssText = 'padding: 5px; font-size: 0.9em;';
      item.textContent = `${order.name} - ${new Date(order.date).toLocaleTimeString()}`;
      list.appendChild(item);
    });
    
    orderList.appendChild(list);
  }
}

function removeOrder(orderId) {
  orders = orders.filter(order => order.id !== orderId);
  saveOrders(orders);
  updateOrderList();
  showNotification('🗑️ Замовлення видалено');
}

async function syncOrders() {
  const pendingOrders = orders.filter(o => !o.synced);
  
  if (pendingOrders.length === 0) {
    showNotification('⚠️ Немає замовлень для синхронізації');
    return;
  }
  
  if (!navigator.onLine) {
    showNotification('🌐 Немає інтернету. Замовлення будуть відправлені автоматично при підключенні.');
    
    // Використовуємо Background Sync
    const registration = await navigator.serviceWorker.ready;
    
    if ('sync' in registration) {
      try {
        await registration.sync.register('send-orders');
        showNotification('⏳ Замовлення в черзі. Будуть відправлені при підключенні до інтернету.');
      } catch (error) {
        console.log('Помилка реєстрації sync:', error);
        showNotification('❌ Помилка синхронізації');
      }
    } else {
      showNotification('❌ Background Sync не підтримується вашим браузером');
    }
    
    return;
  }
  
  // Якщо є інтернет - відправляємо одразу
  await sendOrdersToServer(pendingOrders);
}

async function sendOrdersToServer(ordersToSend) {
  console.log('Відправка замовлень:', ordersToSend);
  
  // Імітація відправки на сервер
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Оновлюємо статус замовлень
  ordersToSend.forEach(order => {
    const index = orders.findIndex(o => o.id === order.id);
    if (index > -1) {
      orders[index].synced = true;
      orders[index].syncedAt = new Date().toISOString();
    }
  });
  
  saveOrders(orders);
  updateOrderList();
  
  showNotification('✅ Замовлення успішно відправлені!');
  
  // Повідомляємо SW про успішну відправку
  const registration = await navigator.serviceWorker.ready;
  registration.active.postMessage({
    type: 'ORDERS_SENT',
    count: ordersToSend.length
  });
}

function placeOrder() {
  addToOrder(3, 'Лате', 65);
}

function showNotification(message) {
  // Створюємо сповіщення
  const notification = document.createElement('div');
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #4CAF50;
    color: white;
    padding: 15px 25px;
    border-radius: 5px;
    z-index: 1000;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    animation: slideIn 0.3s ease-out;
  `;
  
  document.body.appendChild(notification);
  
  // Видаляємо через 3 секунди
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 300);
  }, 3000);
}

// Додаємо CSS анімації
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  @keyframes slideOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
  }
`;
document.head.appendChild(style);