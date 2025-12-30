const express = require('express');
const router = express.Router();
const userModel = require('../data/users');
const { 
  validateRequest, 
  registerValidation,
  sanitizeInput,
  preventNoSQLInjection 
} = require('../middleware/validationMiddleware');

router.post('/register', 
  sanitizeInput,
  preventNoSQLInjection,
  validateRequest(registerValidation), 
  (req, res) => {
    try {
      const { username, email, password } = req.body;
      const existingUser = userModel.findByEmail(email);
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'Користувач з таким email вже існує'
        });
      }
      const existingUsername = userModel.getAll().find(u => u.username === username);
      if (existingUsername) {
        return res.status(409).json({
          success: false,
          message: 'Користувач з таким іменем вже існує'
        });
      }
      const newUser = userModel.create({
        username,
        email,
        password
      });
      const token = generateToken(newUser.id);
      userModel.saveToken(newUser.id, token);
      res.status(201).json({
        success: true,
        message: 'Користувач успішно зареєстрований',
        token,
        user: newUser
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Помилка при реєстрації',
        error: error.message
      });
    }
  }
);

module.exports = router;