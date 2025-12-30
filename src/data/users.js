let users = [
  {
    id: 1,
    username: "admin",
    email: "admin@example.com",
    password: "admin123",
    role: "admin",
    createdAt: "2024-01-01T10:00:00Z"
  },
  {
    id: 2,
    username: "user1",
    email: "user1@example.com",
    password: "password123",
    role: "user",
    createdAt: "2024-01-02T11:30:00Z"
  },
  {
    id: 3,
    username: "user2",
    email: "user2@example.com",
    password: "password456",
    role: "user",
    createdAt: "2024-01-03T14:20:00Z"
  }
];

const tokens = {};

const userModel = {
  getAll: () => {
    return users.map(user => {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });
  },

  findById: (id) => {
    const user = users.find(u => u.id === parseInt(id));
    if (!user) return null;
    
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  },

  findByEmail: (email) => {
    return users.find(u => u.email === email);
  },

  create: (userData) => {
    const newId = users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1;
    
    const newUser = {
      id: newId,
      ...userData,
      role: "user",
      createdAt: new Date().toISOString()
    };
    
    users.push(newUser);
    
    const { password, ...userWithoutPassword } = newUser;
    return userWithoutPassword;
  },

  update: (id, userData) => {
    const index = users.findIndex(u => u.id === parseInt(id));
    if (index === -1) return null;
    
    users[index] = { ...users[index], ...userData };
    
    const { password, ...userWithoutPassword } = users[index];
    return userWithoutPassword;
  },

  delete: (id) => {
    const index = users.findIndex(u => u.id === parseInt(id));
    if (index === -1) return false;
    
    users.splice(index, 1);
    return true;
  },

  checkPassword: (user, password) => {
    return user.password === password;
  },

  saveToken: (userId, token) => {
    tokens[userId] = token;
  },

  verifyToken: (token) => {
    const userId = Object.keys(tokens).find(key => tokens[key] === token);
    if (!userId) return null;
    
    return userModel.findById(userId);
  }
};

module.exports = userModel;